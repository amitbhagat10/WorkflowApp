"use client";

import { ReactNode, useEffect, useState } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type BlockedAccess = {
  reason: string;
  workspace_name?: string;
  status?: string;
  plan?: string;
};

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const publicRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth/callback");

  const [checking, setChecking] = useState(!publicRoute);
  const [allowed, setAllowed] = useState(publicRoute);
  const [blocked, setBlocked] = useState<BlockedAccess | null>(null);

  useEffect(() => {
    if (publicRoute) {
      setChecking(false);
      setAllowed(true);
      setBlocked(null);
      return;
    }

    let mounted = true;

    async function clearLocalSession() {
      try {
  await supabase.auth.signOut({ scope: "local" });
} catch {
  // Ignore stale refresh token errors
}

      if (typeof window !== "undefined") {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-")) {
            localStorage.removeItem(key);
          }
        });

        sessionStorage.clear();
      }
    }

    async function checkAccess(showLoader: boolean) {
      if (showLoader) {
        setChecking(true);
      }

      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session;

      if (!session) {
        await clearLocalSession();

        if (mounted) {
          setAllowed(false);
          setBlocked(null);
          setChecking(false);
          router.replace("/login");
        }

        return;
      }

      const accessResult = await supabase.rpc("current_user_access_status");

      if (accessResult.error) {
        await clearLocalSession();

        if (mounted) {
          setAllowed(false);
          setBlocked(null);
          setChecking(false);
          router.replace("/login");
        }

        return;
      }

      const access = accessResult.data as BlockedAccess & { allowed?: boolean };

      if (!access?.allowed) {
        const blockReasons = [
          "trial_expired",
          "workspace_expired",
          "workspace_suspended",
          "workspace_inactive",
        ];

        if (blockReasons.includes(access?.reason || "")) {
          if (mounted) {
            setAllowed(false);
            setBlocked(access);
            setChecking(false);
          }

          return;
        }

        await clearLocalSession();

        if (mounted) {
          setAllowed(false);
          setBlocked(null);
          setChecking(false);
          router.replace("/login");
        }

        return;
      }

      if (mounted) {
        setAllowed(true);
        setBlocked(null);
        setChecking(false);
      }
    }

    checkAccess(true);

    const focusCheck = () => {
      checkAccess(false);
    };

    const interval = window.setInterval(() => {
      checkAccess(false);
    }, 5 * 60 * 1000);

    window.addEventListener("focus", focusCheck);

    const authListener = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAllowed(false);
        setBlocked(null);
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", focusCheck);
      authListener.data.subscription.unsubscribe();
    };
  }, [publicRoute, router]);

  async function signOut() {
    try {
  await supabase.auth.signOut({ scope: "local" });
} catch {
  // Ignore stale refresh token errors
}

    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      });

      sessionStorage.clear();
    }

    router.replace("/login");
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
            Opening workspace
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Verifying your secure session.
          </p>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f2] p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-xl shadow-stone-900/10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <ShieldAlert size={30} />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-stone-400">
            Workspace Access
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950">
            {blocked.reason === "trial_expired"
              ? "Trial has expired"
              : blocked.reason === "workspace_suspended"
              ? "Workspace suspended"
              : "Workspace unavailable"}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-500">
            {blocked.workspace_name || "This workspace"} is currently not active.
            Please contact the WorkFlow Pro administrator to reactivate access or
            upgrade the workspace.
          </p>

          <div className="mt-6 rounded-2xl bg-stone-50 p-4 text-left">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="font-bold text-stone-500">Workspace</span>
                <span className="font-black text-stone-900">
                  {blocked.workspace_name || "Not available"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="font-bold text-stone-500">Status</span>
                <span className="font-black capitalize text-stone-900">
                  {(blocked.status || blocked.reason).replace("_", " ")}
                </span>
              </div>

              {blocked.plan && (
                <div className="flex justify-between gap-4">
                  <span className="font-bold text-stone-500">Plan</span>
                  <span className="font-black capitalize text-stone-900">
                    {blocked.plan}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button onClick={signOut} className="btn-primary mt-6">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}