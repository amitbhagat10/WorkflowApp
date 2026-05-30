"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
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
import TechnicianSelect from "@/components/TechnicianSelect";

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

type ScheduleForm = {
  appointment_start: string;
  due_date: string;
  assigned_to: string;
  status: string;
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
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
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
      appointment_start: job.appointment_start
        ? toDatetimeLocal(job.appointment_start)
        : "",
      due_date: job.due_date ? toDateInput(job.due_date) : "",
      assigned_to: job.assigned_to || "",
      status: job.status || "booked",
    });
  }

  function cancelEdit() {
    setEditingJobId(null);

    setScheduleForm({
      appointment_start: "",
      due_date: "",
      assigned_to: "",
      status: "booked",
    });
  }

  async function saveSchedule(jobId: string) {
    setMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({
        appointment_start: scheduleForm.appointment_start || null,
        due_date: scheduleForm.due_date || null,
        assigned_to: scheduleForm.assigned_to || null,
        status: scheduleForm.status,
      })
      .eq("id", jobId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Schedule updated successfully.");
    cancelEdit();
    loadJobs();
  }

  async function updateStatus(jobId: string, status: string) {
    setMessage("");

    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", jobId);

    if (error) {
      setMessage(error.message);
      return;
    }

    loadJobs();
  }

  const today = formatDateInput(new Date());

  const weekDays = useMemo(() => {
    const base = new Date(`${selectedDate}T12:00:00`);
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      const dateValue = formatDateInput(date);

      return {
        date,
        value: dateValue,
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        day: date.getDate(),
        count: jobs.filter((job) => getJobScheduleDate(job) === dateValue).length,
      };
    });
  }, [selectedDate, jobs]);

  const technicians = useMemo(() => {
    const names = jobs
      .map((job) => job.assigned_to)
      .filter((name): name is string => Boolean(name));

    return Array.from(new Set(names)).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const scheduleDate = getJobScheduleDate(job);

      const matchesDate = scheduleDate === selectedDate;

      const matchesTechnician =
        technicianFilter === "all" ||
        (technicianFilter === "unassigned" && !job.assigned_to) ||
        job.assigned_to === technicianFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          !["completed", "invoiced", "cancelled"].includes(job.status || "")) ||
        job.status === statusFilter;

      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search) ||
        (job.job_number || "").toLowerCase().includes(search) ||
        (job.clients?.name || "").toLowerCase().includes(search) ||
        (job.assigned_to || "").toLowerCase().includes(search);

      return matchesDate && matchesTechnician && matchesStatus && matchesSearch;
    });
  }, [jobs, selectedDate, technicianFilter, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const todayJobs = jobs.filter((job) => getJobScheduleDate(job) === today);

    const overdueJobs = jobs.filter((job) => {
      if (!job.due_date) return false;
      if (["completed", "invoiced", "cancelled"].includes(job.status || "")) {
        return false;
      }

      return new Date(job.due_date) < new Date(`${today}T00:00:00`);
    });

    const urgentJobs = jobs.filter((job) => job.priority === "urgent");

    const unassignedJobs = jobs.filter(
      (job) =>
        !job.assigned_to &&
        !["completed", "invoiced", "cancelled"].includes(job.status || "")
    );

    return {
      today: todayJobs.length,
      overdue: overdueJobs.length,
      urgent: urgentJobs.length,
      unassigned: unassignedJobs.length,
    };
  }, [jobs, today]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Schedule & Dispatch
          </p>

          <h1 className="page-title">Schedule</h1>

          <p className="page-subtitle">
            Plan daily appointments, assign team members and move jobs through the field workflow.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={loadJobs} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>

          <Link href="/jobs" className="btn-primary">
            <Wrench size={16} />
            Work Orders
          </Link>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Today" value={stats.today} icon={<CalendarDays size={18} />} />
        <MiniStat
          title="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle size={18} />}
          alert={stats.overdue > 0}
        />
        <MiniStat
          title="Urgent"
          value={stats.urgent}
          icon={<Clock size={18} />}
          alert={stats.urgent > 0}
        />
        <MiniStat
          title="Unassigned"
          value={stats.unassigned}
          icon={<UserRound size={18} />}
          alert={stats.unassigned > 0}
        />
      </section>

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Dispatch Week
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Select a day to view and manage scheduled jobs.
            </p>
          </div>

          <input
            className="input max-w-56"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => (
            <button
              key={day.value}
              onClick={() => setSelectedDate(day.value)}
              className={`rounded-[1.25rem] border p-4 text-left transition ${
                selectedDate === day.value
                  ? "border-[#1b1a18] bg-[#1b1a18] text-white shadow-xl"
                  : "border-stone-200 bg-white/85 text-stone-800 hover:bg-white"
              }`}
            >
              <p
                className={`text-xs font-black uppercase tracking-wide ${
                  selectedDate === day.value ? "text-[#d8bd82]" : "text-stone-400"
                }`}
              >
                {day.label}
              </p>

              <p className="mt-2 text-3xl font-black">{day.day}</p>

              <p
                className={`mt-1 text-sm font-bold ${
                  selectedDate === day.value ? "text-white/75" : "text-stone-500"
                }`}
              >
                {day.count} jobs
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Daily Dispatch Board
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
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
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search schedule..."
                className="w-full min-w-52 border-0 bg-transparent text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400"
              />
            </div>

            <select
              className="input min-w-44"
              value={technicianFilter}
              onChange={(event) => setTechnicianFilter(event.target.value)}
            >
              <option value="all">All team</option>
              <option value="unassigned">Unassigned</option>
              {technicians.map((technician) => (
                <option key={technician} value={technician}>
                  {technician}
                </option>
              ))}
            </select>

            <select
              className="input min-w-44"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="active">Active jobs</option>
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="booked">Booked</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
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
              cancelEdit={cancelEdit}
              saveSchedule={saveSchedule}
              updateStatus={updateStatus}
            />
          ))}

          {filteredJobs.length === 0 && (
            <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-10 text-center">
              <CalendarDays className="mx-auto text-stone-400" size={30} />

              <h3 className="mt-4 text-2xl font-black text-stone-950">
                No jobs scheduled
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-stone-500">
                Change the selected day or create a work order with an appointment time.
              </p>

              <Link href="/jobs" className="btn-primary mt-5">
                Open Work Orders
              </Link>
            </div>
          )}
        </div>
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
  cancelEdit,
  saveSchedule,
  updateStatus,
}: {
  job: ScheduleJob;
  editingJobId: string | null;
  scheduleForm: ScheduleForm;
  setScheduleForm: (value: ScheduleForm) => void;
  startEdit: (job: ScheduleJob) => void;
  cancelEdit: () => void;
  saveSchedule: (jobId: string) => void;
  updateStatus: (jobId: string, status: string) => void;
}) {
  const isEditing = editingJobId === job.id;

  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <div className="grid gap-5 xl:grid-cols-[1fr_300px] xl:items-start">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge value={job.status || "new"} />
            <PriorityBadge value={job.priority || "medium"} />

            <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-stone-600">
              {job.job_number || "Work Order"}
            </span>
          </div>

          <h3 className="text-xl font-black tracking-tight text-stone-950">
            {job.title}
          </h3>

          <div className="mt-4 grid gap-2 text-sm font-semibold text-stone-500 md:grid-cols-2">
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
                : "No appointment time"}
            </p>

            <p className="flex items-center gap-2">
              <UserRound size={15} />
              {job.assigned_to || "Unassigned"}
            </p>

            {job.clients?.address && (
              <p className="flex items-center gap-2 md:col-span-2">
                <MapPin size={15} />
                {job.clients.address}
              </p>
            )}
          </div>

          {isEditing && (
            <div className="mt-5 rounded-[1.25rem] bg-stone-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Appointment</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={scheduleForm.appointment_start}
                    onChange={(event) =>
                      setScheduleForm({
                        ...scheduleForm,
                        appointment_start: event.target.value,
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
                    onChange={(event) =>
                      setScheduleForm({
                        ...scheduleForm,
                        due_date: event.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">Assigned To</label>
                  <TechnicianSelect
                    value={scheduleForm.assigned_to}
                    onChange={(value) =>
                      setScheduleForm({
                        ...scheduleForm,
                        assigned_to: value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">Status</label>
                  <select
                    className="input"
                    value={scheduleForm.status}
                    onChange={(event) =>
                      setScheduleForm({
                        ...scheduleForm,
                        status: event.target.value,
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

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => saveSchedule(job.id)} className="btn-primary">
                  Save Schedule
                </button>

                <button onClick={cancelEdit} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[1.25rem] bg-stone-50 p-4">
          <div className="grid gap-2">
            {!isEditing && (
              <button onClick={() => startEdit(job)} className="btn-secondary">
                Reschedule
              </button>
            )}

            {job.status !== "in_progress" &&
              !["completed", "invoiced", "cancelled"].includes(job.status || "") && (
                <button
                  onClick={() => updateStatus(job.id, "in_progress")}
                  className="btn-secondary"
                >
                  Start Job
                </button>
              )}

            {job.status !== "completed" &&
              !["invoiced", "cancelled"].includes(job.status || "") && (
                <button
                  onClick={() => updateStatus(job.id, "completed")}
                  className="btn-secondary"
                >
                  Complete
                </button>
              )}

            <Link href={`/jobs/${job.id}`} className="btn-primary">
              Open Job
              <ArrowRight size={15} />
            </Link>
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
            className={`mt-3 text-3xl font-black tracking-tight ${
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

function getJobScheduleDate(job: ScheduleJob) {
  if (job.appointment_start) {
    return formatDateInput(new Date(job.appointment_start));
  }

  if (job.due_date) {
    return formatDateInput(new Date(job.due_date));
  }

  return "";
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDateInput(value: string) {
  return formatDateInput(new Date(value));
}