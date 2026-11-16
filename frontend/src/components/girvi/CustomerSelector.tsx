"use client";

import { useState, useEffect } from "react";
import { Customer, RelationType } from "@/types";
import { api } from "@/lib/api";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { CameraModal } from "./CameraModal";
import { Search, UserPlus, Camera, Upload, User, CheckCircle2, X } from "lucide-react";

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
  const [isExistingMode, setIsExistingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim() || !isExistingMode) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.getCustomers({ search: searchQuery, limit: 5 });
        if (res.success) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error("Failed to search customers:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isExistingMode]);

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
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs">
            <User className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Customer (Pledgor) Details</h3>
            <p className="text-[11px] text-slate-500">Provide verified KYC details and photograph</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsExistingMode(false)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              !isExistingMode
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            New Customer
          </button>
          <button
            type="button"
            onClick={() => setIsExistingMode(true)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              isExistingMode
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Search Existing
          </button>
        </div>
      </div>

      {/* Existing Customer Search Input */}
      {isExistingMode && (
        <div className="space-y-2 relative pb-2">
          <Label>Search by Customer Name or Mobile</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Type name or 10-digit mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
              {searchResults.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    onSelectExisting(cust);
                    setSearchResults([]);
                    setSearchQuery(cust.name);
                  }}
                  className="flex items-center justify-between p-3 hover:bg-amber-50/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                      {cust.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{cust.name}</p>
                      <p className="text-xs text-slate-500">
                        {cust.mobileNumber} • {cust.relationType} {cust.relationName}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100/60 px-2 py-1 rounded">
                    Select
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Customer Name */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>
            Customer Full Name <span className="text-rose-600">*</span>
          </Label>
          <Input
            placeholder="e.g. Ramesh Chandra Patel"
            value={customer.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
        </div>

        {/* Mobile Number */}
        <div className="space-y-1.5">
          <Label>
            Mobile Number <span className="text-rose-600">*</span>
          </Label>
          <Input
            type="tel"
            placeholder="e.g. 9820123456"
            value={customer.mobileNumber}
            onChange={(e) => onChange("mobileNumber", e.target.value)}
            required
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

        {/* Monthly Income */}
        <div className="space-y-1.5">
          <Label>Monthly Income (₹)</Label>
          <Input
            type="number"
            placeholder="e.g. 45000"
            value={customer.monthlyIncome || ""}
            onChange={(e) => onChange("monthlyIncome", e.target.value)}
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

        {/* Address */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>
            Full Residential Address <span className="text-rose-600">*</span>
          </Label>
          <textarea
            rows={2}
            placeholder="House / Flat No., Society / Chawl, Street / Road, Landmark"
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
              className="gap-2 text-xs h-9"
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
              <div className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={customer.photoUrl}
                  alt="Customer preview"
                  className="h-9 w-9 rounded-full object-cover border border-slate-300"
                />
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Photo verified
                </span>
                <button
                  type="button"
                  onClick={() => onChange("photoUrl", null)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        title="Customer Live Webcam Photograph"
        onCapture={(dataUrl) => onChange("photoUrl", dataUrl)}
      />
    </div>
  );
}
