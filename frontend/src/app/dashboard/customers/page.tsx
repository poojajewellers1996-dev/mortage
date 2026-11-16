"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Customer, RelationType } from "@/types";
import { formatIndianCurrency } from "@/lib/number-to-words";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Users,
  Search,
  UserPlus,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  Phone,
  MapPin,
  Camera,
  Upload,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function CustomersPage() {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCust, setNewCust] = useState({
    name: "",
    relationType: "S/O" as RelationType,
    relationName: "",
    mobileNumber: "",
    secondaryMobile: "",
    monthlyIncome: "",
    address: "",
    city: "Mumbai",
    pincode: "",
    photoUrl: null as string | null,
  });

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getCustomers({ search: search.trim() || undefined, page, limit: 15 });
      if (res.success) {
        setCustomers(res.data);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.total || 0);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name.trim() || !newCust.mobileNumber.trim() || !newCust.address.trim()) {
      toast.error("Please fill in all required customer fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createCustomer(newCust);
      if (res.success) {
        toast.success(`Customer ${res.data.name} added successfully!`);
        setShowAddModal(false);
        setNewCust({
          name: "",
          relationType: "S/O",
          relationName: "",
          mobileNumber: "",
          secondaryMobile: "",
          monthlyIncome: "",
          address: "",
          city: "Mumbai",
          pincode: "",
          photoUrl: null,
        });
        fetchCustomers();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete customer ${name}? This action requires administrator rights.`)) {
      return;
    }

    try {
      const res = await api.deleteCustomer(id);
      if (res.success) {
        toast.success("Customer deleted successfully.");
        fetchCustomers();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customer.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Directory (Pledgors)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Total {totalCount} registered customers with verified KYC & photographs
          </p>
        </div>

        <Button
          variant="gold"
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="gap-2 font-semibold shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Add New Customer
        </Button>
      </div>

      {/* Search Input */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by customer name, mobile number or customer code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-10"
          />
        </div>
      </Card>

      {/* Customer List Table */}
      <Card className="rounded-xl border-slate-200/90 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/90 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Photo</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Relation</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                        <span>Loading customer directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No customers found matching your search.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-4 py-3">
                        {c.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.photoUrl}
                            alt={c.name}
                            className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200">
                            {c.name.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-xs text-slate-700">
                        {c.customerCode || "CUST-..."}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {c.relationType} {c.relationName || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{c.mobileNumber}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                        {c.address}, {c.city}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/dashboard/customers/${c.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              Profile & Loans
                            </Button>
                          </Link>

                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomer(c.id, c.name)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0F1E36] text-white">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-400" />
                Register New Customer (Pledgor)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>
                  Customer Full Name <span className="text-rose-600">*</span>
                </Label>
                <Input
                  placeholder="e.g. Anand Mahindra"
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Relation</Label>
                  <select
                    value={newCust.relationType}
                    onChange={(e) => setNewCust({ ...newCust, relationType: e.target.value as RelationType })}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="S/O">S/O</option>
                    <option value="D/O">D/O</option>
                    <option value="W/O">W/O</option>
                    <option value="C/O">C/O</option>
                    <option value="O">O</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Relation Name</Label>
                  <Input
                    placeholder="Father / Husband Name"
                    value={newCust.relationName}
                    onChange={(e) => setNewCust({ ...newCust, relationName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>
                    Mobile Number <span className="text-rose-600">*</span>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="10-digit number"
                    value={newCust.mobileNumber}
                    onChange={(e) => setNewCust({ ...newCust, mobileNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Monthly Income (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newCust.monthlyIncome}
                    onChange={(e) => setNewCust({ ...newCust, monthlyIncome: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Residential Address <span className="text-rose-600">*</span>
                </Label>
                <textarea
                  rows={2}
                  placeholder="Complete postal address"
                  value={newCust.address}
                  onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
                  required
                  className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  disabled={isSubmitting}
                  className="font-bold text-white shadow-sm"
                >
                  {isSubmitting ? "Saving..." : "Save Customer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
