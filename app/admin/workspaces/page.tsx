"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type AppRecord = {
  id: string;
  app_key: string;
  name: string;
  active: boolean;
  created_at: string;
};

type Workspace = {
  id: string;
  app_key: string;
  name: string;
  slug: string;
  workspace_type: string;
  status: string;
  plan: string;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  branding_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
};

type ApprovedUser = {
  id: string;
  app_key: string;
  email: string;
  role: "admin" | "staff";
  active: boolean;
  platform_admin: boolean;
  workspace_id: string | null;
  created_at: string;
};

export default function AdminWorkspacesPage() {
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [workspaceForm, setWorkspaceForm] = useState({
    app_key: "workflow",
    name: "",
    slug: "",
    workspace_type: "client",
    status: "trial",
    plan: "trial",
    branding_name: "",
  });

  const [userForm, setUserForm] = useState({
    workspace_id: "",
    email: "",
    role: "admin" as "admin" | "staff",
  });

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const platformAdminResult = await supabase.rpc(
      "current_user_is_platform_admin"
    );

    if (platformAdminResult.error) {
      setMessage(platformAdminResult.error.message);
      setLoading(false);
      return;
    }

    if (!platformAdminResult.data) {
      setIsPlatformAdmin(false);
      setLoading(false);
      return;
    }

    setIsPlatformAdmin(true);

    const appsResult = await supabase
      .from("apps")
      .select("*")
      .order("name", { ascending: true });

    if (appsResult.error) {
      setMessage(appsResult.error.message);
      setLoading(false);
      return;
    }

    const workspaceResult = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });

    if (workspaceResult.error) {
      setMessage(workspaceResult.error.message);
      setLoading(false);
      return;
    }

    const usersResult = await supabase
      .from("approved_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersResult.error) {
      setMessage(usersResult.error.message);
      setLoading(false);
      return;
    }

    setApps((appsResult.data || []) as unknown as AppRecord[]);
    setWorkspaces((workspaceResult.data || []) as unknown as Workspace[]);
    setUsers((usersResult.data || []) as unknown as ApprovedUser[]);
    setLoading(false);
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const name = workspaceForm.name.trim();
    const slug = slugify(workspaceForm.slug || workspaceForm.name);

    if (!name || !slug) {
      setMessage("Workspace name is required.");
      return;
    }

    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const { data, error } = await supabase
      .from("workspaces")
      .insert({
        app_key: workspaceForm.app_key,
        name,
        slug,
        workspace_type: workspaceForm.workspace_type,
        status: workspaceForm.status,
        plan: workspaceForm.plan,
        trial_starts_at:
          workspaceForm.status === "trial" ? trialStart.toISOString() : null,
        trial_ends_at:
          workspaceForm.status === "trial" ? trialEnd.toISOString() : null,
        branding_name: workspaceForm.branding_name.trim() || name,
        primary_color: "#2b2926",
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setWorkspaceForm({
      app_key: workspaceForm.app_key,
      name: "",
      slug: "",
      workspace_type: "client",
      status: "trial",
      plan: "trial",
      branding_name: "",
    });

    setUserForm({
      workspace_id: data.id,
      email: "",
      role: "admin",
    });

    setMessage("Workspace created. Now add the client admin user.");
    loadPage();
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const email = userForm.email.trim().toLowerCase();

    if (!userForm.workspace_id) {
      setMessage("Please select a workspace.");
      return;
    }

    if (!email) {
      setMessage("Email is required.");
      return;
    }

    const workspace = workspaces.find(
      (item) => item.id === userForm.workspace_id
    );

    if (!workspace) {
      setMessage("Selected workspace was not found.");
      return;
    }

    const { error } = await supabase.from("approved_users").insert({
      app_key: workspace.app_key,
      workspace_id: workspace.id,
      email,
      role: userForm.role,
      active: true,
      platform_admin: false,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setUserForm({
      workspace_id: workspace.id,
      email: "",
      role: "admin",
    });

    setMessage("Workspace user added successfully.");
    loadPage();
  }

  async function updateWorkspace(
    workspace: Workspace,
    changes: Partial<Workspace>
  ) {
    setMessage("");

    const { error } = await supabase
      .from("workspaces")
      .update(changes)
      .eq("id", workspace.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Workspace updated.");
    loadPage();
  }

  async function convertToActive(workspace: Workspace) {
    await updateWorkspace(workspace, {
      status: "active",
      plan: workspace.plan === "trial" ? "starter" : workspace.plan,
      trial_ends_at: null,
    });
  }

  async function extendTrial(workspace: Workspace) {
    const newEnd = new Date();
    newEnd.setDate(newEnd.getDate() + 30);

    await updateWorkspace(workspace, {
      status: "trial",
      plan: "trial",
      trial_ends_at: newEnd.toISOString(),
    });
  }

  const stats = useMemo(() => {
    return {
      total: workspaces.length,
      trial: workspaces.filter((item) => item.status === "trial").length,
      active: workspaces.filter((item) => item.status === "active").length,
      suspended: workspaces.filter((item) => item.status === "suspended")
        .length,
    };
  }, [workspaces]);

  function usersForWorkspace(workspaceId: string) {
    return users.filter((user) => user.workspace_id === workspaceId);
  }

  function trialDaysLeft(workspace: Workspace) {
    if (!workspace.trial_ends_at) return null;

    const today = new Date();
    const end = new Date(workspace.trial_ends_at);
    const difference = end.getTime() - today.getTime();

    return Math.ceil(difference / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading workspaces...</p>;
  }

  if (!isPlatformAdmin) {
    return (
      <div className="card text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <ShieldCheck size={24} />
        </div>

        <h1 className="mt-4 text-2xl font-black text-stone-900">
          Platform admin required
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
          Only the platform owner can manage client workspaces.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            SaaS Control Centre
          </p>
          <h1 className="page-title">Workspaces</h1>
          <p className="page-subtitle">
            Create 30-day trials, manage app workspaces, and control access securely.
          </p>
        </div>

        <button onClick={loadPage} className="btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Total Workspaces" value={stats.total} />
        <MiniStat title="Trial" value={stats.trial} />
        <MiniStat title="Active" value={stats.active} />
        <MiniStat title="Suspended" value={stats.suspended} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Create Workspace
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            For now, create Workflow workspaces only. Other app schemas will be connected later.
          </p>

          <form onSubmit={createWorkspace} className="mt-5 grid gap-4">
            <div>
              <label className="label">App</label>
              <select
                className="input"
                value={workspaceForm.app_key}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    app_key: e.target.value,
                    slug: slugify(`${e.target.value}-${workspaceForm.name}`),
                  })
                }
              >
                {apps.map((app) => (
                  <option key={app.id} value={app.app_key}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Workspace Name</label>
              <input
                className="input"
                value={workspaceForm.name}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    name: e.target.value,
                    slug: slugify(`${workspaceForm.app_key}-${e.target.value}`),
                  })
                }
                placeholder="ABC Carpentry Trial"
              />
            </div>

            <div>
              <label className="label">Slug</label>
              <input
                className="input"
                value={workspaceForm.slug}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    slug: slugify(e.target.value),
                  })
                }
                placeholder="workflow-abc-carpentry-trial"
              />
            </div>

            <div>
              <label className="label">Branding Name</label>
              <input
                className="input"
                value={workspaceForm.branding_name}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    branding_name: e.target.value,
                  })
                }
                placeholder="ABC Carpentry"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={workspaceForm.workspace_type}
                  onChange={(e) =>
                    setWorkspaceForm({
                      ...workspaceForm,
                      workspace_type: e.target.value,
                    })
                  }
                >
                  <option value="client">Client</option>
                  <option value="demo">Demo</option>
                  <option value="internal">Internal</option>
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={workspaceForm.status}
                  onChange={(e) =>
                    setWorkspaceForm({
                      ...workspaceForm,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                </select>
              </div>

              <div>
                <label className="label">Plan</label>
                <select
                  className="input"
                  value={workspaceForm.plan}
                  onChange={(e) =>
                    setWorkspaceForm({
                      ...workspaceForm,
                      plan: e.target.value,
                    })
                  }
                >
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary">
              <Building2 size={16} />
              Create Workspace
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Add Workspace User
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Add the client owner as admin. They only see their own workspace data.
          </p>

          <form onSubmit={addUser} className="mt-5 grid gap-4">
            <div>
              <label className="label">Workspace</label>
              <select
                className="input"
                value={userForm.workspace_id}
                onChange={(e) =>
                  setUserForm({ ...userForm, workspace_id: e.target.value })
                }
              >
                <option value="">Select workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.app_key} — {workspace.name} — {workspace.status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">User Email</label>
              <input
                className="input"
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={userForm.role}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    role: e.target.value as "admin" | "staff",
                  })
                }
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <button type="submit" className="btn-primary">
              <UserPlus size={16} />
              Add User
            </button>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="mb-5">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Client / Demo Workspaces
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Trial workspaces are blocked after expiry unless converted to active.
          </p>
        </div>

        <div className="grid gap-4">
          {workspaces.map((workspace) => {
            const workspaceUsers = usersForWorkspace(workspace.id);
            const daysLeft = trialDaysLeft(workspace);

            return (
              <div
                key={workspace.id}
                className="rounded-2xl border border-stone-200 bg-white/75 p-4"
              >
                <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
                        <Building2 size={20} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black text-stone-900">
                            {workspace.name}
                          </h3>

                          <WorkspaceBadge value={workspace.app_key} soft />
                          <WorkspaceBadge value={workspace.status} />
                          <WorkspaceBadge value={workspace.plan} soft />
                        </div>

                        <p className="mt-1 text-sm text-stone-500">
                          {workspace.slug} · {workspace.workspace_type}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-stone-500">
                          <span className="rounded-full bg-stone-100 px-3 py-1">
                            Users: {workspaceUsers.length}
                          </span>

                          <span className="rounded-full bg-stone-100 px-3 py-1">
                            Created{" "}
                            {new Date(workspace.created_at).toLocaleDateString()}
                          </span>

                          {workspace.status === "trial" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#f4efe4] px-3 py-1 text-[#2b2926]">
                              <CalendarDays size={13} />
                              {daysLeft !== null
                                ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                                : "No expiry"}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 rounded-2xl bg-stone-50/80 p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-stone-400">
                            Users
                          </p>

                          <div className="mt-2 space-y-1">
                            {workspaceUsers.map((user) => (
                              <p
                                key={user.id}
                                className="text-sm font-semibold text-stone-600"
                              >
                                {user.email} · {user.role} ·{" "}
                                {user.active ? "active" : "blocked"}
                              </p>
                            ))}

                            {workspaceUsers.length === 0 && (
                              <p className="text-sm text-stone-500">
                                No users added yet.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-2xl bg-stone-50/80 p-4">
                    <button
                      onClick={() => convertToActive(workspace)}
                      className="btn-primary"
                    >
                      <CheckCircle2 size={16} />
                      Convert to Active
                    </button>

                    <button
                      onClick={() => extendTrial(workspace)}
                      className="btn-secondary"
                    >
                      Extend 30 Days
                    </button>

                    <button
                      onClick={() =>
                        updateWorkspace(workspace, { status: "suspended" })
                      }
                      className="btn-danger"
                    >
                      Suspend
                    </button>

                    <button
                      onClick={() =>
                        updateWorkspace(workspace, { status: "trial" })
                      }
                      className="btn-secondary"
                    >
                      Back to Trial
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-stone-950">
        {value}
      </p>
    </div>
  );
}

function WorkspaceBadge({
  value,
  soft,
}: {
  value: string;
  soft?: boolean;
}) {
  const style =
    value === "active"
      ? "bg-emerald-50 text-emerald-700"
      : value === "trial"
      ? "bg-[#f4efe4] text-[#2b2926]"
      : value === "suspended" || value === "expired"
      ? "bg-red-50 text-red-700"
      : soft
      ? "bg-stone-100 text-stone-600"
      : "bg-stone-100 text-stone-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${style}`}
    >
      {value}
    </span>
  );
}