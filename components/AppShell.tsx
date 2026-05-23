"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublicPage =
    pathname.startsWith("/quote-view") ||
    pathname.startsWith("/public/quotes");

  if (isPublicPage) {
    return (
      <main className="min-h-screen bg-white p-4 md:p-8">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}