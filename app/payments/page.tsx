"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  DollarSign,
  Plus,
  Receipt,
  RefreshCw,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type JobOption = {
  id: string;
  title: string;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  payment_status: string;
  clients?: {
    name: string | null;
    phone: string | null;
    address: string | null;
  } | null;
};

type PaymentRecord = {
  id: string;
  job_id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  jobs?: JobOption | null;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    job_id: "",
    amount: "",
    payment_method: "Cash",
    payment_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    setMessage("");

    const jobsResult = await supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        total_amount,
        amount_paid,
        amount_outstanding,
        payment_status,
        clients (
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

    const paymentsResult = await supabase
      .from("payments")
      .select(
        `
        id,
        job_id,
        amount,
        payment_method,
        payment_date,
        notes,
        created_at,
        jobs (
          id,
          title,
          total_amount,
          amount_paid,
          amount_outstanding,
          payment_status,
          clients (
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

    setJobs((jobsResult.data || []) as unknown as JobOption[]);
    setPayments((paymentsResult.data || []) as unknown as PaymentRecord[]);
  }

  async function createPayment(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!form.job_id) {
      setMessage("Please select a work order.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setMessage("Please enter a valid payment amount.");
      return;
    }

    const { error } = await supabase.from("payments").insert({
      job_id: form.job_id,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      payment_date: form.payment_date || null,
      notes: form.notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      job_id: "",
      amount: "",
      payment_method: "Cash",
      payment_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });

    setShowForm(false);
    setMessage("Payment recorded successfully.");
    loadPageData();
  }

  const summary = useMemo(() => {
    const collected = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const outstanding = jobs.reduce(
      (sum, job) => sum + Number(job.amount_outstanding || 0),
      0
    );

    const paidJobs = jobs.filter((job) => job.payment_status === "paid").length;

    return {
      collected,
      outstanding,
      paidJobs,
      paymentCount: payments.length,
    };
  }, [payments, jobs]);

  const filteredPayments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return payments;

    return payments.filter((payment) => {
      return (
        (payment.jobs?.title || "").toLowerCase().includes(search) ||
        (payment.jobs?.clients?.name || "").toLowerCase().includes(search) ||
        (payment.payment_method || "").toLowerCase().includes(search) ||
        (payment.notes || "").toLowerCase().includes(search)
      );
    });
  }, [payments, searchTerm]);

  const outstandingJobs = useMemo(() => {
    return jobs.filter((job) => Number(job.amount_outstanding || 0) > 0);
  }, [jobs]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Payment Control
          </p>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">
            Record payments, monitor outstanding balances, and keep work order billing clean.
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
            {showForm ? "Close Form" : "Record Payment"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat
          title="Collected"
          value={`$${summary.collected.toFixed(2)}`}
          icon={<DollarSign size={20} />}
        />

        <MiniStat
          title="Outstanding"
          value={`$${summary.outstanding.toFixed(2)}`}
          icon={<Receipt size={20} />}
          danger
        />

        <MiniStat
          title="Paid Work Orders"
          value={summary.paidJobs}
          icon={<CreditCard size={20} />}
        />

        <MiniStat
          title="Payment Records"
          value={summary.paymentCount}
          icon={<Receipt size={20} />}
        />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              Record Payment
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Select a work order and enter the amount received.
            </p>
          </div>

          <form onSubmit={createPayment} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Work Order</label>
              <select
                className="input"
                value={form.job_id}
                onChange={(e) => setForm({ ...form, job_id: e.target.value })}
              >
                <option value="">Select work order</option>

                {outstandingJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} — {job.clients?.name || "No client"} — Due $
                    {Number(job.amount_outstanding || 0).toFixed(2)}
                  </option>
                ))}

                {outstandingJobs.length === 0 &&
                  jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} — {job.clients?.name || "No client"}
                    </option>
                  ))}
              </select>
            </div>

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
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="EFTPOS">EFTPOS</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Payment Date</label>
              <input
                className="input"
                type="date"
                value={form.payment_date}
                onChange={(e) =>
                  setForm({ ...form, payment_date: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <input
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional payment note"
              />
            </div>

            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="btn-primary">
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

      <section className="card">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              Payment History
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Recent payment records and related work orders.
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
              placeholder="Search payments..."
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-2xl border border-stone-200 bg-white/75 p-4 transition hover:bg-white hover:shadow-sm"
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
                      <CreditCard size={20} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-stone-900">
                        ${Number(payment.amount || 0).toFixed(2)}
                      </h3>

                      <p className="mt-1 text-sm text-stone-500">
                        {payment.jobs?.title || "Unknown work order"} ·{" "}
                        {payment.jobs?.clients?.name || "No client"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-stone-500">
                        <span className="rounded-full bg-[#f4efe4] px-3 py-1 text-[#2b2926]">
                          {payment.payment_method || "Payment"}
                        </span>

                        <span className="rounded-full bg-stone-100 px-3 py-1">
                          {payment.payment_date
                            ? new Date(payment.payment_date).toLocaleDateString()
                            : new Date(payment.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {payment.notes && (
                        <p className="mt-3 text-sm text-stone-500">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-stone-50/80 p-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <AmountBlock
                      label="Paid"
                      value={Number(payment.jobs?.amount_paid || 0)}
                    />
                    <AmountBlock
                      label="Due"
                      value={Number(payment.jobs?.amount_outstanding || 0)}
                      danger
                    />
                  </div>

                  <div className="mt-4">
                    {payment.jobs?.id && (
                      <Link
                        href={`/jobs/${payment.jobs.id}`}
                        className="btn-primary"
                      >
                        Open Work Order
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPayments.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center">
            <p className="text-sm font-semibold text-stone-500">
              No payments found.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              Record First Payment
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
  icon,
  danger,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-stone-500">{title}</p>
          <p
            className={`mt-3 text-3xl font-black tracking-tight ${
              danger ? "text-red-700" : "text-stone-950"
            }`}
          >
            {value}
          </p>
        </div>

        <div className="rounded-2xl bg-[#f4efe4] p-3 text-[#2b2926]">
          {icon}
        </div>
      </div>
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