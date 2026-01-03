"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// LocalStorage key for persisting the selected property across pages
export const SELECTED_PROPERTY_KEY = "p4h:selectedPropertyId";

function readFromLocalStorage(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToLocalStorage(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  } catch {}
}

function readFromURL(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const u = new URL(window.location.href);
    const q = u.searchParams.get("property");
    return q || null;
  } catch {
    return null;
  }
}

function writeToURL(id: string) {
  try {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("property", id);
    window.history.replaceState({}, "", u.toString());
  } catch {}
}

function ensureValid(id: string | null | undefined, ids: string[]): string | "" {
  if (!id) return ids[0] ?? "";
  return ids.includes(id) ? id : ids[0] ?? "";
}

// Dispatch a simple event so other mounted components in the same session can react
function emitSelectedChange(id: string) {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("p4h:selectedProperty", { detail: { id } }));
  } catch {}
}

export function usePersistentProperty(
  properties: { id: string }[],
  opts?: { storageKey?: string }
) {
  const { propertyId, setPropertyId } = usePersistentPropertyState(properties, opts);
  return [propertyId, setPropertyId] as const;
}

export function usePersistentPropertyState(
  properties: { id: string }[],
  opts?: { storageKey?: string }
) {
  const key = opts?.storageKey || SELECTED_PROPERTY_KEY;
  const ids = useMemo(() => properties.map((p) => p.id), [properties]);

  const [propertyId, _setPropertyId] = useState<string>(() => ids[0] ?? "");
  const [ready, setReady] = useState(false);
  const userSetRef = useRef(false);
  const propertyIdRef = useRef(propertyId);
  useEffect(() => { propertyIdRef.current = propertyId; }, [propertyId]);

  const apply = useCallback((id: string, opts?: { emit?: boolean }) => {
    const next = ensureValid(id, ids);
    _setPropertyId(next);
    writeToLocalStorage(key, next);
    writeToURL(next);
    if (opts?.emit !== false) emitSelectedChange(next);
  }, [ids.join("|"), key]);

  // On mount (and whenever the list changes), restore from URL/localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setReady(false);
    const fromUrl = readFromURL();
    const fromLS = readFromLocalStorage(key);
    const base = userSetRef.current
      ? propertyIdRef.current
      : (fromUrl ?? fromLS ?? propertyIdRef.current);
    apply(base, { emit: true });
    setReady(true);
  }, [apply, key]);

  const setPropertyId = useCallback((id: string) => {
    userSetRef.current = true;
    apply(id, { emit: true });
    setReady(true);
  }, [apply]);

  // React to external changes in the same tab/session.
  useEffect(() => {
    function onEvt(e: Event) {
      const d = (e as CustomEvent).detail as { id?: string } | undefined;
      const next = d?.id;
      if (!next) return;
      if (!ids.includes(next)) return;
      if (next === propertyId) return;
      apply(next, { emit: false });
      setReady(true);
    }
    window.addEventListener("p4h:selectedProperty", onEvt as EventListener);
    return () => window.removeEventListener("p4h:selectedProperty", onEvt as EventListener);
  }, [apply, propertyId, ids.join("|")]);

  return { propertyId, setPropertyId, ready } as const;
}
