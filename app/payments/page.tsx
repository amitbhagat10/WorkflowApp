"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClientInfo = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
};

type JobOption = {
  id: string;
  job_number: string | null;
  title: string;
  status: string | null;
  payment_status: string | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  created_at: string;
  clients?: ClientInfo | null;
};

type PaymentRecord = {
  id: string;
  workspace_id?: string | null;
  job_id: string | null;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  jobs?: JobOption | null;
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "Unpaid",
  partially_paid: "Part Paid",
  paid: "Paid",
  overdue: "Overdue",
  not_required: "Not Required",
};

export default function PaymentsPage() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("outstanding");

  const [form, setForm] = useState({
    job_id: "",
    amount: "",
    payment_method: "Card",
    notes: "",
  });

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setMessage("");

    const jobsResult = await supabase
      .from("jobs")
      .select(
        `
        id,
        job_number,
        title,
        status,
        payment_status,
        total_amount,
        amount_paid,
        amount_outstanding,
        created_at,
        clients (
          id,
          name,
          phone,
          address
        )
      `
      )
      .order("created_at", { ascending: false });

    if (jobsResult.error) {
      setMessage(jobsResult.error.message);
      return;
    }

    setJobs((jobsResult.data || []) as unknown as JobOption[]);

    const paymentsResult = await supabase
      .from("payments")
      .select(
        `
        id,
        workspace_id,
        job_id,
        amount,
        payment_method,
        payment_date,
        notes,
        created_at,
        jobs (
          id,
          job_number,
          title,
          status,
          payment_status,
          total_amount,
          amount_paid,
          amount_outstanding,
          created_at,
          clients (
            id,
            name,
            phone,
            address
          )
        )
      `
      )
      .order("created_at", { ascending: false });

    if (paymentsResult.error) {
      setMessage(paymentsResult.error.message);
      return;
    }

    setPayments((paymentsResult.data || []) as unknown as PaymentRecord[]);
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!form.job_id) {
      setMessage("Please select a work order.");
      return;
    }

    const amount = Number(form.amount || 0);

    if (!amount || amount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const selectedJob = jobs.find((job) => job.id === form.job_id);

    if (!selectedJob) {
      setMessage("Selected work order could not be found.");
      return;
    }

    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      setMessage("Could not find your workspace. Please logout and login again.");
      return;
    }

    const paymentInsert = await supabase.from("payments").insert({
      workspace_id: workspaceResult.data,
      job_id: form.job_id,
      amount,
      payment_method: form.payment_method,
      payment_date: new Date().toISOString(),
      notes: form.notes.trim() || null,
    });

    if (paymentInsert.error) {
      setMessage(paymentInsert.error.message);
      return;
    }

    const total = Number(selectedJob.total_amount || 0);
    const currentPaid = Number(selectedJob.amount_paid || 0);
    const newPaid = currentPaid + amount;
    const newOutstanding = Math.max(total - newPaid, 0);

    const newPaymentStatus =
      total === 0
        ? "not_required"
        : newOutstanding === 0
        ? "paid"
        : newPaid > 0
        ? "partially_paid"
        : "unpaid";

    const jobUpdate = await supabase
      .from("jobs")
      .update({
        amount_paid: newPaid,
        amount_outstanding: newOutstanding,
        payment_status: newPaymentStatus,
      })
      .eq("id", form.job_id);

    if (jobUpdate.error) {
      setMessage(jobUpdate.error.message);
      return;
    }

    setForm({
      job_id: "",
      amount: "",
      payment_method: "Card",
      notes: "",
    });

    setShowForm(false);
    setMessage("Payment recorded successfully.");
    loadPayments();
  }

  function prefillPayment(job: JobOption) {
    setForm({
      job_id: job.id,
      amount: String(Number(job.amount_outstanding || 0)),
      payment_method: "Card",
      notes: "",
    });

    setShowForm(true);
  }

  const stats = useMemo(() => {
    const totalOutstanding = jobs.reduce(
      (sum, job) => sum + Number(job.amount_outstanding || 0),
      0
    );

    const totalPaid = jobs.reduce(
      (sum, job) => sum + Number(job.amount_paid || 0),
      0
    );

    const totalValue = jobs.reduce(
      (sum, job) => sum + Number(job.total_amount || 0),
      0
    );

    const outstandingJobs = jobs.filter(
      (job) => Number(job.amount_outstanding || 0) > 0
    ).length;

    return {
      totalOutstanding,
      totalPaid,
      totalValue,
      outstandingJobs,
      paymentsCount: payments.length,
    };
  }, [jobs, payments]);

  const filteredOutstandingJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const outstanding = Number(job.amount_outstanding || 0);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "outstanding" && outstanding > 0) ||
        job.payment_status === statusFilter;

      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.job_number || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [jobs, searchTerm, statusFilter]);

  const filteredPayments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return payments.filter((payment) => {
      return (
        !search ||
        (payment.jobs?.title || "").toLowerCase().includes(search) ||
        (payment.jobs?.job_number || "").toLowerCase().includes(search) ||
        (payment.jobs?.clients?.name || "").toLowerCase().includes(search) ||
        (payment.payment_method || "").toLowerCase().includes(search)
      );
    });
  }, [payments, searchTerm]);

  const outstandingJobOptions = jobs.filter(
    (job) => Number(job.amount_outstanding || 0) > 0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Payment Command Centre
          </p>

          <h1 className="page-title">Payments</h1>

          <p className="page-subtitle">
            Track outstanding balances, record payments and keep invoices up to date.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadPayments} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => setShowForm((current) => !current)}
            className="btn-primary"
          >
            <Plus size={16} />
            {showForm ? "Close" : "Record Payment"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-5">
        <MiniStat
          title="Outstanding"
          value={`$${stats.totalOutstanding.toFixed(2)}`}
          alert={stats.totalOutstanding > 0}
          icon={<AlertTriangle size={18} />}
        />

        <MiniStat
          title="Paid"
          value={`$${stats.totalPaid.toFixed(2)}`}
          icon={<CheckCircle2 size={18} />}
        />

        <MiniStat
          title="Job Value"
          value={`$${stats.totalValue.toFixed(2)}`}
          icon={<DollarSign size={18} />}
        />

        <MiniStat
          title="Unpaid Jobs"
          value={stats.outstandingJobs}
          alert={stats.outstandingJobs > 0}
          icon={<Wrench size={18} />}
        />

        <MiniStat
          title="Payments"
          value={stats.paymentsCount}
          icon={<Receipt size={18} />}
        />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Record Payment
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Select an outstanding work order and record the amount received.
            </p>
          </div>

          <form onSubmit={recordPayment} className="grid gap-5">
            <div>
              <label className="label">Work Order</label>
              <select
                className="input"
                value={form.job_id}
                onChange={(e) => {
                  const selectedJob = jobs.find((job) => job.id === e.target.value);

                  setForm({
                    ...form,
                    job_id: e.target.value,
                    amount: selectedJob
                      ? String(Number(selectedJob.amount_outstanding || 0))
                      : "",
                  });
                }}
              >
                <option value="">Select work order</option>

                {outstandingJobOptions.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.job_number || "Work Order"} — {job.title} —{" "}
                    {job.clients?.name || "No client"} — $
                    {Number(job.amount_outstanding || 0).toFixed(2)} due
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="label">Amount Received</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input"
                  value={form.payment_method}
                  onChange={(e) =>
                    setForm({ ...form, payment_method: e.target.value })
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
                <label className="label">Reference / Note</label>
                <input
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional note"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="btn-primary">
                <CreditCard size={16} />
                Save Payment
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

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="card">
          <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-stone-950">
                Outstanding Work Orders
              </h2>

              <p className="mt-1 text-sm font-semibold text-stone-500">
                Jobs with balances still to collect.
              </p>
            </div>

            <select
              className="input max-w-52"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="outstanding">Outstanding only</option>
              <option value="all">All jobs</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Part paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

          <div className="mt-5 space-y-4">
            {filteredOutstandingJobs.map((job) => (
              <OutstandingJobCard
                key={job.id}
                job={job}
                prefillPayment={prefillPayment}
              />
            ))}

            {filteredOutstandingJobs.length === 0 && (
              <EmptyState
                title="No outstanding work orders"
                text="Unpaid and part-paid jobs will appear here."
                href="/jobs"
                action="Open Work Orders"
              />
            )}
          </div>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Payment History
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Recent payments received.
            </p>
          </div>

          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}

            {filteredPayments.length === 0 && (
              <EmptyState
                title="No payments found"
                text="Recorded payments will appear here."
                href="/payments"
                action="Refresh Payments"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SearchBox({
  searchTerm,
  setSearchTerm,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <Search size={18} className="text-stone-400" />

      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search job, client or payment method..."
        className="w-full border-0 bg-transparent text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400"
      />
    </div>
  );
}

function OutstandingJobCard({
  job,
  prefillPayment,
}: {
  job: JobOption;
  prefillPayment: (job: JobOption) => void;
}) {
  const outstanding = Number(job.amount_outstanding || 0);

  return (
    <div className="rounded-[1.35rem] border border-stone-200 bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PaymentStatusBadge value={job.payment_status || "unpaid"} />

        <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-stone-600">
          {job.job_number || "Work Order"}
        </span>
      </div>

      <h3 className="text-lg font-black tracking-tight text-stone-950">
        {job.title}
      </h3>

      <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-500">
        <p className="flex items-center gap-2">
          <UserRound size={15} />
          {job.clients?.name || "No client"}
        </p>

        <p className="flex items-center gap-2">
          <DollarSign size={15} />
          Total ${Number(job.total_amount || 0).toFixed(2)} · Paid $
          {Number(job.amount_paid || 0).toFixed(2)} · Due ${outstanding.toFixed(2)}
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {outstanding > 0 && (
          <button onClick={() => prefillPayment(job)} className="btn-primary">
            Record
          </button>
        )}

        <Link href={`/jobs/${job.id}`} className="btn-secondary">
          Job
          <ArrowRight size={15} />
        </Link>

        <Link href={`/invoices/${job.id}`} className="btn-secondary">
          Invoice
          <FileText size={15} />
        </Link>
      </div>
    </div>
  );
}

function PaymentCard({ payment }: { payment: PaymentRecord }) {
  return (
    <div className="rounded-[1.35rem] border border-stone-200 bg-white/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-black tracking-tight text-stone-950">
            ${Number(payment.amount || 0).toFixed(2)}
          </p>

          <p className="mt-1 text-sm font-semibold text-stone-500">
            {payment.payment_method || "Payment"} ·{" "}
            {payment.payment_date
              ? new Date(payment.payment_date).toLocaleDateString()
              : new Date(payment.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Receipt size={20} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-stone-50 p-3">
        <p className="text-sm font-black text-stone-900">
          {payment.jobs?.title || "Work Order"}
        </p>

        <p className="mt-1 text-xs font-semibold text-stone-500">
          {payment.jobs?.clients?.name || "No client"}
        </p>
      </div>

      {payment.notes && (
        <p className="mt-3 text-sm font-semibold text-stone-500">
          {payment.notes}
        </p>
      )}

      {payment.job_id && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link href={`/jobs/${payment.job_id}`} className="btn-secondary">
            Open Job
          </Link>

          <Link href={`/invoices/${payment.job_id}`} className="btn-secondary">
            Invoice
          </Link>
        </div>
      )}
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

function PaymentStatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    unpaid: "bg-red-50 text-red-700",
    partially_paid: "bg-[#f3ead6] text-[#1b1a18]",
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-orange-50 text-orange-700",
    not_required: "bg-stone-100 text-stone-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        styles[value] || styles.unpaid
      }`}
    >
      {paymentStatusLabels[value] || value}
    </span>
  );
}

function EmptyState({
  title,
  text,
  href,
  action,
}: {
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-8 text-center">
      <CreditCard className="mx-auto text-stone-400" size={28} />

      <h3 className="mt-4 text-xl font-black text-stone-950">{title}</h3>

      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold text-stone-500">
        {text}
      </p>

      <Link href={href} className="btn-primary mt-5">
        {action}
      </Link>
    </div>
  );
}