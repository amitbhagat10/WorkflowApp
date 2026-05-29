"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
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

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const hideNav =
    pathname.startsWith("/login") || pathname.startsWith("/auth/callback");

  useEffect(() => {
    checkPlatformAdmin();
  }, []);

  async function checkPlatformAdmin() {
    const { data } = await supabase.rpc("current_user_is_platform_admin");
    setIsPlatformAdmin(Boolean(data));
  }

  if (hideNav) {
    return null;
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

  const links = isPlatformAdmin
    ? [
        ...baseLinks,
        { href: "/admin/users", label: "Users", icon: ShieldCheck },
        { href: "/admin/workspaces", label: "Workspaces", icon: ShieldCheck },
      ]
    : baseLinks;

  return (
    <aside className="no-print hidden min-h-screen w-72 shrink-0 border-r border-stone-200 bg-[#f8f6f1]/95 p-5 shadow-sm backdrop-blur-xl md:block">
      <div className="mb-8 rounded-[1.75rem] bg-gradient-to-br from-[#2b2926] via-[#1f1e1c] to-[#11100f] p-5 text-white shadow-xl shadow-stone-900/10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b08d57]/20 text-lg font-black text-[#d8bd82]">
          WP
        </div>

        <h1 className="text-2xl font-black tracking-tight">WorkFlow Pro</h1>
        <p className="mt-1 text-sm text-stone-300">
          Field service operations platform
        </p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-stone-200">
          Operations workspace
        </div>
      </div>

      <nav className="space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                active
                  ? "bg-[#eee7d8] text-[#2b2926] shadow-sm"
                  : "text-stone-600 hover:bg-white hover:text-stone-950"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                  active
                    ? "bg-[#2b2926] text-[#d8bd82]"
                    : "bg-stone-100 text-stone-500 group-hover:bg-[#f4efe4] group-hover:text-[#2b2926]"
                }`}
              >
                <Icon size={18} />
              </span>

              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white/70 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-stone-400">
          Workspace
        </p>
        <p className="mt-2 text-sm text-stone-600">
          A secure field-service workspace for daily operations, billing, and client communication.
        </p>
      </div>

      <button
        onClick={signOut}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm font-bold text-stone-600 transition hover:bg-white"
      >
        <LogOut size={17} />
        Sign out
      </button>
    </aside>
  );
}