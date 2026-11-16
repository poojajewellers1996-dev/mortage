import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { customers, pledges } from '../db/schema.js';
import { eq, or, ilike, sql, desc } from 'drizzle-orm';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { AuditService } from '../services/audit.service.js';

const customerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  relationType: z.enum(['S/O', 'D/O', 'W/O', 'C/O', 'O']).default('S/O'),
  relationName: z.string().optional().nullable(),
  mobileNumber: z.string().optional().nullable().or(z.literal('')),
  secondaryMobile: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  monthlyIncome: z.union([z.number(), z.string()]).transform(v => String(v || 0)),
  address: z.string().min(3, 'Address is required'),
  city: z.string().default('Mumbai'),
  pincode: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  idProofType: z.string().optional().nullable(),
  idProofNumber: z.string().optional().nullable(),
  idProofUrl: z.string().optional().nullable(),
});

export async function customerRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/customers
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as {
        search?: string;
        page?: string;
        limit?: string;
      };

      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      let conditions = undefined;
      if (query.search && query.search.trim()) {
        const searchTerm = `%${query.search.trim()}%`;
        conditions = or(
          ilike(customers.name, searchTerm),
          ilike(customers.mobileNumber, searchTerm),
          ilike(customers.customerCode, searchTerm)
        );
      }

      const totalResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
        .where(conditions);
      const total = totalResult[0]?.count || 0;

      const customerList = await db
        .select()
        .from(customers)
        .where(conditions)
        .orderBy(desc(customers.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.send({
        success: true,
        data: customerList,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve customers' });
    }
  });

  // GET /api/customers/:id
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1);

      if (customerResult.length === 0) {
        return reply.status(404).send({ success: false, error: 'Customer not found' });
      }

      const customer = customerResult[0];

      // Fetch pledge history for this customer
      const pledgeHistory = await db
        .select()
        .from(pledges)
        .where(eq(pledges.customerId, id))
        .orderBy(desc(pledges.pledgeDate));

      // Calculate total active loan amount
      let totalActiveLoan = 0;
      let totalPledgesCount = pledgeHistory.length;
      let activePledgesCount = 0;

      for (const p of pledgeHistory) {
        if (p.status === 'active' || p.status === 'due_soon' || p.status === 'overdue') {
          totalActiveLoan += parseFloat(p.totalLoanAmount);
          activePledgesCount++;
        }
      }

      return reply.send({
        success: true,
        data: {
          ...customer,
          stats: {
            totalPledgesCount,
            activePledgesCount,
            totalActiveLoan,
          },
          pledges: pledgeHistory,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to fetch customer profile' });
    }
  });

  // POST /api/customers
  fastify.post('/', async (request, reply) => {
    const parseResult = customerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const data = parseResult.data;

    try {
      // Check for existing customer with same mobile if provided
      if (data.mobileNumber && data.mobileNumber.trim()) {
        const existing = await db
          .select()
          .from(customers)
          .where(eq(customers.mobileNumber, data.mobileNumber.trim()))
          .limit(1);

        if (existing.length > 0) {
          return reply.status(409).send({
            success: false,
            error: `A customer with mobile number ${data.mobileNumber} already exists (${existing[0].name}).`,
            existingCustomer: existing[0],
          });
        }
      }

      // Generate customer code
      const countRes = await db.select({ count: sql<number>`count(*)::int` }).from(customers);
      const nextNum = (countRes[0]?.count || 0) + 1;
      const customerCode = `CUST-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

      const inserted = await db
        .insert(customers)
        .values({
          customerCode,
          name: data.name.trim(),
          relationType: data.relationType,
          relationName: data.relationName ? data.relationName.trim() : null,
          mobileNumber: data.mobileNumber ? data.mobileNumber.trim() : null,
          secondaryMobile: data.secondaryMobile ? data.secondaryMobile.trim() : null,
          email: data.email ? data.email.trim() : null,
          monthlyIncome: data.monthlyIncome,
          address: data.address.trim(),
          city: data.city || 'Mumbai',
          pincode: data.pincode || null,
          photoUrl: data.photoUrl || null,
          idProofType: data.idProofType || null,
          idProofNumber: data.idProofNumber || null,
          idProofUrl: data.idProofUrl || null,
        })
        .returning();

      await AuditService.log({
        userId: request.user?.id,
        action: 'CREATE_CUSTOMER',
        entityName: 'customers',
        entityId: inserted[0].id,
        details: { name: inserted[0].name, mobile: inserted[0].mobileNumber },
        ipAddress: request.ip,
      });

      return reply.status(201).send({
        success: true,
        data: inserted[0],
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to create customer record' });
    }
  });

  // PUT /api/customers/:id
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = customerSchema.partial().safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const existing = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: 'Customer not found' });
      }

      const updateData = {
        ...parseResult.data,
        updatedAt: new Date(),
      };

      const updated = await db
        .update(customers)
        .set(updateData)
        .where(eq(customers.id, id))
        .returning();

      await AuditService.log({
        userId: request.user?.id,
        action: 'UPDATE_CUSTOMER',
        entityName: 'customers',
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
      return reply.status(500).send({ success: false, error: 'Failed to update customer' });
    }
  });

  // DELETE /api/customers/:id (Admin only)
  fastify.delete('/:id', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // Check if customer has associated pledges
      const pledgeCountRes = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pledges)
        .where(eq(pledges.customerId, id));

      const pledgeCount = pledgeCountRes[0]?.count || 0;
      if (pledgeCount > 0) {
        return reply.status(400).send({
          success: false,
          error: `Cannot delete customer: Customer has ${pledgeCount} existing pledge records. Close or archive the pledges first.`,
        });
      }

      await db.delete(customers).where(eq(customers.id, id));

      await AuditService.log({
        userId: request.user?.id,
        action: 'DELETE_CUSTOMER',
        entityName: 'customers',
        entityId: id,
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to delete customer' });
    }
  });
}
