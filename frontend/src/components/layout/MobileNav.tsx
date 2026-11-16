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
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  if (href === "/dashboard/girvi") {
    return (
      pathname === "/dashboard/girvi" ||
      (pathname.startsWith("/dashboard/girvi/") &&
        pathname !== "/dashboard/girvi/new" &&
        !pathname.startsWith("/dashboard/girvi/released"))
    );
  }
  return pathname.startsWith(href);
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  if (!isOpen) return null;

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
          name: "Customers",
          href: "/dashboard/customers",
          icon: Users,
        },
        {
          name: "Payments & Ledger",
          href: "/dashboard/payments",
          icon: CreditCard,
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
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-[#0B1326] text-white p-5 shadow-2xl flex flex-col justify-between z-50 border-r border-slate-800">
        <div className="flex-1 flex flex-col overflow-y-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-slate-950 font-bold shadow-md shadow-amber-500/20">
                <Gem className="h-5 w-5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-white uppercase tracking-tight truncate">
                  Pooja Jewellers
                </span>
                <span className="text-[10px] text-amber-400 tracking-wider font-semibold uppercase flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> EST. 1996 • GIRVI
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Links */}
          <nav className="space-y-4">
            {navGroups.map((section) => (
              <div key={section.group} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
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
                        onClick={onClose}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                          isActive
                            ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive ? "text-slate-950" : "text-slate-400"
                            )}
                          />
                          <span>{item.name}</span>
                        </div>
                        {isActive && <ChevronRight className="h-4 w-4 text-slate-950/70" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : "D"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-200 truncate">
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
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-600/20 border border-rose-500/20 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
