"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  const publicRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth/callback");

  useEffect(() => {
    checkAccess();
  }, [pathname]);

  async function checkAccess() {
    if (publicRoute) {
      setChecking(false);
      return;
    }

    setChecking(true);

    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data.session;

    if (!session) {
      router.replace("/login");
      return;
    }

    const approvalResult = await supabase.rpc("current_user_is_approved");

    if (approvalResult.error || !approvalResult.data) {
      await supabase.auth.signOut({ scope: "global" });

      if (typeof window !== "undefined") {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-")) {
            localStorage.removeItem(key);
          }
        });
      }

      router.replace("/login");
      return;
    }

    setChecking(false);
  }

  if (publicRoute) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f2] p-6">
        <div className="rounded-[1.75rem] border border-stone-200 bg-white/90 p-8 text-center shadow-xl shadow-stone-900/10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2b2926] text-lg font-black text-[#d8bd82]">
            WP
          </div>

          <h1 className="text-2xl font-black text-stone-950">
            Checking access
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Please wait while WorkFlow Pro verifies your session.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}