"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type ApprovedUser = {
  email: string;
  role: string | null;
  active: boolean | null;
  platform_admin: boolean | null;
  app_key: string | null;
  workspace_id: string | null;
  must_change_password: boolean | null;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  plan: string | null;
};

export default function AdminUsersPage() {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [users, setUsers] = useState<ApprovedUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    email: "",
    role: "staff",
    workspace_id: "",
    active: true,
    platform_admin: false,
    must_change_password: true,
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    setChecking(true);
    setMessage("");

    const adminResult = await supabase.rpc("current_user_is_platform_admin");

    if (adminResult.error || adminResult.data !== true) {
      setAllowed(false);
      setChecking(false);
      return;
    }

    setAllowed(true);
    setChecking(false);
    loadData();
  }

  async function loadData() {
    setMessage("");

    const workspacesResult = await supabase
      .from("workspaces")
      .select("id, name, slug, status, plan")
      .eq("app_key", "workflow")
      .order("name");

    if (workspacesResult.error) {
      setMessage(workspacesResult.error.message);
      return;
    }

    const loadedWorkspaces = (workspacesResult.data || []) as Workspace[];
    setWorkspaces(loadedWorkspaces);

    setForm((current) => ({
      ...current,
      workspace_id:
        current.workspace_id ||
        loadedWorkspaces.find((item) => item.slug === "workflow-onestopitservices")?.id ||
        loadedWorkspaces[0]?.id ||
        "",
    }));

    const usersResult = await supabase
      .from("approved_users")
      .select(
        "email, role, active, platform_admin, app_key, workspace_id, must_change_password"
      )
      .eq("app_key", "workflow")
      .order("email");

    if (usersResult.error) {
      setMessage(usersResult.error.message);
      return;
    }

    setUsers((usersResult.data || []) as ApprovedUser[]);
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const cleanEmail = form.email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Email is required.");
      return;
    }

    if (!form.workspace_id && !form.platform_admin) {
      setMessage("Workspace is required for client users.");
      return;
    }

    const { error } = await supabase.rpc("admin_upsert_workflow_user", {
      input_email: cleanEmail,
      input_role: form.role,
      input_workspace_id: form.workspace_id || null,
      input_platform_admin: form.platform_admin,
      input_must_change_password: form.must_change_password,
      input_active: form.active,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("User saved successfully.");

    setForm({
      email: "",
      role: "staff",
      workspace_id: workspaces[0]?.id || "",
      active: true,
      platform_admin: false,
      must_change_password: true,
    });

    setShowForm(false);
    loadData();
  }

  async function toggleMustChangePassword(user: ApprovedUser) {
    setMessage("");

    const nextValue = !Boolean(user.must_change_password);

    const { error } = await supabase.rpc(
      "admin_set_workflow_user_must_change_password",
      {
        input_email: user.email,
        input_value: nextValue,
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      nextValue
        ? "User will be forced to change password on next login."
        : "Password change requirement removed."
    );

    loadData();
  }

  async function deleteUserAccess(user: ApprovedUser) {
    const confirmed = window.confirm(
      `Delete WorkFlow Pro access for ${user.email}? This will not delete the Supabase Auth account, but the user will no longer access this app.`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase.rpc("admin_delete_workflow_user_access", {
      input_email: user.email,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("User access deleted successfully.");
    loadData();
  }

  function editUser(user: ApprovedUser) {
    setForm({
      email: user.email,
      role: user.role || "staff",
      workspace_id: user.workspace_id || "",
      active: Boolean(user.active),
      platform_admin: Boolean(user.platform_admin),
      must_change_password: Boolean(user.must_change_password),
    });

    setShowForm(true);
  }

  const workspaceMap = useMemo(() => {
    return new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  }, [workspaces]);

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return users;

    return users.filter((user) => {
      const workspace = user.workspace_id
        ? workspaceMap.get(user.workspace_id)
        : null;

      return (
        user.email.toLowerCase().includes(search) ||
        (user.role || "").toLowerCase().includes(search) ||
        (workspace?.name || "").toLowerCase().includes(search) ||
        (workspace?.slug || "").toLowerCase().includes(search)
      );
    });
  }, [users, searchTerm, workspaceMap]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.active).length,
      forcePassword: users.filter((user) => user.must_change_password).length,
      platformAdmins: users.filter((user) => user.platform_admin).length,
    };
  }, [users]);

  if (checking) {
    return (
      <div className="card">
        <p className="text-sm font-black text-stone-600">Checking admin access...</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="card text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-xl font-black text-red-700">
          !
        </div>

        <h1 className="text-2xl font-black tracking-tight text-stone-950">
          Admin access required
        </h1>

        <p className="mt-3 text-sm font-semibold text-stone-500">
          Only the WorkFlow Pro platform admin can manage users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Platform Admin
          </p>

          <h1 className="page-title">Users</h1>

          <p className="page-subtitle">
            Add users, force password changes and delete WorkFlow Pro access.
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
            {showForm ? "Close" : "Add User"}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-sm font-semibold text-stone-700 shadow-sm">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat title="Total Users" value={stats.total} />
        <MiniStat title="Active" value={stats.active} />
        <MiniStat title="Force Password" value={stats.forcePassword} alert={stats.forcePassword > 0} />
        <MiniStat title="Platform Admins" value={stats.platformAdmins} />
      </section>

      {showForm && (
        <section className="card">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-stone-950">
              Add / Update User
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              This controls app access. Auth password is created separately in Supabase Authentication.
            </p>
          </div>

          <form onSubmit={saveUser} className="grid gap-5">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="client@example.com"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Workspace</label>
                <select
                  className="input"
                  value={form.workspace_id}
                  onChange={(e) =>
                    setForm({ ...form, workspace_id: e.target.value })
                  }
                >
                  <option value="">No workspace selected</option>

                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name} · {workspace.slug}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="technician">Technician</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ToggleCard
                title="Active User"
                description="User can access the selected workspace."
                active={form.active}
                onClick={() => setForm({ ...form, active: !form.active })}
              />

              <ToggleCard
                title="Must Change Password"
                description="Force user to replace temporary password."
                active={form.must_change_password}
                onClick={() =>
                  setForm({
                    ...form,
                    must_change_password: !form.must_change_password,
                  })
                }
              />

              <ToggleCard
                title="Platform Admin"
                description="Full platform access. Use only for Amit/admin."
                active={form.platform_admin}
                danger
                onClick={() =>
                  setForm({
                    ...form,
                    platform_admin: !form.platform_admin,
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="btn-primary">
                <Save size={16} />
                Save User
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
              User Access Register
            </h2>

            <p className="mt-1 text-sm font-semibold text-stone-500">
              Manage who can access each WorkFlow Pro workspace.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[1.25rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <Search size={18} className="text-stone-400" />

            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full min-w-60 border-0 bg-transparent text-sm font-bold text-stone-800 outline-none placeholder:text-stone-400"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <UserCard
              key={`${user.email}-${user.workspace_id || "none"}`}
              user={user}
              workspace={user.workspace_id ? workspaceMap.get(user.workspace_id) : null}
              editUser={editUser}
              toggleMustChangePassword={toggleMustChangePassword}
              deleteUserAccess={deleteUserAccess}
            />
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 p-10 text-center">
            <UserRound className="mx-auto text-stone-400" size={30} />

            <h3 className="mt-4 text-2xl font-black text-stone-950">
              No users found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-stone-500">
              Add a user to give them access to a WorkFlow Pro workspace.
            </p>

            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              Add User
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function UserCard({
  user,
  workspace,
  editUser,
  toggleMustChangePassword,
  deleteUserAccess,
}: {
  user: ApprovedUser;
  workspace: Workspace | null | undefined;
  editUser: (user: ApprovedUser) => void;
  toggleMustChangePassword: (user: ApprovedUser) => void;
  deleteUserAccess: (user: ApprovedUser) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md">
      <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge active={Boolean(user.active)} />

            {user.platform_admin && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-purple-700">
                <ShieldCheck size={13} />
                Platform Admin
              </span>
            )}

            {user.must_change_password && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-orange-700">
                <KeyRound size={13} />
                Must Change Password
              </span>
            )}
          </div>

          <h3 className="truncate text-xl font-black tracking-tight text-stone-950">
            {user.email}
          </h3>

          <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-500 md:grid-cols-2">
            <p className="flex items-center gap-2">
              <Mail size={15} />
              {user.role || "staff"}
            </p>

            <p className="flex items-center gap-2">
              <Building2 size={15} />
              {workspace ? `${workspace.name} · ${workspace.slug}` : "No workspace"}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button onClick={() => editUser(user)} className="btn-secondary">
            Edit
          </button>

          <button
            onClick={() => toggleMustChangePassword(user)}
            className="btn-secondary"
          >
            <KeyRound size={15} />
            {user.must_change_password ? "Remove Force" : "Force Change"}
          </button>

          <button
            onClick={() => deleteUserAccess(user)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={15} />
            Delete Access
          </button>
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
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <p
        className={`mt-3 text-3xl font-black tracking-tight ${
          alert ? "text-orange-600" : "text-stone-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  active,
  onClick,
  danger,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.25rem] border p-4 text-left transition ${
        active
          ? danger
            ? "border-purple-200 bg-purple-50"
            : "border-[#1b1a18] bg-[#1b1a18] text-white"
          : "border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{title}</p>
          <p
            className={`mt-1 text-xs font-semibold ${
              active && !danger ? "text-white/70" : "text-stone-500"
            }`}
          >
            {description}
          </p>
        </div>

        {active ? (
          <CheckCircle2
            size={20}
            className={danger ? "text-purple-700" : "text-[#d8bd82]"}
          />
        ) : (
          <XCircle size={20} className="text-stone-300" />
        )}
      </div>
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
      }`}
    >
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}