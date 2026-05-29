import WorkspaceBrandBar from "@/components/WorkspaceBrandBar";
import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileTopBar from "@/components/MobileTopBar";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "WorkFlow Pro",
  description: "Field service operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
<AuthGuard>
  <div className="flex min-h-screen w-full overflow-x-hidden">
    <Nav />

    <MobileTopBar />

    <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-28 pt-24 md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        <WorkspaceBrandBar />
        {children}
      </div>
    </main>

    <MobileBottomNav />
  </div>
</AuthGuard>
      </body>
    </html>
  );
}