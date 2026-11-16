const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const girvis = require('../exist/girvis.json');
const articles = require('../exist/articles.json');

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) {
      str += ones[n] + ' ';
    } else {
      str += tens[Math.floor(n / 10)] + ' ';
      if (n % 10 > 0) str += ones[n % 10] + ' ';
    }
  }
  return str.trim();
}

function numberToIndianWords(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';
  const absNum = Math.abs(num);
  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);
  let result = '';
  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = rem;
  if (crore > 0) result += convertBelowThousand(crore) + ' Crore ';
  if (lakh > 0) result += convertBelowThousand(lakh) + ' Lakh ';
  if (thousand > 0) result += convertBelowThousand(thousand) + ' Thousand ';
  if (hundred > 0) result += convertBelowThousand(hundred) + ' ';
  result = 'Rupees ' + result.trim();
  if (paise > 0) result += ' and ' + convertBelowThousand(paise) + ' Paise';
  return result.trim() + ' Only';
}

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function formatDate(dateStr) {
  if (!dateStr) return '2026-01-01';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '2026-01-01';
    return d.toISOString().split('T')[0];
  } catch {
    return '2026-01-01';
  }
}

function normalizeRelationType(rel) {
  const r = (rel || '').trim().toUpperCase();
  if (['S/O', 'D/O', 'W/O', 'C/O', 'O'].includes(r)) return r;
  return 'S/O';
}

function inferMetalType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('silver') || n.includes('leg chain') || n.includes('kadga') || (n.includes('bracelet') && !n.includes('gold'))) {
    return 'Silver';
  }
  return 'Gold';
}

const articlesByGirviId = new Map();
articles.forEach(a => {
  if (!articlesByGirviId.has(a.girvi_id)) articlesByGirviId.set(a.girvi_id, []);
  articlesByGirviId.get(a.girvi_id).push(a);
});

const customerMap = new Map();
let customerSeq = 1;

girvis.forEach(g => {
  const rawMobile = g.mobile_number ? g.mobile_number.trim() : '';
  const cleanMobile = rawMobile ? rawMobile.replace(/[^\d+]/g, '') : null;
  const name = (g.customer_name || 'Customer').trim();
  const relType = normalizeRelationType(g.relation_type);
  const relName = (g.relation_name || '').trim();
  const address = (g.address || 'Local').trim();

  const key = cleanMobile && cleanMobile.length >= 10
    ? 'mob:' + cleanMobile
    : 'key:' + name.toLowerCase() + '::' + relType + '::' + relName.toLowerCase() + '::' + address.toLowerCase();

  if (!customerMap.has(key)) {
    const custId = crypto.randomUUID();
    const code = 'CUST-' + String(customerSeq++).padStart(4, '0');
    customerMap.set(key, {
      id: custId,
      code,
      name,
      relation_type: relType,
      relation_name: relName || null,
      mobile_number: cleanMobile || null,
      monthly_income: g.monthly_income || 30000,
      address,
      city: 'Mumbai',
      pincode: '400001',
      photo_url: g.photo_path || null
    });
  }
});

let sql = '-- ============================================================================\n';
sql += '-- HISTORICAL DATA IMPORT SCRIPT FOR SUPABASE POSTGRESQL\n';
sql += '-- Generated for Girvi Management System\n';
sql += '-- Total Girvis: ' + girvis.length + ', Total Articles: ' + articles.length + ', Unique Customers: ' + customerMap.size + '\n';
sql += '-- ============================================================================\n\n';

sql += '-- 1. INSERT CUSTOMERS\n';
sql += 'INSERT INTO customers (id, customer_code, name, relation_type, relation_name, mobile_number, monthly_income, address, city, pincode, photo_url)\nVALUES\n';

const custValues = [];
customerMap.forEach(c => {
  custValues.push('(' + [
    sqlEscape(c.id),
    sqlEscape(c.code),
    sqlEscape(c.name),
    sqlEscape(c.relation_type),
    sqlEscape(c.relation_name),
    sqlEscape(c.mobile_number),
    c.monthly_income,
    sqlEscape(c.address),
    sqlEscape(c.city),
    sqlEscape(c.pincode),
    sqlEscape(c.photo_url)
  ].join(', ') + ')');
});
sql += custValues.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

const pledgeNumbersSeen = new Map();
const pledgeRows = [];
const articleRows = [];
const paymentRows = [];
const today = new Date();
today.setHours(0, 0, 0, 0);

girvis.forEach(g => {
  const rawMobile = g.mobile_number ? g.mobile_number.trim() : '';
  const cleanMobile = rawMobile ? rawMobile.replace(/[^\d+]/g, '') : null;
  const name = (g.customer_name || 'Customer').trim();
  const relType = normalizeRelationType(g.relation_type);
  const relName = (g.relation_name || '').trim();
  const address = (g.address || 'Local').trim();

  const key = cleanMobile && cleanMobile.length >= 10
    ? 'mob:' + cleanMobile
    : 'key:' + name.toLowerCase() + '::' + relType + '::' + relName.toLowerCase() + '::' + address.toLowerCase();

  const custRecord = customerMap.get(key);
  const custId = custRecord.id;

  let pledgeNo = (g.pledge_no || 'P-' + g.id).replace(/,/g, '').replace(/\s+/g, '').trim().toUpperCase();
  const count = (pledgeNumbersSeen.get(pledgeNo) || 0) + 1;
  pledgeNumbersSeen.set(pledgeNo, count);
  if (count > 1) pledgeNo = pledgeNo + '-' + count;

  const pledgeDate = formatDate(g.pledge_date);
  const dueDate = formatDate(g.due_date);
  const isReleased = g.status === 'Released' || !!g.release_date;
  const closedDate = isReleased ? formatDate(g.release_date) : null;

  let dynStatus = 'active';
  if (isReleased) {
    dynStatus = 'closed';
  } else {
    const dueObj = new Date(dueDate);
    dueObj.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) dynStatus = 'overdue';
    else if (diffDays <= 15) dynStatus = 'due_soon';
  }

  const relatedArticles = articlesByGirviId.get(g.id) || [];
  let totalQty = 0, totalGross = 0, totalLess = 0, totalNet = 0, totalVal = 0, totalLoan = 0;
  const pledgeId = crypto.randomUUID();

  if (relatedArticles.length > 0) {
    relatedArticles.forEach(a => {
      const q = a.quantity || 1;
      const gw = a.gross_wt || 0;
      const lw = a.less_wt || 0;
      const nw = Math.max(0, a.net_wt !== undefined && a.net_wt !== null ? a.net_wt : gw - lw);
      const pv = a.present_value || 0;
      const la = a.loan_amount || 0;

      totalQty += q;
      totalGross += gw;
      totalLess += lw;
      totalNet += nw;
      totalVal += pv;
      totalLoan += la;

      const metal = inferMetalType(a.name);
      const purity = metal === 'Silver' ? 'Silver 925' : '22K (916)';
      const words = a.loan_amount_words && a.loan_amount_words !== 'Zero' ? a.loan_amount_words : numberToIndianWords(la);

      articleRows.push('(' + [
        sqlEscape(crypto.randomUUID()),
        sqlEscape(pledgeId),
        sqlEscape((a.name || 'Gold Ornament').trim()),
        sqlEscape(metal),
        sqlEscape(purity),
        q,
        gw.toFixed(3),
        lw.toFixed(3),
        nw.toFixed(3),
        pv.toFixed(2),
        la.toFixed(2),
        sqlEscape(words),
        sqlEscape(a.photo_path || null),
        false
      ].join(', ') + ')');
    });
  } else {
    totalQty = 1;
    totalVal = g.present_value || 0;
    totalLoan = g.loan_amount || 0;
    totalGross = 5.0;
    totalNet = 5.0;
    articleRows.push('(' + [
      sqlEscape(crypto.randomUUID()),
      sqlEscape(pledgeId),
      sqlEscape('Gold Jewellery Item'),
      sqlEscape('Gold'),
      sqlEscape('22K'),
      1,
      '5.000',
      '0.000',
      '5.000',
      totalVal.toFixed(2),
      totalLoan.toFixed(2),
      sqlEscape(numberToIndianWords(totalLoan)),
      'NULL',
      false
    ].join(', ') + ')');
  }

  const loanWords = g.loan_amount_words && g.loan_amount_words !== 'Zero' ? g.loan_amount_words : numberToIndianWords(totalLoan);

  pledgeRows.push('(' + [
    sqlEscape(pledgeId),
    sqlEscape(pledgeNo),
    sqlEscape(custId),
    sqlEscape(pledgeDate),
    sqlEscape(dueDate),
    1.50,
    sqlEscape('monthly'),
    totalQty,
    totalGross.toFixed(3),
    totalLess.toFixed(3),
    totalNet.toFixed(3),
    totalVal.toFixed(2),
    totalLoan.toFixed(2),
    sqlEscape(loanWords),
    sqlEscape(dynStatus),
    false,
    sqlEscape(closedDate),
    sqlEscape(isReleased ? 'Historical redemption completed' : null),
    sqlEscape('Vault-1')
  ].join(', ') + ')');

  if (isReleased) {
    paymentRows.push('(' + [
      sqlEscape(crypto.randomUUID()),
      sqlEscape(pledgeId),
      sqlEscape('HIST-RCP-' + pledgeNo),
      sqlEscape(closedDate || pledgeDate),
      sqlEscape('closure'),
      totalLoan.toFixed(2),
      0.00,
      totalLoan.toFixed(2),
      sqlEscape('Cash'),
      sqlEscape('Historical redemption and ornament release')
    ].join(', ') + ')');
  }
});

sql += '-- 2. INSERT PLEDGES\n';
sql += 'INSERT INTO pledges (id, pledge_number, customer_id, pledge_date, due_date, interest_rate_percent, interest_period, total_articles_count, total_gross_weight, total_less_weight, total_net_weight, total_present_value, total_loan_amount, loan_amount_words, status, is_draft, closed_date, closure_remarks, storage_location)\nVALUES\n';
sql += pledgeRows.join(',\n') + '\nON CONFLICT (pledge_number) DO NOTHING;\n\n';

sql += '-- 3. INSERT ARTICLES\n';
sql += 'INSERT INTO pledge_articles (id, pledge_id, item_name, metal_type, purity, quantity, gross_weight, less_weight, net_weight, present_value, loan_amount, loan_amount_words, item_photo_url, is_repledged)\nVALUES\n';
sql += articleRows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

if (paymentRows.length > 0) {
  sql += '-- 4. INSERT HISTORICAL CLOSURE PAYMENTS\n';
  sql += 'INSERT INTO payments (id, pledge_id, receipt_number, payment_date, payment_type, principal_amount, interest_amount, total_paid, payment_mode, remarks)\nVALUES\n';
  sql += paymentRows.join(',\n') + '\nON CONFLICT (receipt_number) DO NOTHING;\n\n';
}

const outPath = path.resolve(__dirname, '../supabase/import_existing_data.sql');
fs.writeFileSync(outPath, sql);
console.log('Successfully generated:', outPath);
console.log('File size:', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
console.log('Summary:');
console.log('- Unique Customers:', customerMap.size);
console.log('- Pledges:', pledgeRows.length);
console.log('- Articles:', articleRows.length);
console.log('- Historical Closure Payments:', paymentRows.length);
