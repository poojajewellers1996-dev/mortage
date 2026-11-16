"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Customer, PledgeArticle, RelationType } from "@/types";
import { numberToIndianWords } from "@/lib/number-to-words";
import { CustomerSelector } from "@/components/girvi/CustomerSelector";
import { ArticleCard } from "@/components/girvi/ArticleCard";
import { GirviSummary } from "@/components/girvi/GirviSummary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Calendar,
  KeyRound,
  Shield,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react";

export default function NewGirviPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  // Pledge metadata
  const [pledgeNumber, setPledgeNumber] = useState<string>("");
  const [pledgeDate, setPledgeDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6); // Default 6 months tenure
    return d.toISOString().split("T")[0];
  });
  const [interestRate, setInterestRate] = useState<number>(1.5);
  const [interestPeriod, setInterestPeriod] = useState<"monthly" | "yearly">("monthly");
  const [storageLocation, setStorageLocation] = useState<string>("Vault-1, Locker 04");

  // Customer state
  const [customer, setCustomer] = useState<{
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
  }>({
    id: null,
    name: "",
    relationType: "S/O",
    relationName: "",
    mobileNumber: "",
    secondaryMobile: "",
    email: "",
    monthlyIncome: "",
    address: "",
    city: "Mumbai",
    pincode: "",
    photoUrl: null,
  });

  // Articles state
  const [articles, setArticles] = useState<PledgeArticle[]>([
    {
      itemName: "",
      metalType: "Gold",
      purity: "22K (916)",
      quantity: 1,
      grossWeight: "",
      lessWeight: "",
      netWeight: "",
      presentValue: "",
      loanAmount: "",
      loanAmountWords: "",
      isRepledged: false,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update customer fields
  const handleCustomerChange = (field: string, value: any) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  // Select existing customer
  const handleSelectExistingCustomer = (selected: Customer) => {
    setCustomer({
      id: selected.id,
      name: selected.name,
      relationType: selected.relationType,
      relationName: selected.relationName || "",
      mobileNumber: selected.mobileNumber,
      secondaryMobile: selected.secondaryMobile || "",
      email: selected.email || "",
      monthlyIncome: selected.monthlyIncome || "",
      address: selected.address,
      city: selected.city || "Mumbai",
      pincode: selected.pincode || "",
      photoUrl: selected.photoUrl || null,
    });
    toast.success(`Selected customer ${selected.name}`);
  };

  // Add Article Card
  const handleAddArticle = () => {
    setArticles((prev) => [
      ...prev,
      {
        itemName: "",
        metalType: "Gold",
        purity: "22K (916)",
        quantity: 1,
        grossWeight: "",
        lessWeight: "",
        netWeight: "",
        presentValue: "",
        loanAmount: "",
        loanAmountWords: "",
        isRepledged: false,
      },
    ]);
  };

  // Update Article
  const handleArticleChange = (index: number, updated: PledgeArticle) => {
    setArticles((prev) => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  // Remove Article
  const handleRemoveArticle = (index: number) => {
    if (articles.length <= 1) {
      toast.error("A pledge must have at least one article.");
      return;
    }
    setArticles((prev) => prev.filter((_, i) => i !== index));
    toast.info("Article removed.");
  };

  // Calculate Aggregations Live
  let totalArticles = articles.length;
  let totalQuantity = 0;
  let totalGrossWeight = 0;
  let totalLessWeight = 0;
  let totalNetWeight = 0;
  let totalPresentValue = 0;
  let totalLoanAmount = 0;

  for (const art of articles) {
    totalQuantity += parseInt(String(art.quantity || 1), 10) || 1;
    totalGrossWeight += parseFloat(String(art.grossWeight)) || 0;
    totalLessWeight += parseFloat(String(art.lessWeight)) || 0;
    totalNetWeight += parseFloat(String(art.netWeight)) || 0;
    totalPresentValue += parseFloat(String(art.presentValue)) || 0;
    totalLoanAmount += parseFloat(String(art.loanAmount)) || 0;
  }

  // Form Submission
  const handleSubmit = async (isDraft = false) => {
    // Basic Validations
    if (!pledgeNumber.trim()) {
      toast.error("Please enter a Pledge Number.");
      return;
    }
    if (!customer.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!customer.address.trim()) {
      toast.error("Customer residential address is required.");
      return;
    }
    if (new Date(dueDate) < new Date(pledgeDate)) {
      toast.error("Due date cannot be earlier than pledge date.");
      return;
    }
    if (articles.some((a) => !a.itemName.trim())) {
      toast.error("Please enter a description for all articles.");
      return;
    }
    if (articles.some((a) => parseFloat(String(a.grossWeight)) <= 0)) {
      toast.error("Gross weight must be greater than zero for all articles.");
      return;
    }
    if (articles.some((a) => parseFloat(String(a.loanAmount)) <= 0)) {
      toast.error("Loan amount must be greater than zero for all articles.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        pledgeNumber: pledgeNumber.trim() || undefined,
        pledgeDate,
        dueDate,
        interestRatePercent: interestRate,
        interestPeriod,
        storageLocation,
        isDraft,
        articles: articles.map((a) => ({
          itemName: a.itemName.trim(),
          metalType: a.metalType || "Gold",
          purity: a.purity || "22K",
          quantity: parseInt(String(a.quantity || 1), 10) || 1,
          grossWeight: parseFloat(String(a.grossWeight)),
          lessWeight: parseFloat(String(a.lessWeight || 0)),
          netWeight: parseFloat(String(a.netWeight)),
          presentValue: parseFloat(String(a.presentValue)),
          loanAmount: parseFloat(String(a.loanAmount)),
          loanAmountWords: a.loanAmountWords || numberToIndianWords(a.loanAmount),
          itemPhotoUrl: a.itemPhotoUrl || null,
          isRepledged: a.isRepledged || false,
          repledgedBankName: a.repledgedBankName || null,
          remarks: a.remarks || null,
        })),
      };

      if (customer.id) {
        payload.customerId = customer.id;
      } else {
        payload.customer = {
          name: customer.name.trim(),
          relationType: customer.relationType,
          relationName: customer.relationName ? customer.relationName.trim() : null,
          mobileNumber: customer.mobileNumber.trim(),
          secondaryMobile: customer.secondaryMobile || null,
          email: customer.email || null,
          monthlyIncome: customer.monthlyIncome ? String(customer.monthlyIncome) : "0",
          address: customer.address.trim(),
          city: customer.city || "Mumbai",
          pincode: customer.pincode || null,
          photoUrl: customer.photoUrl || null,
        };
      }

      const res = await api.createPledge(payload);
      if (res.success && res.data) {
        toast.success(`Girvi Registered Successfully! Pledge #${res.data.pledgeNumber}`);
        router.push(`/dashboard/girvi/${res.data.id}`);
      } else {
        toast.error("Failed to register pledge.");
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(err.message || "Failed to save Girvi registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the form? All unsaved data will be cleared.")) {
      setPledgeNumber("");
      setArticles([
        {
          itemName: "",
          metalType: "Gold",
          purity: "22K (916)",
          quantity: 1,
          grossWeight: "",
          lessWeight: "",
          netWeight: "",
          presentValue: "",
          loanAmount: "",
          loanAmountWords: "",
          isRepledged: false,
        },
      ]);
      setCustomer({
        id: null,
        name: "",
        relationType: "S/O",
        relationName: "",
        mobileNumber: "",
        secondaryMobile: "",
        email: "",
        monthlyIncome: "",
        address: "",
        city: "Mumbai",
        pincode: "",
        photoUrl: null,
      });
      toast.info("Form reset.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200/80 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-800 text-xs font-bold border border-amber-300">
              Form 1A
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Girvi Pawn Registration
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Register new gold or jewellery pledge with live weight valuation and customer KYC
          </p>
        </div>

        {/* Pledge Number & Vault Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-sm">
            <KeyRound className="h-3.5 w-3.5 text-amber-400" />
            <span>{pledgeNumber ? `PLEDGE #${pledgeNumber}` : "NEW GIRVI"}</span>
          </div>
        </div>
      </div>

      {/* Main Form Sections */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="space-y-6">
        {/* Section 1: Pledge Header & Schedule */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Pledge Timeline & Loan Terms</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pledge Number Field - Direct User Input */}
            <div className="space-y-1.5">
              <Label htmlFor="pledgeNumber">
                Pledge Number <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="pledgeNumber"
                placeholder="Enter Pledge # (e.g. C4682)"
                value={pledgeNumber}
                onChange={(e) => setPledgeNumber(e.target.value.toUpperCase())}
                required
                className="font-mono font-bold text-slate-900"
              />
            </div>

            {/* Pledge Date */}
            <div className="space-y-1.5">
              <Label>
                Pledge Date <span className="text-rose-600">*</span>
              </Label>
              <Input
                type="date"
                value={pledgeDate}
                onChange={(e) => setPledgeDate(e.target.value)}
                required
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label>
                Due Date <span className="text-rose-600">*</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Customer (Pledgor) Details */}
        <CustomerSelector
          customer={customer}
          onChange={handleCustomerChange}
          onSelectExisting={handleSelectExistingCustomer}
        />

        {/* Section 3: Articles Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">
                Jewellery Articles List ({articles.length})
              </h3>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddArticle}
              className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-50 shadow-sm font-semibold"
            >
              <Plus className="h-4 w-4 text-amber-600" />
              Add Another Article
            </Button>
          </div>

          {/* List of Article Cards */}
          <div className="space-y-4">
            {articles.map((article, idx) => (
              <ArticleCard
                key={idx}
                index={idx}
                article={article}
                canRemove={articles.length > 1}
                isAdmin={isAdmin}
                onChange={(updated) => handleArticleChange(idx, updated)}
                onRemove={() => handleRemoveArticle(idx)}
              />
            ))}
          </div>
        </div>

        {/* Section 4: Live Girvi Summary & Form Actions */}
        <GirviSummary
          totalArticles={totalArticles}
          totalQuantity={totalQuantity}
          totalGrossWeight={totalGrossWeight}
          totalLessWeight={totalLessWeight}
          totalNetWeight={totalNetWeight}
          totalPresentValue={totalPresentValue}
          totalLoanAmount={totalLoanAmount}
          isSubmitting={isSubmitting}
          onSave={() => handleSubmit(false)}
          onSaveDraft={() => handleSubmit(true)}
          onReset={handleReset}
          onCancel={() => router.push("/dashboard/girvi")}
        />
      </form>
    </div>
  );
}
