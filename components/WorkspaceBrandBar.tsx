"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ShieldCheck } from "lucide-react";
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
      .select(
        "id, name, branding_name, status, plan, trial_ends_at, primary_color"
      )
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

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if (hide || !workspace) {
    return null;
  }

  const displayName = workspace.branding_name || workspace.name;
  const brandColor = workspace.primary_color || "#2b2926";
  const remainingDays = daysLeft();

  return (
    <section className="no-print mb-7 rounded-[1.65rem] border border-stone-200/80 bg-white/90 p-4 shadow-sm shadow-stone-900/5 backdrop-blur-xl">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            {displayName.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-stone-400">
              Workspace
            </p>

            <h2 className="truncate text-2xl font-black tracking-tight text-stone-950">
              {displayName}
            </h2>

            <p className="mt-1 text-sm font-medium text-stone-500">
              Field service operations, scheduling, payments and client records.
            </p>
          </div>
        </div>

<div className="flex flex-wrap items-center gap-2">
  {workspace.status === "trial" ? (
    <>
      <span className="inline-flex items-center gap-2 rounded-full bg-[#f4efe4] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#2b2926]">
        <ShieldCheck size={14} />
        Trial workspace
      </span>

      {remainingDays !== null && (
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-stone-700 shadow-sm">
          <CalendarDays size={14} />
          {remainingDays} day{remainingDays === 1 ? "" : "s"} left
        </span>
      )}
    </>
  ) : (
    <>
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
        <CheckCircle2 size={14} />
        Active workspace
      </span>

      <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-stone-600">
        <ShieldCheck size={14} />
        {workspace.plan} plan
      </span>
    </>
  )}
</div>
      </div>
    </section>
  );
}