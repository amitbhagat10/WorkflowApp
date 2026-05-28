"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClientOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type WorkOrder = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  job_type: string | null;
  status: string;
  payment_status: string;
  labour_cost: number | null;
  material_cost: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  appointment_start: string | null;
  notes: string | null;
  created_at: string;
  clients?: ClientOption | null;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    client_id: "",
    title: "",
    description: "",
    job_type: "",
    status: "booked",
    labour_cost: "",
    material_cost: "",
    appointment_start: "",
    notes: "",
  });

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    setMessage("");

    const clientsResult = await supabase
      .from("clients")
      .select("id, name, phone, email, address")
      .order("name", { ascending: true });

    if (clientsResult.error) {
      setMessage(clientsResult.error.message);
      return;
    }

    const jobsResult = await supabase
      .from("jobs")
      .select(
        `
        *,
        clients (
          id,
          name,
          phone,
          email,
          address
        )
      `
      )
      .order("created_at", { ascending: false });

    if (jobsResult.error) {
      setMessage(jobsResult.error.message);
      return;
    }

    setClients((clientsResult.data || []) as ClientOption[]);
    setJobs((jobsResult.data || []) as WorkOrder[]);
  }

  async function createJob(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!form.client_id) {
      setMessage("Please select a client.");
      return;
    }

    if (!form.title.trim()) {
      setMessage("Work order title is required.");
      return;
    }

    const { error } = await supabase.from("jobs").insert({
      client_id: form.client_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      job_type: form.job_type.trim() || null,
      status: form.status,
      labour_cost: Number(form.labour_cost || 0),
      material_cost: Number(form.material_cost || 0),
      appointment_start: form.appointment_start || null,
      notes: form.notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      client_id: "",
      title: "",
      description: "",
      job_type: "",
      status: "booked",
      labour_cost: "",
      material_cost: "",
      appointment_start: "",
      notes: "",
    });

    setShowForm(false);
    setMessage("Work order created successfully.");
    loadPageData();
  }

  async function updateStatus(jobId: string, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", jobId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Work order status updated.");
    loadPageData();
  }

  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.description || "").toLowerCase().includes(search) ||
        (job.job_type || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.clients?.phone || "").toLowerCase().includes(search) ||
        (job.clients?.address || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      active: jobs.filter(
        (job) => job.status !== "completed" && job.status !== "cancelled"
      ).length,
      completed: jobs.filter((job) => job.status === "completed").length,
      outstanding: jobs.reduce(
        (sum, job) => sum + Number(job.amount_outstanding || 0),
        0
      ),
    };
  }, [jobs]);

  function mapUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Work Management
          </p>
          <h1 className="page-title">Work Orders</h1>
          <p className="page-subtitle">
            Create, schedule, and monitor field work without clutter.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadPageData} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => setShowForm((current) => !current)}
            className="btn-primary"
          >
            <Plus size={16} />
            {showForm ? "Close Form" : "New Work Order"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Total Work Orders" value={stats.total} />
        <MiniStat title="Active Work" value={stats.active} />
        <MiniStat title="Completed" value={stats.completed} />
        <MiniStat
          title="Outstanding"
          value={`$${stats.outstanding.toFixed(2)}`}
          danger
        />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              New Work Order
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Add the work details, client, schedule, and estimated costs.
            </p>
          </div>

          <form onSubmit={createJob} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Client</label>
              <select
                className="input"
                value={form.client_id}
                onChange={(e) =>
                  setForm({ ...form, client_id: e.target.value })
                }
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="booked">Booked</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="label">Work Order Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Fix leaking tap"
              />
            </div>

            <div>
              <label className="label">Work Type</label>
              <input
                className="input"
                value={form.job_type}
                onChange={(e) =>
                  setForm({ ...form, job_type: e.target.value })
                }
                placeholder="Plumbing, electrical, repair..."
              />
            </div>

            <div>
              <label className="label">Appointment</label>
              <input
                className="input"
                type="datetime-local"
                value={form.appointment_start}
                onChange={(e) =>
                  setForm({ ...form, appointment_start: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Labour Cost</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.labour_cost}
                  onChange={(e) =>
                    setForm({ ...form, labour_cost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label">Material Cost</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.material_cost}
                  onChange={(e) =>
                    setForm({ ...form, material_cost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input min-h-24"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the work required..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Internal Notes</label>
              <textarea
                className="input min-h-20"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes for the business..."
              />
            </div>

            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="btn-primary">
                Save Work Order
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
              Work Order Directory
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Search, filter, and open active work quickly.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search work orders..."
              />
            </div>

            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="booked">Booked</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-stone-200 bg-white/75 p-4 transition hover:bg-white hover:shadow-sm"
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_270px]">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
                      <Wrench size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-stone-900">
                          {job.title}
                        </h3>

                        <StatusBadge value={job.status} />
                        <PaymentBadge value={job.payment_status} />
                      </div>

                      <p className="mt-1 text-sm text-stone-500">
                        {job.clients?.name || "No client"} ·{" "}
                        {job.job_type || "General work"}
                      </p>

                      <p className="mt-1 text-sm text-stone-500">
                        {job.clients?.address || "No address added"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-stone-500">
                        <span className="rounded-full bg-stone-100 px-3 py-1">
                          Created {new Date(job.created_at).toLocaleDateString()}
                        </span>

                        <span className="rounded-full bg-[#f4efe4] px-3 py-1 text-[#2b2926]">
                          {job.appointment_start
                            ? new Date(job.appointment_start).toLocaleString()
                            : "No appointment"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-stone-50/80 p-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <AmountBlock
                      label="Total"
                      value={Number(job.total_amount || 0)}
                    />
                    <AmountBlock
                      label="Paid"
                      value={Number(job.amount_paid || 0)}
                    />
                    <AmountBlock
                      label="Due"
                      value={Number(job.amount_outstanding || 0)}
                      danger
                    />
                  </div>

                  <div className="mt-4 grid gap-2">
                    <select
                      className="input"
                      value={job.status}
                      onChange={(e) => updateStatus(job.id, e.target.value)}
                    >
                      <option value="booked">Booked</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      {job.clients?.phone && (
                        <a href={`tel:${job.clients.phone}`} className="btn-secondary">
                          <Phone size={15} />
                          Call
                        </a>
                      )}

                      {job.clients?.phone && (
                        <a href={`sms:${job.clients.phone}`} className="btn-secondary">
                          <MessageSquare size={15} />
                          SMS
                        </a>
                      )}

                      {job.clients?.address && (
                        <a
                          href={mapUrl(job.clients.address)}
                          target="_blank"
                          className="btn-secondary"
                        >
                          <MapPin size={15} />
                          Map
                        </a>
                      )}

                      <Link href={`/jobs/${job.id}`} className="btn-primary">
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center">
            <p className="text-sm font-semibold text-stone-500">
              No work orders found.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              Create Work Order
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({
  title,
  value,
  danger,
}: {
  title: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p
        className={`mt-3 text-3xl font-black tracking-tight ${
          danger ? "text-red-700" : "text-stone-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AmountBlock({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-stone-500">{label}</p>
      <p
        className={`mt-1 text-sm font-black ${
          danger ? "text-red-700" : "text-stone-900"
        }`}
      >
        ${value.toFixed(2)}
      </p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const style =
    value === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : value === "cancelled"
      ? "bg-red-50 text-red-700"
      : "bg-[#f4efe4] text-[#2b2926]";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${style}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}

function PaymentBadge({ value }: { value: string }) {
  const style =
    value === "paid"
      ? "bg-emerald-50 text-emerald-700"
      : value === "overdue"
      ? "bg-red-50 text-red-700"
      : "bg-stone-100 text-stone-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${style}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}