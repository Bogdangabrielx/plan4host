"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "@/app/app/ui/ThemeToggle";

type Theme = "light" | "dark";
type Mode = "login" | "signup";

export default function LoginClient({ initialTheme = "light" }: { initialTheme?: Theme }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState<string>("");
  const [pass, setPass] = useState<string>("");
  const [showPwd, setShowPwd] = useState<boolean>(false);
  const [status, setStatus] = useState<"Idle"|"Loading"|"Error">("Idle");
  const [err, setErr] = useState<string>("");
  const [failCount, setFailCount] = useState<number>(0);
  const [desiredPlan, setDesiredPlan] = useState<"basic"|"standard"|"premium"|null>(null);
  const [nextParam, setNextParam] = useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [mounted, setMounted] = useState(false);

  // ————— helpers null-safe —————
  const asStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asStr(s).trim());
  const safeDecode = (v: string | null) => {
    try { return v ? decodeURIComponent(v) : ""; } catch { return asStr(v); }
  };
  const safeJson = async (res: Response) => {
    try { return await res.json(); } catch { return {}; }
  };

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
    const e = safeDecode(u.searchParams.get("error"));
    if (e) { setErr(e); setStatus("Error"); }

    const raw = u.searchParams.get("mode") || u.searchParams.get("tab") || u.searchParams.get("view") || u.searchParams.get("signup") || u.searchParams.get("trial");
    const val = asStr(raw).toLowerCase();
    if (["signup", "create", "register", "1", "true", "yes"].includes(val)) {
      setMode("signup");
    }

    // Capture desired plan + next redirection target from URL
    const p = (u.searchParams.get("plan") || "").toLowerCase();
    if (p === "basic" || p === "standard" || p === "premium") setDesiredPlan(p as any);
    const nx = u.searchParams.get("next");
    if (nx && /^\//.test(nx)) setNextParam(nx);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "Loading") return; // anti dublu-submit
    setErr("");

    // Validare client
    const emailTrim = asStr(email).trim();
    const passTrim  = asStr(pass);
    if (!emailTrim) {
      setErr("Please enter your email.");
      setStatus("Error");
      return;
    }
    if (!isEmail(emailTrim)) {
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

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: emailTrim, password: passTrim }),
      });

      // Acceptă și 204 (No Content) ca succes
      if (res.ok) {
        const j = await safeJson(res);
        if (mode === "login") setFailCount(0);
        if (mode === "signup" && (j as any)?.requiresConfirmation) {
          setStatus("Idle");
          setErr("");
          alert("We sent a confirmation email from noreply@plan4host.com. Please confirm to continue.");
          return;
        }

        // Prefer explicit 'next' (from URL), else header, else default
        const hdrNext = res.headers.get("x-redirect");
        const preferred =
          nextParam ||
          (desiredPlan ? `/app/subscription?plan=${desiredPlan}&hl=1` : null) ||
          (hdrNext && (/^\//.test(hdrNext) || /^https?:\/\//i.test(hdrNext)) ? hdrNext : null) ||
          "/app";
        location.assign(preferred);
        return;
      }

      // Eroare de aplicație (cu JSON sau fără)
      const j = await safeJson(res);
      const message =
        asStr((j as any)?.error) ||
        asStr((j as any)?.message) ||
        (mode === "login" ? "Invalid credentials." : "Could not create account.");
      setErr(message);
      setStatus("Error");
      if (mode === "login") setFailCount((c) => Math.min(99, c + 1));
    } catch (ex: any) {
      // Eroare de rețea / CORS / timeouts
      setErr(asStr(ex?.message) || "Network error. Please try again.");
      setStatus("Error");
      if (mode === "login") setFailCount((c) => Math.min(99, c + 1));
    }
  }

  // ✅ OAuth Google (folosește domeniul tău)
  function signInWithGoogle() {
    const APP_URL =
      (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_APP_URL) ||
      (typeof window !== "undefined" ? window.location.origin : "https://plan4host.com");
    const next = nextParam || (desiredPlan ? `/app/subscription?plan=${desiredPlan}&hl=1` : "/app");
    try {
      const intent = mode === "login" ? "signin" : "signup";
      window.location.href = `${APP_URL}/auth/oauth/google?next=${encodeURIComponent(next)}&intent=${intent}`;
    } catch {
      // fallback sigur
      const intent = mode === "login" ? "signin" : "signup";
      const nx = encodeURIComponent(next);
      location.assign(`/auth/oauth/google?next=${nx}&intent=${intent}`);
    }
  }

  const pill =
    status === "Loading" ? (mode === "login" ? "Signing in…" : "Creating…")
    : status === "Error" ? "Error"
    : "Idle";

  return (
    <div style={outerWrap}>
      <h1 style={heroTitle}>Welcome to Plan4Host</h1>

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
            {mode === "login" ? "Sign in with Google" : "Create account with Google"}
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
                onChange={(e)=>setEmail(asStr(e.currentTarget.value))}
                placeholder="you@example.com"
                style={input}
                required
              />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={lbl}>{mode === "login" ? "Password" : "Choose a password"}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={pass}
                  onChange={(e)=>setPass(asStr(e.currentTarget.value))}
                  placeholder="••••••••"
                  style={{ ...input, paddingRight: 42 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  title={showPwd ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={mounted ? (theme === 'light' ? '/show_hide_pwd_forlight.png' : '/show_hide_pwd_fordark.png') : '/show_hide_pwd_fordark.png'}
                    alt=""
                    width={16}
                    height={16}
                    style={{ display: 'block', opacity: .95 }}
                  />
                </button>
              </div>
            </div>

          {err && <div style={{ color: "var(--text)", fontSize: 13 }}>{err}</div>}

          <button
            type="submit"
            disabled={status==="Loading"}
            style={primaryBtn}
          >
            {mode === "login" ? "Sign in" : "Create account"}
          </button>

          {mode === "login" && failCount >= 3 && (
            <div style={{ marginTop: 8 }}>
              <small style={{ color: "var(--muted)" }}>
                <a
                  href="/auth/reset"
                  style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}
                >
                  Forgot your password?
                </a>
              </small>
            </div>
          )}

            <small style={{ color: "var(--muted)" }}>
              {mode === "login" ? (
                <>
                  Don’t have an account?{" "}
                  <a
                    href="#"
                  onClick={(e) => { e.preventDefault(); setMode("signup"); setErr(""); setFailCount(0); }}
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
                  onClick={(e) => { e.preventDefault(); setMode("login"); setErr(""); setFailCount(0); }}
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
    </div>
  );
}

/* —— styles —— */
const outerWrap: React.CSSProperties = {
  width: 380,
  margin: "0 auto",
  display: "grid",
  gap: 12,
};
const heroTitle: React.CSSProperties = {
  margin: 0,
  textAlign: "center",
  fontSize: 24,
  fontWeight: 900,
  color: "var(--text)",
};

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
  const isIdle = /^idle$/i.test(pill);
  const bg = isError ? "#d4d7ddff" : isBusy ? "var(--primary)" : (isIdle ? "transparent" : "var(--card)");
  const col = isIdle ? "transparent" : (isError || isBusy ? "#0c111b" : "var(--muted)");
  return {
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: col,
    border: isIdle ? undefined : "1px solid var(--border)",
    fontWeight: 800,
    fontSize: 12,
  };
}
