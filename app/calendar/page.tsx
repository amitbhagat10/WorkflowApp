"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ScheduleJob = {
  id: string;
  title: string;
  description: string | null;
  job_type: string | null;
  status: string | null;
  payment_status: string | null;
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

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    dateToKey(new Date())
  );

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

  const calendarDays = useMemo(() => {
    return buildCalendarDays(viewDate);
  }, [viewDate]);

  const jobsByDate = useMemo(() => {
    const map: Record<string, ScheduleJob[]> = {};

    jobs.forEach((job) => {
      if (!job.appointment_start) return;

      const key = dateToKey(new Date(job.appointment_start));

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(job);
    });

    return map;
  }, [jobs]);

  const filteredSelectedJobs = useMemo(() => {
    const selectedJobs = jobsByDate[selectedDateKey] || [];
    const search = searchTerm.trim().toLowerCase();

    if (!search) return selectedJobs;

    return selectedJobs.filter((job) => {
      return (
        job.title.toLowerCase().includes(search) ||
        (job.job_type || "").toLowerCase().includes(search) ||
        (job.description || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.clients?.phone || "").toLowerCase().includes(search) ||
        (job.clients?.address || "").toLowerCase().includes(search)
      );
    });
  }, [jobsByDate, selectedDateKey, searchTerm]);

  const unscheduledJobs = useMemo(() => {
    return jobs.filter((job) => !job.appointment_start);
  }, [jobs]);

  const monthJobs = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    return jobs.filter((job) => {
      if (!job.appointment_start) return false;

      const date = new Date(job.appointment_start);

      return date.getFullYear() === year && date.getMonth() === month;
    });
  }, [jobs, viewDate]);

  const selectedDate = keyToDate(selectedDateKey);
  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function previousMonth() {
    setViewDate(
      new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setViewDate(
      new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
    );
  }

  function goToday() {
    const today = new Date();
    setViewDate(today);
    setSelectedDateKey(dateToKey(today));
  }

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
            Click a calendar date to view booked work orders for that day.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={goToday} className="btn-secondary">
            Today
          </button>

          <button onClick={loadJobs} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="This Month" value={monthJobs.length} />
        <MiniStat title="Selected Day" value={filteredSelectedJobs.length} />
        <MiniStat title="Unscheduled" value={unscheduledJobs.length} />
        <MiniStat title="Total Work Orders" value={jobs.length} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-stone-900">
                {monthLabel}
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Dates with work orders show a count inside the calendar.
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={previousMonth} className="btn-secondary">
                <ChevronLeft size={17} />
              </button>

              <button onClick={nextMonth} className="btn-secondary">
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-black uppercase tracking-wide text-stone-400"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((day) => {
              const key = dateToKey(day);
              const dayJobs = jobsByDate[key] || [];
              const isSelected = key === selectedDateKey;
              const isToday = key === dateToKey(new Date());
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDateKey(key)}
                  className={`min-h-24 rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? "border-[#2b2926] bg-[#f4efe4] shadow-sm"
                      : "border-stone-200 bg-white/75 hover:bg-white"
                  } ${
                    isCurrentMonth ? "opacity-100" : "opacity-45"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                        isToday
                          ? "bg-[#2b2926] text-[#d8bd82]"
                          : "text-stone-900"
                      }`}
                    >
                      {day.getDate()}
                    </span>

                    {dayJobs.length > 0 && (
                      <span className="rounded-full bg-[#2b2926] px-2 py-1 text-xs font-black text-[#d8bd82]">
                        {dayJobs.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1">
                    {dayJobs.slice(0, 2).map((job) => (
                      <div
                        key={job.id}
                        className="truncate rounded-full bg-white/80 px-2 py-1 text-xs font-bold text-stone-600"
                      >
                        {job.title}
                      </div>
                    ))}

                    {dayJobs.length > 2 && (
                      <p className="pl-1 text-xs font-bold text-stone-500">
                        +{dayJobs.length - 2} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
                <CalendarDays size={20} />
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-stone-900">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>
                <p className="text-sm text-stone-500">
                  {filteredSelectedJobs.length} work order
                  {filteredSelectedJobs.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="relative mt-5">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search selected day..."
              />
            </div>
          </div>

          <div className="grid gap-4">
            {filteredSelectedJobs.map((job) => (
              <ScheduleCard key={job.id} job={job} mapUrl={mapUrl} />
            ))}

            {filteredSelectedJobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center">
                <CalendarDays className="mx-auto text-stone-400" size={30} />

                <h3 className="mt-3 text-lg font-black text-stone-900">
                  No work booked
                </h3>

                <p className="mt-1 text-sm text-stone-500">
                  Select another date or create a work order with an appointment.
                </p>

                <div className="mt-5">
                  <Link href="/jobs" className="btn-primary">
                    Create Work Order
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {unscheduledJobs.length > 0 && (
        <section className="card">
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              Unscheduled Work Orders
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              These jobs do not have an appointment date yet.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {unscheduledJobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-stone-200 bg-white/75 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
                    <Wrench size={18} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-black text-stone-900">
                      {job.title}
                    </h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {job.clients?.name || "No client"}
                    </p>
                  </div>
                </div>

                <Link href={`/jobs/${job.id}`} className="btn-secondary mt-4">
                  Open Work Order
                </Link>
              </div>
            ))}
          </div>

          {unscheduledJobs.length > 6 && (
            <p className="mt-4 text-sm font-semibold text-stone-500">
              Showing 6 of {unscheduledJobs.length} unscheduled jobs.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function ScheduleCard({
  job,
  mapUrl,
}: {
  job: ScheduleJob;
  mapUrl: (address: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/75 p-4 transition hover:bg-white hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
          <Wrench size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-stone-900">{job.title}</h3>
            <StatusBadge value={job.status || "booked"} />
          </div>

          <p className="mt-1 text-sm text-stone-500">
            {job.clients?.name || "No client"} · {job.job_type || "General work"}
          </p>

          <p className="mt-1 text-sm text-stone-500">
            {job.clients?.address || "No address added"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-stone-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f4efe4] px-3 py-1 text-[#2b2926]">
              <Clock size={13} />
              {job.appointment_start
                ? new Date(job.appointment_start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No time"}
            </span>

            <span className="rounded-full bg-stone-100 px-3 py-1">
              Due ${Number(job.amount_outstanding || 0).toFixed(2)}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
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
  );
}

function MiniStat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-stone-950">
        {value}
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
      : value === "in_progress"
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

function dateToKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function keyToDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function buildCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const mondayBasedStart = (firstDayOfMonth.getDay() + 6) % 7;

  const calendarStart = new Date(year, month, 1 - mondayBasedStart);

  return Array.from({ length: 42 }, (_, index) => {
    return new Date(
      calendarStart.getFullYear(),
      calendarStart.getMonth(),
      calendarStart.getDate() + index
    );
  });
}