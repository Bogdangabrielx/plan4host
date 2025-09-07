"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "@/app/app/ui/ThemeToggle";

type Theme = "light" | "dark";
type Mode = "login" | "signup";

export default function LoginClient({ initialTheme = "light" }: { initialTheme?: Theme }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState<"Idle"|"Loading"|"Error">("Idle");
  const [err, setErr] = useState<string>("");

  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const fromHtml = (document.documentElement.getAttribute("data-theme") as Theme | null);
    const fromLS   = (typeof window !== "undefined" ? (localStorage.getItem("theme_v1") as Theme | null) : null);
    const current  = fromHtml ?? fromLS ?? initialTheme;

    document.documentElement.setAttribute("data-theme", current);
    setTheme(current);

    function onThemeChange(e: Event) {
      const detail = (e as CustomEvent).detail as { theme?: Theme } | undefined;
      if (detail?.theme) {
        setTheme(detail.theme);
        try { document.cookie = `app_theme=${detail.theme}; path=/; max-age=${60*60*24*365}`; } catch {}
      }
    }
    window.addEventListener("themechange" as any, onThemeChange);
    return () => window.removeEventListener("themechange" as any, onThemeChange);
  }, [initialTheme]);

  useEffect(() => {
    const u = new URL(window.location.href);
    const e = u.searchParams.get("error");
    if (e) { setErr(decodeURIComponent(e)); setStatus("Error"); }

    const raw = u.searchParams.get("mode") || u.searchParams.get("tab") || u.searchParams.get("view") || u.searchParams.get("signup") || u.searchParams.get("trial");
    const val = (raw || "").toLowerCase();
    if (["signup", "create", "register", "1", "true", "yes"].includes(val)) {
      setMode("signup");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    // Basic client-side validation (after click)
    const emailTrim = email.trim();
    const passTrim = pass;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrim) {
      setErr("Please enter your email.");
      setStatus("Error");
      return;
    }
    if (!emailRegex.test(emailTrim)) {
      setErr("Please enter a valid email address.");
      setStatus("Error");
      return;
    }
    if (!passTrim) {
      setErr("Please enter your password.");
      setStatus("Error");
      return;
    }

    setStatus("Loading");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    if (res.ok) {
      // For signup, handle confirmation-required
      const j = await res.json().catch(() => ({} as any));
      if (mode === "signup" && j?.requiresConfirmation) {
        setStatus("Idle");
        setErr("");
        alert("We sent a confirmation email from noreply@plan4host.com. Please confirm to continue.");
        return;
      }
      // Login or auto-signed signup: go to app
      location.href = "/app";
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error || (mode === "login" ? "Invalid credentials." : "Could not create account."));
      setStatus("Error");
    }
  }

  // ✅ Folosește domeniul tău, nu relativ
  function signInWithGoogle() {
    const APP_URL =
      (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL) ||
      (typeof window !== "undefined" ? window.location.origin : "https://plan4host.com");
    const next = "/app";
    window.location.href = `${APP_URL}/auth/oauth/google?next=${encodeURIComponent(next)}`;
  }

  const pill =
    status === "Loading" ? (mode === "login" ? "Signing in…" : "Creating…")
    : status === "Error" ? "Error"
    : "Idle";

  return (
    <div style={wrap(mounted ? theme : "dark")}>
      <div style={headRow}>
        <h1 style={{ margin: 0, fontSize: 18 }}>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={pillStyle(pill)}>{pill}</span>
          <ThemeToggle size="md" />
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <button onClick={signInWithGoogle} style={oauthBtn}>
          <img
            src={
              mounted
                ? (theme === "light" ? "/Google light.png" : "/Google dark.png")
                : "/Google dark.png"
            }
            alt="Google"
            width={20}
            height={20}
            style={{ display: "block" }}
          />
          Continue with Google
        </button>

        <div style={dividerRow}>
          <span style={dividerLine} />
          <small style={{ color: "var(--muted)" }}>or</small>
          <span style={dividerLine} />
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={lbl}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.currentTarget.value)}
              placeholder="you@example.com"
              style={input}
              required
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={lbl}>{mode === "login" ? "Password" : "Choose a password"}</label>
            <input
              type="password"
              value={pass}
              onChange={(e)=>setPass(e.currentTarget.value)}
              placeholder="••••••••"
              style={input}
              required
            />
          </div>

          {err && <div style={{ color: "var(--text)", fontSize: 13 }}>{err}</div>}

          <button
            type="submit"
            disabled={status==="Loading"}
            style={primaryBtn}
          >
            {mode === "login" ? "Sign in" : "Create account"}
          </button>

          <small style={{ color: "var(--muted)" }}>
            {mode === "login" ? (
              <>
                Don’t have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setMode("signup"); setErr(""); }}
                  style={{ color: "var(--primary)", fontWeight: 700 }}
                >
                  Create one
                </a>
                .
              </>
            ) : (
              <>
                Already have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setMode("login"); setErr(""); }}
                  style={{ color: "var(--primary)", fontWeight: 700 }}
                >
                  Sign in
                </a>
                .
              </>
            )}
          </small>
        </form>
      </div>
    </div>
  );
}

/* styles identice cu ce ai deja */
function wrap(theme: Theme): React.CSSProperties {
  return {
    width: 380,
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 18,
    boxShadow: theme === "light" ? "0 2px 40px rgba(2, 6, 23, 0.23)" : "0 2px 20px rgba(113, 120, 152, 0.25)",
  };
}
const headRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 };
const input: React.CSSProperties = { padding: "10px 12px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8 };
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)" };
const primaryBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--primary)", color: "#0c111b", fontWeight: 800, cursor: "pointer" };
const oauthBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 };
const dividerRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 };
const dividerLine: React.CSSProperties = { height: 1, background: "var(--border)", display: "block" };
function pillStyle(pill: string): React.CSSProperties {
  const isError = /error/i.test(pill);
  const isBusy = /(sign|load|creat)/i.test(pill);
  const bg = isError ? "#d4d7ddff" : isBusy ? "var(--primary)" : "var(--card)";
  const col = isError || isBusy ? "#0c111b" : "var(--muted)";
  return { padding: "4px 10px", borderRadius: 999, background: bg, color: col, border: "1px solid var(--border)", fontWeight: 800, fontSize: 12 };
}
