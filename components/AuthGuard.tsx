"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ACCESS_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [blockedMessage, setBlockedMessage] = useState("");

  const lastAccessCheckRef = useRef(0);
  const hasValidAccessRef = useRef(false);
  const isCheckingRef = useRef(false);

  const publicPaths = [
    "/login",
    "/auth/callback",
    "/auth/update-password",
    "/auth/change-password",
  ];

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (isPublicPath) {
      setChecking(false);
      setBlockedMessage("");
      return;
    }

    const recentlyChecked =
      hasValidAccessRef.current &&
      Date.now() - lastAccessCheckRef.current < ACCESS_CHECK_INTERVAL_MS;

    if (recentlyChecked) {
      setChecking(false);
      return;
    }

    checkAccess({
      showLoader: !hasValidAccessRef.current,
      force: false,
    });
  }, [pathname]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        hasValidAccessRef.current = false;
        lastAccessCheckRef.current = 0;
        router.replace("/login");
        return;
      }

      if (!isPublicPath && ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        checkAccess({
          showLoader: false,
          force: true,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isPublicPath]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (isPublicPath) return;

      const stale =
        Date.now() - lastAccessCheckRef.current > ACCESS_CHECK_INTERVAL_MS;

      if (stale) {
        checkAccess({
          showLoader: false,
          force: true,
        });
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPublicPath]);

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

  async function checkAccess({
    showLoader,
    force,
  }: {
    showLoader: boolean;
    force: boolean;
  }) {
    if (isCheckingRef.current) return;

    const recentlyChecked =
      hasValidAccessRef.current &&
      Date.now() - lastAccessCheckRef.current < ACCESS_CHECK_INTERVAL_MS;

    if (!force && recentlyChecked) {
      setChecking(false);
      return;
    }

    isCheckingRef.current = true;

    if (showLoader) {
      setChecking(true);
    }

    setBlockedMessage("");

    try {
      const sessionResult = await supabase.auth.getSession();

      if (!sessionResult.data.session) {
        hasValidAccessRef.current = false;
        lastAccessCheckRef.current = 0;
        router.replace("/login");
        return;
      }

      const accessResult = await supabase.rpc("current_user_access_status");

      if (accessResult.error) {
        const fallbackResult = await supabase.rpc("current_user_is_approved");

        if (fallbackResult.error || !fallbackResult.data) {
          hasValidAccessRef.current = false;
          lastAccessCheckRef.current = 0;
          await clearLocalSession();
          router.replace("/login");
          return;
        }
      } else {
        const status = String(accessResult.data || "");

        if (status !== "allowed") {
          hasValidAccessRef.current = false;
          lastAccessCheckRef.current = 0;
          setBlockedMessage(getBlockedMessage(status));
          return;
        }
      }

      const mustChangeResult = await supabase.rpc(
        "current_user_must_change_password"
      );

      if (!mustChangeResult.error && mustChangeResult.data === true) {
        hasValidAccessRef.current = false;
        router.replace("/auth/change-password");
        return;
      }

      hasValidAccessRef.current = true;
      lastAccessCheckRef.current = Date.now();
      setBlockedMessage("");
    } finally {
      isCheckingRef.current = false;
      setChecking(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f1] px-4">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-stone-900" />
          <p className="text-sm font-black text-stone-700">Checking access...</p>
        </div>
      </div>
    );
  }

  if (blockedMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f1] px-4">
        <div className="max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-xl font-black text-red-700">
            !
          </div>

          <h1 className="text-2xl font-black tracking-tight text-stone-950">
            Access unavailable
          </h1>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-stone-500">
            {blockedMessage}
          </p>

          <button
            onClick={async () => {
              await clearLocalSession();
              router.replace("/login");
            }}
            className="btn-primary mt-6"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function getBlockedMessage(status: string) {
  const messages: Record<string, string> = {
    not_signed_in: "Please sign in again.",
    not_approved: "This email is not approved for WorkFlow Pro.",
    inactive: "This user has been deactivated.",
    suspended: "This workspace has been suspended.",
    expired: "This workspace is no longer active.",
    trial_expired: "This trial workspace has expired.",
  };

  return (
    messages[status] ||
    "Your account is not currently allowed to access this workspace."
  );
}