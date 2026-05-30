"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
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
  email: string | null;
  address: string | null;
};

type InvoiceJob = {
  id: string;
  job_number: string | null;
  title: string;
  job_type: string | null;
  status: string | null;
  payment_status: string | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  appointment_start: string | null;
  created_at: string;
  clients?: ClientInfo | null;
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "Unpaid",
  partially_paid: "Part Paid",
  paid: "Paid",
  overdue: "Overdue",
  not_required: "Not Required",
};

const jobStatusLabels: Record<string, string> = {
  new: "New",
  booked: "Booked",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

export default function InvoicesPage() {
  const [jobs, setJobs] = useState<InvoiceJob[]>([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setMessage("");

    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        job_number,
        title,
        job_type,
        status,
        payment_status,
        total_amount,
        amount_paid,
        amount_outstanding,
        appointment_start,
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

    if (error) {
      setMessage(error.message);
      return;
    }

    setJobs((data || []) as unknown as InvoiceJob[]);
  }

  async function markAsInvoiced(job: InvoiceJob) {
    setMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({
        status: "invoiced",
      })
      .eq("id", job.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Work order marked as invoiced.");
    loadInvoices();
  }

  const stats = useMemo(() => {
    const totalValue = jobs.reduce(
      (sum, job) => sum + Number(job.total_amount || 0),
      0
    );

    const paid = jobs.reduce(
      (sum, job) => sum + Number(job.amount_paid || 0),
      0
    );

    const outstanding = jobs.reduce(
      (sum, job) => sum + Number(job.amount_outstanding || 0),
      0
    );

    const unpaidCount = jobs.filter(
      (job) => Number(job.amount_outstanding || 0) > 0
    ).length;

    const paidCount = jobs.filter((job) => job.payment_status === "paid").length;

    return {
      totalInvoices: jobs.length,
      totalValue,
      paid,
      outstanding,
      unpaidCount,
      paidCount,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const paymentStatus = job.payment_status || "unpaid";
      const outstanding = Number(job.amount_outstanding || 0);

      const matchesPayment =
        paymentFilter === "all" ||
        paymentStatus === paymentFilter ||
        (paymentFilter === "outstanding" && outstanding > 0);

      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.job_number || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.job_type || "").toLowerCase().includes(search);

      return matchesPayment && matchesSearch;
    });
  }, [jobs, searchTerm, paymentFilter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Invoice Command Centre
          </p>

          <h1 className="page-title">Invoices</h1>

          <p className="page-subtitle">
            Review branded invoices, track outstanding balances and open client billing documents.
          </p>
        </div>

        <button onClick={loadInvoices} className="btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-5">
        <MiniStat
          title="Invoices"
          value={stats.totalInvoices}
          icon={<FileText size={18} />}
        />

        <MiniStat
          title="Invoice Value"
          value={`$${stats.totalValue.toFixed(2)}`}
          icon={<Receipt size={18} />}
        />

        <MiniStat
          title="Paid"
          value={`$${stats.paid.toFixed(2)}`}
          icon={<CheckCircle2 size={18} />}
        />

        <MiniStat
          title="Outstanding"
          value={`$${stats.outstanding.toFixed(2)}`}
          alert={stats.outstanding > 0}
          icon={<AlertTriangle size={18} />}
        />

        <MiniStat
          title="Unpaid Jobs"
          value={stats.unpaidCount}
          alert={stats.unpaidCount > 0}
          icon={<CreditCard size={18} />}
        />
      </section>

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Invoice Register
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Search, filter and open invoices for all work orders.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <Search size={18} className="text-stone-400" />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoices..."
                className="w-full min-w-60 border-0 bg-transparent text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>

            <select
              className="input min-w-48"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">All invoices</option>
              <option value="outstanding">Outstanding</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Part paid</option>
              <option value="paid">Paid</option>
              <option value="not_required">Not required</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <InvoiceCard
              key={job.id}
              job={job}
              markAsInvoiced={markAsInvoiced}
            />
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-10 text-center">
            <FileText className="mx-auto text-stone-400" size={30} />

            <h3 className="mt-4 text-2xl font-black text-stone-950">
              No invoices found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-stone-500">
              Try changing the search term or payment filter.
            </p>

            <Link href="/jobs" className="btn-primary mt-5">
              Open Work Orders
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function InvoiceCard({
  job,
  markAsInvoiced,
}: {
  job: InvoiceJob;
  markAsInvoiced: (job: InvoiceJob) => void;
}) {
  const total = Number(job.total_amount || 0);
  const paid = Number(job.amount_paid || 0);
  const outstanding = Number(job.amount_outstanding || 0);
  const paymentStatus = job.payment_status || "unpaid";
  const invoiceNumber = job.job_number || `INV-${job.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <div className="grid gap-5 xl:grid-cols-[1fr_320px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-stone-600">
              {invoiceNumber}
            </span>

            <PaymentStatusBadge value={paymentStatus} />
            <JobStatusBadge value={job.status || "new"} />
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
              <FileText size={15} />
              Created {new Date(job.created_at).toLocaleDateString()}
            </p>

            <p className="flex items-center gap-2">
              <CreditCard size={15} />
              {outstanding > 0
                ? `$${outstanding.toFixed(2)} outstanding`
                : "No balance outstanding"}
            </p>
          </div>
        </div>

        <div className="rounded-[1.25rem] bg-stone-50 p-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <AmountBlock label="Total" value={total} />
            <AmountBlock label="Paid" value={paid} />
            <AmountBlock label="Due" value={outstanding} alert={outstanding > 0} />
          </div>

          <div className="mt-4 grid gap-2">
            <Link href={`/invoices/${job.id}`} className="btn-primary">
              Open Invoice
              <ArrowRight size={15} />
            </Link>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link href={`/jobs/${job.id}`} className="btn-secondary">
                Open Job
              </Link>

              {job.status !== "invoiced" ? (
                <button
                  onClick={() => markAsInvoiced(job)}
                  className="btn-secondary"
                >
                  Mark Invoiced
                </button>
              ) : (
                <span className="inline-flex items-center justify-center rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                  Invoiced
                </span>
              )}
            </div>
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
  icon: ReactNode;
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

function JobStatusBadge({ value }: { value: string }) {
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
      {jobStatusLabels[value] || value}
    </span>
  );
}