import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import Nav from "@/components/Nav";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import WorkspaceBrandBar from "@/components/WorkspaceBrandBar";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "WorkFlow Pro",
  description:
    "Field service operations, work orders, scheduling, payments and invoices.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/workflow-icon.svg",
    apple: "/icons/workflow-icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "WorkFlow Pro",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b2926",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f7f3ea] text-stone-950">
        <PwaRegister />

        <AuthGuard>
          <MobileTopBar />

          <div className="min-h-screen md:flex">
            <Nav />

            <main className="min-w-0 flex-1 px-4 pb-28 pt-24 md:px-7 md:py-7">
              <div className="w-full">
                <WorkspaceBrandBar />
                {children}
              </div>
            </main>
          </div>

          <MobileBottomNav />
        </AuthGuard>
      </body>
    </html>
  );
}