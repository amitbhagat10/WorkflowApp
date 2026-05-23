"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types/app";

type CalendarFilter = "today" | "upcoming" | "past" | "no_appointment" | "all";

export default function CalendarPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<CalendarFilter>("today");
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
      .order("appointment_start", { ascending: true });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setJobs(data as Job[]);
    }
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

  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.job_type || "").toLowerCase().includes(search) ||
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

  const summary = useMemo(() => {
    return {
      today: jobs.filter((job) => isToday(job.appointment_start)).length,
      upcoming: jobs.filter((job) => isUpcoming(job.appointment_start)).length,
      past: jobs.filter((job) => isPast(job.appointment_start)).length,
      noAppointment: jobs.filter((job) => !job.appointment_start).length,
      all: jobs.length,
    };
  }, [jobs]);

  const groupedJobs = useMemo(() => {
    const groups: Record<string, Job[]> = {};

    filteredJobs.forEach((job) => {
      const groupKey = job.appointment_start
        ? new Date(job.appointment_start).toDateString()
        : "No appointment date";

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      groups[groupKey].push(job);
    });

    return groups;
  }, [filteredJobs]);

  function mapUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-gray-500">
            View today’s schedule, upcoming appointments, and unscheduled jobs.
          </p>
        </div>

        <button onClick={loadJobs} className="btn-secondary">
          Refresh
        </button>
      </div>

      {message && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="mb-6 grid gap-5 md:grid-cols-5">
        <MetricCard
          title="Today"
          value={summary.today}
          active={filter === "today"}
          onClick={() => setFilter("today")}
        />

        <MetricCard
          title="Upcoming"
          value={summary.upcoming}
          active={filter === "upcoming"}
          onClick={() => setFilter("upcoming")}
        />

        <MetricCard
          title="Past"
          value={summary.past}
          active={filter === "past"}
          onClick={() => setFilter("past")}
        />

        <MetricCard
          title="No Appointment"
          value={summary.noAppointment}
          active={filter === "no_appointment"}
          onClick={() => setFilter("no_appointment")}
        />

        <MetricCard
          title="All Jobs"
          value={summary.all}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
      </div>

      <div className="card mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="label">Search Schedule</label>
            <input
              className="input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search job, client, phone, address..."
            />
          </div>

          <div>
            <label className="label">Schedule Filter</label>
            <select
              className="input"
              value={filter}
              onChange={(e) => setFilter(e.target.value as CalendarFilter)}
            >
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="no_appointment">No appointment</option>
              <option value="all">All jobs</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedJobs).map(([dateLabel, dateJobs]) => (
          <div key={dateLabel} className="card">
            <h2 className="mb-4 text-xl font-bold">{dateLabel}</h2>

            <div className="space-y-3">
              {dateJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{job.title}</h3>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
                          {job.status.replace("_", " ")}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-700">
                          {job.payment_status.replace("_", " ")}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        {job.clients?.name || "No client"} ·{" "}
                        {job.clients?.phone || "No phone"}
                      </p>

                      <p className="text-sm text-gray-500">
                        {job.clients?.address || "No address"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Job type: {job.job_type || "Not specified"}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-700">
                        Time:{" "}
                        {job.appointment_start
                          ? new Date(job.appointment_start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No appointment time"}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-500">
                        Total: ${Number(job.total_amount || 0).toFixed(2)}
                      </p>

                      <p className="text-sm text-gray-500">
                        Paid: ${Number(job.amount_paid || 0).toFixed(2)}
                      </p>

                      <p className="font-bold text-red-700">
                        Outstanding: $
                        {Number(job.amount_outstanding || 0).toFixed(2)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                        {job.clients?.phone && (
                          <a
                            href={`tel:${job.clients.phone}`}
                            className="btn-secondary"
                          >
                            Call
                          </a>
                        )}

                        {job.clients?.phone && (
                          <a
                            href={`sms:${job.clients.phone}`}
                            className="btn-secondary"
                          >
                            SMS
                          </a>
                        )}

                        {job.clients?.address && (
                          <a
                            href={mapUrl(job.clients.address)}
                            target="_blank"
                            className="btn-secondary"
                          >
                            Map
                          </a>
                        )}

                        <Link href={`/jobs/${job.id}`} className="btn-primary">
                          Job Details
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
            <p className="text-sm text-gray-500">
              No jobs found for the selected schedule filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
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
      className={`rounded-2xl border p-5 text-left shadow-sm ${
        active
          ? "border-blue-200 bg-blue-50"
          : "border-gray-100 bg-white hover:bg-gray-50"
      }`}
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </button>
  );
}