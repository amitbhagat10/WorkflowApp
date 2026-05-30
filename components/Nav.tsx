"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const baseLinks = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/jobs", label: "Work Orders", icon: Wrench },
  { href: "/calendar", label: "Schedule", icon: CalendarDays },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/notifications", label: "Messages", icon: Bell },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

const platformLinks = [
  { href: "/admin/users", label: "Users", icon: ShieldCheck },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const hideNav =
    pathname.startsWith("/login") || pathname.startsWith("/auth/callback");

  useEffect(() => {
    if (!hideNav) {
      checkPlatformAdmin();
    }
  }, [hideNav]);

  async function checkPlatformAdmin() {
    const result = await supabase.rpc("current_user_is_platform_admin");

    if (!result.error) {
      setIsPlatformAdmin(Boolean(result.data));
    }
  }

  async function signOut() {
    await supabase.auth.signOut({ scope: "global" });

    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      });

      sessionStorage.clear();
    }

    router.replace("/login");
    router.refresh();
  }

  if (hideNav) return null;

  const links = isPlatformAdmin ? [...baseLinks, ...platformLinks] : baseLinks;

  return (
    <aside className="app-sidebar no-print hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-[#23211e] px-4 py-5 shadow-[18px_0_45px_rgba(27,26,24,0.18)] md:sticky md:top-0 md:block">
      <div className="flex h-full flex-col">
        <Link href="/" className="app-sidebar-brand group">
          <div className="rounded-[1.55rem] border border-white/10 bg-white/[0.08] p-4 shadow-xl shadow-black/15 transition group-hover:bg-white/[0.11]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d8bd82] text-sm font-black text-[#23211e] shadow-sm">
                WP
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight text-white">
                  WorkFlow Pro
                </h1>
                <p className="text-xs font-bold text-[#e7e2d7]">
                  Field service platform
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-black/25 px-3 py-2">
              <Sparkles size={14} className="text-[#d8bd82]" />
              <p className="text-xs font-black uppercase tracking-wide text-[#f3efe6]">
                Operations workspace
              </p>
            </div>
          </div>
        </Link>

        <nav className="mt-6 space-y-1.5">
          {links.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-sidebar-link group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-extrabold transition ${
                  active
                    ? "app-sidebar-link-active bg-[#d8bd82] shadow-lg shadow-black/20"
                    : "app-sidebar-link-normal hover:bg-white/[0.12]"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    active
                      ? "bg-[#23211e] text-[#d8bd82]"
                      : "bg-white/[0.12] text-[#f5f1e8] group-hover:bg-white/[0.18] group-hover:text-white"
                  }`}
                >
                  <Icon size={17} />
                </span>

                <span className="app-sidebar-link-label tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

<div className="mt-auto space-y-3 pt-6">
  <button
    onClick={signOut}
    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.1] px-4 py-3 text-sm font-black text-white transition hover:bg-white/[0.16]"
  >
    <LogOut size={16} />
    Logout
  </button>

  <div className="px-2 text-center">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
      WorkFlow Pro
    </p>
  </div>
</div>
      </div>
    </aside>
  );
}