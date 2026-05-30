"use client";

import { useState } from "react";
import { Lock, Mail, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkApprovedEmail(inputEmail: string) {
    const { data, error } = await supabase.rpc("is_email_approved", {
      input_email: inputEmail.trim().toLowerCase(),
    });

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        setMessage("Please enter your email address.");
        return;
      }

      if (!password) {
        setMessage("Please enter your password.");
        return;
      }

      const approved = await checkApprovedEmail(cleanEmail);

      if (!approved) {
        setMessage("This email is not approved for WorkFlow Pro.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function sendPasswordReset() {
    setMessage("");
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        setMessage("Please enter your email address first.");
        return;
      }

      const approved = await checkApprovedEmail(cleanEmail);

      if (!approved) {
        setMessage("This email is not approved for WorkFlow Pro.");
        return;
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/update-password`
          : "https://workflow.softinfotechsolutions.com/auth/update-password";

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Password setup link sent. Open your email once, set your password, then login here normally."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not send password setup email."
      );
    } finally {
      setLoading(false);
    }
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
              Secure Portal
            </p>
            <h1 className="text-2xl font-black tracking-tight text-stone-950">
              WorkFlow Pro
            </h1>
          </div>
        </div>

        <p className="mb-6 text-sm font-semibold leading-relaxed text-stone-500">
          Sign in to manage field operations, work orders, clients and payments.
        </p>

        <form onSubmit={signInWithPassword} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <Mail size={18} className="text-stone-400" />
              <input
                className="w-full border-0 bg-transparent text-sm font-bold text-stone-900 outline-none"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <Lock size={18} className="text-stone-400" />
              <input
                className="w-full border-0 bg-transparent text-sm font-bold text-stone-900 outline-none"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>

          <button disabled={loading} type="submit" className="btn-primary w-full">
            <ShieldCheck size={16} />
            {loading ? "Please wait..." : "Sign in"}
          </button>
        </form>

        <button
          disabled={loading}
          onClick={sendPasswordReset}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-black text-stone-700 transition hover:bg-white"
        >
          <Send size={16} />
          Set / reset password
        </button>

        {message && (
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-700">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}