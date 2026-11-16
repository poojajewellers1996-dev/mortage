import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'girvi-private';

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure local upload dir exists for local fallback
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

export interface UploadResult {
  filePath: string;
  signedUrl: string;
  bucket: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export class StorageService {
  /**
   * Upload a file buffer or base64 to private storage
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: 'customers' | 'articles' | 'receipts' | 'documents' = 'documents'
  ): Promise<UploadResult> {
    const ext = path.extname(fileName) || '.jpg';
    const uniqueId = crypto.randomUUID();
    const safeFileName = `${uniqueId}${ext}`;
    const storagePath = `${folder}/${safeFileName}`;

    if (supabaseAdmin) {
      try {
        // Upload to private bucket in Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from(DEFAULT_BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError);
          throw uploadError;
        }

        // Generate signed URL valid for 24 hours (86400 seconds)
        const { data: signedData, error: signError } = await supabaseAdmin.storage
          .from(DEFAULT_BUCKET)
          .createSignedUrl(storagePath, 86400);

        if (signError || !signedData?.signedUrl) {
          throw signError || new Error('Failed to generate signed URL');
        }

        return {
          filePath: storagePath,
          signedUrl: signedData.signedUrl,
          bucket: DEFAULT_BUCKET,
          fileName,
          fileSize: fileBuffer.length,
          mimeType,
        };
      } catch (err) {
        console.warn('Falling back to local storage due to Supabase error:', err);
      }
    }

    // Local fallback when Supabase Storage is not configured or in offline dev
    const targetFolder = path.join(LOCAL_UPLOAD_DIR, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    const localFilePath = path.join(targetFolder, safeFileName);
    fs.writeFileSync(localFilePath, fileBuffer);

    // Provide a data URL or relative API stream URL
    const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    return {
      filePath: storagePath,
      signedUrl: base64Data, // Full base64 data url for instant reliable preview
      bucket: 'local-private',
      fileName,
      fileSize: fileBuffer.length,
      mimeType,
    };
  }

  /**
   * Get a fresh signed URL for an existing file path
   */
  static async getSignedUrl(filePath: string, bucket = DEFAULT_BUCKET, expiresIn = 86400): Promise<string> {
    if (filePath.startsWith('data:')) {
      return filePath;
    }

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresIn);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err) {
        console.error('Error creating signed URL from Supabase:', err);
      }
    }

    // Check local fallback
    const localPath = path.join(LOCAL_UPLOAD_DIR, filePath);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }

    return filePath;
  }
}
