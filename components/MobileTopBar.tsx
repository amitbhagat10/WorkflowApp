"use client";

import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const hideBar =
    pathname.startsWith("/login") || pathname.startsWith("/auth/callback");

  if (hideBar) {
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

      sessionStorage.clear();
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="no-print fixed left-0 right-0 top-0 z-50 border-b border-stone-200 bg-[#f8f6f1]/95 px-4 py-3 shadow-sm backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2b2926] text-sm font-black text-[#d8bd82]">
            WP
          </div>

          <div>
            <p className="text-sm font-black text-stone-950">WorkFlow Pro</p>
            <p className="text-xs font-semibold text-stone-500">
              Secure workspace
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/90 px-3 py-2 text-xs font-black text-stone-700 shadow-sm"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </div>
  );
}