"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/app/app/ui/ThemeToggle";

type Theme = "light" | "dark";
type Mode = "login" | "signup";
type Lang = "en" | "ro";

export default function LoginClient({
  initialTheme = "light",
  initialLang = "en",
}: {
  initialTheme?: Theme;
  initialLang?: Lang;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState<string>("");
  const [pass, setPass] = useState<string>("");
  const [showPwd, setShowPwd] = useState<boolean>(false);
  const [status, setStatus] = useState<"Idle"|"Loading"|"Error">("Idle");
  const [err, setErr] = useState<string>("");
  const [failCount, setFailCount] = useState<number>(0);
  const [desiredPlan, setDesiredPlan] = useState<"basic"|"standard"|"premium"|null>(null);
  const [nextParam, setNextParam] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(initialLang);

  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [mounted, setMounted] = useState(false);
  // Reset password modal
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetCooldown, setResetCooldown] = useState<number>(0);
  const resetTimerRef = useRef<number | null>(null);
  const resetEndAtRef = useRef<number | null>(null);
  const [animateTheme, setAnimateTheme] = useState<boolean>(true);

  // ————— helpers null-safe —————
  const asStr = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asStr(s).trim());
  const safeDecode = (v: string | null) => {
    try { return v ? decodeURIComponent(v) : ""; } catch { return asStr(v); }
  };
  const safeJson = async (res: Response) => {
    try { return await res.json(); } catch { return {}; }
  };
  const tr = {
    en: {
      welcome: "Welcome to Plan4Host",
      signIn: "Sign in",
      createAccount: "Create account",
      signingIn: "Signing in...",
      creating: "Creating...",
      error: "Error",
      idle: "Idle",
      signInWithGoogle: "Sign in with Google",
      createWithGoogle: "Create account with Google",
      or: "or",
      email: "Email",
      password: "Password",
      choosePassword: "Choose a password",
      hidePassword: "Hide password",
      showPassword: "Show password",
      resetPassword: "Reset password",
      enterEmail: "Please enter your email.",
      enterValidEmail: "Please enter a valid email address.",
      enterPassword: "Please enter your password.",
      invalidCredentials: "Invalid credentials.",
      accountCreateFailed: "Could not create account.",
      networkError: "Network error. Please try again.",
      confirmationSent: "We sent a confirmation email from office@plan4host.com. Please confirm to continue.",
      forgotPassword: "Forgot your password?",
      noAccount: "Don't have an account?",
      createOne: "Create one",
      alreadyAccount: "Already have an account?",
      home: "Home",
      backToHomepage: "Back to homepage",
      resetTitle: "Reset password",
      resetSent: "We sent a reset link to your email. Please check your inbox.",
      resetSendFailed: "Failed to send reset email.",
      unexpectedError: "Unexpected error.",
      sending: "Sending...",
      resendIn: "Resend in",
      sendResetLink: "Send reset link",
      resetLegend: "You'll receive a secure link to set a new password. For security, setting the password requires verification via email.",
      placeholderEmail: "you@example.com",
      placeholderResetEmail: "name@example.com",
    },
    ro: {
      welcome: "Bine ai venit in Plan4Host",
      signIn: "Autentificare",
      createAccount: "Creeaza cont",
      signingIn: "Se autentifica...",
      creating: "Se creeaza...",
      error: "Eroare",
      idle: "Idle",
      signInWithGoogle: "Autentificare cu Google",
      createWithGoogle: "Creeaza cont cu Google",
      or: "sau",
      email: "Email",
      password: "Parola",
      choosePassword: "Alege o parola",
      hidePassword: "Ascunde parola",
      showPassword: "Arata parola",
      resetPassword: "Reseteaza parola",
      enterEmail: "Te rugam sa introduci emailul.",
      enterValidEmail: "Te rugam sa introduci o adresa de email valida.",
      enterPassword: "Te rugam sa introduci parola.",
      invalidCredentials: "Credentiale invalide.",
      accountCreateFailed: "Contul nu a putut fi creat.",
      networkError: "Eroare de retea. Incearca din nou.",
      confirmationSent: "Am trimis emailul de confirmare de la office@plan4host.com. Confirma pentru a continua.",
      forgotPassword: "Ai uitat parola?",
      noAccount: "Nu ai cont?",
      createOne: "Creeaza unul",
      alreadyAccount: "Ai deja cont?",
      home: "Acasa",
      backToHomepage: "Inapoi la pagina principala",
      resetTitle: "Reseteaza parola",
      resetSent: "Am trimis un link de resetare pe email. Verifica inboxul.",
      resetSendFailed: "Trimiterea emailului de resetare a esuat.",
      unexpectedError: "Eroare neasteptata.",
      sending: "Se trimite...",
      resendIn: "Retrimite in",
      sendResetLink: "Trimite link de resetare",
      resetLegend: "Vei primi un link securizat pentru setarea unei parole noi. Pentru siguranta, setarea parolei necesita verificare prin email.",
      placeholderEmail: "tu@example.com",
      placeholderResetEmail: "nume@example.com",
    },
  } as const;
  const t = tr[lang];

  useEffect(() => {
    setMounted(true);

    const fromHtml = (document.documentElement.getAttribute("data-theme") as Theme | null);
    const fromLS   = (typeof window !== "undefined" ? (localStorage.getItem("theme_v1") as Theme | null) : null);
    const current  = fromHtml ?? fromLS ?? initialTheme;

    document.documentElement.setAttribute("data-theme", current);
    setTheme(current);
    try {
      const savedLang = localStorage.getItem("app_lang");
      if (savedLang === "ro" || savedLang === "en") setLang(savedLang);
    } catch {}

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

  // One-shot animation for theme toggle on mount (zoom + auto theme flip)
  useEffect(() => {
    if (!animateTheme) return;
    const toggleMs = 1200;
    const endMs = 2400;
    const toggleId = window.setTimeout(() => {
      setTheme((prev) => {
        const next = prev === "light" ? "dark" : "light";
        try {
          document.documentElement.setAttribute("data-theme", next);
          document.cookie = `app_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
          window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
        } catch {}
        return next;
      });
    }, toggleMs);
    const endId = window.setTimeout(() => setAnimateTheme(false), endMs);
    return () => {
      window.clearTimeout(toggleId);
      window.clearTimeout(endId);
    };
  }, [animateTheme]);

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
    const hl = (u.searchParams.get("hl") || "").toLowerCase();
    if (hl === "ro" || hl === "en") setLang(hl);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("app_lang", lang);
      document.cookie = `app_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch {}
  }, [lang]);

  // —— Reset cooldown: persist + live countdown ——
  const RESET_LS_KEY = "p4h:reset:until";
  function clearResetTimer(){ if (resetTimerRef.current){ window.clearInterval(resetTimerRef.current); resetTimerRef.current = null; } }
  function startResetCountdown(seconds: number){
    const until = Date.now() + Math.max(0, seconds) * 1000;
    resetEndAtRef.current = until;
    try { localStorage.setItem(RESET_LS_KEY, String(until)); } catch {}
    clearResetTimer();
    const tick = () => {
      const leftMs = (resetEndAtRef.current ?? 0) - Date.now();
      const left = Math.max(0, Math.ceil(leftMs / 1000));
      setResetCooldown(left);
      if (left <= 0) {
        clearResetTimer();
        try { localStorage.removeItem(RESET_LS_KEY); } catch {}
      }
    };
    tick();
    resetTimerRef.current = window.setInterval(tick, 1000);
  }
  useEffect(() => {
    // Resume cooldown across navigation/refresh
    try {
      const raw = localStorage.getItem(RESET_LS_KEY);
      const until = raw ? parseInt(raw || "0", 10) : 0;
      if (until && until > Date.now()) {
        resetEndAtRef.current = until;
        startResetCountdown(Math.ceil((until - Date.now()) / 1000));
      } else {
        try { localStorage.removeItem(RESET_LS_KEY); } catch {}
      }
    } catch {}
    return () => clearResetTimer();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "Loading") return; // anti dublu-submit
    setErr("");

    // Validare client
    const emailTrim = asStr(email).trim();
    const passTrim  = asStr(pass);
    if (!emailTrim) {
      setErr(t.enterEmail);
      setStatus("Error");
      return;
    }
    if (!isEmail(emailTrim)) {
      setErr(t.enterValidEmail);
      setStatus("Error");
      return;
    }
    if (!passTrim) {
      setErr(t.enterPassword);
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
          alert(t.confirmationSent);
          // After confirming sign-up email notice, switch back to Sign in tab
          try {
            const u = new URL(window.location.href);
            // Normalize URL to reflect login tab
            u.searchParams.delete("signup");
            u.searchParams.delete("trial");
            u.searchParams.delete("tab");
            u.searchParams.delete("view");
            u.searchParams.set("mode", "login");
            window.history.replaceState({}, "", u.toString());
          } catch {}
          setMode("login");
          return;
        }

        // Prefer explicit 'next' (from URL), else header, else default
        const hdrNext = res.headers.get("x-redirect");
        const preferred =
          nextParam ||
          (desiredPlan ? `/app/subscription?plan=${desiredPlan}&hl=1` : null) ||
          (hdrNext && (/^\//.test(hdrNext) || /^https?:\/\//i.test(hdrNext)) ? hdrNext : null) ||
          "/app/calendar";
        location.assign(preferred);
        return;
      }

      // Eroare de aplicație (cu JSON sau fără)
      const j = await safeJson(res);
      const message =
        asStr((j as any)?.error) ||
        asStr((j as any)?.message) ||
        (mode === "login" ? t.invalidCredentials : t.accountCreateFailed);
      setErr(message);
      setStatus("Error");
      if (mode === "login") setFailCount((c) => Math.min(99, c + 1));
    } catch (ex: any) {
      // Eroare de rețea / CORS / timeouts
      setErr(asStr(ex?.message) || t.networkError);
      setStatus("Error");
      if (mode === "login") setFailCount((c) => Math.min(99, c + 1));
    }
  }

  async function requestReset() {
    setResetMsg("");
    const emailTrim = asStr(resetEmail || email).trim();
    if (!emailTrim) { setResetMsg(t.enterEmail); return; }
    if (!isEmail(emailTrim)) { setResetMsg(t.enterValidEmail); return; }
    setResetBusy(true);
    try {
      const res = await fetch('/api/auth/reset/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim })
      });
      if (!res.ok) {
        const j = await safeJson(res);
        const retry = (j?.retry_after ?? j?.retryAfter ?? j?.cooldown ?? 0) as number;
        if (retry && retry > 0) startResetCountdown(retry);
        setResetMsg(j?.error || t.resetSendFailed);
        return;
      }
      setResetMsg(t.resetSent);
      // 30s cooldown
      startResetCountdown(30);
    } catch (e:any) {
      setResetMsg(e?.message || t.unexpectedError);
    } finally { setResetBusy(false); }
  }

  // ✅ OAuth Google (folosește domeniul tău)
  function signInWithGoogle() {
    const APP_URL =
      (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_APP_URL) ||
      (typeof window !== "undefined" ? window.location.origin : "https://plan4host.com");
    const next = nextParam || (desiredPlan ? `/app/subscription?plan=${desiredPlan}&hl=1` : "/app/calendar");
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
    status === "Loading" ? (mode === "login" ? t.signingIn : t.creating)
    : status === "Error" ? t.error
    : t.idle;

  return (
    <>
      <div style={outerWrap}>
        <h1 style={heroTitle}>{t.welcome}</h1>
         
        <div  style={wrap(mounted ? theme : "dark")} >
          <div  style={headRow}>
            <h1  style={{ margin: 0, fontSize: 18 }}>{mode === "login" ? t.signIn : t.createAccount}</h1>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={pillStyle(pill)}>{pill}</span>
              <div style={langToggleWrap}>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  aria-label="Switch language to English"
                  title="English"
                  style={langBtn(lang === "en")}
                >
                  <img src="/eng.png" alt="English" width={16} height={16} style={{ display: "block", borderRadius: 999 }} />
                </button>
                <button
                  type="button"
                  onClick={() => setLang("ro")}
                  aria-label="Schimba limba in romana"
                  title="Romana"
                  style={langBtn(lang === "ro")}
                >
                  <img src="/ro.png" alt="Romana" width={16} height={16} style={{ display: "block", borderRadius: 999 }} />
                </button>
              </div>
              <div style={animateTheme ? { animation: "themeFloat 2.2s ease-in-out 1" } : undefined}>
                <ThemeToggle size="md" />
              </div>
            </div>
          </div>

        <div style={{ display: "grid", gap: 10 }}>
          <button onClick={signInWithGoogle} className="sb-cardglow" style={{ ...oauthBtn, gap: 10, padding: "12px 14px" }}>
            <img
              src={
                mounted
                  ? (theme === "light" ? "/Google light.png" : "/Google dark.png")
                  : "/Google dark.png"
              }
              alt="Google"
              width={24}
              height={24}
              style={{ display: "block" }}
            />
            <span style={{ fontSize: 16, fontWeight: 800 }}>
              {mode === "login" ? t.signInWithGoogle : t.createWithGoogle}
            </span>
          </button>

          <div style={dividerRow}>
            <span style={dividerLine} />
            <small style={{ color: "var(--muted)" }}>{t.or}</small>
            <span style={dividerLine} />
          </div>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={lbl}>{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e)=>setEmail(asStr(e.currentTarget.value))}
                placeholder={t.placeholderEmail}
                style={input}
                required
              />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={lbl}>{mode === "login" ? t.password : t.choosePassword}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={pass}
                  onChange={(e)=>setPass(asStr(e.currentTarget.value))}
                  placeholder="••••••••"
                  style={{ ...input, paddingRight: 42, width: '100%' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? t.hidePassword : t.showPassword}
                  title={showPwd ? t.hidePassword : t.showPassword}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: 0,
                    background: 'transparent',
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
                    width={14}
                    height={14}
                    style={{ display: 'block', opacity: .95 }}
                  />
                </button>
              </div>
              {mode === 'login' && (
                <div>
                  <a href="#" onClick={(e)=>{ e.preventDefault(); setResetOpen(true); setResetEmail(email); setResetMsg(''); }} style={{ color:'var(--primary)', fontSize:9,fontWeight: 600, textDecoration:'none' }}>
                    {t.resetPassword}
                  </a>
                </div>
              )}
            </div>

          {err && <div style={{ color: "var(--text)", fontSize: 13 }}>{err}</div>}

          <button
            type="submit"
            disabled={status==="Loading"}
            style={primaryBtn}
          >
            {mode === "login" ? t.signIn : t.createAccount}
          </button>

          {mode === "login" && failCount >= 3 && (
            <div style={{ marginTop: 8 }}>
              <small style={{ color: "var(--muted)" }}>
                <a
                  href="/auth/reset"
                  style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}
                >
                  {t.forgotPassword}
                </a>
              </small>
            </div>
          )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <small style={{ color: "var(--muted)" }}>
                {mode === "login" ? (
                  <>
                    {t.noAccount}{" "}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setMode("signup"); setErr(""); setFailCount(0); }}
                      style={{ color: "var(--primary)", fontWeight: 700, textDecoration: 'none' }}
                    >
                      {t.createOne}
                    </a>
                    .
                  </>
                ) : (
                  <>
                    {t.alreadyAccount}{" "}
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setMode("login"); setErr(""); setFailCount(0); }}
                      style={{ color: "var(--primary)", fontWeight: 700, textDecoration: 'none' }}
                    >
                      {t.signIn}
                    </a>
                    .
                  </>
                )}
              </small>
              <a href="/" className="sb-cardglow" style={{ color: 'var(--muted)', textDecoration: 'none', fontWeight: 600, fontSize: 11, borderRadius: 21, padding: "3px 5px"  }} title={t.backToHomepage}>
                {t.home}
              </a>
            </div>
          </form>
        </div>
      </div>
      {resetOpen && (
        <div role="dialog" aria-modal="true" onClick={()=>setResetOpen(false)}
          style={{ position:'fixed', inset:0, zIndex:130, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:'12px',
                   paddingTop:'calc(var(--safe-top) + 12px)', paddingBottom:'calc(var(--safe-bottom) + 12px)'}}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:'min(420px, 100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>{t.resetTitle}</strong>
              <button onClick={()=>setResetOpen(false)} style={{ border:0, background:'transparent', cursor:'pointer', color:'var(--muted)' }}>✕</button>
            </div>
            <div style={{ display:'grid', gap:10 }}>
              <label style={{ fontSize:12, color:'var(--muted)' }}>{t.email}</label>
              <input type="email" value={resetEmail} onChange={(e)=>setResetEmail(e.currentTarget.value)} placeholder={t.placeholderResetEmail} style={input} />
              {resetMsg && <div style={{ color:'var(--text)', fontSize: 13 }}>{resetMsg}</div>}
              <button onClick={requestReset} disabled={resetBusy || resetCooldown>0} style={primaryBtn}>
                {resetBusy ? t.sending : (resetCooldown>0 ? `${t.resendIn} ${resetCooldown}s` : t.sendResetLink)}
              </button>
              <small style={{ color:'var(--muted)' }}>
                {t.resetLegend}
              </small>
            </div>
          </div>
        </div>
      )}
      </div>
      <style jsx>{`
        @keyframes themeFloat {
          0% { transform: translate(0,0) scale(1); }
          30% { transform: translate(8px,-6px) scale(1.1); }
          60% { transform: translate(-6px,6px) scale(1.05); }
          100% { transform: translate(0,0) scale(1); }
        }
      `}</style>
    </>
  );
}

/* —— styles —— */
const outerWrap: React.CSSProperties = {
  width: 'min(380px, 100%)',
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
    width: 'min(380px, 100%)',
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 18,
    boxSizing: 'border-box',
    boxShadow: theme === "light" ? "0 2px 40px rgba(2, 6, 23, 0.23)" : "0 2px 20px rgba(113, 120, 152, 0.25)",
  };
}
const headRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: 'wrap', marginBottom: 10 };
const input: React.CSSProperties = { padding: "10px 12px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, width: '100%' };
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)" };
const primaryBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--primary)", color: "#0c111b", fontWeight: 800, cursor: "pointer" };
const oauthBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: 'wrap', textAlign: 'center' };
const dividerRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 };
const dividerLine: React.CSSProperties = { height: 1, background: "var(--border)", display: "block" };
const langToggleWrap: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: 4,
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--card)",
};
function langBtn(active: boolean): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 999,
    border: active ? "1px solid var(--primary)" : "1px solid transparent",
    background: active ? "color-mix(in srgb, var(--primary) 18%, var(--card))" : "transparent",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    padding: 0,
  };
}
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
