"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Client } from "@/types/app";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [contactFilter, setContactFilter] = useState("all");
  const [addressFilter, setAddressFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    }

    if (data) {
      setClients(data as Client[]);
    }

    setLoading(false);
  }

  async function addClient() {
    setMessage("");

    if (!form.name.trim()) {
      setMessage("Client name is required.");
      return;
    }

    const { error } = await supabase.from("clients").insert({
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      address_source: "manual",
      notes: form.notes || null,
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
      notes: "",
    });

    setMessage("Client saved successfully.");
    loadClients();
  }

  function clearFilters() {
    setSearchTerm("");
    setContactFilter("all");
    setAddressFilter("all");
    setSortBy("newest");
  }

  function mapUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  }

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    let result = clients.filter((client) => {
      const matchesSearch =
        !search ||
        client.name.toLowerCase().includes(search) ||
        (client.phone || "").toLowerCase().includes(search) ||
        (client.email || "").toLowerCase().includes(search) ||
        (client.address || "").toLowerCase().includes(search) ||
        (client.notes || "").toLowerCase().includes(search);

      let matchesContact = true;

      if (contactFilter === "has_phone") {
        matchesContact = Boolean(client.phone);
      }

      if (contactFilter === "no_phone") {
        matchesContact = !client.phone;
      }

      if (contactFilter === "has_email") {
        matchesContact = Boolean(client.email);
      }

      if (contactFilter === "no_email") {
        matchesContact = !client.email;
      }

      let matchesAddress = true;

      if (addressFilter === "has_address") {
        matchesAddress = Boolean(client.address);
      }

      if (addressFilter === "no_address") {
        matchesAddress = !client.address;
      }

      return matchesSearch && matchesContact && matchesAddress;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === "oldest") {
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });

    return result;
  }, [clients, searchTerm, contactFilter, addressFilter, sortBy]);

  const summary = useMemo(() => {
    return {
      totalClients: clients.length,
      filteredClients: filteredClients.length,
      withPhone: clients.filter((client) => Boolean(client.phone)).length,
      withEmail: clients.filter((client) => Boolean(client.email)).length,
      withAddress: clients.filter((client) => Boolean(client.address)).length,
    };
  }, [clients, filteredClients]);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-gray-500">
            Add clients, search records, and open full job/payment history.
          </p>
        </div>

        <button onClick={loadClients} className="btn-secondary">
          Refresh
        </button>
      </div>

      {message && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="mb-6 grid gap-5 md:grid-cols-5">
        <MetricCard title="Total Clients" value={summary.totalClients} />
        <MetricCard title="Filtered" value={summary.filteredClients} />
        <MetricCard title="With Phone" value={summary.withPhone} />
        <MetricCard title="With Email" value={summary.withEmail} />
        <MetricCard title="With Address" value={summary.withAddress} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-4 text-xl font-bold">Add Client</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Client Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="John Smith"
              />
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
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="client@email.com"
              />
            </div>

            <div>
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                placeholder="Client address"
              />
              <p className="mt-2 text-xs text-gray-500">
                Address autocomplete is paused for now. Manual entry still works
                with the Map button.
              </p>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                placeholder="Any important notes"
              />
            </div>

            <button onClick={addClient} className="btn-primary w-full">
              Save Client
            </button>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold">Search & Filters</h2>
                <p className="text-sm text-gray-500">
                  Find clients by name, phone, email, address, or notes.
                </p>
              </div>

              <button onClick={clearFilters} className="btn-secondary">
                Clear Filters
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label">Search Clients</label>
                <input
                  className="input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, phone, email, address..."
                />
              </div>

              <div>
                <label className="label">Contact Filter</label>
                <select
                  className="input"
                  value={contactFilter}
                  onChange={(e) => setContactFilter(e.target.value)}
                >
                  <option value="all">All contacts</option>
                  <option value="has_phone">Has phone</option>
                  <option value="no_phone">Missing phone</option>
                  <option value="has_email">Has email</option>
                  <option value="no_email">Missing email</option>
                </select>
              </div>

              <div>
                <label className="label">Address Filter</label>
                <select
                  className="input"
                  value={addressFilter}
                  onChange={(e) => setAddressFilter(e.target.value)}
                >
                  <option value="all">All addresses</option>
                  <option value="has_address">Has address</option>
                  <option value="no_address">Missing address</option>
                </select>
              </div>

              <div>
                <label className="label">Sort By</label>
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-bold">Client List</h2>

            {loading && <p>Loading clients...</p>}

            <div className="space-y-3">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>

                      <p className="text-sm text-gray-500">
                        {client.phone || "No phone"} ·{" "}
                        {client.email || "No email"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {client.address || "No address"}
                      </p>

                      {client.notes && (
                        <p className="mt-2 text-sm text-gray-600">
                          {client.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {client.phone && (
                        <a
                          href={`tel:${client.phone}`}
                          className="btn-secondary"
                        >
                          Call
                        </a>
                      )}

                      {client.phone && (
                        <a
                          href={`sms:${client.phone}`}
                          className="btn-secondary"
                        >
                          SMS
                        </a>
                      )}

                      {client.address && (
                        <a
                          href={mapUrl(client.address)}
                          target="_blank"
                          className="btn-secondary"
                        >
                          Map
                        </a>
                      )}

                      <Link
                        href={`/clients/${client.id}`}
                        className="btn-primary"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {!loading && filteredClients.length === 0 && (
                <div className="rounded-xl bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No clients match the selected filters.
                  </p>

                  <button
                    onClick={clearFilters}
                    className="btn-secondary mt-4"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {!loading && clients.length === 0 && (
                <p className="text-sm text-gray-500">No clients yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}