"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Payment } from "@/types";
import { formatIndianCurrency } from "@/lib/number-to-words";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Calendar, Coins, CheckCircle2, User } from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, [page]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPayments({ page, limit: 15 });
      if (res.success) {
        setPayments(res.data);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load payments ledger.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Payments & Redemption Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Audit history of interest collections, principal repayments, and full redemptions
          </p>
        </div>
      </div>

      {/* Table */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/90 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Pledge #</th>
                  <th className="px-4 py-3">Pledgor Name</th>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3 text-right">Total Paid</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                        <span>Loading payment receipts...</span>
                      </div>
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No payment records found. Payments are automatically logged upon redemption or interest payments.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{p.pledgeNumber || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.customerName || "Customer"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {p.paymentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-medium">{p.paymentMode}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-800">
                        {formatIndianCurrency(p.totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                        {p.remarks || "—"}
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
