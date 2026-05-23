"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Home,
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

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="no-print hidden min-h-screen w-64 border-r border-gray-200 bg-white p-5 md:block">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-700">HandyFlow</h1>
        <p className="text-sm text-gray-500">Handyman Manager</p>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        className="mt-8 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        Sign out
      </button>
    </aside>
  );
}