"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Shield,
  Gem,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "New Girvi Pledge", href: "/dashboard/girvi/new", icon: PlusCircle, isHighlight: true },
    { name: "All Girvi Pledges", href: "/dashboard/girvi", icon: FileText },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    { name: "Payments Ledger", href: "/dashboard/payments", icon: CreditCard },
    { name: "Shop Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0F1E36] text-white border-r border-slate-800 z-30 shadow-xl">
      {/* Brand Header */}
      <div className="flex h-20 items-center px-6 border-b border-slate-800/80 gap-3 bg-[#0A1526]">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/20">
          <Gem className="h-6 w-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white leading-tight">
            Pooja Jewellers
          </span>
          <span className="text-xs font-medium text-amber-400 tracking-wider uppercase">
            Girvi Management
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto px-4 py-6">
        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? item.isHighlight
                      ? "bg-amber-500 text-slate-950 font-semibold shadow-lg shadow-amber-500/30"
                      : "bg-slate-800/90 text-white font-semibold shadow-sm border border-slate-700/60"
                    : item.isHighlight
                    ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-105",
                    isActive
                      ? item.isHighlight
                        ? "text-slate-950"
                        : "text-amber-400"
                      : item.isHighlight
                      ? "text-amber-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span className="truncate">{item.name}</span>
                {item.isHighlight && !isActive && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">
                    New
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="pt-6 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-amber-400 font-bold border border-slate-700">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-200 truncate">{user?.name || "Staff Member"}</span>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-medium text-amber-300 uppercase tracking-wider">
                  {isAdmin ? "Administrator" : "Staff Counter"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 border border-rose-900/30 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
