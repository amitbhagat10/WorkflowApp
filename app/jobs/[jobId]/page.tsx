"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClientInfo = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type WorkOrder = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  job_type: string | null;
  status: string;
  payment_status: string;
  labour_cost: number | null;
  material_cost: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  amount_outstanding: number | null;
  appointment_start: string | null;
  notes: string | null;
  created_at: string;
  clients?: ClientInfo | null;
};

type PaymentRecord = {
  id: string;
  job_id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
};

type JobPhoto = {
  id: string;
  job_id: string;
  file_path?: string | null;
  public_url?: string | null;
  photo_url?: string | null;
  url?: string | null;
  caption?: string | null;
  created_at: string;
};

export default function WorkOrderDetailPage() {
  const params = useParams();
  const jobId = String(params.jobId);

  const [job, setJob] = useState<WorkOrder | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "Cash",
    payment_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    setMessage("");

    const jobResult = await supabase
      .from("jobs")
      .select(
        `
        *,
        clients (
          id,
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

    const loadedJob = jobResult.data as unknown as WorkOrder;
    setJob(loadedJob);
    setNotes(loadedJob.notes || "");

    const paymentsResult = await supabase
      .from("payments")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (!paymentsResult.error) {
      setPayments((paymentsResult.data || []) as unknown as PaymentRecord[]);
    }

    const photosResult = await supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (!photosResult.error) {
      setPhotos((photosResult.data || []) as unknown as JobPhoto[]);
    }
  }

  async function updateStatus(status: string) {
    if (!job) return;

    setMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", job.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Work order status updated.");
    loadPageData();
  }

  async function saveNotes() {
    if (!job) return;

    setMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({ notes: notes.trim() || null })
      .eq("id", job.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Site notes saved.");
    loadPageData();
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();

    if (!job) return;

    setMessage("");

    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setMessage("Please enter a valid payment amount.");
      return;
    }

    const { error } = await supabase.from("payments").insert({
      job_id: job.id,
      amount: Number(paymentForm.amount),
      payment_method: paymentForm.payment_method,
      payment_date: paymentForm.payment_date || null,
      notes: paymentForm.notes.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setPaymentForm({
      amount: "",
      payment_method: "Cash",
      payment_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });

    setMessage("Payment recorded successfully.");
    loadPageData();
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    if (!job) return;

    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setMessage("");

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${job.id}/${Date.now()}-${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("job-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadResult.error) {
      setUploading(false);
      setMessage(uploadResult.error.message);
      return;
    }

    const insertResult = await supabase.from("job_photos").insert({
      job_id: job.id,
      file_path: filePath,
    });

    if (insertResult.error) {
      setUploading(false);
      setMessage(insertResult.error.message);
      return;
    }

    setUploading(false);
    setMessage("Photo uploaded successfully.");
    event.target.value = "";
    loadPageData();
  }

  async function deletePhoto(photo: JobPhoto) {
    setMessage("");

    if (photo.file_path) {
      await supabase.storage.from("job-photos").remove([photo.file_path]);
    }

    const { error } = await supabase
      .from("job_photos")
      .delete()
      .eq("id", photo.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Photo deleted.");
    loadPageData();
  }

  function getPhotoUrl(photo: JobPhoto) {
    if (photo.public_url) return photo.public_url;
    if (photo.photo_url) return photo.photo_url;
    if (photo.url) return photo.url;

    if (photo.file_path) {
      return supabase.storage.from("job-photos").getPublicUrl(photo.file_path)
        .data.publicUrl;
    }

    return "";
  }

  function mapUrl(address: string) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  }

  const financials = useMemo(() => {
    return {
      labour: Number(job?.labour_cost || 0),
      material: Number(job?.material_cost || 0),
      total: Number(job?.total_amount || 0),
      paid: Number(job?.amount_paid || 0),
      outstanding: Number(job?.amount_outstanding || 0),
    };
  }, [job]);

  if (message && !job) {
    return (
      <div className="card">
        <p className="text-sm font-semibold text-red-700">{message}</p>
        <Link href="/jobs" className="btn-secondary mt-4">
          Back to Work Orders
        </Link>
      </div>
    );
  }

  if (!job) {
    return <p className="text-sm text-stone-500">Loading work order...</p>;
  }

  const client = job.clients;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link
            href="/jobs"
            className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-stone-600"
          >
            <ArrowLeft size={16} />
            Back to Work Orders
          </Link>

          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Work Order Command Centre
          </p>

          <h1 className="page-title">{job.title}</h1>

          <p className="page-subtitle">
            {client?.name || "No client"} · {job.job_type || "General work"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadPageData} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <Link href={`/invoices/${job.id}`} className="btn-primary">
            <FileText size={16} />
            Invoice
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <CommandStat
          title="Status"
          value={job.status.replace("_", " ")}
          icon={<CheckCircle2 size={20} />}
        />

        <CommandStat
          title="Total"
          value={`$${financials.total.toFixed(2)}`}
          icon={<Receipt size={20} />}
        />

        <CommandStat
          title="Paid"
          value={`$${financials.paid.toFixed(2)}`}
          icon={<CreditCard size={20} />}
        />

        <CommandStat
          title="Outstanding"
          value={`$${financials.outstanding.toFixed(2)}`}
          icon={<Receipt size={20} />}
          danger
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Job Snapshot
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Key information for the person working on-site.
              </p>
            </div>

            <StatusBadge value={job.status} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoTile
              label="Client"
              value={client?.name || "No client linked"}
              helper={client?.phone || "No phone"}
            />

            <InfoTile
              label="Appointment"
              value={
                job.appointment_start
                  ? new Date(job.appointment_start).toLocaleString()
                  : "No appointment scheduled"
              }
              helper="Scheduled work time"
            />

            <InfoTile
              label="Work Type"
              value={job.job_type || "General work"}
              helper="Service category"
            />

            <InfoTile
              label="Created"
              value={new Date(job.created_at).toLocaleDateString()}
              helper="Work order date"
            />
          </div>

          <div className="mt-5 rounded-2xl bg-stone-50/80 p-4">
            <p className="text-sm font-black text-stone-900">Description</p>
            <p className="mt-2 text-sm text-stone-600">
              {job.description || "No description has been added yet."}
            </p>
          </div>

          <div className="mt-5">
            <label className="label">Update Status</label>
            <div className="grid gap-3 md:grid-cols-4">
              <button
                onClick={() => updateStatus("booked")}
                className={job.status === "booked" ? "btn-primary" : "btn-secondary"}
              >
                Booked
              </button>

              <button
                onClick={() => updateStatus("in_progress")}
                className={
                  job.status === "in_progress" ? "btn-primary" : "btn-secondary"
                }
              >
                In Progress
              </button>

              <button
                onClick={() => updateStatus("completed")}
                className={
                  job.status === "completed" ? "btn-primary" : "btn-secondary"
                }
              >
                Completed
              </button>

              <button
                onClick={() => updateStatus("cancelled")}
                className={
                  job.status === "cancelled" ? "btn-danger" : "btn-secondary"
                }
              >
                Cancelled
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Client Actions
          </h2>

          <div className="mt-5 rounded-2xl border border-stone-200 bg-white/70 p-4">
            <p className="font-black text-stone-900">
              {client?.name || "No client"}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {client?.phone || "No phone"} · {client?.email || "No email"}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {client?.address || "No address"}
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {client?.phone && (
              <a href={`tel:${client.phone}`} className="btn-primary">
                <Phone size={16} />
                Call Client
              </a>
            )}

            {client?.phone && (
              <a href={`sms:${client.phone}`} className="btn-secondary">
                <MessageSquare size={16} />
                Send SMS
              </a>
            )}

            {client?.email && (
              <a href={`mailto:${client.email}`} className="btn-secondary">
                <Mail size={16} />
                Email Client
              </a>
            )}

            {client?.address && (
              <a
                href={mapUrl(client.address)}
                target="_blank"
                className="btn-secondary"
              >
                <MapPin size={16} />
                Open Map
              </a>
            )}

            <Link href="/notifications" className="btn-secondary">
              <MessageSquare size={16} />
              Open Messages
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="card">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Record Payment
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Capture payment while on-site and keep the invoice balance up to date.
          </p>

          <form onSubmit={recordPayment} className="mt-5 grid gap-4">
            <div>
              <label className="label">Amount Received</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input"
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_method: e.target.value,
                    })
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="EFTPOS">EFTPOS</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="label">Payment Date</label>
                <input
                  className="input"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="label">Payment Note</label>
              <input
                className="input"
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, notes: e.target.value })
                }
                placeholder="Optional note"
              />
            </div>

            <button type="submit" className="btn-primary">
              <CreditCard size={16} />
              Save Payment
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Payment History
          </h2>

          <div className="mt-5 grid gap-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border border-stone-200 bg-white/75 p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="text-lg font-black text-stone-900">
                      ${Number(payment.amount || 0).toFixed(2)}
                    </p>

                    <p className="text-sm text-stone-500">
                      {payment.payment_method || "Payment"} ·{" "}
                      {payment.payment_date
                        ? new Date(payment.payment_date).toLocaleDateString()
                        : new Date(payment.created_at).toLocaleDateString()}
                    </p>

                    {payment.notes && (
                      <p className="mt-2 text-sm text-stone-500">
                        {payment.notes}
                      </p>
                    )}
                  </div>

                  <CreditCard className="text-stone-400" size={22} />
                </div>
              </div>
            ))}

            {payments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-6 text-center">
                <p className="text-sm font-semibold text-stone-500">
                  No payments recorded yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-black tracking-tight text-stone-900">
                Site Photos
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Capture before, progress, and after photos as proof of work.
              </p>
            </div>

            <label className="btn-primary cursor-pointer">
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload Photo"}
              <input
                type="file"
                accept="image/*"
                onChange={uploadPhoto}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => {
              const url = getPhotoUrl(photo);

              return (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white/75"
                >
                  {url ? (
                    <img
                      src={url}
                      alt="Job photo"
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-stone-100 text-stone-400">
                      <Camera size={28} />
                    </div>
                  )}

                  <div className="p-4">
                    <p className="text-xs font-bold text-stone-500">
                      Uploaded {new Date(photo.created_at).toLocaleDateString()}
                    </p>

                    <button
                      onClick={() => deletePhoto(photo)}
                      className="btn-danger mt-3"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {photos.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-8 text-center md:col-span-2 xl:col-span-3">
                <Camera className="mx-auto text-stone-400" size={30} />
                <p className="mt-3 text-sm font-semibold text-stone-500">
                  No site photos yet. Upload before and after photos to create a stronger job record.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Site Notes
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Capture measurements, materials, access notes, or job observations.
          </p>

          <textarea
            className="input mt-5 min-h-64"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Example: Measured door frame, client requested timber trim, return required for final coat..."
          />

          <button onClick={saveNotes} className="btn-primary mt-4">
            <Save size={16} />
            Save Notes
          </button>
        </div>
      </section>
    </div>
  );
}

function CommandStat({
  title,
  value,
  icon,
  danger,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-stone-500">{title}</p>
          <p
            className={`mt-3 text-2xl font-black tracking-tight ${
              danger ? "text-red-700" : "text-stone-950"
            }`}
          >
            {value}
          </p>
        </div>

        <div className="rounded-2xl bg-[#f4efe4] p-3 text-[#2b2926]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white/75 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-stone-400">
        {label}
      </p>
      <p className="mt-2 font-black text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{helper}</p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const style =
    value === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : value === "cancelled"
      ? "bg-red-50 text-red-700"
      : "bg-[#f4efe4] text-[#2b2926]";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${style}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}