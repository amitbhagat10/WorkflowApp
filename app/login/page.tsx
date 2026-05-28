"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    const approvalCheck = await supabase.rpc("is_email_approved", {
      input_email: normalizedEmail,
    });

    if (approvalCheck.error) {
      setLoading(false);
      setMessage(approvalCheck.error.message);
      return;
    }

    if (!approvalCheck.data) {
      setLoading(false);
      setMessage(
        "This email is not approved to access WorkFlow Pro. Please contact the admin."
      );
      return;
    }

    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Login link sent. Please check your email.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-md rounded-[1.75rem] border border-stone-200 bg-white/90 p-8 shadow-xl shadow-stone-900/10 backdrop-blur">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2b2926] text-lg font-black text-[#d8bd82]">
          WP
        </div>

        <h1 className="text-3xl font-black tracking-tight text-stone-950">
          WorkFlow Pro
        </h1>

        <p className="mt-2 text-sm text-stone-500">
          Sign in to manage field operations, work orders, clients, and payments.
        </p>

        <form onSubmit={signIn} className="mt-6 space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <button disabled={loading} className="btn-primary w-full">
            {loading ? "Checking..." : "Send secure login link"}
          </button>
        </form>

        {message && (
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-700">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}