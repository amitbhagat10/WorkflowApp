"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Job } from "@/types/app";

type NotificationLog = {
  id: string;
  notification_type: string;
  channel: string;
  recipient: string | null;
  message: string;
  sent_status: string;
  sent_at: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setMessage("");

    const jobsResult = await supabase
      .from("jobs")
      .select(
        `
        *,
        clients (
          name,
          phone,
          address,
          email
        )
      `
      )
      .order("appointment_start", { ascending: true });

    if (jobsResult.error) {
      setMessage(jobsResult.error.message);
      return;
    }

    if (jobsResult.data) {
      setJobs(jobsResult.data as Job[]);
    }

    const logsResult = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (logsResult.data) {
      setLogs(logsResult.data as NotificationLog[]);
    }
  }

  const upcomingJobs = useMemo(() => {
    const now = new Date();

    return jobs.filter((job) => {
      if (!job.appointment_start) return false;
      if (job.status === "cancelled") return false;

      const appointmentDate = new Date(job.appointment_start);
      return appointmentDate >= now;
    });
  }, [jobs]);

  const outstandingJobs = useMemo(() => {
    return jobs.filter((job) => Number(job.amount_outstanding || 0) > 0);
  }, [jobs]);

  function cleanPhone(phone?: string | null) {
    if (!phone) return "";

    let digits = phone.replace(/\D/g, "");

    if (digits.startsWith("0")) {
      digits = "61" + digits.slice(1);
    }

    return digits;
  }

  function appointmentMessage(job: Job) {
    const appointmentTime = job.appointment_start
      ? new Date(job.appointment_start).toLocaleString()
      : "the scheduled time";

    return `Hi ${job.clients?.name || ""}, this is a reminder for your handyman appointment for "${job.title}" on ${appointmentTime}. Address: ${
      job.clients?.address || "your property"
    }. Please reply if you need to reschedule.`;
  }

  function paymentMessage(job: Job) {
    return `Hi ${job.clients?.name || ""}, this is a friendly reminder that there is an outstanding payment of $${Number(
      job.amount_outstanding || 0
    ).toFixed(2)} for "${job.title}". Thank you.`;
  }

  async function saveNotificationLog(
    job: Job,
    notificationType: string,
    channel: string,
    recipient: string,
    text: string
  ) {
    const { error } = await supabase.from("notifications").insert({
      client_id: job.client_id,
      job_id: job.id,
      notification_type: notificationType,
      channel,
      recipient,
      message: text,
      sent_status: "drafted",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    loadData();
  }

  async function sendWhatsApp(job: Job, notificationType: string, text: string) {
    const phone = cleanPhone(job.clients?.phone);

    if (!phone) {
      setMessage("Client phone number is missing.");
      return;
    }

    await saveNotificationLog(job, notificationType, "whatsapp", phone, text);

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function sendSms(job: Job, notificationType: string, text: string) {
    const phone = job.clients?.phone;

    if (!phone) {
      setMessage("Client phone number is missing.");
      return;
    }

    await saveNotificationLog(job, notificationType, "sms", phone, text);

    const url = `sms:${phone}?&body=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function sendEmail(job: Job, notificationType: string, text: string) {
    const email = job.clients?.email;

    if (!email) {
      setMessage("Client email address is missing.");
      return;
    }

    await saveNotificationLog(job, notificationType, "email", email, text);

    const subject =
      notificationType === "appointment_reminder"
        ? "Appointment Reminder"
        : "Payment Reminder";

    const url = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-gray-500">
          Send appointment reminders and outstanding payment reminders to
          clients.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-xl font-bold">Upcoming Appointment Reminders</h2>

          <div className="space-y-3">
            {upcomingJobs.map((job) => {
              const text = appointmentMessage(job);

              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <h3 className="font-semibold">{job.title}</h3>

                  <p className="text-sm text-gray-500">
                    {job.clients?.name} · {job.clients?.phone || "No phone"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {job.appointment_start
                      ? new Date(job.appointment_start).toLocaleString()
                      : "No appointment date"}
                  </p>

                  <p className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-600">
                    {text}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        sendWhatsApp(job, "appointment_reminder", text)
                      }
                      className="btn-primary"
                    >
                      WhatsApp
                    </button>

                    <button
                      onClick={() => sendSms(job, "appointment_reminder", text)}
                      className="btn-secondary"
                    >
                      SMS
                    </button>

                    <button
                      onClick={() =>
                        sendEmail(job, "appointment_reminder", text)
                      }
                      className="btn-secondary"
                    >
                      Email
                    </button>
                  </div>
                </div>
              );
            })}

            {upcomingJobs.length === 0 && (
              <p className="text-sm text-gray-500">
                No upcoming appointments found.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-xl font-bold">Outstanding Payment Reminders</h2>

          <div className="space-y-3">
            {outstandingJobs.map((job) => {
              const text = paymentMessage(job);

              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <h3 className="font-semibold">{job.title}</h3>

                  <p className="text-sm text-gray-500">
                    {job.clients?.name} · {job.clients?.phone || "No phone"}
                  </p>

                  <p className="text-sm text-gray-500">
                    Outstanding: $
                    {Number(job.amount_outstanding || 0).toFixed(2)}
                  </p>

                  <p className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-600">
                    {text}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        sendWhatsApp(job, "payment_reminder", text)
                      }
                      className="btn-primary"
                    >
                      WhatsApp
                    </button>

                    <button
                      onClick={() => sendSms(job, "payment_reminder", text)}
                      className="btn-secondary"
                    >
                      SMS
                    </button>

                    <button
                      onClick={() => sendEmail(job, "payment_reminder", text)}
                      className="btn-secondary"
                    >
                      Email
                    </button>
                  </div>
                </div>
              );
            })}

            {outstandingJobs.length === 0 && (
              <p className="text-sm text-gray-500">
                No outstanding payments found.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-8">
        <h2 className="mb-4 text-xl font-bold">Recent Notification Logs</h2>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex flex-col justify-between gap-2 md:flex-row">
                <div>
                  <p className="font-semibold">
                    {log.notification_type.replace("_", " ")} · {log.channel}
                  </p>

                  <p className="text-sm text-gray-500">
                    Recipient: {log.recipient || "Not available"}
                  </p>
                </div>

                <p className="text-sm text-gray-500">
                  {log.created_at
                    ? new Date(log.created_at).toLocaleString()
                    : ""}
                </p>
              </div>

              <p className="mt-2 text-sm text-gray-600">{log.message}</p>
            </div>
          ))}

          {logs.length === 0 && (
            <p className="text-sm text-gray-500">
              No notification logs yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}