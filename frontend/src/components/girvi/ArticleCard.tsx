"use client";

import { useState } from "react";
import { PledgeArticle } from "@/types";
import { numberToIndianWords } from "@/lib/number-to-words";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { CameraModal } from "./CameraModal";
import { Trash2, Camera, Upload, CheckCircle2, Image as ImageIcon } from "lucide-react";

interface ArticleCardProps {
  index: number;
  article: PledgeArticle;
  canRemove: boolean;
  isAdmin: boolean;
  onChange: (updated: PledgeArticle) => void;
  onRemove: () => void;
}

export function ArticleCard({
  index,
  article,
  canRemove,
  isAdmin,
  onChange,
  onRemove,
}: ArticleCardProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [allowManualWords, setAllowManualWords] = useState(false);

  const handleFieldChange = (field: keyof PledgeArticle, value: any) => {
    const updated = { ...article, [field]: value };

    // Auto-calculate Net Weight if Gross or Less Weight changes
    if (field === "grossWeight" || field === "lessWeight") {
      const grossStr = field === "grossWeight" ? value : updated.grossWeight;
      const lessStr = field === "lessWeight" ? value : updated.lessWeight;
      const gross = parseFloat(String(grossStr)) || 0;
      const less = parseFloat(String(lessStr)) || 0;
      const net = Math.max(0, gross - less);
      updated.netWeight = gross > 0 ? parseFloat(net.toFixed(3)) : "";
    }

    // Auto-calculate Loan Amount in Words if Loan Amount changes
    if (field === "loanAmount" && !allowManualWords) {
      const loan = parseFloat(String(value)) || 0;
      updated.loanAmountWords = loan > 0 ? numberToIndianWords(loan) : "";
    }

    onChange(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          handleFieldChange("itemPhotoUrl", reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const displayLoanWords =
    article.loanAmountWords ||
    (parseFloat(String(article.loanAmount || 0)) > 0
      ? numberToIndianWords(article.loanAmount)
      : "—");

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-amber-400/50 hover:shadow-md relative space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 font-bold text-xs border border-amber-300">
            #{index + 1}
          </span>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">
            {article.itemName ? article.itemName : `Jewellery Article ${index + 1}`}
          </h4>
        </div>

        {canRemove && (
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs text-rose-600 font-medium">Remove item?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onRemove}
                  className="h-7 px-2 text-xs"
                >
                  Yes, Remove
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-7 px-2 text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                title="Remove Article"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Item Name */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>
            Article Description <span className="text-rose-600">*</span>
          </Label>
          <Input
            placeholder="e.g. Gold Ring, Silver Leg Chain, Gold Necklace..."
            value={article.itemName || ""}
            onChange={(e) => handleFieldChange("itemName", e.target.value)}
            required
          />
        </div>

        {/* Metal Option - Direct Selectable Format (Gold / Silver) */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-bold text-slate-700">
            Metal Type (धातु) <span className="text-rose-600">*</span>
          </Label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200 h-10 gap-1.5">
            <button
              type="button"
              onClick={() => handleFieldChange("metalType", "Gold")}
              className={`flex items-center justify-center gap-1.5 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                (article.metalType || "Gold") === "Gold"
                  ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-600"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <span>🪙 Gold (सोना)</span>
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange("metalType", "Silver")}
              className={`flex items-center justify-center gap-1.5 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                article.metalType === "Silver"
                  ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <span>🥈 Silver (चांदी)</span>
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <Label>
            Quantity <span className="text-rose-600">*</span>
          </Label>
          <Input
            type="number"
            min="1"
            placeholder="1"
            value={article.quantity !== undefined && article.quantity !== null ? article.quantity : ""}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleFieldChange("quantity", e.target.value)}
            onBlur={() => {
              if (!article.quantity || Number(article.quantity) < 1) {
                handleFieldChange("quantity", 1);
              }
            }}
            onWheel={(e) => (e.target as HTMLElement).blur()}
            required
          />
        </div>

        {/* Gross Weight */}
        <div className="space-y-1.5">
          <Label>
            Gross Weight (g) <span className="text-rose-600">*</span>
          </Label>
          <Input
            type="number"
            step="any"
            min="0"
            placeholder="0.000"
            value={article.grossWeight !== undefined && article.grossWeight !== null ? article.grossWeight : ""}
            onChange={(e) => handleFieldChange("grossWeight", e.target.value)}
            onWheel={(e) => (e.target as HTMLElement).blur()}
            required
          />
        </div>

        {/* Less Weight */}
        <div className="space-y-1.5">
          <Label>Less Weight (g) (Deduction)</Label>
          <Input
            type="number"
            step="any"
            min="0"
            placeholder="0.000"
            value={article.lessWeight !== undefined && article.lessWeight !== null ? article.lessWeight : ""}
            onChange={(e) => handleFieldChange("lessWeight", e.target.value)}
            onWheel={(e) => (e.target as HTMLElement).blur()}
          />
        </div>

        {/* Net Weight (Auto-calculated) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-amber-700">Net Weight (g)</Label>
            <span className="text-[10px] text-slate-500 font-mono">Gross - Less</span>
          </div>
          <div className="flex h-10 w-full items-center rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm font-bold text-slate-900">
            {article.netWeight && parseFloat(String(article.netWeight)) > 0
              ? `${parseFloat(String(article.netWeight)).toFixed(3)} g`
              : "0.000 g"}
          </div>
        </div>

        {/* Present Market Value */}
        <div className="space-y-1.5">
          <Label>
            Present Value (₹) <span className="text-rose-600">*</span>
          </Label>
          <Input
            type="number"
            step="any"
            min="0"
            placeholder="e.g. 50000"
            value={article.presentValue !== undefined && article.presentValue !== null ? article.presentValue : ""}
            onChange={(e) => handleFieldChange("presentValue", e.target.value)}
            onWheel={(e) => (e.target as HTMLElement).blur()}
            required
          />
        </div>

        {/* Loan Amount */}
        <div className="space-y-1.5">
          <Label>
            Loan Amount (₹) <span className="text-rose-600">*</span>
          </Label>
          <Input
            type="number"
            step="any"
            min="0"
            placeholder="e.g. 35000"
            value={article.loanAmount !== undefined && article.loanAmount !== null ? article.loanAmount : ""}
            onChange={(e) => handleFieldChange("loanAmount", e.target.value)}
            onWheel={(e) => (e.target as HTMLElement).blur()}
            required
          />
        </div>
      </div>

      {/* Loan Amount in Words Box */}
      <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Loan Amount in Words
          </span>
          <p className="text-xs font-semibold text-slate-800">
            {displayLoanWords}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setAllowManualWords(!allowManualWords)}
            className="text-[11px] text-amber-700 hover:text-amber-800 underline self-start sm:self-auto cursor-pointer"
          >
            {allowManualWords ? "Auto-generate Words" : "Admin Override Words"}
          </button>
        )}
      </div>

      {allowManualWords && (
        <div className="space-y-1">
          <Label className="text-xs">Custom Words Override</Label>
          <Input
            placeholder="Enter custom loan amount words"
            value={article.loanAmountWords || ""}
            onChange={(e) => handleFieldChange("loanAmountWords", e.target.value)}
          />
        </div>
      )}

      {/* Photo Capture Section */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCamera(true)}
          className="gap-1.5 text-xs text-slate-700"
        >
          <Camera className="h-3.5 w-3.5 text-amber-600" />
          Take Photo
        </Button>

        <label className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-slate-700 pointer-events-none"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            Upload File
          </Button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>

        {article.itemPhotoUrl && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Photo Attached</span>
            <button
              type="button"
              onClick={() => handleFieldChange("itemPhotoUrl", null)}
              className="text-emerald-700 hover:text-rose-600 ml-1"
              title="Remove photo"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraModal
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onCapture={(photoDataUrl) => handleFieldChange("itemPhotoUrl", photoDataUrl)}
          title={`Capture Photo for Article #${index + 1}`}
        />
      )}
    </div>
  );
}
