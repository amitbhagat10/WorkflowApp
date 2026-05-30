"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Technician = {
  id: string;
  name: string;
  role: string | null;
  active: boolean | null;
};

export default function TechnicianSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  useEffect(() => {
    loadTechnicians();
  }, []);

  async function loadTechnicians() {
    const { data, error } = await supabase
      .from("technicians")
      .select("id, name, role, active")
      .eq("active", true)
      .order("name");

    if (!error) {
      setTechnicians((data || []) as Technician[]);
    }
  }

  const hasCurrentValue =
    value && !technicians.some((technician) => technician.name === value);

  return (
    <select
      className="input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Unassigned</option>

      {hasCurrentValue && <option value={value}>{value}</option>}

      {technicians.map((technician) => (
        <option key={technician.id} value={technician.name}>
          {technician.name}
          {technician.role ? ` — ${technician.role}` : ""}
        </option>
      ))}
    </select>
  );
}