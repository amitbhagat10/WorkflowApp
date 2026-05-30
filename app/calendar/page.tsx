"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ClientInfo = {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
};

type ScheduleJob = {
  id: string;
  job_number: string | null;
  title: string;
  job_type: string | null;
  status: string | null;
  priority: string | null;
  assigned_to: string | null;
  appointment_start: string | null;
  due_date: string | null;
  amount_outstanding: number | null;
  created_at: string;
  clients?: ClientInfo | null;
};

const statusLabels: Record<string, string> = {
  new: "New",
  booked: "Booked",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export default function CalendarPage() {
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(formatDateInput(new Date()));
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    appointment_start: "",
    due_date: "",
    assigned_to: "",
    status: "booked",
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
        id,
        job_number,
        title,
        job_type,
        status,
        priority,
        assigned_to,
        appointment_start,
        due_date,
        amount_outstanding,
        created_at,
        clients (
          id,
          name,
          phone,
          address
        )
      `
      )
      .order("appointment_start", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setJobs((data || []) as unknown as ScheduleJob[]);
  }

  function startEdit(job: ScheduleJob) {
    setEditingJobId(job.id);
    setScheduleForm({
      appointment_start: toDatetimeLocal(job.appointment_start),
      due_date: toDateInput(job.due_date),
      assigned_to: job.assigned_to || "",
      status: job.status || "booked",
    });
  }

  async function saveSchedule(jobId: string) {
    setMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({
        appointment_start: scheduleForm.appointment_start || null,
        due_date: scheduleForm.due_date || null,
        assigned_to: scheduleForm.assigned_to.trim() || null,
        status: scheduleForm.status,
      })
      .eq("id", jobId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingJobId(null);
    setMessage("Schedule updated successfully.");
    loadJobs();
  }

  async function updateStatus(jobId: string, status: string) {
    setMessage("");

    const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);

    if (error) {
      setMessage(error.message);
      return;
    }

    loadJobs();
  }

  const technicians = useMemo(() => {
    const names = jobs
      .map((job) => job.assigned_to?.trim())
      .filter((name): name is string => Boolean(name));

    return Array.from(new Set(names)).sort();
  }, [jobs]);

  const weekDays = useMemo(() => {
    const base = new Date(selectedDate + "T00:00:00");
    const day = base.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() + mondayOffset + index);
      return date;
    });
  }, [selectedDate]);

  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const jobDate = job.appointment_start
        ? formatDateInput(new Date(job.appointment_start))
        : job.due_date
        ? formatDateInput(new Date(job.due_date))
        : "";

      const matchesDate = jobDate === selectedDate;

      const matchesTechnician =
        technicianFilter === "all" ||
        (job.assigned_to || "").toLowerCase() === technicianFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" || (job.status || "new") === statusFilter;

      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.job_number || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.assigned_to || "").toLowerCase().includes(search) ||
        (job.clients?.address || "").toLowerCase().includes(search);

      return matchesDate && matchesTechnician && matchesStatus && matchesSearch;
    });
  }, [jobs, selectedDate, technicianFilter, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const today = formatDateInput(new Date());

    return {
      today: jobs.filter((job) => {
        if (!job.appointment_start) return false;
        return formatDateInput(new Date(job.appointment_start)) === today;
      }).length,
      overdue: jobs.filter((job) => {
        if (!job.due_date) return false;
        if (["completed", "invoiced", "cancelled"].includes(job.status || "")) {
          return false;
        }
        return new Date(job.due_date) < new Date(today + "T00:00:00");
      }).length,
      urgent: jobs.filter((job) => job.priority === "urgent").length,
      unassigned: jobs.filter((job) => !job.assigned_to).length,
    };
  }, [jobs]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Schedule & Dispatch
          </p>
          <h1 className="page-title">Schedule</h1>
          <p className="page-subtitle">
            Plan appointments, assign technicians and manage daily field work.
          </p>
        </div>

        <button onClick={loadJobs} className="btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Today" value={stats.today} />
        <MiniStat title="Overdue" value={stats.overdue} alert={stats.overdue > 0} />
        <MiniStat title="Urgent" value={stats.urgent} alert={stats.urgent > 0} />
        <MiniStat title="Unassigned" value={stats.unassigned} />
      </section>

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Dispatch Week
            </h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">
              Select a day to view scheduled or due work orders.
            </p>
          </div>

          <input
            className="input max-w-56"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((date) => {
            const key = formatDateInput(date);
            const count = jobs.filter((job) => {
              const jobDate = job.appointment_start
                ? formatDateInput(new Date(job.appointment_start))
                : job.due_date
                ? formatDateInput(new Date(job.due_date))
                : "";
              return jobDate === key;
            }).length;

            const active = key === selectedDate;

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className={`rounded-[1.25rem] border p-4 text-left transition ${
                  active
                    ? "border-[#1b1a18] bg-[#1b1a18] text-white shadow-lg"
                    : "border-stone-200 bg-white/80 text-stone-800 hover:bg-white"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-wide opacity-70">
                  {date.toLocaleDateString(undefined, { weekday: "short" })}
                </p>

                <p className="mt-2 text-2xl font-black">{date.getDate()}</p>

                <p className="mt-1 text-xs font-bold opacity-70">
                  {count} job{count === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Daily Dispatch Board
            </h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <Search size={18} className="text-stone-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search schedule..."
                className="w-full min-w-56 border-0 bg-transparent text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>

            <select
              className="input min-w-44"
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
            >
              <option value="all">All technicians</option>
              {technicians.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className="input min-w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="booked">Booked</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="invoiced">Invoiced</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <ScheduleJobCard
              key={job.id}
              job={job}
              editingJobId={editingJobId}
              scheduleForm={scheduleForm}
              setScheduleForm={setScheduleForm}
              startEdit={startEdit}
              saveSchedule={saveSchedule}
              cancelEdit={() => setEditingJobId(null)}
              updateStatus={updateStatus}
            />
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3ead6] text-[#1b1a18]">
              <CalendarDays size={24} />
            </div>

            <h3 className="mt-4 text-2xl font-black text-stone-950">
              Nothing scheduled for this day
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-stone-500">
              Choose another day or open Work Orders to assign appointments.
            </p>

            <Link href="/jobs" className="btn-primary mt-5">
              Open Work Orders
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function ScheduleJobCard({
  job,
  editingJobId,
  scheduleForm,
  setScheduleForm,
  startEdit,
  saveSchedule,
  cancelEdit,
  updateStatus,
}: {
  job: ScheduleJob;
  editingJobId: string | null;
  scheduleForm: {
    appointment_start: string;
    due_date: string;
    assigned_to: string;
    status: string;
  };
  setScheduleForm: React.Dispatch<
    React.SetStateAction<{
      appointment_start: string;
      due_date: string;
      assigned_to: string;
      status: string;
    }>
  >;
  startEdit: (job: ScheduleJob) => void;
  saveSchedule: (jobId: string) => void;
  cancelEdit: () => void;
  updateStatus: (jobId: string, status: string) => void;
}) {
  const isEditing = editingJobId === job.id;
  const status = job.status || "new";

  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <div className="grid gap-5 xl:grid-cols-[1fr_260px] xl:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-stone-600">
              {job.job_number || "Work Order"}
            </span>

            <StatusBadge value={status} />
            <PriorityBadge value={job.priority || "medium"} />
          </div>

          <h3 className="text-xl font-black tracking-tight text-stone-950">
            {job.title}
          </h3>

          <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-500 md:grid-cols-2">
            <p className="flex items-center gap-2">
              <UserRound size={15} />
              {job.clients?.name || "No client"}
            </p>

            <p className="flex items-center gap-2">
              <Wrench size={15} />
              {job.job_type || "General Service"}
            </p>

            <p className="flex items-center gap-2">
              <Clock size={15} />
              {job.appointment_start
                ? new Date(job.appointment_start).toLocaleString()
                : "No appointment"}
            </p>

            <p className="flex items-center gap-2">
              <CheckCircle2 size={15} />
              {job.assigned_to || "Unassigned"}
            </p>

            <p className="flex items-center gap-2 md:col-span-2">
              <MapPin size={15} />
              <span className="truncate">
                {job.clients?.address || "No site address"}
              </span>
            </p>
          </div>

          {isEditing && (
            <div className="mt-5 grid gap-4 rounded-[1.25rem] bg-stone-50 p-4 md:grid-cols-2">
              <div>
                <label className="label">Appointment</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={scheduleForm.appointment_start}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      appointment_start: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="label">Due Date</label>
                <input
                  className="input"
                  type="date"
                  value={scheduleForm.due_date}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      due_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="label">Assigned To</label>
                <input
                  className="input"
                  value={scheduleForm.assigned_to}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      assigned_to: e.target.value,
                    })
                  }
                  placeholder="Technician name"
                />
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={scheduleForm.status}
                  onChange={(e) =>
                    setScheduleForm({
                      ...scheduleForm,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="new">New</option>
                  <option value="booked">Booked</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          {isEditing ? (
            <>
              <button onClick={() => saveSchedule(job.id)} className="btn-primary">
                Save Schedule
              </button>

              <button onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => startEdit(job)} className="btn-primary">
                Reschedule
              </button>

              {status !== "in_progress" && status !== "completed" && (
                <button
                  onClick={() => updateStatus(job.id, "in_progress")}
                  className="btn-secondary"
                >
                  Start Job
                </button>
              )}

              {status !== "completed" && (
                <button
                  onClick={() => updateStatus(job.id, "completed")}
                  className="btn-secondary"
                >
                  Complete
                </button>
              )}

              <Link href={`/jobs/${job.id}`} className="btn-secondary">
                Open Job
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  title,
  value,
  alert,
}: {
  title: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p
        className={`mt-3 text-3xl font-black tracking-tight ${
          alert ? "text-red-600" : "text-stone-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    new: "bg-stone-100 text-stone-700",
    booked: "bg-[#f3ead6] text-[#1b1a18]",
    in_progress: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    invoiced: "bg-purple-50 text-purple-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        styles[value] || styles.new
      }`}
    >
      {statusLabels[value] || value}
    </span>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    low: "bg-stone-100 text-stone-600",
    medium: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        styles[value] || styles.medium
      }`}
    >
      {priorityLabels[value] || value}
    </span>
  );
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function toDateInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}