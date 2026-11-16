"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Pledge, Customer, PledgeArticle, BusinessSettings } from "@/types";
import { formatIndianCurrency, formatWeight, numberToIndianWords } from "@/lib/number-to-words";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Printer,
  Download,
  ArrowLeft,
  Gem,
  CheckCircle,
  Shield,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function GirviReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const receiptRef = useRef<HTMLDivElement | null>(null);

  const [pledge, setPledge] = useState<Pledge | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [articles, setArticles] = useState<PledgeArticle[]>([]);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!id) return;

    api
      .getPledgeReceipt(id)
      .then((res) => {
        if (res.success && res.data) {
          setPledge(res.data.pledge);
          setCustomer(res.data.customer);
          setArticles(res.data.articles || []);
          setBusiness(res.data.business);
        }
      })
      .catch((err) => {
        toast.error("Failed to load receipt details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPdf(true);
    toast.info("Generating PDF document...");

    try {
      const element = receiptRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, Math.min(pageHeight, imgHeight));
      pdf.save(`Girvi_Receipt_${pledge?.pledgeNumber || id}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. You can also use Print -> Save as PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          <p className="text-sm text-slate-500 font-medium">Preparing printable receipt...</p>
        </div>
      </div>
    );
  }

  if (!pledge || !customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Pledge data not available.</p>
        <Link href="/dashboard/girvi">
          <Button variant="outline" className="mt-4">
            Back to Girvi List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="no-print flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/girvi/${pledge.id}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dossier
            </Button>
          </Link>
          <span className="text-sm font-bold text-slate-800">
            A4 Girvi Pawn Receipt #{pledge.pledgeNumber}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="gap-2 font-semibold"
          >
            <Download className="h-4 w-4 text-amber-600" />
            {isGeneratingPdf ? "Building PDF..." : "Download PDF"}
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={handlePrint}
            className="gap-2 font-bold shadow-md shadow-amber-500/20"
          >
            <Printer className="h-4 w-4" />
            Print Receipt (A4)
          </Button>
        </div>
      </div>

      {/* Printable Receipt Paper Container */}
      <div
        ref={receiptRef}
        className="print-container bg-white rounded-xl border border-slate-300 p-8 sm:p-10 shadow-lg text-slate-900 font-sans space-y-6"
        style={{ minHeight: "297mm" }}
      >
        {/* Receipt Header */}
        <div className="border-b-2 border-slate-900 pb-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-amber-400 font-bold border border-amber-500/40">
                <Gem className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 leading-tight">
                  {business?.businessName || "Pooja Jewellers"}
                </h1>
                <p className="text-xs font-semibold text-amber-700 tracking-wider uppercase">
                  {business?.tagline || "Govt. Approved Pawn Brokers & Gold Loan Specialist"}
                </p>
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5">
              <span className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-[11px]">
                ORIGINAL PLEDGE RECEIPT
              </span>
              <p className="text-slate-500 text-[10px]">Form No. 1A (Section 7 Rules)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200">
            <div>
              <strong>Address:</strong> {business?.addressLine1}, {business?.city} - {business?.pincode}
            </div>
            <div>
              <strong>Tel:</strong> {business?.phone} | <strong>Email:</strong> {business?.email}
            </div>
            <div>
              <strong>Lic No:</strong> {business?.licenseNumber} | <strong>GSTIN:</strong> {business?.gstin}
            </div>
          </div>
        </div>

        {/* Customer & Pledge Reference Box */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl border border-slate-300 bg-slate-50/50 text-xs">
          {/* Customer Details */}
          <div className="col-span-2 space-y-1.5 border-r border-slate-200 pr-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Pledgor (Customer) Information
            </span>
            <div className="flex items-start gap-3">
              {customer.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customer.photoUrl}
                  alt="Customer"
                  className="h-16 w-16 rounded object-cover border border-slate-300 shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                  No Photo
                </div>
              )}
              <div className="space-y-0.5">
                <p className="font-bold text-sm text-slate-950">{customer.name}</p>
                <p className="text-slate-600">
                  Relation: <strong>{customer.relationType} {customer.relationName || "N/A"}</strong>
                </p>
                <p className="text-slate-600">
                  Mobile: <strong>{customer.mobileNumber}</strong>
                </p>
                <p className="text-slate-600 text-[11px] leading-snug">
                  Address: {customer.address}, {customer.city}
                </p>
              </div>
            </div>
          </div>

          {/* Pledge Identifiers */}
          <div className="space-y-1.5 pl-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Girvi Voucher Details
            </span>
            <div>
              <span className="text-slate-500 block text-[10px]">Pledge Number:</span>
              <span className="font-mono font-bold text-sm text-slate-950">{pledge.pledgeNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Pledge Date:</span>
              <span className="font-semibold text-slate-800">
                {new Date(pledge.pledgeDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Due Date:</span>
              <span className="font-bold text-rose-800">
                {new Date(pledge.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Interest Rate:</span>
              <span className="font-semibold text-slate-800">{pledge.interestRatePercent}% / month</span>
            </div>
          </div>
        </div>

        {/* Itemized Articles Table */}
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Pledged Jewellery Ornaments Specification
          </span>
          <table className="w-full border border-slate-300 text-xs">
            <thead className="bg-slate-100 font-bold uppercase text-slate-700 text-[10px] border-b border-slate-300">
              <tr>
                <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                <th className="p-2 border-r border-slate-300 text-left">Description of Article</th>
                <th className="p-2 border-r border-slate-300 text-center">Purity</th>
                <th className="p-2 border-r border-slate-300 text-right w-12">Qty</th>
                <th className="p-2 border-r border-slate-300 text-right">Gross (g)</th>
                <th className="p-2 border-r border-slate-300 text-right">Less (g)</th>
                <th className="p-2 border-r border-slate-300 text-right">Net (g)</th>
                <th className="p-2 border-r border-slate-300 text-right">Valuation (₹)</th>
                <th className="p-2 text-right">Loan Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {articles.map((art, idx) => (
                <tr key={art.id || idx}>
                  <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300 font-medium">{art.itemName}</td>
                  <td className="p-2 border-r border-slate-300 text-center">{art.purity}</td>
                  <td className="p-2 border-r border-slate-300 text-right">{art.quantity}</td>
                  <td className="p-2 border-r border-slate-300 text-right font-mono">{formatWeight(art.grossWeight)}</td>
                  <td className="p-2 border-r border-slate-300 text-right font-mono">{formatWeight(art.lessWeight)}</td>
                  <td className="p-2 border-r border-slate-300 text-right font-mono font-bold text-slate-900">
                    {formatWeight(art.netWeight)}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-right font-mono">
                    {formatIndianCurrency(art.presentValue)}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-slate-950">
                    {formatIndianCurrency(art.loanAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <tr>
                <td colSpan={3} className="p-2 border-r border-slate-300 text-right uppercase">
                  Total Summary:
                </td>
                <td className="p-2 border-r border-slate-300 text-right">{pledge.totalArticlesCount}</td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">{formatWeight(pledge.totalGrossWeight)}</td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">{formatWeight(pledge.totalLessWeight)}</td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-slate-950 font-black">
                  {formatWeight(pledge.totalNetWeight)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {formatIndianCurrency(pledge.totalPresentValue)}
                </td>
                <td className="p-2 text-right font-mono font-black text-slate-950">
                  {formatIndianCurrency(pledge.totalLoanAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Loan In Words Banner */}
        <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 text-xs">
          <span className="font-bold text-slate-600 block text-[10px] uppercase">
            Total Loan Disbursed Amount in Words:
          </span>
          <p className="text-sm font-bold text-slate-950">{pledge.loanAmountWords}</p>
        </div>

        {/* Terms & Conditions */}
        <div className="space-y-1 text-[10px] text-slate-600 leading-tight border-t border-slate-200 pt-3">
          <span className="font-bold uppercase tracking-wider text-slate-800">
            Terms, Conditions & Legal Undertaking:
          </span>
          <p>
            1. I hereby confirm that the pledged ornaments are my personal absolute property and free from all encumbrances.
          </p>
          <p>
            2. The pawnbroker shall store the ornaments in bank-grade safe vaults. Ornaments can be redeemed upon presentation of this original receipt.
          </p>
          <p>
            3. Interest is payable monthly. In default of payment of interest or redemption within 12 months, the pawnbroker reserves statutory right of auction after legal notice.
          </p>
        </div>

        {/* Signatures & Stamp Area */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-xs border-t border-slate-300">
          <div className="text-center space-y-10">
            <div className="h-10 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 italic">(Thumb Impression / Signature)</span>
            </div>
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-900">{customer.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Signature of Pledgor (Borrower)</p>
            </div>
          </div>

          <div className="text-center space-y-10">
            <div className="h-10 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 italic">For Pooja Jewellers</span>
            </div>
            <div className="border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-900">{business?.ownerName || "Authorized Signatory"}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Authorized Counter Officer & Seal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
