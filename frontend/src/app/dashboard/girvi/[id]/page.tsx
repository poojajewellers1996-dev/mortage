"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pledge, Customer, PledgeArticle, Payment } from "@/types";
import { formatIndianCurrency, formatWeight, numberToIndianWords } from "@/lib/number-to-words";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Lock,
  User,
  CreditCard,
  X,
  FileText,
  RotateCcw,
} from "lucide-react";
import { UndoReleaseModal } from "@/components/girvi/PledgeActionModals";

export default function PledgeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [pledge, setPledge] = useState<Pledge | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [articles, setArticles] = useState<PledgeArticle[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Close Pledge Modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [closeAmount, setCloseAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [closureRemarks, setClosureRemarks] = useState<string>("Full redemption and release of ornaments");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPledge(id);
      if (res.success && res.data) {
        setPledge(res.data);
        setCustomer(res.data.customer);
        setArticles(res.data.articles || []);
        setPayments(res.data.payments || []);
        setCloseAmount(res.data.totalLoanAmount);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load pledge details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClosePledge = async () => {
    if (!pledge) return;
    setIsClosing(true);
    try {
      const res = await api.closePledge(pledge.id, {
        totalPaid: parseFloat(closeAmount) || 0,
        paymentMode,
        remarks: closureRemarks,
      });

      if (res.success) {
        toast.success("Pledge closed and ornaments redeemed successfully!");
        setShowCloseModal(false);
        fetchDetails();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to close pledge.");
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          <p className="text-sm text-slate-500 font-medium">Loading pledge dossier...</p>
        </div>
      </div>
    );
  }

  if (!pledge) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-slate-600 font-medium">Pledge not found.</p>
        <Link href="/dashboard/girvi">
          <Button variant="outline">Back to Girvi List</Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-[#0F1E36]">Active Loan</Badge>;
      case "due_soon":
        return <Badge variant="warning">Due Soon (15d)</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "closed":
        return <Badge variant="success">Closed / Redeemed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/girvi">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pledge #{pledge.pledgeNumber}
              </h2>
              {getStatusBadge(pledge.status)}
            </div>
            <p className="text-xs text-slate-500">
              Registered on {new Date(pledge.pledgeDate).toLocaleDateString("en-IN")} • Due on{" "}
              {new Date(pledge.dueDate).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {pledge.status !== "closed" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCloseModal(true)}
              className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold"
            >
              <CheckCircle2 className="h-4 w-4" />
              Redeem & Close
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUndoModal(true)}
              className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50 font-semibold shadow-xs"
              title="Undo Release and restore to Active Girvi"
            >
              <RotateCcw className="h-4 w-4 text-amber-600" />
              Undo Release (छुड़ाई वापस लें)
            </Button>
          )}

          <Link href={`/dashboard/girvi/${pledge.id}/receipt`}>
            <Button variant="gold" size="sm" className="gap-2 font-semibold shadow-sm">
              <Printer className="h-4 w-4" />
              Receipt / Print A4
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Customer Card + Valuation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information Card */}
        <Card className="rounded-2xl border-slate-200/90 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-amber-600" />
              Pledgor (Customer) Profile
            </CardTitle>
            {customer?.customerCode && (
              <span className="text-[10px] font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {customer.customerCode}
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {customer?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customer.photoUrl}
                    alt={customer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-bold text-slate-900 truncate">{customer?.name}</h4>
                <p className="text-xs text-slate-500">
                  {customer?.relationType} {customer?.relationName || "N/A"}
                </p>
                <p className="text-xs font-semibold text-slate-800 mt-1">{customer?.mobileNumber}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Address</span>
                <p className="text-slate-700 font-medium leading-relaxed">{customer?.address}</p>
              </div>
              {customer?.monthlyIncome && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Monthly Income:</span>
                  <span className="font-semibold text-slate-800">
                    {formatIndianCurrency(customer.monthlyIncome)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pledge Financials Summary */}
        <Card className="rounded-2xl border-slate-200/90 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Loan & Valuation Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Loan Amount</span>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {formatIndianCurrency(pledge.totalLoanAmount)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-500">Market Value</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {formatIndianCurrency(pledge.totalPresentValue)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-800">Total Net Weight</span>
                <p className="text-lg font-bold text-amber-950 mt-0.5">
                  {formatWeight(pledge.totalNetWeight)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-500">Interest Terms</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {pledge.interestRatePercent}% / mo
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 text-white text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Amount in Words
              </span>
              <p className="font-semibold text-slate-100">{pledge.loanAmountWords}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
              <span>Storage: <strong>{pledge.storageLocation || "Locker 1"}</strong></span>
              <span>Total Articles: <strong>{pledge.totalArticlesCount} items</strong></span>
              <span>Due Date: <strong>{new Date(pledge.dueDate).toLocaleDateString("en-IN")}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Itemized Articles Table */}
      <Card className="rounded-2xl border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              Pledged Jewellery Articles ({articles.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Photo</th>
                  <th className="px-4 py-3">Article Description</th>
                  <th className="px-4 py-3">Metal / Purity</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Gross Wt</th>
                  <th className="px-4 py-3 text-right">Less Wt</th>
                  <th className="px-4 py-3 text-right">Net Wt</th>
                  <th className="px-4 py-3 text-right">Present Value</th>
                  <th className="px-4 py-3 text-right">Loan Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((art, idx) => (
                  <tr key={art.id || idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      {art.itemPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={art.itemPhotoUrl}
                          alt={art.itemName}
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {art.itemName}
                      {art.isRepledged && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                          Repledged ({art.repledgedBankName || "Bank"})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {art.metalType} • {art.purity}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{art.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatWeight(art.grossWeight)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatWeight(art.lessWeight)}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-900">
                      {formatWeight(art.netWeight)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800 font-medium">
                      {formatIndianCurrency(art.presentValue)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800">
                      {formatIndianCurrency(art.loanAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs">
                    Total Aggregated:
                  </td>
                  <td className="px-4 py-3 text-right">{pledge.totalArticlesCount}</td>
                  <td className="px-4 py-3 text-right">{formatWeight(pledge.totalGrossWeight)}</td>
                  <td className="px-4 py-3 text-right">{formatWeight(pledge.totalLessWeight)}</td>
                  <td className="px-4 py-3 text-right text-amber-900">{formatWeight(pledge.totalNetWeight)}</td>
                  <td className="px-4 py-3 text-right">{formatIndianCurrency(pledge.totalPresentValue)}</td>
                  <td className="px-4 py-3 text-right text-emerald-900">
                    {formatIndianCurrency(pledge.totalLoanAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Redemption / Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0F1E36] text-white">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Redeem & Close Pledge #{pledge.pledgeNumber}
              </h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Principal Loan Outstanding: {formatIndianCurrency(pledge.totalLoanAmount)}</p>
                <p>Ensure all ornaments are safely inspected and handed over to {customer?.name}.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Total Payment Received (₹)</Label>
                <Input
                  type="number"
                  value={closeAmount}
                  onChange={(e) => setCloseAmount(e.target.value)}
                  placeholder="₹0.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Closure Remarks / Receipt Note</Label>
                <Input
                  value={closureRemarks}
                  onChange={(e) => setClosureRemarks(e.target.value)}
                  placeholder="Redemption remarks"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCloseModal(false)}
                  disabled={isClosing}
                >
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleClosePledge}
                  disabled={isClosing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isClosing ? "Closing..." : "Confirm Full Redemption"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Release Modal */}
      <UndoReleaseModal
        isOpen={showUndoModal}
        pledge={pledge}
        onClose={() => setShowUndoModal(false)}
        onSuccess={() => {
          fetchDetails();
        }}
      />
    </div>
  );
}
