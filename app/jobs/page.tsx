"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import TechnicianSelect from "@/components/TechnicianSelect";

type ClientOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type JobRecord = {
  id: string;
  job_number: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  job_type: string | null;
  status: string | null;
  payment_status: string | null;
  priority: string | null;
  assigned_to: string | null;
  appointment_start: string | null;
  due_date: string | null;
  labour_cost: number | null;
  material_cost: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  created_at: string;
  clients?: ClientOption | null;
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const [form, setForm] = useState({
    client_id: "",
    title: "",
    description: "",
    job_type: "General Service",
    status: "new",
    priority: "medium",
    assigned_to: "",
    appointment_start: "",
    due_date: "",
    labour_cost: "",
    material_cost: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setMessage("");

    const clientsResult = await supabase
      .from("clients")
      .select("id, name, phone, email, address")
      .order("name");

    if (!clientsResult.error) {
      setClients((clientsResult.data || []) as unknown as ClientOption[]);
    }

    const jobsResult = await supabase
      .from("jobs")
      .select(
        `
        id,
        job_number,
        client_id,
        title,
        description,
        job_type,
        status,
        payment_status,
        priority,
        assigned_to,
        appointment_start,
        due_date,
        labour_cost,
        material_cost,
        total_amount,
        amount_paid,
        amount_outstanding,
        created_at,
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

    setJobs((jobsResult.data || []) as unknown as JobRecord[]);
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

    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      setMessage("Could not find your workspace. Please logout and login again.");
      return;
    }

    const labour = Number(form.labour_cost || 0);
    const material = Number(form.material_cost || 0);
    const total = labour + material;

    const jobNumber = `WO-${new Date().getFullYear()}-${Date.now()
      .toString()
      .slice(-6)}`;

    const { error } = await supabase.from("jobs").insert({
      workspace_id: workspaceResult.data,
      client_id: form.client_id,
      job_number: jobNumber,
      title: form.title.trim(),
      description: form.description.trim() || null,
      job_type: form.job_type,
      status: form.appointment_start ? "booked" : form.status,
      payment_status: total > 0 ? "unpaid" : "not_required",
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      appointment_start: form.appointment_start || null,
      due_date: form.due_date || null,
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

    setForm({
      client_id: "",
      title: "",
      description: "",
      job_type: "General Service",
      status: "new",
      priority: "medium",
      assigned_to: "",
      appointment_start: "",
      due_date: "",
      labour_cost: "",
      material_cost: "",
    });

    setShowForm(false);
    setMessage("Work order created successfully.");
    loadData();
  }

  async function moveToNextStatus(job: JobRecord) {
    const currentStatus = job.status || "new";

    const nextStatus =
      currentStatus === "new"
        ? "booked"
        : currentStatus === "booked"
        ? "in_progress"
        : currentStatus === "in_progress"
        ? "completed"
        : currentStatus === "completed"
        ? "invoiced"
        : currentStatus;

    if (nextStatus === currentStatus) return;

    const { error } = await supabase
      .from("jobs")
      .update({ status: nextStatus })
      .eq("id", job.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    loadData();
  }

  const stats = useMemo(() => {
    const activeJobs = jobs.filter((job) =>
      ["new", "booked", "in_progress"].includes(job.status || "new")
    );

    const outstanding = jobs.reduce(
      (sum, job) => sum + Number(job.amount_outstanding || 0),
      0
    );

    const urgent = jobs.filter((job) => job.priority === "urgent").length;

    const completed = jobs.filter((job) =>
      ["completed", "invoiced"].includes(job.status || "")
    ).length;

    return {
      total: jobs.length,
      active: activeJobs.length,
      urgent,
      completed,
      outstanding,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          !["completed", "invoiced", "cancelled"].includes(job.status || "")) ||
        job.status === statusFilter;

      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.job_number || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.assigned_to || "").toLowerCase().includes(search) ||
        (job.job_type || "").toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [jobs, searchTerm, statusFilter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Work Order Command Centre
          </p>

          <h1 className="page-title">Work Orders</h1>

          <p className="page-subtitle">
            Create, assign, schedule and track field service jobs.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadData} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => setShowForm((current) => !current)}
            className="btn-primary"
          >
            <Plus size={16} />
            {showForm ? "Close" : "New Work Order"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-5">
        <MiniStat title="Total Jobs" value={stats.total} icon={<Wrench size={18} />} />
        <MiniStat title="Active" value={stats.active} icon={<Clock size={18} />} />
        <MiniStat
          title="Urgent"
          value={stats.urgent}
          icon={<AlertTriangle size={18} />}
          alert={stats.urgent > 0}
        />
        <MiniStat
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle2 size={18} />}
        />
        <MiniStat
          title="Outstanding"
          value={`$${stats.outstanding.toFixed(2)}`}
          icon={<CreditCard size={18} />}
          alert={stats.outstanding > 0}
        />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Create Work Order
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Add the job details, assign a team member and schedule the work.
            </p>
          </div>

          <form onSubmit={createJob} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Client</label>
                <select
                  className="input"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
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
                <label className="label">Work Type</label>
                <select
                  className="input"
                  value={form.job_type}
                  onChange={(e) => setForm({ ...form, job_type: e.target.value })}
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
            </div>

            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Example: Repair leaking tap"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-28"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Job notes, site instructions, access details..."
              />
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="new">New</option>
                  <option value="booked">Booked</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="label">Priority</label>
                <select
                  className="input"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
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

              <div>
                <label className="label">Due Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="label">Assigned To</label>
                <TechnicianSelect
                  value={form.assigned_to}
                  onChange={(value) => setForm({ ...form, assigned_to: value })}
                />
              </div>

              <div>
                <label className="label">Labour Estimate</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.labour_cost}
                  onChange={(e) => setForm({ ...form, labour_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label">Material Estimate</label>
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="btn-primary">
                Create Work Order
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
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Job Register
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Search, filter and open work orders.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <Search size={18} className="text-stone-400" />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search jobs..."
                className="w-full min-w-60 border-0 bg-transparent text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>

            <select
              className="input min-w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="active">Active jobs</option>
              <option value="all">All jobs</option>
              <option value="new">New</option>
              <option value="booked">Booked</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} moveToNextStatus={moveToNextStatus} />
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-10 text-center">
            <Wrench className="mx-auto text-stone-400" size={30} />

            <h3 className="mt-4 text-2xl font-black text-stone-950">
              No work orders found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-stone-500">
              Create a work order or change the filters.
            </p>

            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              New Work Order
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function JobCard({
  job,
  moveToNextStatus,
}: {
  job: JobRecord;
  moveToNextStatus: (job: JobRecord) => void;
}) {
  const outstanding = Number(job.amount_outstanding || 0);
  const canMove = !["invoiced", "cancelled"].includes(job.status || "");

  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <div className="grid gap-5 xl:grid-cols-[1fr_300px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge value={job.status || "new"} />
            <PriorityBadge value={job.priority || "medium"} />

            <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-stone-600">
              {job.job_number || "Work Order"}
            </span>
          </div>

          <h3 className="truncate text-xl font-black tracking-tight text-stone-950">
            {job.title}
          </h3>

          <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-500 md:grid-cols-2">
            <p className="flex items-center gap-2">
              <UserRound size={15} />
              {job.clients?.name || "No client"}
            </p>

            <p className="flex items-center gap-2">
              <Wrench size={15} />
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

            {job.clients?.address && (
              <p className="flex items-center gap-2 md:col-span-2">
                <MapPin size={15} />
                {job.clients.address}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.25rem] bg-stone-50 p-4">
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <AmountBlock label="Total" value={Number(job.total_amount || 0)} />
            <AmountBlock label="Paid" value={Number(job.amount_paid || 0)} />
            <AmountBlock label="Due" value={outstanding} alert={outstanding > 0} />
          </div>

          <div className="grid gap-2">
            {canMove && (
              <button onClick={() => moveToNextStatus(job)} className="btn-secondary">
                Move Next
              </button>
            )}

            <Link href={`/jobs/${job.id}`} className="btn-primary">
              Open Job
              <ArrowRight size={15} />
            </Link>

            <Link href={`/invoices/${job.id}`} className="btn-secondary">
              Invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  icon,
  alert,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-stone-500">{title}</p>

          <p
            className={`mt-3 text-2xl font-black tracking-tight ${
              alert ? "text-red-600" : "text-stone-950"
            }`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            alert ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function AmountBlock({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-stone-400">
        {label}
      </p>

      <p
        className={`mt-1 text-base font-black ${
          alert ? "text-red-600" : "text-stone-950"
        }`}
      >
        ${value.toFixed(2)}
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