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
  quantity: number | string;
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
  metalType?: string;
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

export interface LinkedPledgeItem {
  repledgeId?: string;
  pledgeId: string;
  pledgeNumber: string;
  totalGrossWeight?: string;
  totalNetWeight?: string;
  totalLoanAmount?: string;
  status?: string;
  customerName?: string;
  customerMobile?: string;
}

export interface Repledge {
  id: string;
  pledgerName: string;
  bankName: string;
  bankPledgeNumber: string;
  bankPledgeDate: string;
  bankPledgeAmount: string | number;
  status: "active" | "released";
  releasedDate?: string | null;
  releaseRemarks?: string | null;
  remarks?: string | null;
  totalPledgesCount: number;
  totalGrossWeight: string;
  totalNetWeight: string;
  totalInterestPaid?: string | number;
  linkedPledgeNumbers: string[];
  linkedPledges?: LinkedPledgeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RepledgeInterestPayment {
  id: string;
  repledgeId: string;
  paymentDate: string;
  amount: string | number;
  forMonth?: string | null;
  paymentMode: string;
  referenceNumber?: string | null;
  remarks?: string | null;
  paidBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  totalCustomers: number;
  totalActiveGirvi: number;
  totalClosedGirvi: number;
  totalLoanAmount: number;
  totalJewelleryWeight: number;
  totalGoldActivePledges?: number;
  totalSilverActivePledges?: number;
  totalGoldWeight?: number;
  totalSilverWeight?: number;
  totalGoldLoan?: number;
  totalSilverLoan?: number;
  totalGoldPledges?: number;
  totalSilverPledges?: number;
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
