"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { PlusCircle, Calendar, Clock, Menu } from "lucide-react";
import { Button } from "../ui/button";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime(
        now.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="no-print sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Girvi Management System
          </h1>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Pooja Jewellers • Computerized Gold Loan Vault
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200/80 text-xs font-medium text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-amber-600" />
          <span>{currentDateTime}</span>
        </div>

        {/* Quick New Pledge Button */}
        <Link href="/dashboard/girvi/new">
          <Button variant="gold" size="sm" className="gap-2 shadow-amber-500/20 font-semibold">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">New Girvi Entry</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
