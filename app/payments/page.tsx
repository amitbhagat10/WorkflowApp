"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types/app";

export default function PaymentsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    job_id: "",
    amount: "",
    payment_method: "bank_transfer",
    notes: "",
  });

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
          address
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setJobs(data as Job[]);
    }
  }

  const selectedJob = jobs.find((job) => job.id === form.job_id);

  const outstandingJobs = useMemo(() => {
    return jobs.filter((job) => Number(job.amount_outstanding) > 0);
  }, [jobs]);

  const totals = useMemo(() => {
    return {
      totalOutstanding: jobs.reduce(
        (sum, job) => sum + Number(job.amount_outstanding || 0),
        0
      ),
      totalPaid: jobs.reduce(
        (sum, job) => sum + Number(job.amount_paid || 0),
        0
      ),
    };
  }, [jobs]);

  async function addPayment() {
    setMessage("");

    if (!selectedJob) {
      setMessage("Please select a job.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setMessage("Please enter a valid payment amount.");
      return;
    }

    const { error } = await supabase.from("payments").insert({
      job_id: selectedJob.id,
      client_id: selectedJob.client_id,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      notes: form.notes || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({
      job_id: "",
      amount: "",
      payment_method: "bank_transfer",
      notes: "",
    });

    setMessage("Payment saved successfully.");
    loadJobs();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-gray-500">
          Track money received and outstanding balances.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="mb-6 grid gap-5 md:grid-cols-2">
        <div className="card">
          <p className="text-sm text-gray-500">Total Received</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            ${totals.totalPaid.toFixed(2)}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Total Outstanding</p>
          <p className="mt-2 text-3xl font-bold text-red-700">
            ${totals.totalOutstanding.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <h2 className="mb-4 text-xl font-bold">Record Payment</h2>

          <div className="space-y-4">
            <div>
              <label className="label">Job</label>
              <select
                className="input"
                value={form.job_id}
                onChange={(e) =>
                  setForm({ ...form, job_id: e.target.value })
                }
              >
                <option value="">Select outstanding job</option>

                {outstandingJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.clients?.name} - $
                    {Number(job.amount_outstanding).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {selectedJob && (
              <div className="rounded-xl bg-gray-50 p-4 text-sm">
                <p>
                  <strong>Client:</strong> {selectedJob.clients?.name}
                </p>
                <p>
                  <strong>Job:</strong> {selectedJob.title}
                </p>
                <p>
                  <strong>Total:</strong> $
                  {Number(selectedJob.total_amount).toFixed(2)}
                </p>
                <p>
                  <strong>Already Paid:</strong> $
                  {Number(selectedJob.amount_paid).toFixed(2)}
                </p>
                <p>
                  <strong>Outstanding:</strong> $
                  {Number(selectedJob.amount_outstanding).toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <label className="label">Amount Received</label>
              <input
                className="input"
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
                placeholder="100"
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
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="payid">PayID</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                value={form.notes}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value })
                }
                placeholder="Payment reference or comments"
              />
            </div>

            <button onClick={addPayment} className="btn-primary w-full">
              Save Payment
            </button>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Outstanding Jobs</h2>

          <div className="space-y-3">
            {outstandingJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>

                    <p className="text-sm text-gray-500">
                      {job.clients?.name} · {job.clients?.phone}
                    </p>

                    <p className="text-sm text-gray-500">
                      Address: {job.clients?.address || "No address"}
                    </p>

                    <p className="text-sm text-gray-500">
                      Due date: {job.due_date || "No due date"}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm text-gray-500">
                      Total: ${Number(job.total_amount).toFixed(2)}
                    </p>

                    <p className="text-sm text-gray-500">
                      Paid: ${Number(job.amount_paid).toFixed(2)}
                    </p>

                    <p className="text-lg font-bold text-red-700">
                      Outstanding: $
                      {Number(job.amount_outstanding).toFixed(2)}
                    </p>

                    <p className="mt-1 text-xs font-semibold uppercase text-blue-700">
                      {job.payment_status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {outstandingJobs.length === 0 && (
              <p className="text-sm text-gray-500">
                No outstanding payments. Great work.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}