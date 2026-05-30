"use client";

import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    prepareSession();
  }, []);

  async function prepareSession() {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(error.message);
          return;
        }

        window.history.replaceState({}, document.title, "/auth/update-password");
      }

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setMessage("Password setup session was not found. Please request a new password setup link.");
        return;
      }

      setReady(true);
    } catch {
      setMessage("Could not prepare password setup session.");
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Password updated successfully. Redirecting...");

    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f4f1] px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white/95 p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1b1a18] text-lg font-black text-[#d8bd82]">
            WP
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">
              Password Setup
            </p>
            <h1 className="text-2xl font-black tracking-tight text-stone-950">
              WorkFlow Pro
            </h1>
          </div>
        </div>

        {!ready ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-700">
            {message || "Preparing secure password setup..."}
          </div>
        ) : (
          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                <Lock size={18} className="text-stone-400" />
                <input
                  className="w-full border-0 bg-transparent text-sm font-bold text-stone-900 outline-none"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                <Lock size={18} className="text-stone-400" />
                <input
                  className="w-full border-0 bg-transparent text-sm font-bold text-stone-900 outline-none"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <button disabled={loading} type="submit" className="btn-primary w-full">
              <ShieldCheck size={16} />
              {loading ? "Saving..." : "Update Password"}
            </button>

            {message && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-700">
                {message}
              </div>
            )}
          </form>
        )}
      </div>
    </main>
  );
}