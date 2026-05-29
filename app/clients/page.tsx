"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Client = {
  id: string;
  workspace_id?: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  preferred_contact_method: string | null;
  created_at: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    preferred_contact_method: "phone",
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setMessage("");

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setClients((data || []) as unknown as Client[]);
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!form.name.trim()) {
      setMessage("Client name is required.");
      return;
    }

    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      setMessage("Could not find your workspace. Please logout and login again.");
      return;
    }

    const { error } = await supabase.from("clients").insert({
      workspace_id: workspaceResult.data,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      preferred_contact_method: form.preferred_contact_method,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      preferred_contact_method: "phone",
    });

    setShowForm(false);
    setMessage("Client added successfully.");
    loadClients();
  }

  const stats = useMemo(() => {
    return {
      total: clients.length,
      withPhone: clients.filter((client) => Boolean(client.phone)).length,
      withEmail: clients.filter((client) => Boolean(client.email)).length,
    };
  }, [clients]);

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return clients;

    return clients.filter((client) => {
      return (
        client.name.toLowerCase().includes(search) ||
        (client.phone || "").toLowerCase().includes(search) ||
        (client.email || "").toLowerCase().includes(search) ||
        (client.address || "").toLowerCase().includes(search)
      );
    });
  }, [clients, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Client Management
          </p>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            Keep customer details, contact preferences, and site addresses in one clean workspace.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadClients} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => setShowForm((current) => !current)}
            className="btn-primary"
          >
            <Plus size={16} />
            {showForm ? "Close" : "Add Client"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/85 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MiniStat title="Total Clients" value={stats.total} />
        <MiniStat title="With Phone" value={stats.withPhone} />
        <MiniStat title="With Email" value={stats.withEmail} />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              Add Client
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Add the customer’s contact details and site address.
            </p>
          </div>

          <form onSubmit={createClient} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Client Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Example: MM Joinery"
              />
            </div>

            <div>
              <label className="label">Preferred Contact</label>
              <select
                className="input"
                value={form.preferred_contact_method}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferred_contact_method: e.target.value,
                  })
                }
              >
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>

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
                placeholder="client@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, suburb, postcode"
              />
            </div>

            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="btn-primary">
                Save Client
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              Client Directory
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Search and open client records quickly.
            </p>
          </div>

<div className="w-full lg:max-w-md">
  <div className="flex items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-[#2b2926] focus-within:ring-4 focus-within:ring-stone-900/5">
    <Search size={18} className="shrink-0 text-stone-400" />

    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search clients..."
      className="w-full border-0 bg-transparent text-sm font-semibold text-stone-800 outline-none placeholder:text-stone-400"
    />

    {searchTerm && (
      <button
        type="button"
        onClick={() => setSearchTerm("")}
        className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-500 transition hover:bg-stone-200"
      >
        Clear
      </button>
    )}
  </div>
</div>
        </div>

        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
              <UserRound size={24} />
            </div>

            <h2 className="mt-4 text-xl font-black text-stone-900">
              No clients found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              Try changing the search term or add a new client.
            </p>

            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              Add Client
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ClientRow({ client }: { client: Client }) {
  const initials = getInitials(client.name);

  const mapUrl = client.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        client.address
      )}`
    : "";

  return (
    <div className="group rounded-[1.35rem] border border-stone-200 bg-white/75 p-4 transition hover:border-stone-300 hover:bg-white hover:shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2b2926] text-sm font-black text-[#d8bd82] shadow-sm">
            {initials}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black tracking-tight text-stone-950">
                {client.name}
              </h3>

              {client.preferred_contact_method && (
                <span className="rounded-full bg-[#f4efe4] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#2b2926]">
                  {client.preferred_contact_method}
                </span>
              )}
            </div>

            <div className="mt-2 grid gap-1 text-sm text-stone-500">
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-stone-400" />
                {client.phone || "No phone added"}
              </p>

              <p className="flex items-center gap-2">
                <Mail size={14} className="text-stone-400" />
                {client.email || "No email added"}
              </p>

              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-stone-400" />
                <span className="truncate">
                  {client.address || "No address added"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {client.phone ? (
            <a href={`tel:${client.phone}`} className="btn-secondary">
              <Phone size={15} />
              Call
            </a>
          ) : (
            <DisabledAction label="Call" />
          )}

          {client.phone ? (
            <a href={`sms:${client.phone}`} className="btn-secondary">
              <MessageSquare size={15} />
              SMS
            </a>
          ) : (
            <DisabledAction label="SMS" />
          )}

          {client.address ? (
            <a href={mapUrl} target="_blank" className="btn-secondary">
              <MapPin size={15} />
              Map
            </a>
          ) : (
            <DisabledAction label="Map" />
          )}

          <Link href={`/clients/${client.id}`} className="btn-primary">
            Open
          </Link>
        </div>
      </div>
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

function DisabledAction({ label }: { label: string }) {
  return (
    <button
      disabled
      className="inline-flex items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-300"
    >
      {label}
    </button>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "CL";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}