import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "WorkFlow Pro",
  description: "Field service workflow management",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1b1a18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}