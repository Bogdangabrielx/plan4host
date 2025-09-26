"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

/** ─────────────────────────────────────────────────────────────
 *  Planuri (sursă: landing) + PNG-uri
 *  ──────────────────────────────────────────────────────────── */
type PlanSlug = "basic" | "standard" | "premium";
type Plan = {
  slug: PlanSlug;
  name: string;
  image: string; // PNG-ul cu prețul
  bullets: string[];
};

const PLANS: Plan[] = [
  {
    slug: "basic",
    name: "BASIC",
    image: "/basic.png",
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 60 minutes with iCal",
    ],
  },
  {
    slug: "standard",
    name: "STANDARD",
    image: "/standard.png",
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 30 minutes with iCal",
      "Smart cleaning board (Advanced Next-Check-In Priority)",
    ],
  },
  {
    slug: "premium",
    name: "PREMIUM",
    image: "/premium.png",
    bullets: [
      "Adaptive calendar",
      "Online check-in form",
      "Unlimited properties and rooms listed",
      "Autosync every 10 minutes with iCal + Sync Now Function",
      "Smart cleaning board - Advanced Next-Check-In Priority",
      "Delegate tasks with your team members",
    ],
  },
];

/** ─────────────────────────────────────────────────────────────
 *  Helpers mici
 *  ──────────────────────────────────────────────────────────── */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const green = "var(--primary, #22c55e)";

/** ─────────────────────────────────────────────────────────────
 *  Pagina Subscription — TOTUL într-un singur fișier
 *  ──────────────────────────────────────────────────────────── */
export default function SubscriptionPage() {
  const supabase = useMemo(() => createClient(), []);

  const [currentPlan, setCurrentPlan] = useState<PlanSlug>("basic");
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [saving, setSaving] = useState<PlanSlug | null>(null);
  const [role, setRole] = useState<"admin" | "member">("admin");

  // Citește DOAR statusul utilizatorului (plan curent + valid_until)
  useEffect(() => {
    (async () => {
      try {
        // rol
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id as string | undefined;
        if (uid) {
          const { data: au } = await supabase
            .from("account_users")
            .select("role,disabled")
            .eq("account_id", uid)
            .eq("user_id", uid)
            .maybeSingle();
          if (au?.role) setRole(au.role === "admin" ? "admin" : "member");
        }

        // plan curent din RPC
        const r = await supabase.rpc("account_current_plan");
        const pl = (r.data as string | null)?.toLowerCase?.() as PlanSlug | null;
        if (pl && ["basic", "standard", "premium"].includes(pl)) setCurrentPlan(pl);

        // valid_until
        const { data: acc } = await supabase
          .from("accounts")
          .select("valid_until")
          .order("created_at", { ascending: true })
          .limit(1);
        const vu = acc && acc.length ? acc[0].valid_until : null;
        setValidUntil(vu ? new Date(vu).toLocaleString() : null);
      } catch {
        /* noop */
      }
    })();
  }, [supabase]);

  async function choosePlan(slug: PlanSlug) {
    if (role !== "admin") return;
    setSaving(slug);
    try {
      const validDays = slug === "basic" ? null : 30;
      const { error } = await supabase.rpc("account_set_plan_self", {
        p_plan_slug: slug,
        p_valid_days: validDays,
        p_trial_days: null,
      });
      if (!error) {
        setCurrentPlan(slug);
        // refresh valid_until
        const { data: acc } = await supabase
          .from("accounts")
          .select("valid_until")
          .order("created_at", { ascending: true })
          .limit(1);
        const vu = acc && acc.length ? acc[0].valid_until : null;
        setValidUntil(vu ? new Date(vu).toLocaleString() : null);
      }
    } finally {
      setSaving(null);
    }
  }

  /** ───────────── Styles inline (desktop wide, 3 coloane) ───────────── */
  const styles = {
    page: {
      display: "grid",
      gap: 16,
      padding: "20px clamp(16px, 3vw, 28px)",
      fontFamily:
        "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    } as React.CSSProperties,
    headerRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    } as React.CSSProperties,
    pill: {
      background: green,
      color: "#0b1117",
      fontWeight: 900,
      borderRadius: 999,
      padding: "6px 12px",
    } as React.CSSProperties,
    muted: { color: "var(--muted)" } as React.CSSProperties,
    grid: {
      display: "grid",
      gap: 24,
      gridTemplateColumns: "repeat(3, minmax(320px, 1fr))",
      alignItems: "stretch",
    } as React.CSSProperties,
    card: (active: boolean) =>
      ({
        display: "grid",
        gridTemplateRows: "auto 1fr auto auto", // ⬅️ asigură alinierea imaginii + butonului
        gap: 16,
        background: "var(--panel)",
        border: `1px solid ${active ? green : "var(--border)"}`,
        borderRadius: 16,
        padding: 20,
        minHeight: 520, // carduri late, înalte, egale pe rând
      }) as React.CSSProperties,
    tier: {
      letterSpacing: 1.4,
      fontWeight: 900,
      fontSize: 13,
      color: "var(--muted)",
    } as React.CSSProperties,
    list: {
      margin: 0,
      paddingLeft: 20,
      display: "grid",
      gap: 10,
      color: "var(--text)",
      fontWeight: 700,
      lineHeight: 1.5,
    } as React.CSSProperties,
    imgWrap: {
      display: "grid",
      placeItems: "center",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 10,
      height: 88, // fix → toate PNG-urile au aceeași înălțime vizuală
      background: "var(--card)",
    } as React.CSSProperties,
    actions: {
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
      marginTop: 4,
    } as React.CSSProperties,
    btnPrimary: {
      padding: "10px 16px",
      borderRadius: 12,
      border: `1px solid ${green}`,
      background: green,
      color: "#0b1117",
      fontWeight: 900,
      cursor: "pointer",
    } as React.CSSProperties,
    btnDisabled: {
      opacity: 0.7,
      cursor: "not-allowed",
    } as React.CSSProperties,
    currentBadge: {
      border: `1px solid ${green}`,
      color: "var(--text)",
      background: "transparent",
      borderRadius: 12,
      padding: "10px 16px",
      fontWeight: 900,
    } as React.CSSProperties,

    /** Responsive doar când e nevoie (sub ~980px) */
    mediaSmall: `
      @media (max-width: 980px){
        .subs-grid{ grid-template-columns: 1fr; }
      }
    `,
  };

  return (
    <main style={styles.page}>
      {/* mic CSS pentru media-query */}
      <style>{styles.mediaSmall}</style>

      {/* Header simplu */}
      <div style={styles.headerRow}>
        <span style={styles.pill}>Current: {cap(currentPlan)}</span>
        <span style={styles.muted}>{validUntil ? `until ${validUntil}` : "—"}</span>
        {role !== "admin" && <span style={styles.muted}>(read-only)</span>}
      </div>

      {/* Grid lat, 3 coloane pe desktop */}
      <section className="subs-grid" style={styles.grid}>
        {PLANS.map((p) => {
          const isCurrent = p.slug === currentPlan;
          const isSaving = saving === p.slug;
          return (
            <article key={p.slug} style={styles.card(isCurrent)} aria-current={isCurrent}>
              <div style={styles.tier}>{p.name}</div>

              {/* Bullets */}
              <ul style={styles.list}>
                {p.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>

              {/* PNG preț — mic (≈3× mai mic față de varianta mare) */}
              <div style={styles.imgWrap}>
                <Image
                  src={p.image}
                  alt={`${p.name} price`}
                  width={150}   // ~3x mai mic decât 450-480 tipic
                  height={54}
                  priority={false}
                />
              </div>

              {/* Buton/Badge — aliniate identic pe toate cardurile */}
              <div style={styles.actions}>
                {isCurrent ? (
                  <span style={styles.currentBadge}>Current</span>
                ) : (
                  <button
                    onClick={() => choosePlan(p.slug)}
                    style={{
                      ...styles.btnPrimary,
                      ...(role !== "admin" || isSaving ? styles.btnDisabled : {}),
                    }}
                    disabled={role !== "admin" || isSaving}
                    title={role !== "admin" ? "Only admins can change plan" : `Choose ${cap(p.slug)}`}
                  >
                    {isSaving ? "Applying…" : `Choose ${cap(p.slug)}`}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}