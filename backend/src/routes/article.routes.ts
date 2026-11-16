import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { pledges, pledgeArticles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middlewares/auth.middleware.js';
import { numberToIndianWords } from '../utils/indian-currency.js';
import { AuditService } from '../services/audit.service.js';

const articleSchema = z.object({
  itemName: z.string().min(1, 'Article name is required'),
  metalType: z.string().default('Gold'),
  purity: z.string().default('22K'),
  quantity: z.number().int().positive().default(1),
  grossWeight: z.number().nonnegative(),
  lessWeight: z.number().nonnegative().default(0),
  presentValue: z.number().nonnegative(),
  loanAmount: z.number().nonnegative(),
  itemPhotoUrl: z.string().optional().nullable(),
  isRepledged: z.boolean().default(false),
  repledgedBankName: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

/**
 * Helper to recalculate pledge totals after article add/edit/delete
 */
async function recalculatePledgeTotals(pledgeId: string) {
  const articles = await db.select().from(pledgeArticles).where(eq(pledgeArticles.pledgeId, pledgeId));

  let totalQty = 0;
  let totalGross = 0;
  let totalLess = 0;
  let totalNet = 0;
  let totalPresentVal = 0;
  let totalLoan = 0;

  for (const art of articles) {
    totalQty += art.quantity;
    totalGross += parseFloat(art.grossWeight);
    totalLess += parseFloat(art.lessWeight);
    totalNet += parseFloat(art.netWeight);
    totalPresentVal += parseFloat(art.presentValue);
    totalLoan += parseFloat(art.loanAmount);
  }

  const loanAmountWords = numberToIndianWords(totalLoan);

  await db
    .update(pledges)
    .set({
      totalArticlesCount: totalQty,
      totalGrossWeight: totalGross.toFixed(3),
      totalLessWeight: totalLess.toFixed(3),
      totalNetWeight: totalNet.toFixed(3),
      totalPresentValue: totalPresentVal.toFixed(2),
      totalLoanAmount: totalLoan.toFixed(2),
      loanAmountWords,
      updatedAt: new Date(),
    })
    .where(eq(pledges.id, pledgeId));
}

export async function articleRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/pledges/:id/articles (Add article)
  fastify.post('/pledges/:id/articles', async (request, reply) => {
    const { id: pledgeId } = request.params as { id: string };
    const parseResult = articleSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const data = parseResult.data;
    const netWeight = Math.max(0, data.grossWeight - data.lessWeight);

    try {
      const pledge = await db.select().from(pledges).where(eq(pledges.id, pledgeId)).limit(1);
      if (pledge.length === 0) {
        return reply.status(404).send({ success: false, error: 'Pledge not found' });
      }

      const inserted = await db
        .insert(pledgeArticles)
        .values({
          pledgeId,
          itemName: data.itemName.trim(),
          metalType: data.metalType,
          purity: data.purity,
          quantity: data.quantity,
          grossWeight: data.grossWeight.toFixed(3),
          lessWeight: data.lessWeight.toFixed(3),
          netWeight: netWeight.toFixed(3),
          presentValue: data.presentValue.toFixed(2),
          loanAmount: data.loanAmount.toFixed(2),
          loanAmountWords: numberToIndianWords(data.loanAmount),
          itemPhotoUrl: data.itemPhotoUrl || null,
          isRepledged: data.isRepledged,
          repledgedBankName: data.repledgedBankName || null,
          remarks: data.remarks || null,
        })
        .returning();

      await recalculatePledgeTotals(pledgeId);

      await AuditService.log({
        userId: request.user?.id,
        action: 'ADD_ARTICLE',
        entityName: 'pledge_articles',
        entityId: inserted[0].id,
        details: { pledgeId, itemName: inserted[0].itemName },
        ipAddress: request.ip,
      });

      return reply.status(201).send({
        success: true,
        data: inserted[0],
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to add article' });
    }
  });

  // PUT /api/articles/:id (Update article)
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = articleSchema.partial().safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const existing = await db.select().from(pledgeArticles).where(eq(pledgeArticles.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: 'Article not found' });
      }

      const article = existing[0];
      const data = parseResult.data;

      const gross = data.grossWeight !== undefined ? data.grossWeight : parseFloat(article.grossWeight);
      const less = data.lessWeight !== undefined ? data.lessWeight : parseFloat(article.lessWeight);
      const net = Math.max(0, gross - less);
      const loan = data.loanAmount !== undefined ? data.loanAmount : parseFloat(article.loanAmount);

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (data.itemName) updateData.itemName = data.itemName.trim();
      if (data.metalType) updateData.metalType = data.metalType;
      if (data.purity) updateData.purity = data.purity;
      if (data.quantity) updateData.quantity = data.quantity;
      if (data.grossWeight !== undefined) updateData.grossWeight = gross.toFixed(3);
      if (data.lessWeight !== undefined) updateData.lessWeight = less.toFixed(3);
      updateData.netWeight = net.toFixed(3);
      if (data.presentValue !== undefined) updateData.presentValue = data.presentValue.toFixed(2);
      if (data.loanAmount !== undefined) {
        updateData.loanAmount = loan.toFixed(2);
        updateData.loanAmountWords = numberToIndianWords(loan);
      }
      if (data.itemPhotoUrl !== undefined) updateData.itemPhotoUrl = data.itemPhotoUrl;
      if (data.isRepledged !== undefined) updateData.isRepledged = data.isRepledged;
      if (data.repledgedBankName !== undefined) updateData.repledgedBankName = data.repledgedBankName;
      if (data.remarks !== undefined) updateData.remarks = data.remarks;

      const updated = await db
        .update(pledgeArticles)
        .set(updateData)
        .where(eq(pledgeArticles.id, id))
        .returning();

      await recalculatePledgeTotals(article.pledgeId);

      await AuditService.log({
        userId: request.user?.id,
        action: 'UPDATE_ARTICLE',
        entityName: 'pledge_articles',
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
      return reply.status(500).send({ success: false, error: 'Failed to update article' });
    }
  });

  // DELETE /api/articles/:id (Remove article)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const existing = await db.select().from(pledgeArticles).where(eq(pledgeArticles.id, id)).limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({ success: false, error: 'Article not found' });
      }

      const pledgeId = existing[0].pledgeId;

      // Ensure pledge still has at least 1 other article
      const remainingCountRes = await db
        .select()
        .from(pledgeArticles)
        .where(eq(pledgeArticles.pledgeId, pledgeId));

      if (remainingCountRes.length <= 1) {
        return reply.status(400).send({
          success: false,
          error: 'Cannot delete the only article in this pledge. Each pledge must have at least one article.',
        });
      }

      await db.delete(pledgeArticles).where(eq(pledgeArticles.id, id));
      await recalculatePledgeTotals(pledgeId);

      await AuditService.log({
        userId: request.user?.id,
        action: 'DELETE_ARTICLE',
        entityName: 'pledge_articles',
        entityId: id,
        details: { pledgeId, itemName: existing[0].itemName },
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: 'Article removed successfully',
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to delete article' });
    }
  });
}
