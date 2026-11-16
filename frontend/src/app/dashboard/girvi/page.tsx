"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Pledge, PledgeStatus } from "@/types";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Search,
  PlusCircle,
  Eye,
  Printer,
  Sparkles,
  Coins,
  CheckCircle2,
  Vault,
  Layers,
} from "lucide-react";

function GirviListPageInner() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status");

  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatusParam === "closed" || initialStatusParam === "released"
      ? "closed"
      : initialStatusParam === "active"
      ? "active"
      : "all"
  );
  const [metalFilter, setMetalFilter] = useState<"all" | "Gold" | "Silver">("all");

  useEffect(() => {
    fetchPledges();
  }, [search, statusFilter, metalFilter]);

  const fetchPledges = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPledges({
        search: search.trim() || undefined,
        status: statusFilter,
        metalType: metalFilter !== "all" ? metalFilter : undefined,
        page: 1,
        limit: 5000, // Load all pledges in one view (no 38-page pagination)
      });

      if (res.success) {
        setPledges(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load pledges.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: PledgeStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-[#0F1E36]">Active in Vault</Badge>;
      case "due_soon":
        return <Badge variant="warning">Due Soon</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "closed":
        return <Badge variant="success" className="bg-emerald-600 text-white font-bold">Released</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
              <Vault className="h-4 w-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              All Girvi Pledges Ledger (गिरवी खाता)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete jewellery pawn ledger • Total {pledges.length} pledges loaded in all-in-one view
          </p>
        </div>

        <Link href="/dashboard/girvi/new">
          <Button variant="gold" size="sm" className="gap-2 font-semibold shadow-sm text-xs">
            <PlusCircle className="h-4 w-4" />
            New Girvi Entry
          </Button>
        </Link>
      </div>

      {/* Filter Bars (All-in-One: Status & Metal Tabs) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs (All vs Active vs Released) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-slate-600" />
            <span>All Pledges (सभी)</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "active"
                ? "bg-[#0F1E36] text-white shadow-sm font-extrabold"
                : "text-slate-700 hover:text-slate-950"
            }`}
          >
            <Vault className="h-3.5 w-3.5 text-amber-400" />
            <span>Active in Vault (चालू)</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("closed")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "closed"
                ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                : "text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/40"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            <span>Released / Closed (छुड़ाई गई)</span>
          </button>
        </div>

        {/* Metal Separation Tabs (Gold vs Silver) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setMetalFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              metalFilter === "all"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            All Metals
          </button>

          <button
            type="button"
            onClick={() => setMetalFilter("Gold")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              metalFilter === "Gold"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm font-extrabold"
                : "text-amber-800 hover:text-amber-950 hover:bg-amber-100/50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-700" />
            <span>Gold (सोना)</span>
          </button>

          <button
            type="button"
            onClick={() => setMetalFilter("Silver")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              metalFilter === "Silver"
                ? "bg-slate-800 text-white shadow-sm font-extrabold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-300/50"
            }`}
          >
            <Coins className="h-3.5 w-3.5 text-slate-400" />
            <span>Silver (चांदी)</span>
          </button>
        </div>
      </div>

      {/* Filter and Instant Search Bar */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search pledge # (e.g. C4682), customer name, mobile number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 w-full"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
              {pledges.length} Pledges Loaded
            </span>
          </div>
        </div>
      </Card>

      {/* All-In-One Pledges Table */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[72vh] overflow-y-auto">
            <table className="w-full text-left text-sm relative">
              <thead className="bg-slate-100/95 sticky top-0 z-10 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3">Pledge #</th>
                  <th className="px-4 py-3">Customer Details</th>
                  <th className="px-4 py-3 text-center">Metal</th>
                  <th className="px-4 py-3">Pledge Date</th>
                  <th className="px-4 py-3">Due / Released</th>
                  <th className="px-4 py-3 text-right">Items / Net Wt</th>
                  <th className="px-4 py-3 text-right">Loan Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                        <span>Loading all pledge records...</span>
                      </div>
                    </td>
                  </tr>
                ) : pledges.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No pledges found matching your filters.
                    </td>
                  </tr>
                ) : (
                  pledges.map((p) => {
                    const isClosed = p.status === "closed" || !!p.closedDate;
                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isClosed ? "hover:bg-emerald-50/20 bg-slate-50/30" : "hover:bg-amber-50/20"
                        }`}
                      >
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
                        <td className="px-4 py-3 text-xs">
                          {isClosed ? (
                            <span className="text-emerald-800 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              {p.closedDate
                                ? new Date(p.closedDate).toLocaleDateString("en-IN")
                                : "Released"}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">
                              {new Date(p.dueDate).toLocaleDateString("en-IN")}
                            </span>
                          )}
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
                        <td className="px-4 py-3 text-right font-black text-emerald-800">
                          {formatIndianCurrency(p.totalLoanAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(p.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/dashboard/girvi/${p.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>
                            </Link>
                            <Link href={`/dashboard/girvi/${p.id}/receipt`}>
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-1">
                                <Printer className="h-3.5 w-3.5 text-amber-600" />
                                Receipt
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* All-in-One Footer (No 38-page pagination!) */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                Showing all {pledges.length} records
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">All-in-one continuous ledger view</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {statusFilter === "active"
                ? "Filtering: Active in Vault (चालू)"
                : statusFilter === "closed"
                ? "Filtering: Released / Redeemed (छुड़ाई गई)"
                : "Displaying All Pledges"}
              {metalFilter !== "all" ? ` • ${metalFilter} only` : ""}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GirviListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
            <p className="text-sm text-slate-500 font-medium">Loading Girvi Ledger...</p>
          </div>
        </div>
      }
    >
      <GirviListPageInner />
    </Suspense>
  );
}
