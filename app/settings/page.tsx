"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Mail,
  Palette,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type WorkspaceSettings = {
  id: string;
  name: string;
  branding_name: string | null;
  business_phone: string | null;
  business_email: string | null;
  invoice_footer: string | null;
  logo_url: string | null;
  primary_color: string | null;
  status: string;
  plan: string;
  trial_ends_at: string | null;
};

const colourOptions = [
  { label: "Charcoal", value: "#2b2926" },
  { label: "Gold", value: "#b08d57" },
  { label: "Forest", value: "#274c3c" },
  { label: "Navy", value: "#1f2a44" },
  { label: "Maroon", value: "#5b2328" },
];

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    branding_name: "",
    business_phone: "",
    business_email: "",
    invoice_footer: "",
    primary_color: "#2b2926",
    logo_url: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setMessage("");

    const adminResult = await supabase.rpc("current_user_is_admin");

    if (adminResult.error) {
      setMessage(adminResult.error.message);
      setLoading(false);
      return;
    }

    if (!adminResult.data) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      setMessage("Could not find your workspace.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("workspaces")
      .select(
        "id, name, branding_name, business_phone, business_email, invoice_footer, logo_url, primary_color, status, plan, trial_ends_at"
      )
      .eq("id", workspaceResult.data)
      .single();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const loaded = data as WorkspaceSettings;

    setWorkspace(loaded);
    setForm({
      branding_name: loaded.branding_name || loaded.name || "",
      business_phone: loaded.business_phone || "",
      business_email: loaded.business_email || "",
      invoice_footer: loaded.invoice_footer || "",
      primary_color: loaded.primary_color || "#2b2926",
      logo_url: loaded.logo_url || "",
    });

    setLoading(false);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.rpc("update_current_workspace_branding", {
      input_branding_name: form.branding_name,
      input_business_phone: form.business_phone,
      input_business_email: form.business_email,
      input_invoice_footer: form.invoice_footer,
      input_primary_color: form.primary_color,
      input_logo_url: form.logo_url,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Workspace branding updated successfully.");
    loadSettings();
  }

  function daysLeft() {
    if (!workspace?.trial_ends_at) return null;

    const today = new Date();
    const end = new Date(workspace.trial_ends_at);
    const diff = end.getTime() - today.getTime();

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading settings...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="card text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <ShieldCheck size={24} />
        </div>

        <h1 className="mt-4 text-2xl font-black text-stone-900">
          Admin access required
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
          Only a workspace admin can update branding and business settings.
        </p>
      </div>
    );
  }

  const displayName = form.branding_name || workspace?.name || "Workspace";
  const remainingDays = daysLeft();

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
            Workspace Settings
          </p>
          <h1 className="page-title">Branding</h1>
          <p className="page-subtitle">
            Personalise the workspace with your business name, colour, logo and invoice details.
          </p>
        </div>

        <button onClick={loadSettings} className="btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-2xl border border-stone-200 bg-white/85 p-4 text-sm font-semibold text-stone-700">
          {message}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Live Preview
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            This is how the workspace identity appears inside the app.
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-base font-black text-white shadow-sm"
                style={{ backgroundColor: form.primary_color || "#2b2926" }}
              >
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Logo preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  displayName.slice(0, 2).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">
                  Workspace
                </p>

                <h3 className="mt-1 truncate text-2xl font-black tracking-tight text-stone-950">
                  {displayName}
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {workspace?.status === "trial" ? (
                    <>
                      <span className="rounded-full bg-[#f4efe4] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#2b2926]">
                        Trial workspace
                      </span>

                      {remainingDays !== null && (
                        <span className="rounded-full bg-stone-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-stone-600">
                          {remainingDays} days left
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                        Active workspace
                      </span>

                      <span className="rounded-full bg-stone-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-stone-600">
                        {workspace?.plan} plan
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-stone-600">
              <p className="flex items-center gap-2">
                <Phone size={15} className="text-stone-400" />
                {form.business_phone || "No business phone added"}
              </p>

              <p className="flex items-center gap-2">
                <Mail size={15} className="text-stone-400" />
                {form.business_email || "No business email added"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-stone-50/80 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-stone-400">
              Invoice Footer Preview
            </p>
            <p className="mt-2 text-sm font-medium text-stone-600">
              {form.invoice_footer ||
                "Thank you for choosing our business. Please contact us if you have any questions."}
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-black tracking-tight text-stone-900">
            Business Branding
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            These settings are isolated to this workspace only.
          </p>

          <form onSubmit={saveSettings} className="mt-6 grid gap-5">
            <div>
              <label className="label">Business / Trading Name</label>
              <input
                className="input"
                value={form.branding_name}
                onChange={(e) =>
                  setForm({ ...form, branding_name: e.target.value })
                }
                placeholder="Example: MM Joinery"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label">Business Phone</label>
                <input
                  className="input"
                  value={form.business_phone}
                  onChange={(e) =>
                    setForm({ ...form, business_phone: e.target.value })
                  }
                  placeholder="0400 000 000"
                />
              </div>

              <div>
                <label className="label">Business Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.business_email}
                  onChange={(e) =>
                    setForm({ ...form, business_email: e.target.value })
                  }
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Logo URL</label>
              <input
                className="input"
                value={form.logo_url}
                onChange={(e) =>
                  setForm({ ...form, logo_url: e.target.value })
                }
                placeholder="https://..."
              />
              <p className="mt-2 text-xs font-semibold text-stone-400">
                Logo upload will be added later. For now, paste a hosted logo URL.
              </p>
            </div>

            <div>
              <label className="label">Brand Colour</label>

              <div className="mt-2 grid gap-3 md:grid-cols-[1fr_120px]">
                <div className="grid grid-cols-5 gap-2">
                  {colourOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, primary_color: option.value })
                      }
                      className={`rounded-2xl border p-3 text-left transition ${
                        form.primary_color === option.value
                          ? "border-stone-950 bg-stone-50"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <span
                        className="mb-2 block h-8 rounded-xl"
                        style={{ backgroundColor: option.value }}
                      />
                      <span className="text-xs font-black text-stone-600">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>

                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) =>
                    setForm({ ...form, primary_color: e.target.value })
                  }
                  className="h-full min-h-20 w-full cursor-pointer rounded-2xl border border-stone-200 bg-white p-2"
                />
              </div>
            </div>

            <div>
              <label className="label">Invoice Footer</label>
              <textarea
                className="input min-h-28"
                value={form.invoice_footer}
                onChange={(e) =>
                  setForm({ ...form, invoice_footer: e.target.value })
                }
                placeholder="Thank you for choosing MM Joinery..."
              />
            </div>

            <button type="submit" className="btn-primary">
              <Save size={16} />
              Save Branding
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}