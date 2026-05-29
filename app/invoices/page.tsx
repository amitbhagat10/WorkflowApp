"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Printer,
  RefreshCw,
  Search,
  DollarSign,
  Receipt,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type InvoiceJob = {
  id: string;
  title: string;
  job_type: string | null;
  status: string;
  payment_status: string;
  labour_cost: number | null;
  material_cost: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  appointment_start: string | null;
  created_at: string;
  clients?: {
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
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
        title,
        job_type,
        status,
        payment_status,
        labour_cost,
        material_cost,
        total_amount,
        amount_paid,
        amount_outstanding,
        appointment_start,
        created_at,
        clients (
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

  const summary = useMemo(() => {
    const totalInvoiced = jobs.reduce(
      (sum, job) => sum + Number(job.total_amount || 0),
      0
    );

    const totalPaid = jobs.reduce(
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

    return {
      totalInvoiced,
      totalPaid,
      outstanding,
      unpaidCount,
      invoiceCount: jobs.length,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.job_type || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.clients?.phone || "").toLowerCase().includes(search) ||
        (job.clients?.email || "").toLowerCase().includes(search) ||
        (job.clients?.address || "").toLowerCase().includes(search);

      const matchesPayment =
        paymentFilter === "all" || job.payment_status === paymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [jobs, searchTerm, paymentFilter]);

  function invoiceNumber(jobId: string) {
    return `INV-${jobId.slice(0, 8).toUpperCase()}`;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Billing Documents
          </p>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">
            Review invoice-ready work orders, payment status, and outstanding balances.
          </p>
        </div>

        <button onClick={loadInvoices} className="btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-5">
        <MiniStat
          title="Invoices"
          value={summary.invoiceCount}
          icon={<FileText size={20} />}
        />

        <MiniStat
          title="Invoiced"
          value={`$${summary.totalInvoiced.toFixed(2)}`}
          icon={<Receipt size={20} />}
        />

        <MiniStat
          title="Paid"
          value={`$${summary.totalPaid.toFixed(2)}`}
          icon={<DollarSign size={20} />}
        />

        <MiniStat
          title="Outstanding"
          value={`$${summary.outstanding.toFixed(2)}`}
          icon={<Receipt size={20} />}
          danger
        />

        <MiniStat
          title="Unpaid"
          value={summary.unpaidCount}
          icon={<FileText size={20} />}
          danger
        />
      </section>

      <section className="card">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              Invoice Directory
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Open, review, print, or save invoice copies.
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
                placeholder="Search invoices..."
              />
            </div>

            <select
              className="input"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Part Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-stone-200 bg-white/75 p-4 transition hover:bg-white hover:shadow-sm"
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
                      <FileText size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-stone-900">
                          {invoiceNumber(job.id)}
                        </h3>

                        <PaymentBadge value={job.payment_status} />
                      </div>

                      <p className="mt-1 text-sm font-bold text-stone-700">
                        {job.title}
                      </p>

                      <p className="mt-1 text-sm text-stone-500">
                        {job.clients?.name || "No client"} ·{" "}
                        {job.job_type || "General work"}
                      </p>

                      <p className="mt-1 text-sm text-stone-500">
                        {job.clients?.address || "No address added"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-stone-500">
                        <span className="rounded-full bg-[#f4efe4] px-3 py-1 text-[#2b2926]">
                          Created {new Date(job.created_at).toLocaleDateString()}
                        </span>

                        <span className="rounded-full bg-stone-100 px-3 py-1">
                          Work Status: {job.status.replace("_", " ")}
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
                    <Link href={`/invoices/${job.id}`} className="btn-primary">
                      <Printer size={15} />
                      Open Invoice
                    </Link>

                    <Link href={`/jobs/${job.id}`} className="btn-secondary">
                      Open Work Order
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
              <FileText size={24} />
            </div>

            <h2 className="mt-4 text-xl font-black text-stone-900">
              No invoices found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              Try changing the search or payment status filter.
            </p>

            <div className="mt-5 flex justify-center">
              <Link href="/jobs" className="btn-primary">
                Create Work Order
              </Link>
            </div>
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
            className={`mt-3 text-2xl font-black tracking-tight ${
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

function PaymentBadge({ value }: { value: string }) {
  const style =
    value === "paid"
      ? "bg-emerald-50 text-emerald-700"
      : value === "overdue"
      ? "bg-red-50 text-red-700"
      : value === "partially_paid"
      ? "bg-[#f4efe4] text-[#2b2926]"
      : "bg-stone-100 text-stone-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${style}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}