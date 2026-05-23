import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import MobileBottomNav from "@/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "HandyFlow",
  description: "Handyman job and payment management app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen w-full overflow-x-hidden">
          <Nav />

          <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-28 md:p-8">
            {children}
          </main>

          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}