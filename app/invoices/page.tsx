"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types/app";

export default function InvoicesPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState("");

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
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setJobs(data as Job[]);
    }
  }

  const totals = useMemo(() => {
    return {
      totalInvoiced: jobs.reduce(
        (sum, job) => sum + Number(job.total_amount || 0),
        0
      ),
      totalPaid: jobs.reduce(
        (sum, job) => sum + Number(job.amount_paid || 0),
        0
      ),
      totalOutstanding: jobs.reduce(
        (sum, job) => sum + Number(job.amount_outstanding || 0),
        0
      ),
    };
  }, [jobs]);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-gray-500">
            Generate professional invoices for completed or booked jobs.
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

      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Total Invoiced</p>
          <p className="mt-2 text-3xl font-bold">
            ${totals.totalInvoiced.toFixed(2)}
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-gray-500">Total Paid</p>
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

      <div className="card">
        <h2 className="mb-4 text-xl font-bold">Invoice List</h2>

        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h3 className="font-semibold">{job.title}</h3>

                  <p className="text-sm text-gray-500">
                    {job.clients?.name || "No client"} ·{" "}
                    {job.clients?.phone || "No phone"}
                  </p>

                  <p className="text-sm text-gray-500">
                    Due date: {job.due_date || "No due date"}
                  </p>

                  <p className="mt-1 text-xs font-semibold uppercase text-blue-700">
                    {job.payment_status.replace("_", " ")}
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

                  <Link
                    href={`/invoices/${job.id}`}
                    className="btn-primary mt-3 inline-block"
                  >
                    View Invoice
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {jobs.length === 0 && (
            <p className="text-sm text-gray-500">
              No jobs available for invoicing yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}