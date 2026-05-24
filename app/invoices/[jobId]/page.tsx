"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job, Payment } from "@/types/app";

export default function InvoiceDetailPage() {
  const params = useParams();
  const jobId = String(params.jobId);

  const [job, setJob] = useState<Job | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadInvoice();
  }, []);

  async function loadInvoice() {
    setMessage("");

    const jobResult = await supabase
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
      .eq("id", jobId)
      .single();

    if (jobResult.error) {
      setMessage(jobResult.error.message);
      return;
    }

    if (jobResult.data) {
      setJob(jobResult.data as Job);
    }

    const paymentsResult = await supabase
      .from("payments")
      .select("*")
      .eq("job_id", jobId)
      .order("payment_date", { ascending: false });

    if (paymentsResult.data) {
      setPayments(paymentsResult.data as Payment[]);
    }
  }

  const invoiceNumber = useMemo(() => {
    return job ? `INV-${job.id.slice(0, 8).toUpperCase()}` : "";
  }, [job]);

  const invoiceDate = useMemo(() => {
    return new Date().toLocaleDateString();
  }, []);

  function printInvoice() {
    window.print();
  }

  if (message) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">{message}</p>
        <Link href="/invoices" className="btn-secondary mt-4 inline-block">
          Back to Invoices
        </Link>
      </div>
    );
  }

  if (!job) {
    return <p>Loading invoice...</p>;
  }

  return (
    <div className="invoice-page">
      <div className="no-print mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoice Preview</h1>
          <p className="text-gray-500">
            Print this invoice or save it as PDF.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/invoices" className="btn-secondary">
            Back
          </Link>

          <button onClick={printInvoice} className="btn-primary">
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="invoice-card card mx-auto max-w-4xl bg-white">
        <div className="border-b border-gray-200 pb-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row">
            <div>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
                HF
              </div>

              <h2 className="text-2xl font-bold">Work Flow Services</h2>

              <p className="mt-2 text-sm text-gray-500">
                Professional field service and property operations
              </p>

              <div className="mt-4 text-sm text-gray-600">
                <p>Melbourne, VIC</p>
                <p>Phone: 04xx xxx xxx</p>
                <p>Email: handyman@example.com</p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <h1 className="text-4xl font-bold tracking-tight">INVOICE</h1>

              <div className="mt-4 text-sm text-gray-600">
                <p>
                  <strong>Invoice No:</strong> {invoiceNumber}
                </p>

                <p>
                  <strong>Invoice Date:</strong> {invoiceDate}
                </p>

                <p>
                  <strong>Due Date:</strong> {job.due_date || "Not specified"}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span className="uppercase">
                    {job.payment_status.replace("_", " ")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 border-b border-gray-200 py-8 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Bill To
            </h3>

            <div className="mt-3 text-sm text-gray-700">
              <p className="text-lg font-semibold text-gray-900">
                {job.clients?.name || "Client name"}
              </p>

              <p>{job.clients?.address || "Client address not available"}</p>
              <p>{job.clients?.phone || "No phone"}</p>
              <p>{job.clients?.email || "No email"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Job Details
            </h3>

            <div className="mt-3 text-sm text-gray-700">
              <p>
                <strong>Job:</strong> {job.title}
              </p>

              <p>
                <strong>Type:</strong> {job.job_type || "Not specified"}
              </p>

              <p>
                <strong>Appointment:</strong>{" "}
                {job.appointment_start
                  ? new Date(job.appointment_start).toLocaleString()
                  : "Not specified"}
              </p>

              <p>
                <strong>Work Status:</strong>{" "}
                <span className="uppercase">{job.status.replace("_", " ")}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="py-8">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
            Work Description
          </h3>

          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            {job.description || job.notes || "Handyman services completed as discussed."}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b border-gray-200 px-4 py-3">Item</th>
                <th className="border-b border-gray-200 px-4 py-3 text-right">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="border-b border-gray-100 px-4 py-3">
                  Labour Cost
                </td>
                <td className="border-b border-gray-100 px-4 py-3 text-right">
                  ${Number(job.labour_cost || 0).toFixed(2)}
                </td>
              </tr>

              <tr>
                <td className="border-b border-gray-100 px-4 py-3">
                  Material Cost
                </td>
                <td className="border-b border-gray-100 px-4 py-3 text-right">
                  ${Number(job.material_cost || 0).toFixed(2)}
                </td>
              </tr>

              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-3">Total Amount</td>
                <td className="px-4 py-3 text-right">
                  ${Number(job.total_amount || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              Payment History
            </h3>

            {payments.length === 0 && (
              <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                No payments recorded yet.
              </p>
            )}

            {payments.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 px-4 py-3">
                        Date
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3">
                        Method
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="border-b border-gray-100 px-4 py-3">
                          {payment.payment_date}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3">
                          {payment.payment_method.replace("_", " ")}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-3 text-right">
                          ${Number(payment.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-gray-50 p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Total</span>
                <span>${Number(job.total_amount || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Paid</span>
                <span className="text-green-700">
                  ${Number(job.amount_paid || 0).toFixed(2)}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Balance Due</span>
                  <span className="text-red-700">
                    ${Number(job.amount_outstanding || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-white p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-800">Payment Instructions</p>
              <p className="mt-2">Bank Transfer / PayID / Cash accepted.</p>
              <p>Please include the invoice number as payment reference.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-700">
            Thank you for your business.
          </p>
          <p>
            For questions about this invoice, please contact Work Flow Pro Services.
          </p>
        </div>
      </div>
    </div>
  );
}