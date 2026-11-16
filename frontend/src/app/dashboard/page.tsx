"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DashboardSummary, DashboardAnalytics } from "@/types";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Coins,
  Scale,
  AlertCircle,
  Calendar,
  Clock,
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Eye,
  Printer,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboardSummary(), api.getDashboardAnalytics()])
      .then(([sumRes, anaRes]) => {
        if (sumRes.success) setSummary(sumRes.data);
        if (anaRes.success) setAnalytics(anaRes.data);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          <p className="text-sm text-slate-500 font-medium">Aggregating live business figures...</p>
        </div>
      </div>
    );
  }

  const s = summary || {
    totalCustomers: 0,
    totalActiveGirvi: 0,
    totalClosedGirvi: 0,
    totalLoanAmount: 0,
    totalJewelleryWeight: 0,
    overduePledges: 0,
    pledgesDueToday: 0,
    pledgesDueThisMonth: 0,
    recentPledges: [],
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/90 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Business Dashboard & Vault Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time jewellery pledge valuation, loan disbursements, and customer records
          </p>
        </div>

        <Link href="/dashboard/girvi/new">
          <Button variant="gold" size="sm" className="gap-2 font-semibold shadow-md shadow-amber-500/20">
            <PlusCircle className="h-4 w-4" />
            New Girvi Entry
          </Button>
        </Link>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <Card className="rounded-2xl border-slate-200/90 shadow-sm p-4 relative overflow-hidden bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{s.totalCustomers}</p>
          <span className="text-[10px] text-slate-400">Verified Pledgors in System</span>
        </Card>

        {/* Total Active Girvi */}
        <Link href="/dashboard/girvi?status=active" className="block">
          <Card className="rounded-2xl border-slate-200/90 shadow-sm p-4 relative overflow-hidden bg-white hover:border-amber-400 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Girvi
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2">{s.totalActiveGirvi}</p>
            <span className="text-[10px] text-amber-700 font-medium">Open in Girvi Ledger &rarr;</span>
          </Card>
        </Link>

        {/* Total Loan Amount Outstanding */}
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/40 shadow-sm p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Outstanding Loan
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-2">
            {formatIndianCurrency(s.totalLoanAmount)}
          </p>
          <span className="text-[10px] text-emerald-700">Total Capital Disbursed</span>
        </Card>

        {/* Total Gold in Vault */}
        <Card className="rounded-2xl border-amber-300 bg-gradient-to-br from-amber-500/10 via-amber-50 to-amber-100/40 shadow-sm p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              🪙 Gold in Vault (सोना)
            </span>
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-sm font-bold">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-950 mt-2">
            {formatWeight(s.totalGoldWeight || 0)}
          </p>
          <div className="flex items-center justify-between text-[10px] text-amber-800 mt-1 font-semibold">
            <span>Loan: {formatIndianCurrency(s.totalGoldLoan || 0)}</span>
            <span>{s.totalGoldActivePledges || 0} Girvi</span>
          </div>
        </Card>

        {/* Total Silver in Vault */}
        <Card className="rounded-2xl border-slate-300 bg-gradient-to-br from-slate-100/90 via-slate-50 to-slate-200/50 shadow-sm p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              🥈 Silver in Vault (चांदी)
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-white shadow-sm font-bold">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {formatWeight(s.totalSilverWeight || 0)}
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1 font-semibold">
            <span>Loan: {formatIndianCurrency(s.totalSilverLoan || 0)}</span>
            <span>{s.totalSilverActivePledges || 0} Girvi</span>
          </div>
        </Card>

        {/* Overdue Pledges */}
        <Card className="rounded-2xl border-rose-200 bg-rose-50/40 shadow-sm p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
              Overdue Pledges
            </span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-950 mt-2">{s.overduePledges}</p>
          <span className="text-[10px] text-rose-700">Past Due Date • Action Required</span>
        </Card>

        {/* Pledges Due Today */}
        <Card className="rounded-2xl border-slate-200/90 shadow-sm p-4 relative overflow-hidden bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Due Today
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{s.pledgesDueToday}</p>
          <span className="text-[10px] text-slate-400">Scheduled for Redemption Today</span>
        </Card>

        {/* Pledges Due This Month */}
        <Card className="rounded-2xl border-slate-200/90 shadow-sm p-4 relative overflow-hidden bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Due This Month
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{s.pledgesDueThisMonth}</p>
          <span className="text-[10px] text-slate-400">Expiring in Current Month</span>
        </Card>

        {/* Total Closed Girvi */}
        <Link href="/dashboard/girvi?status=closed" className="block">
          <Card className="rounded-2xl border-slate-200/90 shadow-sm p-4 relative overflow-hidden bg-white hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Redeemed & Closed
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{s.totalClosedGirvi}</p>
            <span className="text-[10px] text-emerald-700 font-medium">Open in Girvi Ledger &rarr;</span>
          </Card>
        </Link>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Registrations & Disbursements */}
        <Card className="rounded-2xl border-slate-200/90 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Monthly Girvi Registrations & Disbursements
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full">
              {analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        name === "disbursements" ? formatIndianCurrency(val) : val,
                        name === "disbursements" ? "Loan Amount" : "New Pledges",
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="registrations"
                      name="Pledges Count"
                      fill="#0F1E36"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="disbursements"
                      name="Disbursements (₹)"
                      fill="#D97706"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No trend data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="rounded-2xl border-slate-200/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              Vault Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col items-center">
            <div className="h-56 w-full">
              {analytics?.statusDistribution && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {analytics.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="w-full text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              Active: <strong>{s.totalActiveGirvi}</strong> • Closed: <strong>{s.totalClosedGirvi}</strong> • Overdue: <strong>{s.overduePledges}</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Created Pledges Table */}
      <Card className="rounded-2xl border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            Recently Registered Pledges
          </CardTitle>
          <Link href="/dashboard/girvi">
            <Button variant="ghost" size="sm" className="text-xs text-amber-700">
              View All &rarr;
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Pledge #</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3 text-center">Metal</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Net Wt</th>
                  <th className="px-4 py-3 text-right">Loan Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.recentPledges.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-slate-500">
                      No pledges registered yet. Click &quot;New Girvi Entry&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  s.recentPledges.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {p.pledgeNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">{p.customerName || "Customer"}</span>
                        <span className="block text-xs text-slate-500">{p.customerMobile || "—"}</span>
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
                      <td className="px-4 py-3 text-slate-600 text-xs font-semibold">
                        {new Date(p.dueDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {formatWeight(p.totalNetWeight)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-800">
                        {formatIndianCurrency(p.totalLoanAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.status === "closed"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.status === "overdue"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/dashboard/girvi/${p.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/dashboard/girvi/${p.id}/receipt`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                              <Printer className="h-3.5 w-3.5 text-amber-600 mr-1" />
                              Receipt
                            </Button>
                          </Link>
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
    </div>
  );
}
