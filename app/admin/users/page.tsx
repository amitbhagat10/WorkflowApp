"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ApprovedUser = {
  id: string;
  email: string;
  role: "admin" | "staff";
  active: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    email: "",
    role: "staff" as "admin" | "staff",
  });

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const sessionResult = await supabase.auth.getSession();
    const email = sessionResult.data.session?.user.email || "";
    setCurrentEmail(email.toLowerCase());

    const adminResult = await supabase.rpc("current_user_is_admin");

    if (adminResult.error) {
      setMessage(adminResult.error.message);
      setLoading(false);
      return;
    }

    if (!adminResult.data) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data, error } = await supabase
      .from("approved_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setUsers((data || []) as ApprovedUser[]);
    setLoading(false);
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const normalizedEmail = form.email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage("Email is required.");
      return;
    }

    const { error } = await supabase.from("approved_users").insert({
      email: normalizedEmail,
      role: form.role,
      active: true,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({ email: "", role: "staff" });
    setMessage("Approved user added.");
    loadPage();
  }

  async function updateRole(user: ApprovedUser, role: "admin" | "staff") {
    setMessage("");

    const { error } = await supabase
      .from("approved_users")
      .update({ role })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("User role updated.");
    loadPage();
  }

  async function toggleActive(user: ApprovedUser) {
    setMessage("");

    if (user.email.toLowerCase() === currentEmail && user.active) {
      setMessage("You cannot deactivate your own admin access.");
      return;
    }

    const { error } = await supabase
      .from("approved_users")
      .update({ active: !user.active })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(user.active ? "User deactivated." : "User activated.");
    loadPage();
  }

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.active).length,
      admins: users.filter((user) => user.role === "admin").length,
      staff: users.filter((user) => user.role === "staff").length,
    };
  }, [users]);

  if (loading) {
    return <p className="text-sm text-stone-500">Loading access control...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <ShieldCheck size={24} />
        </div>

        <h1 className="mt-4 text-2xl font-black text-stone-900">
          Admin access required
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
          You are signed in, but your account is not configured as an admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Access Control
          </p>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            Approve staff, assign admin access, and block users from the platform.
          </p>
        </div>

        <button onClick={loadPage} className="btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Approved Users" value={stats.total} />
        <MiniStat title="Active" value={stats.active} />
        <MiniStat title="Admins" value={stats.admins} />
        <MiniStat title="Staff" value={stats.staff} />
      </section>

      <section className="card">
        <div className="mb-5">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Add Approved User
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Only emails added here can request a secure login link.
          </p>
        </div>

        <form onSubmit={addUser} className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="staff@example.com"
            />
          </div>

          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as "admin" | "staff" })
              }
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-end">
            <button type="submit" className="btn-primary">
              <UserPlus size={16} />
              Add User
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="mb-5">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Approved Users
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Active users can access shared business records. Deactivated users are blocked.
          </p>
        </div>

        <div className="grid gap-4">
          {users.map((user) => {
            const isSelf = user.email.toLowerCase() === currentEmail;

            return (
              <div
                key={user.id}
                className="rounded-2xl border border-stone-200 bg-white/75 p-4"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px] lg:items-center">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
                      <Users size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-stone-900">
                          {user.email}
                        </h3>

                        {isSelf && (
                          <span className="rounded-full bg-[#f4efe4] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#2b2926]">
                            You
                          </span>
                        )}

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                            user.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {user.active ? "Active" : "Blocked"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-stone-500">
                        Added {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <select
                    className="input"
                    value={user.role}
                    onChange={(e) =>
                      updateRole(user, e.target.value as "admin" | "staff")
                    }
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    onClick={() => toggleActive(user)}
                    className={user.active ? "btn-danger" : "btn-secondary"}
                  >
                    {user.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-stone-950">
        {value}
      </p>
    </div>
  );
}