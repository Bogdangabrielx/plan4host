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

export default function PlanHeaderBadge({ title, slot = "below" }: { title: string; slot?: "below" | "header-right" }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setRight } = useHeader();
  const [plan, setPlan] = useState<Plan>(null);

  // Setează titlul în header ca simplu string
  useEffect(() => {
    setTitle(title);
  }, [setTitle, title]);

  // Citește planul activ din RPC (derivat din account_plan.plan_slug)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await supabase.rpc("account_current_plan");
        const p = (r.data as string | null)?.toLowerCase?.() as Plan | null;
        if (mounted) setPlan((p ?? "basic") as Plan);
      } catch {
        if (mounted) setPlan("basic");
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  // Compose badge element
  const badge = plan ? <span style={planBadgeStyle(plan)}>{planLabel(plan)}</span> : null;

  // If we place in header-right, push into header and render nothing
  useEffect(() => {
    if (slot === "header-right") {
      setRight(badge);
      return () => { setRight(null); };
    }
  }, [badge, setRight, slot]);

  if (slot === "header-right") return null;
  if (!plan) return null;
  return <div style={{ margin: "6px 0 12px" }}>{badge}</div>;
}
