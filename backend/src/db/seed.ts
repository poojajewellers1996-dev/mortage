import { db, client } from './index.js';
import { users, customers, pledges, pledgeArticles, businessSettings } from './schema.js';
import { hashPassword } from '../utils/password.js';
import { numberToIndianWords } from '../utils/indian-currency.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Business Settings
    const existingSettings = await db.select().from(businessSettings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(businessSettings).values({
        businessName: 'Pooja Jewellers',
        tagline: 'Govt. Approved Pawn Brokers & Gold Loan Specialist',
        licenseNumber: 'MH-PB-2024-8849',
        gstin: '27AABCU9603R1ZM',
        ownerName: 'Deepak',
        phone: '+91 98765 43210',
        secondaryPhone: '',
        email: 'poojajewellers1996@gmail.com',
        addressLine1: 'Pooja Jewellers, Main Market',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
        defaultInterestRate: '1.50',
        defaultPledgePrefix: 'G-',
        termsAndConditions: `1. All jewellery articles are stored securely in computerized fireproof vaults with 24/7 security.
2. Interest is charged on a monthly basis @ 1.5% per month.
3. Loan must be redeemed or renewed with interest within 12 months.
4. Original pledge receipt and customer KYC ID proof are mandatory for ornament redemption.`,
      });
      console.log('✅ Business settings seeded.');
    }

    // 2. Users (Admin)
    const adminPasswordHash = await hashPassword('Deepak@123');
    const staffPasswordHash = await hashPassword('Staff@123');

    const adminUser = await db
      .insert(users)
      .values({
        name: 'Deepak (Pooja Jewellers)',
        email: 'poojajewellers1996@gmail.com',
        passwordHash: adminPasswordHash,
        role: 'admin',
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash: adminPasswordHash, role: 'admin', isActive: true },
      })
      .returning();

    await db
      .insert(users)
      .values({
        name: 'Sunil Verma (Staff)',
        email: 'staff@ganeshjewellers.com',
        passwordHash: staffPasswordHash,
        role: 'staff',
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash: staffPasswordHash, role: 'staff', isActive: true },
      });

    console.log('✅ Users seeded: admin@ganeshjewellers.com / Admin@123456');

    // 3. Customers
    const sampleCust1 = await db
      .insert(customers)
      .values({
        customerCode: 'CUST-2026-0001',
        name: 'Rajesh Kumar Patel',
        relationType: 'S/O',
        relationName: 'Maganlal Patel',
        mobileNumber: '9820123456',
        secondaryMobile: '9820199999',
        email: 'rajesh.patel@example.com',
        monthlyIncome: '45000.00',
        address: 'B-204, Shanti Nagar, S.V. Road, Borivali West',
        city: 'Mumbai',
        pincode: '400092',
      })
      .onConflictDoNothing()
      .returning();

    const sampleCust2 = await db
      .insert(customers)
      .values({
        customerCode: 'CUST-2026-0002',
        name: 'Pooja Deepak Shah',
        relationType: 'W/O',
        relationName: 'Deepak Shah',
        mobileNumber: '9819876543',
        monthlyIncome: '60000.00',
        address: 'Flat 12, Navkar Tower, Tilak Road, Ghatkopar East',
        city: 'Mumbai',
        pincode: '400077',
      })
      .onConflictDoNothing()
      .returning();

    console.log('✅ Sample customers seeded.');

    // 4. Sample Pledges & Articles
    const cust1 = sampleCust1[0] || (await db.select().from(customers).limit(1))[0];
    if (cust1) {
      const existingPledge = await db
        .select()
        .from(pledges)
        .where(eq(pledges.pledgeNumber, 'G-2026-0001'))
        .limit(1);

      if (existingPledge.length === 0) {
        const today = new Date();
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 6);

        const loanAmount = 85000;
        const [p1] = await db
          .insert(pledges)
          .values({
            pledgeNumber: 'G-2026-0001',
            customerId: cust1.id,
            pledgeDate: today.toISOString().split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            interestRatePercent: '1.50',
            interestPeriod: 'monthly',
            totalArticlesCount: 2,
            totalGrossWeight: '22.450',
            totalLessWeight: '1.200',
            totalNetWeight: '21.250',
            totalPresentValue: '125000.00',
            totalLoanAmount: '85000.00',
            loanAmountWords: numberToIndianWords(loanAmount),
            status: 'active',
            storageLocation: 'Vault-1, Locker 14',
            createdBy: adminUser[0]?.id || null,
          })
          .returning();

        // Articles for G-2026-0001
        await db.insert(pledgeArticles).values([
          {
            pledgeId: p1.id,
            itemName: 'Gold Necklace 22K',
            metalType: 'Gold',
            purity: '22K (916 Hallmarked)',
            quantity: 1,
            grossWeight: '16.200',
            lessWeight: '1.000',
            netWeight: '15.200',
            presentValue: '90000.00',
            loanAmount: '60000.00',
            loanAmountWords: numberToIndianWords(60000),
            remarks: 'Floral design with stone work',
          },
          {
            pledgeId: p1.id,
            itemName: 'Gold Bangles Pair',
            metalType: 'Gold',
            purity: '22K (916 Hallmarked)',
            quantity: 2,
            grossWeight: '6.250',
            lessWeight: '0.200',
            netWeight: '6.050',
            presentValue: '35000.00',
            loanAmount: '25000.00',
            loanAmountWords: numberToIndianWords(25000),
            remarks: 'Plain solid kada bangles',
          },
        ]);

        console.log('✅ Sample pledge G-2026-0001 with articles seeded.');
      }
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await client.end();
  }
}

seed();
