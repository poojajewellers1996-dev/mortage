import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StorageService } from '../services/storage.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { db } from '../db/index.js';
import { storageDocuments } from '../db/schema.js';

const base64UploadSchema = z.object({
  base64Data: z.string().min(1, 'base64Data is required'),
  fileName: z.string().min(1).default('photo.jpg'),
  folder: z.enum(['customers', 'articles', 'receipts', 'documents']).default('documents'),
  entityType: z.enum(['customer_photo', 'id_proof', 'article_photo', 'pledge_receipt', 'document']).default('document'),
  entityId: z.string().optional(),
});

export async function uploadRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/upload - Accepts base64 image or multipart file
  fastify.post('/', async (request, reply) => {
    try {
      // Check if it's multipart upload
      const isMultipart = request.isMultipart();

      if (isMultipart) {
        const file = await request.file();
        if (!file) {
          return reply.status(400).send({ success: false, error: 'No file uploaded' });
        }

        const buffer = await file.toBuffer();
        const mimeType = file.mimetype || 'image/jpeg';
        const fileName = file.filename || 'uploaded_image.jpg';
        const folder = (file.fields.folder as any)?.value || 'documents';

        const uploadResult = await StorageService.uploadFile(buffer, fileName, mimeType, folder);

        return reply.send({
          success: true,
          data: uploadResult,
        });
      }

      // Base64 upload fallback (standard for camera captures & direct web canvas)
      const parseResult = base64UploadSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.format(),
        });
      }

      const { base64Data, fileName, folder, entityType, entityId } = parseResult.data;

      // Extract pure base64 and mime type if data url
      let pureBase64 = base64Data;
      let mimeType = 'image/jpeg';

      if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          pureBase64 = matches[2];
        }
      }

      const buffer = Buffer.from(pureBase64, 'base64');
      const uploadResult = await StorageService.uploadFile(buffer, fileName, mimeType, folder);

      // Record to storage_documents if entityId provided
      if (entityId) {
        try {
          await db.insert(storageDocuments).values({
            entityType,
            entityId,
            bucketName: uploadResult.bucket,
            filePath: uploadResult.filePath,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            mimeType: uploadResult.mimeType,
            uploadedBy: request.user?.id || null,
          });
        } catch (dbErr: any) {
          request.log.warn(`Could not record storage document to DB: ${dbErr?.message || dbErr}`);
        }
      }

      return reply.send({
        success: true,
        data: uploadResult,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'File upload failed' });
    }
  });

  // GET /api/storage/signed-url
  fastify.get('/signed-url', async (request, reply) => {
    try {
      const { path } = request.query as { path: string };
      if (!path) {
        return reply.status(400).send({ success: false, error: 'File path query parameter is required' });
      }

      const signedUrl = await StorageService.getSignedUrl(path);
      return reply.send({ success: true, signedUrl });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to generate signed URL' });
    }
  });
}
