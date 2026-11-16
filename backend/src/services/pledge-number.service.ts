import { db } from '../db/index.js';
import { pledges, businessSettings } from '../db/schema.js';
import { sql, desc } from 'drizzle-orm';

export class PledgeNumberService {
  /**
   * Generates the next unique pledge number.
   * Format: [PREFIX]-[YEAR]-[0000] (e.g. G-2026-0001)
   */
  static async generateNextPledgeNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();

    // Fetch prefix from business settings
    let prefix = 'G-';
    try {
      const settings = await db.select().from(businessSettings).limit(1);
      if (settings.length > 0 && settings[0].defaultPledgePrefix) {
        prefix = settings[0].defaultPledgePrefix.trim();
        if (!prefix.endsWith('-')) prefix += '-';
      }
    } catch {
      // Default to G- if query fails
    }

    const yearPrefix = `${prefix}${currentYear}-`;

    try {
      // Find the latest pledge number matching this year's prefix
      const latestPledges = await db
        .select({ pledgeNumber: pledges.pledgeNumber })
        .from(pledges)
        .where(sql`${pledges.pledgeNumber} LIKE ${yearPrefix + '%'}`)
        .orderBy(desc(pledges.createdAt))
        .limit(20);

      let maxSequence = 0;
      for (const p of latestPledges) {
        const parts = p.pledgeNumber.split('-');
        if (parts.length >= 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxSequence) {
            maxSequence = num;
          }
        }
      }

      const nextSequence = maxSequence + 1;
      const formattedSeq = String(nextSequence).padStart(4, '0');
      return `${yearPrefix}${formattedSeq}`;
    } catch {
      // Fallback timestamp-based pledge number if DB not yet initialized
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      return `${yearPrefix}${randomSuffix}`;
    }
  }

  /**
   * Validates if a pledge number is already taken
   */
  static async isPledgeNumberTaken(pledgeNumber: string, excludeId?: string): Promise<boolean> {
    try {
      const existing = await db
        .select({ id: pledges.id })
        .from(pledges)
        .where(sql`${pledges.pledgeNumber} = ${pledgeNumber}`)
        .limit(1);

      if (existing.length === 0) return false;
      if (excludeId && existing[0].id === excludeId) return false;
      return true;
    } catch {
      return false;
    }
  }
}
