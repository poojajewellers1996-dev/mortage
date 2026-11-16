"use client";

import { useState, useRef } from "react";
import { Customer, RelationType } from "@/types";
import { api } from "@/lib/api";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { CameraModal } from "./CameraModal";
import { Camera, Upload, User, CheckCircle2, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CustomerSelectorProps {
  customer: {
    id?: string | null;
    name: string;
    relationType: RelationType;
    relationName: string;
    mobileNumber: string;
    secondaryMobile: string;
    email: string;
    monthlyIncome: string | number;
    address: string;
    city: string;
    pincode: string;
    photoUrl?: string | null;
  };
  onChange: (field: string, value: any) => void;
  onSelectExisting: (customer: Customer) => void;
}

export function CustomerSelector({ customer, onChange, onSelectExisting }: CustomerSelectorProps) {
  const [isSearchingMobile, setIsSearchingMobile] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMobileChange = (val: string) => {
    onChange("mobileNumber", val);

    // Cancel any previous debounce timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const digits = val.replace(/\D/g, "");

    // Trigger auto-lookup once 10 digits are available
    if (digits.length >= 10) {
      const searchDigits = digits.slice(-10); // Extract last 10 digits
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearchingMobile(true);
        try {
          const res = await api.getCustomers({ search: searchDigits, limit: 1 });
          if (res.success && res.data && res.data.length > 0) {
            const match = res.data[0];
            onSelectExisting(match);
            toast.success(`Existing Customer Found: ${match.name}! KYC details auto-filled.`);
          } else {
            // Unlink if no customer match
            if (customer.id) {
              onChange("id", null);
            }
          }
        } catch (err) {
          console.error("Customer auto-lookup error:", err);
        } finally {
          setIsSearchingMobile(false);
        }
      }, 350);
    } else {
      if (customer.id) {
        onChange("id", null);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          onChange("photoUrl", reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs shadow-sm">
            <User className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Customer (Pledgor) Details</h3>
            <p className="text-[11px] text-slate-500">
              Enter mobile number to automatically fetch existing customer profile & photo
            </p>
          </div>
        </div>

        {customer.id ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Existing Customer Verified
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            New Customer Entry
          </span>
        )}
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Mobile Number - First Field for Auto-Lookup (COMPULSORY) */}
        <div className="space-y-1.5 sm:col-span-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="mobileNumber" className="font-bold text-slate-800 flex items-center gap-1">
              <span>Mobile Number (मोबाइल नंबर)</span>
              <span className="text-rose-600 font-extrabold">* (Compulsory)</span>
            </Label>
            {isSearchingMobile && (
              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-600" />
                Searching records...
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="mobileNumber"
              type="tel"
              maxLength={15}
              placeholder="e.g. 9820123456 (10 digits compulsory)"
              value={customer.mobileNumber}
              onChange={(e) => handleMobileChange(e.target.value)}
              required
              className={customer.id ? "border-emerald-500 bg-emerald-50/20 pr-9 font-bold" : "font-semibold"}
            />
            {customer.id && (
              <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-emerald-600" />
            )}
          </div>

          {customer.id && (
            <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <span className="font-semibold truncate">
                ✓ Auto-filled: {customer.name}
              </span>
              <button
                type="button"
                onClick={() => onChange("id", null)}
                className="text-emerald-900 hover:text-rose-700 underline text-[10px] ml-2 shrink-0 cursor-pointer"
              >
                Unlink
              </button>
            </div>
          )}
        </div>

        {/* Customer Full Name */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="customerName">
            Customer Full Name <span className="text-rose-600">*</span>
          </Label>
          <Input
            id="customerName"
            placeholder="e.g. Ramesh Chandra Patel"
            value={customer.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
            className="font-medium"
          />
        </div>

        {/* Relation Type */}
        <div className="space-y-1.5">
          <Label>Relation Type</Label>
          <select
            value={customer.relationType}
            onChange={(e) => onChange("relationType", e.target.value)}
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <option value="S/O">S/O (Son of)</option>
            <option value="D/O">D/O (Daughter of)</option>
            <option value="W/O">W/O (Wife of)</option>
            <option value="C/O">C/O (Care of)</option>
            <option value="O">O (Other)</option>
          </select>
        </div>

        {/* Relation Name */}
        <div className="space-y-1.5">
          <Label>Relation Name</Label>
          <Input
            placeholder="Father / Husband / Guardian Name"
            value={customer.relationName || ""}
            onChange={(e) => onChange("relationName", e.target.value)}
          />
        </div>

        {/* Secondary Mobile */}
        <div className="space-y-1.5">
          <Label>Secondary Mobile (Optional)</Label>
          <Input
            type="tel"
            placeholder="Alternate mobile / landline"
            value={customer.secondaryMobile || ""}
            onChange={(e) => onChange("secondaryMobile", e.target.value)}
          />
        </div>

        {/* Full Residential Address */}
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="customerAddress">
            Full Residential Address <span className="text-rose-600">*</span>
          </Label>
          <textarea
            id="customerAddress"
            rows={2}
            placeholder="House / Flat No., Society / Chawl, Street / Road, Village / Area, Landmark"
            value={customer.address}
            onChange={(e) => onChange("address", e.target.value)}
            required
            className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 resize-none shadow-sm"
          />
        </div>

        {/* Customer Photograph */}
        <div className="space-y-1.5 sm:col-span-3 pt-2">
          <Label>Customer Photograph (KYC Requirement)</Label>
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCamera(true)}
              className="gap-2 text-xs h-9 text-slate-700"
            >
              <Camera className="h-4 w-4 text-amber-600" />
              Take Customer Photo
            </Button>

            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer h-9 shadow-sm">
              <Upload className="h-4 w-4 text-slate-500" />
              Upload Image
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {customer.photoUrl && (
              <div className="flex items-center gap-2 p-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={customer.photoUrl}
                  alt="Customer preview"
                  className="h-10 w-10 rounded-full object-cover border border-emerald-400 shadow-sm"
                />
                <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Photo Attached
                </span>
                <button
                  type="button"
                  onClick={() => onChange("photoUrl", null)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraModal
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          title="Customer Live Webcam Photograph"
          onCapture={(dataUrl) => onChange("photoUrl", dataUrl)}
        />
      )}
    </div>
  );
}
