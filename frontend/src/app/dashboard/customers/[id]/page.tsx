"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Customer, Pledge } from "@/types";
import { formatIndianCurrency, formatWeight } from "@/lib/number-to-words";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Coins,
  ShieldCheck,
  FileText,
  Eye,
  Edit2,
  Check,
  X,
} from "lucide-react";

export default function CustomerProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [customer, setCustomer] = useState<(Customer & { stats?: any; pledges?: Pledge[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (!id) return;
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCustomer(id);
      if (res.success && res.data) {
        setCustomer(res.data);
        setEditForm({
          name: res.data.name,
          relationType: res.data.relationType,
          relationName: res.data.relationName || "",
          mobileNumber: res.data.mobileNumber,
          secondaryMobile: res.data.secondaryMobile || "",
          address: res.data.address,
          city: res.data.city || "Mumbai",
          pincode: res.data.pincode || "",
          monthlyIncome: res.data.monthlyIncome || "",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load customer profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await api.updateCustomer(id, editForm);
      if (res.success) {
        toast.success("Customer profile updated successfully!");
        setIsEditing(false);
        fetchCustomer();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          <p className="text-sm text-slate-500 font-medium">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Customer not found.</p>
        <Link href="/dashboard/customers">
          <Button variant="outline" className="mt-4">Back to Customers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/customers">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {customer.name}
              </h2>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {customer.customerCode}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Customer since {new Date(customer.createdAt || "").toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="gold" size="sm" onClick={handleUpdate} className="gap-1.5 font-bold">
                <Check className="h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
              <Edit2 className="h-4 w-4 text-amber-600" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border-slate-200/90 shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total Pledges Created
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {customer.stats?.totalPledgesCount || 0}
          </p>
        </Card>

        <Card className="rounded-xl border-slate-200/90 shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Active Vault Pledges
          </span>
          <p className="text-2xl font-black text-amber-900 mt-1">
            {customer.stats?.activePledgesCount || 0}
          </p>
        </Card>

        <Card className="rounded-xl border-emerald-200 bg-emerald-50/40 shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Total Outstanding Loan
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
            {formatIndianCurrency(customer.stats?.totalActiveLoan || 0)}
          </p>
        </Card>
      </div>

      {/* Profile Details Card */}
      <Card className="rounded-2xl border-slate-200/90 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="h-28 w-28 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
            {customer.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={customer.photoUrl}
                alt={customer.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-slate-400" />
            )}
          </div>

          <div className="flex-1 space-y-4">
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Mobile</Label>
                  <Input
                    value={editForm.mobileNumber}
                    onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Relation</span>
                  <p className="text-slate-900 font-semibold mt-0.5">
                    {customer.relationType} {customer.relationName || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Mobile</span>
                  <p className="text-slate-900 font-semibold mt-0.5">{customer.mobileNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Income</span>
                  <p className="text-slate-900 font-semibold mt-0.5">
                    {customer.monthlyIncome ? formatIndianCurrency(customer.monthlyIncome) : "N/A"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Address</span>
                  <p className="text-slate-900 font-semibold mt-0.5">{customer.address}, {customer.city}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Customer Pledge History */}
      <Card className="rounded-2xl border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            Pledge History for {customer.name} ({customer.pledges?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Pledge #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Items / Net Wt</th>
                  <th className="px-4 py-3 text-right">Loan Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!customer.pledges || customer.pledges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                      No pledges registered for this customer yet.
                    </td>
                  </tr>
                ) : (
                  customer.pledges.map((p) => (
                    <tr key={p.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.pledgeNumber}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(p.pledgeDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-semibold">
                        {new Date(p.dueDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>{p.totalArticlesCount} items</div>
                        <div className="text-xs text-amber-800 font-bold">{formatWeight(p.totalNetWeight)}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-800">
                        {formatIndianCurrency(p.totalLoanAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/girvi/${p.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Dossier
                          </Button>
                        </Link>
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
