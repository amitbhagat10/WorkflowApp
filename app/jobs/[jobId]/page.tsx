"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Job, JobPhoto, Payment } from "@/types/app";

export default function JobDetailPage() {
  const params = useParams();
  const jobId = String(params.jobId);

  const [job, setJob] = useState<Job | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const [photoType, setPhotoType] = useState<JobPhoto["photo_type"]>("before");
  const [photoNotes, setPhotoNotes] = useState("");

  useEffect(() => {
    loadJobDetail();
  }, []);

  async function loadJobDetail() {
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

    const photosResult = await supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (photosResult.data) {
      setPhotos(photosResult.data as JobPhoto[]);
    }
  }

  const groupedPhotos = useMemo(() => {
    return {
      before: photos.filter((photo) => photo.photo_type === "before"),
      after: photos.filter((photo) => photo.photo_type === "after"),
      receipt: photos.filter((photo) => photo.photo_type === "receipt"),
      damage: photos.filter((photo) => photo.photo_type === "damage"),
      completion: photos.filter((photo) => photo.photo_type === "completion"),
      other: photos.filter((photo) => photo.photo_type === "other"),
    };
  }, [photos]);

  function openMap() {
    if (!job?.clients?.address) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      job.clients.address
    )}`;

    window.open(url, "_blank");
  }

  function callClient() {
    if (!job?.clients?.phone) return;
    window.location.href = `tel:${job.clients.phone}`;
  }

  function smsClient() {
    if (!job?.clients?.phone) return;

    const text = `Hi ${job.clients.name}, this is regarding your handyman job: ${job.title}.`;

    window.location.href = `sms:${job.clients.phone}?&body=${encodeURIComponent(
      text
    )}`;
  }

  function emailClient() {
    if (!job?.clients?.email) return;

    const subject = `Regarding your job: ${job.title}`;
    const text = `Hi ${job.clients.name},\n\nThis is regarding your handyman job: ${job.title}.\n\nThanks.`;

    window.location.href = `mailto:${job.clients.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(text)}`;
  }

  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    setMessage("");

    const file = event.target.files?.[0];

    if (!file) return;

    if (!job) {
      setMessage("Job not loaded yet.");
      return;
    }

    const userResult = await supabase.auth.getUser();

    if (!userResult.data.user) {
      setMessage("Please login first.");
      return;
    }

    setUploading(true);

    const userId = userResult.data.user.id;
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `${userId}/${job.id}/${crypto.randomUUID()}-${safeFileName}`;

    const uploadResult = await supabase.storage
      .from("job-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadResult.error) {
      setMessage(uploadResult.error.message);
      setUploading(false);
      return;
    }

    const publicUrlResult = supabase.storage
      .from("job-photos")
      .getPublicUrl(filePath);

    const photoUrl = publicUrlResult.data.publicUrl;

    const insertResult = await supabase.from("job_photos").insert({
      job_id: job.id,
      photo_url: photoUrl,
      photo_path: filePath,
      photo_type: photoType,
      file_name: file.name,
      notes: photoNotes || null,
    });

    if (insertResult.error) {
      setMessage(insertResult.error.message);
      setUploading(false);
      return;
    }

    setPhotoNotes("");
    setMessage("Photo uploaded successfully.");
    setUploading(false);
    loadJobDetail();
  }

  async function deletePhoto(photo: JobPhoto) {
    setMessage("");

    if (photo.photo_path) {
      const storageResult = await supabase.storage
        .from("job-photos")
        .remove([photo.photo_path]);

      if (storageResult.error) {
        setMessage(storageResult.error.message);
        return;
      }
    }

    const deleteResult = await supabase
      .from("job_photos")
      .delete()
      .eq("id", photo.id);

    if (deleteResult.error) {
      setMessage(deleteResult.error.message);
      return;
    }

    setMessage("Photo deleted.");
    loadJobDetail();
  }

  if (message && !job) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">{message}</p>
        <Link href="/jobs" className="btn-secondary mt-4 inline-block">
          Back to Jobs
        </Link>
      </div>
    );
  }

  if (!job) {
    return <p>Loading job detail...</p>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p className="text-gray-500">
            Job details, client information, payments, and work photos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/jobs" className="btn-secondary">
            Back to Jobs
          </Link>

          <Link href={`/invoices/${job.id}`} className="btn-primary">
            View Invoice
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Job Summary</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem label="Job Title" value={job.title} />
            <InfoItem label="Job Type" value={job.job_type || "Not specified"} />
            <InfoItem
              label="Appointment"
              value={
                job.appointment_start
                  ? new Date(job.appointment_start).toLocaleString()
                  : "Not specified"
              }
            />
            <InfoItem label="Status" value={job.status.replace("_", " ")} />
            <InfoItem
              label="Payment Status"
              value={job.payment_status.replace("_", " ")}
            />
            <InfoItem label="Due Date" value={job.due_date || "Not specified"} />
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
              Description
            </h3>

            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              {job.description || job.notes || "No description added."}
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-xl font-bold">Client</h2>

          <div className="space-y-3 text-sm">
            <p>
              <strong>Name:</strong> {job.clients?.name || "No client"}
            </p>

            <p>
              <strong>Phone:</strong> {job.clients?.phone || "No phone"}
            </p>

            <p>
              <strong>Email:</strong> {job.clients?.email || "No email"}
            </p>

            <p>
              <strong>Address:</strong>{" "}
              {job.clients?.address || "No address"}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={callClient}
              disabled={!job.clients?.phone}
              className="btn-primary disabled:opacity-50"
            >
              Call Client
            </button>

            <button
              onClick={smsClient}
              disabled={!job.clients?.phone}
              className="btn-secondary disabled:opacity-50"
            >
              SMS Client
            </button>

            <button
              onClick={emailClient}
              disabled={!job.clients?.email}
              className="btn-secondary disabled:opacity-50"
            >
              Email Client
            </button>

            <button
              onClick={openMap}
              disabled={!job.clients?.address}
              className="btn-secondary disabled:opacity-50"
            >
              Open Address in Maps
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card">
          <h2 className="mb-4 text-xl font-bold">Payment Summary</h2>

          <div className="space-y-3 text-sm">
            <MoneyRow label="Labour" value={Number(job.labour_cost || 0)} />
            <MoneyRow label="Material" value={Number(job.material_cost || 0)} />
            <MoneyRow label="Total" value={Number(job.total_amount || 0)} bold />
            <MoneyRow label="Paid" value={Number(job.amount_paid || 0)} />
            <MoneyRow
              label="Outstanding"
              value={Number(job.amount_outstanding || 0)}
              bold
              danger
            />
          </div>
        </div>

        <div className="card xl:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Payment History</h2>

          {payments.length === 0 && (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          )}

          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex flex-col justify-between gap-2 md:flex-row">
                  <div>
                    <p className="font-semibold">
                      ${Number(payment.amount || 0).toFixed(2)}
                    </p>

                    <p className="text-sm text-gray-500">
                      {payment.payment_method.replace("_", " ")}
                    </p>
                  </div>

                  <p className="text-sm text-gray-500">
                    {payment.payment_date}
                  </p>
                </div>

                {payment.notes && (
                  <p className="mt-2 text-sm text-gray-600">{payment.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-bold">Job Photos</h2>
            <p className="text-sm text-gray-500">
              Upload before, after, receipt, damage, and completion photos.
            </p>
          </div>

          <button onClick={loadJobDetail} className="btn-secondary">
            Refresh Photos
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Photo Type</label>
            <select
              className="input"
              value={photoType}
              onChange={(e) =>
                setPhotoType(e.target.value as JobPhoto["photo_type"])
              }
            >
              <option value="before">Before</option>
              <option value="after">After</option>
              <option value="receipt">Receipt</option>
              <option value="damage">Damage</option>
              <option value="completion">Completion Proof</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="label">Photo Notes</label>
            <input
              className="input"
              value={photoNotes}
              onChange={(e) => setPhotoNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          <div>
            <label className="label">Upload Photo</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={uploadPhoto}
              disabled={uploading}
            />
          </div>
        </div>

        {uploading && (
          <p className="mb-4 text-sm text-gray-500">Uploading photo...</p>
        )}

        <PhotoSection
          title="Before Photos"
          photos={groupedPhotos.before}
          onDelete={deletePhoto}
        />

        <PhotoSection
          title="After Photos"
          photos={groupedPhotos.after}
          onDelete={deletePhoto}
        />

        <PhotoSection
          title="Receipt Photos"
          photos={groupedPhotos.receipt}
          onDelete={deletePhoto}
        />

        <PhotoSection
          title="Damage Photos"
          photos={groupedPhotos.damage}
          onDelete={deletePhoto}
        />

        <PhotoSection
          title="Completion Proof"
          photos={groupedPhotos.completion}
          onDelete={deletePhoto}
        />

        <PhotoSection
          title="Other Photos"
          photos={groupedPhotos.other}
          onDelete={deletePhoto}
        />

        {photos.length === 0 && (
          <p className="text-sm text-gray-500">No photos uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  bold = false,
  danger = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex justify-between border-b border-gray-100 pb-2 ${
        bold ? "font-bold" : ""
      }`}
    >
      <span>{label}</span>
      <span className={danger ? "text-red-700" : ""}>
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

function PhotoSection({
  title,
  photos,
  onDelete,
}: {
  title: string;
  photos: JobPhoto[];
  onDelete: (photo: JobPhoto) => void;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
        {title}
      </h3>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
          >
            <a href={photo.photo_url} target="_blank">
              <img
                src={photo.photo_url}
                alt={photo.file_name || "Job photo"}
                className="h-48 w-full object-cover"
              />
            </a>

            <div className="p-3">
              <p className="text-xs font-semibold uppercase text-blue-700">
                {photo.photo_type}
              </p>

              {photo.notes && (
                <p className="mt-1 text-sm text-gray-600">{photo.notes}</p>
              )}

              <p className="mt-1 text-xs text-gray-500">
                {new Date(photo.created_at).toLocaleString()}
              </p>

              <button
                onClick={() => onDelete(photo)}
                className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Delete Photo
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}