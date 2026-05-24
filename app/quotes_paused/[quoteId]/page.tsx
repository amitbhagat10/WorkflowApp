"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Quote } from "@/types/app";

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = String(params.quoteId);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadQuote();
  }, []);

  async function loadQuote() {
    setMessage("");

    const { data, error } = await supabase
      .from("quotes")
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
      .eq("id", quoteId)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      setQuote(data as Quote);
    }
  }

  const quoteNumber = useMemo(() => {
    return quote ? `QTE-${quote.id.slice(0, 8).toUpperCase()}` : "";
  }, [quote]);

  function quoteMessage() {
    if (!quote) return "";

    return `Hi ${quote.clients?.name || ""}, here is your quote ${quoteNumber} for "${
      quote.title
    }".

Estimated total: $${Number(quote.total_amount || 0).toFixed(2)}
Valid until: ${quote.valid_until || "the agreed date"}

Please reply if you would like to approve this quote.`;
  }

  async function updateStatus(status: Quote["status"]) {
    if (!quote) return;

    const { error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", quote.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Quote marked as ${status}.`);
    loadQuote();
  }

  async function markSentQuietly() {
    if (!quote) return;

    if (quote.status === "draft") {
      await supabase
        .from("quotes")
        .update({ status: "sent" })
        .eq("id", quote.id);
    }
  }

  async function convertToJob() {
    if (!quote) return;

    if (quote.converted_job_id) {
      router.push(`/jobs/${quote.converted_job_id}`);
      return;
    }

    const insertResult = await supabase
      .from("jobs")
      .insert({
        client_id: quote.client_id,
        quote_id: quote.id,
        title: quote.title,
        description: quote.description,
        job_type: quote.job_type,
        status: "booked",
        labour_cost: Number(quote.estimated_labour_cost || 0),
        material_cost: Number(quote.estimated_material_cost || 0),
        due_date: null,
        notes: quote.notes,
      })
      .select("id")
      .single();

    if (insertResult.error) {
      setMessage(insertResult.error.message);
      return;
    }

    const jobId = insertResult.data.id;

    const updateResult = await supabase
      .from("quotes")
      .update({
        status: "converted",
        converted_job_id: jobId,
      })
      .eq("id", quote.id);

    if (updateResult.error) {
      setMessage(updateResult.error.message);
      return;
    }

    router.push(`/jobs/${jobId}`);
  }

  async function sendWhatsApp() {
    if (!quote) return;

    if (!quote.clients?.phone) {
      setMessage("Client phone is missing.");
      return;
    }

    await markSentQuietly();

    let digits = quote.clients.phone.replace(/\D/g, "");

    if (digits.startsWith("0")) {
      digits = "61" + digits.slice(1);
    }

    const url = `https://wa.me/${digits}?text=${encodeURIComponent(
      quoteMessage()
    )}`;

    window.open(url, "_blank");
  }

  async function sendSms() {
    if (!quote) return;

    if (!quote.clients?.phone) {
      setMessage("Client phone is missing.");
      return;
    }

    await markSentQuietly();

    window.location.href = `sms:${quote.clients.phone}?&body=${encodeURIComponent(
      quoteMessage()
    )}`;
  }

  async function sendEmail() {
    if (!quote) return;

    if (!quote.clients?.email) {
      setMessage("Client email is missing.");
      return;
    }

    await markSentQuietly();

    const subject = `Quote ${quoteNumber}: ${quote.title}`;
    const body = quoteMessage();

    window.location.href = `mailto:${quote.clients.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  function printQuote() {
    window.print();
  }

  if (message && !quote) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">{message}</p>
        <Link href="/quotes" className="btn-secondary mt-4 inline-block">
          Back to Quotes
        </Link>
      </div>
    );
  }

  if (!quote) {
    return <p>Loading quote...</p>;
  }

  return (
    <div className="invoice-page">
      <div className="no-print mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Quote Preview</h1>
          <p className="text-gray-500">
            Send the quote message, print it, approve/decline it, or convert it
            into a job.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/quotes" className="btn-secondary">
            Back
          </Link>

          <button onClick={printQuote} className="btn-secondary">
            Print / Save PDF
          </button>

          <button onClick={convertToJob} className="btn-primary">
            {quote.converted_job_id ? "Open Job" : "Convert to Job"}
          </button>
        </div>
      </div>

      {message && (
        <div className="no-print mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="no-print mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button onClick={() => updateStatus("sent")} className="btn-secondary">
          Mark Sent
        </button>

        <button
          onClick={() => updateStatus("approved")}
          className="btn-secondary"
        >
          Mark Approved
        </button>

        <button
          onClick={() => updateStatus("declined")}
          className="btn-secondary"
        >
          Mark Declined
        </button>

        <button onClick={loadQuote} className="btn-secondary">
          Refresh
        </button>
      </div>

      <div className="no-print mb-6 grid gap-4 md:grid-cols-3">
        <button onClick={sendWhatsApp} className="btn-primary">
          Send WhatsApp
        </button>

        <button onClick={sendSms} className="btn-secondary">
          Send SMS
        </button>

        <button onClick={sendEmail} className="btn-secondary">
          Send Email
        </button>
      </div>

      <div className="invoice-card card mx-auto max-w-4xl bg-white">
        <div className="border-b border-gray-200 pb-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row">
            <div>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
                WF
              </div>

              <h2 className="text-2xl font-bold">Work Flow Pro Services</h2>

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
              <h1 className="text-4xl font-bold tracking-tight">QUOTE</h1>

              <div className="mt-4 text-sm text-gray-600">
                <p>
                  <strong>Quote No:</strong> {quoteNumber}
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(quote.created_at).toLocaleDateString()}
                </p>

                <p>
                  <strong>Valid Until:</strong>{" "}
                  {quote.valid_until || "Not specified"}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span className="uppercase">
                    {quote.status.replace("_", " ")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 border-b border-gray-200 py-8 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Quote For
            </h3>

            <div className="mt-3 text-sm text-gray-700">
              <p className="text-lg font-semibold text-gray-900">
                {quote.clients?.name || "Client name"}
              </p>

              <p>{quote.clients?.address || "Client address not available"}</p>
              <p>{quote.clients?.phone || "No phone"}</p>
              <p>{quote.clients?.email || "No email"}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Proposed Work
            </h3>

            <div className="mt-3 text-sm text-gray-700">
              <p>
                <strong>Title:</strong> {quote.title}
              </p>

              <p>
                <strong>Type:</strong> {quote.job_type || "Not specified"}
              </p>
            </div>
          </div>
        </div>

        <div className="py-8">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
            Description
          </h3>

          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            {quote.description || "Proposed handyman services as discussed."}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b border-gray-200 px-4 py-3">
                  Estimate Item
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-right">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="border-b border-gray-100 px-4 py-3">
                  Estimated Labour
                </td>
                <td className="border-b border-gray-100 px-4 py-3 text-right">
                  ${Number(quote.estimated_labour_cost || 0).toFixed(2)}
                </td>
              </tr>

              <tr>
                <td className="border-b border-gray-100 px-4 py-3">
                  Estimated Materials
                </td>
                <td className="border-b border-gray-100 px-4 py-3 text-right">
                  ${Number(quote.estimated_material_cost || 0).toFixed(2)}
                </td>
              </tr>

              <tr className="bg-gray-50 font-bold">
                <td className="px-4 py-3">Estimated Total</td>
                <td className="px-4 py-3 text-right">
                  ${Number(quote.total_amount || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {quote.notes && (
          <div className="mt-8 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Notes</p>
            <p className="mt-2">{quote.notes}</p>
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-blue-50 p-6 text-sm text-blue-900">
          <p className="font-semibold">Quote Terms</p>
          <p className="mt-2">
            This quote is an estimate based on the information available at the
            time of quoting. Final invoice may vary if job scope, materials, or
            site conditions change.
          </p>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-700">
            Thank you for considering Work Flow Pro Services.
          </p>
          <p>Please reply to approve this quote or request changes.</p>
        </div>
      </div>
    </div>
  );
}