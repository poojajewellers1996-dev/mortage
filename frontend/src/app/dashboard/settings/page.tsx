"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { BusinessSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Settings, Save, Shield, Building, FileText } from "lucide-react";

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings>({
    businessName: "",
    tagline: "",
    licenseNumber: "",
    gstin: "",
    ownerName: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
    defaultInterestRate: "1.50",
    defaultPledgePrefix: "G-",
    termsAndConditions: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data);
        }
      })
      .catch((err) => {
        toast.error("Failed to load settings.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only administrators can update business settings.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.updateSettings(settings);
      if (res.success) {
        toast.success("Business settings saved successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          <p className="text-sm text-slate-500 font-medium">Loading shop settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Shop Profile & Legal Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure business identity, government pawn license numbers, and receipt terms
          </p>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <Shield className="h-4 w-4" />
            <span>Read-only: Admin credentials required to modify</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Identity */}
        <Card className="rounded-xl border-slate-200/90 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building className="h-4 w-4 text-amber-600" />
              Business Identity & Registration
            </CardTitle>
            <CardDescription className="text-xs">
              Printed on top of every customer Girvi receipt and voucher
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <Label>Business / Shop Name *</Label>
                <Input
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  disabled={!isAdmin}
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label>Tagline / Descriptor</Label>
                <Input
                  value={settings.tagline || ""}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-1">
                <Label>Govt. Pawn Broker License No.</Label>
                <Input
                  value={settings.licenseNumber || ""}
                  onChange={(e) => setSettings({ ...settings, licenseNumber: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-1">
                <Label>GSTIN Registration</Label>
                <Input
                  value={settings.gstin || ""}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-1">
                <Label>Owner / Proprietor Name</Label>
                <Input
                  value={settings.ownerName || ""}
                  onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-1">
                <Label>Primary Phone / WhatsApp</Label>
                <Input
                  value={settings.phone || ""}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-1">
                <Label>Official Email</Label>
                <Input
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>

              <div className="space-y-1">
                <Label>Default Monthly Interest (%)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={settings.defaultInterestRate || 1.5}
                  onChange={(e) => setSettings({ ...settings, defaultInterestRate: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Shop Address</Label>
                <Input
                  value={settings.addressLine1 || ""}
                  onChange={(e) => setSettings({ ...settings, addressLine1: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1">
                <Label>City / State / PIN</Label>
                <Input
                  value={`${settings.city || "Mumbai"}, ${settings.state || "MH"} - ${settings.pincode || ""}`}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card className="rounded-xl border-slate-200/90 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              Standard Receipt Terms & Statutory Conditions
            </CardTitle>
            <CardDescription className="text-xs">
              Printed on the footer of all legal pawn receipts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <textarea
              rows={4}
              value={settings.termsAndConditions || ""}
              onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
              disabled={!isAdmin}
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 leading-relaxed resize-none shadow-sm"
            />
          </CardContent>
        </Card>

        {isAdmin && (
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              disabled={isSaving}
              className="gap-2 font-bold px-8 shadow-md shadow-amber-500/20 text-white"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
