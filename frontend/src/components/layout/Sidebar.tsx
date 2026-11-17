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
  CheckCircle2,
  Landmark,
  Undo2,
  Boxes,
} from "lucide-react";

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (href === "/dashboard/girvi/new") {
    return pathname === "/dashboard/girvi/new";
  }
  if (href === "/dashboard/girvi/released") {
    return (
      pathname === "/dashboard/girvi/released" ||
      pathname.startsWith("/dashboard/girvi/released/")
    );
  }
  if (href === "/dashboard/stock") {
    return pathname === "/dashboard/stock" || pathname.startsWith("/dashboard/stock/");
  }
  if (href === "/dashboard/girvi") {
    return (
      pathname === "/dashboard/girvi" ||
      (pathname.startsWith("/dashboard/girvi/") &&
        pathname !== "/dashboard/girvi/new" &&
        !pathname.startsWith("/dashboard/girvi/released"))
    );
  }
  if (href === "/dashboard/repledge/released") {
    return (
      pathname === "/dashboard/repledge/released" ||
      pathname.startsWith("/dashboard/repledge/released/")
    );
  }
  if (href === "/dashboard/repledge") {
    return (
      pathname === "/dashboard/repledge" ||
      (pathname.startsWith("/dashboard/repledge/") &&
        !pathname.startsWith("/dashboard/repledge/released"))
    );
  }
  return pathname.startsWith(href);
}

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
        },
        {
          name: "New Girvi Pledge",
          href: "/dashboard/girvi/new",
          icon: PlusCircle,
          badge: "Form 1A",
        },
      ],
    },
    {
      group: "GIRVI & LOAN OPS",
      items: [
        {
          name: "Active Pledges",
          href: "/dashboard/girvi",
          icon: FileText,
          badge: "Active",
        },
        {
          name: "Released Pledges",
          href: "/dashboard/girvi/released",
          icon: CheckCircle2,
          badge: "Released",
        },
        {
          name: "Locker Stock Audit",
          href: "/dashboard/stock",
          icon: Boxes,
          badge: "तिजोरी",
        },
      ],
    },
    {
      group: "BANK RE-PLEDGE (री-प्लेज)",
      items: [
        {
          name: "Re-Pledge Girvi",
          href: "/dashboard/repledge",
          icon: Landmark,
          badge: "Bank Girvi",
        },
        {
          name: "Re-Pledge Release",
          href: "/dashboard/repledge/released",
          icon: Undo2,
          badge: "Released",
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
          <span className="text-[15px] font-black tracking-tight text-white uppercase truncate">
            Pooja Jewellers
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400/90 tracking-wider uppercase">
            <Sparkles className="h-2.5 w-2.5 text-amber-400" />
            <span>EST. 1996 • GIRVI PORTAL</span>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto px-3 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="space-y-5">
          {navGroups.map((section) => (
            <div key={section.group} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 select-none">
                {section.group}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = isItemActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150",
                        isActive
                          ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                          : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-slate-950"
                              : "text-slate-400 group-hover:text-amber-400"
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {isActive ? (
                        <ChevronRight className="h-4 w-4 text-slate-950/70 shrink-0" />
                      ) : (
                        item.badge && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:text-slate-200">
                            {item.badge}
                          </span>
                        )
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
            Govt. Licensed Pawnbrokers & Gold Loan specialist under state regulations.
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
            onClick={() => logout()}
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
