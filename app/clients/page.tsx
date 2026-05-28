"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  preferred_contact_method?: string | null;
  created_at: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);

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

    setClients((data || []) as Client[]);
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!form.name.trim()) {
      setMessage("Client name is required.");
      return;
    }

    const { error } = await supabase.from("clients").insert({
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
    setMessage("Client created successfully.");
    loadClients();
  }

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

  const stats = useMemo(() => {
    return {
      total: clients.length,
      withPhone: clients.filter((client) => client.phone).length,
      withEmail: clients.filter((client) => client.email).length,
    };
  }, [clients]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Client Management
          </p>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            Manage customer records, contact details, and service history from one clean view.
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
            {showForm ? "Close Form" : "Add Client"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MiniStat title="Total Clients" value={stats.total} />
        <MiniStat title="Phone Contacts" value={stats.withPhone} />
        <MiniStat title="Email Contacts" value={stats.withEmail} />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              New Client
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Add the essential details now. More information can be managed later.
            </p>
          </div>

          <form onSubmit={createClient} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Client Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="e.g. John Smith"
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
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="04xx xxx xxx"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="client@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                placeholder="Street address, suburb, state"
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
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              Client Directory
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Search and open client records quickly.
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients..."
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl border border-stone-200 bg-white/75 p-4 transition hover:bg-white hover:shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
                      <User size={20} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-stone-900">
                        {client.name}
                      </h3>

                      <p className="mt-1 text-sm text-stone-500">
                        {client.address || "No address added"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {client.preferred_contact_method && (
                          <span className="rounded-full bg-[#f4efe4] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#2b2926]">
                            {client.preferred_contact_method}
                          </span>
                        )}

                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                          Added{" "}
                          {new Date(client.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="btn-secondary">
                      <Phone size={15} />
                      Call
                    </a>
                  )}

                  {client.phone && (
                    <a href={`sms:${client.phone}`} className="btn-secondary">
                      <MessageSquare size={15} />
                      SMS
                    </a>
                  )}

                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="btn-secondary"
                    >
                      <Mail size={15} />
                      Email
                    </a>
                  )}

                  <Link href={`/clients/${client.id}`} className="btn-primary">
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center">
            <p className="text-sm font-semibold text-stone-500">
              No clients found.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              Add First Client
            </button>
          </div>
        )}
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