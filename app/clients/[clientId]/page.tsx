"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Client, Job, Payment } from "@/types/app";

type ClientPayment = Payment & {
  jobs?: {
    title: string;
  } | null;
};

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = String(params.clientId);

  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientDetail();
  }, []);

  async function loadClientDetail() {
    setLoading(true);
    setMessage("");

    const clientResult = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientResult.error) {
      setMessage(clientResult.error.message);
      setLoading(false);
      return;
    }

    if (clientResult.data) {
      setClient(clientResult.data as Client);
    }

    const jobsResult = await supabase
      .from("jobs")
      .select("*")
      .eq("client_id", clientId)
      .order("appointment_start", { ascending: false });

    if (jobsResult.error) {
      setMessage(jobsResult.error.message);
    }

    if (jobsResult.data) {
      setJobs(jobsResult.data as Job[]);
    }

    const paymentsResult = await supabase
      .from("payments")
      .select(
        `
        *,
        jobs (
          title
        )
      `
      )
      .eq("client_id", clientId)
      .order("payment_date", { ascending: false });

    if (paymentsResult.data) {
      setPayments(paymentsResult.data as ClientPayment[]);
    }

    setLoading(false);
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

    const totalOutstanding = jobs.reduce(
      (sum, job) => sum + Number(job.amount_outstanding || 0),
      0
    );

    const completedJobs = jobs.filter((job) => job.status === "completed").length;

    const outstandingJobs = jobs.filter(
      (job) => Number(job.amount_outstanding || 0) > 0
    ).length;

    const overdueJobs = jobs.filter(
      (job) => job.payment_status === "overdue"
    ).length;

    const upcomingJobs = jobs.filter((job) => {
      if (!job.appointment_start) return false;
      return new Date(job.appointment_start) >= new Date();
    }).length;

    return {
      totalJobs: jobs.length,
      completedJobs,
      outstandingJobs,
      overdueJobs,
      upcomingJobs,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
    };
  }, [jobs]);

  function callClient() {
    if (!client?.phone) return;
    window.location.href = `tel:${client.phone}`;
  }

  function smsClient() {
    if (!client?.phone) return;

    const text = `Hi ${client.name}, this is regarding your handyman service.`;

    window.location.href = `sms:${client.phone}?&body=${encodeURIComponent(
      text
    )}`;
  }

  function emailClient() {
    if (!client?.email) return;

    const subject = "Regarding your handyman service";
    const text = `Hi ${client.name},\n\nThis is regarding your handyman service.\n\nThanks.`;

    window.location.href = `mailto:${client.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(text)}`;
  }

  function openMap() {
    if (!client?.address) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      client.address
    )}`;

    window.open(url, "_blank");
  }

  if (loading) {
    return <p>Loading client detail...</p>;
  }

  if (message && !client) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">{message}</p>
        <Link href="/clients" className="btn-secondary mt-4 inline-block">
          Back to Clients
        </Link>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="card">
        <p className="text-sm text-gray-500">Client not found.</p>
        <Link href="/clients" className="btn-secondary mt-4 inline-block">
          Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-gray-500">
            Full client profile, job history, payments, and outstanding balance.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/clients" className="btn-secondary">
            Back to Clients
          </Link>

          <Link href="/jobs" className="btn-primary">
            Add Job
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-4">
        <MetricCard title="Total Jobs" value={summary.totalJobs} />
        <MetricCard title="Completed" value={summary.completedJobs} />
        <MetricCard title="Upcoming" value={summary.upcomingJobs} />
        <MetricCard title="Overdue" value={summary.overdueJobs} danger />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <MetricCard
          title="Total Invoiced"
          value={`$${summary.totalInvoiced.toFixed(2)}`}
        />
        <MetricCard
          title="Total Paid"
          value={`$${summary.totalPaid.toFixed(2)}`}
        />
        <MetricCard
          title="Outstanding"
          value={`$${summary.totalOutstanding.toFixed(2)}`}
          danger
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card">
          <h2 className="mb-4 text-xl font-bold">Client Details</h2>

          <div className="space-y-3 text-sm">
            <InfoRow label="Name" value={client.name} />
            <InfoRow label="Phone" value={client.phone || "No phone"} />
            <InfoRow label="Email" value={client.email || "No email"} />
            <InfoRow label="Address" value={client.address || "No address"} />
          </div>

          {client.notes && (
            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notes
              </p>
              <p className="mt-2 text-sm text-gray-700">{client.notes}</p>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={callClient}
              disabled={!client.phone}
              className="btn-primary disabled:opacity-50"
            >
              Call Client
            </button>

            <button
              onClick={smsClient}
              disabled={!client.phone}
              className="btn-secondary disabled:opacity-50"
            >
              SMS Client
            </button>

            <button
              onClick={emailClient}
              disabled={!client.email}
              className="btn-secondary disabled:opacity-50"
            >
              Email Client
            </button>

            <button
              onClick={openMap}
              disabled={!client.address}
              className="btn-secondary disabled:opacity-50"
            >
              Open Address in Maps
            </button>
          </div>
        </div>

        <div className="card xl:col-span-2">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold">Job History</h2>
              <p className="text-sm text-gray-500">
                All work recorded for this client.
              </p>
            </div>

            <button onClick={loadClientDetail} className="btn-secondary">
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>

                    <p className="text-sm text-gray-500">
                      Type: {job.job_type || "Not specified"}
                    </p>

                    <p className="text-sm text-gray-500">
                      Appointment:{" "}
                      {job.appointment_start
                        ? new Date(job.appointment_start).toLocaleString()
                        : "No appointment date"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
                        {job.status.replace("_", " ")}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase text-gray-700">
                        {job.payment_status.replace("_", " ")}
                      </span>
                    </div>
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
                      <Link href={`/jobs/${job.id}`} className="btn-primary">
                        Job Details
                      </Link>

                      <Link
                        href={`/invoices/${job.id}`}
                        className="btn-secondary"
                      >
                        Invoice
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {jobs.length === 0 && (
              <p className="text-sm text-gray-500">
                No jobs recorded for this client yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="mb-4 text-xl font-bold">Payment History</h2>

        {payments.length === 0 && (
          <p className="text-sm text-gray-500">
            No payments recorded for this client yet.
          </p>
        )}

        <div className="space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <p className="font-semibold">
                    ${Number(payment.amount || 0).toFixed(2)}
                  </p>

                  <p className="text-sm text-gray-500">
                    Job: {payment.jobs?.title || "Job not available"}
                  </p>

                  <p className="text-sm text-gray-500">
                    Method: {payment.payment_method.replace("_", " ")}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm text-gray-500">
                    {payment.payment_date}
                  </p>

                  {payment.notes && (
                    <p className="mt-2 text-sm text-gray-600">
                      {payment.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
      <span className="font-semibold text-gray-600">{label}</span>
      <span className="text-right text-gray-800">{value}</span>
    </div>
  );
}