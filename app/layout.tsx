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
  themeColor: "#1b1a18",
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
      <body className="bg-[#f3f4f1] text-stone-950 antialiased">
        <PwaRegister />

        <AuthGuard>
          <MobileTopBar />

          <div className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(216,189,130,0.10),transparent_24%),radial-gradient(circle_at_0%_0%,rgba(27,26,24,0.08),transparent_28%),linear-gradient(135deg,#f8f8f5_0%,#f1f2ef_45%,#e8e7e2_100%)] md:flex">
            <Nav />

            <main className="min-w-0 flex-1 px-4 pb-28 pt-24 md:px-8 md:py-7">
              <WorkspaceBrandBar />
              {children}
            </main>
          </div>

          <MobileBottomNav />
        </AuthGuard>
      </body>
    </html>
  );
}