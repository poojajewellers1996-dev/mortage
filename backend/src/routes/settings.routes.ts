import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { businessSettings } from '../db/schema.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { AuditService } from '../services/audit.service.js';

const settingsSchema = z.object({
  businessName: z.string().min(2),
  tagline: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  ownerName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  secondaryPhone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  addressLine1: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  defaultInterestRate: z.union([z.number(), z.string()]).transform(v => String(v || 1.5)),
  defaultPledgePrefix: z.string().default('G-'),
  termsAndConditions: z.string().optional().nullable(),
});

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/settings
  fastify.get('/', async (request, reply) => {
    try {
      const records = await db.select().from(businessSettings).limit(1);
      if (records.length === 0) {
        // Return defaults
        return reply.send({
          success: true,
          data: {
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
            defaultInterestRate: '1.50',
            defaultPledgePrefix: 'G-',
          },
        });
      }

      return reply.send({
        success: true,
        data: records[0],
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to retrieve settings' });
    }
  });

  // PUT /api/settings (Admin only)
  fastify.put('/', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const parseResult = settingsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    try {
      const records = await db.select().from(businessSettings).limit(1);
      const updateData = {
        ...parseResult.data,
        updatedAt: new Date(),
      };

      let resultRecord;
      if (records.length === 0) {
        const [inserted] = await db.insert(businessSettings).values(updateData).returning();
        resultRecord = inserted;
      } else {
        const [updated] = await db
          .update(businessSettings)
          .set(updateData)
          .where(sql`id = ${records[0].id}`)
          .returning();
        resultRecord = updated;
      }

      await AuditService.log({
        userId: request.user?.id,
        action: 'UPDATE_SETTINGS',
        entityName: 'business_settings',
        entityId: resultRecord.id,
        details: updateData,
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        data: resultRecord,
        message: 'Business settings updated successfully',
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to update settings' });
    }
  });
}
