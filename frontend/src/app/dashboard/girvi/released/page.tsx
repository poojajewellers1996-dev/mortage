"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pledge } from "@/types";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  EditModal,
  DeleteModal,
  UndoReleaseModal,
} from "@/components/girvi/PledgeActionModals";
import {
  Search,
  Eye,
  Printer,
  Sparkles,
  Coins,
  CheckCircle2,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Trash2,
  RotateCcw,
} from "lucide-react";

type SortField =
  | "pledgeNumber"
  | "customerName"
  | "pledgeDate"
  | "closedDate"
  | "weight"
  | "amount";

type SortDirection = "asc" | "desc";

function ReleasedGirviPageInner() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [metalFilter, setMetalFilter] = useState<"all" | "Gold" | "Silver">("all");

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("closedDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Action Modals State
  const [editModalPledge, setEditModalPledge] = useState<Pledge | null>(null);
  const [deleteModalPledge, setDeleteModalPledge] = useState<Pledge | null>(null);
  const [undoModalPledge, setUndoModalPledge] = useState<Pledge | null>(null);

  useEffect(() => {
    fetchReleasedPledges();
  }, [search, metalFilter]);

  const fetchReleasedPledges = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPledges({
        search: search.trim() || undefined,
        status: "closed",
        metalType: metalFilter !== "all" ? metalFilter : undefined,
        page: 1,
        limit: 5000, // Load all released records in one view
      });

      if (res.success) {
        setPledges(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load released pledges.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      if (field === "customerName" || field === "pledgeNumber") {
        setSortDirection("asc");
      } else {
        setSortDirection("desc");
      }
    }
  };

  // Client-side sorting over all released pledges
  const sortedPledges = useMemo(() => {
    return [...pledges].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "pledgeNumber": {
          comparison = (a.pledgeNumber || "").localeCompare(b.pledgeNumber || "", undefined, {
            numeric: true,
            sensitivity: "base",
          });
          break;
        }
        case "customerName": {
          const nameA = a.customer?.name || "";
          const nameB = b.customer?.name || "";
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case "pledgeDate": {
          const dateA = new Date(a.pledgeDate).getTime();
          const dateB = new Date(b.pledgeDate).getTime();
          comparison = dateA - dateB;
          break;
        }
        case "closedDate": {
          const dateA = a.closedDate ? new Date(a.closedDate).getTime() : 0;
          const dateB = b.closedDate ? new Date(b.closedDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case "weight": {
          const wtA = Number(a.totalNetWeight) || 0;
          const wtB = Number(b.totalNetWeight) || 0;
          comparison = wtA - wtB;
          break;
        }
        case "amount": {
          const amtA = Number(a.totalLoanAmount) || 0;
          const amtB = Number(b.totalLoanAmount) || 0;
          comparison = amtA - amtB;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [pledges, sortField, sortDirection]);

  const renderSortHeader = (label: string, field: SortField, align: "left" | "center" | "right" = "left") => {
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Released Girvi Ledger (छुड़ाई गई गिरवी)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Total {sortedPledges.length} redeemed jewellery pledges released back to customers • All-in-one sorted ledger
          </p>
        </div>

        <Link href="/dashboard/girvi">
          <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
            <span>Active Pledges</span>
          </Button>
        </Link>
      </div>

      {/* Metal Separation Tabs & Quick Sort */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Metal Tabs (Gold vs Silver) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setMetalFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              metalFilter === "all"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            All Released
          </button>

          <button
            type="button"
            onClick={() => setMetalFilter("Gold")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              metalFilter === "Gold"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm font-extrabold"
                : "text-amber-800 hover:text-amber-950 hover:bg-amber-100/50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-700" />
            <span>Released Gold (सोना)</span>
          </button>

          <button
            type="button"
            onClick={() => setMetalFilter("Silver")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              metalFilter === "Silver"
                ? "bg-slate-800 text-white shadow-sm font-extrabold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-300/50"
            }`}
          >
            <Coins className="h-3.5 w-3.5 text-slate-400" />
            <span>Released Silver (चांदी)</span>
          </button>
        </div>

        {/* Quick Sort Dropdown */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
          <ArrowUpDown className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[11px] font-bold text-slate-500 uppercase">Sort:</span>
          <select
            value={`${sortField}_${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split("_") as [SortField, SortDirection];
              setSortField(field);
              setSortDirection(dir);
            }}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="closedDate_desc">Release Date: Recent First (हाल में छुड़ाई)</option>
            <option value="closedDate_asc">Release Date: Oldest First (पहले छुड़ाई)</option>
            <option value="pledgeDate_desc">Pledge Date: Newest First</option>
            <option value="pledgeDate_asc">Pledge Date: Oldest First</option>
            <option value="amount_desc">Settled Loan: Highest First</option>
            <option value="amount_asc">Settled Loan: Lowest First</option>
            <option value="weight_desc">Weight: Heaviest First</option>
            <option value="weight_asc">Weight: Lightest First</option>
            <option value="customerName_asc">Customer Name (A → Z)</option>
            <option value="pledgeNumber_asc">Pledge # (A → Z)</option>
            <option value="pledgeNumber_desc">Pledge # (Z → A)</option>
          </select>
        </div>
      </div>

      {/* Filter and Instant Search Bar */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm p-3.5">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search released pledge # (e.g. C4678), customer name, mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 w-full text-xs"
          />
        </div>
      </Card>

      {/* All-In-One Released Pledges Table with Interactive Sorting & Actions */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[72vh] overflow-y-auto">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-slate-100/95 sticky top-0 z-10 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3">{renderSortHeader("Pledge #", "pledgeNumber")}</th>
                  <th className="px-4 py-3">{renderSortHeader("Customer Details", "customerName")}</th>
                  <th className="px-4 py-3 text-center">Metal</th>
                  <th className="px-4 py-3">{renderSortHeader("Pledge Date", "pledgeDate")}</th>
                  <th className="px-4 py-3">{renderSortHeader("Release Date", "closedDate")}</th>
                  <th className="px-4 py-3 text-right">{renderSortHeader("Items / Net Wt", "weight", "right")}</th>
                  <th className="px-4 py-3 text-right">{renderSortHeader("Settled Loan", "amount", "right")}</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right min-w-[200px]">Actions (कार्रवाई)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                        <span>Loading released pledge archives...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedPledges.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No released pledges found matching your filters.
                    </td>
                  </tr>
                ) : (
                  sortedPledges.map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {p.pledgeNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.customer?.name}</div>
                        <div className="text-xs text-slate-500">{p.customer?.mobileNumber || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.metalType === "Silver" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800 border border-slate-300">
                            🥈 Silver
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            🪙 Gold
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {new Date(p.pledgeDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-emerald-800 text-xs font-semibold">
                        {p.closedDate
                          ? new Date(p.closedDate).toLocaleDateString("en-IN")
                          : "Redeemed"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium text-slate-800">{p.totalArticlesCount} pcs</div>
                        <div
                          className={`text-xs font-bold ${
                            p.metalType === "Silver" ? "text-slate-700" : "text-amber-800"
                          }`}
                        >
                          {formatWeight(p.totalNetWeight)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {formatIndianCurrency(p.totalLoanAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="success" className="bg-emerald-600 text-white font-bold">
                          Released
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* UNDO RELEASE BUTTON */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUndoModalPledge(p)}
                            className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition-colors gap-1 font-semibold"
                            title="Undo Release / Re-open Girvi (छुड़ाई वापस लें / री-ओपन)"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                            <span className="hidden sm:inline">Undo</span>
                          </Button>

                          {/* EDIT BUTTON */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditModalPledge(p)}
                            className="h-7 px-2 text-xs text-amber-800 hover:bg-amber-100/60 hover:text-amber-950 transition-colors gap-1"
                            title="Edit Details (संशोधन)"
                          >
                            <Edit className="h-3.5 w-3.5 text-amber-700" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>

                          {/* VIEW BUTTON */}
                          <Link href={`/dashboard/girvi/${p.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100 gap-1"
                              title="View Details (देखें)"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>

                          {/* RECEIPT BUTTON */}
                          <Link href={`/dashboard/girvi/${p.id}/receipt`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-1.5 text-xs text-amber-700 hover:bg-amber-50"
                              title="Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5 text-amber-600" />
                            </Button>
                          </Link>

                          {/* DELETE BUTTON */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteModalPledge(p)}
                            className="h-7 px-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title="Delete Record (हटाएं)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer (No pagination!) */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                Showing all {sortedPledges.length} released pledges
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">All-in-one sorted release archive</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Sorted by:{" "}
              <span className="font-semibold text-slate-700">
                {sortField} ({sortDirection.toUpperCase()})
              </span>
              {metalFilter !== "all" ? ` • ${metalFilter} only` : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ACTION MODALS */}
      <EditModal
        isOpen={!!editModalPledge}
        pledge={editModalPledge}
        onClose={() => setEditModalPledge(null)}
        onSuccess={(updatedPledge) => {
          setPledges((prev) =>
            prev.map((p) => (p.id === updatedPledge.id ? { ...p, ...updatedPledge } : p))
          );
        }}
      />

      <DeleteModal
        isOpen={!!deleteModalPledge}
        pledge={deleteModalPledge}
        onClose={() => setDeleteModalPledge(null)}
        onSuccess={(deletedId) => {
          setPledges((prev) => prev.filter((p) => p.id !== deletedId));
        }}
      />

      <UndoReleaseModal
        isOpen={!!undoModalPledge}
        pledge={undoModalPledge}
        onClose={() => setUndoModalPledge(null)}
        onSuccess={(restoredId) => {
          setPledges((prev) => prev.filter((p) => p.id !== restoredId));
        }}
      />
    </div>
  );
}

export default function ReleasedGirviPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <p className="text-sm text-slate-500 font-medium">Loading Released Girvi Ledger...</p>
          </div>
        </div>
      }
    >
      <ReleasedGirviPageInner />
    </Suspense>
  );
}
