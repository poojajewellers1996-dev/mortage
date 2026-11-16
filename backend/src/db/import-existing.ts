import { client, db } from './index.js';
import { customers, pledges, pledgeArticles, payments } from './schema.js';
import { numberToIndianWords } from '../utils/indian-currency.js';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface RawGirvi {
  id: number;
  pledge_no: string;
  pledge_date: string;
  due_date: string;
  customer_name: string;
  relation_type: string;
  relation_name: string;
  address: string;
  mobile_number: string | null;
  photo_path: string;
  present_value: number;
  loan_amount: number;
  loan_amount_words: string;
  monthly_income: number;
  status: string;
  release_date: string | null;
}

interface RawArticle {
  id: number;
  girvi_id: number;
  name: string;
  quantity: number;
  gross_wt: number;
  less_wt: number;
  net_wt: number;
  present_value: number;
  loan_amount: number;
  loan_amount_words: string;
  photo_path: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function cleanPledgeNo(pNo: string): string {
  if (!pNo) return `P-${Date.now()}`;
  return pNo.replace(/,/g, '').replace(/\s+/g, '').trim().toUpperCase();
}

function normalizeRelationType(rel: string): 'S/O' | 'D/O' | 'W/O' | 'C/O' | 'O' {
  const r = (rel || '').trim().toUpperCase();
  if (r === 'S/O' || r === 'D/O' || r === 'W/O' || r === 'C/O' || r === 'O') {
    return r as any;
  }
  return 'S/O';
}

function inferMetalType(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('silver') || n.includes('leg chain') || n.includes('kadga') || n.includes('bracelet') && !n.includes('gold')) {
    return 'Silver';
  }
  return 'Gold';
}

export async function importExistingData() {
  console.log('📦 Starting import of existing Girvi entries into Supabase...');

  const girvisPath = path.resolve(process.cwd(), '../exist/girvis.json');
  const articlesPath = path.resolve(process.cwd(), '../exist/articles.json');

  if (!fs.existsSync(girvisPath) || !fs.existsSync(articlesPath)) {
    throw new Error('Could not find girvis.json or articles.json in exist/ directory');
  }

  const rawGirvis: RawGirvi[] = JSON.parse(fs.readFileSync(girvisPath, 'utf8'));
  const rawArticles: RawArticle[] = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

  console.log(`📊 Found ${rawGirvis.length} girvis and ${rawArticles.length} articles.`);

  // Group articles by girvi_id
  const articlesByGirviId = new Map<number, RawArticle[]>();
  for (const art of rawArticles) {
    if (!articlesByGirviId.has(art.girvi_id)) {
      articlesByGirviId.set(art.girvi_id, []);
    }
    articlesByGirviId.get(art.girvi_id)!.push(art);
  }

  // 1. Deduplicate & Map Customers
  console.log('👤 Deduplicating customers...');
  const customerMap = new Map<string, { id: string; code: string; customer: any }>();
  let customerSequence = 1;

  for (const g of rawGirvis) {
    const rawMobile = g.mobile_number ? g.mobile_number.trim() : '';
    const cleanMobile = rawMobile ? rawMobile.replace(/[^\d+]/g, '') : null;
    const name = (g.customer_name || 'Customer').trim();
    const relType = normalizeRelationType(g.relation_type);
    const relName = (g.relation_name || '').trim();
    const address = (g.address || 'Local').trim();

    // Unique key: mobile if available, else name + relation + address
    const key = cleanMobile && cleanMobile.length >= 10
      ? `mob:${cleanMobile}`
      : `key:${name.toLowerCase()}::${relType}::${relName.toLowerCase()}::${address.toLowerCase()}`;

    if (!customerMap.has(key)) {
      const customerId = crypto.randomUUID();
      const code = `CUST-${String(customerSequence++).padStart(4, '0')}`;
      customerMap.set(key, {
        id: customerId,
        code,
        customer: {
          id: customerId,
          customerCode: code,
          name,
          relationType: relType,
          relationName: relName || null,
          mobileNumber: cleanMobile || null,
          monthlyIncome: String(g.monthly_income || 30000),
          address: address || 'Local Area',
          city: 'Mumbai',
          pincode: '400001',
          photoUrl: g.photo_path || null,
        },
      });
    }
  }

  console.log(`✅ Identified ${customerMap.size} unique customers from ${rawGirvis.length} records.`);

  // Insert customers into DB in batches
  console.log('💾 Inserting customers into Supabase PostgreSQL...');
  const customerList = Array.from(customerMap.values()).map(c => c.customer);
  const BATCH_SIZE = 100;

  for (let i = 0; i < customerList.length; i += BATCH_SIZE) {
    const batch = customerList.slice(i, i + BATCH_SIZE);
    await db.insert(customers).values(batch).onConflictDoNothing();
  }
  console.log('✅ All customers persisted.');

  // 2. Prepare & Insert Pledges and Articles
  console.log('📝 Processing pledges and articles...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pledgeNumbersSeen = new Map<string, number>();

  const pledgesToInsert: any[] = [];
  const articlesToInsert: any[] = [];
  const paymentsToInsert: any[] = [];

  for (const g of rawGirvis) {
    const rawMobile = g.mobile_number ? g.mobile_number.trim() : '';
    const cleanMobile = rawMobile ? rawMobile.replace(/[^\d+]/g, '') : null;
    const name = (g.customer_name || 'Customer').trim();
    const relType = normalizeRelationType(g.relation_type);
    const relName = (g.relation_name || '').trim();
    const address = (g.address || 'Local').trim();

    const key = cleanMobile && cleanMobile.length >= 10
      ? `mob:${cleanMobile}`
      : `key:${name.toLowerCase()}::${relType}::${relName.toLowerCase()}::${address.toLowerCase()}`;

    const custRecord = customerMap.get(key);
    const customerId = custRecord!.id;

    // Handle duplicate pledge numbers
    let pledgeNo = cleanPledgeNo(g.pledge_no);
    const count = (pledgeNumbersSeen.get(pledgeNo) || 0) + 1;
    pledgeNumbersSeen.set(pledgeNo, count);
    if (count > 1) {
      pledgeNo = `${pledgeNo}-${count}`;
    }

    const pledgeDate = formatDate(g.pledge_date);
    const dueDate = formatDate(g.due_date);
    const isReleased = g.status === 'Released' || !!g.release_date;

    let dynamicStatus = 'active';
    if (isReleased) {
      dynamicStatus = 'closed';
    } else {
      const dueObj = new Date(dueDate);
      dueObj.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        dynamicStatus = 'overdue';
      } else if (diffDays <= 15) {
        dynamicStatus = 'due_soon';
      }
    }

    const relatedArticles = articlesByGirviId.get(g.id) || [];

    // Aggregate article figures
    let totalQty = 0;
    let totalGross = 0;
    let totalLess = 0;
    let totalNet = 0;
    let totalPresentVal = 0;
    let totalLoan = 0;

    const pledgeId = crypto.randomUUID();

    if (relatedArticles.length > 0) {
      for (const a of relatedArticles) {
        const qty = a.quantity || 1;
        const gross = a.gross_wt || 0;
        const less = a.less_wt || 0;
        const net = Math.max(0, a.net_wt !== undefined && a.net_wt !== null ? a.net_wt : gross - less);
        const presentVal = a.present_value || 0;
        const loan = a.loan_amount || 0;

        totalQty += qty;
        totalGross += gross;
        totalLess += less;
        totalNet += net;
        totalPresentVal += presentVal;
        totalLoan += loan;

        const metalType = inferMetalType(a.name);
        const purity = metalType === 'Silver' ? 'Silver 925' : '22K (916)';
        const words = a.loan_amount_words && a.loan_amount_words !== 'Zero'
          ? a.loan_amount_words
          : numberToIndianWords(loan);

        articlesToInsert.push({
          id: crypto.randomUUID(),
          pledgeId,
          itemName: (a.name || 'Gold Ornament').trim(),
          metalType,
          purity,
          quantity: qty,
          grossWeight: gross.toFixed(3),
          lessWeight: less.toFixed(3),
          netWeight: net.toFixed(3),
          presentValue: presentVal.toFixed(2),
          loanAmount: loan.toFixed(2),
          loanAmountWords: words,
          itemPhotoUrl: a.photo_path || null,
          isRepledged: false,
        });
      }
    } else {
      // Fallback if no article row
      totalQty = 1;
      totalPresentVal = g.present_value || 0;
      totalLoan = g.loan_amount || 0;
      totalGross = 5.0;
      totalNet = 5.0;

      articlesToInsert.push({
        id: crypto.randomUUID(),
        pledgeId,
        itemName: 'Gold Jewellery Item',
        metalType: 'Gold',
        purity: '22K',
        quantity: 1,
        grossWeight: '5.000',
        lessWeight: '0.000',
        netWeight: '5.000',
        presentValue: totalPresentVal.toFixed(2),
        loanAmount: totalLoan.toFixed(2),
        loanAmountWords: numberToIndianWords(totalLoan),
        isRepledged: false,
      });
    }

    const loanWords = g.loan_amount_words && g.loan_amount_words !== 'Zero'
      ? g.loan_amount_words
      : numberToIndianWords(totalLoan);

    const closedDate = isReleased ? formatDate(g.release_date) : null;

    pledgesToInsert.push({
      id: pledgeId,
      pledgeNumber: pledgeNo,
      customerId,
      pledgeDate,
      dueDate,
      interestRatePercent: '1.50',
      interestPeriod: 'monthly',
      totalArticlesCount: totalQty,
      totalGrossWeight: totalGross.toFixed(3),
      totalLessWeight: totalLess.toFixed(3),
      totalNetWeight: totalNet.toFixed(3),
      totalPresentValue: totalPresentVal.toFixed(2),
      totalLoanAmount: totalLoan.toFixed(2),
      loanAmountWords: loanWords,
      status: dynamicStatus,
      isDraft: false,
      closedDate,
      closureRemarks: isReleased ? 'Historical redemption completed' : null,
      storageLocation: 'Vault-1',
    });

    // If released, create historical payment record
    if (isReleased) {
      paymentsToInsert.push({
        id: crypto.randomUUID(),
        pledgeId,
        receiptNumber: `HIST-RCP-${pledgeNo}`,
        paymentDate: closedDate || pledgeDate,
        paymentType: 'closure',
        principalAmount: totalLoan.toFixed(2),
        interestAmount: '0.00',
        totalPaid: totalLoan.toFixed(2),
        paymentMode: 'Cash',
        remarks: 'Historical pledge redemption and full settlement',
      });
    }
  }

  // Insert Pledges in batches
  console.log(`💾 Persisting ${pledgesToInsert.length} pledges...`);
  for (let i = 0; i < pledgesToInsert.length; i += BATCH_SIZE) {
    const batch = pledgesToInsert.slice(i, i + BATCH_SIZE);
    await db.insert(pledges).values(batch).onConflictDoNothing();
  }
  console.log('✅ Pledges persisted.');

  // Insert Articles in batches
  console.log(`💾 Persisting ${articlesToInsert.length} articles...`);
  for (let i = 0; i < articlesToInsert.length; i += BATCH_SIZE) {
    const batch = articlesToInsert.slice(i, i + BATCH_SIZE);
    await db.insert(pledgeArticles).values(batch).onConflictDoNothing();
  }
  console.log('✅ Articles persisted.');

  // Insert Payments in batches
  if (paymentsToInsert.length > 0) {
    console.log(`💾 Persisting ${paymentsToInsert.length} historical closure payments...`);
    for (let i = 0; i < paymentsToInsert.length; i += BATCH_SIZE) {
      const batch = paymentsToInsert.slice(i, i + BATCH_SIZE);
      await db.insert(payments).values(batch).onConflictDoNothing();
    }
    console.log('✅ Payments persisted.');
  }

  console.log('🎉 Full import and merge of existing Girvi records completed successfully!');
}

if (process.argv[1] && process.argv[1].includes('import-existing')) {
  importExistingData()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}
