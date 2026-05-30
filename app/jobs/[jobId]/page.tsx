"use client";
import TechnicianSelect from "@/components/TechnicianSelect";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  Receipt,
  RefreshCw,
  Save,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClientInfo = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type JobRecord = {
  id: string;
  workspace_id: string | null;
  client_id: string | null;
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
  labour_cost: number | null;
  material_cost: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  created_at: string;
  clients?: ClientInfo | null;
};

type PaymentRecord = {
  id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
};

const statusSteps = ["new", "booked", "in_progress", "completed", "invoiced"];

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

export default function JobDetailPage() {
  const params = useParams();
  const jobId = String(params.jobId);

  const [job, setJob] = useState<JobRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
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

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "Card",
    notes: "",
  });

  useEffect(() => {
    loadJob();
  }, []);

  async function loadJob() {
    setMessage("");

    const jobResult = await supabase
      .from("jobs")
      .select(
        `
        id,
        workspace_id,
        client_id,
        job_number,
        title,
        description,
        job_type,
        status,
        payment_status,
        priority,
        assigned_to,
        due_date,
        appointment_start,
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
      .eq("id", jobId)
      .single();

    if (jobResult.error) {
      setMessage(jobResult.error.message);
      return;
    }

    const loadedJob = jobResult.data as unknown as JobRecord;

    setJob(loadedJob);
    setEditForm({
      title: loadedJob.title || "",
      description: loadedJob.description || "",
      job_type: loadedJob.job_type || "General Service",
      status: loadedJob.status || "new",
      priority: loadedJob.priority || "medium",
      assigned_to: loadedJob.assigned_to || "",
      appointment_start: toDatetimeLocal(loadedJob.appointment_start),
      due_date: toDateInput(loadedJob.due_date),
      labour_cost: String(Number(loadedJob.labour_cost || 0)),
      material_cost: String(Number(loadedJob.material_cost || 0)),
    });

    const paymentsResult = await supabase
      .from("payments")
      .select("id, amount, payment_method, payment_date, notes, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (!paymentsResult.error) {
      setPayments((paymentsResult.data || []) as unknown as PaymentRecord[]);
    }
  }

  async function saveJob(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setSaving(true);

    const labour = Number(editForm.labour_cost || 0);
    const material = Number(editForm.material_cost || 0);
    const total = labour + material;
    const paid = Number(job?.amount_paid || 0);
    const outstanding = Math.max(total - paid, 0);

    const paymentStatus =
      total === 0
        ? "not_required"
        : outstanding === 0
        ? "paid"
        : paid > 0
        ? "partially_paid"
        : "unpaid";

    const { error } = await supabase
      .from("jobs")
      .update({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        job_type: editForm.job_type,
        status: editForm.status,
        priority: editForm.priority,
        assigned_to: editForm.assigned_to.trim() || null,
        appointment_start: editForm.appointment_start || null,
        due_date: editForm.due_date || null,
        labour_cost: labour,
        material_cost: material,
        total_amount: total,
        amount_outstanding: outstanding,
        payment_status: paymentStatus,
      })
      .eq("id", jobId);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Work order updated successfully.");
    loadJob();
  }

  async function updateStatus(nextStatus: string) {
    setMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({ status: nextStatus })
      .eq("id", jobId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Moved to ${statusLabels[nextStatus]}.`);
    loadJob();
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const amount = Number(paymentForm.amount || 0);

    if (!amount || amount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      setMessage("Could not find your workspace. Please logout and login again.");
      return;
    }

    const paymentInsert = await supabase.from("payments").insert({
      workspace_id: workspaceResult.data,
      job_id: jobId,
      amount,
      payment_method: paymentForm.payment_method,
      payment_date: new Date().toISOString(),
      notes: paymentForm.notes.trim() || null,
    });

    if (paymentInsert.error) {
      setMessage(paymentInsert.error.message);
      return;
    }

    const total = Number(job?.total_amount || 0);
    const newPaid = Number(job?.amount_paid || 0) + amount;
    const newOutstanding = Math.max(total - newPaid, 0);

    const newPaymentStatus =
      total === 0
        ? "not_required"
        : newOutstanding === 0
        ? "paid"
        : "partially_paid";

    const jobUpdate = await supabase
      .from("jobs")
      .update({
        amount_paid: newPaid,
        amount_outstanding: newOutstanding,
        payment_status: newPaymentStatus,
      })
      .eq("id", jobId);

    if (jobUpdate.error) {
      setMessage(jobUpdate.error.message);
      return;
    }

    setPaymentForm({
      amount: "",
      payment_method: "Card",
      notes: "",
    });

    setMessage("Payment recorded successfully.");
    loadJob();
  }

  const financials = useMemo(() => {
    return {
      labour: Number(job?.labour_cost || 0),
      material: Number(job?.material_cost || 0),
      total: Number(job?.total_amount || 0),
      paid: Number(job?.amount_paid || 0),
      due: Number(job?.amount_outstanding || 0),
    };
  }, [job]);

  if (message && !job) {
    return (
      <div className="card">
        <p className="text-sm font-semibold text-red-700">{message}</p>

        <Link href="/jobs" className="btn-secondary mt-4">
          Back to Work Orders
        </Link>
      </div>
    );
  }

  if (!job) {
    return <p className="text-sm font-semibold text-stone-500">Loading job...</p>;
  }

  const status = job.status || "new";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link
            href="/jobs"
            className="mb-4 inline-flex items-center gap-2 text-sm font-black text-stone-600"
          >
            <ArrowLeft size={16} />
            Back to Work Orders
          </Link>

          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Work Order Command Centre
          </p>

          <h1 className="page-title">{job.title}</h1>

          <p className="page-subtitle">
            {job.job_number || "Work Order"} · {job.clients?.name || "No client"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadJob} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <Link href={`/invoices/${job.id}`} className="btn-primary">
            <FileText size={16} />
            Open Invoice
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Total" value={`$${financials.total.toFixed(2)}`} />
        <MiniStat title="Paid" value={`$${financials.paid.toFixed(2)}`} />
        <MiniStat
          title="Outstanding"
          value={`$${financials.due.toFixed(2)}`}
          alert={financials.due > 0}
        />
        <MiniStat
          title="Status"
          value={statusLabels[status] || status}
          small
        />
      </section>

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Lifecycle Pipeline
            </h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">
              Move the job through each delivery stage.
            </p>
          </div>

          <StatusBadge value={status} />
        </div>

        <Pipeline status={status} />

        <div className="mt-6 flex flex-wrap gap-3">
          {statusSteps.map((step) => (
            <button
              key={step}
              onClick={() => updateStatus(step)}
              className={step === status ? "btn-primary" : "btn-secondary"}
            >
              {statusLabels[step]}
            </button>
          ))}

          <button
            onClick={() => updateStatus("cancelled")}
            className="btn-secondary"
          >
            Cancelled
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="card">
          <h2 className="text-2xl font-black tracking-tight text-stone-950">
            Job Details
          </h2>

          <p className="mt-1 text-sm font-semibold text-stone-500">
            Update job notes, schedule, technician and estimates.
          </p>

          <form onSubmit={saveJob} className="mt-6 grid gap-5">
            <div>
              <label className="label">Work Order Title</label>
              <input
                className="input"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Job Notes</label>
              <textarea
                className="input min-h-28"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="label">Work Type</label>
                <select
                  className="input"
                  value={editForm.job_type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, job_type: e.target.value })
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
                <label className="label">Status</label>
                <select
                  className="input"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
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
                  value={editForm.priority}
                  onChange={(e) =>
                    setEditForm({ ...editForm, priority: e.target.value })
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
  <label className="label">Assigned To</label>
  <TechnicianSelect
    value={editForm.assigned_to}
    onChange={(value) =>
      setEditForm({ ...editForm, assigned_to: value })
    }
  />
</div>

              <div>
                <label className="label">Appointment</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={editForm.appointment_start}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
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
                  value={editForm.due_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, due_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Labour Cost</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.labour_cost}
                  onChange={(e) =>
                    setEditForm({ ...editForm, labour_cost: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Material Cost</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.material_cost}
                  onChange={(e) =>
                    setEditForm({ ...editForm, material_cost: e.target.value })
                  }
                />
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary">
              <Save size={16} />
              {saving ? "Saving..." : "Save Job Details"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <ClientCard job={job} />

          <div className="card">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Record Payment
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Add payments against this work order.
            </p>

            <form onSubmit={recordPayment} className="mt-6 grid gap-4">
              <div>
                <label className="label">Amount</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input"
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_method: e.target.value,
                    })
                  }
                >
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input min-h-20"
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Optional payment note"
                />
              </div>

              <button type="submit" className="btn-primary">
                <CreditCard size={16} />
                Record Payment
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Payment History
            </h2>

            <div className="mt-5 space-y-3">
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

                    <Receipt className="text-stone-400" size={20} />
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
                  No payments recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClientCard({ job }: { job: JobRecord }) {
  return (
    <div className="card">
      <h2 className="text-2xl font-black tracking-tight text-stone-950">
        Client & Site
      </h2>

      <div className="mt-5 space-y-4 text-sm font-semibold text-stone-600">
        <p className="flex items-center gap-3">
          <UserRound size={17} />
          {job.clients?.name || "No client"}
        </p>

        <p className="flex items-center gap-3">
          <Phone size={17} />
          {job.clients?.phone || "No phone"}
        </p>

        <p className="flex items-start gap-3">
          <MapPin size={17} className="mt-0.5" />
          <span>{job.clients?.address || "No address"}</span>
        </p>

        {job.appointment_start && (
          <p className="flex items-center gap-3">
            <CalendarDays size={17} />
            {new Date(job.appointment_start).toLocaleString()}
          </p>
        )}

        {job.due_date && (
          <p className="flex items-center gap-3">
            <Clock size={17} />
            Due {new Date(job.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function Pipeline({ status }: { status: string }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {statusSteps.map((step) => {
        const currentIndex = statusSteps.indexOf(status);
        const stepIndex = statusSteps.indexOf(step);
        const done = currentIndex >= stepIndex;

        return (
          <div key={step}>
            <div
              className={`h-2 rounded-full ${
                done ? "bg-[#1b1a18]" : "bg-stone-200"
              }`}
            />
            <p
              className={`mt-2 hidden text-[10px] font-black uppercase tracking-wide md:block ${
                done ? "text-stone-800" : "text-stone-400"
              }`}
            >
              {statusLabels[step]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({
  title,
  value,
  alert,
  small,
}: {
  title: string;
  value: string;
  alert?: boolean;
  small?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p
        className={`mt-3 font-black tracking-tight ${
          small ? "text-xl" : "text-3xl"
        } ${alert ? "text-red-600" : "text-stone-950"}`}
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
      className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
        styles[value] || styles.new
      }`}
    >
      {statusLabels[value] || value}
    </span>
  );
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function toDateInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}