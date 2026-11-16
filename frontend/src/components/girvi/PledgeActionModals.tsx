"use client";

import { useState, useEffect } from "react";
import { Pledge, PledgeArticle } from "@/types";
import { api } from "@/lib/api";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Calendar,
  Coins,
  ShieldCheck,
  Edit,
  Trash2,
  Plus,
  Scale,
  Gem,
  Hash,
  User,
  Phone,
  MapPin,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                              RELEASE MODAL                                 */
/* -------------------------------------------------------------------------- */

interface ReleaseModalProps {
  isOpen: boolean;
  pledge: Pledge | null;
  onClose: () => void;
  onSuccess: (pledgeId: string, releaseDate: string) => void;
}

export function ReleaseModal({
  isOpen,
  pledge,
  onClose,
  onSuccess,
}: ReleaseModalProps) {
  const [releaseDate, setReleaseDate] = useState("");
  const [totalPaid, setTotalPaid] = useState<number | string>("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [remarks, setRemarks] = useState("Loan redeemed and ornaments released");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pledge) {
      const today = new Date().toISOString().split("T")[0];
      setReleaseDate(today);
      setTotalPaid(pledge.totalLoanAmount || 0);
      setPaymentMode("Cash");
      setRemarks("Loan redeemed and ornaments released");
    }
  }, [pledge]);

  if (!isOpen || !pledge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseDate) {
      toast.error("Please select a release date.");
      return;
    }

    const paidNum = Number(totalPaid);
    if (isNaN(paidNum) || paidNum < 0) {
      toast.error("Please enter a valid settled amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.closePledge(pledge.id, {
        totalPaid: paidNum,
        paymentMode,
        remarks: remarks.trim() || undefined,
        closedDate: releaseDate,
      });

      if (res.success) {
        toast.success(`Pledge ${pledge.pledgeNumber} released successfully on ${releaseDate}!`);
        onSuccess(pledge.id, releaseDate);
        onClose();
      } else {
        toast.error(res.message || "Failed to release pledge.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error releasing pledge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white/20">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Release Girvi Pledge (गिरवी छुड़ाना)</h3>
              <p className="text-[11px] text-emerald-100">
                Pledge #{pledge.pledgeNumber} • {pledge.customer?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Customer Name</span>
              <span className="font-bold text-slate-900">{pledge.customer?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Mobile Number</span>
              <span className="font-semibold text-slate-800">{pledge.customer?.mobileNumber || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Ornaments</span>
              <span className="font-semibold text-slate-800">
                {pledge.totalArticlesCount} pcs • {formatWeight(pledge.totalNetWeight)} {pledge.metalType}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Original Loan</span>
              <span className="font-bold text-emerald-700 text-sm">
                {formatIndianCurrency(pledge.totalLoanAmount)}
              </span>
            </div>
          </div>

          {/* Release Date Picker */}
          <div>
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              <span>Release Date (छुड़ाने की तिथि) *</span>
            </Label>
            <Input
              type="date"
              required
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="h-10 text-sm font-semibold"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              This date will appear in the Released Ledger archive
            </span>
          </div>

          {/* Settled / Paid Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Coins className="h-3.5 w-3.5 text-emerald-600" />
                <span>Settled Amount (₹) *</span>
              </Label>
              <Input
                type="number"
                step="any"
                required
                value={totalPaid}
                onChange={(e) => setTotalPaid(e.target.value)}
                className="h-10 text-sm font-bold text-emerald-800"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Payment Mode *
              </Label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-medium"
              >
                <option value="Cash">Cash (नकद)</option>
                <option value="UPI">UPI / PhonePe / GPay</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Closure Remarks / Notes
            </Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Full loan settled and ornaments handed over"
              className="h-9 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold text-xs px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm & Release Girvi</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                EDIT MODAL                                  */
/* -------------------------------------------------------------------------- */

interface EditableArticleItem {
  id?: string;
  itemName: string;
  purity: string;
  quantity: number;
  grossWeight: number | string;
  lessWeight: number | string;
  netWeight: number | string;
  loanAmount: number | string;
  presentValue?: number | string;
}

interface EditModalProps {
  isOpen: boolean;
  pledge: Pledge | null;
  onClose: () => void;
  onSuccess: (updatedPledge: Pledge) => void;
}

export function EditModal({
  isOpen,
  pledge,
  onClose,
  onSuccess,
}: EditModalProps) {
  // Customer Info (FULLY EDITABLE!)
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerRelationType, setCustomerRelationType] = useState("S/O");
  const [customerRelationName, setCustomerRelationName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Pledge Info (FULLY EDITABLE!)
  const [pledgeNumber, setPledgeNumber] = useState("");
  const [pledgeDate, setPledgeDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [closedDate, setClosedDate] = useState("");
  const [totalLoanAmount, setTotalLoanAmount] = useState<number | string>("");
  const [metalType, setMetalType] = useState<"Gold" | "Silver">("Gold");
  const [storageLocation, setStorageLocation] = useState("");
  const [remarks, setRemarks] = useState("");

  // Articles Info (FULLY EDITABLE!)
  const [articles, setArticles] = useState<EditableArticleItem[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pledge && isOpen) {
      // Customer Details
      setCustomerName(pledge.customer?.name || "");
      setCustomerMobile(pledge.customer?.mobileNumber || "");
      setCustomerRelationType((pledge.customer?.relationType as string) || "S/O");
      setCustomerRelationName(pledge.customer?.relationName || "");
      setCustomerAddress(pledge.customer?.address || "");

      // Pledge Details
      setPledgeNumber(pledge.pledgeNumber || "");
      setPledgeDate(
        pledge.pledgeDate ? new Date(pledge.pledgeDate).toISOString().split("T")[0] : ""
      );
      setDueDate(
        pledge.dueDate ? new Date(pledge.dueDate).toISOString().split("T")[0] : ""
      );
      setClosedDate(
        pledge.closedDate ? new Date(pledge.closedDate).toISOString().split("T")[0] : ""
      );
      setTotalLoanAmount(pledge.totalLoanAmount || 0);
      setMetalType((pledge.metalType as any) || "Gold");
      setStorageLocation(pledge.storageLocation || "");
      setRemarks(pledge.closureRemarks || "");

      // Load full article items & full customer details if missing
      setIsLoadingArticles(true);
      api
        .getPledge(pledge.id)
        .then((res) => {
          if (res.success && res.data) {
            // Customer enrichment
            if (res.data.customer) {
              if (res.data.customer.name) setCustomerName(res.data.customer.name);
              if (res.data.customer.mobileNumber) setCustomerMobile(res.data.customer.mobileNumber);
              if (res.data.customer.relationType) setCustomerRelationType(res.data.customer.relationType);
              if (res.data.customer.relationName) setCustomerRelationName(res.data.customer.relationName);
              if (res.data.customer.address) setCustomerAddress(res.data.customer.address);
            }

            // Articles enrichment
            if (res.data.articles && res.data.articles.length > 0) {
              setArticles(
                res.data.articles.map((art: any) => ({
                  id: art.id,
                  itemName: art.itemName || "Jewellery Article",
                  purity: art.purity || "22K",
                  quantity: Number(art.quantity) || 1,
                  grossWeight: art.grossWeight || "0.000",
                  lessWeight: art.lessWeight || "0.000",
                  netWeight: art.netWeight || "0.000",
                  loanAmount: art.loanAmount || "0",
                  presentValue: art.presentValue || "0",
                }))
              );
            } else {
              setArticles([
                {
                  itemName: pledge.metalType === "Silver" ? "Silver Article" : "Gold Article",
                  purity: pledge.metalType === "Silver" ? "92.5%" : "22K",
                  quantity: pledge.totalArticlesCount || 1,
                  grossWeight: pledge.totalGrossWeight || "0.000",
                  lessWeight: pledge.totalLessWeight || "0.000",
                  netWeight: pledge.totalNetWeight || "0.000",
                  loanAmount: pledge.totalLoanAmount || "0",
                },
              ]);
            }
          }
        })
        .catch(() => {
          setArticles([
            {
              itemName: pledge.metalType === "Silver" ? "Silver Article" : "Gold Article",
              purity: pledge.metalType === "Silver" ? "92.5%" : "22K",
              quantity: pledge.totalArticlesCount || 1,
              grossWeight: pledge.totalGrossWeight || "0.000",
              lessWeight: pledge.totalLessWeight || "0.000",
              netWeight: pledge.totalNetWeight || "0.000",
              loanAmount: pledge.totalLoanAmount || "0",
            },
          ]);
        })
        .finally(() => setIsLoadingArticles(false));
    }
  }, [pledge, isOpen]);

  if (!isOpen || !pledge) return null;

  // Article row updates
  const updateArticle = (index: number, field: keyof EditableArticleItem, value: any) => {
    setArticles((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };

      if (field === "grossWeight" || field === "lessWeight") {
        const gross = parseFloat(String(field === "grossWeight" ? value : target.grossWeight)) || 0;
        const less = parseFloat(String(field === "lessWeight" ? value : target.lessWeight)) || 0;
        target.netWeight = Math.max(0, gross - less).toFixed(3);
      }

      next[index] = target;

      if (field === "loanAmount" && next.length === 1) {
        setTotalLoanAmount(value);
      }

      return next;
    });
  };

  const addArticle = () => {
    setArticles((prev) => [
      ...prev,
      {
        itemName: metalType === "Silver" ? "Silver Item" : "Gold Item",
        purity: metalType === "Silver" ? "92.5%" : "22K",
        quantity: 1,
        grossWeight: "0.000",
        lessWeight: "0.000",
        netWeight: "0.000",
        loanAmount: "0",
      },
    ]);
  };

  const removeArticle = (index: number) => {
    if (articles.length <= 1) {
      toast.error("At least one article is required for a pledge.");
      return;
    }
    setArticles((prev) => prev.filter((_, i) => i !== index));
  };

  // Recalculate computed totals
  const totalGrossCalculated = articles
    .reduce((sum, a) => sum + (parseFloat(String(a.grossWeight)) || 0), 0)
    .toFixed(3);
  const totalNetCalculated = articles
    .reduce((sum, a) => sum + (parseFloat(String(a.netWeight)) || 0), 0)
    .toFixed(3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Customer name cannot be empty.");
      return;
    }
    if (!pledgeNumber.trim()) {
      toast.error("Pledge number cannot be empty.");
      return;
    }

    const loanNum = Number(totalLoanAmount);
    if (isNaN(loanNum) || loanNum <= 0) {
      toast.error("Please enter a valid loan amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        pledgeNumber: pledgeNumber.trim(),
        pledgeDate: pledgeDate || undefined,
        dueDate: dueDate || undefined,
        totalLoanAmount: loanNum,
        metalType,
        storageLocation: storageLocation.trim() || undefined,
        closureRemarks: remarks.trim() || undefined,
        customer: {
          name: customerName.trim(),
          mobileNumber: customerMobile.trim(),
          relationType: customerRelationType,
          relationName: customerRelationName.trim() || undefined,
          address: customerAddress.trim() || undefined,
        },
        articles: articles.map((art) => {
          const gross = parseFloat(String(art.grossWeight)) || 0;
          const less = parseFloat(String(art.lessWeight || 0)) || 0;
          const net = parseFloat(String(art.netWeight)) || Math.max(0, gross - less);
          const amt = parseFloat(String(art.loanAmount || 0)) || 0;
          return {
            itemName: (art.itemName || "Jewellery Article").trim(),
            purity: art.purity || "22K",
            quantity: Number(art.quantity) || 1,
            grossWeight: gross,
            lessWeight: less,
            netWeight: net,
            loanAmount: amt,
            presentValue: amt * 1.3,
          };
        }),
      };

      if (pledge.status === "closed" && closedDate) {
        updateData.closedDate = closedDate;
      }

      const res = await api.updatePledge(pledge.id, updateData);
      if (res.success) {
        toast.success(`Pledge ${pledgeNumber} and customer details updated successfully!`);
        onSuccess({
          ...pledge,
          ...updateData,
          pledgeNumber: pledgeNumber.trim(),
          customer: {
            ...pledge.customer,
            name: customerName.trim(),
            mobileNumber: customerMobile.trim(),
            relationType: customerRelationType as any,
            relationName: customerRelationName.trim(),
            address: customerAddress.trim(),
          },
          totalLoanAmount: String(loanNum),
          totalGrossWeight: totalGrossCalculated,
          totalNetWeight: totalNetCalculated,
          totalArticlesCount: articles.reduce((sum, a) => sum + (Number(a.quantity) || 1), 0),
          articles: res.data?.articles || articles,
        });
        onClose();
      } else {
        toast.error((res as any).message || (res as any).error || "Failed to update pledge.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating pledge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B1326] text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Edit Girvi Record (संशोधन)</h3>
              <p className="text-[11px] text-slate-400">
                Pledge #{pledgeNumber || pledge.pledgeNumber} • Customer: {customerName || pledge.customer?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Customer Details (FULLY EDITABLE!) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <User className="h-3.5 w-3.5 text-amber-600" />
              <span>1. Customer Information (ग्राहक का विवरण)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Mobile Number */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-500" />
                  <span>Mobile Number (मोबाइल नंबर)</span>
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="e.g. 9820123456 (optional)"
                  className="h-9 text-xs font-semibold text-slate-900"
                />
              </div>

              {/* Customer Full Name */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Customer Full Name (पूरा नाम) *
                </Label>
                <Input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra Sharma"
                  className="h-9 text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Relation Type */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Relation (संबंध)
                </Label>
                <select
                  value={customerRelationType}
                  onChange={(e) => setCustomerRelationType(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 font-medium"
                >
                  <option value="S/O">S/O (पुत्र)</option>
                  <option value="D/O">D/O (पुत्री)</option>
                  <option value="W/O">W/O (पत्नी)</option>
                  <option value="C/O">C/O (के द्वारा)</option>
                  <option value="O">Other</option>
                </select>
              </div>

              {/* Relation / Father / Husband Name */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Father / Husband Name (पिता / पति का नाम)
                </Label>
                <Input
                  value={customerRelationName}
                  onChange={(e) => setCustomerRelationName(e.target.value)}
                  placeholder="e.g. Kailash Chandra"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Full Address */}
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-500" />
                <span>Customer Address (पूरा पता)</span>
              </Label>
              <Input
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="House No, Street, Landmark, City"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Section 2: Pledge Identification & Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Hash className="h-3.5 w-3.5 text-amber-600" />
              <span>2. Pledge Number & Timeline (गिरवी नंबर एवं अवधि)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Pledge Number (FULLY EDITABLE!) */}
              <div>
                <Label className="text-xs font-bold text-amber-900 mb-1.5 block">
                  Pledge Number *
                </Label>
                <Input
                  required
                  value={pledgeNumber}
                  onChange={(e) => setPledgeNumber(e.target.value)}
                  placeholder="e.g. C4682"
                  className="h-9 text-xs font-mono font-bold border-amber-300 bg-amber-50/30 text-slate-900 focus-visible:ring-amber-500"
                />
              </div>

              {/* Pledge Date */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Pledge Date *
                </Label>
                <Input
                  type="date"
                  required
                  value={pledgeDate}
                  onChange={(e) => setPledgeDate(e.target.value)}
                  className="h-9 text-xs font-medium"
                />
              </div>

              {/* Due Date */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Due Date *
                </Label>
                <Input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            {pledge.status === "closed" && (
              <div>
                <Label className="text-xs font-bold text-emerald-800 mb-1.5 block">
                  Release Date (छुड़ाने की तिथि)
                </Label>
                <Input
                  type="date"
                  value={closedDate}
                  onChange={(e) => setClosedDate(e.target.value)}
                  className="h-9 text-xs border-emerald-300 font-semibold"
                />
              </div>
            )}
          </div>

          {/* Section 3: Jewellery Articles (Item Name, Weights, Amount) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Gem className="h-3.5 w-3.5 text-amber-600" />
                <span>3. Jewellery Items & Weights (आभूषण विवरण एवं वजन)</span>
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addArticle}
                className="h-7 px-2.5 text-xs gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Item</span>
              </Button>
            </div>

            {isLoadingArticles ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                <span>Loading jewellery items...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((art, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 relative space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Item #{index + 1}
                      </span>
                      {articles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeArticle(index)}
                          className="text-rose-600 hover:text-rose-800 text-xs flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {/* Item Name */}
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                          Item Name / Description *
                        </Label>
                        <Input
                          required
                          value={art.itemName}
                          onChange={(e) => updateArticle(index, "itemName", e.target.value)}
                          placeholder="e.g. Gold Antique Necklace"
                          className="h-8 text-xs bg-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Quantity */}
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                          Quantity
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={art.quantity !== undefined && art.quantity !== null ? art.quantity : ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateArticle(index, "quantity", e.target.value)}
                          onBlur={() => {
                            if (!art.quantity || Number(art.quantity) < 1) {
                              updateArticle(index, "quantity", 1);
                            }
                          }}
                          className="h-8 text-xs bg-white text-center font-bold"
                        />
                      </div>

                      {/* Gross Weight */}
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                          Gross Wt (g) *
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          required
                          value={art.grossWeight}
                          onChange={(e) => updateArticle(index, "grossWeight", e.target.value)}
                          className="h-8 text-xs bg-white font-bold"
                        />
                      </div>

                      {/* Less Weight (Deduction) */}
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                          Less Wt (g)
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          value={art.lessWeight}
                          onChange={(e) => updateArticle(index, "lessWeight", e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                      </div>

                      {/* Net Weight (Gross - Less) */}
                      <div>
                        <Label className="text-[11px] font-semibold text-amber-900 mb-1 block">
                          Net Wt (g)
                        </Label>
                        <div className="h-8 rounded-lg border border-amber-200 bg-amber-50/70 px-2 flex items-center text-xs font-black text-amber-900">
                          {formatWeight(art.netWeight || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Weight Totals Badge */}
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs font-bold text-amber-950">
                  <div className="flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-amber-700" />
                    <span>Calculated Total Weight:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Gross: {totalGrossCalculated} g</span>
                    <span>•</span>
                    <span className="text-amber-900 font-extrabold">Net: {totalNetCalculated} g</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Financial & Storage Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Coins className="h-3.5 w-3.5 text-emerald-600" />
              <span>4. Loan Amount & Storage (ऋण राशि एवं लॉकर)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total Loan Amount */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Total Loan Amount (₹) *
                </Label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={totalLoanAmount}
                  onChange={(e) => setTotalLoanAmount(e.target.value)}
                  className="h-9 text-xs font-bold text-emerald-800"
                />
              </div>

              {/* Metal Type - Direct Selectable Buttons */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Metal Type (धातु) *
                </Label>
                <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg border border-slate-200 h-9 gap-1">
                  <button
                    type="button"
                    onClick={() => setMetalType("Gold")}
                    className={`flex items-center justify-center gap-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      metalType === "Gold"
                        ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-600"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <span>🪙 Gold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetalType("Silver")}
                    className={`flex items-center justify-center gap-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      metalType === "Silver"
                        ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <span>🥈 Silver</span>
                  </button>
                </div>
              </div>

              {/* Storage Location */}
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Locker / Storage
                </Label>
                <Input
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="e.g. Vault-1, Locker 04"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Remarks / Notes
              </Label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Verified ornaments with hallmark"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="gold"
              className="gap-2 font-bold text-xs px-5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Pledge & Items</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               DELETE MODAL                                 */
/* -------------------------------------------------------------------------- */

interface DeleteModalProps {
  isOpen: boolean;
  pledge: Pledge | null;
  onClose: () => void;
  onSuccess: (pledgeId: string) => void;
}

export function DeleteModal({
  isOpen,
  pledge,
  onClose,
  onSuccess,
}: DeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !pledge) return null;

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.deletePledge(pledge.id);
      if (res.success) {
        toast.success(`Pledge ${pledge.pledgeNumber} deleted successfully.`);
        onSuccess(pledge.id);
        onClose();
      } else {
        toast.error((res as any).message || (res as any).error || "Failed to delete pledge.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting pledge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white/20">
              <Trash2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Delete Pledge (रिकॉर्ड हटाएं)</h3>
              <p className="text-[11px] text-rose-100">Permanent Action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to delete this record?</p>
              <p className="mt-1 text-rose-700">
                Pledge <strong className="text-slate-900">{pledge.pledgeNumber}</strong> for{" "}
                <strong className="text-slate-900">{pledge.customer?.name}</strong> will be permanently
                removed along with its articles and payments. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-bold text-xs px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Yes, Delete Pledge</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
