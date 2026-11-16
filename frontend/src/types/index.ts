export type Role = "admin" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
}

export type RelationType = "S/O" | "D/O" | "W/O" | "C/O" | "O";

export interface Customer {
  id: string;
  customerCode?: string;
  name: string;
  relationType: RelationType;
  relationName?: string | null;
  mobileNumber: string;
  secondaryMobile?: string | null;
  email?: string | null;
  monthlyIncome?: string | number;
  address: string;
  city?: string;
  pincode?: string | null;
  photoUrl?: string | null;
  idProofType?: string | null;
  idProofNumber?: string | null;
  idProofUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type PledgeStatus = "active" | "due_soon" | "overdue" | "closed" | "cancelled";

export interface PledgeArticle {
  id?: string;
  pledgeId?: string;
  itemName: string;
  metalType: string;
  purity: string;
  quantity: number;
  grossWeight: number | string;
  lessWeight: number | string;
  netWeight: number | string;
  presentValue: number | string;
  loanAmount: number | string;
  loanAmountWords?: string;
  itemPhotoUrl?: string | null;
  isRepledged?: boolean;
  repledgedBankName?: string | null;
  remarks?: string | null;
}

export interface Pledge {
  id: string;
  pledgeNumber: string;
  customerId: string;
  pledgeDate: string;
  dueDate: string;
  interestRatePercent: string | number;
  interestPeriod: "monthly" | "yearly";
  totalArticlesCount: number;
  totalGrossWeight: string;
  totalLessWeight: string;
  totalNetWeight: string;
  totalPresentValue: string;
  totalLoanAmount: string;
  loanAmountWords: string;
  status: PledgeStatus;
  isDraft: boolean;
  closedDate?: string | null;
  closureRemarks?: string | null;
  storageLocation?: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  articles?: PledgeArticle[];
}

export interface Payment {
  id: string;
  pledgeId: string;
  receiptNumber: string;
  paymentDate: string;
  paymentType: "interest" | "principal" | "closure" | "partial";
  principalAmount: string;
  interestAmount: string;
  penaltyAmount: string;
  discountAmount: string;
  totalPaid: string;
  paymentMode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  referenceNumber?: string | null;
  remarks?: string | null;
  receivedBy?: string | null;
  pledgeNumber?: string;
  customerName?: string;
  createdAt?: string;
}

export interface BusinessSettings {
  id?: string;
  businessName: string;
  tagline?: string;
  licenseNumber?: string;
  gstin?: string;
  ownerName?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  defaultInterestRate?: string | number;
  defaultPledgePrefix?: string;
  termsAndConditions?: string;
}

export interface DashboardSummary {
  totalCustomers: number;
  totalActiveGirvi: number;
  totalClosedGirvi: number;
  totalLoanAmount: number;
  totalJewelleryWeight: number;
  overduePledges: number;
  pledgesDueToday: number;
  pledgesDueThisMonth: number;
  recentPledges: (Pledge & { customerName?: string; customerMobile?: string })[];
}

export interface DashboardAnalytics {
  monthlyTrend: {
    month: string;
    key: string;
    registrations: number;
    disbursements: number;
  }[];
  statusDistribution: {
    name: string;
    value: number;
    color: string;
  }[];
}
