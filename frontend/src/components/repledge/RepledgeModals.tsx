"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Repledge, Pledge, RepledgeInterestPayment } from "@/types";
import { api } from "@/lib/api";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Landmark,
  X,
  Check,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Coins,
  Scale,
  User,
  Hash,
  Trash2,
  Undo2,
  Layers,
  Sparkles,
  Pencil,
  Plus,
  Receipt,
  History,
  CreditCard,
  Clock,
  Printer,
  Save,
} from "lucide-react";

export const PLEDGER_NAMES = [
  "VIKRAM",
  "DEEPAK S",
  "KAVITHA S",
  "SHANKARLAL",
  "KAMLESH",
  "OM PRAKASH",
  "MAINA DEVI",
  "VIKASH",
];

export const BANK_NAMES = [
  "Kosamattam Finance",
  "Muthoot Money",
  "BOB",
  "DH",
  "SBI",
];

/* -------------------------------------------------------------------------- */
/* NEW BANK RE-PLEDGE MODAL                                                   */
/* -------------------------------------------------------------------------- */
interface NewRepledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRepledge: any) => void;
}

export function NewRepledgeModal({ isOpen, onClose, onSuccess }: NewRepledgeModalProps) {
  const [pledgerName, setPledgerName] = useState(PLEDGER_NAMES[0]);
  const [isOtherPledger, setIsOtherPledger] = useState(false);
  const [customPledgerName, setCustomPledgerName] = useState("");

  const [bankName, setBankName] = useState(BANK_NAMES[0]);
  const [isOtherBank, setIsOtherBank] = useState(false);
  const [customBankName, setCustomBankName] = useState("");

  const [bankPledgeNumber, setBankPledgeNumber] = useState("");
  const [bankPledgeDate, setBankPledgeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bankPledgeAmount, setBankPledgeAmount] = useState<string | number>("");
  const [remarks, setRemarks] = useState("");

  // Girvi selection
  const [availablePledges, setAvailablePledges] = useState<Pledge[]>([]);
  const [isLoadingPledges, setIsLoadingPledges] = useState(false);
  const [girviSearch, setGirviSearch] = useState("");
  const [selectedPledgeIds, setSelectedPledgeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingPledges(true);
      api
        .getPledges({ status: "active", limit: "all" })
        .then((res) => {
          if (res.success && res.data) {
            // Load all active pledges (supports repledging a girvi across multiple bank ledgers)
            setAvailablePledges(res.data);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch pledges for repledge:", err);
          toast.error("Failed to load active girvis for selection.");
        })
        .finally(() => setIsLoadingPledges(false));
    } else {
      // Reset form
      setPledgerName(PLEDGER_NAMES[0]);
      setIsOtherPledger(false);
      setCustomPledgerName("");
      setBankName(BANK_NAMES[0]);
      setIsOtherBank(false);
      setCustomBankName("");
      setBankPledgeNumber("");
      setBankPledgeAmount("");
      setRemarks("");
      setSelectedPledgeIds([]);
      setGirviSearch("");
    }
  }, [isOpen]);

  const filteredPledges = useMemo(() => {
    if (!girviSearch.trim()) return availablePledges.slice(0, 30);
    const q = girviSearch.trim().toLowerCase();
    return availablePledges.filter(
      (p) =>
        p.pledgeNumber.toLowerCase().includes(q) ||
        (p.customer?.name && p.customer.name.toLowerCase().includes(q)) ||
        (p.customer?.mobileNumber && p.customer.mobileNumber.includes(q))
    );
  }, [availablePledges, girviSearch]);

  const selectedPledgesList = useMemo(() => {
    return availablePledges.filter((p) => selectedPledgeIds.includes(p.id));
  }, [availablePledges, selectedPledgeIds]);

  const totalGrossWeight = selectedPledgesList
    .reduce((sum, p) => sum + (parseFloat(String(p.totalGrossWeight)) || 0), 0)
    .toFixed(3);

  const totalNetWeight = selectedPledgesList
    .reduce((sum, p) => sum + (parseFloat(String(p.totalNetWeight)) || 0), 0)
    .toFixed(3);

  const totalOurLoanAmount = selectedPledgesList.reduce(
    (sum, p) => sum + (parseFloat(String(p.totalLoanAmount)) || 0),
    0
  );

  const toggleSelectPledge = (id: string) => {
    setSelectedPledgeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalPledgerName = (isOtherPledger ? customPledgerName : pledgerName).trim().toUpperCase();
    if (!finalPledgerName) {
      toast.error("Please enter or select the Pledger Name.");
      return;
    }

    const finalBankName = (isOtherBank ? customBankName : bankName).trim();
    if (!finalBankName) {
      toast.error("Please enter or select the Bank Name.");
      return;
    }

    if (!bankPledgeNumber.trim()) {
      toast.error("Please enter the Bank Pledge Number.");
      return;
    }
    const amt = parseFloat(String(bankPledgeAmount));
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid Bank Pledge Amount.");
      return;
    }
    if (selectedPledgeIds.length === 0) {
      toast.error("Please select at least one our Girvi to link with this bank re-pledge.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createRepledge({
        pledgerName: finalPledgerName,
        bankName: finalBankName,
        bankPledgeNumber: bankPledgeNumber.trim().toUpperCase(),
        bankPledgeDate,
        bankPledgeAmount: amt,
        pledgeIds: selectedPledgeIds,
        remarks: remarks.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(`Bank Re-Pledge #${bankPledgeNumber} created with ${finalBankName}!`);
        onSuccess(res.data);
        onClose();
      } else {
        toast.error((res as any).error || "Failed to create bank re-pledge.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit bank re-pledge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B1326] text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">New Bank Re-Pledge (नया बैंक री-प्लेज)</h3>
              <p className="text-[11px] text-slate-400">
                Pledge shop ornaments with commercial banks & NBFCs for working capital
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Pledger & Bank Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <User className="h-3.5 w-3.5 text-amber-600" />
              <span>1. Pledger & Bank Selection (री-प्लेज नाम एवं बैंक)</span>
            </h4>

            {/* Pledger Name Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Name of the Pledger (किसके नाम पर रखा है) *
                </Label>
                {isOtherPledger && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Custom Name (अन्य नाम)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLEDGER_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setPledgerName(name);
                      setIsOtherPledger(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isOtherPledger && pledgerName === name
                        ? "bg-[#0F1E36] text-white shadow-sm ring-2 ring-amber-500"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    {name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsOtherPledger(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isOtherPledger
                      ? "bg-[#0F1E36] text-white shadow-sm ring-2 ring-amber-500 font-extrabold"
                      : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Other (अन्य)</span>
                </button>
              </div>

              {isOtherPledger && (
                <div className="pt-1.5 animate-in fade-in duration-150">
                  <Input
                    placeholder="Type custom pledger name (e.g. RAMESH, SURESH)"
                    value={customPledgerName}
                    onChange={(e) => setCustomPledgerName(e.target.value.toUpperCase())}
                    className="h-9 text-xs font-bold uppercase bg-amber-50/50 border-amber-300 text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                    autoFocus
                    required
                  />
                </div>
              )}
            </div>

            {/* Bank Name Selection */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Bank Name (बैंक / संस्था का नाम) *
                </Label>
                {isOtherBank && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Custom Bank / Financier (अन्य बैंक)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {BANK_NAMES.map((bName) => (
                  <button
                    key={bName}
                    type="button"
                    onClick={() => {
                      setBankName(bName);
                      setIsOtherBank(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      !isOtherBank && bankName === bName
                        ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-300"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    <Landmark className="h-3.5 w-3.5" />
                    <span>{bName}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsOtherBank(true)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isOtherBank
                      ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-300 font-extrabold"
                      : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Other (अन्य बैंक)</span>
                </button>
              </div>

              {isOtherBank && (
                <div className="pt-1.5 animate-in fade-in duration-150">
                  <Input
                    placeholder="Type custom bank or financier name (e.g. HDFC Bank, ICICI, Axis Bank)"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    className="h-9 text-xs font-bold bg-amber-50/50 border-amber-300 text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                    autoFocus
                    required
                  />
                </div>
              )}
            </div>

            {/* Loan Terms: Bank Pledge Number, Date, Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Bank Pledge # *</Label>
                <Input
                  required
                  placeholder="e.g. KOS-88492"
                  value={bankPledgeNumber}
                  onChange={(e) => setBankPledgeNumber(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Bank Pledge Date *</Label>
                <Input
                  type="date"
                  required
                  value={bankPledgeDate}
                  onChange={(e) => setBankPledgeDate(e.target.value)}
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-emerald-800">Bank Loan Amount (₹) *</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="e.g. 150000"
                  value={bankPledgeAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBankPledgeAmount(e.target.value)}
                  className="h-9 text-xs font-bold text-emerald-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Select Which Girvis are Kept in the Bank */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-600" />
                <span>2. Select Our Girvi Numbers Kept in Bank (गिरवी नंबर चुनें) *</span>
              </h4>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                {selectedPledgeIds.length} Selected
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Multiple girvis can be merged and kept together in a single bank loan (e.g. C4254, C4255):
            </p>

            {/* Search Input for Available Girvis */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by Girvi # (e.g. C4254), customer name, or phone..."
                value={girviSearch}
                onChange={(e) => setGirviSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* List of Available Girvis */}
            <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
              {isLoadingPledges ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading active girvis...</div>
              ) : filteredPledges.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No un-repledged active girvis found matching search.
                </div>
              ) : (
                filteredPledges.map((p) => {
                  const isSelected = selectedPledgeIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectPledge(p.id)}
                      className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-100/70 border-l-4 border-amber-600 font-medium"
                          : "hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-amber-600 border-amber-700 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 mr-2">
                            {p.pledgeNumber}
                          </span>
                          <span className="text-slate-700 font-semibold">{p.customer?.name}</span>
                          <span className="text-slate-400 text-[11px] ml-1.5">
                            ({p.totalArticlesCount || 1} item{p.totalArticlesCount !== 1 ? "s" : ""})
                          </span>
                          {(p as any).isRepledged && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.2 rounded">
                              Also in: {(p as any).repledgedBankName || "Bank"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className="font-mono text-slate-700">
                          Net: {formatWeight(p.totalNetWeight)}
                        </span>
                        <span className="font-bold text-emerald-800">
                          {formatIndianCurrency(p.totalLoanAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Summary Pill Badge */}
            {selectedPledgesList.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                    <span>Merged Girvis: {selectedPledgesList.map((p) => p.pledgeNumber).join(", ")}</span>
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Total {selectedPledgesList.length} girvi pledge(s) will be locked under this bank re-pledge.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-bold text-amber-950">
                  <span>Gross: {totalGrossWeight} g</span>
                  <span>•</span>
                  <span>Net: {totalNetWeight} g</span>
                  <span>•</span>
                  <span className="text-emerald-900">
                    Our Loan: {formatIndianCurrency(totalOurLoanAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Optional Remarks */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Remarks / Notes (टिप्पणी)</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Kept 2 pouches of ornaments at SBI Branch Manager desk"
              className="h-9 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || selectedPledgeIds.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Creating..." : "Save Bank Re-Pledge"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EDIT BANK RE-PLEDGE MODAL                                                  */
/* -------------------------------------------------------------------------- */
interface EditRepledgeModalProps {
  isOpen: boolean;
  repledge: Repledge | null;
  onClose: () => void;
  onSuccess: (updatedRepledge: any) => void;
}

export function EditRepledgeModal({
  isOpen,
  repledge,
  onClose,
  onSuccess,
}: EditRepledgeModalProps) {
  const [pledgerName, setPledgerName] = useState("");
  const [isOtherPledger, setIsOtherPledger] = useState(false);
  const [customPledgerName, setCustomPledgerName] = useState("");

  const [bankName, setBankName] = useState("");
  const [isOtherBank, setIsOtherBank] = useState(false);
  const [customBankName, setCustomBankName] = useState("");

  const [bankPledgeNumber, setBankPledgeNumber] = useState("");
  const [bankPledgeDate, setBankPledgeDate] = useState("");
  const [bankPledgeAmount, setBankPledgeAmount] = useState<string | number>("");
  const [remarks, setRemarks] = useState("");

  // Girvi selection
  const [availablePledges, setAvailablePledges] = useState<Pledge[]>([]);
  const [isLoadingPledges, setIsLoadingPledges] = useState(false);
  const [girviSearch, setGirviSearch] = useState("");
  const [selectedPledgeIds, setSelectedPledgeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && repledge) {
      const initialPledger = repledge.pledgerName || PLEDGER_NAMES[0];
      if (PLEDGER_NAMES.includes(initialPledger)) {
        setPledgerName(initialPledger);
        setIsOtherPledger(false);
        setCustomPledgerName("");
      } else {
        setPledgerName("OTHER");
        setIsOtherPledger(true);
        setCustomPledgerName(initialPledger);
      }

      const initialBank = repledge.bankName || BANK_NAMES[0];
      if (BANK_NAMES.includes(initialBank)) {
        setBankName(initialBank);
        setIsOtherBank(false);
        setCustomBankName("");
      } else {
        setBankName("OTHER");
        setIsOtherBank(true);
        setCustomBankName(initialBank);
      }

      setBankPledgeNumber(repledge.bankPledgeNumber || "");
      setBankPledgeDate(
        repledge.bankPledgeDate
          ? new Date(repledge.bankPledgeDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setBankPledgeAmount(repledge.bankPledgeAmount || "");
      setRemarks(repledge.remarks || "");

      // Initial selected pledges from current repledge
      const initialIds = (repledge.linkedPledges || []).map((p: any) => p.pledgeId || p.id);
      setSelectedPledgeIds(initialIds);

      // Fetch active pledges and combine with existing linked pledges
      setIsLoadingPledges(true);
      api
        .getPledges({ status: "active", limit: "all" })
        .then((res) => {
          if (res.success && res.data) {
            const fetched: Pledge[] = res.data;
            const map = new Map<string, Pledge>();
            fetched.forEach((p) => map.set(p.id, p));

            // Ensure existing linked items are in map
            (repledge.linkedPledges || []).forEach((lp: any) => {
              const pid = lp.pledgeId || lp.id;
              if (pid && !map.has(pid)) {
                map.set(pid, {
                  id: pid,
                  pledgeNumber: lp.pledgeNumber,
                  totalGrossWeight: lp.totalGrossWeight || "0",
                  totalNetWeight: lp.totalNetWeight || "0",
                  totalLoanAmount: lp.totalLoanAmount || "0",
                  customer: {
                    name: lp.customerName || "",
                    mobileNumber: lp.customerMobile || "",
                  },
                } as unknown as Pledge);
              }
            });

            setAvailablePledges(Array.from(map.values()));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch pledges for edit repledge:", err);
          toast.error("Failed to load active girvis.");
        })
        .finally(() => setIsLoadingPledges(false));
    }
  }, [isOpen, repledge]);

  const filteredPledges = useMemo(() => {
    if (!girviSearch.trim()) return availablePledges.slice(0, 30);
    const q = girviSearch.trim().toLowerCase();
    return availablePledges.filter(
      (p) =>
        p.pledgeNumber.toLowerCase().includes(q) ||
        (p.customer?.name && p.customer.name.toLowerCase().includes(q)) ||
        (p.customer?.mobileNumber && p.customer.mobileNumber.includes(q))
    );
  }, [availablePledges, girviSearch]);

  const selectedPledgesList = useMemo(() => {
    return availablePledges.filter((p) => selectedPledgeIds.includes(p.id));
  }, [availablePledges, selectedPledgeIds]);

  const totalGrossWeight = selectedPledgesList
    .reduce((sum, p) => sum + (parseFloat(String(p.totalGrossWeight)) || 0), 0)
    .toFixed(3);

  const totalNetWeight = selectedPledgesList
    .reduce((sum, p) => sum + (parseFloat(String(p.totalNetWeight)) || 0), 0)
    .toFixed(3);

  const totalOurLoanAmount = selectedPledgesList.reduce(
    (sum, p) => sum + (parseFloat(String(p.totalLoanAmount)) || 0),
    0
  );

  const toggleSelectPledge = (id: string) => {
    setSelectedPledgeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repledge) return;

    const finalPledgerName = (isOtherPledger ? customPledgerName : pledgerName).trim().toUpperCase();
    if (!finalPledgerName) {
      toast.error("Please enter or select the Pledger Name.");
      return;
    }

    const finalBankName = (isOtherBank ? customBankName : bankName).trim();
    if (!finalBankName) {
      toast.error("Please enter or select the Bank Name.");
      return;
    }

    if (!bankPledgeNumber.trim()) {
      toast.error("Please enter the Bank Pledge Number.");
      return;
    }
    const amt = parseFloat(String(bankPledgeAmount));
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid Bank Pledge Amount.");
      return;
    }
    if (selectedPledgeIds.length === 0) {
      toast.error("Please select at least one of our Girvis to remain linked.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.updateRepledge(repledge.id, {
        pledgerName: finalPledgerName,
        bankName: finalBankName,
        bankPledgeNumber: bankPledgeNumber.trim().toUpperCase(),
        bankPledgeDate,
        bankPledgeAmount: amt,
        pledgeIds: selectedPledgeIds,
        remarks: remarks.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(`Bank Re-Pledge #${bankPledgeNumber} updated successfully!`);
        onSuccess(res.data);
        onClose();
      } else {
        toast.error((res as any).error || "Failed to update bank re-pledge.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update bank re-pledge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !repledge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Edit Bank Re-Pledge (री-प्लेज संशोधन)</h2>
              <p className="text-xs text-amber-100">
                Update bank details, pledger name, loan amount, or modify linked girvis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Bank & Pledger Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <Landmark className="h-3.5 w-3.5 text-amber-700" />
              <span>1. Bank & Pledger Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Name of Pledger */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  Name of the Pledger (किसके नाम पर रखा) <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={isOtherPledger ? "OTHER" : pledgerName}
                  onChange={(e) => {
                    if (e.target.value === "OTHER") {
                      setIsOtherPledger(true);
                    } else {
                      setIsOtherPledger(false);
                      setPledgerName(e.target.value);
                    }
                  }}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  required
                >
                  {PLEDGER_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  <option value="OTHER">Other (अन्य व्यक्ति)...</option>
                </select>

                {isOtherPledger && (
                  <Input
                    placeholder="Type custom pledger name (e.g. RAMESH)"
                    value={customPledgerName}
                    onChange={(e) => setCustomPledgerName(e.target.value.toUpperCase())}
                    className="h-9 text-xs font-bold uppercase mt-1.5 bg-amber-50/50 border-amber-300 text-slate-900"
                    autoFocus
                    required
                  />
                )}
              </div>

              {/* Bank Name */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  Bank / Finance Name (बैंक का नाम) <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={isOtherBank ? "OTHER" : bankName}
                  onChange={(e) => {
                    if (e.target.value === "OTHER") {
                      setIsOtherBank(true);
                    } else {
                      setIsOtherBank(false);
                      setBankName(e.target.value);
                    }
                  }}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  required
                >
                  {BANK_NAMES.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                  <option value="OTHER">Other (अन्य बैंक)...</option>
                </select>

                {isOtherBank && (
                  <Input
                    placeholder="Type custom bank or financier name (e.g. HDFC Bank)"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    className="h-9 text-xs font-bold mt-1.5 bg-amber-50/50 border-amber-300 text-slate-900"
                    autoFocus
                    required
                  />
                )}
              </div>

              {/* Bank Pledge Number */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  Bank Pledge Number (बैंक पावती नंबर) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={bankPledgeNumber}
                  onChange={(e) => setBankPledgeNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KOS-10294, MUT-8821"
                  required
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              {/* Bank Pledge Date */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  Bank Pledge Date (बैंक में रखने की तारीख) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={bankPledgeDate}
                  onChange={(e) => setBankPledgeDate(e.target.value)}
                  required
                  className="h-9 text-xs font-medium"
                />
              </div>

              {/* Bank Pledge Amount */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold text-slate-700">
                  Bank Pledge Loan Amount (₹ बैंक से उठाया गया लोन) <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 150000"
                    value={bankPledgeAmount}
                    onChange={(e) => setBankPledgeAmount(e.target.value)}
                    required
                    className="pl-7 h-9 text-sm font-bold text-emerald-800"
                  />
                </div>
                {bankPledgeAmount && !isNaN(Number(bankPledgeAmount)) && (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    {formatIndianCurrency(Number(bankPledgeAmount))}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Which Items / Our Girvi Number (Merge Multi-Girvi) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-700" />
                <span>2. Linked Girvi Pledges (हमारी गिरवी नंबर)</span>
                <span className="text-rose-500">*</span>
              </h3>
              <span className="text-xs text-slate-500">
                Selected: <strong className="text-amber-800 font-bold">{selectedPledgeIds.length} Girvis</strong>
              </span>
            </div>

            {/* Girvi Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={girviSearch}
                onChange={(e) => setGirviSearch(e.target.value)}
                placeholder="Search our pledge # (e.g. C4254, C4255) or customer name..."
                className="pl-8 h-8 text-xs bg-slate-50"
              />
            </div>

            {/* Pledges Selection Box */}
            <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white">
              {isLoadingPledges ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading active girvis...</div>
              ) : filteredPledges.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No active girvis matching search.
                </div>
              ) : (
                filteredPledges.map((p) => {
                  const isSelected = selectedPledgeIds.includes(p.id);
                  const isCurrentlyInThis = (repledge.linkedPledges || []).some(
                    (lp: any) => (lp.pledgeId || lp.id) === p.id
                  );

                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectPledge(p.id)}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer text-xs transition-colors ${
                        isSelected ? "bg-amber-50/70 hover:bg-amber-100/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-amber-600 border-amber-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{p.pledgeNumber}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                p.metalType === "Silver"
                                  ? "bg-slate-200 text-slate-800"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {p.metalType || "Gold"}
                            </span>
                            {isCurrentlyInThis && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Current Link
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {p.customer?.name} • {p.totalArticlesCount || 1} pcs
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-800 block">
                          {formatWeight(p.totalNetWeight)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800">
                          {formatIndianCurrency(p.totalLoanAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Summary Pill Badge */}
            {selectedPledgesList.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                    <span>Merged Girvis: {selectedPledgesList.map((p) => p.pledgeNumber).join(", ")}</span>
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Total {selectedPledgesList.length} girvi pledge(s) will be linked under this bank re-pledge.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-bold text-amber-950">
                  <span>Gross: {totalGrossWeight} g</span>
                  <span>•</span>
                  <span>Net: {totalNetWeight} g</span>
                  <span>•</span>
                  <span className="text-emerald-900">
                    Our Loan: {formatIndianCurrency(totalOurLoanAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Optional Remarks */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Remarks / Notes (टिप्पणी)</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Updated pledge details at branch"
              className="h-9 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || selectedPledgeIds.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* RELEASE BANK RE-PLEDGE MODAL                                               */
/* -------------------------------------------------------------------------- */
interface ReleaseRepledgeModalProps {
  isOpen: boolean;
  repledge: Repledge | null;
  onClose: () => void;
  onSuccess: (releasedId: string, releasedDate: string) => void;
}

export function ReleaseRepledgeModal({
  isOpen,
  repledge,
  onClose,
  onSuccess,
}: ReleaseRepledgeModalProps) {
  const [releasedDate, setReleasedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [releaseRemarks, setReleaseRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReleasedDate(new Date().toISOString().split("T")[0]);
      setReleaseRemarks("");
    }
  }, [isOpen]);

  if (!isOpen || !repledge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.releaseRepledge(repledge.id, {
        releasedDate,
        releaseRemarks: releaseRemarks.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          `Bank Re-Pledge #${repledge.bankPledgeNumber} has been released and all linked Girvis unlinked successfully!`
        );
        onSuccess(repledge.id, releasedDate);
        onClose();
      } else {
        toast.error((res as any).error || "Failed to release bank re-pledge.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error releasing bank re-pledge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-950 text-white border-b border-emerald-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Undo2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Release Bank Re-Pledge (बैंक छुड़ाई)</h3>
              <p className="text-[11px] text-emerald-300">
                Settle bank loan and unlink all customer girvis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Bank & Pledge #:</span>
              <span className="font-bold text-slate-900">
                {repledge.bankName} • #{repledge.bankPledgeNumber}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Pledger Name:</span>
              <span className="font-bold text-slate-900">{repledge.pledgerName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Bank Loan Amount:</span>
              <span className="font-black text-emerald-700">
                {formatIndianCurrency(repledge.bankPledgeAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2">
              <span className="text-slate-500">Linked Girvis to Unlink:</span>
              <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                {repledge.linkedPledgeNumbers && repledge.linkedPledgeNumbers.length > 0
                  ? repledge.linkedPledgeNumbers.join(", ")
                  : "None"}
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Once confirmed, this re-pledge will move to <strong>Re-Pledge Girvi Release</strong> and the linked girvis will be <strong>automatically unlinked</strong> and restored to the shop vault.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Release Date (छुड़ाई की तारीख) *</Label>
            <Input
              type="date"
              required
              value={releasedDate}
              onChange={(e) => setReleasedDate(e.target.value)}
              className="h-9 text-xs font-semibold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Settlement Remarks (टिप्पणी / विवरण)</Label>
            <Input
              value={releaseRemarks}
              onChange={(e) => setReleaseRemarks(e.target.value)}
              placeholder="e.g. Paid principal + interest via Cheque #4928"
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Releasing..." : "Confirm Bank Release"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* VIEW BANK RE-PLEDGE MODAL                                                  */
/* -------------------------------------------------------------------------- */
interface ViewRepledgeModalProps {
  isOpen: boolean;
  repledge: Repledge | null;
  onClose: () => void;
}

export function ViewRepledgeModal({ isOpen, repledge, onClose }: ViewRepledgeModalProps) {
  if (!isOpen || !repledge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B1326] text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Bank Re-Pledge Details</h3>
              <p className="text-[11px] text-slate-400">
                #{repledge.bankPledgeNumber} • {repledge.bankName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Key Status Pill */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Status:</span>
            {repledge.status === "active" ? (
              <Badge className="bg-[#0F1E36] text-white">Active in Bank (बैंक में गिरवी)</Badge>
            ) : (
              <Badge className="bg-emerald-600 text-white">Released / Closed (छुड़ाई गई)</Badge>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block">Bank Name:</span>
              <span className="font-bold text-slate-900">{repledge.bankName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Bank Pledge Number:</span>
              <span className="font-mono font-bold text-slate-900">{repledge.bankPledgeNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Name of Pledger:</span>
              <span className="font-bold text-slate-900">{repledge.pledgerName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Bank Pledge Date:</span>
              <span className="font-semibold text-slate-800">{repledge.bankPledgeDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Bank Loan Amount:</span>
              <span className="font-black text-emerald-800 text-sm">
                {formatIndianCurrency(repledge.bankPledgeAmount)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Total Net Weight:</span>
              <span className="font-bold text-amber-900">{formatWeight(repledge.totalNetWeight)}</span>
            </div>
            <div className="col-span-2 border-t border-slate-200 pt-2">
              <span className="text-slate-400 block">Total Bank Interest Paid (कुल ब्याज):</span>
              <span className="font-black text-amber-950 text-sm">
                {formatIndianCurrency(repledge.totalInterestPaid || 0)}
              </span>
            </div>
            {repledge.releasedDate && (
              <div className="col-span-2 border-t border-slate-200 pt-2">
                <span className="text-slate-400 block">Released Date:</span>
                <span className="font-bold text-emerald-800">{repledge.releasedDate}</span>
              </div>
            )}
            {repledge.releaseRemarks && (
              <div className="col-span-2">
                <span className="text-slate-400 block">Release Remarks:</span>
                <span className="text-slate-700 italic">{repledge.releaseRemarks}</span>
              </div>
            )}
            {repledge.remarks && (
              <div className="col-span-2 border-t border-slate-200 pt-2">
                <span className="text-slate-400 block">Notes / Remarks:</span>
                <span className="text-slate-700">{repledge.remarks}</span>
              </div>
            )}
          </div>

          {/* Linked Girvi Pledges */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-amber-600" />
              <span>Linked Our Girvi Pledges ({repledge.linkedPledgeNumbers?.length || 0})</span>
            </h5>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {repledge.linkedPledges && repledge.linkedPledges.length > 0 ? (
                repledge.linkedPledges.map((lp, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mr-2">
                        {lp.pledgeNumber}
                      </span>
                      <span className="font-semibold text-slate-800">{lp.customerName || "Customer"}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-slate-600 mr-2">{formatWeight(lp.totalNetWeight || 0)}</span>
                      <span className="font-bold text-emerald-800">{formatIndianCurrency(lp.totalLoanAmount || 0)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-600">
                  Pledges: {repledge.linkedPledgeNumbers?.join(", ") || "None recorded"}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DELETE BANK RE-PLEDGE MODAL                                                */
/* -------------------------------------------------------------------------- */
interface DeleteRepledgeModalProps {
  isOpen: boolean;
  repledge: Repledge | null;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
}

export function DeleteRepledgeModal({
  isOpen,
  repledge,
  onClose,
  onSuccess,
}: DeleteRepledgeModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !repledge) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await api.deleteRepledge(repledge.id);
      if (res.success) {
        toast.success(`Bank Re-Pledge #${repledge.bankPledgeNumber} deleted successfully.`);
        onSuccess(repledge.id);
        onClose();
      } else {
        toast.error(res.message || "Failed to delete repledge.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting repledge.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="p-2.5 rounded-full bg-rose-100">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Bank Re-Pledge?</h3>
              <p className="text-xs text-slate-500">
                #{repledge.bankPledgeNumber} • {repledge.bankName}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete this bank re-pledge record? Any active linked girvis will be automatically unlinked back into the shop vault.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
              className="gap-1 font-bold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? "Deleting..." : "Yes, Delete"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BANK RE-PLEDGE INTEREST PAYMENT & LEDGER MODAL                             */
/* -------------------------------------------------------------------------- */
interface RepledgeInterestModalProps {
  isOpen: boolean;
  repledge: Repledge | null;
  onClose: () => void;
  onInterestUpdated?: (updatedRepledgeId: string, newTotalInterestPaid: string) => void;
}

export function RepledgeInterestModal({
  isOpen,
  repledge,
  onClose,
  onInterestUpdated,
}: RepledgeInterestModalProps) {
  const [payments, setPayments] = useState<RepledgeInterestPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Form state
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<string | number>("");
  const [forMonth, setForMonth] = useState("");
  const [paymentMode, setPaymentMode] = useState("Online / Bank Transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  // Month suggestions (current month and previous 3 months)
  const monthSuggestions = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(d.toLocaleString("en-US", { month: "short", year: "numeric" }));
    }
    return list;
  }, []);

  const fetchPayments = async () => {
    if (!repledge) return;
    setIsLoading(true);
    try {
      const res = await api.getRepledgeInterest(repledge.id);
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch interest payments:", err);
      toast.error("Could not load interest payment history.");
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (p: RepledgeInterestPayment) => {
    setEditingPaymentId(p.id);
    setPaymentDate(p.paymentDate);
    setAmount(String(p.amount));
    setForMonth(p.forMonth || "");
    setPaymentMode(p.paymentMode || "Online / Bank Transfer");
    setReferenceNumber(p.referenceNumber || "");
    setRemarks(p.remarks || "");
  };

  const cancelEdit = () => {
    setEditingPaymentId(null);
    setAmount("");
    setReferenceNumber("");
    setRemarks("");
    const currentMonth = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
    setForMonth(currentMonth);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("Online / Bank Transfer");
  };

  useEffect(() => {
    if (isOpen && repledge) {
      fetchPayments();
      const currentMonth = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
      setForMonth(currentMonth);
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setAmount("");
      setReferenceNumber("");
      setRemarks("");
      setPaymentMode("Online / Bank Transfer");
      setEditingPaymentId(null);
    } else {
      setPayments([]);
      setEditingPaymentId(null);
    }
  }, [isOpen, repledge?.id]);

  if (!isOpen || !repledge) return null;

  const totalCalculated = payments.reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(String(amount));
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid interest amount greater than 0");
      return;
    }
    if (!paymentDate) {
      toast.error("Please select a payment date");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPaymentId) {
        const res = await api.updateRepledgeInterest(repledge.id, editingPaymentId, {
          paymentDate,
          amount: numAmount,
          forMonth: forMonth.trim() || undefined,
          paymentMode,
          referenceNumber: referenceNumber.trim() || undefined,
          remarks: remarks.trim() || undefined,
        });

        if (res.success) {
          toast.success(res.message || "Interest payment entry updated successfully");
          cancelEdit();
          await fetchPayments();
          if (onInterestUpdated) {
            onInterestUpdated(repledge.id, res.totalInterestPaid);
          }
        } else {
          toast.error(res.message || "Failed to update interest payment");
        }
      } else {
        const res = await api.addRepledgeInterest(repledge.id, {
          paymentDate,
          amount: numAmount,
          forMonth: forMonth.trim() || undefined,
          paymentMode,
          referenceNumber: referenceNumber.trim() || undefined,
          remarks: remarks.trim() || undefined,
        });

        if (res.success) {
          toast.success(res.message || "Interest payment recorded successfully");
          setAmount("");
          setReferenceNumber("");
          setRemarks("");
          // Reload payments
          await fetchPayments();
          if (onInterestUpdated) {
            onInterestUpdated(repledge.id, res.totalInterestPaid);
          }
        } else {
          toast.error(res.message || "Failed to record interest payment");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving interest payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this interest payment record?")) {
      return;
    }
    setDeletingPaymentId(paymentId);
    try {
      const res = await api.deleteRepledgeInterest(repledge.id, paymentId);
      if (res.success) {
        toast.success("Interest payment deleted successfully");
        await fetchPayments();
        if (onInterestUpdated) {
          onInterestUpdated(repledge.id, res.totalInterestPaid);
        }
      } else {
        toast.error(res.message || "Failed to delete payment entry");
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting payment");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B1326] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Bank Monthly Interest Payment Ledger</h3>
                <span className="text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  बैंक ब्याज भुगतान
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {repledge.bankName} • Pledge #{repledge.bankPledgeNumber} • {repledge.pledgerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loan Summary Strip */}
        <div className="bg-amber-50/70 border-b border-amber-200/80 px-6 py-3 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Bank & Loan #</span>
            <span className="font-bold text-slate-900">{repledge.bankName} - #{repledge.bankPledgeNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Loan Principal (मूलधन)</span>
            <span className="font-extrabold text-emerald-800">{formatIndianCurrency(repledge.bankPledgeAmount)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Pledge Date</span>
            <span className="font-semibold text-slate-700">{repledge.bankPledgeDate}</span>
          </div>
          <div>
            <span className="text-amber-900 block text-[10px] uppercase font-bold">Total Interest Paid So Far</span>
            <span className="font-black text-amber-950 text-sm">{formatIndianCurrency(totalCalculated)}</span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Record New Payment Form */}
          <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                {editingPaymentId ? (
                  <>
                    <Pencil className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-wide">
                      Edit Interest Payment Entry (ब्याज प्रविष्टि सुधारें)
                    </h4>
                    <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full">
                      Editing Mode
                    </span>
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Record Monthly Interest Payment (ब्याज भुगतान दर्ज करें)
                    </h4>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Monthly bank interest tracking</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Payment Date */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Payment Date (तारीख) *</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="h-9 text-xs bg-white"
                  />
                </div>

                {/* Amount Paid */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Interest Amount (₹ ब्याज) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="e.g. 3500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="pl-7 h-9 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                {/* For Month / Period */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">For Month / Period (किस महीने का)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Nov 2026"
                    value={forMonth}
                    onChange={(e) => setForMonth(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                  {/* Quick Month Pills */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-slate-400 mr-0.5">Quick:</span>
                    {monthSuggestions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForMonth(m)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          forMonth === m
                            ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Payment Mode */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Payment Mode (माध्यम)</Label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="Online / Bank Transfer">Online / Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI / QR">UPI / QR (GPay / PhonePe)</option>
                    <option value="Cash">Cash (नकद)</option>
                    <option value="Cheque">Cheque (चेक)</option>
                  </select>
                </div>

                {/* Ref / UTR # */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Bank UTR / Ref / Receipt #</Label>
                  <Input
                    type="text"
                    placeholder="e.g. UTR12849202, Rec# 994"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                {/* Remarks */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Remarks / Notes</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Paid via Kosamattam App"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Submit Button & Cancel button if editing */}
              <div className="flex items-center justify-end gap-2 pt-1">
                {editingPaymentId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEdit}
                    className="text-xs h-9 px-3"
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
                >
                  {editingPaymentId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span>
                    {isSubmitting
                      ? "Saving..."
                      : editingPaymentId
                      ? "Update Interest Entry (संशोधन सेव करें)"
                      : "Save Interest Payment (ब्याज दर्ज करें)"}
                  </span>
                </Button>
              </div>
            </form>
          </div>

          {/* Section 2: Interest Payment Ledger History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-700" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Interest Payment History ({payments.length} entries)
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-amber-950">
                Total: {formatIndianCurrency(totalCalculated)}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3 w-10 text-center font-bold">#</th>
                    <th className="py-2.5 px-3 font-bold">Payment Date</th>
                    <th className="py-2.5 px-3 font-bold">For Month</th>
                    <th className="py-2.5 px-3 font-bold text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 font-bold">Mode</th>
                    <th className="py-2.5 px-3 font-bold">Ref / UTR #</th>
                    <th className="py-2.5 px-3 font-bold">Remarks</th>
                    <th className="py-2.5 px-3 w-12 text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                          <span>Loading interest history...</span>
                        </div>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        <Coins className="h-6 w-6 mx-auto mb-1.5 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-xs">No interest payments recorded yet</p>
                        <p className="text-[11px] text-slate-400">
                          Use the form above to record your first monthly bank interest payment.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                          {p.paymentDate}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.forMonth ? (
                            <span className="font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                              {p.forMonth}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 text-xs sm:text-sm">
                          {formatIndianCurrency(p.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {p.paymentMode}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                          {p.referenceNumber || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 italic text-[11px]">
                          {p.remarks || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer mr-1"
                            title="Edit Payment Entry (सुधारें)"
                          >
                            <Pencil className="h-3.5 w-3.5 text-amber-600" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingPaymentId === p.id}
                            onClick={() => handleDelete(p.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Payment Entry (हटाएं)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {payments.length > 0 && (
                  <tfoot>
                    <tr className="bg-amber-50/80 font-bold border-t-2 border-amber-200 text-slate-900">
                      <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">
                        Total Interest Paid (कुल ब्याज भुगतान):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-950 text-sm">
                        {formatIndianCurrency(totalCalculated)}
                      </td>
                      <td colSpan={4} className="py-2.5 px-3 text-slate-500 font-normal text-[11px]">
                        Across {payments.length} monthly installments
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              Total Interest Recorded: <span className="font-bold text-amber-950">{formatIndianCurrency(totalCalculated)}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs text-slate-700 font-semibold h-7"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Ledger</span>
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
