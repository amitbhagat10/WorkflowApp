"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Login link sent. Please check your email.");
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
      <div className="card">
        <h1 className="text-2xl font-bold">Login to HandyFlow</h1>

        <p className="mt-2 text-sm text-gray-500">
          Enter your email and we will send you a secure login link.
        </p>

        <div className="mt-6">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          onClick={login}
          disabled={loading || !email}
          className="btn-primary mt-4 w-full"
        >
          {loading ? "Sending..." : "Send login link"}
        </button>

        {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
      </div>
    </div>
  );
}