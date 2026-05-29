"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ScheduleFilter = "today" | "upcoming" | "past" | "no_appointment" | "all";

type ScheduleJob = {
  id: string;
  title: string;
  description: string | null;
  job_type: string | null;
  status: string;
  payment_status: string;
  appointment_start: string | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  created_at: string;
  clients?: {
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
};

export default function CalendarPage() {
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<ScheduleFilter>("today");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setMessage("");

    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        *,
        clients (
          name,
          phone,
          email,
          address
        )
      `
      )
      .order("appointment_start", { ascending: true, nullsFirst: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setJobs((data || []) as unknown as ScheduleJob[]);
  }

  function isToday(dateValue: string | null) {
    if (!dateValue) return false;

    const today = new Date();
    const date = new Date(dateValue);

    return date.toDateString() === today.toDateString();
  }

  function isUpcoming(dateValue: string | null) {
    if (!dateValue) return false;

    const now = new Date();
    const date = new Date(dateValue);

    return date >= now;
  }

  function isPast(dateValue: string | null) {
    if (!dateValue) return false;

    const now = new Date();
    const date = new Date(dateValue);

    return date < now;
  }

  const stats = useMemo(() => {
    return {
      today: jobs.filter((job) => isToday(job.appointment_start)).length,
      upcoming: jobs.filter((job) => isUpcoming(job.appointment_start)).length,
      past: jobs.filter((job) => isPast(job.appointment_start)).length,
      noAppointment: jobs.filter((job) => !job.appointment_start).length,
      all: jobs.length,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.job_type || "").toLowerCase().includes(search) ||
        (job.description || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.clients?.phone || "").toLowerCase().includes(search) ||
        (job.clients?.address || "").toLowerCase().includes(search);

      let matchesFilter = true;

      if (filter === "today") {
        matchesFilter = isToday(job.appointment_start);
      }

      if (filter === "upcoming") {
        matchesFilter = isUpcoming(job.appointment_start);
      }

      if (filter === "past") {
        matchesFilter = isPast(job.appointment_start);
      }

      if (filter === "no_appointment") {
        matchesFilter = !job.appointment_start;
      }

      if (filter === "all") {
        matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });
  }, [jobs, filter, searchTerm]);

  const groupedJobs = useMemo(() => {
    const groups: Record<string, ScheduleJob[]> = {};

    filteredJobs.forEach((job) => {
      const key = job.appointment_start
        ? new Date(job.appointment_start).toDateString()
        : "No appointment scheduled";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(job);
    });

    return groups;
  }, [filteredJobs]);

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
            Field Schedule
          </p>
          <h1 className="page-title">Schedule</h1>
          <p className="page-subtitle">
            View today’s work, upcoming appointments, and unscheduled work orders.
          </p>
        </div>

        <button onClick={loadJobs} className="btn-secondary">
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
        <ScheduleStat
          title="Today"
          value={stats.today}
          active={filter === "today"}
          onClick={() => setFilter("today")}
        />

        <ScheduleStat
          title="Upcoming"
          value={stats.upcoming}
          active={filter === "upcoming"}
          onClick={() => setFilter("upcoming")}
        />

        <ScheduleStat
          title="Past"
          value={stats.past}
          active={filter === "past"}
          onClick={() => setFilter("past")}
        />

        <ScheduleStat
          title="No Appointment"
          value={stats.noAppointment}
          active={filter === "no_appointment"}
          onClick={() => setFilter("no_appointment")}
        />

        <ScheduleStat
          title="All"
          value={stats.all}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
      </section>

      <section className="card">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label className="label">Search Schedule</label>
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search work, client, phone, address..."
              />
            </div>
          </div>

          <div>
            <label className="label">View</label>
            <select
              className="input"
              value={filter}
              onChange={(e) => setFilter(e.target.value as ScheduleFilter)}
            >
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="no_appointment">No appointment</option>
              <option value="all">All work orders</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {Object.entries(groupedJobs).map(([dateLabel, dateJobs]) => (
          <div key={dateLabel} className="card">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  {dateLabel}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {dateJobs.length} work order{dateJobs.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-[#f4efe4] px-4 py-2 text-sm font-black text-[#2b2926]">
                <CalendarDays size={16} />
                Schedule View
              </div>
            </div>

            <div className="grid gap-4">
              {dateJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-stone-200 bg-white/75 p-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#f4efe4] px-3 py-1 text-[#2b2926]">
                              <Clock size={13} />
                              {job.appointment_start
                                ? new Date(job.appointment_start).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "No time"}
                            </span>

                            <span className="rounded-full bg-stone-100 px-3 py-1">
                              Created{" "}
                              {new Date(job.created_at).toLocaleDateString()}
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

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {job.clients?.phone && (
                          <a
                            href={`tel:${job.clients.phone}`}
                            className="btn-secondary"
                          >
                            <Phone size={15} />
                            Call
                          </a>
                        )}

                        {job.clients?.phone && (
                          <a
                            href={`sms:${job.clients.phone}`}
                            className="btn-secondary"
                          >
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
              ))}
            </div>
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="card text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
              <Navigation size={24} />
            </div>

            <h2 className="mt-4 text-xl font-black text-stone-900">
              No scheduled work found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              Try changing the schedule filter or create a work order with an appointment time.
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

function ScheduleStat({
  title,
  value,
  active,
  onClick,
}: {
  title: string;
  value: string | number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[1.35rem] border p-5 text-left shadow-sm transition ${
        active
          ? "border-[#d8d0c1] bg-[#f4efe4]"
          : "border-stone-200 bg-white/80 hover:bg-white"
      }`}
    >
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-stone-950">
        {value}
      </p>
    </button>
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