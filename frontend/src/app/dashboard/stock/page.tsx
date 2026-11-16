"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Boxes,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  Circle,
  Scale,
  Coins,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Info,
  Calendar,
  Phone,
  User,
} from "lucide-react";

type MetalTab = "gold" | "silver" | "all";
type BoxPreset = "ALL" | "1-2000" | "2001-3000" | "3001-4000" | "4001-5000" | "5001-6000" | "CUSTOM";
type AuditFilter = "all" | "checked" | "unchecked";

// Extract integer numeric digits from pledge numbers like "C4767", "4767", "G-102"
function extractPledgeNumber(pledgeNum?: string | null): number | null {
  if (!pledgeNum) return null;
  const digitsOnly = pledgeNum.replace(/\D/g, "");
  if (!digitsOnly) return null;
  const val = parseInt(digitsOnly, 10);
  return isNaN(val) ? null : val;
}

export default function LockerStockPage() {
  const [stockData, setStockData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<MetalTab>("gold");
  const [searchQuery, setSearchQuery] = useState("");
  const [boxPreset, setBoxPreset] = useState<BoxPreset>("ALL");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("all");

  // Physical Audit Checked Items (stored per pledge id)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Sorting
  const [sortField, setSortField] = useState<"pledgeNumber" | "pledgeDate" | "netWeight" | "loanAmount">("pledgeNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch stock from API
  const fetchStock = async () => {
    setIsLoading(true);
    try {
      const res = await api.getLockerStock();
      if (res.success) {
        setStockData(res.data || []);
        setSummary(res.summary || null);
      } else {
        toast.error("Failed to load locker stock");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load locker stock");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // Handle Box Range extraction
  const boxRange = useMemo<{ from: number | null; to: number | null }>(() => {
    if (boxPreset === "ALL") return { from: null, to: null };
    if (boxPreset === "1-2000") return { from: 1, to: 2000 };
    if (boxPreset === "2001-3000") return { from: 2001, to: 3000 };
    if (boxPreset === "3001-4000") return { from: 3001, to: 4000 };
    if (boxPreset === "4001-5000") return { from: 4001, to: 5000 };
    if (boxPreset === "5001-6000") return { from: 5001, to: 6000 };
    if (boxPreset === "CUSTOM") {
      const f = customFrom ? parseInt(customFrom, 10) : null;
      const t = customTo ? parseInt(customTo, 10) : null;
      return {
        from: isNaN(f as number) ? null : f,
        to: isNaN(t as number) ? null : t,
      };
    }
    return { from: null, to: null };
  }, [boxPreset, customFrom, customTo]);

  // Filtered and Sorted Stock
  const filteredStock = useMemo(() => {
    return stockData.filter((item) => {
      // 1. Metal Filter
      if (activeTab === "gold") {
        if (item.metalType === "Silver") return false;
      } else if (activeTab === "silver") {
        if (item.metalType !== "Silver") return false;
      }

      // 2. Box Range Filter
      if (boxRange.from !== null || boxRange.to !== null) {
        const num = extractPledgeNumber(item.pledgeNumber);
        if (num === null) {
          // If no numeric digits, do not match numerical range filter
          return false;
        }
        if (boxRange.from !== null && num < boxRange.from) return false;
        if (boxRange.to !== null && num > boxRange.to) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pledgeNo = (item.pledgeNumber || "").toLowerCase();
        const custName = (item.customer?.name || "").toLowerCase();
        const custMobile = (item.customer?.mobileNumber || "").toLowerCase();
        const articleDesc = (item.articles || [])
          .map((a: any) => (a.articleName || "").toLowerCase())
          .join(" ");

        if (
          !pledgeNo.includes(q) &&
          !custName.includes(q) &&
          !custMobile.includes(q) &&
          !articleDesc.includes(q)
        ) {
          return false;
        }
      }

      // 4. Physical Audit Check status filter
      const isChecked = checkedIds.has(item.id);
      if (auditFilter === "checked" && !isChecked) return false;
      if (auditFilter === "unchecked" && isChecked) return false;

      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === "pledgeNumber") {
        const numA = extractPledgeNumber(a.pledgeNumber) || 0;
        const numB = extractPledgeNumber(b.pledgeNumber) || 0;
        comp = numA - numB;
      } else if (sortField === "pledgeDate") {
        comp = new Date(a.pledgeDate || a.createdAt).getTime() - new Date(b.pledgeDate || b.createdAt).getTime();
      } else if (sortField === "netWeight") {
        comp = parseFloat(a.totalNetWeight || "0") - parseFloat(b.totalNetWeight || "0");
      } else if (sortField === "loanAmount") {
        comp = parseFloat(a.totalLoanAmount || "0") - parseFloat(b.totalLoanAmount || "0");
      }
      return sortOrder === "asc" ? comp : -comp;
    });
  }, [stockData, activeTab, boxRange, searchQuery, auditFilter, checkedIds, sortField, sortOrder]);

  // Dynamic statistics for the current filtered view
  const currentViewStats = useMemo(() => {
    let pledgesCount = filteredStock.length;
    let articlesCount = 0;
    let totalGross = 0;
    let totalNet = 0;
    let totalLoan = 0;

    for (const item of filteredStock) {
      articlesCount += item.totalArticlesCount || (item.articles?.length || 1);
      totalGross += parseFloat(item.totalGrossWeight || "0");
      totalNet += parseFloat(item.totalNetWeight || "0");
      totalLoan += parseFloat(item.totalLoanAmount || "0");
    }

    return {
      pledgesCount,
      articlesCount,
      totalGross: totalGross.toFixed(3),
      totalNet: totalNet.toFixed(3),
      totalLoan,
    };
  }, [filteredStock]);

  // Audit Checklist Helpers
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const checkAllVisible = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      filteredStock.forEach((item) => next.add(item.id));
      return next;
    });
    toast.success(`Marked ${filteredStock.length} items as verified`);
  };

  const clearCheckedVisible = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      filteredStock.forEach((item) => next.delete(item.id));
      return next;
    });
    toast.info("Cleared audit check for current view");
  };

  const verifiedInViewCount = useMemo(() => {
    return filteredStock.filter((item) => checkedIds.has(item.id)).length;
  }, [filteredStock, checkedIds]);

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 print:hidden">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Physical Locker Stock Audit
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-normal">
                  तिजोरी स्टॉक जांच
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Auditing items physically in the vault. Excludes Bank Re-pledges and Released pledges.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStock}
            disabled={isLoading}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Stock Sheet
          </Button>
        </div>
      </div>

      {/* Exclusions Notice Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-200 flex items-start gap-3 print:hidden">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-emerald-300">Clean Vault Inventory Filter Applied:</span>
          {" "}All items shown below are verified to be <strong>physically present in your shop's vault</strong>. 
          Pledges currently <strong>re-pledged in banks</strong> (Kosamattam, Muthoot, BOB, SBI, etc.) or <strong>already released/settled</strong> are strictly excluded from this audit.
        </div>
      </div>

      {/* Metal Selection Tabs (Gold vs Silver vs All) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 print:hidden">
        <div className="flex items-center gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("gold")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "gold"
                ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/60"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>🪙 Gold Vault Stock (सोना)</span>
            {summary?.gold?.pledgesCount !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "gold" ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-800 text-amber-400"}`}>
                {summary.gold.pledgesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("silver")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "silver"
                ? "bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 shadow-md shadow-slate-400/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>🥈 Silver Vault Stock (चांदी)</span>
            {summary?.silver?.pledgesCount !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "silver" ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-800 text-slate-300"}`}>
                {summary.silver.pledgesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "all"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Items</span>
          </button>
        </div>

        {/* Audit Progress in current view */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
          <div className="text-xs text-slate-400">
            Audit Checklist: <span className="font-semibold text-white">{verifiedInViewCount}</span> / {filteredStock.length} verified
          </div>
          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${filteredStock.length > 0 ? (verifiedInViewCount / filteredStock.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={checkAllVisible}
              className="text-xs text-emerald-400 hover:underline px-1 py-0.5"
              title="Mark all visible items as verified"
            >
              Check All
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={clearCheckedVisible}
              className="text-xs text-slate-400 hover:underline px-1 py-0.5"
              title="Uncheck all visible items"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Box Range Selector Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Locker Box Range Filter</span>
              <span className="text-xs text-slate-400 ml-2">(तिजोरी बॉक्स नंबर अनुसार जांच)</span>
            </div>
          </div>

          {/* Quick Box Range Preset Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All Boxes" },
              { id: "1-2000", label: "Box 1 - 2000" },
              { id: "2001-3000", label: "Box 2001 - 3000" },
              { id: "3001-4000", label: "Box 3001 - 4000" },
              { id: "4001-5000", label: "Box 4001 - 5000" },
              { id: "5001-6000", label: "Box 5001 - 6000" },
              { id: "CUSTOM", label: "Custom Range..." },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setBoxPreset(preset.id as BoxPreset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  boxPreset === preset.id
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Inputs (if CUSTOM or always available as fine tune) */}
        {boxPreset === "CUSTOM" && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <span className="text-xs text-amber-400 font-medium">Custom Box Range:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">From #</span>
              <Input
                type="number"
                placeholder="e.g. 1"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-28 h-8 text-xs bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">To #</span>
              <Input
                type="number"
                placeholder="e.g. 2500"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-28 h-8 text-xs bg-slate-800 border-slate-700 text-white"
              />
            </div>
            {(customFrom || customTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                }}
                className="h-8 text-xs text-slate-400 hover:text-white"
              >
                Reset Range
              </Button>
            )}
          </div>
        )}
      </div>

      {/* KPI Summary Cards for Currently Active Filtered View */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-400">Pledges in Box</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {currentViewStats.pledgesCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Active packets in safe</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-400">Total Articles / Pcs</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">
              {currentViewStats.articlesCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Physical ornaments</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-400">Gross Weight</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {currentViewStats.totalGross} <span className="text-xs font-normal">g</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Total with stones/thread</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-400">Net Metal Weight</div>
            <div className="text-2xl font-bold text-yellow-400 mt-1">
              {currentViewStats.totalNet} <span className="text-xs font-normal">g</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Pure bullion weight</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-slate-400">Locker Loan Value</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {formatIndianCurrency(currentViewStats.totalLoan)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Principal in vault</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Audit Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search pledge #, customer, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-white text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setAuditFilter("all")}
              className={`px-2.5 py-1 rounded ${
                auditFilter === "all" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              All Items ({filteredStock.length})
            </button>
            <button
              onClick={() => setAuditFilter("unchecked")}
              className={`px-2.5 py-1 rounded ${
                auditFilter === "unchecked" ? "bg-amber-500/20 text-amber-300 font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Pending ({filteredStock.length - verifiedInViewCount})
            </button>
            <button
              onClick={() => setAuditFilter("checked")}
              className={`px-2.5 py-1 rounded ${
                auditFilter === "checked" ? "bg-emerald-500/20 text-emerald-300 font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Verified ({verifiedInViewCount})
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs text-slate-400">
            <span className="px-1 text-[11px]">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
            >
              <option value="pledgeNumber" className="bg-slate-900 text-white">Pledge #</option>
              <option value="pledgeDate" className="bg-slate-900 text-white">Date</option>
              <option value="netWeight" className="bg-slate-900 text-white">Net Weight</option>
              <option value="loanAmount" className="bg-slate-900 text-white">Loan Amount</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-1 hover:text-white"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Physical Audit Stock Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        {/* Printable Header Info (only visible when printing) */}
        <div className="hidden print:block p-4 border-b border-black text-black">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Locker Stock Audit Sheet</h2>
              <div className="text-xs">
                Category: <strong>{activeTab.toUpperCase()} VAULT</strong> | 
                Box Range: <strong>{boxPreset === "CUSTOM" ? `${customFrom || "0"} - ${customTo || "∞"}` : boxPreset}</strong>
              </div>
            </div>
            <div className="text-right text-xs">
              <div>Date: {new Date().toLocaleDateString("en-IN")}</div>
              <div>Total Pledges: {currentViewStats.pledgesCount} | Total Net: {currentViewStats.totalNet}g</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center print:w-8">Audit</th>
                <th className="py-3 px-4">Pledge #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Pledge Date</th>
                <th className="py-3 px-4">Articles / Ornaments</th>
                <th className="py-3 px-4 text-right">Gross Wt</th>
                <th className="py-3 px-4 text-right">Net Wt</th>
                <th className="py-3 px-4 text-right">Loan (₹)</th>
                <th className="py-3 px-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Scanning locker stock...
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    No active items found in the vault matching the selected box range and filters.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => {
                  const isChecked = checkedIds.has(item.id);
                  const articles = item.articles || [];
                  const isSilver = item.metalType === "Silver";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`cursor-pointer transition-colors group ${
                        isChecked
                          ? "bg-emerald-950/15 hover:bg-emerald-950/25"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Audit Checkbox */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleCheck(item.id)}
                          className="focus:outline-none transition-transform active:scale-90"
                        >
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Pledge Number */}
                      <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={isSilver ? "text-slate-300" : "text-amber-400"}>
                            {item.pledgeNumber}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${
                              isSilver
                                ? "bg-slate-800 text-slate-300 border border-slate-700"
                                : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            }`}
                          >
                            {isSilver ? "SILVER" : "GOLD"}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 text-slate-200">
                        <div className="font-medium text-slate-100">{item.customer?.name || "—"}</div>
                        {item.customer?.mobileNumber && (
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {item.customer.mobileNumber}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-xs">
                        {item.pledgeDate
                          ? new Date(item.pledgeDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Articles description */}
                      <td className="py-3 px-4 text-slate-300">
                        {articles.length > 0 ? (
                          <div className="space-y-1">
                            {articles.map((art: any, idx: number) => (
                              <div key={idx} className="text-xs flex items-center gap-2">
                                <span className="font-medium text-white">{art.articleName}</span>
                                <span className="text-slate-400">× {art.quantity || 1}</span>
                                {art.netWeight && (
                                  <span className="text-slate-500 text-[11px]">({art.netWeight}g)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {item.totalArticlesCount || 1} Item(s)
                          </span>
                        )}
                      </td>

                      {/* Gross Weight */}
                      <td className="py-3 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                        {parseFloat(item.totalGrossWeight || "0").toFixed(3)} g
                      </td>

                      {/* Net Weight */}
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={isSilver ? "text-slate-200" : "text-amber-300"}>
                          {parseFloat(item.totalNetWeight || "0").toFixed(3)} g
                        </span>
                      </td>

                      {/* Loan Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-white whitespace-nowrap">
                        {formatIndianCurrency(parseFloat(item.totalLoanAmount || "0"))}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/girvi/${item.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 hover:underline px-2 py-1 rounded bg-slate-800/60"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
