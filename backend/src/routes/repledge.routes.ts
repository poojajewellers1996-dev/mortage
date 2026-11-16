import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { repledges, repledgePledges, pledges, pledgeArticles, customers } from '../db/schema.js';
import { eq, or, and, ilike, desc, sql, inArray } from 'drizzle-orm';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuditService } from '../services/audit.service.js';

export const PLEDGER_NAMES = [
  'VIKRAM',
  'DEEPAK S',
  'KAVITHA S',
  'SHANKARLAL',
  'KAMLESH',
  'OM PRAKASH',
  'MAINA DEVI',
  'VIKASH',
] as const;

export const BANK_NAMES = [
  'Kosamattam Finance',
  'Muthoot Money',
  'BOB',
  'DH',
  'SBI',
] as const;

const createRepledgeSchema = z.object({
  pledgerName: z.string().min(1, 'Name of the pledger is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  bankPledgeNumber: z.string().min(1, 'Bank pledge number is required'),
  bankPledgeDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  bankPledgeAmount: z.number().nonnegative('Bank pledge amount must be positive'),
  pledgeIds: z.array(z.string()).min(1, 'At least one of our girvi numbers must be linked'),
  remarks: z.string().optional().nullable(),
});

const updateRepledgeSchema = z.object({
  pledgerName: z.string().optional(),
  bankName: z.string().optional(),
  bankPledgeNumber: z.string().optional(),
  bankPledgeDate: z.string().optional(),
  bankPledgeAmount: z.number().optional(),
  remarks: z.string().optional().nullable(),
  pledgeIds: z.array(z.string()).optional(),
});

const releaseRepledgeSchema = z.object({
  releasedDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  releaseRemarks: z.string().optional().nullable(),
});

export async function repledgeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/repledges - List all repledges with filters
  fastify.get('/', async (request, reply) => {
    try {
      const query = request.query as {
        status?: string;
        search?: string;
        bankName?: string;
        pledgerName?: string;
      };

      const conditions = [];

      if (query.status && query.status !== 'all') {
        conditions.push(eq(repledges.status, query.status));
      }

      if (query.bankName && query.bankName !== 'all') {
        conditions.push(eq(repledges.bankName, query.bankName));
      }

      if (query.pledgerName && query.pledgerName !== 'all') {
        conditions.push(eq(repledges.pledgerName, query.pledgerName));
      }

      if (query.search && query.search.trim()) {
        const term = `%${query.search.trim()}%`;
        conditions.push(
          or(
            ilike(repledges.bankPledgeNumber, term),
            ilike(repledges.bankName, term),
            ilike(repledges.pledgerName, term),
            sql`${repledges.linkedPledgeNumbers}::text ILIKE ${term}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const records = await db
        .select()
        .from(repledges)
        .where(whereClause)
        .orderBy(desc(repledges.createdAt));

      // Fetch linked pledges for each repledge
      const repledgeIds = records.map(r => r.id);
      let linkedMap: Record<string, any[]> = {};

      if (repledgeIds.length > 0) {
        const allLinks = await db
          .select({
            repledgeId: repledgePledges.repledgeId,
            pledgeId: repledgePledges.pledgeId,
            pledgeNumber: repledgePledges.pledgeNumber,
            totalGrossWeight: pledges.totalGrossWeight,
            totalNetWeight: pledges.totalNetWeight,
            totalLoanAmount: pledges.totalLoanAmount,
            status: pledges.status,
            customerName: customers.name,
          })
          .from(repledgePledges)
          .leftJoin(pledges, eq(repledgePledges.pledgeId, pledges.id))
          .leftJoin(customers, eq(pledges.customerId, customers.id))
          .where(inArray(repledgePledges.repledgeId, repledgeIds));

        for (const link of allLinks) {
          if (!linkedMap[link.repledgeId]) {
            linkedMap[link.repledgeId] = [];
          }
          linkedMap[link.repledgeId].push(link);
        }
      }

      const enriched = records.map(r => ({
        ...r,
        linkedPledges: linkedMap[r.id] || [],
      }));

      return reply.send({
        success: true,
        data: enriched,
        count: enriched.length,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve repledges' });
    }
  });

  // GET /api/repledges/:id - Fetch single repledge
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const record = await db.select().from(repledges).where(eq(repledges.id, id)).limit(1);

      if (record.length === 0) {
        return reply.status(404).send({ success: false, error: 'Repledge not found' });
      }

      const linked = await db
        .select({
          repledgeId: repledgePledges.repledgeId,
          pledgeId: repledgePledges.pledgeId,
          pledgeNumber: repledgePledges.pledgeNumber,
          totalGrossWeight: pledges.totalGrossWeight,
          totalNetWeight: pledges.totalNetWeight,
          totalLoanAmount: pledges.totalLoanAmount,
          status: pledges.status,
          customerName: customers.name,
          customerMobile: customers.mobileNumber,
        })
        .from(repledgePledges)
        .leftJoin(pledges, eq(repledgePledges.pledgeId, pledges.id))
        .leftJoin(customers, eq(pledges.customerId, customers.id))
        .where(eq(repledgePledges.repledgeId, id));

      return reply.send({
        success: true,
        data: {
          ...record[0],
          linkedPledges: linked,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve repledge details' });
    }
  });

  // POST /api/repledges - Create a new bank repledge linking multiple girvis
  fastify.post('/', async (request, reply) => {
    const parse = createRepledgeSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parse.error.format(),
      });
    }

    const data = parse.data;

    try {
      // Fetch target pledges
      const targetPledges = await db
        .select()
        .from(pledges)
        .where(inArray(pledges.id, data.pledgeIds));

      if (targetPledges.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'None of the selected girvi pledges were found',
        });
      }

      // Calculate totals
      let totalGross = 0;
      let totalNet = 0;
      const pledgeNumbers: string[] = [];

      for (const p of targetPledges) {
        totalGross += parseFloat(String(p.totalGrossWeight || 0));
        totalNet += parseFloat(String(p.totalNetWeight || 0));
        pledgeNumbers.push(p.pledgeNumber);
      }

      const user = (request as any).user;

      let createdRepledge: any;

      await db.transaction(async tx => {
        // Insert repledge record
        const inserted = await tx
          .insert(repledges)
          .values({
            pledgerName: data.pledgerName.trim(),
            bankName: data.bankName.trim(),
            bankPledgeNumber: data.bankPledgeNumber.trim(),
            bankPledgeDate: data.bankPledgeDate,
            bankPledgeAmount: String(data.bankPledgeAmount),
            status: 'active',
            remarks: data.remarks ? data.remarks.trim() : null,
            totalPledgesCount: targetPledges.length,
            totalGrossWeight: totalGross.toFixed(3),
            totalNetWeight: totalNet.toFixed(3),
            linkedPledgeNumbers: pledgeNumbers,
            createdBy: user?.id || null,
          })
          .returning();

        createdRepledge = inserted[0];

        // Link in repledge_pledges table
        for (const p of targetPledges) {
          await tx.insert(repledgePledges).values({
            repledgeId: createdRepledge.id,
            pledgeId: p.id,
            pledgeNumber: p.pledgeNumber,
          });

          // Mark pledge as repledged
          await tx
            .update(pledges)
            .set({
              isRepledged: true,
              repledgeId: createdRepledge.id,
              repledgedBankName: data.bankName.trim(),
              updatedAt: new Date(),
            })
            .where(eq(pledges.id, p.id));

          // Also mark articles
          await tx
            .update(pledgeArticles)
            .set({
              isRepledged: true,
              repledgedBankName: data.bankName.trim(),
              updatedAt: new Date(),
            })
            .where(eq(pledgeArticles.pledgeId, p.id));
        }
      });

      await AuditService.log({
        userId: user?.id,
        action: 'CREATE_REPLEDGE',
        entityName: 'repledges',
        entityId: createdRepledge.id,
        details: {
          pledgerName: data.pledgerName,
          bankName: data.bankName,
          bankPledgeNumber: data.bankPledgeNumber,
          linkedPledges: pledgeNumbers,
          amount: data.bankPledgeAmount,
        },
      });

      return reply.status(201).send({
        success: true,
        data: {
          ...createdRepledge,
          linkedPledges: targetPledges,
        },
        message: `Re-pledge with ${data.bankName} created successfully (#${data.bankPledgeNumber})`,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to create repledge',
      });
    }
  });

  // POST /api/repledges/:id/release - Release bank repledge and UNLINK our girvis
  fastify.post('/:id/release', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = releaseRepledgeSchema.safeParse(request.body || {});
    if (!parse.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parse.error.format(),
      });
    }

    const { releasedDate, releaseRemarks } = parse.data;

    try {
      const existing = await db.select().from(repledges).where(eq(repledges.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: 'Repledge not found' });
      }

      if (existing[0].status === 'released') {
        return reply.status(400).send({ success: false, error: 'Repledge is already released' });
      }

      // Find all linked pledges to unlink
      const links = await db.select().from(repledgePledges).where(eq(repledgePledges.repledgeId, id));
      const pledgeIds = links.map(l => l.pledgeId);

      await db.transaction(async tx => {
        // 1. Mark repledge as released
        await tx
          .update(repledges)
          .set({
            status: 'released',
            releasedDate,
            releaseRemarks: releaseRemarks ? releaseRemarks.trim() : null,
            updatedAt: new Date(),
          })
          .where(eq(repledges.id, id));

        // 2. Unlink all linked girvis so they are completely unlinked from bank repledge!
        if (pledgeIds.length > 0) {
          await tx
            .update(pledges)
            .set({
              isRepledged: false,
              repledgeId: null,
              repledgedBankName: null,
              updatedAt: new Date(),
            })
            .where(inArray(pledges.id, pledgeIds));

          await tx
            .update(pledgeArticles)
            .set({
              isRepledged: false,
              repledgedBankName: null,
              updatedAt: new Date(),
            })
            .where(inArray(pledgeArticles.pledgeId, pledgeIds));
        }
      });

      const user = (request as any).user;
      await AuditService.log({
        userId: user?.id,
        action: 'RELEASE_REPLEDGE',
        entityName: 'repledges',
        entityId: id,
        details: {
          releasedDate,
          bankPledgeNumber: existing[0].bankPledgeNumber,
          bankName: existing[0].bankName,
          unlinkedPledgeCount: pledgeIds.length,
          unlinkedPledges: existing[0].linkedPledgeNumbers,
        },
      });

      return reply.send({
        success: true,
        message: `Bank Re-pledge #${existing[0].bankPledgeNumber} has been released and all linked Girvis have been unlinked!`,
        data: {
          id,
          status: 'released',
          releasedDate,
          unlinkedPledges: existing[0].linkedPledgeNumbers,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to release repledge',
      });
    }
  });

  // DELETE /api/repledges/:id - Delete repledge (unlinks if active)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const existing = await db.select().from(repledges).where(eq(repledges.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: 'Repledge not found' });
      }

      await db.transaction(async tx => {
        // If active, unlink girvis
        if (existing[0].status === 'active') {
          const links = await tx.select().from(repledgePledges).where(eq(repledgePledges.repledgeId, id));
          const pIds = links.map(l => l.pledgeId);
          if (pIds.length > 0) {
            await tx
              .update(pledges)
              .set({
                isRepledged: false,
                repledgeId: null,
                repledgedBankName: null,
                updatedAt: new Date(),
              })
              .where(inArray(pledges.id, pIds));

            await tx
              .update(pledgeArticles)
              .set({
                isRepledged: false,
                repledgedBankName: null,
                updatedAt: new Date(),
              })
              .where(inArray(pledgeArticles.pledgeId, pIds));
          }
        }

        // Delete links and repledge
        await tx.delete(repledgePledges).where(eq(repledgePledges.repledgeId, id));
        await tx.delete(repledges).where(eq(repledges.id, id));
      });

      return reply.send({
        success: true,
        message: `Repledge #${existing[0].bankPledgeNumber} deleted successfully`,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to delete repledge',
      });
    }
  });
}
