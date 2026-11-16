"use client";

import { useState, useEffect } from "react";
import { Pledge } from "@/types";
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
  const [pledgeDate, setPledgeDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [closedDate, setClosedDate] = useState("");
  const [totalLoanAmount, setTotalLoanAmount] = useState<number | string>("");
  const [metalType, setMetalType] = useState<"Gold" | "Silver">("Gold");
  const [storageLocation, setStorageLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pledge) {
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
    }
  }, [pledge]);

  if (!isOpen || !pledge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loanNum = Number(totalLoanAmount);
    if (isNaN(loanNum) || loanNum <= 0) {
      toast.error("Please enter a valid loan amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        pledgeDate: pledgeDate || undefined,
        dueDate: dueDate || undefined,
        totalLoanAmount: loanNum,
        metalType,
        storageLocation: storageLocation.trim() || undefined,
        closureRemarks: remarks.trim() || undefined,
      };

      if (pledge.status === "closed" && closedDate) {
        updateData.closedDate = closedDate;
      }

      const res = await api.updatePledge(pledge.id, updateData);
      if (res.success) {
        toast.success(`Pledge ${pledge.pledgeNumber} updated successfully!`);
        onSuccess({
          ...pledge,
          ...updateData,
          totalLoanAmount: loanNum,
        });
        onClose();
      } else {
        toast.error(res.message || "Failed to update pledge.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating pledge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B1326] text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Edit Girvi Record (संशोधन)</h3>
              <p className="text-[11px] text-slate-400">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Pledge Date
              </Label>
              <Input
                type="date"
                required
                value={pledgeDate}
                onChange={(e) => setPledgeDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Due Date
              </Label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Loan Amount (₹) *
              </Label>
              <Input
                type="number"
                step="any"
                required
                value={totalLoanAmount}
                onChange={(e) => setTotalLoanAmount(e.target.value)}
                className="h-9 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                Metal Type
              </Label>
              <select
                value={metalType}
                onChange={(e) => setMetalType(e.target.value as any)}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 font-medium"
              >
                <option value="Gold">Gold (सोना)</option>
                <option value="Silver">Silver (चांदी)</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Locker / Storage Location
            </Label>
            <Input
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. Vault-1, Locker 04"
              className="h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
              Remarks
            </Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Special customer terms"
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
              variant="gold"
              className="gap-2 font-bold text-xs px-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
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
        toast.error(res.message || "Failed to delete pledge.");
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
