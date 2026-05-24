"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(error.message);
        return;
      }
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data.session) {
      setMessage("Login session was not created. Please try signing in again.");
      return;
    }

    router.replace("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-blue-700">Work Flow Pro</h1>
        <p className="mt-3 text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}