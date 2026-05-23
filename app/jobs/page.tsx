"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Client, Job } from "@/types/app";

export default function JobsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [outstandingOnly, setOutstandingOnly] = useState(false);

  const [form, setForm] = useState({
    client_id: "",
    title: "",
    description: "",
    job_type: "",
    appointment_start: "",
    appointment_end: "",
    status: "booked",
    labour_cost: "",
    material_cost: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setMessage("");

    const clientsResult = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (clientsResult.error) {
      setMessage(clientsResult.error.message);
    }

    if (clientsResult.data) {
      setClients(clientsResult.data as Client[]);
    }

    const jobsResult = await supabase
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
      .order("appointment_start", { ascending: false });

    if (jobsResult.error) {
      setMessage(jobsResult.error.message);
    }

    if (jobsResult.data) {
      setJobs(jobsResult.data as Job[]);
    }
  }

  async function addJob() {
    setMessage("");

    if (!form.client_id) {
      setMessage("Please select a client.");
      return;
    }

    if (!form.title.trim()) {
      setMessage("Job title is required.");
      return;
    }

    const { error } = await supabase.from("jobs").insert({
      client_id: form.client_id,
      title: form.title,
      description: form.description || null,
      job_type: form.job_type || null,
      appointment_start: form.appointment_start || null,
      appointment_end: form.appointment_end || null,
      status: form.status,
      labour_cost: Number(form.labour_cost || 0),
      material_cost: Number(form.material_cost || 0),
      due_date: form.due_date || null,
      notes: form.notes || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      client_id: "",
      title: "",
      description: "",
      job_type: "",
      appointment_start: "",
      appointment_end: "",
      status: "booked",
      labour_cost: "",
      material_cost: "",
      due_date: "",
      notes: "",
    });

    setMessage("Job saved successfully.");
    loadData();
  }

  async function updateJobStatus(jobId: string, status: string) {
    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", jobId);

    if (error) {
      setMessage(error.message);
      return;
    }

    loadData();
  }

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFilter("all");
    setJobTypeFilter("all");
    setOutstandingOnly(false);
  }

  const jobTypes = useMemo(() => {
    const types = jobs
      .map((job) => job.job_type)
      .filter((value): value is string => Boolean(value));

    return Array.from(new Set(types)).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return jobs.filter((job) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.description || "").toLowerCase().includes(search) ||
        (job.job_type || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.clients?.phone || "").toLowerCase().includes(search) ||
        (job.clients?.address || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || job.status === statusFilter;

      const matchesPayment =
        paymentFilter === "all" || job.payment_status === paymentFilter;

      const matchesJobType =
        jobTypeFilter === "all" || job.job_type === jobTypeFilter;

      const matchesOutstanding =
        !outstandingOnly || Number(job.amount_outstanding || 0) > 0;

      let matchesDate = true;

      if (dateFilter !== "all") {
        if (!job.appointment_start) {
          matchesDate = dateFilter === "no_appointment";
        } else {
          const appointmentDate = new Date(job.appointment_start);

          if (dateFilter === "today") {
            matchesDate = appointmentDate >= today && appointmentDate < tomorrow;
          }

          if (dateFilter === "upcoming") {
            matchesDate = appointmentDate >= today;
          }

          if (dateFilter === "past") {
            matchesDate = appointmentDate < today;
          }

          if (dateFilter === "no_appointment") {
            matchesDate = false;
          }
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment &&
        matchesJobType &&
        matchesOutstanding &&
        matchesDate
      );
    });
  }, [
    jobs,
    searchTerm,
    statusFilter,
    paymentFilter,
    dateFilter,
    jobTypeFilter,
    outstandingOnly,
  ]);

  const filterSummary = useMemo(() => {
    return {
      totalJobs: jobs.length,
      filteredJobs: filteredJobs.length,
      outstandingAmount: filteredJobs.reduce(
        (sum, job) => sum + Number(job.amount_outstanding || 0),
        0
      ),
      totalAmount: filteredJobs.reduce(
        (sum, job) => sum + Number(job.total_amount || 0),
        0
      ),
    };
  }, [jobs, filteredJobs]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <p className="text-gray-500">
          Create jobs, schedule appointments, search work history, and track
          payment status.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-1">
          <h2 className="mb-4 text-xl font-bold">Add Job</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Client</label>
              <select
                className="input"
                value={form.client_id}
                onChange={(e) =>
                  setForm({ ...form, client_id: e.target.value })
                }
              >
                <option value="">Select client</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Job Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="Bathroom tap replacement"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Job details"
              />
            </div>

            <div>
              <label className="label">Job Type</label>
              <input
                className="input"
                value={form.job_type}
                onChange={(e) =>
                  setForm({ ...form, job_type: e.target.value })
                }
                placeholder="Plumbing, repair, painting..."
              />
            </div>

            <div>
              <label className="label">Appointment Start</label>
              <input
                className="input"
                type="datetime-local"
                value={form.appointment_start}
                onChange={(e) =>
                  setForm({ ...form, appointment_start: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Appointment End</label>
              <input
                className="input"
                type="datetime-local"
                value={form.appointment_end}
                onChange={(e) =>
                  setForm({ ...form, appointment_end: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Labour Cost</label>
                <input
                  className="input"
                  type="number"
                  value={form.labour_cost}
                  onChange={(e) =>
                    setForm({ ...form, labour_cost: e.target.value })
                  }
                  placeholder="120"
                />
              </div>

              <div>
                <label className="label">Material Cost</label>
                <input
                  className="input"
                  type="number"
                  value={form.material_cost}
                  onChange={(e) =>
                    setForm({ ...form, material_cost: e.target.value })
                  }
                  placeholder="45"
                />
              </div>
            </div>

            <div>
              <label className="label">Payment Due Date</label>
              <input
                className="input"
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm({ ...form, due_date: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                placeholder="Internal notes"
              />
            </div>

            <button onClick={addJob} className="btn-primary w-full">
              Save Job
            </button>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <div className="card">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold">Search & Filters</h2>
                <p className="text-sm text-gray-500">
                  Quickly find jobs by client, address, job title, status, or
                  payment condition.
                </p>
              </div>

              <button onClick={clearFilters} className="btn-secondary">
                Clear Filters
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-3">
                <label className="label">Search</label>
                <input
                  className="input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search title, client, phone, address, job type..."
                />
              </div>

              <div>
                <label className="label">Job Status</label>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="booked">Booked</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="label">Payment Status</label>
                <select
                  className="input"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <option value="all">All payments</option>
                  <option value="not_invoiced">Not Invoiced</option>
                  <option value="invoice_sent">Invoice Sent</option>
                  <option value="part_paid">Part Paid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="label">Date</label>
                <select
                  className="input"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="no_appointment">No appointment</option>
                </select>
              </div>

              <div>
                <label className="label">Job Type</label>
                <select
                  className="input"
                  value={jobTypeFilter}
                  onChange={(e) => setJobTypeFilter(e.target.value)}
                >
                  <option value="all">All job types</option>
                  {jobTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={outstandingOnly}
                    onChange={(e) => setOutstandingOnly(e.target.checked)}
                  />
                  Outstanding only
                </label>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <SummaryBox title="All Jobs" value={filterSummary.totalJobs} />
              <SummaryBox
                title="Filtered"
                value={filterSummary.filteredJobs}
              />
              <SummaryBox
                title="Filtered Total"
                value={`$${filterSummary.totalAmount.toFixed(2)}`}
              />
              <SummaryBox
                title="Filtered Outstanding"
                value={`$${filterSummary.outstandingAmount.toFixed(2)}`}
                danger
              />
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold">Job List</h2>
                <p className="text-sm text-gray-500">
                  Showing {filteredJobs.length} of {jobs.length} jobs.
                </p>
              </div>

              <button onClick={loadData} className="btn-secondary">
                Refresh
              </button>
            </div>

            <div className="space-y-3">
              {filteredJobs.map((job) => (
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

                      <p className="mt-1 text-sm text-gray-500">
                        {job.appointment_start
                          ? new Date(job.appointment_start).toLocaleString()
                          : "No appointment date"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Type: {job.job_type || "Not specified"}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="font-semibold">
                        Total: ${Number(job.total_amount || 0).toFixed(2)}
                      </p>

                      <p className="text-sm text-gray-500">
                        Paid: ${Number(job.amount_paid || 0).toFixed(2)}
                      </p>

                      <p className="text-sm font-semibold text-red-600">
                        Outstanding: $
                        {Number(job.amount_outstanding || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <select
                      className="input max-w-xs"
                      value={job.status}
                      onChange={(e) =>
                        updateJobStatus(job.id, e.target.value)
                      }
                    >
                      <option value="new">New</option>
                      <option value="booked">Booked</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
                      {job.payment_status.replace("_", " ")}
                    </span>

                    <Link href={`/jobs/${job.id}`} className="btn-primary">
                      View Details
                    </Link>

                    <Link href={`/invoices/${job.id}`} className="btn-secondary">
                      Invoice
                    </Link>
                  </div>
                </div>
              ))}

              {filteredJobs.length === 0 && (
                <div className="rounded-xl bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No jobs match the selected filters.
                  </p>

                  <button
                    onClick={clearFilters}
                    className="btn-secondary mt-4"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryBox({
  title,
  value,
  danger = false,
}: {
  title: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p
        className={`mt-2 text-xl font-bold ${
          danger ? "text-red-700" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}