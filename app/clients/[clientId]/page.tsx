"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Save,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClientRecord = {
  id: string;
  workspace_id?: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  preferred_contact_method: string | null;
  created_at: string;
};

type JobRecord = {
  id: string;
  job_number: string | null;
  title: string;
  description: string | null;
  job_type: string | null;
  status: string | null;
  payment_status: string | null;
  priority: string | null;
  assigned_to: string | null;
  due_date: string | null;
  appointment_start: string | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  created_at: string;
};

type PaymentRecord = {
  id: string;
  job_id: string | null;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  new: "New",
  booked: "Booked",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = String(params.clientId);

  const [client, setClient] = useState<ClientRecord | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [message, setMessage] = useState("");
  const [showQuickJob, setShowQuickJob] = useState(false);

  const [clientForm, setClientForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    preferred_contact_method: "phone",
  });

  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    job_type: "General Service",
    priority: "medium",
    appointment_start: "",
    due_date: "",
    assigned_to: "",
    labour_cost: "",
    material_cost: "",
  });

  useEffect(() => {
    loadClient();
  }, []);

  async function loadClient() {
    setMessage("");

    const clientResult = await supabase
      .from("clients")
      .select(
        "id, workspace_id, name, phone, email, address, preferred_contact_method, created_at"
      )
      .eq("id", clientId)
      .single();

    if (clientResult.error) {
      setMessage(clientResult.error.message);
      return;
    }

    const loadedClient = clientResult.data as ClientRecord;

    setClient(loadedClient);
    setClientForm({
      name: loadedClient.name || "",
      phone: loadedClient.phone || "",
      email: loadedClient.email || "",
      address: loadedClient.address || "",
      preferred_contact_method: loadedClient.preferred_contact_method || "phone",
    });

    const jobsResult = await supabase
      .from("jobs")
      .select(
        "id, job_number, title, description, job_type, status, payment_status, priority, assigned_to, due_date, appointment_start, total_amount, amount_paid, amount_outstanding, created_at"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (!jobsResult.error) {
      const loadedJobs = (jobsResult.data || []) as unknown as JobRecord[];
      setJobs(loadedJobs);

      const jobIds = loadedJobs.map((job) => job.id);

      if (jobIds.length > 0) {
        const paymentsResult = await supabase
          .from("payments")
          .select("id, job_id, amount, payment_method, payment_date, notes, created_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false });

        if (!paymentsResult.error) {
          setPayments((paymentsResult.data || []) as unknown as PaymentRecord[]);
        }
      } else {
        setPayments([]);
      }
    }
  }

  async function saveClient(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!clientForm.name.trim()) {
      setMessage("Client name is required.");
      return;
    }

    const { error } = await supabase
      .from("clients")
      .update({
        name: clientForm.name.trim(),
        phone: clientForm.phone.trim() || null,
        email: clientForm.email.trim() || null,
        address: clientForm.address.trim() || null,
        preferred_contact_method: clientForm.preferred_contact_method,
      })
      .eq("id", clientId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Client details updated successfully.");
    loadClient();
  }

  async function createQuickJob(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!jobForm.title.trim()) {
      setMessage("Work order title is required.");
      return;
    }

    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      setMessage("Could not find your workspace. Please logout and login again.");
      return;
    }

    const labour = Number(jobForm.labour_cost || 0);
    const material = Number(jobForm.material_cost || 0);
    const total = labour + material;

    const jobNumber = `WO-${new Date().getFullYear()}-${Date.now()
      .toString()
      .slice(-6)}`;

    const { error } = await supabase.from("jobs").insert({
      workspace_id: workspaceResult.data,
      client_id: clientId,
      job_number: jobNumber,
      title: jobForm.title.trim(),
      description: jobForm.description.trim() || null,
      job_type: jobForm.job_type,
      status: jobForm.appointment_start ? "booked" : "new",
      payment_status: total > 0 ? "unpaid" : "not_required",
      priority: jobForm.priority,
      assigned_to: jobForm.assigned_to.trim() || null,
      appointment_start: jobForm.appointment_start || null,
      due_date: jobForm.due_date || null,
      labour_cost: labour,
      material_cost: material,
      total_amount: total,
      amount_paid: 0,
      amount_outstanding: total,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setJobForm({
      title: "",
      description: "",
      job_type: "General Service",
      priority: "medium",
      appointment_start: "",
      due_date: "",
      assigned_to: "",
      labour_cost: "",
      material_cost: "",
    });

    setShowQuickJob(false);
    setMessage("Work order created successfully.");
    loadClient();
  }

  const stats = useMemo(() => {
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) =>
        ["new", "booked", "in_progress"].includes(job.status || "new")
      ).length,
      totalValue: jobs.reduce((sum, job) => sum + Number(job.total_amount || 0), 0),
      outstanding: jobs.reduce(
        (sum, job) => sum + Number(job.amount_outstanding || 0),
        0
      ),
      paid: jobs.reduce((sum, job) => sum + Number(job.amount_paid || 0), 0),
    };
  }, [jobs]);

  if (message && !client) {
    return (
      <div className="card">
        <p className="text-sm font-semibold text-red-700">{message}</p>
        <Link href="/clients" className="btn-secondary mt-4">
          Back to Clients
        </Link>
      </div>
    );
  }

  if (!client) {
    return <p className="text-sm font-semibold text-stone-500">Loading client...</p>;
  }

  const mapUrl = client.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        client.address
      )}`
    : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link
            href="/clients"
            className="mb-4 inline-flex items-center gap-2 text-sm font-black text-stone-600"
          >
            <ArrowLeft size={16} />
            Back to Clients
          </Link>

          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Client Command Centre
          </p>

          <h1 className="page-title">{client.name}</h1>

          <p className="page-subtitle">
            Manage profile, site details, work orders and payment history.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadClient} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => setShowQuickJob((current) => !current)}
            className="btn-primary"
          >
            <Plus size={16} />
            New Work Order
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-5">
        <MiniStat title="Jobs" value={stats.totalJobs} />
        <MiniStat title="Active" value={stats.activeJobs} />
        <MiniStat title="Total Value" value={`$${stats.totalValue.toFixed(2)}`} />
        <MiniStat title="Paid" value={`$${stats.paid.toFixed(2)}`} />
        <MiniStat
          title="Outstanding"
          value={`$${stats.outstanding.toFixed(2)}`}
          alert={stats.outstanding > 0}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#1b1a18] text-lg font-black text-[#d8bd82]">
                {getInitials(client.name)}
              </div>

              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-stone-950">
                  {client.name}
                </h2>

                <p className="mt-1 text-sm font-semibold text-stone-500">
                  Preferred contact: {client.preferred_contact_method || "phone"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="btn-secondary justify-start">
                  <Phone size={16} />
                  Call {client.phone}
                </a>
              )}

              {client.phone && (
                <a href={`sms:${client.phone}`} className="btn-secondary justify-start">
                  <MessageSquare size={16} />
                  Send SMS
                </a>
              )}

              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="btn-secondary justify-start"
                >
                  <Mail size={16} />
                  Email {client.email}
                </a>
              )}

              {client.address && (
                <a
                  href={mapUrl}
                  target="_blank"
                  className="btn-secondary justify-start"
                >
                  <MapPin size={16} />
                  Open Site Map
                </a>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Edit Client
            </h2>

            <form onSubmit={saveClient} className="mt-6 grid gap-5">
              <div>
                <label className="label">Client Name</label>
                <input
                  className="input"
                  value={clientForm.name}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, name: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    value={clientForm.phone}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, phone: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">Address</label>
                <input
                  className="input"
                  value={clientForm.address}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, address: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Preferred Contact</label>
                <select
                  className="input"
                  value={clientForm.preferred_contact_method}
                  onChange={(e) =>
                    setClientForm({
                      ...clientForm,
                      preferred_contact_method: e.target.value,
                    })
                  }
                >
                  <option value="phone">Phone</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <button type="submit" className="btn-primary">
                <Save size={16} />
                Save Client
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {showQuickJob && (
            <div className="card">
              <h2 className="text-2xl font-black tracking-tight text-stone-950">
                Quick Work Order
              </h2>

              <p className="mt-1 text-sm font-semibold text-stone-500">
                Create a new job directly for this client.
              </p>

              <form onSubmit={createQuickJob} className="mt-6 grid gap-5">
                <div>
                  <label className="label">Title</label>
                  <input
                    className="input"
                    value={jobForm.title}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, title: e.target.value })
                    }
                    placeholder="Example: Repair front door lock"
                  />
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="input min-h-24"
                    value={jobForm.description}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, description: e.target.value })
                    }
                    placeholder="Job instructions, issue details, access notes..."
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="label">Work Type</label>
                    <select
                      className="input"
                      value={jobForm.job_type}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, job_type: e.target.value })
                      }
                    >
                      <option>General Service</option>
                      <option>Emergency Callout</option>
                      <option>Repair</option>
                      <option>Installation</option>
                      <option>Inspection</option>
                      <option>Maintenance</option>
                      <option>Quote Visit</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Priority</label>
                    <select
                      className="input"
                      value={jobForm.priority}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, priority: e.target.value })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="label">Appointment</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={jobForm.appointment_start}
                      onChange={(e) =>
                        setJobForm({
                          ...jobForm,
                          appointment_start: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Due Date</label>
                    <input
                      className="input"
                      type="date"
                      value={jobForm.due_date}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, due_date: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Assigned To</label>
                    <input
                      className="input"
                      value={jobForm.assigned_to}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, assigned_to: e.target.value })
                      }
                      placeholder="Technician"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="label">Labour Estimate</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={jobForm.labour_cost}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, labour_cost: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Material Estimate</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={jobForm.material_cost}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, material_cost: e.target.value })
                      }
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary">
                  <Plus size={16} />
                  Create Work Order
                </button>
              </form>
            </div>
          )}

          <div className="card">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Job History
            </h2>

            <div className="mt-6 space-y-4">
              {jobs.map((job) => (
                <JobHistoryCard key={job.id} job={job} />
              ))}

              {jobs.length === 0 && (
                <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-8 text-center">
                  <Wrench className="mx-auto text-stone-400" size={28} />

                  <h3 className="mt-4 text-xl font-black text-stone-950">
                    No work orders yet
                  </h3>

                  <p className="mt-2 text-sm font-semibold text-stone-500">
                    Create the first work order for this client.
                  </p>

                  <button
                    onClick={() => setShowQuickJob(true)}
                    className="btn-primary mt-5"
                  >
                    New Work Order
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Payment History
            </h2>

            <div className="mt-6 space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-black text-stone-950">
                        ${Number(payment.amount || 0).toFixed(2)}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-stone-500">
                        {payment.payment_method || "Payment"} ·{" "}
                        {payment.payment_date
                          ? new Date(payment.payment_date).toLocaleDateString()
                          : new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <CreditCard className="text-stone-400" size={20} />
                  </div>

                  {payment.notes && (
                    <p className="mt-2 text-sm font-semibold text-stone-500">
                      {payment.notes}
                    </p>
                  )}
                </div>
              ))}

              {payments.length === 0 && (
                <p className="rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-stone-500">
                  No payments recorded for this client yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function JobHistoryCard({ job }: { job: JobRecord }) {
  return (
    <div className="rounded-[1.35rem] border border-stone-200 bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-stone-600">
          {job.job_number || "Work Order"}
        </span>

        <StatusBadge value={job.status || "new"} />
        <PriorityBadge value={job.priority || "medium"} />
      </div>

      <h3 className="text-lg font-black tracking-tight text-stone-950">
        {job.title}
      </h3>

      <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-500 md:grid-cols-2">
        <p className="flex items-center gap-2">
          <BriefcaseBusiness size={15} />
          {job.job_type || "General Service"}
        </p>

        <p className="flex items-center gap-2">
          <CalendarDays size={15} />
          {job.appointment_start
            ? new Date(job.appointment_start).toLocaleString()
            : "No appointment"}
        </p>

        <p className="flex items-center gap-2">
          <UserRound size={15} />
          {job.assigned_to || "Unassigned"}
        </p>

        <p className="flex items-center gap-2">
          <CreditCard size={15} />
          Outstanding ${Number(job.amount_outstanding || 0).toFixed(2)}
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link href={`/jobs/${job.id}`} className="btn-secondary">
          Open Job
        </Link>

        <Link href={`/invoices/${job.id}`} className="btn-secondary">
          Invoice
        </Link>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  alert,
}: {
  title: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p
        className={`mt-3 text-2xl font-black tracking-tight ${
          alert ? "text-red-600" : "text-stone-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    new: "bg-stone-100 text-stone-700",
    booked: "bg-[#f3ead6] text-[#1b1a18]",
    in_progress: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    invoiced: "bg-purple-50 text-purple-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        styles[value] || styles.new
      }`}
    >
      {statusLabels[value] || value}
    </span>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    low: "bg-stone-100 text-stone-600",
    medium: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        styles[value] || styles.medium
      }`}
    >
      {priorityLabels[value] || value}
    </span>
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