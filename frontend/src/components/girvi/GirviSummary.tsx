"use client";

import { formatIndianCurrency, formatWeight, numberToIndianWords } from "@/lib/number-to-words";
import { Button } from "../ui/button";
import { Save, FileCheck, RotateCcw, X, ShieldCheck } from "lucide-react";

interface GirviSummaryProps {
  totalArticles: number;
  totalQuantity: number;
  totalGrossWeight: number;
  totalLessWeight: number;
  totalNetWeight: number;
  totalPresentValue: number;
  totalLoanAmount: number;
  isSubmitting: boolean;
  onSave: () => void;
  onSaveDraft: () => void;
  onReset: () => void;
  onCancel: () => void;
}

export function GirviSummary({
  totalArticles,
  totalQuantity,
  totalGrossWeight,
  totalLessWeight,
  totalNetWeight,
  totalPresentValue,
  totalLoanAmount,
  isSubmitting,
  onSave,
  onSaveDraft,
  onReset,
  onCancel,
}: GirviSummaryProps) {
  const loanInWords = numberToIndianWords(totalLoanAmount);

  return (
    <div className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-white to-amber-50/20 p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-amber-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Live Girvi Pledge Summary</h3>
            <p className="text-xs text-slate-500">
              Aggregated weight and valuation calculated across all {totalArticles} article(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Articles:
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#0F1E36] text-white font-bold text-xs">
            {totalArticles} Items ({totalQuantity} Pcs)
          </span>
        </div>
      </div>

      {/* Grid of Key Calculations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Gross Weight */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Gross Wt
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-800">
            {formatWeight(totalGrossWeight)}
          </p>
        </div>

        {/* Less Weight */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Less Wt
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-600">
            {formatWeight(totalLessWeight)}
          </p>
        </div>

        {/* Net Weight */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            Total Net Weight
          </span>
          <p className="text-base sm:text-lg font-extrabold text-amber-950">
            {formatWeight(totalNetWeight)}
          </p>
        </div>

        {/* Present Value */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Market Value (₹)
          </span>
          <p className="text-base sm:text-lg font-bold text-slate-800">
            {formatIndianCurrency(totalPresentValue)}
          </p>
        </div>

        {/* Loan Amount */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Total Loan Amount
          </span>
          <p className="text-lg sm:text-xl font-black text-emerald-950">
            {formatIndianCurrency(totalLoanAmount)}
          </p>
        </div>
      </div>

      {/* Words Display */}
      <div className="rounded-xl bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
            Total Loan Amount in Words
          </span>
          <p className="text-sm font-semibold tracking-wide text-slate-100">
            {loanInWords}
          </p>
        </div>
        <div className="shrink-0 text-right sm:border-l sm:border-slate-800 sm:pl-4">
          <span className="text-[10px] text-slate-400 block uppercase">LTV Ratio</span>
          <span className="text-xs font-bold text-amber-400">
            {totalPresentValue > 0
              ? `${Math.round((totalLoanAmount / totalPresentValue) * 100)}% LTV`
              : "0%"}
          </span>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isSubmitting}
            className="gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Form
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="gap-2 text-xs font-semibold"
          >
            <FileCheck className="h-4 w-4" />
            Save as Draft
          </Button>

          <Button
            type="button"
            variant="gold"
            size="lg"
            onClick={onSave}
            disabled={isSubmitting}
            className="gap-2 font-bold px-6 shadow-lg shadow-amber-500/25 text-white"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Confirm & Save Girvi
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
