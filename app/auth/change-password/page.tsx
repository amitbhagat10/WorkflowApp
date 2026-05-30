"use client";

import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      window.location.href = "/login";
      return;
    }

    setReady(true);
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

    const passwordResult = await supabase.auth.updateUser({
      password,
    });

    if (passwordResult.error) {
      setLoading(false);
      setMessage(passwordResult.error.message);
      return;
    }

    const clearResult = await supabase.rpc("clear_current_user_must_change_password");

    if (clearResult.error) {
      setLoading(false);
      setMessage(clearResult.error.message);
      return;
    }

    setMessage("Password changed successfully. Redirecting...");

    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
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
              Required Action
            </p>
            <h1 className="text-2xl font-black tracking-tight text-stone-950">
              Change Password
            </h1>
          </div>
        </div>

        <p className="mb-6 text-sm font-semibold leading-relaxed text-stone-500">
          For security, please replace your temporary password with a private password only you know.
        </p>

        {!ready ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-700">
            Preparing secure password change...
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
              {loading ? "Saving..." : "Change Password"}
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