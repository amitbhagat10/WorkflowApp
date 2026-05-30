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
  FileText,
  Plus,
  RefreshCw,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClientInfo = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
};

type JobRecord = {
  id: string;
  job_number: string | null;
  title: string;
  job_type: string | null;
  status: string | null;
  priority: string | null;
  assigned_to: string | null;
  appointment_start: string | null;
  due_date: string | null;
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

type ClientRecord = {
  id: string;
  name: string;
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

export default function HomePage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setMessage("");

    const jobsResult = await supabase
      .from("jobs")
      .select(
        `
        id,
        job_number,
        title,
        job_type,
        status,
        priority,
        assigned_to,
        appointment_start,
        due_date,
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

    setJobs((jobsResult.data || []) as unknown as JobRecord[]);

    const clientsResult = await supabase
      .from("clients")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (!clientsResult.error) {
      setClients((clientsResult.data || []) as unknown as ClientRecord[]);
    }

    const paymentsResult = await supabase
      .from("payments")
      .select("id, amount, payment_method, payment_date, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    if (!paymentsResult.error) {
      setPayments((paymentsResult.data || []) as unknown as PaymentRecord[]);
    }
  }

  const today = formatDateInput(new Date());

  const stats = useMemo(() => {
    const activeJobs = jobs.filter((job) =>
      ["new", "booked", "in_progress"].includes(job.status || "new")
    );

    const todayJobs = jobs.filter((job) => {
      if (!job.appointment_start) return false;
      return formatDateInput(new Date(job.appointment_start)) === today;
    });

    const overdueJobs = jobs.filter((job) => {
      if (!job.due_date) return false;
      if (["completed", "invoiced", "cancelled"].includes(job.status || "")) {
        return false;
      }

      return new Date(job.due_date) < new Date(today + "T00:00:00");
    });

    const urgentJobs = jobs.filter((job) => job.priority === "urgent");

    return {
      clients: clients.length,
      totalJobs: jobs.length,
      activeJobs: activeJobs.length,
      todayJobs: todayJobs.length,
      overdueJobs: overdueJobs.length,
      urgentJobs: urgentJobs.length,
      outstanding: jobs.reduce(
        (sum, job) => sum + Number(job.amount_outstanding || 0),
        0
      ),
      totalValue: jobs.reduce((sum, job) => sum + Number(job.total_amount || 0), 0),
      paid: jobs.reduce((sum, job) => sum + Number(job.amount_paid || 0), 0),
    };
  }, [jobs, clients, today]);

  const upcomingJobs = useMemo(() => {
    return jobs
      .filter((job) => job.appointment_start)
      .filter((job) => !["completed", "invoiced", "cancelled"].includes(job.status || ""))
      .sort(
        (a, b) =>
          new Date(a.appointment_start || "").getTime() -
          new Date(b.appointment_start || "").getTime()
      )
      .slice(0, 5);
  }, [jobs]);

  const attentionJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        const overdue =
          job.due_date &&
          !["completed", "invoiced", "cancelled"].includes(job.status || "") &&
          new Date(job.due_date) < new Date(today + "T00:00:00");

        return overdue || job.priority === "urgent" || Number(job.amount_outstanding || 0) > 0;
      })
      .slice(0, 5);
  }, [jobs, today]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      new: 0,
      booked: 0,
      in_progress: 0,
      completed: 0,
      invoiced: 0,
    };

    jobs.forEach((job) => {
      const status = job.status || "new";
      if (counts[status] !== undefined) {
        counts[status] += 1;
      }
    });

    return counts;
  }, [jobs]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Operations Overview
          </p>

          <h1 className="page-title">Dashboard</h1>

          <p className="page-subtitle">
            Real-time view of clients, work orders, schedule, payments and operational risk.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadDashboard} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <Link href="/jobs" className="btn-primary">
            <Plus size={16} />
            New Work Order
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HeroStat
          title="Today’s Jobs"
          value={stats.todayJobs}
          subtitle="Scheduled for today"
          icon={<CalendarDays size={22} />}
          href="/calendar"
        />

        <HeroStat
          title="Active Work"
          value={stats.activeJobs}
          subtitle="New, booked or in progress"
          icon={<Wrench size={22} />}
          href="/jobs"
        />

        <HeroStat
          title="Outstanding"
          value={`$${stats.outstanding.toFixed(2)}`}
          subtitle="Unpaid job balance"
          icon={<CreditCard size={22} />}
          href="/payments"
          alert={stats.outstanding > 0}
        />

        <HeroStat
          title="Needs Attention"
          value={stats.overdueJobs + stats.urgentJobs}
          subtitle="Overdue or urgent jobs"
          icon={<AlertTriangle size={22} />}
          href="/jobs"
          alert={stats.overdueJobs + stats.urgentJobs > 0}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Clients" value={stats.clients} icon={<Users size={18} />} />
        <MiniStat title="Total Jobs" value={stats.totalJobs} icon={<FileText size={18} />} />
        <MiniStat title="Paid" value={`$${stats.paid.toFixed(0)}`} icon={<CheckCircle2 size={18} />} />
        <MiniStat title="Job Value" value={`$${stats.totalValue.toFixed(0)}`} icon={<CreditCard size={18} />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="card">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-stone-950">
                  Job Pipeline
                </h2>
                <p className="mt-1 text-sm font-semibold text-stone-500">
                  Work orders across the lifecycle.
                </p>
              </div>

              <Link href="/jobs" className="btn-secondary">
                View All
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="rounded-[1.25rem] border border-stone-200 bg-white/85 p-4"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-stone-400">
                    {statusLabels[status]}
                  </p>

                  <p className="mt-3 text-3xl font-black text-stone-950">
                    {count}
                  </p>

                  <div className="mt-3 h-2 rounded-full bg-stone-100">
                    <div
                      className="h-2 rounded-full bg-[#1b1a18]"
                      style={{
                        width: `${jobs.length ? Math.min((count / jobs.length) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-stone-950">
                  Upcoming Schedule
                </h2>
                <p className="mt-1 text-sm font-semibold text-stone-500">
                  Next booked appointments.
                </p>
              </div>

              <Link href="/calendar" className="btn-secondary">
                Schedule
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingJobs.map((job) => (
                <DashboardJobRow key={job.id} job={job} />
              ))}

              {upcomingJobs.length === 0 && (
                <EmptyState
                  icon={<CalendarDays size={24} />}
                  title="No upcoming jobs"
                  text="Scheduled appointments will appear here."
                  href="/jobs"
                  action="Open Work Orders"
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-stone-950">
                Attention Queue
              </h2>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                Urgent, overdue or unpaid work.
              </p>
            </div>

            <div className="space-y-3">
              {attentionJobs.map((job) => (
                <AttentionJobRow key={job.id} job={job} today={today} />
              ))}

              {attentionJobs.length === 0 && (
                <div className="rounded-[1.25rem] bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-700" size={22} />
                    <div>
                      <h3 className="font-black text-emerald-900">
                        Everything looks healthy
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-emerald-700">
                        No urgent, overdue or unpaid items requiring immediate attention.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-stone-950">
                Recent Payments
              </h2>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                Latest money received.
              </p>
            </div>

            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-[1.2rem] border border-stone-200 bg-white/85 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-black text-stone-950">
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
                </div>
              ))}

              {payments.length === 0 && (
                <EmptyState
                  icon={<CreditCard size={24} />}
                  title="No payments yet"
                  text="Recorded payments will appear here."
                  href="/payments"
                  action="Open Payments"
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({
  title,
  value,
  subtitle,
  icon,
  href,
  alert,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group overflow-hidden rounded-[1.75rem] border p-5 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl ${
        alert
          ? "border-red-200 bg-red-50/95"
          : "border-white/70 bg-white/95"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-sm font-black ${
              alert ? "text-red-700" : "text-stone-500"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-3 text-4xl font-black tracking-tight ${
              alert ? "text-red-700" : "text-stone-950"
            }`}
          >
            {value}
          </p>

          <p
            className={`mt-2 text-sm font-semibold ${
              alert ? "text-red-600" : "text-stone-500"
            }`}
          >
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            alert
              ? "bg-red-100 text-red-700"
              : "bg-[#1b1a18] text-[#d8bd82]"
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-black text-stone-500 group-hover:text-stone-950">
        Open
        <ArrowRight size={15} />
      </div>
    </Link>
  );
}

function MiniStat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-stone-500">{title}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-stone-950">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DashboardJobRow({ job }: { job: JobRecord }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-[1.25rem] border border-stone-200 bg-white/85 p-4 transition hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <StatusBadge value={job.status || "new"} />

            {job.priority === "urgent" && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-red-700">
                Urgent
              </span>
            )}
          </div>

          <h3 className="truncate font-black text-stone-950">{job.title}</h3>

          <p className="mt-1 text-sm font-semibold text-stone-500">
            {job.clients?.name || "No client"} ·{" "}
            {job.appointment_start
              ? new Date(job.appointment_start).toLocaleString()
              : "No appointment"}
          </p>
        </div>

        <ArrowRight className="shrink-0 text-stone-400" size={18} />
      </div>
    </Link>
  );
}

function AttentionJobRow({ job, today }: { job: JobRecord; today: string }) {
  const overdue =
    job.due_date &&
    !["completed", "invoiced", "cancelled"].includes(job.status || "") &&
    new Date(job.due_date) < new Date(today + "T00:00:00");

  const outstanding = Number(job.amount_outstanding || 0);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-[1.25rem] border border-stone-200 bg-white/85 p-4 transition hover:bg-white hover:shadow-sm"
    >
      <div className="mb-2 flex flex-wrap gap-2">
        {job.priority === "urgent" && (
          <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-red-700">
            Urgent
          </span>
        )}

        {overdue && (
          <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-orange-700">
            Overdue
          </span>
        )}

        {outstanding > 0 && (
          <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-stone-700">
            ${outstanding.toFixed(2)} due
          </span>
        )}
      </div>

      <h3 className="font-black text-stone-950">{job.title}</h3>

      <p className="mt-1 text-sm font-semibold text-stone-500">
        {job.clients?.name || "No client"} · {statusLabels[job.status || "new"]}
      </p>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  text,
  href,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3ead6] text-[#1b1a18]">
        {icon}
      </div>

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

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}