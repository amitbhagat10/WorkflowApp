"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Users,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const links = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/invoices", label: "Invoices", icon: FileText },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const hideNav =
    pathname.startsWith("/login") || pathname.startsWith("/auth/callback");

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
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="no-print hidden min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white/95 p-5 shadow-sm md:block">
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg shadow-blue-900/10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl font-black">
          HF
        </div>

        <h1 className="text-2xl font-black tracking-tight">Work Flow Pro</h1>
        <p className="mt-1 text-sm text-blue-100">Field Operations</p>

        <div className="mt-4 rounded-2xl bg-white/12 px-3 py-2 text-xs font-semibold text-blue-50">
          Live business workspace
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
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white"
                }`}
              >
                <Icon size={18} />
              </span>

              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Quick Tip
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Use Calendar on mobile to manage today’s jobs on-site.
        </p>
      </div>

      <button
        onClick={signOut}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
      >
        <LogOut size={17} />
        Sign out
      </button>
    </aside>
  );
}