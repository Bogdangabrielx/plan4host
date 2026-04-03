export function isPushCapable(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function isIosStandaloneWebApp(): boolean {
  if (typeof window === "undefined") return false;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isIOS = /iP(hone|ad|od)/.test(ua);
  if (!isIOS) return false;

  const standaloneMatch =
    !!window.matchMedia &&
    (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches
    );

  return standaloneMatch || (!!("standalone" in navigator) && !!(navigator as any).standalone);
}

function getPushRegistrationTimeoutMs(): number {
  return isIosStandaloneWebApp() ? 20000 : 8000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export async function waitForActivePushRegistration(
  reg: ServiceWorkerRegistration,
  timeoutMs = getPushRegistrationTimeoutMs(),
): Promise<ServiceWorkerRegistration> {
  let registration = reg;
  if (registration.active) return registration;

  const candidate = registration.installing || registration.waiting;
  if (candidate) {
    const activated = await new Promise<boolean>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      }, timeoutMs);

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ok);
      };

      const onStateChange = () => {
        if (candidate.state === "activated") finish(true);
        if (candidate.state === "redundant") finish(false);
      };

      candidate.addEventListener("statechange", onStateChange);
      onStateChange();
    });

    if (activated && registration.active) return registration;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (registration.active) return registration;

    const readyReg = await withTimeout<ServiceWorkerRegistration | null>(
      navigator.serviceWorker.ready,
      1500,
      null,
    );
    if (readyReg?.active) return readyReg;

    try {
      const direct = await navigator.serviceWorker.getRegistration();
      if (direct) registration = direct;
      if (registration.active) return registration;
    } catch {}

    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const firstActive = regs.find((item) => item.active);
      if (firstActive?.active) return firstActive;
      if (!registration && regs[0]) registration = regs[0];
    } catch {}

    await sleep(500);
  }

  throw new Error("service_worker_not_active");
}

export async function getReadyPushRegistration(): Promise<ServiceWorkerRegistration> {
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      reg = regs[0];
    } catch {}
  }
  if (!reg) {
    reg = await navigator.serviceWorker.register("/sw.js");
  }

  return waitForActivePushRegistration(reg);
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushCapable()) return null;

  try {
    const direct = await navigator.serviceWorker.getRegistration();
    const directSub = await direct?.pushManager.getSubscription();
    if (directSub) return directSub;
  } catch {}

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) return sub;
    }
  } catch {}

  try {
    const ready = await withTimeout<ServiceWorkerRegistration | null>(
      navigator.serviceWorker.ready,
      2000,
      null,
    );
    if (ready) return (await ready.pushManager.getSubscription()) || null;
  } catch {}

  return null;
}

export async function ensurePushSubscription(): Promise<PushSubscription> {
  if (!isPushCapable()) {
    throw new Error("push_not_capable");
  }

  const reg = await getReadyPushRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (sub) return sub;

  const keyB64 = (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    (window as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    ""
  ).toString();
  if (!keyB64) {
    throw new Error("missing_vapid_public_key");
  }

  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyB64),
  });
  return sub;
}

export async function syncPushSubscriptionToServer(
  sub: PushSubscription,
  opts?: { propertyId?: string | null },
): Promise<void> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const os =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-os") || ""
      : "";

  const res = await withTimeout(
    fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        property_id: opts?.propertyId || null,
        ua,
        os,
      }),
    }),
    6000,
    null as Response | null,
  );

  if (!res) throw new Error("subscribe_timeout");
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(details || "subscribe_failed");
  }
}

export async function syncExistingPushSubscriptionToServer(): Promise<PushSubscription | null> {
  if (!isPushCapable()) return null;
  if (Notification.permission !== "granted") return null;

  const sub = await getCurrentPushSubscription();
  if (!sub) return null;

  await syncPushSubscriptionToServer(sub);
  return sub;
}
