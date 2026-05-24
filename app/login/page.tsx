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

    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-blue-700">HandyFlow</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in to manage clients, jobs, payments, and appointments.
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
            {loading ? "Sending..." : "Send login link"}
          </button>
        </form>

        {message && (
          <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}