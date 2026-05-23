"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types/app";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        *,
        clients (
          name,
          phone,
          address
        )
      `
      )
      .order("appointment_start", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setJobs(data as Job[]);
    }

    setLoading(false);
  }

  const summary = useMemo(() => {
    const today = new Date();

    const todayJobs = jobs.filter((job) => {
      if (!job.appointment_start) return false;
      const jobDate = new Date(job.appointment_start);
      return jobDate.toDateString() === today.toDateString();
    });

    const upcomingJobs = jobs.filter((job) => {
      if (!job.appointment_start) return false;
      return new Date(job.appointment_start) >= today;
    });

    const totalReceived = jobs.reduce(
      (sum, job) => sum + Number(job.amount_paid || 0),
      0
    );

    const totalOutstanding = jobs.reduce(
      (sum, job) => sum + Number(job.amount_outstanding || 0),
      0
    );

    const completedJobs = jobs.filter(
      (job) => job.status === "completed"
    ).length;

    const overdueJobs = jobs.filter(
      (job) => job.payment_status === "overdue"
    ).length;

    return {
      todayJobs: todayJobs.length,
      upcomingJobs,
      totalReceived,
      totalOutstanding,
      completedJobs,
      overdueJobs,
    };
  }, [jobs]);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">
            Manage clients, jobs, appointments, and payments.
          </p>
        </div>

        <button onClick={loadDashboard} className="btn-secondary">
          Refresh
        </button>
      </div>

      {message && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-5">
        <MetricCard title="Today Jobs" value={summary.todayJobs} />

        <MetricCard
          title="Money Received"
          value={`$${summary.totalReceived.toFixed(2)}`}
        />

        <MetricCard
          title="Outstanding"
          value={`$${summary.totalOutstanding.toFixed(2)}`}
          danger
        />

        <MetricCard title="Overdue" value={summary.overdueJobs} danger />

        <MetricCard title="Completed Jobs" value={summary.completedJobs} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Upcoming Appointments</h2>
            <Link href="/jobs" className="text-sm font-semibold text-blue-600">
              View all jobs
            </Link>
          </div>

          <div className="space-y-3">
            {summary.upcomingJobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>

                    <p className="text-sm text-gray-500">
                      {job.clients?.name || "No client"} ·{" "}
                      {job.clients?.phone || "No phone"}
                    </p>

                    <p className="text-sm text-gray-500">
                      {job.clients?.address || "No address"}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm font-semibold">
                      {job.appointment_start
                        ? new Date(job.appointment_start).toLocaleString()
                        : "No appointment"}
                    </p>

                    <p className="mt-1 text-xs font-semibold uppercase text-blue-700">
                      {job.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {summary.upcomingJobs.length === 0 && (
              <p className="text-sm text-gray-500">
                No upcoming appointments.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold">Quick Actions</h2>

          <div className="mt-5 flex flex-col gap-3">
            <Link href="/clients" className="btn-primary text-center">
              Add Client
            </Link>

            <Link href="/jobs" className="btn-secondary text-center">
              Add Job
            </Link>

            <Link href="/payments" className="btn-secondary text-center">
              Record Payment
            </Link>
          </div>

          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700">
              Business Snapshot
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Total jobs recorded: {jobs.length}
            </p>

            <p className="text-sm text-gray-500">
              Outstanding jobs:{" "}
              {
                jobs.filter((job) => Number(job.amount_outstanding || 0) > 0)
                  .length
              }
            </p>

            <p className="text-sm text-gray-500">
              Paid jobs:{" "}
              {jobs.filter((job) => job.payment_status === "paid").length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  danger = false,
}: {
  title: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{title}</p>
      <p
        className={`mt-2 text-3xl font-bold ${
          danger ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}