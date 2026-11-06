import { useCallback, useEffect, useMemo, useState } from "react";

export const ENTRY_SESSION_STORAGE_KEY = "cclas.kiosk-entry-context";

const REGISTERED_KIOSK_CATALOG = Object.freeze({
  PTYK001: { code: "PTYK001", label: "Kiosco Curundú", zoneCode: "Z001" },
  PTYK002: { code: "PTYK002", label: "Kiosco Bethania", zoneCode: "Z002" },
  PTYK003: { code: "PTYK003", label: "Kiosco Ancón", zoneCode: "Z003" },
});

/**
 * US-01 Canonical Banner Copy:
 * - KIOSK origin:   "Play for 2 minutes and win a prize!"
 *                   -> ES: "Juega 2 minutos y gana un premio"
 * - UNKNOWN origin: "Play for 2 minutes and help your community!"
 *                   -> ES: "Juega 2 minutos y ayuda a tu comunidad"
 */
export const US01_WELCOME_COPY = Object.freeze({
  KIOSK: {
    headlineEs: "Juega 2 minutos y gana un premio",
    headlineSpecEn: "Play for 2 minutes and win a prize!",
    subheadlineEs: "Ayuda a Nina a cruzar el barrio.",
    speechEs: "Juega dos minutos y gana un premio",
  },
  UNKNOWN: {
    headlineEs: "Juega 2 minutos y ayuda a tu comunidad",
    headlineSpecEn: "Play for 2 minutes and help your community!",
    subheadlineEs: "Ayuda a Nina a cruzar el barrio.",
    speechEs: "Juega dos minutos y ayuda a tu comunidad",
  },
});

export function parseKioskEntryQuery(rawSearch = "") {
  const query =
    typeof rawSearch === "string"
      ? rawSearch
      : typeof window !== "undefined"
        ? window.location.search
        : "";

  const params = new URLSearchParams(query);
  const rawKioskToken = (params.get("kiosk") || "").trim().toUpperCase();
  const rawAssistedToken = (params.get("assisted") || "").trim().toLowerCase();

  const matchedStation = REGISTERED_KIOSK_CATALOG[rawKioskToken] || null;
  const hasValidKiosk = Boolean(matchedStation);

  const originTag = hasValidKiosk ? "KIOSK" : "UNKNOWN";
  const resolvedStationCode = hasValidKiosk ? matchedStation.code : "DIRECT_WEB";
  const isFacilitatorAssisted =
    rawAssistedToken === "1" || rawAssistedToken === "true";

  const copyDeck = US01_WELCOME_COPY[originTag];

  return {
    rawKioskParam: rawKioskToken || null,
    stationCode: resolvedStationCode,
    stationLabel: matchedStation ? matchedStation.label : null,
    stationZone: matchedStation ? matchedStation.zoneCode : null,
    isKioskOrigin: hasValidKiosk,
    originTag,
    assistedFlag: isFacilitatorAssisted,
    bannerHeadline: copyDeck.headlineEs,
    bannerHeadlineSpec: copyDeck.headlineSpecEn,
    bannerSubtitle: copyDeck.subheadlineEs,
    spokenPrompt: copyDeck.speechEs,
    sessionPayload: {
      access_point_code: resolvedStationCode,
      kiosk_id: resolvedStationCode,
      origin: originTag,
      assisted_mode: isFacilitatorAssisted,
    },
  };
}

export function readStoredEntryContext() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(ENTRY_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useKioskEntry() {
  const [locationSearch, setLocationSearch] = useState(() =>
    typeof window !== "undefined" ? window.location.search : "",
  );

  const syncFromWindowLocation = useCallback(() => {
    if (typeof window !== "undefined") {
      setLocationSearch(window.location.search);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.addEventListener("popstate", syncFromWindowLocation);
    return () => {
      window.removeEventListener("popstate", syncFromWindowLocation);
    };
  }, [syncFromWindowLocation]);

  const entryContext = useMemo(
    () => parseKioskEntryQuery(locationSearch),
    [locationSearch],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return undefined;
    }

    try {
      window.sessionStorage.setItem(
        ENTRY_SESSION_STORAGE_KEY,
        JSON.stringify(entryContext.sessionPayload),
      );
    } catch {
      // Ignore storage quota or private-mode restrictions.
    }

    return () => {
      // Preserved across onboarding-to-demographic transition; cleaned on session reset.
    };
  }, [entryContext]);

  return entryContext;
}

export default useKioskEntry;
