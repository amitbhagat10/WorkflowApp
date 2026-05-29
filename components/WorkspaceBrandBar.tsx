"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type WorkspaceBrand = {
  id: string;
  name: string;
  branding_name: string | null;
  status: string;
  plan: string;
  trial_ends_at: string | null;
  primary_color: string | null;
};

export default function WorkspaceBrandBar() {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<WorkspaceBrand | null>(null);

  const hide =
    pathname.startsWith("/login") || pathname.startsWith("/auth/callback");

  useEffect(() => {
    if (!hide) {
      loadWorkspace();
    }
  }, [hide]);

  async function loadWorkspace() {
    const workspaceResult = await supabase.rpc("current_user_workspace_id");

    if (workspaceResult.error || !workspaceResult.data) {
      return;
    }

    const { data, error } = await supabase
      .from("workspaces")
      .select("id, name, branding_name, status, plan, trial_ends_at, primary_color")
      .eq("id", workspaceResult.data)
      .single();

    if (error) {
      return;
    }

    setWorkspace(data as WorkspaceBrand);
  }

  function daysLeft() {
    if (!workspace?.trial_ends_at) return null;

    const today = new Date();
    const end = new Date(workspace.trial_ends_at);
    const diff = end.getTime() - today.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  if (hide || !workspace) {
    return null;
  }

  const remainingDays = daysLeft();
  const displayName = workspace.branding_name || workspace.name;
  const brandColor = workspace.primary_color || "#2b2926";

  return (
    <div className="no-print mb-6 overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white/85 shadow-sm backdrop-blur">
      <div
        className="h-1.5"
        style={{
          background: brandColor,
        }}
      />

      <div className="flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white"
            style={{
              background: brandColor,
            }}
          >
            {displayName.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Workspace
            </p>

            <h2 className="text-lg font-black tracking-tight text-stone-950">
              {displayName}
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Secure isolated workspace · Plan: {workspace.plan}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
              workspace.status === "active"
                ? "bg-emerald-50 text-emerald-700"
                : workspace.status === "trial"
                ? "bg-[#f4efe4] text-[#2b2926]"
                : "bg-red-50 text-red-700"
            }`}
          >
            <ShieldCheck size={14} />
            {workspace.status}
          </span>

          {workspace.status === "trial" && remainingDays !== null && (
            <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-stone-700">
              <CalendarDays size={14} />
              {remainingDays} day{remainingDays === 1 ? "" : "s"} left
            </span>
          )}
        </div>
      </div>
    </div>
  );
}