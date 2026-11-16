import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { pledges, pledgeArticles, customers, businessSettings, payments } from '../db/schema.js';
import { eq, or, ilike, sql, desc, and } from 'drizzle-orm';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { PledgeNumberService } from '../services/pledge-number.service.js';
import { numberToIndianWords } from '../utils/indian-currency.js';
import { AuditService } from '../services/audit.service.js';

const articleInputSchema = z.object({
  id: z.string().optional(),
  itemName: z.string().min(1, 'Article name is required'),
  metalType: z.string().default('Gold'),
  purity: z.string().default('22K'),
  quantity: z.number().int().positive().default(1),
  grossWeight: z.number().nonnegative(),
  lessWeight: z.number().nonnegative().default(0),
  netWeight: z.number().nonnegative().optional(),
  presentValue: z.number().nonnegative(),
  loanAmount: z.number().nonnegative(),
  itemPhotoUrl: z.string().optional().nullable(),
  isRepledged: z.boolean().default(false),
  repledgedBankName: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

const createPledgeSchema = z.object({
  // Customer selection or new customer
  customerId: z.string().optional().nullable(),
  customer: z
    .object({
      name: z.string().min(2),
      relationType: z.enum(['S/O', 'D/O', 'W/O', 'C/O', 'O']).default('S/O'),
      relationName: z.string().optional().nullable(),
      mobileNumber: z.string().optional().nullable().or(z.literal('')),
      secondaryMobile: z.string().optional().nullable(),
      email: z.string().email().optional().nullable().or(z.literal('')),
      monthlyIncome: z.union([z.number(), z.string()]).default(0),
      address: z.string().min(3),
      city: z.string().default('Mumbai'),
      pincode: z.string().optional().nullable(),
      photoUrl: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),

  // Pledge metadata
  pledgeNumber: z.string().optional().nullable(),
  pledgeDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  dueDate: z.string(),
  interestRatePercent: z.number().default(1.5),
  interestPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
  storageLocation: z.string().default('Vault-1'),
  isDraft: z.boolean().default(false),

  // Articles
  articles: z.array(articleInputSchema).min(1, 'At least one article is required'),
});

/**
 * Helper to compute dynamic status of a pledge
 */
export function computePledgeStatus(status: string, dueDateStr: string, closedDateStr?: string | null): string {
  if (status === 'closed' || status === 'cancelled') return status;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays <= 15) {
    return 'due_soon';
  }
  return 'active';
}

export async function pledgeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/pledges/next-number
  fastify.get('/next-number', async (request, reply) => {
    try {
      const nextNumber = await PledgeNumberService.generateNextPledgeNumber();
      return reply.send({ success: true, nextNumber });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to generate pledge number' });
    }
  });

  // GET /api/pledges
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as {
        search?: string;
        status?: string;
        metalType?: string;
        startDate?: string;
        endDate?: string;
        page?: string;
        limit?: string;
      };

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const conditions = [];

      if (query.status && query.status !== 'all') {
        conditions.push(eq(pledges.status, query.status));
      }

      if (query.metalType && query.metalType !== 'all') {
        conditions.push(eq(pledges.metalType, query.metalType));
      }

      if (query.startDate) {
        conditions.push(sql`${pledges.pledgeDate} >= ${query.startDate}`);
      }

      if (query.endDate) {
        conditions.push(sql`${pledges.pledgeDate} <= ${query.endDate}`);
      }

      if (query.search && query.search.trim()) {
        const searchTerm = `%${query.search.trim()}%`;
        conditions.push(
          or(
            ilike(pledges.pledgeNumber, searchTerm),
            ilike(customers.name, searchTerm),
            ilike(customers.mobileNumber, searchTerm)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pledges)
        .leftJoin(customers, eq(pledges.customerId, customers.id))
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      const records = await db
        .select({
          pledge: pledges,
          customer: {
            id: customers.id,
            name: customers.name,
            mobileNumber: customers.mobileNumber,
            customerCode: customers.customerCode,
            photoUrl: customers.photoUrl,
            relationType: customers.relationType,
            relationName: customers.relationName,
          },
        })
        .from(pledges)
        .leftJoin(customers, eq(pledges.customerId, customers.id))
        .where(whereClause)
        .orderBy(desc(pledges.createdAt))
        .limit(limit)
        .offset(offset);

      // Enhance with computed dynamic status
      const data = records.map(r => {
        const dynamicStatus = computePledgeStatus(r.pledge.status, r.pledge.dueDate, r.pledge.closedDate);
        return {
          ...r.pledge,
          status: dynamicStatus,
          customer: r.customer,
        };
      });

      return reply.send({
        success: true,
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve pledges' });
    }
  });

  // GET /api/pledges/:id
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const pledgeResult = await db
        .select({
          pledge: pledges,
          customer: customers,
        })
        .from(pledges)
        .leftJoin(customers, eq(pledges.customerId, customers.id))
        .where(eq(pledges.id, id))
        .limit(1);

      if (pledgeResult.length === 0) {
        return reply.status(404).send({ success: false, error: 'Pledge not found' });
      }

      const p = pledgeResult[0];

      // Fetch articles
      const articles = await db
        .select()
        .from(pledgeArticles)
        .where(eq(pledgeArticles.pledgeId, id));

      // Fetch payments
      const paymentList = await db
        .select()
        .from(payments)
        .where(eq(payments.pledgeId, id))
        .orderBy(desc(payments.paymentDate));

      const dynamicStatus = computePledgeStatus(p.pledge.status, p.pledge.dueDate, p.pledge.closedDate);

      return reply.send({
        success: true,
        data: {
          ...p.pledge,
          status: dynamicStatus,
          customer: p.customer,
          articles,
          payments: paymentList,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to fetch pledge details' });
    }
  });

  // POST /api/pledges (Transactional registration)
  fastify.post('/', async (request, reply) => {
    const parseResult = createPledgeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const data = parseResult.data;

    // Validate due date >= pledge date
    if (new Date(data.dueDate) < new Date(data.pledgeDate)) {
      return reply.status(400).send({
        success: false,
        error: 'Due Date cannot be earlier than Pledge Date',
      });
    }

    try {
      let finalCustomerId = data.customerId;

      // Handle Customer Creation or Lookup
      if (!finalCustomerId) {
        if (!data.customer) {
          return reply.status(400).send({
            success: false,
            error: 'Either customerId or customer details must be provided',
          });
        }

        // Check if customer exists by mobile if mobile provided
        let existingCust: any[] = [];
        const cleanMobile = data.customer.mobileNumber ? data.customer.mobileNumber.trim() : null;
        if (cleanMobile) {
          existingCust = await db
            .select()
            .from(customers)
            .where(eq(customers.mobileNumber, cleanMobile))
            .limit(1);
        }

        if (existingCust.length > 0) {
          finalCustomerId = existingCust[0].id;
          // Optionally update customer details
          if (data.customer.photoUrl && !existingCust[0].photoUrl) {
            await db
              .update(customers)
              .set({ photoUrl: data.customer.photoUrl })
              .where(eq(customers.id, finalCustomerId as string));
          }
        } else {
          // Create new customer
          const countRes = await db.select({ count: sql<number>`count(*)::int` }).from(customers);
          const nextNum = (countRes[0]?.count || 0) + 1;
          const customerCode = `CUST-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

          const newCust = await db
            .insert(customers)
            .values({
              customerCode,
              name: data.customer.name.trim(),
              relationType: data.customer.relationType,
              relationName: data.customer.relationName ? data.customer.relationName.trim() : null,
              mobileNumber: cleanMobile,
              secondaryMobile: data.customer.secondaryMobile || null,
              email: data.customer.email || null,
              monthlyIncome: String(data.customer.monthlyIncome || 0),
              address: data.customer.address.trim(),
              city: data.customer.city || 'Mumbai',
              pincode: data.customer.pincode || null,
              photoUrl: data.customer.photoUrl || null,
            })
            .returning();

          finalCustomerId = newCust[0].id;
        }
      }

      // Determine Pledge Number
      let pledgeNum = data.pledgeNumber?.trim();
      if (pledgeNum) {
        // Manual entry only for admin
        if (request.user?.role !== 'admin') {
          return reply.status(403).send({
            success: false,
            error: 'Only administrators are authorized to enter custom pledge numbers',
          });
        }

        const isTaken = await PledgeNumberService.isPledgeNumberTaken(pledgeNum);
        if (isTaken) {
          return reply.status(409).send({
            success: false,
            error: `Pledge number ${pledgeNum} already exists. Please choose a unique pledge number.`,
          });
        }
      } else {
        pledgeNum = await PledgeNumberService.generateNextPledgeNumber();
      }

      // Calculate Article Aggregations
      let totalQty = 0;
      let totalGross = 0;
      let totalLess = 0;
      let totalNet = 0;
      let totalPresentVal = 0;
      let totalLoan = 0;

      const processedArticles = data.articles.map(art => {
        const gross = parseFloat(String(art.grossWeight)) || 0;
        const less = parseFloat(String(art.lessWeight)) || 0;
        const net = Math.max(0, gross - less);
        const presentVal = parseFloat(String(art.presentValue)) || 0;
        const loan = parseFloat(String(art.loanAmount)) || 0;

        totalQty += art.quantity;
        totalGross += gross;
        totalLess += less;
        totalNet += net;
        totalPresentVal += presentVal;
        totalLoan += loan;

        return {
          itemName: art.itemName.trim(),
          metalType: art.metalType,
          purity: art.purity,
          quantity: art.quantity,
          grossWeight: gross.toFixed(3),
          lessWeight: less.toFixed(3),
          netWeight: net.toFixed(3),
          presentValue: presentVal.toFixed(2),
          loanAmount: loan.toFixed(2),
          loanAmountWords: numberToIndianWords(loan),
          itemPhotoUrl: art.itemPhotoUrl || null,
          isRepledged: art.isRepledged || false,
          repledgedBankName: art.repledgedBankName || null,
          remarks: art.remarks || null,
        };
      });

      const totalLoanWords = numberToIndianWords(totalLoan);
      const initialStatus = data.isDraft ? 'active' : computePledgeStatus('active', data.dueDate);
      const pledgeMetalType = data.articles.some(a => a.metalType === 'Silver') ? 'Silver' : 'Gold';

      // Perform Transactional Insertion
      const createdPledge = await db.transaction(async tx => {
        const [pRecord] = await tx
          .insert(pledges)
          .values({
            pledgeNumber: pledgeNum,
            customerId: finalCustomerId as string,
            pledgeDate: data.pledgeDate,
            dueDate: data.dueDate,
            metalType: pledgeMetalType,
            interestRatePercent: String(data.interestRatePercent),
            interestPeriod: data.interestPeriod,
            totalArticlesCount: totalQty,
            totalGrossWeight: totalGross.toFixed(3),
            totalLessWeight: totalLess.toFixed(3),
            totalNetWeight: totalNet.toFixed(3),
            totalPresentValue: totalPresentVal.toFixed(2),
            totalLoanAmount: totalLoan.toFixed(2),
            loanAmountWords: totalLoanWords,
            status: initialStatus,
            isDraft: data.isDraft,
            storageLocation: data.storageLocation,
            createdBy: request.user?.id || null,
          })
          .returning();

        // Insert articles
        for (const art of processedArticles) {
          await tx.insert(pledgeArticles).values({
            pledgeId: pRecord.id,
            ...art,
          });
        }

        return pRecord;
      });

      await AuditService.log({
        userId: request.user?.id,
        action: 'CREATE_PLEDGE',
        entityName: 'pledges',
        entityId: createdPledge.id,
        details: {
          pledgeNumber: createdPledge.pledgeNumber,
          loanAmount: createdPledge.totalLoanAmount,
          articlesCount: processedArticles.length,
        },
        ipAddress: request.ip,
      });

      return reply.status(201).send({
        success: true,
        data: createdPledge,
        message: 'Girvi pledge registered successfully',
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to create pledge transaction' });
    }
  });

  // PUT /api/pledges/:id
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const existing = await db.select().from(pledges).where(eq(pledges.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: 'Pledge not found' });
      }

      const body = request.body as Partial<{
        dueDate: string;
        interestRatePercent: number;
        storageLocation: string;
        closureRemarks: string;
        status: string;
      }>;

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (body.dueDate) updateData.dueDate = body.dueDate;
      if (body.interestRatePercent !== undefined) updateData.interestRatePercent = String(body.interestRatePercent);
      if (body.storageLocation !== undefined) updateData.storageLocation = body.storageLocation;
      if (body.closureRemarks !== undefined) updateData.closureRemarks = body.closureRemarks;
      if (body.status !== undefined) updateData.status = body.status;

      const updated = await db
        .update(pledges)
        .set(updateData)
        .where(eq(pledges.id, id))
        .returning();

      await AuditService.log({
        userId: request.user?.id,
        action: 'UPDATE_PLEDGE',
        entityName: 'pledges',
        entityId: id,
        details: updateData,
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        data: updated[0],
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to update pledge' });
    }
  });

  // POST /api/pledges/:id/close (Closure of pledge)
  fastify.post('/:id/close', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      totalPaid: number;
      paymentMode?: string;
      remarks?: string;
    };

    try {
      const existing = await db.select().from(pledges).where(eq(pledges.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: 'Pledge not found' });
      }

      if (existing[0].status === 'closed') {
        return reply.status(400).send({ success: false, error: 'Pledge is already closed' });
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const receiptNumber = `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      await db.transaction(async tx => {
        // Record closure payment
        if (body.totalPaid > 0) {
          await tx.insert(payments).values({
            pledgeId: id,
            receiptNumber,
            paymentDate: todayStr,
            paymentType: 'closure',
            principalAmount: existing[0].totalLoanAmount,
            totalPaid: String(body.totalPaid),
            paymentMode: body.paymentMode || 'Cash',
            remarks: body.remarks || 'Full loan redemption & closure',
            receivedBy: request.user?.id || null,
          });
        }

        // Update pledge status to closed
        await tx
          .update(pledges)
          .set({
            status: 'closed',
            closedDate: todayStr,
            closureRemarks: body.remarks || 'Loan redeemed and pledge closed',
            updatedAt: new Date(),
          })
          .where(eq(pledges.id, id));
      });

      await AuditService.log({
        userId: request.user?.id,
        action: 'CLOSE_PLEDGE',
        entityName: 'pledges',
        entityId: id,
        details: { totalPaid: body.totalPaid, receiptNumber },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: 'Pledge closed successfully and ornaments redeemed',
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to close pledge' });
    }
  });

  // GET /api/pledges/:id/receipt (Complete data for print & PDF)
  fastify.get('/:id/receipt', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const pledgeRes = await db
        .select({
          pledge: pledges,
          customer: customers,
        })
        .from(pledges)
        .leftJoin(customers, eq(pledges.customerId, customers.id))
        .where(eq(pledges.id, id))
        .limit(1);

      if (pledgeRes.length === 0) {
        return reply.status(404).send({ success: false, error: 'Pledge not found' });
      }

      const articles = await db
        .select()
        .from(pledgeArticles)
        .where(eq(pledgeArticles.pledgeId, id));

      const settings = await db.select().from(businessSettings).limit(1);
      const business = settings[0] || {
        businessName: 'Shree Ganesh Jewellers & Bankers',
        tagline: 'Govt. Approved Pawn Brokers & Gold Loan Specialist',
        licenseNumber: 'MH-PB-2024-8849',
        gstin: '27AABCU9603R1ZM',
        ownerName: 'Ramesh Chandra Sharma',
        phone: '+91 98765 43210',
        secondaryPhone: '022-28491029',
        email: 'contact@ganeshjewellers.com',
        addressLine1: 'Shop No. 12, Gold Souk Market, Zaveri Bazaar',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
        termsAndConditions: '1. All jewellery articles pledged are stored safely in computerized fireproof vaults.\n2. Original receipt is mandatory for redemption.',
      };

      return reply.send({
        success: true,
        data: {
          business,
          pledge: pledgeRes[0].pledge,
          customer: pledgeRes[0].customer,
          articles,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to generate receipt data' });
    }
  });

  // DELETE /api/pledges/:id (Admin only)
  fastify.delete('/:id', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await db.delete(pledges).where(eq(pledges.id, id));

      await AuditService.log({
        userId: request.user?.id,
        action: 'DELETE_PLEDGE',
        entityName: 'pledges',
        entityId: id,
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: 'Pledge record deleted successfully',
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to delete pledge' });
    }
  });
}
