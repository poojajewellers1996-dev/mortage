"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { Repledge } from "@/types";
import { api } from "@/lib/api";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import {
  ViewRepledgeModal,
  DeleteRepledgeModal,
  RepledgeInterestModal,
  UndoRepledgeReleaseModal,
  BANK_NAMES,
  PLEDGER_NAMES,
} from "@/components/repledge/RepledgeModals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Undo2,
  CheckCircle2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Calendar,
  Coins,
  Scale,
  Eye,
  Trash2,
  Landmark,
  ArrowLeft,
  Receipt,
  RotateCcw,
} from "lucide-react";

type SortField = "bankPledgeNumber" | "bankName" | "pledgerName" | "bankPledgeDate" | "releasedDate" | "weight" | "amount" | "interestPaid";
type SortDirection = "asc" | "desc";

function ReleasedRepledgePageInner() {
  const [repledges, setRepledges] = useState<Repledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState("all");
  const [selectedPledger, setSelectedPledger] = useState("all");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("releasedDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Modals state
  const [viewModalRepledge, setViewModalRepledge] = useState<Repledge | null>(null);
  const [deleteModalRepledge, setDeleteModalRepledge] = useState<Repledge | null>(null);
  const [interestModalRepledge, setInterestModalRepledge] = useState<Repledge | null>(null);
  const [undoModalRepledge, setUndoModalRepledge] = useState<Repledge | null>(null);

  const fetchReleasedRepledges = () => {
    setIsLoading(true);
    api
      .getRepledges({ status: "released" })
      .then((res) => {
        if (res.success && res.data) {
          setRepledges(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load released repledges:", err);
        toast.error("Failed to load released re-pledge ledger.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReleasedRepledges();
  }, []);

  // Dynamic bank & pledger options (combines default presets with any custom ones in data)
  const allBankOptions = useMemo(() => {
    const set = new Set<string>(BANK_NAMES);
    repledges.forEach((r) => {
      if (r.bankName) set.add(r.bankName);
    });
    return Array.from(set);
  }, [repledges]);

  const allPledgerOptions = useMemo(() => {
    const set = new Set<string>(PLEDGER_NAMES);
    repledges.forEach((r) => {
      if (r.pledgerName) set.add(r.pledgerName);
    });
    return Array.from(set);
  }, [repledges]);

  // Filtered dataset
  const filteredRepledges = useMemo(() => {
    return repledges.filter((r) => {
      if (selectedBank !== "all" && r.bankName !== selectedBank) return false;
      if (selectedPledger !== "all" && r.pledgerName !== selectedPledger) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchBankPledgeNum = r.bankPledgeNumber.toLowerCase().includes(q);
        const matchBankName = r.bankName.toLowerCase().includes(q);
        const matchPledger = r.pledgerName.toLowerCase().includes(q);
        const matchGirvi = r.linkedPledgeNumbers?.some((n) => n.toLowerCase().includes(q));
        if (!matchBankPledgeNum && !matchBankName && !matchPledger && !matchGirvi) {
          return false;
        }
      }
      return true;
    });
  }, [repledges, selectedBank, selectedPledger, searchQuery]);

  // Client-side Sorting
  const sortedRepledges = useMemo(() => {
    return [...filteredRepledges].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "bankPledgeNumber":
          comparison = (a.bankPledgeNumber || "").localeCompare(b.bankPledgeNumber || "", undefined, {
            numeric: true,
          });
          break;
        case "bankName":
          comparison = (a.bankName || "").localeCompare(b.bankName || "");
          break;
        case "pledgerName":
          comparison = (a.pledgerName || "").localeCompare(b.pledgerName || "");
          break;
        case "bankPledgeDate":
          comparison = new Date(a.bankPledgeDate).getTime() - new Date(b.bankPledgeDate).getTime();
          break;
        case "releasedDate":
          comparison =
            new Date(a.releasedDate || a.updatedAt).getTime() - new Date(b.releasedDate || b.updatedAt).getTime();
          break;
        case "weight":
          comparison = (parseFloat(String(a.totalNetWeight)) || 0) - (parseFloat(String(b.totalNetWeight)) || 0);
          break;
        case "amount":
          comparison =
            (parseFloat(String(a.bankPledgeAmount)) || 0) - (parseFloat(String(b.bankPledgeAmount)) || 0);
          break;
        case "interestPaid":
          comparison =
            (parseFloat(String(a.totalInterestPaid || 0)) || 0) -
            (parseFloat(String(b.totalInterestPaid || 0)) || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRepledges, sortField, sortDirection]);

  // Metrics
  const totalSettledAmount = useMemo(() => {
    return repledges.reduce((sum, r) => sum + (parseFloat(String(r.bankPledgeAmount)) || 0), 0);
  }, [repledges]);

  const totalSettledInterestPaid = useMemo(() => {
    return repledges.reduce((sum, r) => sum + (parseFloat(String(r.totalInterestPaid || 0)) || 0), 0);
  }, [repledges]);

  const totalRedeemedWeight = useMemo(() => {
    return repledges.reduce((sum, r) => sum + (parseFloat(String(r.totalNetWeight)) || 0), 0).toFixed(3);
  }, [repledges]);

  const totalUnlinkedGirvis = useMemo(() => {
    return repledges.reduce((sum, r) => sum + (r.linkedPledgeNumbers?.length || 0), 0);
  }, [repledges]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(
        field === "amount" || field === "interestPaid" || field === "weight" || field === "releasedDate"
          ? "desc"
          : "asc"
      );
    }
  };

  const renderSortableHeader = (field: SortField, label: string, align: "left" | "right" | "center" = "left") => {
    const isActive = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={`inline-flex items-center gap-1 font-bold uppercase transition-colors cursor-pointer select-none hover:text-slate-900 ${
          align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : ""
        } ${isActive ? "text-emerald-800 font-extrabold" : "text-slate-600"}`}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3 text-emerald-700" />
          ) : (
            <ArrowDown className="h-3 w-3 text-emerald-700" />
          )
        ) : (
          <ArrowUpDown className="h-2.5 w-2.5 text-slate-400 opacity-60" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Released Re-Pledge Ledger (बैंक छुड़ाई गई री-प्लेज)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Settled bank gold loans • Customer ornaments unlinked and safely returned to shop
          </p>
        </div>

        <Link href="/dashboard/repledge">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-amber-800 border-amber-300 hover:bg-amber-50 font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>&larr; Active Re-Pledge Ledger</span>
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Settled */}
        <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Settled Bank Loans</span>
              <Coins className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-emerald-950">
              {formatIndianCurrency(totalSettledAmount)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Total bank capital redeemed</p>
          </CardContent>
        </Card>

        {/* Total Interest Paid */}
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Total Interest Paid</span>
              <Receipt className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg sm:text-xl font-black text-emerald-950">
              {formatIndianCurrency(totalSettledInterestPaid)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Paid across released loans</p>
          </CardContent>
        </Card>

        {/* Redeemed Weight */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Redeemed Weight</span>
              <Scale className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-800">{totalRedeemedWeight} g</p>
            <p className="text-[10px] text-slate-500 font-medium">Ornaments retrieved from banks</p>
          </CardContent>
        </Card>

        {/* Total Loans Released */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Closed Bank Loans</span>
              <Landmark className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-800">{repledges.length} Loans</p>
            <p className="text-[10px] text-slate-500 font-medium">Fully settled with banks</p>
          </CardContent>
        </Card>

        {/* Unlinked Girvis */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Unlinked Girvis</span>
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-emerald-900">{totalUnlinkedGirvis} Pledges</p>
            <p className="text-[10px] text-slate-500 font-medium">Customer ornaments unlinked</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Bank Pledge #, Bank Name, Pledger Name, or Girvi # (e.g. C4254)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm bg-slate-50/50"
              />
            </div>

            {/* Bank Filter */}
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 cursor-pointer"
            >
              <option value="all">All Banks (सभी बैंक)</option>
              {allBankOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Pledger Filter */}
            <select
              value={selectedPledger}
              onChange={(e) => setSelectedPledger(e.target.value)}
              className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 cursor-pointer"
            >
              <option value="all">All Pledgers (सभी व्यक्ति)</option>
              {allPledgerOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-3 w-10 text-center font-bold">#</th>
                  <th className="py-3 px-3">{renderSortableHeader("bankPledgeNumber", "Bank Pledge #")}</th>
                  <th className="py-3 px-3">{renderSortableHeader("bankName", "Bank Name")}</th>
                  <th className="py-3 px-3">{renderSortableHeader("pledgerName", "Pledger Name")}</th>
                  <th className="py-3 px-3">{renderSortableHeader("bankPledgeDate", "Pledge Date")}</th>
                  <th className="py-3 px-3">{renderSortableHeader("releasedDate", "Release Date")}</th>
                  <th className="py-3 px-3">
                    <span className="font-bold uppercase text-slate-600">Unlinked Girvi #s</span>
                  </th>
                  <th className="py-3 px-3 text-right">{renderSortableHeader("weight", "Net Wt", "right")}</th>
                  <th className="py-3 px-3 text-right">{renderSortableHeader("amount", "Bank Loan (₹)", "right")}</th>
                  <th className="py-3 px-3 text-right">{renderSortableHeader("interestPaid", "Interest Paid (₹)", "right")}</th>
                  <th className="py-3 px-3">
                    <span className="font-bold uppercase text-slate-600">Release Remarks</span>
                  </th>
                  <th className="py-3 px-3 text-center w-28">
                    <span className="font-bold uppercase text-slate-600">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                        <span>Loading released bank re-pledges...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedRepledges.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-1.5">
                        <CheckCircle2 className="h-8 w-8 text-slate-300" />
                        <span className="font-semibold text-slate-600">No released bank re-pledges yet</span>
                        <span className="text-[11px] text-slate-400">
                          When bank re-pledges are released, they will automatically appear in this historical ledger.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedRepledges.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Bank Pledge # */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {r.bankPledgeNumber}
                        </span>
                      </td>

                      {/* Bank Name */}
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {r.bankName}
                      </td>

                      {/* Pledger Name */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {r.pledgerName}
                      </td>

                      {/* Pledge Date */}
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {r.bankPledgeDate}
                      </td>

                      {/* Released Date */}
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                        {r.releasedDate || "—"}
                      </td>

                      {/* Unlinked Girvis */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {r.linkedPledgeNumbers && r.linkedPledgeNumbers.length > 0 ? (
                            r.linkedPledgeNumbers.map((num) => (
                              <span
                                key={num}
                                className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.2 rounded"
                              >
                                {num}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">None</span>
                          )}
                        </div>
                      </td>

                      {/* Net Wt */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatWeight(r.totalNetWeight)}
                      </td>

                      {/* Bank Loan Amount */}
                      <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                        {formatIndianCurrency(r.bankPledgeAmount)}
                      </td>

                      {/* Interest Paid */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-slate-900">
                            {formatIndianCurrency(r.totalInterestPaid || 0)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setInterestModalRepledge(r)}
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                            title="View Interest Ledger"
                          >
                            <Receipt className="h-2.5 w-2.5" />
                            <span>Ledger</span>
                          </button>
                        </div>
                      </td>

                      {/* Release Remarks */}
                      <td className="py-2.5 px-3 text-slate-600 italic text-[11px]">
                        {r.releaseRemarks || "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          {/* Undo Release Button */}
                          <button
                            type="button"
                            onClick={() => setUndoModalRepledge(r)}
                            className="p-1 rounded text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="Undo Release / Restore to Active Bank Re-Pledges"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>

                          {/* Interest Button */}
                          <button
                            type="button"
                            onClick={() => setInterestModalRepledge(r)}
                            className="p-1 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="View Interest Payment History"
                          >
                            <Coins className="h-3.5 w-3.5 text-amber-600" />
                          </button>

                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => setViewModalRepledge(r)}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalRepledge(r)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODALS */}
      <ViewRepledgeModal
        isOpen={!!viewModalRepledge}
        repledge={viewModalRepledge}
        onClose={() => setViewModalRepledge(null)}
      />

      <DeleteRepledgeModal
        isOpen={!!deleteModalRepledge}
        repledge={deleteModalRepledge}
        onClose={() => setDeleteModalRepledge(null)}
        onSuccess={(deletedId) => {
          setRepledges((prev) => prev.filter((r) => r.id !== deletedId));
        }}
      />

      <RepledgeInterestModal
        isOpen={!!interestModalRepledge}
        repledge={interestModalRepledge}
        onClose={() => setInterestModalRepledge(null)}
        onInterestUpdated={(updatedId, newTotal) => {
          setRepledges((prev) =>
            prev.map((r) => (r.id === updatedId ? { ...r, totalInterestPaid: newTotal } : r))
          );
          if (interestModalRepledge && interestModalRepledge.id === updatedId) {
            setInterestModalRepledge((prev) =>
              prev ? { ...prev, totalInterestPaid: newTotal } : null
            );
          }
        }}
      />

      <UndoRepledgeReleaseModal
        isOpen={!!undoModalRepledge}
        repledge={undoModalRepledge}
        onClose={() => setUndoModalRepledge(null)}
        onSuccess={(restoredId) => {
          setRepledges((prev) => prev.filter((r) => r.id !== restoredId));
        }}
      />
    </div>
  );
}

export default function ReleasedRepledgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <p className="text-sm text-slate-500 font-medium">Loading Released Re-Pledge Ledger...</p>
          </div>
        </div>
      }
    >
      <ReleasedRepledgePageInner />
    </Suspense>
  );
}
