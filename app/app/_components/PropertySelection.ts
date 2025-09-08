"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  const key = opts?.storageKey || SELECTED_PROPERTY_KEY;
  const ids = useMemo(() => properties.map((p) => p.id), [properties]);

  // Seed with first available to avoid hydration mismatch; update after mount
  const [propertyId, _setPropertyId] = useState<string>(() => ids[0] ?? "");

  // On mount or when the list changes, try to restore from URL or localStorage
  useEffect(() => {
    const fromUrl = readFromURL();
    const fromLS = readFromLocalStorage(key);
    const next = ensureValid(fromUrl ?? fromLS, ids);
    if (next && next !== propertyId) {
      _setPropertyId(next);
      writeToLocalStorage(key, next);
      emitSelectedChange(next);
    }
  }, [ids.join("|"), key]);

  const setPropertyId = useCallback((id: string) => {
    _setPropertyId(id);
    writeToLocalStorage(key, id);
    emitSelectedChange(id);
  }, [key]);

  // Optional: react to external changes in the same tab/session
  useEffect(() => {
    function onEvt(e: Event) {
      const d = (e as CustomEvent).detail as { id?: string } | undefined;
      if (d?.id && d.id !== propertyId && ids.includes(d.id)) {
        _setPropertyId(d.id);
      }
    }
    window.addEventListener("p4h:selectedProperty", onEvt as EventListener);
    return () => window.removeEventListener("p4h:selectedProperty", onEvt as EventListener);
  }, [propertyId, ids.join("|")]);

  return [propertyId, setPropertyId] as const;
}

