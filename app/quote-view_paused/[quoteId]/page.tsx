"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PublicQuote = {
  id: string;
  title: string;
  description: string | null;
  job_type: string | null;
  estimated_labour_cost: number;
  estimated_material_cost: number;
  total_amount: number;
  status: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
};

export default function QuoteViewPage() {
  const params = useParams();
  const quoteId = String(params.quoteId || "");

  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuote();
  }, [quoteId]);

  async function loadQuote() {
    setLoading(true);
    setMessage("");

    if (!quoteId || quoteId === "undefined") {
      setMessage("Invalid quote link.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_public_quote_by_id", {
      input_quote_id: quoteId,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setMessage("Quote not found.");
      setLoading(false);
      return;
    }

    setQuote(data[0] as PublicQuote);
    setLoading(false);
  }

  const quoteNumber = useMemo(() => {
    return quote ? `QTE-${quote.id.slice(0, 8).toUpperCase()}` : "";
  }, [quote]);

  function printQuote() {
    window.print();
  }

  if (loading) {
    return <p>Loading quote...</p>;
  }

  if (message) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Quote</h1>
        <p className="mt-3 text-sm text-red-600">{message}</p>
      </div>
    );
  }

  if (!quote) {
    return <p>Quote not available.</p>;
  }

  return (
    <div className="invoice-page">
      <div className="no-print mx-auto mb-6 flex max-w-4xl flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Quote</h1>
          <p className="text-gray-500">
            Review this quote and save or print a PDF copy.
          </p>
        </div>

        <button onClick={printQuote} className="btn-primary">
          Print / Save PDF
        </button>
      </div>

      <div className="invoice-card card mx-auto max-w-4xl bg-white">
        <div className="border-b border-gray-200 pb-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row">
            <div>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
                HF
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
                {quote.client_name || "Client name"}
              </p>

              <p>{quote.client_address || "Client address not available"}</p>
              <p>{quote.client_phone || "No phone"}</p>
              <p>{quote.client_email || "No email"}</p>
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