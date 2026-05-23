"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  MoreHorizontal,
  Users,
  Wrench,
} from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/jobs", label: "Jobs", icon: Wrench },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="no-print fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur md:hidden">
      <div className="grid grid-cols-5 pb-safe">
        {links.map((link) => {
          const Icon = link.icon;

          const active =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold ${
                active ? "text-blue-700" : "text-gray-500"
              }`}
            >
              <div
                className={`rounded-full px-3 py-1 ${
                  active ? "bg-blue-50" : ""
                }`}
              >
                <Icon size={19} />
              </div>

              <span className="max-w-full truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}