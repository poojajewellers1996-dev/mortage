import { pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, date, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// 1. USERS TABLE
// ============================================================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('staff'), // 'admin' | 'staff'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  pledgesCreated: many(pledges),
  paymentsReceived: many(payments),
  auditLogs: many(auditLogs),
}));

// ============================================================================
// 2. CUSTOMERS TABLE
// ============================================================================
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerCode: varchar('customer_code', { length: 50 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  relationType: varchar('relation_type', { length: 20 }).notNull().default('S/O'), // 'S/O' | 'D/O' | 'W/O' | 'C/O' | 'O'
  relationName: varchar('relation_name', { length: 255 }),
  mobileNumber: varchar('mobile_number', { length: 30 }),
  secondaryMobile: varchar('secondary_mobile', { length: 30 }),
  email: varchar('email', { length: 255 }),
  monthlyIncome: numeric('monthly_income', { precision: 14, scale: 2 }).default('0.00'),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).default('Mumbai'),
  pincode: varchar('pincode', { length: 20 }),
  photoUrl: text('photo_url'),
  idProofType: varchar('id_proof_type', { length: 50 }), // 'Aadhaar', 'PAN', etc.
  idProofNumber: varchar('id_proof_number', { length: 100 }),
  idProofUrl: text('id_proof_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  pledges: many(pledges),
}));

// ============================================================================
// 3. PLEDGES TABLE (GIRVI)
// ============================================================================
export const pledges = pgTable('pledges', {
  id: uuid('id').defaultRandom().primaryKey(),
  pledgeNumber: varchar('pledge_number', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  pledgeDate: date('pledge_date').notNull().defaultNow(),
  dueDate: date('due_date').notNull(),
  interestRatePercent: numeric('interest_rate_percent', { precision: 5, scale: 2 }).notNull().default('1.50'),
  interestPeriod: varchar('interest_period', { length: 20 }).notNull().default('monthly'), // 'monthly' | 'yearly'
  totalArticlesCount: integer('total_articles_count').notNull().default(0),
  totalGrossWeight: numeric('total_gross_weight', { precision: 10, scale: 3 }).notNull().default('0.000'),
  totalLessWeight: numeric('total_less_weight', { precision: 10, scale: 3 }).notNull().default('0.000'),
  totalNetWeight: numeric('total_net_weight', { precision: 10, scale: 3 }).notNull().default('0.000'),
  totalPresentValue: numeric('total_present_value', { precision: 14, scale: 2 }).notNull().default('0.00'),
  totalLoanAmount: numeric('total_loan_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
  loanAmountWords: text('loan_amount_words').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('active'), // 'active' | 'due_soon' | 'overdue' | 'closed' | 'cancelled'
  isDraft: boolean('is_draft').notNull().default(false),
  closedDate: date('closed_date'),
  closureRemarks: text('closure_remarks'),
  storageLocation: varchar('storage_location', { length: 100 }).default('Vault-1'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pledgesRelations = relations(pledges, ({ one, many }) => ({
  customer: one(customers, {
    fields: [pledges.customerId],
    references: [customers.id],
  }),
  articles: many(pledgeArticles),
  payments: many(payments),
  creator: one(users, {
    fields: [pledges.createdBy],
    references: [users.id],
  }),
}));

// ============================================================================
// 4. PLEDGE_ARTICLES TABLE
// ============================================================================
export const pledgeArticles = pgTable('pledge_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  pledgeId: uuid('pledge_id').notNull().references(() => pledges.id, { onDelete: 'cascade' }),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  metalType: varchar('metal_type', { length: 50 }).notNull().default('Gold'), // 'Gold' | 'Silver' | 'Platinum' | 'Diamond'
  purity: varchar('purity', { length: 50 }).default('22K'),
  quantity: integer('quantity').notNull().default(1),
  grossWeight: numeric('gross_weight', { precision: 10, scale: 3 }).notNull(),
  lessWeight: numeric('less_weight', { precision: 10, scale: 3 }).notNull().default('0.000'),
  netWeight: numeric('net_weight', { precision: 10, scale: 3 }).notNull(),
  presentValue: numeric('present_value', { precision: 14, scale: 2 }).notNull(),
  loanAmount: numeric('loan_amount', { precision: 14, scale: 2 }).notNull(),
  loanAmountWords: text('loan_amount_words'),
  itemPhotoUrl: text('item_photo_url'),
  isRepledged: boolean('is_repledged').notNull().default(false),
  repledgedBankName: varchar('repledged_bank_name', { length: 255 }),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pledgeArticlesRelations = relations(pledgeArticles, ({ one }) => ({
  pledge: one(pledges, {
    fields: [pledgeArticles.pledgeId],
    references: [pledges.id],
  }),
}));

// ============================================================================
// 5. PAYMENTS TABLE
// ============================================================================
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  pledgeId: uuid('pledge_id').notNull().references(() => pledges.id, { onDelete: 'restrict' }),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
  paymentDate: date('payment_date').notNull().defaultNow(),
  paymentType: varchar('payment_type', { length: 30 }).notNull(), // 'interest' | 'principal' | 'closure' | 'partial'
  principalAmount: numeric('principal_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
  interestAmount: numeric('interest_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
  penaltyAmount: numeric('penalty_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
  totalPaid: numeric('total_paid', { precision: 14, scale: 2 }).notNull(),
  paymentMode: varchar('payment_mode', { length: 50 }).notNull().default('Cash'), // 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'
  referenceNumber: varchar('reference_number', { length: 100 }),
  remarks: text('remarks'),
  receivedBy: uuid('received_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  pledge: one(pledges, {
    fields: [payments.pledgeId],
    references: [pledges.id],
  }),
  receiver: one(users, {
    fields: [payments.receivedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// 6. STORAGE_DOCUMENTS TABLE
// ============================================================================
export const storageDocuments = pgTable('storage_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'customer_photo' | 'id_proof' | 'article_photo' | 'pledge_receipt' | 'document'
  entityId: uuid('entity_id').notNull(),
  bucketName: varchar('bucket_name', { length: 100 }).notNull().default('girvi-private'),
  filePath: text('file_path').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 7. AUDIT_LOGS TABLE
// ============================================================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityName: varchar('entity_name', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 8. BUSINESS_SETTINGS TABLE
// ============================================================================
export const businessSettings = pgTable('business_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessName: varchar('business_name', { length: 255 }).notNull().default('Shree Ganesh Jewellers & Bankers'),
  tagline: varchar('tagline', { length: 255 }).default('Govt. Approved Pawn Brokers & Gold Loan Specialist'),
  licenseNumber: varchar('license_number', { length: 100 }).default('MH-PB-2024-8849'),
  gstin: varchar('gstin', { length: 50 }).default('27AABCU9603R1ZM'),
  ownerName: varchar('owner_name', { length: 255 }).default('Ramesh Chandra Sharma'),
  phone: varchar('phone', { length: 50 }).default('+91 98765 43210'),
  secondaryPhone: varchar('secondary_phone', { length: 50 }).default('022-28491029'),
  email: varchar('email', { length: 255 }).default('contact@ganeshjewellers.com'),
  addressLine1: text('address_line1').default('Shop No. 12, Gold Souk Market, Zaveri Bazaar'),
  city: varchar('city', { length: 100 }).default('Mumbai'),
  state: varchar('state', { length: 100 }).default('Maharashtra'),
  pincode: varchar('pincode', { length: 20 }).default('400002'),
  defaultInterestRate: numeric('default_interest_rate', { precision: 5, scale: 2 }).default('1.50'),
  defaultPledgePrefix: varchar('default_pledge_prefix', { length: 10 }).default('G-'),
  termsAndConditions: text('terms_and_conditions'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
