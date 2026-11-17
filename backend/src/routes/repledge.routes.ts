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

          // Fetch all active banks this pledge is currently part of
          const activeLinks = await tx
            .select({ bankName: repledges.bankName })
            .from(repledgePledges)
            .innerJoin(repledges, eq(repledgePledges.repledgeId, repledges.id))
            .where(
              and(
                eq(repledgePledges.pledgeId, p.id),
                eq(repledges.status, 'active')
              )
            );

          const allBankNames = Array.from(
            new Set([...activeLinks.map(l => l.bankName), data.bankName.trim()])
          ).join(', ');

          // Mark pledge as repledged with all active banks
          await tx
            .update(pledges)
            .set({
              isRepledged: true,
              repledgeId: createdRepledge.id,
              repledgedBankName: allBankNames,
              updatedAt: new Date(),
            })
            .where(eq(pledges.id, p.id));

          // Also mark articles
          await tx
            .update(pledgeArticles)
            .set({
              isRepledged: true,
              repledgedBankName: allBankNames,
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

  // PUT /api/repledges/:id - Edit an existing re-pledge
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = updateRepledgeSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parse.error.format(),
      });
    }

    const data = parse.data;

    try {
      const existingList = await db.select().from(repledges).where(eq(repledges.id, id)).limit(1);
      if (existingList.length === 0) {
        return reply.status(404).send({ success: false, error: 'Re-pledge record not found' });
      }

      const existing = existingList[0];
      const newBankName = data.bankName || existing.bankName;
      const newPledgerName = data.pledgerName || existing.pledgerName;
      const newPledgeNum = data.bankPledgeNumber ? data.bankPledgeNumber.trim().toUpperCase() : existing.bankPledgeNumber;
      const newPledgeDate = data.bankPledgeDate || existing.bankPledgeDate;
      const newPledgeAmount = data.bankPledgeAmount !== undefined ? data.bankPledgeAmount : parseFloat(existing.bankPledgeAmount);
      const newRemarks = data.remarks !== undefined ? data.remarks : existing.remarks;

      // Check if bank pledge number changed, and ensure it's not duplicate with another repledge
      if (data.bankPledgeNumber && data.bankPledgeNumber.trim().toUpperCase() !== existing.bankPledgeNumber) {
        const dupCheck = await db
          .select({ id: repledges.id })
          .from(repledges)
          .where(
            and(
              eq(repledges.bankPledgeNumber, data.bankPledgeNumber.trim().toUpperCase()),
              sql`${repledges.id} != ${id}::uuid`
            )
          )
          .limit(1);

        if (dupCheck.length > 0) {
          return reply.status(400).send({
            success: false,
            error: `Another bank re-pledge already exists with number #${data.bankPledgeNumber.trim().toUpperCase()}`,
          });
        }
      }

      // Existing linked pledges
      const existingLinks = await db
        .select()
        .from(repledgePledges)
        .where(eq(repledgePledges.repledgeId, id));
      const existingPledgeIds = existingLinks.map(l => l.pledgeId);

      // Desired linked pledges (if provided in update body, otherwise keep existing)
      const targetPledgeIds = data.pledgeIds && data.pledgeIds.length > 0 ? data.pledgeIds : existingPledgeIds;

      // Identify added and removed pledges
      const addedPledgeIds = targetPledgeIds.filter(pid => !existingPledgeIds.includes(pid));
      const removedPledgeIds = existingPledgeIds.filter(pid => !targetPledgeIds.includes(pid));

      // Fetch target pledges to calculate updated total weights and our loan amounts
      const targetPledges = await db
        .select()
        .from(pledges)
        .where(inArray(pledges.id, targetPledgeIds));

      if (targetPledges.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'At least one valid active girvi must remain linked to this re-pledge',
        });
      }

      const totalGrossWeight = targetPledges.reduce(
        (sum, p) => sum + (parseFloat(p.totalGrossWeight) || 0),
        0
      );
      const totalNetWeight = targetPledges.reduce(
        (sum, p) => sum + (parseFloat(p.totalNetWeight) || 0),
        0
      );
      const totalOurLoanAmount = targetPledges.reduce(
        (sum, p) => sum + (parseFloat(p.totalLoanAmount) || 0),
        0
      );
      const pledgeNumbers = targetPledges.map(p => p.pledgeNumber);

      await db.transaction(async tx => {
        // 1. If removed pledges exist, unlink them
        for (const pid of removedPledgeIds) {
          // Remove link from repledgePledges
          await tx
            .delete(repledgePledges)
            .where(
              and(
                eq(repledgePledges.repledgeId, id),
                eq(repledgePledges.pledgeId, pid)
              )
            );

          // Check if pid is linked to any other active bank re-pledge
          const otherActiveLinks = await tx
            .select({ bankName: repledges.bankName, id: repledges.id })
            .from(repledgePledges)
            .innerJoin(repledges, eq(repledgePledges.repledgeId, repledges.id))
            .where(
              and(
                eq(repledgePledges.pledgeId, pid),
                sql`${repledges.id} != ${id}::uuid`,
                eq(repledges.status, 'active')
              )
            );

          if (otherActiveLinks.length > 0) {
            const remainingBanks = Array.from(
              new Set(otherActiveLinks.map(l => l.bankName))
            ).join(', ');

            await tx
              .update(pledges)
              .set({
                isRepledged: true,
                repledgeId: otherActiveLinks[0].id,
                repledgedBankName: remainingBanks,
                updatedAt: new Date(),
              })
              .where(eq(pledges.id, pid));

            await tx
              .update(pledgeArticles)
              .set({
                isRepledged: true,
                repledgedBankName: remainingBanks,
                updatedAt: new Date(),
              })
              .where(eq(pledgeArticles.pledgeId, pid));
          } else {
            await tx
              .update(pledges)
              .set({
                isRepledged: false,
                repledgeId: null,
                repledgedBankName: null,
                updatedAt: new Date(),
              })
              .where(eq(pledges.id, pid));

            await tx
              .update(pledgeArticles)
              .set({
                isRepledged: false,
                repledgedBankName: null,
                updatedAt: new Date(),
              })
              .where(eq(pledgeArticles.pledgeId, pid));
          }
        }

        // 2. If new pledges are added, insert link and mark as repledged
        for (const pid of addedPledgeIds) {
          await tx.insert(repledgePledges).values({
            repledgeId: id,
            pledgeId: pid,
          });
        }

        // 3. For all target pledges, update repledgedBankName if bankName changed or newly added
        for (const pid of targetPledgeIds) {
          const allActiveLinks = await tx
            .select({ bankName: repledges.bankName, id: repledges.id })
            .from(repledgePledges)
            .innerJoin(repledges, eq(repledgePledges.repledgeId, repledges.id))
            .where(
              and(
                eq(repledgePledges.pledgeId, pid),
                eq(repledges.status, 'active')
              )
            );

          const currentBankSet = new Set(allActiveLinks.map(l => (l.id === id ? newBankName : l.bankName)));
          currentBankSet.add(newBankName);
          const combinedBanks = Array.from(currentBankSet).join(', ');

          await tx
            .update(pledges)
            .set({
              isRepledged: true,
              repledgeId: id,
              repledgedBankName: combinedBanks,
              updatedAt: new Date(),
            })
            .where(eq(pledges.id, pid));

          await tx
            .update(pledgeArticles)
            .set({
              isRepledged: true,
              repledgedBankName: combinedBanks,
              updatedAt: new Date(),
            })
            .where(eq(pledgeArticles.pledgeId, pid));
        }

        // 4. Update the repledge record itself
        await tx
          .update(repledges)
          .set({
            pledgerName: newPledgerName,
            bankName: newBankName,
            bankPledgeNumber: newPledgeNum,
            bankPledgeDate: newPledgeDate,
            bankPledgeAmount: String(newPledgeAmount),
            totalGrossWeight: totalGrossWeight.toFixed(3),
            totalNetWeight: totalNetWeight.toFixed(3),
            totalOurLoanAmount: totalOurLoanAmount.toFixed(2),
            linkedPledgeNumbers: pledgeNumbers,
            remarks: newRemarks,
            updatedAt: new Date(),
          })
          .where(eq(repledges.id, id));
      });

      const updated = await db.select().from(repledges).where(eq(repledges.id, id)).limit(1);

      const user = (request as any).user;
      await AuditService.log({
        userId: user?.id,
        action: 'UPDATE_REPLEDGE',
        entityName: 'repledges',
        entityId: id,
        details: {
          pledgerName: newPledgerName,
          bankName: newBankName,
          bankPledgeNumber: newPledgeNum,
          bankPledgeAmount: newPledgeAmount,
          linkedPledges: pledgeNumbers,
        },
      });

      return reply.send({
        success: true,
        data: {
          ...updated[0],
          linkedPledges: targetPledges,
        },
        message: `Bank Re-pledge #${newPledgeNum} updated successfully`,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to update re-pledge',
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

        // 2. Smart unlinking: For each linked pledge, check if it has ANY OTHER ACTIVE bank re-pledges!
        for (const pid of pledgeIds) {
          const remainingActiveLinks = await tx
            .select({ bankName: repledges.bankName, id: repledges.id })
            .from(repledgePledges)
            .innerJoin(repledges, eq(repledgePledges.repledgeId, repledges.id))
            .where(
              and(
                eq(repledgePledges.pledgeId, pid),
                sql`${repledges.id} != ${id}::uuid`,
                eq(repledges.status, 'active')
              )
            );

          if (remainingActiveLinks.length > 0) {
            // Still active in another bank re-pledge! Keep the remaining bank names
            const remainingBanks = Array.from(
              new Set(remainingActiveLinks.map(l => l.bankName))
            ).join(', ');

            await tx
              .update(pledges)
              .set({
                isRepledged: true,
                repledgeId: remainingActiveLinks[0].id,
                repledgedBankName: remainingBanks,
                updatedAt: new Date(),
              })
              .where(eq(pledges.id, pid));

            await tx
              .update(pledgeArticles)
              .set({
                isRepledged: true,
                repledgedBankName: remainingBanks,
                updatedAt: new Date(),
              })
              .where(eq(pledgeArticles.pledgeId, pid));
          } else {
            // No other active bank re-pledge! Fully unlinked and restored to shop vault!
            await tx
              .update(pledges)
              .set({
                isRepledged: false,
                repledgeId: null,
                repledgedBankName: null,
                updatedAt: new Date(),
              })
              .where(eq(pledges.id, pid));

            await tx
              .update(pledgeArticles)
              .set({
                isRepledged: false,
                repledgedBankName: null,
                updatedAt: new Date(),
              })
              .where(eq(pledgeArticles.pledgeId, pid));
          }
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
        // If active, unlink girvis with smart check for other active bank re-pledges
        if (existing[0].status === 'active') {
          const links = await tx.select().from(repledgePledges).where(eq(repledgePledges.repledgeId, id));
          const pIds = links.map(l => l.pledgeId);
          for (const pid of pIds) {
            const remainingActiveLinks = await tx
              .select({ bankName: repledges.bankName, id: repledges.id })
              .from(repledgePledges)
              .innerJoin(repledges, eq(repledgePledges.repledgeId, repledges.id))
              .where(
                and(
                  eq(repledgePledges.pledgeId, pid),
                  sql`${repledges.id} != ${id}::uuid`,
                  eq(repledges.status, 'active')
                )
              );

            if (remainingActiveLinks.length > 0) {
              const remainingBanks = Array.from(
                new Set(remainingActiveLinks.map(l => l.bankName))
              ).join(', ');

              await tx
                .update(pledges)
                .set({
                  isRepledged: true,
                  repledgeId: remainingActiveLinks[0].id,
                  repledgedBankName: remainingBanks,
                  updatedAt: new Date(),
                })
                .where(eq(pledges.id, pid));

              await tx
                .update(pledgeArticles)
                .set({
                  isRepledged: true,
                  repledgedBankName: remainingBanks,
                  updatedAt: new Date(),
                })
                .where(eq(pledgeArticles.pledgeId, pid));
            } else {
              await tx
                .update(pledges)
                .set({
                  isRepledged: false,
                  repledgeId: null,
                  repledgedBankName: null,
                  updatedAt: new Date(),
                })
                .where(eq(pledges.id, pid));

              await tx
                .update(pledgeArticles)
                .set({
                  isRepledged: false,
                  repledgedBankName: null,
                  updatedAt: new Date(),
                })
                .where(eq(pledgeArticles.pledgeId, pid));
            }
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
