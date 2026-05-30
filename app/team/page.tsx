"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Technician = {
  id: string;
  workspace_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  active: boolean | null;
  created_at: string;
};

export default function TeamPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "Technician",
  });

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    setMessage("");

    const { data, error } = await supabase
      .from("technicians")
      .select("id, workspace_id, name, phone, email, role, active, created_at")
      .order("active", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTechnicians((data || []) as unknown as Technician[]);
  }

  async function createTechnician(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!form.name.trim()) {
      setMessage("Team member name is required.");
      return;
    }

    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      setMessage("Could not find your workspace. Please logout and login again.");
      return;
    }

    const { error } = await supabase.from("technicians").insert({
      workspace_id: workspaceResult.data,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      role: form.role.trim() || "Technician",
      active: true,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      name: "",
      phone: "",
      email: "",
      role: "Technician",
    });

    setShowForm(false);
    setMessage("Team member added successfully.");
    loadTeam();
  }

  function startEdit(technician: Technician) {
    setEditingId(technician.id);
    setForm({
      name: technician.name || "",
      phone: technician.phone || "",
      email: technician.email || "",
      role: technician.role || "Technician",
    });
    setShowForm(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!editingId) return;

    if (!form.name.trim()) {
      setMessage("Team member name is required.");
      return;
    }

    const { error } = await supabase
      .from("technicians")
      .update({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        role: form.role.trim() || "Technician",
      })
      .eq("id", editingId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingId(null);
    setShowForm(false);
    setForm({
      name: "",
      phone: "",
      email: "",
      role: "Technician",
    });

    setMessage("Team member updated successfully.");
    loadTeam();
  }

  async function toggleActive(technician: Technician) {
    setMessage("");

    const { error } = await supabase
      .from("technicians")
      .update({ active: !technician.active })
      .eq("id", technician.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    loadTeam();
  }

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setForm({
      name: "",
      phone: "",
      email: "",
      role: "Technician",
    });
  }

  const stats = useMemo(() => {
    return {
      total: technicians.length,
      active: technicians.filter((item) => item.active).length,
      inactive: technicians.filter((item) => !item.active).length,
    };
  }, [technicians]);

  const filteredTechnicians = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return technicians;

    return technicians.filter((item) => {
      return (
        item.name.toLowerCase().includes(search) ||
        (item.phone || "").toLowerCase().includes(search) ||
        (item.email || "").toLowerCase().includes(search) ||
        (item.role || "").toLowerCase().includes(search)
      );
    });
  }, [technicians, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Team Directory
          </p>

          <h1 className="page-title">Team</h1>

          <p className="page-subtitle">
            Manage technicians and staff used for job assignment and dispatch.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadTeam} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setShowForm((current) => !current);
            }}
            className="btn-primary"
          >
            <Plus size={16} />
            {showForm ? "Close" : "Add Team Member"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MiniStat title="Total Team" value={stats.total} />
        <MiniStat title="Active" value={stats.active} />
        <MiniStat title="Inactive" value={stats.inactive} muted />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              {editingId ? "Edit Team Member" : "Add Team Member"}
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Add technician details for dispatch and job assignment.
            </p>
          </div>

          <form onSubmit={editingId ? saveEdit : createTechnician} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Example: Raj Singh"
                />
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option>Technician</option>
                  <option>Senior Technician</option>
                  <option>Installer</option>
                  <option>Apprentice</option>
                  <option>Supervisor</option>
                  <option>Admin</option>
                  <option>Owner</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0400 000 000"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tech@example.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="btn-primary">
                <Save size={16} />
                {editingId ? "Save Changes" : "Add Team Member"}
              </button>

              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Staff & Technicians
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Search, contact and manage active team members.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <Search size={18} className="text-stone-400" />

            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team..."
              className="w-full min-w-60 border-0 bg-transparent text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400"
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTechnicians.map((technician) => (
            <TechnicianCard
              key={technician.id}
              technician={technician}
              startEdit={startEdit}
              toggleActive={toggleActive}
            />
          ))}
        </div>

        {filteredTechnicians.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-10 text-center">
            <Users className="mx-auto text-stone-400" size={30} />

            <h3 className="mt-4 text-2xl font-black text-stone-950">
              No team members found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-stone-500">
              Add technicians or staff so jobs can be assigned clearly.
            </p>

            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              Add Team Member
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function TechnicianCard({
  technician,
  startEdit,
  toggleActive,
}: {
  technician: Technician;
  startEdit: (technician: Technician) => void;
  toggleActive: (technician: Technician) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1b1a18] text-base font-black text-[#d8bd82]">
          {getInitials(technician.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black tracking-tight text-stone-950">
              {technician.name}
            </h3>

            <StatusBadge active={Boolean(technician.active)} />
          </div>

          <p className="mt-1 text-sm font-bold text-stone-500">
            {technician.role || "Technician"}
          </p>

          <div className="mt-4 grid gap-2 text-sm font-semibold text-stone-500">
            <p className="flex items-center gap-2">
              <Phone size={15} />
              {technician.phone || "No phone added"}
            </p>

            <p className="flex items-center gap-2">
              <Mail size={15} />
              {technician.email || "No email added"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-4">
        {technician.phone ? (
          <a href={`tel:${technician.phone}`} className="btn-secondary">
            <Phone size={15} />
            Call
          </a>
        ) : (
          <DisabledButton label="Call" />
        )}

        {technician.email ? (
          <a href={`mailto:${technician.email}`} className="btn-secondary">
            <Mail size={15} />
            Email
          </a>
        ) : (
          <DisabledButton label="Email" />
        )}

        <button onClick={() => startEdit(technician)} className="btn-secondary">
          Edit
        </button>

        <button onClick={() => toggleActive(technician)} className="btn-secondary">
          {technician.active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  muted,
}: {
  title: string;
  value: string | number;
  muted?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p
        className={`mt-3 text-3xl font-black tracking-tight ${
          muted ? "text-stone-500" : "text-stone-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
      }`}
    >
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function DisabledButton({ label }: { label: string }) {
  return (
    <button
      disabled
      className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-black text-stone-300"
    >
      {label}
    </button>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "TM";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}