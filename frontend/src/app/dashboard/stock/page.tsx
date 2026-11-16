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
  Check,
  Bookmark,
} from "lucide-react";

type MetalTab = "gold" | "silver" | "all";
type BoxPreset =
  | "ALL"
  | "1-2000"
  | "2001-3000"
  | "3001-4000"
  | "4001-5000"
  | "5001-6000"
  | "7001-8000"
  | "8001-9000"
  | "9001-10000"
  | "CUSTOM";
type AuditFilter = "all" | "checked" | "unchecked";

// Parse pledge numbers like "B7289", "C4256", "C-100", "7289" into prefix and integer number
function parsePledgeId(pledgeNum?: string | null): { prefix: string; num: number | null } {
  if (!pledgeNum) return { prefix: "", num: null };
  const trimmed = pledgeNum.trim();
  const match = trimmed.match(/^([A-Za-z]+)?\s*[-/]?\s*(\d+)/);
  if (!match) {
    const digitsOnly = trimmed.replace(/\D/g, "");
    const alphaOnly = trimmed.replace(/[^A-Za-z]/g, "").toUpperCase();
    return {
      prefix: alphaOnly,
      num: digitsOnly ? parseInt(digitsOnly, 10) : null,
    };
  }
  return {
    prefix: (match[1] || "").toUpperCase(),
    num: match[2] ? parseInt(match[2], 10) : null,
  };
}

export default function LockerStockPage() {
  const [stockData, setStockData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<MetalTab>("gold");
  const [selectedSeries, setSelectedSeries] = useState<string>("ALL");
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

  // Dynamically extract all available series/letter prefixes from active stock
  const availableSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of stockData) {
      const { prefix } = parsePledgeId(item.pledgeNumber);
      const key = prefix || "Others";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [stockData]);

  // Determine preset box pills based on the currently selected series
  const relevantPresets = useMemo<{ id: BoxPreset; label: string }[]>(() => {
    if (selectedSeries === "B") {
      return [
        { id: "ALL", label: "All B Boxes" },
        { id: "7001-8000", label: "B 7001 - 8000" },
        { id: "8001-9000", label: "B 8001 - 9000" },
        { id: "9001-10000", label: "B 9001 - 10000" },
        { id: "CUSTOM", label: "Custom Range..." },
      ];
    }
    if (selectedSeries === "C") {
      return [
        { id: "ALL", label: "All C Boxes" },
        { id: "1-2000", label: "C 1 - 2000" },
        { id: "2001-3000", label: "C 2001 - 3000" },
        { id: "3001-4000", label: "C 3001 - 4000" },
        { id: "4001-5000", label: "C 4001 - 5000" },
        { id: "5001-6000", label: "C 5001 - 6000" },
        { id: "CUSTOM", label: "Custom Range..." },
      ];
    }
    // Overall / All Series
    return [
      { id: "ALL", label: "All Boxes" },
      { id: "1-2000", label: "Box 1 - 2000" },
      { id: "2001-3000", label: "Box 2001 - 3000" },
      { id: "3001-4000", label: "Box 3001 - 4000" },
      { id: "4001-5000", label: "Box 4001 - 5000" },
      { id: "5001-6000", label: "Box 5001 - 6000" },
      { id: "7001-8000", label: "Box 7001 - 8000" },
      { id: "8001-9000", label: "Box 8001 - 9000" },
      { id: "CUSTOM", label: "Custom Range..." },
    ];
  }, [selectedSeries]);

  // Filtered and Sorted Stock
  const filteredStock = useMemo(() => {
    return stockData
      .filter((item) => {
        // 1. Metal Filter
        if (activeTab === "gold") {
          if (item.metalType === "Silver") return false;
        } else if (activeTab === "silver") {
          if (item.metalType !== "Silver") return false;
        }

        const itemParsed = parsePledgeId(item.pledgeNumber);

        // 2. Series / Alphabet Prefix Filter
        if (selectedSeries !== "ALL") {
          if (itemParsed.prefix !== selectedSeries) {
            return false;
          }
        }

        // 3. Box Range Filter (Presets & Custom)
        if (boxPreset === "1-2000") {
          if (itemParsed.num === null || itemParsed.num < 1 || itemParsed.num > 2000) return false;
        } else if (boxPreset === "2001-3000") {
          if (itemParsed.num === null || itemParsed.num < 2001 || itemParsed.num > 3000) return false;
        } else if (boxPreset === "3001-4000") {
          if (itemParsed.num === null || itemParsed.num < 3001 || itemParsed.num > 4000) return false;
        } else if (boxPreset === "4001-5000") {
          if (itemParsed.num === null || itemParsed.num < 4001 || itemParsed.num > 5000) return false;
        } else if (boxPreset === "5001-6000") {
          if (itemParsed.num === null || itemParsed.num < 5001 || itemParsed.num > 6000) return false;
        } else if (boxPreset === "7001-8000") {
          if (itemParsed.num === null || itemParsed.num < 7001 || itemParsed.num > 8000) return false;
        } else if (boxPreset === "8001-9000") {
          if (itemParsed.num === null || itemParsed.num < 8001 || itemParsed.num > 9000) return false;
        } else if (boxPreset === "9001-10000") {
          if (itemParsed.num === null || itemParsed.num < 9001 || itemParsed.num > 10000) return false;
        } else if (boxPreset === "CUSTOM") {
          const fromParsed = parsePledgeId(customFrom);
          const toParsed = parsePledgeId(customTo);

          // If the user typed an alphabet prefix in custom input (e.g. "B" or "C")
          const inputPrefix = fromParsed.prefix || toParsed.prefix;
          if (inputPrefix && itemParsed.prefix !== inputPrefix) {
            return false;
          }

          if (fromParsed.num !== null && (itemParsed.num === null || itemParsed.num < fromParsed.num)) {
            return false;
          }
          if (toParsed.num !== null && (itemParsed.num === null || itemParsed.num > toParsed.num)) {
            return false;
          }
        }

        // 4. Search query
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

        // 5. Physical Audit Check status filter
        const isChecked = checkedIds.has(item.id);
        if (auditFilter === "checked" && !isChecked) return false;
        if (auditFilter === "unchecked" && isChecked) return false;

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === "pledgeNumber") {
          const pA = parsePledgeId(a.pledgeNumber);
          const pB = parsePledgeId(b.pledgeNumber);
          if (pA.prefix !== pB.prefix) {
            comp = pA.prefix.localeCompare(pB.prefix);
          } else {
            comp = (pA.num || 0) - (pB.num || 0);
          }
        } else if (sortField === "pledgeDate") {
          comp =
            new Date(a.pledgeDate || a.createdAt).getTime() -
            new Date(b.pledgeDate || b.createdAt).getTime();
        } else if (sortField === "netWeight") {
          comp =
            parseFloat(a.totalNetWeight || "0") -
            parseFloat(b.totalNetWeight || "0");
        } else if (sortField === "loanAmount") {
          comp =
            parseFloat(a.totalLoanAmount || "0") -
            parseFloat(b.totalLoanAmount || "0");
        }
        return sortOrder === "asc" ? comp : -comp;
      });
  }, [
    stockData,
    activeTab,
    selectedSeries,
    boxPreset,
    customFrom,
    customTo,
    searchQuery,
    auditFilter,
    checkedIds,
    sortField,
    sortOrder,
  ]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 shadow-xs print:hidden">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Physical Locker Stock Audit
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold">
                  तिजोरी स्टॉक जांच
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Auditing items physically present in the vault. Excludes Bank Re-pledges and Released pledges.
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
            className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100 font-semibold shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-700" />
            Print Stock Sheet
          </Button>
        </div>
      </div>

      {/* Exclusions Notice Banner */}
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 sm:p-4 text-xs sm:text-sm text-emerald-950 flex items-start gap-3 print:hidden shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-emerald-900 font-bold">Clean Vault Inventory Filter Applied:</strong>
          {" "}All items shown below are verified to be <strong>physically present in your shop's vault</strong>. 
          Pledges currently <strong>re-pledged in banks</strong> (Kosamattam, Muthoot, BOB, SBI, etc.) or <strong>already released/settled</strong> are strictly excluded from this audit.
        </div>
      </div>

      {/* Metal Separation Tabs & Audit Progress */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        {/* Metal Tabs (Gold vs Silver vs All) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("gold")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "gold"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm font-extrabold"
                : "text-amber-900 hover:text-amber-950 hover:bg-amber-100/50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-900" />
            <span>🪙 Gold Vault Stock (सोना)</span>
            {summary?.gold?.pledgesCount !== undefined && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "gold" ? "bg-slate-950/20 text-slate-950" : "bg-amber-200/80 text-amber-950"
              }`}>
                {summary.gold.pledgesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("silver")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "silver"
                ? "bg-slate-800 text-white shadow-sm font-extrabold"
                : "text-slate-700 hover:text-slate-950 hover:bg-slate-300/50"
            }`}
          >
            <Scale className="h-3.5 w-3.5 text-slate-400" />
            <span>🥈 Silver Vault Stock (चांदी)</span>
            {summary?.silver?.pledgesCount !== undefined && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "silver" ? "bg-white/20 text-white" : "bg-slate-300 text-slate-800"
              }`}>
                {summary.silver.pledgesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-slate-950 shadow-sm font-extrabold"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Items</span>
            {summary?.overall?.pledgesCount !== undefined && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === "all" ? "bg-slate-200 text-slate-950" : "bg-slate-300/80 text-slate-700"
              }`}>
                {summary.overall.pledgesCount}
              </span>
            )}
          </button>
        </div>

        {/* Audit Checklist Progress Tracker */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs">
          <div className="text-xs text-slate-600">
            Audit Checklist: <span className="font-bold text-slate-900">{verifiedInViewCount}</span> / {filteredStock.length} verified
          </div>
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${
                  filteredStock.length > 0
                    ? (verifiedInViewCount / filteredStock.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={checkAllVisible}
              className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline px-1 py-0.5 cursor-pointer"
              title="Mark all visible items as verified"
            >
              Check All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={clearCheckedVisible}
              className="text-slate-500 hover:text-slate-800 font-medium hover:underline px-1 py-0.5 cursor-pointer"
              title="Uncheck all visible items"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Locker Box Range Selector Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3.5 shadow-sm print:hidden">
        {/* Row 1: Series / Alphabet Prefix Selector (B, C, etc.) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pledge Book / Series (सीरीज़ अक्षर):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedSeries("ALL");
                setBoxPreset("ALL");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedSeries === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Series (सभी)
            </button>

            {availableSeries.map(([seriesKey, count]) => (
              <button
                key={seriesKey}
                type="button"
                onClick={() => {
                  setSelectedSeries(seriesKey);
                  setBoxPreset("ALL");
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedSeries === seriesKey
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <span>Series {seriesKey}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSeries === seriesKey ? "bg-white/20 text-white" : "bg-amber-200/80 text-amber-950 font-bold"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Box Range Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-700">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">
                {selectedSeries !== "ALL" ? `Series ${selectedSeries} Box Filter` : "Locker Box Range Filter"}
              </span>
              <span className="text-xs text-slate-500 ml-2 font-medium">(तिजोरी बॉक्स नंबर अनुसार जांच)</span>
            </div>
          </div>

          {/* Preset Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {relevantPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setBoxPreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  boxPreset === preset.id
                    ? "bg-amber-600 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Custom Range Inputs (Accepts full strings like B7000 or 1) */}
        {boxPreset === "CUSTOM" && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <span className="text-xs text-amber-900 font-bold">Custom Range (अक्षर सहित नंबर):</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">From</span>
              <Input
                type="text"
                placeholder="e.g. B7000, C4001, 1"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value.toUpperCase())}
                className="w-36 h-8 text-xs bg-white border-slate-300 text-slate-900 font-semibold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">To</span>
              <Input
                type="text"
                placeholder="e.g. B8000, C5000, 2500"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value.toUpperCase())}
                className="w-36 h-8 text-xs bg-white border-slate-300 text-slate-900 font-semibold"
              />
            </div>
            <span className="text-[11px] text-slate-500 italic">
              💡 Supports alphabet prefixes like B7289, C4256 or numbers like 1 - 2000
            </span>
            {(customFrom || customTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Reset Range
              </Button>
            )}
          </div>
        )}
      </div>

      {/* KPI Summary Cards for Currently Active Filtered View */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pledges in Box</span>
              <Boxes className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-950">
              {currentViewStats.pledgesCount}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">
              {selectedSeries !== "ALL" ? `Series ${selectedSeries} packets` : "Active packets in safe"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Articles / Pcs</span>
              <Package className="h-4 w-4 text-sky-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {currentViewStats.articlesCount}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Physical ornaments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gross Weight</span>
              <Scale className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-900">
              {currentViewStats.totalGross} <span className="text-xs font-normal text-slate-500">g</span>
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Total with stones/thread</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Net Metal Weight</span>
              <Coins className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-800">
              {currentViewStats.totalNet} <span className="text-xs font-normal text-slate-500">g</span>
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Pure bullion weight</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-white to-amber-50/50 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Locker Loan Value</span>
              <Coins className="h-4 w-4 text-amber-700" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-950">
              {formatIndianCurrency(currentViewStats.totalLoan)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Principal in vault</p>
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
            className="pl-9 bg-white border-slate-300 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-xs">
            <button
              onClick={() => setAuditFilter("all")}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                auditFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Items ({filteredStock.length})
            </button>
            <button
              onClick={() => setAuditFilter("unchecked")}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                auditFilter === "unchecked"
                  ? "bg-amber-100 text-amber-900 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({filteredStock.length - verifiedInViewCount})
            </button>
            <button
              onClick={() => setAuditFilter("checked")}
              className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                auditFilter === "checked"
                  ? "bg-emerald-100 text-emerald-900 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Verified ({verifiedInViewCount})
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600 shadow-xs">
            <span className="text-[11px] font-medium">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="pledgeNumber">Pledge # (Letter & No)</option>
              <option value="pledgeDate">Date</option>
              <option value="netWeight">Net Weight</option>
              <option value="loanAmount">Loan Amount</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-1 hover:text-slate-900 cursor-pointer"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Physical Audit Stock Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Printable Header Info (only visible when printing) */}
        <div className="hidden print:block p-4 border-b border-black text-black">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">POOJA JEWELLERS - LOCKER STOCK AUDIT SHEET</h2>
              <div className="text-xs mt-1">
                Category: <strong>{activeTab.toUpperCase()} VAULT</strong> | 
                Series: <strong>{selectedSeries}</strong> | 
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
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Scanning physical vault inventory...
                  </td>
                </tr>
              ) : filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    No active items found in the vault matching the selected series, box range, and filters.
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
                      className={`cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald-50/50 hover:bg-emerald-50/80"
                          : "hover:bg-amber-50/40"
                      }`}
                    >
                      {/* Audit Checkbox */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleCheck(item.id)}
                          className="focus:outline-none transition-transform active:scale-90 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Pledge Number */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={isSilver ? "text-slate-800" : "text-amber-900 font-extrabold"}>
                            {item.pledgeNumber}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                              isSilver
                                ? "bg-slate-200 text-slate-800 border border-slate-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {isSilver ? "🥈 Silver" : "🪙 Gold"}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 text-slate-900">
                        <div className="font-semibold text-slate-900">{item.customer?.name || "—"}</div>
                        {item.customer?.mobileNumber && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.customer.mobileNumber}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap text-xs font-medium">
                        {item.pledgeDate
                          ? new Date(item.pledgeDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Articles description */}
                      <td className="py-3 px-4 text-slate-800">
                        {articles.length > 0 ? (
                          <div className="space-y-1">
                            {articles.map((art: any, idx: number) => (
                              <div key={idx} className="text-xs flex items-center gap-2">
                                <span className="font-semibold text-slate-900">{art.articleName}</span>
                                <span className="text-slate-500">× {art.quantity || 1}</span>
                                {art.netWeight && (
                                  <span className="text-amber-800 font-medium text-[11px]">({art.netWeight}g)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">
                            {item.totalArticlesCount || 1} Item(s)
                          </span>
                        )}
                      </td>

                      {/* Gross Weight */}
                      <td className="py-3 px-4 text-right font-mono text-slate-700 whitespace-nowrap font-medium">
                        {parseFloat(item.totalGrossWeight || "0").toFixed(3)} g
                      </td>

                      {/* Net Weight */}
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={isSilver ? "text-slate-800 font-extrabold" : "text-amber-800 font-black"}>
                          {parseFloat(item.totalNetWeight || "0").toFixed(3)} g
                        </span>
                      </td>

                      {/* Loan Amount */}
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                        {formatIndianCurrency(parseFloat(item.totalLoanAmount || "0"))}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/girvi/${item.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-950 hover:underline px-2.5 py-1 rounded bg-amber-50 border border-amber-200 font-semibold cursor-pointer"
                        >
                          View
                          <ExternalLink className="w-3 h-3 text-amber-700" />
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
