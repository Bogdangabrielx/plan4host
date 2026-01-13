"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHeader } from "@/app/app/_components/HeaderContext";
import PlanHeaderBadge from "@/app/app/_components/PlanHeaderBadge";
import { usePersistentPropertyState } from "@/app/app/_components/PropertySelection";
import LoadingPill from "@/app/app/_components/LoadingPill";
import overlayStyles from "@/app/app/_components/AppLoadingOverlay.module.css";
import { DIAL_OPTIONS } from "@/lib/phone/dialOptions";
import { buildSimplePdfBytes } from "@/lib/pdf/simplePdf";

type Property = {
  id: string;
  name: string;
  regulation_pdf_url?: string | null;
  regulation_pdf_uploaded_at?: string | null;
  ai_house_rules_text?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  presentation_image_url?: string | null;
  presentation_image_uploaded_at?: string | null;
  contact_overlay_position?: 'top'|'center'|'down' | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_tiktok?: string | null;
  social_website?: string | null;
  social_location?: string | null;
};

type ProviderItem = { slug: string; label: string; logo?: string | null };
type SocialKey = "facebook" | "instagram" | "tiktok" | "website" | "location";

const CONTACTS_SOCIAL_KEYS: SocialKey[] = ["facebook", "instagram", "tiktok", "website", "location"];

type HouseRulesDraft = {
  noSmoking: boolean;
  noParties: boolean;
  quietHours: boolean;
  quietHoursAfter: string;
  petsAllowed: boolean;
  maxGuestsEnabled: boolean;
  maxGuests: string;
  otherNotes: string;
};

const card: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};
const FIELD: React.CSSProperties = {
  width: "100%",
  padding: 10,
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontFamily: "inherit",
};

const PRIMARY_ACTION_CLASS = "sb-btn sb-btn--primary sb-cardglow";
const PRIMARY_ACTION_STYLE: React.CSSProperties = {
  color: "var(--text)",
  borderColor: "var(--primary)",
};

const AI_ACTION_STYLE: React.CSSProperties = {
  border: "1px solid transparent",
  background:
    "linear-gradient(135deg, #00d1ff, #7c3aed) padding-box, linear-gradient(135deg, rgba(0,209,255,0.65), rgba(124,58,237,0.65)) border-box",
  backgroundClip: "padding-box, border-box",
  color: "#0c111b",
  fontWeight: 700,
};

function Info({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: Event) {
      const t = e.target as Node | null;
      if (ref.current && t && !ref.current.contains(t)) setOpen(false);
    }
    function onKey(ev: KeyboardEvent) { if (ev.key === 'Escape') setOpen(false); }
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  return (
    <span ref={ref} style={{ display:'inline-block', width: '100%' }}>
      <button
        type="button"
        aria-label="Info"
        aria-expanded={open ? true : undefined}
        onClick={()=>setOpen(v=>!v)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: 999,
          border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)',
          fontSize: 12, fontWeight: 800, cursor: 'pointer', userSelect: 'none',
          padding: 0, lineHeight: 1
        }}
      >
        i
      </button>
      {open && (
        <div className="sb-card" style={{
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          color: 'var(--text)',
          borderRadius: 10,
          padding: 10,
          marginTop: 8,
        }}>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)' }}>{text}</div>
        </div>
      )}
    </span>
  );
}

const IMAGE_INFO = "Recommended: 3:1 banner, min 1200×400 (ideal 1800×600), JPG/WebP, under ~500 KB. Keep the subject centered; image is cropped (cover).";
const PDF_INFO = "PDF (House Rules), preferably under 5 MB. A4 portrait recommended; keep text readable.";

function flagEmoji(cc: string | null | undefined): string {
  if (!cc) return "";
  const up = cc.toUpperCase();
  if (up.length !== 2) return "";
  const A = 0x1f1e6;
  const code1 = up.charCodeAt(0) - 65 + A;
  const code2 = up.charCodeAt(1) - 65 + A;
  return String.fromCodePoint(code1, code2);
}

function splitPhoneToDialAndRest(full: string): { dial: string; rest: string } {
  const raw = (full || "").trim();
  const digitsPlus = raw.replace(/[^\d+]/g, "");
  if (!digitsPlus.startsWith("+")) {
    return { dial: "+40", rest: raw.replace(/\D/g, "") };
  }
  const codes = Array.from(new Set(DIAL_OPTIONS.map((d) => d.code))).sort(
    (a, b) => b.length - a.length,
  );
  const match = codes.find((c) => digitsPlus.startsWith(c)) || "+40";
  const rest = digitsPlus.startsWith(match)
    ? digitsPlus.slice(match.length).replace(/\D/g, "")
    : digitsPlus.replace(/\D/g, "");
  return { dial: match, rest };
}

export default function CheckinEditorClient({ initialProperties }: { initialProperties: Array<{ id: string; name: string }> }) {
  const supabase = useMemo(() => createClient(), []);
  const { setTitle, setPill } = useHeader();

  const [properties] = useState(initialProperties);
  const { propertyId, setPropertyId, ready: propertyReady } = usePersistentPropertyState(properties);

  const [status, setStatus] = useState<"Idle" | "Saving…" | "Synced" | "Error">("Idle");
  const [loading, setLoading] = useState(false);
  const loadSeqRef = useRef(0);
  useEffect(() => { setTitle("Check-in Editor"); }, [setTitle]);
  useEffect(() => {
    setPill(
      status === "Saving…" ? "Saving…" :
      !propertyReady       ? "Loading…" :
      loading              ? "Loading…" :
      status === "Synced"  ? "Synced"  :
      status === "Error"   ? "Error"   : "Idle"
    );
  }, [status, loading, propertyReady, setPill]);

  const [prop, setProp] = useState<Property | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSrc, setShowSrc] = useState(false);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  // House Rules gating
  const [noPdfOpen, setNoPdfOpen] = useState(false);
  const [highlightUpload, setHighlightUpload] = useState(false);
  const uploadBtnRef = useRef<HTMLButtonElement | null>(null);
  // Presentation image prompt
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imagePromptDismissed, setImagePromptDismissed] = useState(false);
  const imageUploadBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastSavedContact = useRef<{ email: string; phone: string; address: string }>({ email: "", phone: "", address: "" });
  // Onboarding highlight target (contacts / picture / house_rules)
  const [highlightTarget, setHighlightTarget] = useState<"contacts" | "picture" | "house_rules" | null>(null);
  const [showCalendarConnectedBanner, setShowCalendarConnectedBanner] = useState<boolean>(false);
  const [contactsWizardRequested, setContactsWizardRequested] = useState<boolean>(false);
  const [contactsWizardOpen, setContactsWizardOpen] = useState<boolean>(false);
  const [contactsWizardStep, setContactsWizardStep] = useState<"contacts" | "social" | "reward">("contacts");
  const [contactsWizardLoading, setContactsWizardLoading] = useState<boolean>(false);
  const [contactsWizardLoadingText, setContactsWizardLoadingText] = useState<string>("Saving contact details…");
  const [contactsWizardError, setContactsWizardError] = useState<string | null>(null);
  const [contactsWizardSocialDrafts, setContactsWizardSocialDrafts] = useState<Record<SocialKey, string>>({
    facebook: "",
    instagram: "",
    tiktok: "",
    website: "",
    location: "",
  });
  const [contactsWizardSocialInput, setContactsWizardSocialInput] = useState<string>("");
  const [contactsWizardSocialIndex, setContactsWizardSocialIndex] = useState<number>(0);
  const [contactsWizardDial, setContactsWizardDial] = useState<string>("+40");
  const [contactsWizardPhoneLocal, setContactsWizardPhoneLocal] = useState<string>("");
  const [contactsWizardDialOpen, setContactsWizardDialOpen] = useState<boolean>(false);
  const contactsWizardDialWrapRef = useRef<HTMLDivElement | null>(null);
  const houseRulesSectionRef = useRef<HTMLElement | null>(null);
  const [houseRulesWizardRequested, setHouseRulesWizardRequested] = useState<boolean>(false);
  const [houseRulesWizardOpen, setHouseRulesWizardOpen] = useState<boolean>(false);
  const [houseRulesWizardStep, setHouseRulesWizardStep] = useState<
    "intro" | "choose" | "create" | "uploaded" | "reward"
  >("intro");
  const [houseRulesWizardLoading, setHouseRulesWizardLoading] = useState<boolean>(false);
  const [houseRulesWizardLoadingText, setHouseRulesWizardLoadingText] = useState<string>("Preparing your house rules…");
  const [houseRulesWizardError, setHouseRulesWizardError] = useState<string | null>(null);
  const [houseRulesWizardPreviewUrl, setHouseRulesWizardPreviewUrl] = useState<string | null>(null);
  const [houseRulesDraft, setHouseRulesDraft] = useState<HouseRulesDraft>({
    noSmoking: true,
    noParties: true,
    quietHours: false,
    quietHoursAfter: "22:00",
    petsAllowed: false,
    maxGuestsEnabled: false,
    maxGuests: "2",
    otherNotes: "",
  });
  const [houseRulesDraftBusy, setHouseRulesDraftBusy] = useState<boolean>(false);
  const [houseRulesPrintPulse, setHouseRulesPrintPulse] = useState<number>(0);
  const [houseRulesPendingKey, setHouseRulesPendingKey] = useState<
    "noSmoking" | "noParties" | "quietHours" | "petsAllowed" | "maxGuestsEnabled" | null
  >(null);
  const houseRulesDraftBusyTimer = useRef<number | null>(null);
  const [wizardIsDark, setWizardIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  });

  // AI assistant – house rules text source
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [aiModalText, setAiModalText] = useState<string>("");
  const [aiModalError, setAiModalError] = useState<string | null>(null);
  const [aiStatusPopupOpen, setAiStatusPopupOpen] = useState(false);
  const [aiStatusPhase, setAiStatusPhase] = useState<"idle" | "reading" | "success" | "failed">("idle");
  const [currentPlan, setCurrentPlan] = useState<"basic" | "standard" | "premium" | null>(null);
  const [aiPremiumPopupOpen, setAiPremiumPopupOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await supabase.rpc("account_current_plan");
        const p = (r.data as string | null)?.toLowerCase?.() as "basic" | "standard" | "premium" | null;
        if (mounted) setCurrentPlan((p ?? "basic") as any);
      } catch {
        if (mounted) setCurrentPlan("basic");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Track theme for onboarding icons (light/dark)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const detect = () => {
      const attr = root.getAttribute("data-theme");
      if (attr === "dark") { setWizardIsDark(true); return; }
      if (attr === "light") { setWizardIsDark(false); return; }
      setWizardIsDark(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false);
    };
    detect();
    const mo = new MutationObserver(detect);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMq = () => detect();
    try { mq?.addEventListener("change", onMq); } catch { mq?.addListener?.(onMq as any); }
    return () => {
      try { mq?.removeEventListener("change", onMq); } catch { mq?.removeListener?.(onMq as any); }
      mo.disconnect();
    };
  }, []);

  // Prevent background "click-away autosaves" while any wizard modal is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const open = contactsWizardOpen || houseRulesWizardOpen;
    if (open) {
      document.documentElement.setAttribute("data-p4h-modal-open", "1");
    } else {
      document.documentElement.removeAttribute("data-p4h-modal-open");
    }
  }, [contactsWizardOpen, houseRulesWizardOpen]);

  // Close wizard dial dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node | null;
      if (contactsWizardDialWrapRef.current && t && !contactsWizardDialWrapRef.current.contains(t)) {
        setContactsWizardDialOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Responsive helper: treat phones/narrow screens differently for layout
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 560px)')?.matches ?? false;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(max-width: 560px)');
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    try { mq?.addEventListener('change', onChange); } catch { mq?.addListener?.(onChange as any); }
    setIsNarrow(mq?.matches ?? false);
    return () => {
      try { mq?.removeEventListener('change', onChange); } catch { mq?.removeListener?.(onChange as any); }
    };
  }, []);
  // Reset prompt dismissal when property changes
  useEffect(() => { setImagePromptDismissed(false); }, [propertyId]);
  // Show prompt on entry if placeholder image is used
  useEffect(() => {
    const isPlaceholder = !!prop?.presentation_image_url && prop.presentation_image_url.includes('/hotel_room_1456x816.jpg');
    if (isPlaceholder && !imagePromptDismissed) setShowImagePrompt(true);
  }, [prop?.presentation_image_url, imagePromptDismissed]);

  async function refresh() {
    if (!propertyId) { setProp(null); return; }
    const seq = (loadSeqRef.current += 1);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id,name,regulation_pdf_url,regulation_pdf_uploaded_at,ai_house_rules_text,contact_email,contact_phone,contact_address,presentation_image_url,presentation_image_uploaded_at,contact_overlay_position,social_facebook,social_instagram,social_tiktok,social_website,social_location")
        .eq("id", propertyId)
        .maybeSingle();
      if (seq !== loadSeqRef.current) return;
      if (error) { setProp(null); lastSavedContact.current = { email: "", phone: "", address: "" }; }
      else {
        setProp((data ?? null) as Property | null);
        lastSavedContact.current = {
          email: (data?.contact_email ?? "") as string,
          phone: (data?.contact_phone ?? "") as string,
          address: (data?.contact_address ?? "") as string,
        };
      }
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }

  useEffect(() => { if (propertyReady) refresh(); }, [propertyId, supabase, propertyReady]);

  // Onboarding banner (arrive after calendar onboarding)
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const flag = (u.searchParams.get("calendar") || "").toLowerCase();
      if (flag === "1" || flag === "true") {
        setShowCalendarConnectedBanner(true);
        u.searchParams.delete("calendar");
        window.history.replaceState({}, "", u.toString());
      }
    } catch {
      // ignore
    }
  }, []);

  // Step 4 onboarding: open successive popups (contacts → social → reward)
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const flag = (u.searchParams.get("onboarding") || "").toLowerCase();
      if (flag === "contacts" || flag === "links" || flag === "contact") {
        setContactsWizardRequested(true);
        u.searchParams.delete("onboarding");
        window.history.replaceState({}, "", u.toString());
      }
    } catch {
      // ignore
    }
  }, []);

  // Step 5 onboarding: open house rules wizard
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const flag = (u.searchParams.get("onboarding") || "").toLowerCase();
      if (flag === "house_rules" || flag === "houserules" || flag === "rules") {
        setHouseRulesWizardRequested(true);
        u.searchParams.delete("onboarding");
        window.history.replaceState({}, "", u.toString());
      }
    } catch {
      // ignore
    }
  }, []);

  // Open wizard after property is loaded (so drafts can be prefilled)
  useEffect(() => {
    if (!contactsWizardRequested) return;
    if (!prop) return;
    setContactsWizardRequested(false);
    try {
      document.documentElement.setAttribute("data-p4h-modal-open", "1");
    } catch {
      // ignore
    }
    setContactsWizardError(null);
    setContactsWizardStep("contacts");
    setContactsWizardOpen(true);
    const split = splitPhoneToDialAndRest((prop.contact_phone || "").trim());
    setContactsWizardDial(split.dial);
    setContactsWizardPhoneLocal(split.rest);
    setContactsWizardDialOpen(false);
    const drafts = {
      facebook: prop.social_facebook || "",
      instagram: prop.social_instagram || "",
      tiktok: prop.social_tiktok || "",
      website: prop.social_website || "",
      location: prop.social_location || "",
    };
    setContactsWizardSocialDrafts(drafts);
    setContactsWizardSocialIndex(0);
    setContactsWizardSocialInput(drafts[CONTACTS_SOCIAL_KEYS[0]] || "");
  }, [contactsWizardRequested, prop?.id]);

  function openHouseRulesWizard() {
    if (!prop) return;
    setHouseRulesWizardRequested(false);
    setHouseRulesWizardError(null);
    setHouseRulesWizardLoading(false);
    setHouseRulesWizardLoadingText("Preparing your house rules…");
    setHouseRulesWizardPreviewUrl(prop.regulation_pdf_url || null);
    setHouseRulesWizardStep("intro");
    try {
      document.documentElement.setAttribute("data-p4h-modal-open", "1");
    } catch {
      // ignore
    }
    setHouseRulesWizardOpen(true);
  }

  useEffect(() => {
    if (!houseRulesWizardRequested) return;
    if (!prop) return;
    openHouseRulesWizard();
  }, [houseRulesWizardRequested, prop?.id]);

  useEffect(() => {
    return () => {
      if (houseRulesDraftBusyTimer.current) window.clearTimeout(houseRulesDraftBusyTimer.current);
      houseRulesDraftBusyTimer.current = null;
    };
  }, []);

  // Dial code dropdown state for Contact Phone
  const [contactDial, setContactDial] = useState<string>("+40");
  const [contactPhoneLocal, setContactPhoneLocal] = useState<string>("");
  const [dialOpen, setDialOpen] = useState<boolean>(false);
  const dialWrapRef = useRef<HTMLDivElement | null>(null);
  const hydratedPhoneKey = useRef<string>("");
  useEffect(() => {
    if (!prop) return;
    const saved = (lastSavedContact.current.phone || "").trim();
    const current = (prop.contact_phone || "").trim();
    // Hydrate only from the last-saved server value to avoid clobbering edits.
    if (current !== saved) return;
    const key = `${prop.id}:${saved}`;
    if (hydratedPhoneKey.current === key) return;
    hydratedPhoneKey.current = key;
    const split = splitPhoneToDialAndRest(saved);
    setContactDial(split.dial);
    setContactPhoneLocal(split.rest);
  }, [prop?.id, prop?.contact_phone]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node | null;
      if (dialWrapRef.current && t && !dialWrapRef.current.contains(t)) setDialOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function composeFullPhone(dial: string, local: string): string {
    const digits = (local || "").replace(/\D/g, "");
    if (!digits) return "";
    return `${dial}${digits}`;
  }

  function updateHouseRuleDraftImmediate(patch: Partial<HouseRulesDraft>) {
    setHouseRulesDraft((prev) => ({ ...prev, ...patch }));
  }

  function toggleHouseRuleWithDelay(
    key: "noSmoking" | "noParties" | "quietHours" | "petsAllowed" | "maxGuestsEnabled",
    next: boolean,
  ) {
    if (houseRulesDraftBusy) return;
    setHouseRulesDraftBusy(true);
    setHouseRulesPendingKey(key);
    if (houseRulesDraftBusyTimer.current) window.clearTimeout(houseRulesDraftBusyTimer.current);
    houseRulesDraftBusyTimer.current = window.setTimeout(() => {
      setHouseRulesDraft((prev) => ({ ...prev, [key]: next }));
      setHouseRulesDraftBusy(false);
      setHouseRulesPendingKey(null);
      setHouseRulesPrintPulse(Date.now());
      houseRulesDraftBusyTimer.current = null;
    }, 1000);
  }

  function houseRulesToParagraphs(d: HouseRulesDraft): string[] {
    const out: string[] = [];
    out.push("Thanks for reading — these guidelines help keep the stay smooth for everyone.");
    if (d.noSmoking) out.push("Please keep the indoor space smoke‑free. If you smoke, use the outdoor area and dispose of cigarette butts safely.");
    if (d.noParties) out.push("No parties or events — please keep things calm and respectful for the neighbours.");
    if (d.quietHours) out.push(`After ${d.quietHoursAfter}, please keep noise low (music, loud conversations, outdoor noise).`);
    if (d.petsAllowed) out.push("Pets are welcome with prior approval — please keep them under control and clean up after them.");
    if (d.maxGuestsEnabled) out.push(`Please don’t exceed ${d.maxGuests} overnight guests.`);
    if (d.otherNotes.trim()) out.push(d.otherNotes.trim());
    out.push("By completing check‑in, you confirm you’ve read and agree to these house rules.");
    return out;
  }

  async function uploadHouseRulesPdf(file: File): Promise<string> {
    if (!propertyId) throw new Error("Missing property");
    const fd = new FormData();
    fd.append("propertyId", propertyId);
    fd.append("file", file);
    const res = await fetch("/api/property/regulation/upload", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "Upload failed");
    return (j?.url || "").toString().trim();
  }

  async function sleep(ms: number) {
    await new Promise<void>((r) => window.setTimeout(r, ms));
  }

  async function sleepUntilOrAbort(ms: number, shouldAbort: () => boolean) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (shouldAbort()) return;
      await sleep(50);
    }
  }

  async function runHouseRulesLoadingSequence<T>(opts: {
    phases: string[];
    minMsPerPhase?: number;
    task: () => Promise<T>;
  }): Promise<T> {
    const minMsPerPhase = opts.minMsPerPhase ?? 2000;
    setHouseRulesWizardError(null);
    setHouseRulesWizardLoading(true);

    let taskError: any = null;
    let taskDone = false;
    let taskValue: T | null = null;

    const taskPromise = (async () => {
      try {
        taskValue = await opts.task();
      } catch (e: any) {
        taskError = e;
      } finally {
        taskDone = true;
      }
    })();

    for (const phase of opts.phases) {
      setHouseRulesWizardLoadingText(phase);
      await sleepUntilOrAbort(minMsPerPhase, () => !!taskError);
      if (taskError) break;
      // If the task is already done, still continue to show the remaining phases (psychological loading).
    }

    await taskPromise;
    setHouseRulesWizardLoading(false);

    if (taskError) throw taskError;
    return taskValue as T;
  }

  async function createAndUploadHouseRulesPdf() {
    if (!prop) return;
    try {
      const url = await runHouseRulesLoadingSequence({
        phases: [
          "Preparing your house rules…",
          "Setting clear expectations for your guests…",
          "Making sure guests confirm them before check-in…",
        ],
        task: async () => {
          const bytes = buildSimplePdfBytes({
            title: prop.name,
            subtitle: "House Rules",
            bodyLines: houseRulesToParagraphs(houseRulesDraft),
          });
          const fname = `${(prop.name || "house-rules").toString().trim().replace(/\s+/g, "-")}-house-rules.pdf`;
          const file = new File([bytes], fname, { type: "application/pdf" });
          const u = await uploadHouseRulesPdf(file);
          await refresh();
          try {
            window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
          } catch {
            // ignore
          }
          return u;
        },
      });
      setHouseRulesWizardPreviewUrl(url || null);
      setHouseRulesWizardStep("reward");
    } catch (e: any) {
      setHouseRulesWizardError(e?.message || "Could not create house rules.");
    }
  }

  // Read onboarding highlight hint from URL (e.g., ?highlight=contacts|picture|house_rules)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const u = new URL(window.location.href);
      const h = (u.searchParams.get("highlight") || "").toLowerCase();
      if (h === "contacts" || h === "picture" || h === "house_rules") {
        setHighlightTarget(h);
        // Optionally clean param so it doesn't persist forever
        u.searchParams.delete("highlight");
        window.history.replaceState({}, "", u.toString());
      }
    } catch {
      // ignore
    }
  }, []);

  function socialIcon(key: SocialKey) {
    const suffix = wizardIsDark ? "fordark" : "forlight";
    if (key === "location") return `/social_location_${suffix}.png`;
    return `/${key}_${suffix}.png`;
  }

  async function saveContactsWizard() {
    if (!prop) return;
    setContactsWizardError(null);
    setContactsWizardLoadingText("Saving contact details…");
    setContactsWizardLoading(true);
    const start = Date.now();
    const minMs = 900;
    try {
      const overlayPos = (prop.contact_overlay_position || "center") as any;
      const payload = {
        contact_email: (prop.contact_email || "").trim() || null,
        contact_phone: (composeFullPhone(contactsWizardDial, contactsWizardPhoneLocal) || "").trim() || null,
        contact_address: (prop.contact_address || "").trim() || null,
        contact_overlay_position: overlayPos,
      };
      const { error } = await supabase.from("properties").update(payload).eq("id", prop.id);
      if (error) throw error;
      setProp((prev) => (prev ? { ...prev, ...payload } : prev));
      // Keep the main contact input in sync (optional, but avoids confusion after wizard closes)
      setContactDial(contactsWizardDial);
      setContactPhoneLocal(contactsWizardPhoneLocal);
      lastSavedContact.current = {
        email: (payload.contact_email || "").toString(),
        phone: (payload.contact_phone || "").toString(),
        address: (payload.contact_address || "").toString(),
      };
      try { window.dispatchEvent(new CustomEvent("p4h:onboardingDirty")); } catch {}
      const elapsed = Date.now() - start;
      const remaining = Math.max(minMs - elapsed, 0);
      if (remaining) await new Promise<void>((r) => setTimeout(r, remaining));
      setContactsWizardStep("social");
    } catch (e: any) {
      setContactsWizardError(e?.message || "Could not save contact details.");
    } finally {
      setContactsWizardLoading(false);
    }
  }

  async function saveSocialWizard(draftsOverride?: Record<SocialKey, string>) {
    if (!prop) return;
    setContactsWizardError(null);
    setContactsWizardLoadingText("Updating guest portal…");
    setContactsWizardLoading(true);
    const start = Date.now();
    const minMs = 900;
    try {
      const drafts = draftsOverride || contactsWizardSocialDrafts;
      const payload = {
        social_facebook: drafts.facebook.trim() || null,
        social_instagram: drafts.instagram.trim() || null,
        social_tiktok: drafts.tiktok.trim() || null,
        social_website: drafts.website.trim() || null,
        social_location: drafts.location.trim() || null,
      };
      const { error } = await supabase.from("properties").update(payload).eq("id", prop.id);
      if (error) throw error;
      setProp((prev) => (prev ? { ...prev, ...payload } : prev));
      try { window.dispatchEvent(new CustomEvent("p4h:onboardingDirty")); } catch {}
      const elapsed = Date.now() - start;
      const remaining = Math.max(minMs - elapsed, 0);
      if (remaining) await new Promise<void>((r) => setTimeout(r, remaining));
      setContactsWizardStep("reward");
    } catch (e: any) {
      setContactsWizardError(e?.message || "Could not save social links.");
    } finally {
      setContactsWizardLoading(false);
    }
  }

  function addSocialWizardAndAdvance() {
    const currentKey = CONTACTS_SOCIAL_KEYS[contactsWizardSocialIndex];
    setContactsWizardSocialDrafts((prev) => {
      const updated = { ...prev, [currentKey]: contactsWizardSocialInput };
      const nextIndex = Math.min(CONTACTS_SOCIAL_KEYS.length - 1, contactsWizardSocialIndex + 1);
      const nextKey = CONTACTS_SOCIAL_KEYS[nextIndex];
      setContactsWizardSocialIndex(nextIndex);
      setContactsWizardSocialInput((updated[nextKey] ?? "").toString());
      return updated;
    });
  }

  function onPropChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.currentTarget.value;
    if (!next || next === propertyId) return;
    setProp(null);
    setLoading(true);
    setPropertyId(next);
  }

  async function triggerPdfUpload() {
    if (!propertyId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0] || null;
      if (!file) { input.remove(); return; }
      setStatus('Saving…');
      try {
        const fd = new FormData();
        fd.append('propertyId', propertyId);
        fd.append('file', file);
        const res = await fetch('/api/property/regulation/upload', { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { alert(j?.error || 'Upload failed'); setStatus('Error'); return; }
        await refresh();
        try {
          window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
        } catch {
          // ignore
        }
        setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
        // After successful upload, offer to extract text for the guest AI assistant
        if (currentPlan === "premium") {
          try {
            await openAiHouseRulesModalFromPdf();
          } catch {
            // Non-fatal; ignore errors here
          }
        }
      } catch { setStatus('Error'); }
      finally { input.remove(); }
    };
    document.body.appendChild(input);
    input.click();
  }

  async function saveContacts(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prop) return;
    // Require overlay position selection
    if (!prop.contact_overlay_position) { alert('Please select the overlay position for the property banner.'); return; }
    setStatus('Saving…');
    const { error } = await supabase
      .from('properties')
      .update({
        contact_email: prop.contact_email ?? null,
        contact_phone: prop.contact_phone ?? null,
        contact_address: prop.contact_address ?? null,
        contact_overlay_position: prop.contact_overlay_position ?? null,
      })
      .eq('id', prop.id);
    if (error) { setStatus('Error'); return; }
    try {
      window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
    } catch {
      // ignore
    }
    setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
  }
  async function autoSaveContactField(key: 'email' | 'phone' | 'address', value: string) {
    if (!prop) return;
    const clean = value.trim();
    const last = lastSavedContact.current[key];
    if (clean === last) return;
    setStatus('Saving…');
    const payload: Partial<Property> = {};
    if (key === 'email') payload.contact_email = clean || null;
    if (key === 'phone') payload.contact_phone = clean || null;
    if (key === 'address') payload.contact_address = clean || null;
    const { error } = await supabase.from('properties').update(payload).eq('id', prop.id);
    if (error) { setStatus('Error'); return; }
    lastSavedContact.current = { ...lastSavedContact.current, [key]: clean };
    await refresh();
    try {
      window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
    } catch {
      // ignore
    }
    setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
  }

  // Build absolute check-in link for selected property
  function getCheckinBase(): string {
    const v1 = (process.env.NEXT_PUBLIC_CHECKIN_BASE || "").toString().trim();
    if (v1) return v1.replace(/\/+$/, "");
    const v2 = (process.env.NEXT_PUBLIC_APP_URL || "").toString().trim();
    if (v2) return v2.replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin.replace(/\/+$/, "");
    return "";
  }
  function buildCheckinLink(propertyId: string): string {
    const base = getCheckinBase();
    try {
      const u = new URL(base);
      const normalizedPath = u.pathname.replace(/\/+$/, "");
      u.pathname = `${normalizedPath}/checkin`;
      u.search = new URLSearchParams({ property: propertyId }).toString();
      return u.toString();
    } catch {
      return `${base}/checkin?property=${encodeURIComponent(propertyId)}`;
    }
  }
  function sourceSlug(p?: string | null): string {
    const s = (p || '').toString().trim().toLowerCase();
    if (!s) return '';
    if (s.includes('booking')) return 'booking';
    if (s.includes('airbnb')) return 'airbnb';
    if (s.includes('expedia')) return 'expedia';
    if (s.includes('trivago')) return 'trivago';
    if (s.includes('lastminute')) return 'lastminute';
    if (s.includes('travelminit')) return 'travelminit';
    return s.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  function providerBuiltinLogo(provider?: string | null): string | null {
    const p = (provider || '').toLowerCase();
    if (p.includes('booking')) return '/booking.png';
    if (p.includes('airbnb')) return '/airbnb.png';
    if (p.includes('expedia')) return '/expedia.png';
    if (p.includes('trivago')) return '/trivago.png';
    if (p.includes('lastminute')) return '/lastminute.png';
    if (p.includes('travelminit')) return '/travelminit.png';
    return null;
  }
  function providerLabel(p: string): string {
    const s = p.toLowerCase();
    if (s === 'booking' || s.includes('booking')) return 'Booking.com';
    if (s === 'airbnb' || s.includes('airbnb')) return 'Airbnb';
    if (s === 'expedia' || s.includes('expedia')) return 'Expedia';
    if (s === 'trivago' || s.includes('trivago')) return 'Trivago';
    if (s === 'lastminute' || s.includes('lastminute')) return 'Lastminute';
    if (s === 'travelminit' || s.includes('travelminit')) return 'Travelminit';
    return p;
  }
  async function openSourcePicker() {
    if (!propertyId) return;
    setShowSrc(true);
    try {
      const r = await supabase
        .from('ical_type_integrations')
        .select('provider,logo_url,is_active')
        .eq('property_id', propertyId as string);
      const seen = new Set<string>();
      const out: ProviderItem[] = [
        { slug: 'manual', label: 'Manual', logo: '/P4H_ota.png' },
      ];
      if (!r.error && Array.isArray(r.data)) {
        for (const row of r.data as any[]) {
          const prov = String(row.provider || '').trim(); if (!prov) continue;
          const slug = sourceSlug(prov);
          if (seen.has(slug)) continue;
          seen.add(slug);
          const builtin = providerBuiltinLogo(prov);
          out.push({ slug, label: providerLabel(prov), logo: row.logo_url || builtin });
        }
      }
      setProviders(out);
    } catch {
      setProviders([{ slug: 'manual', label: 'Manual', logo: '/P4H_ota.png' }]);
    }
  }
  async function pickProvider(slug: string) {
    if (!prop) return;
    const base = buildCheckinLink(prop.id);
    const url = slug ? `${base}${base.includes('?') ? '&' : '?'}source=${encodeURIComponent(slug)}` : base;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { prompt('Copy this link:', url); }
    setShowSrc(false);
  }

  async function triggerImageUpload() {
    if (!propertyId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.onchange = async () => {
      const file = input.files?.[0] || null;
      if (!file) { input.remove(); return; }
      setStatus('Saving…');
      try {
        const fd = new FormData();
        fd.append('propertyId', propertyId);
        fd.append('file', file);
        const res = await fetch('/api/property/profile/upload', { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { alert(j?.error || 'Upload failed'); setStatus('Error'); return; }
        await refresh();
        try {
          window.dispatchEvent(new CustomEvent("p4h:onboardingDirty"));
        } catch {
          // ignore
        }
        setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
      } catch { setStatus('Error'); }
      finally { input.remove(); }
    };
    document.body.appendChild(input);
    input.click();
  }

  async function openAiHouseRulesModalFromPdf() {
    if (!propertyId) return;
    setAiModalOpen(true);
    setAiModalLoading(true);
    setAiModalError(null);
    setAiModalText(prop?.ai_house_rules_text || "");
    setAiStatusPhase("reading");
    setAiStatusPopupOpen(true);
    try {
      const res = await fetch(
        `/api/property/regulation/read-text?propertyId=${encodeURIComponent(
          propertyId,
        )}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.text) {
        if (!prop?.ai_house_rules_text) {
          setAiModalText(String(data.text || ""));
        }
        setAiStatusPhase("success");
      } else {
        setAiModalError("extract_failed");
        setAiStatusPhase("failed");
      }
    } catch {
      setAiModalError("extract_failed");
      setAiStatusPhase("failed");
    } finally {
      setAiModalLoading(false);
    }
  }

  async function saveAiHouseRules() {
    if (!propertyId) return;
    setStatus("Saving…");
    try {
      const res = await fetch("/api/property/ai-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          houseRulesText: aiModalText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Failed to save AI house rules.");
        setStatus("Error");
        return;
      }
      await refresh();
      setStatus("Synced");
      setTimeout(() => setStatus("Idle"), 800);
      setAiModalOpen(false);
    } catch (e: any) {
      alert(e?.message || "Failed to save AI house rules.");
      setStatus("Error");
    }
  }

  return (
    <div style={{ fontFamily: "Switzer, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", color: "var(--text)" }}>
      <PlanHeaderBadge title="Check-in Editor" slot="under-title" />
      <div style={{ padding: isNarrow ? "10px 12px 16px" : "16px", display: "grid", gap: 16 }}>
        {/* Controls (same spacing pattern as Guest Overview) */}
        <div className="sb-toolbar" style={{ gap: isNarrow ? 12 : 20, flexWrap: "wrap", marginBottom: 12 }}>
          {/* Property selector (pill with avatar only) */}
          <div
            className="modalCard Sb-cardglow"
            style={{
              position: 'relative',
              display: isNarrow ? 'grid' : 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: isNarrow ? '8px 10px 8px 56px' : '6px 10px 6px 56px',
              borderRadius: 999,
              minHeight: 56,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              width: isNarrow ? '100%' : undefined,
              flexBasis: isNarrow ? '100%': 'auto',
              flex: isNarrow ? '1 1 100%' :undefined
            }}
          >
            {prop?.presentation_image_url ? (
              <img
                src={prop.presentation_image_url}
                alt=""
                width={40}
                height={40}
                style={{ position: 'absolute', left: 8, width: 40, height: 40, borderRadius: 999, objectFit: 'cover', border: '2px solid var(--card)' }}
              />
            ) : null}
            <select
              className="sb-select"
              value={propertyId || ''}
              onChange={onPropChange}
              style={{
                background: 'transparent',
                border: 0,
                boxShadow: 'none',
                padding: '10px 12px',
                minHeight: 44,
                minWidth: isNarrow ? '100%' : 220,
                maxWidth: isNarrow ? '100%' : 380,
                width: isNarrow ? '100%' : 'auto',
                fontFamily: 'inherit',
                fontWeight: 700,
              }}
            >
              {(properties || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {isNarrow && <div style={{ flexBasis: "100%", height: 8 }} />}
        </div>

        {showCalendarConnectedBanner && (
          <div
            className="sb-cardglow"
            style={{
              background: "color-mix(in srgb, var(--panel) 90%, transparent)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span aria-hidden style={{ color: "var(--success)", fontWeight: 900 }}>✓</span>
            <div style={{ display: "grid", gap: 2 }}>
              <div style={{ fontWeight: 800, fontSize: "var(--fs-b)", lineHeight: "var(--lh-b)" }}>
                Calendar connected
              </div>
              <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
                Your availability is now managed.
              </div>
            </div>
          </div>
        )}

	        {contactsWizardOpen && prop && (
	          <div
	            role="dialog"
	            aria-modal="true"
	            onClick={() => {
	              setContactsWizardOpen(false);
	              try {
	                document.documentElement.removeAttribute("data-p4h-modal-open");
	              } catch {
	                // ignore
	              }
	            }}
	            style={{
	              position: "fixed",
	              inset: 0,
              zIndex: 240,
              background: "rgba(0,0,0,0.55)",
              display: "grid",
              placeItems: "center",
              padding: 12,
              paddingTop: "calc(var(--safe-top, 0px) + 12px)",
              paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="sb-card"
              style={{
                width: "min(560px, 100%)",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 16,
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "start", gap: 12 }}>
                <div aria-hidden />
                <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: ".14em",
                      color: "color-mix(in srgb, var(--text) 86%, transparent)",
                    }}
                  >
                    {contactsWizardStep === "contacts"
                      ? "Add your contact details"
                      : contactsWizardStep === "social"
                        ? "Social links"
                        : "Guest portal updated"}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
                    {contactsWizardStep === "contacts"
                      ? "This information appears in your guest check-in portal."
                      : contactsWizardStep === "social"
                        ? "Optional — share only what you want guests to see."
                        : "Your contact details are now visible to guests."}
                  </div>
                </div>
	                <button
	                  aria-label="Close"
	                  className="sb-btn sb-cardglow sb-btn--icon"
	                  style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 900 }}
	                  onClick={() => {
	                    setContactsWizardOpen(false);
	                    try {
	                      document.documentElement.removeAttribute("data-p4h-modal-open");
	                    } catch {
	                      // ignore
	                    }
	                  }}
	                >
	                  ×
	                </button>
              </div>

              {contactsWizardStep === "contacts" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ color: "var(--text)", fontSize: "var(--fs-b)", lineHeight: "var(--lh-b)" }}>
                    <div>This step is quick and optional.</div>
                    <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", marginTop: 6 }}>
                      Add only what you want guests to see.
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <label>Email</label>
                      <input
                        type="email"
                        value={prop.contact_email ?? ""}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          setProp((prev) => (prev ? { ...prev, contact_email: v } : prev));
                        }}
                        placeholder="example@hotel.com"
                        style={FIELD}
                      />
                      <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
                        Guests can use this to contact you before or during their stay.
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <label>Phone</label>
                      <div ref={contactsWizardDialWrapRef} style={{ position: "relative" }}>
                        <button
                          type="button"
                          onClick={() => setContactsWizardDialOpen((v) => !v)}
                          aria-label="Dial code"
                          style={{
                            position: "absolute",
                            left: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            zIndex: 2,
                            border: "1px solid var(--border)",
                            background: "var(--card)",
                            color: "var(--text)",
                            borderRadius: 8,
                            padding: "6px 8px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span aria-hidden>
                            {flagEmoji((DIAL_OPTIONS.find((d) => d.code === contactsWizardDial)?.cc) || "RO")}
                          </span>
                          <span>{contactsWizardDial}</span>
                        </button>
                        <input
                          type="tel"
                          value={contactsWizardPhoneLocal}
                          onChange={(e) => setContactsWizardPhoneLocal(e.currentTarget.value)}
                          placeholder="712 345 678"
                          style={{ ...FIELD, paddingLeft: 96 }}
                        />
                        {contactsWizardDialOpen && (
                          <div
                            role="listbox"
                            style={{
                              position: "absolute",
                              left: 8,
                              top: "calc(100% + 6px)",
                              zIndex: 30,
                              background: "var(--panel)",
                              border: "1px solid var(--border)",
                              borderRadius: 10,
                              padding: 6,
                              display: "grid",
                              gap: 4,
                              maxHeight: 240,
                              overflow: "auto",
                              width: "min(420px, calc(100vw - 32px))",
                            }}
                          >
                            {DIAL_OPTIONS.map((opt) => (
                              <button
                                key={`${opt.cc}-${opt.code}`}
                                type="button"
                                onClick={() => {
                                  setContactsWizardDial(opt.code);
                                  setContactsWizardDialOpen(false);
                                }}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  border: "1px solid var(--border)",
                                  background: opt.code === contactsWizardDial ? "var(--primary)" : "var(--card)",
                                  color: opt.code === contactsWizardDial ? "#0c111b" : "var(--text)",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  textAlign: "left",
                                }}
                              >
                                <span aria-hidden>{flagEmoji(opt.cc)}</span>
                                <span style={{ width: 56, display: "inline-block" }}>{opt.code}</span>
                                <span style={{ color: "var(--muted)", fontWeight: 600 }}>{opt.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
                        Useful for urgent questions or arrival issues.
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <label>Address</label>
                      <input
                        value={prop.contact_address ?? ""}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          setProp((prev) => (prev ? { ...prev, contact_address: v } : prev));
                        }}
                        placeholder="Street, city, optional details"
                        style={FIELD}
                      />
                      <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
                        Shown only if you want guests to see the exact location.
                      </div>
                    </div>
                  </div>

                  {contactsWizardError && (
                    <div style={{ color: "var(--danger)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", textAlign: "center" }}>
                      {contactsWizardError}
                    </div>
                  )}

                  <button
                    className="sb-btn sb-btn--primary"
                    style={{ width: "100%", minHeight: 44 }}
                    onClick={() => void saveContactsWizard()}
                  >
                    Continue
                  </button>
                </div>
              )}

	              {contactsWizardStep === "social" && (
	                <div style={{ display: "grid", gap: 12 }}>
	                  <div style={{ display: "grid", gap: 10 }}>
	                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
	                      {(["website", "facebook", "instagram", "tiktok", "location"] as SocialKey[]).map((k) => {
	                        const active = CONTACTS_SOCIAL_KEYS[contactsWizardSocialIndex] === k;
	                        return (
	                          <div
	                            key={k}
	                            className="sb-cardglow"
	                            style={{
	                              borderRadius: 999,
	                              border: `1px solid ${active ? "color-mix(in srgb, var(--primary) 50%, var(--border))" : "var(--border)"}`,
	                              background: "transparent",
	                              padding: active ? "10px 12px" : "8px 10px",
	                              display: "inline-flex",
	                              alignItems: "center",
	                              gap: 8,
	                              cursor: "default",
	                              opacity: active ? 1 : 0.55,
	                              transform: active ? "scale(1.06)" : "scale(0.98)",
	                              transition: "transform 140ms ease, opacity 140ms ease, border-color 140ms ease",
	                              userSelect: "none",
	                            }}
	                          >
	                            <img
	                              src={socialIcon(k)}
	                              alt=""
	                              aria-hidden="true"
	                              width={22}
	                              height={22}
	                              style={{ width: 22, height: 22, filter: active ? "none" : "grayscale(0.6)" }}
	                            />
	                            <span style={{ fontWeight: 800, textTransform: "capitalize" }}>
	                              {k === "website" ? "Website" : k === "location" ? "Location" : k}
	                            </span>
	                          </div>
	                        );
	                      })}
	                    </div>

	                    <div style={{ display: "grid", gap: 6 }}>
	                      <input
	                        value={contactsWizardSocialInput}
	                        onChange={(e) => setContactsWizardSocialInput(e.currentTarget.value)}
	                        placeholder={CONTACTS_SOCIAL_KEYS[contactsWizardSocialIndex] === "location" ? "Paste Google Maps link" : "Paste URL"}
	                        style={FIELD}
	                      />
	                      <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", textAlign: "center" }}>
	                        Optional — share only what you want guests to see.
	                      </div>
	                    </div>
	                  </div>

	                  {contactsWizardError && (
	                    <div style={{ color: "var(--danger)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", textAlign: "center" }}>
	                      {contactsWizardError}
	                    </div>
	                  )}

	                  <div style={{ display: "grid", gap: 10 }}>
	                    <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 10 }}>
	                      <button
	                        className="sb-btn"
	                        style={{ width: "100%", minHeight: 44 }}
	                        onClick={() => {
	                          setContactsWizardStep("reward");
	                        }}
	                      >
	                        Skip
	                      </button>
	                      <button
	                        className="sb-btn sb-btn--primary"
	                        style={{ width: "100%", minHeight: 44 }}
	                        onClick={() => addSocialWizardAndAdvance()}
	                      >
	                        Add
	                      </button>
	                    </div>
	                    <button
	                      className="sb-btn sb-cardglow"
	                      style={{ width: "100%", minHeight: 44, justifyContent: "center" }}
	                      onClick={async () => {
	                        const currentKey = CONTACTS_SOCIAL_KEYS[contactsWizardSocialIndex];
	                        const drafts = { ...contactsWizardSocialDrafts, [currentKey]: contactsWizardSocialInput };
	                        setContactsWizardSocialDrafts(drafts);
	                        await saveSocialWizard(drafts);
	                      }}
	                    >
	                      Save
	                    </button>
	                    <button
	                      type="button"
	                      onClick={() => setContactsWizardStep("reward")}
	                      style={{
	                        background: "transparent",
	                        border: "none",
	                        color: "var(--muted)",
	                        fontSize: "var(--fs-s)",
	                        lineHeight: "var(--lh-s)",
	                        cursor: "pointer",
	                        textDecoration: "underline",
	                        textAlign: "center",
	                      }}
	                    >
	                      Skip social links
	                    </button>
	                  </div>
	                </div>
	              )}

              {contactsWizardStep === "reward" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--card) 88%, transparent)" }}>
                      <span aria-hidden style={{ color: "var(--success)", fontWeight: 900 }}>✓</span>
                      <span style={{ fontWeight: 800 }}>Shown in guest check-in portal</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--card) 88%, transparent)" }}>
                      <span aria-hidden style={{ color: "var(--success)", fontWeight: 900 }}>✓</span>
                      <span style={{ fontWeight: 800 }}>Guests know how to reach you</span>
                    </div>
                  </div>

                  <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", textAlign: "center" }}>
                    You can change this anytime.
                  </div>

	                  <button
	                    className="sb-btn sb-btn--primary"
	                    style={{ width: "100%", minHeight: 44 }}
	                    onClick={() => {
	                      setContactsWizardOpen(false);
	                      try {
	                        document.documentElement.removeAttribute("data-p4h-modal-open");
	                      } catch {
	                        // ignore
	                      }
	                      setHighlightTarget("house_rules");
	                      setNoPdfOpen(false);
	                      openHouseRulesWizard();
	                    }}
	                  >
	                    Continue
	                  </button>

                  <a
                    href={buildCheckinLink(prop.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--primary)",
                      fontSize: "var(--fs-s)",
                      lineHeight: "var(--lh-s)",
                      textAlign: "center",
                      textDecoration: "none",
                      marginTop: 2,
                    }}
                  >
                    View guest link
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {houseRulesWizardOpen && prop && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => {
              setHouseRulesWizardOpen(false);
              try {
                document.documentElement.removeAttribute("data-p4h-modal-open");
              } catch {
                // ignore
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147482500,
              background: "rgba(0,0,0,0.55)",
              display: "grid",
              placeItems: "center",
              padding: 12,
              paddingTop: "calc(var(--safe-top, 0px) + var(--p4h-fixed-header-h, var(--app-header-h, 64px)) + 12px)",
              paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="sb-card"
              style={{
                width: "min(760px, 100%)",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 16,
                display: "grid",
                gridTemplateRows: "auto 1fr",
                gap: 14,
                maxHeight:
                  "calc(100dvh - (var(--safe-top, 0px) + var(--safe-bottom, 0px) + var(--p4h-fixed-header-h, var(--app-header-h, 64px)) + 24px))",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "start", gap: 12 }}>
                <div aria-hidden />
                <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: ".14em",
                      color: "color-mix(in srgb, var(--text) 86%, transparent)",
                    }}
                  >
                    {houseRulesWizardStep === "intro"
                      ? "House rules = clear limits"
                      : houseRulesWizardStep === "choose"
                        ? "Add house rules"
                        : houseRulesWizardStep === "create"
                          ? "Create house rules"
                          : houseRulesWizardStep === "uploaded"
                            ? "House rules uploaded"
                            : "This is how guests see your house rules"}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
                    {houseRulesWizardStep === "intro"
                      ? "Protect yourself before guests arrive."
                      : houseRulesWizardStep === "choose"
                        ? "Choose the easiest option for you."
                        : houseRulesWizardStep === "create"
                          ? "Answer a few questions — we’ll do the rest."
                          : houseRulesWizardStep === "uploaded"
                            ? "Guests will see them during check-in."
                            : "They must confirm them before check-in."}
                  </div>
                </div>
	                <button
	                  aria-label="Close"
	                  className="sb-btn sb-cardglow sb-btn--icon"
	                  style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 900 }}
	                  onClick={() => {
	                    setHouseRulesWizardOpen(false);
	                    try {
	                      document.documentElement.removeAttribute("data-p4h-modal-open");
	                    } catch {
	                      // ignore
	                    }
	                  }}
	                >
	                  ×
                </button>
              </div>

              <div style={{ overflow: "auto", paddingRight: 2, paddingBottom: 2 }}>
              {houseRulesWizardStep === "intro" && (
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ color: "var(--text)", fontSize: "var(--fs-b)", lineHeight: "var(--lh-b)", textAlign: "center" }}>
                    By adding house rules, guests can read and confirm them before check-in.
                  </div>
                  <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                    <button
                      className="sb-btn sb-btn--primary"
                      style={{ width: "min(520px, 100%)", minHeight: 44 }}
                      onClick={() => setHouseRulesWizardStep("choose")}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {houseRulesWizardStep === "choose" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <button
                      className="sb-btn sb-cardglow"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "application/pdf";
                        input.style.display = "none";
                        input.onchange = async () => {
                          const file = input.files?.[0] || null;
                          if (!file) { input.remove(); return; }
                          try {
                            const url = await runHouseRulesLoadingSequence({
                              phases: [
                                "Preparing your house rules…",
                                "Setting clear expectations for your guests…",
                                "Making sure guests confirm them before check-in…",
                              ],
                              task: async () => {
                                const u = await uploadHouseRulesPdf(file);
                                await refresh();
                                try { window.dispatchEvent(new CustomEvent("p4h:onboardingDirty")); } catch {}
                                return u;
                              },
                            });
                            setHouseRulesWizardPreviewUrl(url || null);
                            setHouseRulesWizardStep("uploaded");
                          } catch (e: any) {
                            setHouseRulesWizardError(e?.message || "Could not upload house rules.");
                          } finally {
                            input.remove();
                          }
                        };
                        document.body.appendChild(input);
                        input.click();
                      }}
                    >
                      Upload a PDF
                    </button>
                    <button
                      className="sb-btn sb-btn--primary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => setHouseRulesWizardStep("create")}
                    >
                      Create them here
                    </button>
                    <button
                      className="sb-btn"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        setHouseRulesWizardOpen(false);
                        window.location.href = "/app/reservationMessage";
                      }}
                    >
                      I’ll add this later
                    </button>
                  </div>

                  {houseRulesWizardError && (
                    <div style={{ color: "var(--danger)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", textAlign: "center" }}>
                      {houseRulesWizardError}
                    </div>
                  )}
                </div>
              )}

              {houseRulesWizardStep === "create" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      borderRadius: 16,
                      border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
                      backgroundColor: "#ffffff",
                      color: "#0b1220",
                      overflow: "hidden",
                      boxShadow: "0 10px 26px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        padding: 16,
                        backgroundColor: "#ffffff",
                        backgroundImage: "url(/background_houserules.png)",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: "130% 130%",
                      }}
                    >
                      {houseRulesDraftBusy && (
                        <div
                          className="p4h-hr-print-overlay"
                          aria-hidden
                          style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "auto",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.65) 40%, rgba(255,255,255,0.05))",
                          }}
                        />
                      )}
                      <div style={{ position: "absolute", top: 12, right: 12, opacity: 0.85 }} aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M8 4h8a2 2 0 0 1 2 2v14H6V6a2 2 0 0 1 2-2Z"
                            stroke="#0b1220"
                            strokeWidth="1.6"
                            opacity="0.55"
                          />
                          <path
                            d="M9 8h6M9 12h6M9 16h4"
                            stroke="#0b1220"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            opacity="0.55"
                          />
                          <path
                            d="M16 4V2"
                            stroke="#0b1220"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            opacity="0.55"
                          />
                        </svg>
                      </div>

                      <div style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 6, paddingTop: 8 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: ".02em" }}>{prop.name}</div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: ".22em",
                            color: "rgba(11,18,32,0.62)",
                          }}
                        >
                          House Rules
                        </div>
                      </div>

                      <div style={{ height: 14 }} />

                      {/* Controls live on top of the paper */}
                      <div style={{ display: "grid", gap: 12 }}>
                        {([
                          { key: "noSmoking", label: "Keep the indoor space smoke‑free." },
                          { key: "noParties", label: "No parties or events." },
                          { key: "quietHours", label: "Quiet hours after" },
                          { key: "petsAllowed", label: "Pets allowed (with approval)." },
                          { key: "maxGuestsEnabled", label: "Maximum overnight guests" },
                        ] as const).map((item) => {
                          const checked = (houseRulesDraft as any)[item.key] as boolean;
                          const pending = houseRulesPendingKey === item.key;
                          const showCheck = checked || pending;
                          return (
                            <div key={item.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
                              <button
                                type="button"
                                aria-pressed={checked}
                                disabled={houseRulesDraftBusy}
                                onClick={() => toggleHouseRuleWithDelay(item.key, !checked)}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  border: "1px solid rgba(11,18,32,0.38)",
                                  background: showCheck ? "rgba(34,197,94,0.10)" : "transparent",
                                  display: "grid",
                                  placeItems: "center",
                                  cursor: houseRulesDraftBusy ? "not-allowed" : "pointer",
                                  transition: "background 180ms ease, transform 180ms ease",
                                  transform: pending ? "scale(1.05)" : "scale(1)",
                                }}
                                title="Toggle"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: showCheck ? 1 : 0 }}>
                                  <path
                                    d="M20 6L9 17l-5-5"
                                    stroke="#16a34a"
                                    strokeWidth="2.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                      strokeDasharray: 40,
                                      strokeDashoffset: pending ? 40 : 0,
                                      transition: "stroke-dashoffset 380ms ease",
                                    }}
                                  />
                                </svg>
                              </button>

                              <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "rgba(11,18,32,0.92)" }}>
                                {item.label}
                              </div>

                              {item.key === "quietHours" && (
                                <input
                                  type="time"
                                  value={houseRulesDraft.quietHoursAfter}
                                  disabled={!houseRulesDraft.quietHours || houseRulesDraftBusy}
                                  onChange={(e) => updateHouseRuleDraftImmediate({ quietHoursAfter: e.currentTarget.value })}
                                  style={{
                                    width: 112,
                                    background: "transparent",
                                    color: "#0b1220",
                                    border: "none",
                                    borderBottom: "1px solid rgba(11,18,32,0.35)",
                                    padding: "2px 2px",
                                    fontWeight: 800,
                                    outline: "none",
                                  }}
                                />
                              )}

                              {item.key === "maxGuestsEnabled" && (
                                <input
                                  type="number"
                                  min={1}
                                  value={houseRulesDraft.maxGuests}
                                  disabled={!houseRulesDraft.maxGuestsEnabled || houseRulesDraftBusy}
                                  onChange={(e) => updateHouseRuleDraftImmediate({ maxGuests: e.currentTarget.value })}
                                  style={{
                                    width: 72,
                                    background: "transparent",
                                    color: "#0b1220",
                                    border: "none",
                                    borderBottom: "1px solid rgba(11,18,32,0.35)",
                                    padding: "2px 2px",
                                    fontWeight: 800,
                                    outline: "none",
                                    textAlign: "center",
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}

                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 13.5, color: "rgba(11,18,32,0.92)" }}>
                            Anything else you want guests to know?
                          </div>
                          <textarea
                            value={houseRulesDraft.otherNotes}
                            disabled={houseRulesDraftBusy}
                            onChange={(e) => updateHouseRuleDraftImmediate({ otherNotes: e.currentTarget.value })}
                            rows={2}
                            placeholder="Write it here…"
                            style={{
                              width: "100%",
                              background: "transparent",
                              color: "#0b1220",
                              border: "none",
                              borderBottom: "1px solid rgba(11,18,32,0.28)",
                              padding: "4px 2px",
                              outline: "none",
                              resize: "none",
                              fontSize: 13.5,
                              lineHeight: 1.45,
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ height: 18 }} />

                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(11,18,32,0.45)" }}>
                          Preview
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                          {houseRulesDraftBusy && (
                            <div style={{ fontSize: 12, color: "rgba(11,18,32,0.50)" }}>
                              Adding it to your house rules…
                            </div>
                          )}
                          <div
                            key={houseRulesPrintPulse}
                            className="p4h-hr-print"
                            style={{ display: "grid", gap: 10, fontSize: 13.5, lineHeight: 1.55, color: "rgba(11,18,32,0.92)" }}
                          >
                            {houseRulesToParagraphs(houseRulesDraft).map((t, idx) => (
                              <div key={idx}>{t}</div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 12 }} />

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                        <button className="sb-btn" type="button" onClick={() => setHouseRulesWizardStep("choose")}>
                          Back
                        </button>
                        <button
                          className="sb-btn sb-btn--primary"
                          type="button"
                          style={{ minWidth: 220 }}
                          onClick={createAndUploadHouseRulesPdf}
                        >
                          Save house rules
                        </button>
                      </div>
                      {houseRulesWizardError && (
                        <div style={{ color: "var(--danger)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)", marginTop: 10, textAlign: "center" }}>
                          {houseRulesWizardError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(houseRulesWizardStep === "uploaded" || houseRulesWizardStep === "reward") && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--card) 88%, transparent)" }}>
                      <span aria-hidden style={{ color: "var(--success)", fontWeight: 900 }}>✓</span>
                      <span style={{ fontWeight: 800 }}>Shown in guest check-in portal</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--card) 88%, transparent)" }}>
                      <span aria-hidden style={{ color: "var(--success)", fontWeight: 900 }}>✓</span>
                      <span style={{ fontWeight: 800 }}>Protects you by setting expectations</span>
                    </div>
                  </div>

                  {(() => {
                    const url = (houseRulesWizardPreviewUrl || prop.regulation_pdf_url || "").toString().trim();
                    if (!url) return null;
                    return (
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 14,
                          overflow: "hidden",
                          background: "#ffffff",
                        }}
                      >
                        <iframe
                          src={url}
                          title="House Rules PDF"
                          style={{ width: "100%", height: isNarrow ? "62vh" : "56vh", border: 0, display: "block" }}
                        />
                      </div>
                    );
                  })()}

                  <div style={{ display: "grid", gap: 10 }}>
                    <a
                      href={buildCheckinLink(prop.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sb-btn sb-cardglow"
                      style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
                    >
                      Preview as guest
                    </a>
                    <button
                      className="sb-btn sb-btn--primary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        setHouseRulesWizardOpen(false);
                        window.location.href = "/app/reservationMessage";
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes p4hHrPrintIn {
            0% { transform: translate3d(0, 10px, 0); opacity: 0; }
            60% { transform: translate3d(0, 0, 0); opacity: 1; }
            100% { transform: translate3d(0, 0, 0); opacity: 1; }
          }
          @keyframes p4hHrScan {
            0% { transform: translateY(-30%); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { transform: translateY(30%); opacity: 0; }
          }
          .p4h-hr-print {
            animation: p4hHrPrintIn 520ms ease both;
          }
          .p4h-hr-print-overlay::after {
            content: "";
            position: absolute;
            left: 14px;
            right: 14px;
            top: 20%;
            height: 54px;
            border-radius: 14px;
            background: linear-gradient(90deg, transparent, rgba(16,185,129,0.18), transparent);
            filter: blur(0.2px);
            animation: p4hHrScan 900ms ease both;
          }
        `}</style>

        {contactsWizardLoading && (
          <div className={overlayStyles.overlay} role="status" aria-live="polite" aria-label={contactsWizardLoadingText} style={{ zIndex: 241 }}>
            <div style={{ display: "grid", justifyItems: "center", gap: 12, padding: 12 }}>
              <LoadingPill title={contactsWizardLoadingText} />
              <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
                <div style={{ color: "var(--text)", fontSize: "var(--fs-b)", lineHeight: "var(--lh-b)", fontWeight: 700 }}>
                  {contactsWizardLoadingText}
                </div>
              </div>
            </div>
          </div>
        )}

        {houseRulesWizardLoading && (
          <div className={overlayStyles.overlay} role="status" aria-live="polite" aria-label={houseRulesWizardLoadingText} style={{ zIndex: 243 }}>
            <div style={{ display: "grid", justifyItems: "center", gap: 12, padding: 12 }}>
              <LoadingPill title={houseRulesWizardLoadingText} />
              <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
                <div style={{ color: "var(--text)", fontSize: "var(--fs-b)", lineHeight: "var(--lh-b)", fontWeight: 700 }}>
                  {houseRulesWizardLoadingText}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "var(--fs-s)", lineHeight: "var(--lh-s)" }}>
                  This is what guests will see before arrival.
                </div>
              </div>
            </div>
          </div>
        )}

      {prop && (
        <>
          {/* Check-in Link */}
          <section className="sb-cardglow" style={card}>
            <h3 style={{ marginTop: 0 }}>Check-in Link</h3>
            <div style={{ display: "grid", gap: 8, alignItems: "start" }}>
              <div>
                <button
                  className="sb-btn sb-btn--primary sb-cardglow sb-btn--p4h-copylink"
                  style={{
                    width: isNarrow ? "100%" : 220,
                    maxWidth: isNarrow ? "100%" : 220,
                    justifyContent: "center",
                  }}
                  onClick={() => {
                    if (!prop?.regulation_pdf_url) { setNoPdfOpen(true); return; }
                    openSourcePicker();
                  }}
                  title={prop?.regulation_pdf_url ? 'Copy check-in link' : 'Upload House Rules PDF first'}
                >
                  {copied ? 'Copied!' : 'Copy check-in link'}
                </button>
              </div>
              <small style={{ color: "var(--muted)" }}>You can choose a source before copying.</small>
            </div>
          </section>

          {aiModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setAiModalOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 240,
                background: "rgba(0,0,0,0.55)",
                display: "grid",
                placeItems: "center",
                padding: 12,
                paddingTop: "calc(var(--safe-top, 0px) + 12px)",
                paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="sb-card"
                style={{
                  position: "relative",
                  width: "min(720px, 100%)",
                  maxHeight: "calc(100dvh - 40px)",
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                  display: "grid",
                  gridTemplateRows: "auto auto 1fr auto",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <strong>Use House Rules for guest assistant</strong>
                  <button
                    type="button"
                    className="sb-btn sb-cardglow sb-btn--icon"
                    onClick={() => setAiModalOpen(false)}
                    aria-label="Close"
                    title="Close"
                    style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  This text will be used as input for the guest AI assistant
                  (arrival details, amenities, etc.). Review it, remove any
                  sensitive information (door codes, passwords, private links),
                  then confirm.
                </div>
                <textarea
                  value={aiModalText}
                  onChange={(e) => setAiModalText(e.currentTarget.value)}
                  rows={16}
                  style={{
                    width: "100%",
                    height: "auto",
                    minHeight: 260,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                    padding: 10,
                    resize: "none",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                  }}
                  disabled={aiModalLoading}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {aiModalLoading ? "" : ""}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="sb-btn sb-btn--primary"
                      onClick={saveAiHouseRules}
                      disabled={aiModalLoading}
                      style={AI_ACTION_STYLE}
                    >
                      {aiModalLoading ? "Saving…" : "Use for AI"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {aiStatusPopupOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 260,
                background: "rgba(0,0,0,0.45)",
                display: "grid",
                placeItems: "center",
                padding: 12,
                paddingTop: "calc(var(--safe-top, 0px) + 12px)",
                paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
              }}
            >
              <div
                className="sb-card"
                style={{
                  width: "min(420px, 100%)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background:
                    aiStatusPhase === "reading"
                      ? "linear-gradient(135deg, rgba(0,209,255,0.16), rgba(124,58,237,0.28))"
                      : "var(--panel)",
                  padding: 16,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
                  color: "var(--text)",
                  textAlign: "left",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {aiStatusPhase === "reading"
                    ? "Reading the file…"
                    : aiStatusPhase === "success"
                    ? "Text ready for your guest AI assistant"
                    : "Add info for your guest AI assistant"}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {aiStatusPhase === "reading"
                    ? "Please wait while we prepare the text that the guest AI assistant will use."
                    : aiStatusPhase === "success"
                    ? "We prepared the text for your guest AI assistant. You can now review and edit it below, then save."
                    : "Please type or paste the details you want the guest AI assistant to know (house rules, arrival instructions, amenities, recommendations, check‑out, etc.), then save."}
                </div>
                {aiStatusPhase !== "reading" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {aiStatusPhase === "success" && (
                      <button
                        type="button"
                        className="sb-btn sb-btn--primary"
                        onClick={() => {
                          setAiStatusPopupOpen(false);
                          setAiStatusPhase("idle");
                        }}
                      >
                        Check &amp; edit
                      </button>
                    )}
                    {aiStatusPhase === "failed" && (
                      <button
                        type="button"
                        className="sb-btn"
                        onClick={() => {
                          setAiStatusPopupOpen(false);
                          setAiStatusPhase("idle");
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 999,
                          padding: 0,
                          display: "grid",
                          placeItems: "center",
                          border: "1px solid var(--primary)",
                          background: "transparent",
                          color: "var(--primary)",
                          fontWeight: 800,
                        }}
                      >
                        OK
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {aiPremiumPopupOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 260,
                background: "rgba(0,0,0,0.55)",
                display: "grid",
                placeItems: "center",
                padding: 12,
                paddingTop: "calc(var(--safe-top, 0px) + 12px)",
                paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
              }}
            >
              <div
                className="sb-card"
                style={{
                  width: "min(420px, 100%)",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background:
                    "linear-gradient(135deg, rgba(0,209,255,0.25), rgba(124,58,237,0.75))",
                  padding: 16,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
                  color: "#f9fafb",
                  textAlign: "left",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  Guest AI assistant is a Premium feature
                </div>
                <div style={{ fontSize: 13, opacity: 0.95 }}>
                  To read and prepare House Rules text for the guest AI assistant, you need an active{" "}
                  <strong>Premium</strong> plan. Upgrade your account to unlock AI answers for arrival details,
                  amenities, extras and check-out.
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="sb-btn"
                    onClick={() => setAiPremiumPopupOpen(false)}
                  >
                    Close
                  </button>
                  <a
                    href="/app/subscription?plan=premium&hl=1"
                    className="sb-btn sb-cardglow"
                    style={{
                      background: "#0b1120",
                      borderColor: "rgba(148,163,184,0.6)",
                      color: "#f9fafb",
                      fontWeight: 700,
                    }}
                  >
                    View Premium plans
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* House Rules PDF */}
          <section
            className="sb-cardglow"
            ref={houseRulesSectionRef as any}
            style={{
              ...card,
              ...(highlightTarget === "house_rules"
                ? {
                    boxShadow:
                      "0 0 0 2px color-mix(in srgb, #0ea5e9 70%, transparent)",
                    borderColor: "color-mix(in srgb, #0ea5e9 70%, var(--border))",
                  }
                : null),
            }}
          >
            <h3 style={{ marginTop: 0 }}>House Rules PDF</h3>
            {prop.regulation_pdf_url ? (
              <div style={{ display: "grid", gap: isNarrow ? 10 : 8 }}>
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    alignItems: "center",
                    gridTemplateColumns: isNarrow ? "1fr" : "repeat(auto-fit, minmax(180px, 220px))",
                    justifyContent: "start",
                  }}
                >
                  <a
                    href={prop.regulation_pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className={PRIMARY_ACTION_CLASS}
                    style={{
                      ...PRIMARY_ACTION_STYLE,
                      width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    Open
                  </a>
                  <button
                    className="sb-btn sb-cardglow"
                    onClick={triggerPdfUpload}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Replace PDF
                  </button>
                  <button
                    className="sb-btn"
                    type="button"
                    onClick={() => {
                      if (currentPlan !== "premium") {
                        setAiPremiumPopupOpen(true);
                        return;
                      }
                      openAiHouseRulesModalFromPdf();
                    }}
                    title="Read PDF text and prepare it as source for the guest AI assistant"
                    style={{
                      ...AI_ACTION_STYLE,
                      width: "100%",
                    }}
                  >
                    Read &amp; prepare text for AI
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: isNarrow ? "space-between" : undefined,
                  }}
                >
                  <Info text={PDF_INFO} />
                  <small style={{ color: "var(--muted)" }}>
                    Uploaded{" "}
                    {prop.regulation_pdf_uploaded_at
                      ? new Date(prop.regulation_pdf_uploaded_at).toLocaleString()
                      : ""}
                  </small>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ color:'var(--muted)' }}>No PDF uploaded.</span>
                <button
                  className="sb-btn"
                  onClick={() => { setHighlightUpload(false); triggerPdfUpload(); }}
                  ref={uploadBtnRef}
                  style={{
                    border: highlightUpload ? '2px solid var(--primary)' : undefined,
                    boxShadow: highlightUpload ? '0 0 0 4px color-mix(in srgb, var(--primary) 25%, transparent)' : undefined,
                    transition: 'box-shadow 160ms ease, border-color 160ms ease',
                  }}
                >
                  Upload PDF
                </button>
                <Info text={PDF_INFO} />
              </div>
            )}
          </section>

          {noPdfOpen && (
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e)=>{ e.stopPropagation(); }}
              style={{ position:'fixed', inset:0, zIndex: 240, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:12,
                       paddingTop:'calc(var(--safe-top, 0px) + 12px)', paddingBottom:'calc(var(--safe-bottom, 0px) + 12px)' }}>
              <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(560px, 100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'grid', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <strong>House Rules recommended</strong>
                </div>
                <div style={{ color:'var(--text)', display:'grid', gap:8 }}>
                  <div>
                    It’s best to upload your House Rules so guests see and sign them when they complete check-in and so
                    we can prepare the text that the Guest AI assistant will use to support them.*
                  </div>
                  <small style={{ color:'var(--muted)' }}>
                    You can continue without it, but guests won’t see your rules until you upload them.<br />
                    * Guest AI assistant is available only on Premium plans.
                  </small>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8, flexWrap:'wrap' }}>
                  <button
                    className="sb-btn"
                    onClick={() => {
                      setNoPdfOpen(false);
                      openSourcePicker();
                    }}
                  >
                    I will upload later
                  </button>
                  <button
                    className="sb-btn sb-btn--primary"
                    onClick={() => {
                      setNoPdfOpen(false);
                      setHighlightUpload(true);
                      try {
                        uploadBtnRef.current?.focus();
                        uploadBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      } catch {}
                      setTimeout(() => { try { triggerPdfUpload(); } catch {} }, 60);
                    }}
                  >
                    Upload now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contact details */}
          <section
            className="sb-cardglow"
            style={{
              ...card,
              ...(highlightTarget === "contacts"
                ? {
                    boxShadow:
                      "0 0 0 2px color-mix(in srgb, #0ea5e9 70%, transparent)",
                    borderColor: "color-mix(in srgb, #0ea5e9 70%, var(--border))",
                  }
                : null),
            }}
          >
            <h3 style={{ marginTop: 0 }}>Property Contact</h3>
            <form onSubmit={saveContacts} style={{ display:'grid', gap:12, maxWidth:560 }}>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Email</label>
                <input
                  type="email"
                  value={prop.contact_email ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_email: v } : prev); }}
                  onBlur={(e) => autoSaveContactField('email', e.currentTarget.value)}
                  placeholder="example@hotel.com"
                  style={FIELD}
                />
              </div>
	              <div>
	                <label style={{ display:'block', marginBottom:6 }}>Phone</label>
	                <div ref={dialWrapRef} style={{ position: "relative" }}>
	                  <button
	                    type="button"
	                    onClick={() => setDialOpen((v) => !v)}
	                    aria-label="Dial code"
	                    style={{
	                      position: "absolute",
	                      left: 8,
	                      top: "50%",
	                      transform: "translateY(-50%)",
	                      zIndex: 2,
	                      border: "1px solid var(--border)",
	                      background: "var(--card)",
	                      color: "var(--text)",
	                      borderRadius: 8,
	                      padding: "6px 8px",
	                      fontWeight: 800,
	                      cursor: "pointer",
	                      display: "inline-flex",
	                      alignItems: "center",
	                      gap: 6,
	                    }}
	                  >
	                    <span aria-hidden>
	                      {flagEmoji((DIAL_OPTIONS.find((d) => d.code === contactDial)?.cc) || "RO")}
	                    </span>
	                    <span>{contactDial}</span>
	                  </button>
	                  <input
	                    type="tel"
	                    value={contactPhoneLocal}
	                    onChange={(e) => {
	                      const v = e.currentTarget.value;
	                      setContactPhoneLocal(v);
	                      const full = composeFullPhone(contactDial, v);
	                      setProp((prev) => (prev ? { ...prev, contact_phone: full } : prev));
	                    }}
	                    onBlur={() => autoSaveContactField("phone", composeFullPhone(contactDial, contactPhoneLocal))}
	                    placeholder="712 345 678"
	                    style={{ ...FIELD, paddingLeft: 96 }}
	                  />
	                  {dialOpen && (
	                    <div
	                      role="listbox"
	                      style={{
	                        position: "absolute",
	                        left: 8,
	                        top: "calc(100% + 6px)",
	                        zIndex: 30,
	                        background: "var(--panel)",
	                        border: "1px solid var(--border)",
	                        borderRadius: 10,
	                        padding: 6,
	                        display: "grid",
	                        gap: 4,
	                        maxHeight: 240,
	                        overflow: "auto",
	                        width: "min(420px, calc(100vw - 32px))",
	                      }}
	                    >
	                      {DIAL_OPTIONS.map((opt) => (
	                        <button
	                          key={`${opt.cc}-${opt.code}`}
	                          type="button"
	                          onClick={() => {
	                            setContactDial(opt.code);
	                            setDialOpen(false);
	                            const full = composeFullPhone(opt.code, contactPhoneLocal);
	                            setProp((prev) => (prev ? { ...prev, contact_phone: full } : prev));
	                            autoSaveContactField("phone", full);
	                          }}
	                          style={{
	                            padding: "6px 8px",
	                            borderRadius: 8,
	                            border: "1px solid var(--border)",
	                            background: opt.code === contactDial ? "var(--primary)" : "var(--card)",
	                            color: opt.code === contactDial ? "#0c111b" : "var(--text)",
	                            fontWeight: 800,
	                            cursor: "pointer",
	                            display: "flex",
	                            alignItems: "center",
	                            gap: 8,
	                            textAlign: "left",
	                          }}
	                        >
	                          <span aria-hidden>{flagEmoji(opt.cc)}</span>
	                          <span style={{ width: 56, display: "inline-block" }}>{opt.code}</span>
	                          <span style={{ color: "var(--muted)", fontWeight: 600 }}>{opt.name}</span>
	                        </button>
	                      ))}
	                    </div>
	                  )}
	                </div>
	              </div>
              <div>
                <label style={{ display:'block', marginBottom:6 }}>Address</label>
                <input
                  value={prop.contact_address ?? ''}
                  onChange={(e) => { const v = e.currentTarget.value; setProp(prev => prev ? { ...prev, contact_address: v } : prev); }}
                  onBlur={(e) => autoSaveContactField('address', e.currentTarget.value)}
                  placeholder="Street, city, optional details"
                  style={FIELD}
                />
              </div>
              {/* Overlay selector + Save: desktop on one row; mobile stacked with full-width Save */}
              {isNarrow ? (
                <div style={{ display:'grid', gap:8 }}>
                  <div>
                    <label style={{ display:'block', marginBottom:6 }}>Overlay position on banner</label>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <select
                        value={prop.contact_overlay_position ?? ''}
                        onChange={(e)=>{ const v = (e.currentTarget.value || '') as any; setProp(prev => prev ? { ...prev, contact_overlay_position: (v || null) } : prev); }}
                        style={{ ...FIELD, maxWidth: 520 }}
                      >
                        <option value="">- select -</option>
                        <option value="top">top</option>
                        <option value="center">center</option>
                        <option value="down">down</option>
                      </select>
                      <Info text={'These contact details are shown on top of your banner image as a glass card. Choose where to place it: at the top, centered, or near the bottom.'} />
                    </div>
                  </div>
                  <div>
                    <button
                      type="submit"
                      className={PRIMARY_ACTION_CLASS}
                      style={{ ...PRIMARY_ACTION_STYLE, width: "100%" }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <label style={{ display:'block', margin:0 }}>Overlay position on banner</label>
                    <select
                      value={prop.contact_overlay_position ?? ''}
                      onChange={(e)=>{ const v = (e.currentTarget.value || '') as any; setProp(prev => prev ? { ...prev, contact_overlay_position: (v || null) } : prev); }}
                      style={{ ...FIELD, maxWidth: 240 }}
                    >
                      <option value="">- select -</option>
                      <option value="top">top</option>
                      <option value="center">center</option>
                      <option value="down">down</option>
                    </select>
                    <Info text={'These contact details are shown on top of your banner image as a glass card. Choose where to place it: at the top, centered, or near the bottom.'} />
                  </div>
                  <div>
                    <button type="submit" className={PRIMARY_ACTION_CLASS} style={PRIMARY_ACTION_STYLE}>
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Social links quick editor */}
              {!(contactsWizardOpen || houseRulesWizardOpen) && (
                <SocialLinksEditor prop={prop} setProp={setProp} supabase={supabase} setStatus={setStatus} />
              )}
            </form>
          </section>

          {/* Presentation Image */}
          <section
            className="sb-cardglow"
            style={{
              ...card,
              ...(highlightTarget === "picture"
                ? {
                    boxShadow:
                      "0 0 0 2px color-mix(in srgb, #0ea5e9 70%, transparent)",
                    borderColor: "color-mix(in srgb, #0ea5e9 70%, var(--border))",
                  }
                : null),
            }}
          >
            <h3 style={{ marginTop: 0 }}>Presentation Image</h3>
            <div style={{ display:'grid', gap:10 }}>
              {prop.presentation_image_url ? (
                <div style={{ display:'grid', gap:8 }}>
                  <img src={prop.presentation_image_url} alt="Presentation" style={{ width: 420, maxWidth:'100%', height: 240, objectFit:'cover', borderRadius: 12, border:'1px solid var(--border)', background:'#fff' }} />
                  <small style={{ color:'var(--muted)' }}>
                    Uploaded {prop.presentation_image_uploaded_at ? new Date(prop.presentation_image_uploaded_at).toLocaleString() : ''}
                  </small>
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      alignItems: "center",
                      gridTemplateColumns: isNarrow ? "repeat(2, minmax(0, 1fr))" : "repeat(2, minmax(180px, 220px))",
                      justifyContent: "start",
                    }}
                  >
                    <a
                      href={prop.presentation_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="sb-btn sb-cardglow"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Preview
                    </a>
                    <button
                      className="sb-btn sb-cardglow"
                      onClick={triggerImageUpload}
                      ref={imageUploadBtnRef}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Replace image
                    </button>
                  </div>
                  <div>
                    <Info text={IMAGE_INFO} />
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ color:'var(--muted)' }}>No image uploaded.</span>
                  <button className="sb-btn sb-cardglow" onClick={triggerImageUpload} ref={imageUploadBtnRef}>Upload image</button>
                  <Info text={IMAGE_INFO} />
                </div>
              )}
            </div>
          </section>
        </>
      )}
      {/* Source picker modal */}
      {showSrc && (
        <div role="dialog" aria-modal="true" onClick={()=>setShowSrc(false)}
          style={{ position:'fixed', inset:0, zIndex: 260, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', padding:12 }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(520px, 100%)', padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <strong>Select Check‑in Source</strong>
              <button
                className="sb-btn sb-cardglow sb-btn--icon"
                type="button"
                aria-label="Close"
                title="Close"
                onClick={()=>setShowSrc(false)}
                style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <div style={{ display:'grid', gap:8 }}>
              {providers.map(p => (
                <button key={p.slug} className="sb-btn" onClick={()=>pickProvider(p.slug)} style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'flex-start' }}>
                  {p.logo ? (
                    <img src={p.logo} alt="" width={18} height={18} style={{ borderRadius:4 }} />
                  ) : (
                    <span aria-hidden>🔗</span>
                  )}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showImagePrompt && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e)=>e.stopPropagation()}
          style={{ position:'fixed', inset:0, zIndex: 265, background:'rgba(0,0,0,0.55)', display:'grid', placeItems:'center', padding:12,
                   paddingTop:'calc(var(--safe-top, 0px) + 12px)', paddingBottom:'calc(var(--safe-bottom, 0px) + 12px)' }}>
          <div onClick={(e)=>e.stopPropagation()} className="sb-card" style={{ width:'min(540px, 100%)', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'grid', gap:12, position:'relative' }}>
            <button
              aria-label="Close"
              onClick={() => { setShowImagePrompt(false); setImagePromptDismissed(true); }}
              style={{ position:'absolute', top:12, right:12, width:28, height:28, borderRadius:999, border:'1px solid var(--border)', background:'var(--card)', cursor:'pointer', fontWeight: 700 }}
            >
              ×
            </button>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingRight:32 }}>
              <strong>Upload a real photo of your property</strong>
            </div>
            <div style={{ color:'var(--text)', display:'grid', gap:8 }}>
              <div>Your current photo is a generic placeholder. Upload your real property photo — it shows up in the personalized check-in form.</div>
              <ul style={{ margin:0, paddingLeft:18, color:'var(--muted)', display:'grid', gap:6 }}>
                <li>Guests see the photo while completing the check-in form.</li>
                <li>With contact details filled in, guests can reach you easily from automated/scheduled messages.</li>
              </ul>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, flexWrap:'wrap' }}>
              <button
                className="sb-btn"
                onClick={() => { setShowImagePrompt(false); setImagePromptDismissed(true); }}
              >
                Ok
              </button>
              <button
                className="sb-btn sb-btn--primary"
                onClick={() => {
                  setShowImagePrompt(false);
                  setImagePromptDismissed(true);
                  try {
                    imageUploadBtnRef.current?.focus();
                    imageUploadBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } catch {}
                  setTimeout(() => { try { triggerImageUpload(); } catch {} }, 80);
                }}
              >
                Upload now
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function SocialLinksEditor({ prop, setProp, supabase, setStatus }: {
  prop: Property;
  setProp: React.Dispatch<React.SetStateAction<Property | null>>;
  supabase: ReturnType<typeof createClient>;
  setStatus: React.Dispatch<React.SetStateAction<"Idle" | "Saving…" | "Synced" | "Error">>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  type Key = 'facebook'|'instagram'|'tiktok'|'website'|'location';
  const [active, setActive] = useState<Key | null>(null);
  const [draft, setDraft] = useState<string>("");

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true; if (attr === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
  });
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    try { m?.addEventListener('change', onChange); } catch { m?.addListener?.(onChange); }
    const root = document.documentElement;
    const mo = new MutationObserver(() => {
      const t = root.getAttribute('data-theme');
      if (t === 'dark') setIsDark(true); else if (t === 'light') setIsDark(false);
    });
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { try { m?.removeEventListener('change', onChange); } catch { m?.removeListener?.(onChange); } mo.disconnect(); };
  }, []);

  function icon(name: Key) {
    const suffix = isDark ? 'fordark' : 'forlight';
    if (name === 'location') {
      return `/social_location_${suffix}.png`;
    }
    return `/${name}_${suffix}.png`;
  }

  function getVal(k: Key): string {
    if (!prop) return '';
    if (k === 'facebook') return prop.social_facebook || '';
    if (k === 'instagram') return prop.social_instagram || '';
    if (k === 'tiktok') return prop.social_tiktok || '';
    if (k === 'location') return prop.social_location || '';
    return prop.social_website || '';
  }
  function patchLocal(k: Key, v: string | null) {
    setProp(prev => prev ? {
      ...prev,
      social_facebook: k === 'facebook' ? (v || null) : prev.social_facebook ?? null,
      social_instagram: k === 'instagram' ? (v || null) : prev.social_instagram ?? null,
      social_tiktok: k === 'tiktok' ? (v || null) : prev.social_tiktok ?? null,
      social_website: k === 'website' ? (v || null) : prev.social_website ?? null,
      social_location: k === 'location' ? (v || null) : prev.social_location ?? null,
    } : prev);
  }
  async function save(k: Key, val: string) {
    if (!prop) return;
    setStatus('Saving…');
    const update: Record<string, string | null> = {};
    const normalized = (val || '').trim() || null;
    update[
      k === 'facebook' ? 'social_facebook'
      : k === 'instagram' ? 'social_instagram'
      : k === 'tiktok' ? 'social_tiktok'
      : k === 'location' ? 'social_location'
      : 'social_website'
    ] = normalized;
    const { error } = await supabase.from('properties').update(update).eq('id', prop.id);
    if (error) { setStatus('Error'); return; }
    patchLocal(k, normalized);
    setStatus('Synced'); setTimeout(() => setStatus('Idle'), 800);
  }

  async function commitActive() {
    if (!active) return;
    if (typeof document !== "undefined" && document.documentElement.getAttribute("data-p4h-modal-open") === "1") {
      return;
    }
    const current = getVal(active);
    if ((current || '') === (draft || '')) return; // no change
    await save(active, draft);
  }

  function onPick(k: Key) {
    // save previous draft before switching
    void commitActive().catch(() => {});
    setActive(k);
    setDraft(getVal(k));
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (typeof document !== "undefined" && document.documentElement.getAttribute("data-p4h-modal-open") === "1") {
        return;
      }
      const t = e.target as Node | null;
      if (containerRef.current && t && !containerRef.current.contains(t)) {
        void commitActive().catch(() => {});
      }
    }
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [active, draft]);

  return (
    <div ref={containerRef}>
      <label style={{ display:'block', marginBottom:6 }}>Social Links</label>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        {(['facebook','instagram','tiktok','website','location'] as Key[]).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            title={k.charAt(0).toUpperCase() + k.slice(1)}
            style={{ background:'transparent', border:'none', padding:0, cursor:'pointer', lineHeight:0, outline:'none' }}
          >
            <img src={icon(k)} alt={k} width={24} height={24} />
          </button>
        ))}
      </div>
      {active && (
        <div style={{ marginTop:8 }}>
          <input
            autoFocus
            placeholder={`Paste ${active} URL`}
            value={draft}
            onChange={(e)=>setDraft(e.currentTarget.value)}
            onBlur={() => { void commitActive().catch(() => {}); }}
            style={FIELD}
          />
          <small style={{ color:'var(--muted)' }}>
            Tip: Clear the field to remove the link. It saves automatically on click away.
          </small>
        </div>
      )}
    </div>
  );
}
