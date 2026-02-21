"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "../_components/AppShell";
import { useHeader } from "../_components/HeaderContext";

const LANG_MAP = ["en", "ro"] as const;
type Lang = (typeof LANG_MAP)[number];

const translations = {
  en: {
    pageTitle: "My Account",
    saving: "Saving…",
    saved: "Saved",
    saveError: "Save failed",
    propertyManager: "Property Manager",
    accountInformation: "Account Information",
    emailAddress: "Email Address",
    phoneNumber: "Phone Number",
    company: "Company",
    memberSince: "Member Since",
    accountStatus: "Account Status",
    activeAccount: "Active Account",
    statusDetail: "Your account is in good standing",
    nameLabel: "Name",
    companyPlaceholder: "Add company",
    phonePlaceholder: "Add phone number",
    unknown: "Unknown",
  },
  ro: {
    pageTitle: "Contul meu",
    saving: "Se salvează…",
    saved: "Salvat",
    saveError: "Eroare la salvare",
    propertyManager: "Manager Proprietate",
    accountInformation: "Informații cont",
    emailAddress: "Adresă de email",
    phoneNumber: "Număr de telefon",
    company: "Companie",
    memberSince: "Membru din",
    accountStatus: "Starea contului",
    activeAccount: "Cont activ",
    statusDetail: "Contul tău este în regulă",
    nameLabel: "Nume",
    companyPlaceholder: "Adaugă companie",
    phonePlaceholder: "Adaugă număr de telefon",
    unknown: "Necunoscut",
  },
} as const;

const pencilSvg = (
  <span
    aria-hidden
    style={{
      display: "block",
      width: 16,
      height: 16,
      backgroundColor: "currentColor",
      WebkitMaskImage: "url(/svg_edit_icon.svg)",
      maskImage: "url(/svg_edit_icon.svg)",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "16px 16px",
      maskSize: "16px 16px",
    }}
  />
);

type Labels = (typeof translations)[Lang];

function PillBridge({
  state,
  t,
}: {
  state: "idle" | "saving" | "saved" | "error";
  t: Labels;
}) {
  const { setPill } = useHeader();
  useEffect(() => {
    if (state === "saving") setPill(<span>{t.saving}</span>);
    else if (state === "saved") setPill(<span data-p4h-overlay="message">{t.saved}</span>);
    else if (state === "error") setPill(<span data-p4h-overlay="message">{t.saveError}</span>);
    else setPill(null);
    return () => setPill(null);
  }, [state, setPill, t]);
  return null;
}

export default function AccountPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [editingCompany, setEditingCompany] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Ascunde scrollbar-ul pe ecrane mari doar pe această pagină (desktop)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const main = document.getElementById("app-main");
    if (main) main.setAttribute("data-account-nosb", "1");
    return () => {
      if (main) main.removeAttribute("data-account-nosb");
    };
  }, []);

  const updateAccount = async (payload: {
    name?: string;
    company?: string | null;
    phone?: string | null;
  }) => {
    if (!Object.keys(payload).length) return;
    setSaving("saving");
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        const reason = (msg && (msg.error || msg.details)) || `Status ${res.status}`;
        throw new Error(reason as string);
      }
      setSaving("saved");
      setTimeout(() => setSaving((s) => (s === "saved" ? "idle" : s)), 1400);
    } catch (error) {
      console.error("Failed saving account info", error);
      setSaving("error");
      setTimeout(() => setSaving("idle"), 1800);
    }
  };

  useEffect(() => {
    const detect = () => {
      if (typeof window === "undefined") return;
      const fromLs = localStorage.getItem("app_lang");
      if ((fromLs === "en" || fromLs === "ro") && fromLs !== lang) {
        setLang(fromLs as Lang);
      } else if (!fromLs) {
        try {
          const ck = document.cookie
            .split("; ")
            .find((c) => c.startsWith("app_lang="))
            ?.split("=")[1];
          if (ck === "en" || ck === "ro") setLang(ck);
        } catch {}
      }
    };
    detect();
    window.addEventListener("storage", detect);
    return () => window.removeEventListener("storage", detect);
  }, [lang]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sb = createClient();
        const { data } = await sb.auth.getUser();
        if (!mounted) return;
        const profile = data.user;
        setUser(profile);
        const metadata = profile?.user_metadata || {};
        const candidate =
          metadata.full_name ||
          metadata.display_name ||
          metadata.name ||
          metadata.given_name ||
          metadata.preferred_username ||
          null;
        const avatar =
          metadata?.avatar_url ||
          metadata?.picture ||
          metadata?.provider_avatar ||
          null;
        setAvatarUrl(avatar || null);
        const fallback = profile?.email?.split("@")[0] || null;
        const finalName = candidate || fallback || translations[lang].unknown;
        setDisplayName(finalName);
        setEditedName(finalName);
      } catch (err) {
        if (!mounted) return;
        console.error("Nu am putut încărca profilul utilizatorului", err);
        setUser(null);
        setDisplayName(null);
        setEditedName("");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lang]);

  // Încarcă număr de telefon/companie din profilul de facturare (dacă există)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account", { cache: "no-store" });
        if (!res.ok || cancelled) {
          console.error("GET /api/account failed", res.status);
          return;
        }
        const j = await res.json();
        if (cancelled) return;
        if (typeof j.phone === "string") setPhone(j.phone);
        if (typeof j.company === "string") setCompany(j.company);
        if (!displayName && typeof j.name === "string" && j.name.trim()) {
          setDisplayName(j.name);
          setEditedName(j.name);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Nu am putut încărca datele de profil", err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [displayName]);

  const statusLabel = translations[lang].activeAccount;
  const statusDetail = translations[lang].statusDetail;

  const initials = useMemo(() => {
    const source = displayName || user?.email || "MY";
    const cleaned = source.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
    return cleaned || "MY";
  }, [displayName, user]);

  const t = translations[lang];
  const finishNameEdit = async () => {
    const normalized = editedName.trim() || t.unknown;
    setDisplayName(normalized);
    setEditedName(normalized);
    setIsEditingName(false);
    await updateAccount({ name: normalized === t.unknown ? "" : normalized });
  };
  const saveCompany = async () => {
    setEditingCompany(false);
    await updateAccount({ company: company.trim() || null });
  };
  const savePhone = async () => {
    setEditingPhone(false);
    await updateAccount({ phone: phone.trim() || null });
  };
  const memberSince = useMemo(() => {
    if (!user?.created_at) return t.unknown;
    const date = new Date(user.created_at);
    return date.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [user, lang, t.unknown]);

  const renderField = (
    label: string,
    value: string | null,
    placeholder: string,
    editing: boolean,
    onEdit: () => void,
    onChange: (value: string) => void,
    onBlur: () => void,
    allowEdit = true
  ) => (
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        background: "linear-gradient(180deg, color-mix(in srgb, var(--card) 92%, transparent) 0%, var(--card) 100%)",
        border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
        boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
        display: "grid",
        gap: 8,
        transition: "transform .12s ease, box-shadow .16s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.08, color: "var(--muted)" }}>
        <span>{label}</span>
        {allowEdit && (
          <button
            type="button"
            aria-label={`Edit ${label}`}
            onClick={onEdit}
            style={{
              border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
              background: "color-mix(in srgb, var(--card) 90%, transparent)",
              cursor: "pointer",
              color: "var(--text)",
              borderRadius: 10,
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              transition: "background .12s ease, transform .1s ease",
            }}
            onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {pencilSvg}
          </button>
        )}
      </div>
      {editing ? (
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.currentTarget.value)}
          onBlur={onBlur}
          autoFocus
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
            fontSize: "var(--fs-s)",
            fontFamily: "inherit",
            background: "var(--panel)",
            color: "var(--text)",
            caretColor: "var(--text)",
            outline: "none",
          }}
        />
      ) : (
        <div style={{ fontSize: "var(--fs-b)", fontWeight: 600, minHeight: 24, color: value ? "var(--text)" : "var(--muted)" }}>
          {value || placeholder}
        </div>
      )}
    </div>
  );

  return (
    <AppShell currentPath="/app/account" title={t.pageTitle}>
      <PillBridge state={saving} t={t} />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (min-width: 1024px) {
              #app-main[data-account-nosb="1"]{
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
              #app-main[data-account-nosb="1"]::-webkit-scrollbar{
                display: none;
              }
            }
          `,
        }}
      />
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at 20% 20%, rgba(79,70,229,0.12), transparent 22%), radial-gradient(circle at 80% 0%, rgba(14,165,233,0.12), transparent 20%), var(--panel)",
      color: "var(--text)",
    }}
  >
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 16px 72px" }}>
          <div
            style={{
              borderRadius: 28,
              overflow: "visible",
              background: "var(--panel)",
              padding: "28px 28px 40px",
              color: "#fff",
              position: "relative",
              marginBottom: 28,
              boxShadow: "0 20px 36px rgba(0,0,0,0.26)",
              border: "1px solid color-mix(in srgb, var(--border) 90%, transparent)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(79,70,229,0.16), transparent 32%), radial-gradient(circle at 80% 0%, rgba(14,165,233,0.12), transparent 28%)",
                opacity: 0.5,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 999,
                background: avatarUrl ? "var(--card)" : "linear-gradient(135deg, #25d366, #128c7e)",
                display: "grid",
                placeItems: "center",
                fontSize: 34,
                fontWeight: 800,
                color: avatarUrl ? "#111827" : "#ffffff",
                border: "2.5px solid #fff",
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                left: 28,
                boxShadow: "0 16px 36px rgba(0,0,0,0.22)",
                overflow: "hidden",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                initials
              )}
            </div>
            <div style={{ marginLeft: 150, position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {isEditingName ? (
                  <input
                    value={editedName}
                    onChange={(e) => setEditedName(e.currentTarget.value)}
                    onBlur={finishNameEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") finishNameEdit();
                    }}
                    autoFocus
                    style={{
                      fontSize: 30,
                      fontWeight: 800,
                      border: "none",
                      width: "100%",
                      maxWidth: 420,
                      background: "rgba(255,255,255,0.14)",
                      color: "#fff",
                      padding: "6px 10px",
                      borderRadius: 10,
                    }}
                  />
                ) : (
                  <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -0.3 }}>{displayName || t.unknown}</h1>
                )}
                {!isEditingName && (
                  <button
                    type="button"
                    aria-label="Edit name"
                    onClick={() => setIsEditingName(true)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.18)",
                      borderRadius: 10,
                      width: 38,
                      height: 38,
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      cursor: "pointer",
                      transition: "transform .12s ease, background .12s ease",
                    }}
                    onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
                    onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    {pencilSvg}
                  </button>
                )}
              </div>
              <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.88)", fontSize: 16 }}>{t.propertyManager}</p>
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.18)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  {statusLabel}
                </span>
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: 12,
                    letterSpacing: 0.4,
                  }}
                >
                  {statusDetail}
                </span>
              </div>
            </div>
          </div>

          <section style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{t.accountInformation}</div>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{memberSince !== t.unknown ? `${t.memberSince}: ${memberSince}` : t.memberSince}</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}
            >
              {renderField(
                t.emailAddress,
                user?.email ?? translations[lang].unknown,
                "example@domain.com",
                false,
                () => {},
                () => {},
                () => {},
                false
              )}
              {renderField(t.phoneNumber, phone || null, t.phonePlaceholder, editingPhone, () => setEditingPhone(true), setPhone, savePhone)}
              {renderField(t.company, company || null, t.companyPlaceholder, editingCompany, () => setEditingCompany(true), setCompany, saveCompany)}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: "linear-gradient(180deg, color-mix(in srgb, var(--card) 92%, transparent) 0%, var(--card) 100%)",
                  border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{t.memberSince}</span>
                </div>
                <div style={{ fontSize: "var(--fs-b)", fontWeight: 700 }}>{memberSince}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
