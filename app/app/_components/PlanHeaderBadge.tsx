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
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    // Always white background, no border, dark gray text in both themes
    background: "#343a4291",
    color: "#ffffff", // dark gray for readability on white
    border: "1px solid var(--border)",
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: 0.2,
  };
  return base;
}

export default function PlanHeaderBadge({ title, slot = "below" }: { title: string; slot?: "below" | "header-right" | "under-title" }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setRight } = useHeader();
  const [plan, setPlan] = useState<Plan>(null);

  // Setează titlul la mount și când se schimbă titlul
  useEffect(() => {
    if (slot !== 'under-title') {
      setTitle(title);
    }
  }, [setTitle, title, slot]);

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

  // Slot behaviors
  useEffect(() => {
    if (slot === "header-right") {
      setRight(badge);
      return () => { setRight(null); };
    }
    if (slot === 'under-title') {
      // Mută badge-ul sub titlu, în zona titlului din header
      const composed = (
        <div style={{ display: 'grid', gap: 8 }}>
          <span>{title}</span>
          {badge}
        </div>
      );
      setTitle(composed);
    }
  }, [badge, setRight, setTitle, slot, title]);

  if (slot === "header-right" || slot === 'under-title') return null;
  if (!plan) return null;
  return <div style={{ margin: "6px 0 12px" }}>{badge}</div>;
}
