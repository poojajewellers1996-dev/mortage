import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { payments, pledges, customers } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuditService } from '../services/audit.service.js';

const paymentSchema = z.object({
  pledgeId: z.string().uuid(),
  paymentDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  paymentType: z.enum(['interest', 'principal', 'closure', 'partial']),
  principalAmount: z.number().nonnegative().default(0),
  interestAmount: z.number().nonnegative().default(0),
  penaltyAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  totalPaid: z.number().positive('Total paid must be greater than zero'),
  paymentMode: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Cheque']).default('Cash'),
  referenceNumber: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/payments
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as {
        pledgeId?: string;
        page?: string;
        limit?: string;
      };

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const conditions = [];
      if (query.pledgeId) {
        conditions.push(eq(payments.pledgeId, query.pledgeId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(whereClause);
      const total = totalResult[0]?.count || 0;

      const records = await db
        .select({
          payment: payments,
          pledgeNumber: pledges.pledgeNumber,
          customerName: customers.name,
        })
        .from(payments)
        .leftJoin(pledges, eq(payments.pledgeId, pledges.id))
        .leftJoin(customers, eq(pledges.customerId, customers.id))
        .where(whereClause)
        .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.send({
        success: true,
        data: records.map(r => ({
          ...r.payment,
          pledgeNumber: r.pledgeNumber,
          customerName: r.customerName,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve payments' });
    }
  });

  // POST /api/payments
  fastify.post('/', async (request, reply) => {
    const parseResult = paymentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const data = parseResult.data;

    try {
      const pledge = await db.select().from(pledges).where(eq(pledges.id, data.pledgeId)).limit(1);
      if (pledge.length === 0) {
        return reply.status(404).send({ success: false, error: 'Pledge not found' });
      }

      const receiptNumber = `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const inserted = await db.transaction(async tx => {
        const [pay] = await tx
          .insert(payments)
          .values({
            pledgeId: data.pledgeId,
            receiptNumber,
            paymentDate: data.paymentDate,
            paymentType: data.paymentType,
            principalAmount: data.principalAmount.toFixed(2),
            interestAmount: data.interestAmount.toFixed(2),
            penaltyAmount: data.penaltyAmount.toFixed(2),
            discountAmount: data.discountAmount.toFixed(2),
            totalPaid: data.totalPaid.toFixed(2),
            paymentMode: data.paymentMode,
            referenceNumber: data.referenceNumber || null,
            remarks: data.remarks || null,
            receivedBy: request.user?.id || null,
          })
          .returning();

        // If closure payment, update pledge status to closed
        if (data.paymentType === 'closure') {
          await tx
            .update(pledges)
            .set({
              status: 'closed',
              closedDate: data.paymentDate,
              closureRemarks: data.remarks || 'Loan redeemed and closed',
              updatedAt: new Date(),
            })
            .where(eq(pledges.id, data.pledgeId));
        }

        return pay;
      });

      await AuditService.log({
        userId: request.user?.id,
        action: 'RECORD_PAYMENT',
        entityName: 'payments',
        entityId: inserted.id,
        details: { receiptNumber, totalPaid: inserted.totalPaid, type: data.paymentType },
        ipAddress: request.ip,
      });

      return reply.status(201).send({
        success: true,
        data: inserted,
        message: 'Payment recorded successfully',
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to record payment' });
    }
  });
}
