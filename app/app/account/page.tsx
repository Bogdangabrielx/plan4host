"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "../_components/HeaderContext";

const LANG_MAP = ["en", "ro"] as const;
type Lang = (typeof LANG_MAP)[number];

const translations = {
  en: {
    pageTitle: "My Account",
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 21h16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.4"
    />
    <path
      d="M6 19l11-11 4 4-11 11h-4v-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.5 5.5l4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function AccountPage() {
  const { setTitle } = useHeader();
  const [lang, setLang] = useState<Lang>("en");
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [editingCompany, setEditingCompany] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

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
    setTitle(translations[lang].pageTitle);
  }, [lang, setTitle]);

  useEffect(() => {
    const sb = createClient();
    let mounted = true;
    (async () => {
      try {
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
        const fallback = profile?.email?.split("@")[0] || null;
        const finalName = candidate || fallback || translations[lang].unknown;
        setDisplayName(finalName);
        setEditedName(finalName);
      } catch {
        if (!mounted) return;
        setDisplayName(null);
        setEditedName("");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lang]);

  const statusLabel = translations[lang].activeAccount;
  const statusDetail = translations[lang].statusDetail;

  const initials = useMemo(() => {
    const source = displayName || user?.email || "MY";
    const cleaned = source.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
    return cleaned || "MY";
  }, [displayName, user]);

  const t = translations[lang];
  const finishNameEdit = () => {
    const normalized = (editedName.trim() || t.unknown);
    setDisplayName(normalized);
    setEditedName(normalized);
    setIsEditingName(false);
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
        borderRadius: 12,
        background: "var(--card)",
        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
        <span>{label}</span>
        {allowEdit && (
          <button
            type="button"
            aria-label={`Edit ${label}`}
            onClick={onEdit}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text)" }}
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
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontSize: "var(--fs-s)",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <div style={{ fontSize: "var(--fs-b)", fontWeight: 600, minHeight: 24 }}>
          {value || placeholder}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--panel)", color: "var(--text)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px 64px" }}>
        <div
          style={{
            borderRadius: 26,
            overflow: "hidden",
            background: "linear-gradient(135deg, #1c64f2, #4f46e5)",
            padding: "32px 32px 48px",
            color: "#fff",
            position: "relative",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 999,
              background: "#fcd34d",
              display: "grid",
              placeItems: "center",
              fontSize: 32,
              fontWeight: 700,
              color: "#111827",
              border: "4px solid #fff",
              position: "absolute",
              top: -50,
              left: 32,
            }}
          >
            {initials}
          </div>
          <div style={{ marginLeft: 140 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isEditingName ? (
                <input
                  value={editedName}
                  onChange={(e) => setEditedName(e.currentTarget.value)}
                  onBlur={finishNameEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      finishNameEdit();
                    }
                  }}
                  autoFocus
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    border: "none",
                    width: "100%",
                    background: "transparent",
                    color: "#fff",
                  }}
                />
              ) : (
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>{displayName || t.unknown}</h1>
              )}
              {!isEditingName && (
                <button
                  type="button"
                  aria-label="Edit name"
                  onClick={() => setIsEditingName(true)}
                  style={{
                    border: "none",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {pencilSvg}
                </button>
              )}
            </div>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.85)" }}>{t.propertyManager}</p>
          </div>
        </div>

        <section style={{ display: "grid", gap: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{t.accountInformation}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
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
            {renderField(
              t.phoneNumber,
              phone || null,
              t.phonePlaceholder,
              editingPhone,
              () => setEditingPhone(true),
              setPhone,
              () => setEditingPhone(false)
            )}
            {renderField(
              t.company,
              company || null,
              t.companyPlaceholder,
              editingCompany,
              () => setEditingCompany(true),
              setCompany,
              () => setEditingCompany(false)
            )}
            <div
              style={{
                padding: 18,
                borderRadius: 12,
                background: "var(--card)",
                boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
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
              <div style={{ fontSize: "var(--fs-b)", fontWeight: 600 }}>{memberSince}</div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 32, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{t.accountStatus}</div>
          <div
            style={{
              borderRadius: 14,
              padding: "18px 20px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              display: "grid",
              gap: 4,
              color: "#047857",
            }}
          >
            <span style={{ fontWeight: 700 }}>{statusLabel}</span>
            <span style={{ fontSize: "var(--fs-s)" }}>{statusDetail}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
