"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import WorkspaceBrandBar from "@/components/WorkspaceBrandBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const authPages = [
    "/login",
    "/auth/callback",
    "/auth/update-password",
    "/auth/change-password",
  ];

  const isAuthPage = authPages.some((path) => pathname.startsWith(path));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <MobileTopBar />

      <div className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(216,189,130,0.10),transparent_24%),radial-gradient(circle_at_0%_0%,rgba(27,26,24,0.08),transparent_28%),linear-gradient(135deg,#f8f8f5_0%,#f1f2ef_45%,#e8e7e2_100%)] md:flex">
        <Nav />

        <main className="min-w-0 flex-1 px-4 pb-28 pt-24 md:px-8 md:py-7">
          <WorkspaceBrandBar />
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </>
  );
}