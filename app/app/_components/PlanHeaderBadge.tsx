"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "./HeaderContext";

type Plan = "basic" | "standard" | "premium" | null;

function planLabel(plan: Plan) {
  if (!plan) return "—";
  return plan[0].toUpperCase() + plan.slice(1);
}
function planBadgeStyle(plan: Plan): React.CSSProperties {
  if (plan === "premium") {
    return {
      display: "inline-block",
    padding: "2px 29px",
    borderRadius: 999,
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid #94a3b8",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.2,
    boxShadow:  "0 0px 4px #51be36e4"
    };
  }
  if (plan === "standard") {
    return {
      display: "inline-block",
    padding: "2px 29px",
    borderRadius: 999,
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid #94a3b8",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.2,
    boxShadow:  "0 0px 4px #51be36e4"
    };
  }
  return {
    display: "inline-block",
    padding: "2px 29px",
    borderRadius: 999,
    background: "transparent",
    color: "var(--muted)",
    border: "1px solid #94a3b8",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.2,
    boxShadow:  "0 0px 4px #51be36e4"
  };
}

export default function PlanHeaderBadge({ title }: { title: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle } = useHeader();
  const [plan, setPlan] = useState<Plan>(null);

  // Setează titlul în header ca simplu string
  useEffect(() => {
    setTitle(title);
  }, [setTitle, title]);

  // Citește planul (RLS permite membrilor contului)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("plan, valid_until")
        .order("created_at", { ascending: true });

      let p: Plan = "basic";
      if (!error && data && data.length > 0) {
        const acc = data[0] as any;
        const now = new Date();
        const valid = acc.valid_until ? new Date(acc.valid_until) > now : true;
        p = valid ? (acc.plan as Plan) : "basic";
      }
      if (mounted) setPlan(p);
    })();
    return () => { mounted = false; };
  }, [supabase]);

  // Randează DOAR badge-ul sub titlu (în pagină)
  if (!plan) return null;
  return (
    <div style={{ margin: "6px 0 12px" }}>
      <span style={planBadgeStyle(plan)}>{planLabel(plan)}</span>
    </div>
  );
}
