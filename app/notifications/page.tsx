"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  StickyNote,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClientOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type JobOption = {
  id: string;
  client_id: string | null;
  job_number: string | null;
  title: string;
  status: string | null;
  assigned_to: string | null;
  appointment_start: string | null;
};

type MessageRecord = {
  id: string;
  workspace_id: string | null;
  client_id: string | null;
  job_id: string | null;
  channel: string | null;
  direction: string | null;
  subject: string | null;
  message: string | null;
  status: string | null;
  follow_up_at: string | null;
  created_at: string;
  created_by: string | null;
};

const channelLabels: Record<string, string> = {
  sms: "SMS",
  email: "Email",
  phone: "Phone",
  note: "Note",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  follow_up: "Follow Up",
  completed: "Completed",
};

export default function NotificationsPage() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [messageText, setMessageText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    client_id: "",
    job_id: "",
    channel: "note",
    direction: "outbound",
    subject: "",
    message: "",
    status: "draft",
    follow_up_at: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setMessageText("");

    const clientsResult = await supabase
      .from("clients")
      .select("id, name, phone, email, address")
      .order("name");

    if (!clientsResult.error) {
      setClients((clientsResult.data || []) as unknown as ClientOption[]);
    }

    const jobsResult = await supabase
      .from("jobs")
      .select("id, client_id, job_number, title, status, assigned_to, appointment_start")
      .order("created_at", { ascending: false });

    if (!jobsResult.error) {
      setJobs((jobsResult.data || []) as unknown as JobOption[]);
    }

    const messagesResult = await supabase
      .from("notifications")
      .select(
        "id, workspace_id, client_id, job_id, channel, direction, subject, message, status, follow_up_at, created_at, created_by"
      )
      .order("created_at", { ascending: false });

    if (messagesResult.error) {
      setMessageText(messagesResult.error.message);
      return;
    }

    setMessages((messagesResult.data || []) as unknown as MessageRecord[]);
  }

  async function createMessage(e: React.FormEvent) {
    e.preventDefault();
    setMessageText("");

    if (!form.subject.trim()) {
      setMessageText("Subject is required.");
      return;
    }

    if (!form.message.trim()) {
      setMessageText("Message note is required.");
      return;
    }

    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      setMessageText("Could not find your workspace. Please logout and login again.");
      return;
    }

    const userResult = await supabase.auth.getUser();
    const email = userResult.data.user?.email || null;

    const { error } = await supabase.from("notifications").insert({
      workspace_id: workspaceResult.data,
      client_id: form.client_id || null,
      job_id: form.job_id || null,
      channel: form.channel,
      direction: form.direction,
      subject: form.subject.trim(),
      message: form.message.trim(),
      status: form.status,
      follow_up_at: form.follow_up_at || null,
      created_by: email,
    });

    if (error) {
      setMessageText(error.message);
      return;
    }

    setForm({
      client_id: "",
      job_id: "",
      channel: "note",
      direction: "outbound",
      subject: "",
      message: "",
      status: "draft",
      follow_up_at: "",
    });

    setShowForm(false);
    setMessageText("Message note created successfully.");
    loadData();
  }

  async function updateStatus(id: string, status: string) {
    setMessageText("");

    const { error } = await supabase
      .from("notifications")
      .update({ status })
      .eq("id", id);

    if (error) {
      setMessageText(error.message);
      return;
    }

    loadData();
  }

  function handleJobChange(jobId: string) {
    const selectedJob = jobs.find((job) => job.id === jobId);

    setForm({
      ...form,
      job_id: jobId,
      client_id: selectedJob?.client_id || form.client_id,
    });
  }

  const clientMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const jobMap = useMemo(() => {
    return new Map(jobs.map((job) => [job.id, job]));
  }, [jobs]);

  const stats = useMemo(() => {
    return {
      total: messages.length,
      followUps: messages.filter((item) => item.status === "follow_up").length,
      sent: messages.filter((item) => item.status === "sent").length,
      notes: messages.filter((item) => item.channel === "note").length,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return messages.filter((item) => {
      const client = item.client_id ? clientMap.get(item.client_id) : null;
      const job = item.job_id ? jobMap.get(item.job_id) : null;

      const matchesChannel =
        channelFilter === "all" || item.channel === channelFilter;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesSearch =
        !search ||
        (item.subject || "").toLowerCase().includes(search) ||
        (item.message || "").toLowerCase().includes(search) ||
        (client?.name || "").toLowerCase().includes(search) ||
        (job?.title || "").toLowerCase().includes(search) ||
        (job?.job_number || "").toLowerCase().includes(search);

      return matchesChannel && matchesStatus && matchesSearch;
    });
  }, [messages, searchTerm, channelFilter, statusFilter, clientMap, jobMap]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Communication Centre
          </p>

          <h1 className="page-title">Messages</h1>

          <p className="page-subtitle">
            Log customer calls, SMS, emails, notes and follow-up actions.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadData} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => setShowForm((current) => !current)}
            className="btn-primary"
          >
            <Plus size={16} />
            {showForm ? "Close" : "New Message"}
          </button>
        </div>
      </div>

      {messageText && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {messageText}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Messages" value={stats.total} icon={<MessageSquare size={18} />} />
        <MiniStat title="Follow Ups" value={stats.followUps} icon={<Clock size={18} />} alert={stats.followUps > 0} />
        <MiniStat title="Sent" value={stats.sent} icon={<CheckCircle2 size={18} />} />
        <MiniStat title="Notes" value={stats.notes} icon={<StickyNote size={18} />} />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              New Communication Note
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Record a customer interaction and link it to a client or work order.
            </p>
          </div>

          <form onSubmit={createMessage} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Client</label>
                <select
                  className="input"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                >
                  <option value="">No client selected</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Related Work Order</label>
                <select
                  className="input"
                  value={form.job_id}
                  onChange={(e) => handleJobChange(e.target.value)}
                >
                  <option value="">No work order selected</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.job_number || "Work Order"} — {job.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              <div>
                <label className="label">Channel</label>
                <select
                  className="input"
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  <option value="note">Note</option>
                  <option value="phone">Phone</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="label">Direction</label>
                <select
                  className="input"
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                >
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="label">Follow Up</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.follow_up_at}
                  onChange={(e) =>
                    setForm({ ...form, follow_up_at: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Example: Customer requested appointment change"
              />
            </div>

            <div>
              <label className="label">Message / Notes</label>
              <textarea
                className="input min-h-32"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Record the call summary, SMS/email note, or follow-up requirement..."
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="btn-primary">
                <Save size={16} />
                Save Message
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Communication Log
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Search and filter customer communication history.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <Search size={18} className="text-stone-400" />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search messages..."
                className="w-full min-w-60 border-0 bg-transparent text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>

            <select
              className="input min-w-40"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="all">All channels</option>
              <option value="note">Note</option>
              <option value="phone">Phone</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>

            <select
              className="input min-w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="follow_up">Follow Up</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredMessages.map((item) => (
            <MessageCard
              key={item.id}
              item={item}
              client={item.client_id ? clientMap.get(item.client_id) : null}
              job={item.job_id ? jobMap.get(item.job_id) : null}
              updateStatus={updateStatus}
            />
          ))}
        </div>

        {filteredMessages.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-10 text-center">
            <Bell className="mx-auto text-stone-400" size={30} />

            <h3 className="mt-4 text-2xl font-black text-stone-950">
              No messages found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-stone-500">
              Create your first communication note or change the filters.
            </p>

            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              New Message
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function MessageCard({
  item,
  client,
  job,
  updateStatus,
}: {
  item: MessageRecord;
  client: ClientOption | null | undefined;
  job: JobOption | null | undefined;
  updateStatus: (id: string, status: string) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <div className="grid gap-5 xl:grid-cols-[1fr_280px] xl:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ChannelBadge value={item.channel || "note"} />
            <StatusBadge value={item.status || "draft"} />

            <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-stone-600">
              {item.direction || "outbound"}
            </span>
          </div>

          <h3 className="text-xl font-black tracking-tight text-stone-950">
            {item.subject || "Communication note"}
          </h3>

          <p className="mt-2 line-clamp-3 text-sm font-semibold leading-relaxed text-stone-500">
            {item.message || "No message content."}
          </p>

          <div className="mt-4 grid gap-2 text-sm font-semibold text-stone-500 md:grid-cols-2">
            <p className="flex items-center gap-2">
              <UserRound size={15} />
              {client?.name || "No client linked"}
            </p>

            <p className="flex items-center gap-2">
              <Wrench size={15} />
              {job?.title || "No work order linked"}
            </p>

            <p className="flex items-center gap-2">
              <CalendarDays size={15} />
              Created {new Date(item.created_at).toLocaleString()}
            </p>

            <p className="flex items-center gap-2">
              <Clock size={15} />
              {item.follow_up_at
                ? `Follow up ${new Date(item.follow_up_at).toLocaleString()}`
                : "No follow-up set"}
            </p>
          </div>
        </div>

        <div className="rounded-[1.25rem] bg-stone-50 p-4">
          <div className="grid gap-2">
            {client?.phone && (
              <a href={`tel:${client.phone}`} className="btn-secondary">
                <Phone size={15} />
                Call
              </a>
            )}

            {client?.phone && (
              <a href={`sms:${client.phone}`} className="btn-secondary">
                <MessageSquare size={15} />
                SMS
              </a>
            )}

            {client?.email && (
              <a href={`mailto:${client.email}`} className="btn-secondary">
                <Mail size={15} />
                Email
              </a>
            )}

            {client && (
              <Link href={`/clients/${client.id}`} className="btn-secondary">
                Open Client
              </Link>
            )}

            {job && (
              <Link href={`/jobs/${job.id}`} className="btn-secondary">
                Open Job
              </Link>
            )}

            {item.status !== "completed" && (
              <button
                onClick={() => updateStatus(item.id, "completed")}
                className="btn-primary"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  icon,
  alert,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-stone-500">{title}</p>
          <p
            className={`mt-3 text-2xl font-black tracking-tight ${
              alert ? "text-red-600" : "text-stone-950"
            }`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            alert ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChannelBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    note: "bg-stone-100 text-stone-700",
    phone: "bg-blue-50 text-blue-700",
    sms: "bg-[#f3ead6] text-[#1b1a18]",
    email: "bg-purple-50 text-purple-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        styles[value] || styles.note
      }`}
    >
      {channelLabels[value] || value}
    </span>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    draft: "bg-stone-100 text-stone-700",
    sent: "bg-emerald-50 text-emerald-700",
    follow_up: "bg-orange-50 text-orange-700",
    completed: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        styles[value] || styles.draft
      }`}
    >
      {statusLabels[value] || value}
    </span>
  );
}