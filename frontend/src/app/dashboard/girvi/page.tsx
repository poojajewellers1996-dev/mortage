"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pledge, PledgeStatus } from "@/types";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  Printer,
  Calendar,
  KeyRound,
  User,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";

export default function GirviListPage() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchPledges();
  }, [search, statusFilter, page]);

  const fetchPledges = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPledges({
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit: 15,
      });

      if (res.success) {
        setPledges(res.data);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.total || 0);
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
        return <Badge variant="default" className="bg-[#0F1E36]">Active</Badge>;
      case "due_soon":
        return <Badge variant="warning">Due Soon</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "closed":
        return <Badge variant="success">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Girvi Pawn Pledges Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Total {totalCount} registered pawn pledges in vault records
          </p>
        </div>

        <Link href="/dashboard/girvi/new">
          <Button variant="gold" size="sm" className="gap-2 font-semibold shadow-sm">
            <PlusCircle className="h-4 w-4" />
            New Girvi Entry
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Pledge # (e.g. G-2026), Customer Name, Mobile..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full sm:w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="due_soon">Due Soon (&le; 15 days)</option>
              <option value="overdue">Overdue Pledges</option>
              <option value="closed">Closed / Redeemed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Pledges Table */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/90 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Pledge #</th>
                  <th className="px-4 py-3">Customer Details</th>
                  <th className="px-4 py-3">Pledge Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Items / Net Wt</th>
                  <th className="px-4 py-3 text-right">Loan Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                        <span>Searching database records...</span>
                      </div>
                    </td>
                  </tr>
                ) : pledges.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No pledges found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  pledges.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {p.pledgeNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.customer?.name}</div>
                        <div className="text-xs text-slate-500">{p.customer?.mobileNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {new Date(p.pledgeDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-semibold">
                        {new Date(p.dueDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium text-slate-800">{p.totalArticlesCount} pcs</div>
                        <div className="text-xs font-bold text-amber-800">{formatWeight(p.totalNetWeight)}</div>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
