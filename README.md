# Girvi Management System (श्री गणेश गिरवी प्रबंधन प्रणाली)

An enterprise-grade, production-oriented **Girvi Management System** tailored specifically for jewellery showrooms, pawnbrokers, and gold financing institutions. Built with a modern Next.js frontend, a high-performance Fastify TypeScript REST API, Drizzle ORM, Supabase PostgreSQL, and Supabase Private Storage.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (Vercel)"]
        UI["Next.js 15 / React 19 / TypeScript"]
        Tailwind["Tailwind CSS + shadcn/ui"]
        Camera["Webcam / Device Camera Capture"]
        PDF["A4 Girvi Receipt Generator (jsPDF / Print)"]
    end

    subgraph Server["Backend REST API (Render)"]
        Fastify["Node.js LTS + Fastify REST API"]
        Auth["Argon2 / BCrypt + JWT Auth Middleware"]
        Agg["Live Weight & Valuation Engine"]
        Words["Indian Numbering Converter (Thousand, Lakh, Crore)"]
    end

    subgraph Data["Cloud Data Infrastructure (Supabase)"]
        DB[(Supabase PostgreSQL 8 Tables + RLS)]
        Storage["Supabase Private Storage (Signed URLs)"]
    end

    UI -->|REST + Bearer JWT| Fastify
    Camera -->|Base64 / Multipart| Fastify
    Fastify -->|Drizzle ORM| DB
    Fastify -->|Signed Uploads| Storage
    PDF -->|Download / A4 Print| UI
```

---

## 🛠️ Mandatory Technology Stack

| Layer | Technology | Deployment Platform |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15+, React 19, TypeScript, Tailwind CSS, Lucide, React Hook Form, Zod | **Vercel** |
| **Backend API** | Node.js LTS, TypeScript, Fastify REST API, Drizzle ORM, Zod, JWT | **Render Web Service** |
| **Database** | Supabase PostgreSQL, Relational Schema, Indexes, Foreign Keys, RLS | **Supabase** |
| **File Storage** | Supabase Storage (Private Buckets, Secure Signed URLs) | **Supabase Storage** |

---

## 💎 Key Features & Modules

### 1. Main Girvi Registration Module
- **Unique Pledge Number**: Auto-generated sequence (`G-2026-0001`) with duplicate prevention. Custom override permitted for administrators only.
- **Customer KYC**: Customer Name, Relation (S/O, D/O, W/O, C/O, O), 10-digit Indian Mobile validation, Monthly Income, Residential Address.
- **Webcam / Device Camera Capture**: Interactive camera stream to photograph the pledgor and preview in real time with device fallback.
- **Multiple Jewellery Articles**: Add independent cards for each ornament (Gold Necklace, Bangles, Mangalsutra, Ring, Anklets).
- **Automated Weight & Valuation**:
  - $\text{Net Weight} = \text{Gross Weight} - \text{Less Weight}$ (strictly non-negative).
  - Individual present market valuation and loan amount.
  - Automatic Indian numbering converter: Converts numeric amounts to words (*e.g., ₹1,25,000 $\rightarrow$ "Rupees One Lakh Twenty Five Thousand Only"*).
  - Repledged ornament toggle (tracks repledging with external banks/financiers).
- **Live Summary Bar**: Real-time aggregation of Total Articles, Total Quantity, Gross Wt, Less Wt, Net Wt, Market Value, and Loan Amount.

### 2. Business Dashboard & Analytics
- Live counters for **Total Customers**, **Active Girvi**, **Closed Girvi**, **Total Loan Outstanding (₹)**, **Total Safe Vault Net Weight (g)**, **Overdue Pledges**, **Pledges Due Today**, and **Pledges Due This Month**.
- Interactive charts:
  - Monthly Girvi Registrations vs Loan Disbursements.
  - Vault Status Distribution (Active vs Closed vs Overdue).
  - Recently registered pledges table with quick receipt generation.

### 3. Customer (Pledgor) Management
- Full customer directory with instant search by name, mobile, or customer code (`CUST-2026-0001`).
- Customer profile with photograph, loan history, active loans, and redemption records.
- Referential integrity check prevents deleting customers with active pledges.

### 4. Girvi Dossier & Status Lifecycle
- Dynamic status calculation:
  - `active`: Open loan within due date.
  - `due_soon`: Expiring within 15 days.
  - `overdue`: Due date passed without redemption.
  - `closed`: Loan redeemed and ornaments released.
- Detailed dossier with ornament specifications and payment history.
- One-click **Redeem & Close Pledge** modal recording full settlement.

### 5. Printing & High-Fidelity PDF
- Form 1A compliant **A4 Girvi Pawn Receipt**:
  - Full shop header with GSTIN, government pawnbroker license number, and contact info.
  - Pledgor KYC box with customer photograph.
  - Detailed ornament breakdown table with weights, purity, and valuation.
  - Total loan amount in numbers and Indian currency words.
  - Terms, conditions, and legal undertakings.
  - Pledgor thumb impression/signature area and authorized seal area.
- Supports direct browser printing (`@media print`) and downloadable PDF (`jsPDF` + `html2canvas`).

---

## 🗄️ Database Architecture (Supabase PostgreSQL)

The system uses 8 normalized tables:

1. `users`: System staff & administrators with password hashing and roles.
2. `customers`: Pledgor records, KYC details, mobile numbers, and photos.
3. `pledges`: Girvi voucher records, interest rates, weights, and status.
4. `pledge_articles`: Individual jewellery ornaments pledged under a voucher.
5. `payments`: Ledger of interest, principal, and redemption payments.
6. `storage_documents`: Metadata and file paths for photographs in private storage.
7. `audit_logs`: Immutable trail of system operations and user actions.
8. `business_settings`: Shop configuration, owner details, license numbers, and receipt terms.

The complete SQL DDL schema is located in [`supabase/schema.sql`](file:///d:/mortage/supabase/schema.sql).

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- **Node.js** v20+ or v22 LTS
- **npm** v10+
- A free **Supabase** account ([supabase.com](https://supabase.com))

### 2. Database Setup (Supabase)
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Open the **SQL Editor** in Supabase.
3. Paste the contents of [`supabase/schema.sql`](file:///d:/mortage/supabase/schema.sql) and click **Run**.
4. Go to **Storage** in Supabase and create a new private bucket named `girvi-private`.
5. Obtain your project connection string from **Project Settings $\rightarrow$ Database** and your API keys from **Project Settings $\rightarrow$ API**.

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
```
Edit `.env` with your Supabase credentials:
```env
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_2026
CORS_ORIGIN=http://localhost:3000,https://girvi-frontend.vercel.app
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_STORAGE_BUCKET=girvi-private
```
Install dependencies and run migrations:
```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
Backend will start on `http://localhost:5000` (Health check: `http://localhost:5000/health`).

### 4. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
```
Verify `NEXT_PUBLIC_API_BASE_URL`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```
Install dependencies and start development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Sign-In Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ganeshjewellers.com` | `Admin@123456` | Full access, settings edit, delete records, custom pledge numbers |
| **Staff Counter** | `staff@ganeshjewellers.com` | `Staff@123456` | Register girvi, customer KYC, record payments, print receipts |

*(Quick sign-in buttons are available on the `/login` screen for one-click access)*

---

## 🌐 Production Deployment Guide

### A. Deploy Backend to Render
1. Push this repository to **GitHub**.
2. Sign in to [Render](https://render.com) and click **New + $\rightarrow$ Web Service**.
3. Select your repository.
4. Set the following configuration:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/health`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`: Your Supabase PostgreSQL URI (Transaction Pooler or Direct connection).
   - `JWT_SECRET`: A secure random 64-character secret.
   - `CORS_ORIGIN`: Your production Vercel URL (*e.g., `https://girvi-frontend.vercel.app`*).
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.
   - `SUPABASE_STORAGE_BUCKET`: `girvi-private`
6. Click **Deploy Web Service**. Render will build and expose your backend REST API.

*(Alternatively, use `render.yaml` provided in the `backend/` directory for Render Blueprint auto-deploy).*

### B. Deploy Frontend to Vercel
1. Sign in to [Vercel](https://vercel.com) and click **Add New... $\rightarrow$ Project**.
2. Select your repository.
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_BASE_URL`: Your deployed Render backend URL (*e.g., `https://girvi-backend.onrender.com`*).
5. Click **Deploy**. Vercel will build and launch your application globally on its Edge network.

---

## 📡 REST API Documentation

### Authentication
- `POST /api/auth/login`: Authenticates user credentials and returns JWT bearer token.
- `POST /api/auth/logout`: Invalidates session and logs audit trail.
- `GET /api/auth/me`: Fetches profile of currently authenticated user.

### Customers
- `GET /api/customers`: Paginated customer directory with search by name, mobile, and customer code.
- `POST /api/customers`: Creates a customer with duplicate mobile prevention.
- `GET /api/customers/:id`: Retrieves customer profile, active loans, and pledge history.
- `PUT /api/customers/:id`: Updates customer information.
- `DELETE /api/customers/:id`: Deletes customer (Admin only; blocked if active pledges exist).

### Girvi Pledges
- `GET /api/pledges/next-number`: Generates the next sequential pledge number (`G-2026-XXXX`).
- `GET /api/pledges`: Paginated pledge list with status filter, search, and date range.
- `POST /api/pledges`: Transactional registration of customer, pledge, and multiple articles.
- `GET /api/pledges/:id`: Retrieves complete pledge dossier, articles, and payment logs.
- `PUT /api/pledges/:id`: Updates pledge terms or storage locker.
- `POST /api/pledges/:id/close`: Redeems ornaments, records final payment, and marks pledge closed.
- `GET /api/pledges/:id/receipt`: Generates full receipt data with business header for A4 printing.
- `DELETE /api/pledges/:id`: Deletes pledge record (Admin only).

### Articles
- `POST /api/pledges/:id/articles`: Appends a jewellery article to an existing pledge and recalculates totals.
- `PUT /api/articles/:id`: Edits article weights or valuation and recalculates totals.
- `DELETE /api/articles/:id`: Removes article from pledge (requires at least one article remaining).

### Dashboard & Payments
- `GET /api/dashboard/summary`: Live counters for customers, active loans, weights, and due dates.
- `GET /api/dashboard/analytics`: 6-month trend of registrations, disbursements, and status distribution.
- `GET /api/payments`: Audit ledger of all payments.
- `POST /api/payments`: Records interest or principal collection.

### Settings & Files
- `GET /api/settings`: Returns shop profile, license numbers, and terms.
- `PUT /api/settings`: Updates business configuration (Admin only).
- `POST /api/upload`: Uploads photo to Supabase private storage and returns 24-hour signed URL.
- `GET /health`: System and database health-check status.

---

## 🔒 Security & Data Integrity

- **Zero Client Credential Leakage**: Supabase service-role keys reside strictly on the Fastify backend; the frontend communicates exclusively via secure Bearer JWT tokens.
- **Private Storage**: Customer photographs and jewellery images are stored in private buckets and rendered via expiring signed URLs.
- **Atomic Transactions**: Pledges, associated ornaments, and customer links are persisted transactionally in PostgreSQL; failed operations roll back cleanly without partial records.
- **Numeric Precision**: Currency amounts and gram weights are stored as `NUMERIC(14, 2)` and `NUMERIC(10, 3)` to prevent floating-point calculation errors.
- **Audit Logging**: Sensitive operations (logins, pledge creation, redemption, updates) are recorded in `audit_logs` with timestamps, user IDs, and client IP addresses.

---

## 📄 License

Proprietary software developed for **Shree Ganesh Jewellers & Bankers**.
All rights reserved.
