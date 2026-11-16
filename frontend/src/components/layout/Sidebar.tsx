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
  Lock,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  const navGroups = [
    {
      group: "MAIN OVERVIEW",
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
          badge: null,
        },
        {
          name: "New Girvi Pledge",
          href: "/dashboard/girvi/new",
          icon: PlusCircle,
          isAction: true,
          badge: "Form 1A",
        },
      ],
    },
    {
      group: "GIRVI & LOAN OPS",
      items: [
        {
          name: "All Girvi Pledges",
          href: "/dashboard/girvi",
          icon: FileText,
          badge: null,
        },
        {
          name: "Customers",
          href: "/dashboard/customers",
          icon: Users,
          badge: null,
        },
        {
          name: "Payments & Ledger",
          href: "/dashboard/payments",
          icon: CreditCard,
          badge: null,
        },
      ],
    },
    {
      group: "CONFIGURATION",
      items: [
        {
          name: "Shop Settings",
          href: "/dashboard/settings",
          icon: Settings,
          badge: null,
        },
      ],
    },
  ];

  return (
    <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0B1326] text-white border-r border-slate-800/80 z-30 shadow-2xl">
      {/* Brand Header */}
      <div className="flex h-20 items-center px-5 border-b border-slate-800/70 bg-[#080E1C] gap-3.5">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/40">
          <Gem className="h-6 w-6 stroke-[2.3] text-slate-950" />
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#080E1C]" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black tracking-tight text-white uppercase truncate">
              Pooja Jewellers
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400/90 tracking-wider uppercase">
            <Sparkles className="h-2.5 w-2.5 text-amber-400" />
            <span>EST. 1996 • GIRVI SYSTEM</span>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto px-3.5 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="space-y-5">
          {navGroups.map((section) => (
            <div key={section.group} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 select-none">
                {section.group}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  if (item.isAction) {
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "group relative flex items-center justify-between px-3 py-2.5 my-1.5 rounded-xl text-xs font-bold transition-all duration-200 border",
                          isActive
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25 ring-1 ring-amber-300"
                            : "bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 text-amber-300 hover:text-white hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-400/60 shadow-sm"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                              isActive ? "text-slate-950" : "text-amber-400"
                            )}
                          />
                          <span>{item.name}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                              isActive
                                ? "bg-slate-950/20 text-slate-950 border border-slate-950/30"
                                : "bg-amber-400 text-slate-950 shadow-sm"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
                        isActive
                          ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 font-bold border-l-2 border-amber-400 pl-2.5 shadow-sm"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-amber-400"
                              : "text-slate-400 group-hover:text-slate-200"
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Vault & Legal Status Card */}
        <div className="rounded-xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-3.5 border border-slate-800/90 space-y-2 shadow-inner">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-200 leading-tight">
                Vault Security Active
              </span>
              <span className="text-[9px] text-emerald-400 font-medium">
                ● 24/7 Fireproof Computerized
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">
            Licensed Pawn Broking & Gold Loan specialist under state regulations.
          </p>
        </div>

        {/* User Card & Logout */}
        <div className="pt-3 border-t border-slate-800/70 space-y-2.5">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : "D"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-100 truncate">
                {user?.name || "Deepak"}
              </span>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-amber-400" />
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                  {isAdmin ? "Administrator" : "Counter Staff"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
