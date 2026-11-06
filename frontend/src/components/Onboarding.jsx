import { useCallback, useEffect, useState } from "react";
import useKioskEntry from "../hooks/useKioskEntry";
import ConsentModal from "./ConsentModal";
import KioskBadge from "./onboarding/KioskBadge";
import NinaStageScene from "./onboarding/NinaStageScene";
import WelcomeBanner from "./onboarding/WelcomeBanner";

const JOURNEY_MILESTONES = Object.freeze([
  "Perfil",
  "Letreros",
  "Frases",
  "Celular",
  "Seguridad",
]);

const GREETING_SETTLE_DELAY_MS = 3000;

export default function Onboarding({ onComplete }) {
  const entryContext = useKioskEntry();

  const [isPrivacyDrawerOpen, setIsPrivacyDrawerOpen] = useState(false);
  const [characterPose, setCharacterPose] = useState("wave");
  const [facialExpression, setFacialExpression] = useState("open");

  useEffect(() => {
    const settleTimerId = window.setTimeout(() => {
      setCharacterPose("idle");
      setFacialExpression("smile");
    }, GREETING_SETTLE_DELAY_MS);

    return () => {
      window.clearTimeout(settleTimerId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cleanup errors on restricted WebViews.
        }
      }
    };
  }, []);

  const triggerSpokenGuidance = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const narration = new SpeechSynthesisUtterance(entryContext.spokenPrompt);
      narration.lang = "es-PA";
      narration.rate = 0.95;
      window.speechSynthesis.speak(narration);
    } catch {
      // Speech synthesis may be unavailable on certain kiosk devices.
    }
  }, [entryContext.spokenPrompt]);

  const openPrivacyGuarantee = useCallback(() => {
    setCharacterPose("idle");
    setFacialExpression("smile");
    setIsPrivacyDrawerOpen(true);
  }, []);

  const handleConsentGranted = useCallback(() => {
    setCharacterPose("nod");
    setFacialExpression("open");
    setIsPrivacyDrawerOpen(false);
    if (typeof onComplete === "function") {
      onComplete(entryContext.sessionPayload);
    }
  }, [entryContext.sessionPayload, onComplete]);

  const handleConsentDeclined = useCallback(() => {
    setCharacterPose("wave");
    setFacialExpression("smile");
    setIsPrivacyDrawerOpen(false);
  }, []);

  const dialogueBubbleText = isPrivacyDrawerOpen
    ? "Tus datos están a salvo"
    : "¡Hola! Soy Nina";

  return (
    <div
      id="app"
      className="nina-app-shell onboarding-container us01-landing-shell"
      data-origin={entryContext.originTag}
      data-kiosk={entryContext.stationCode}
    >
      <header className="nina-header us01-brand-header">
        <span className="us01-brand-wordmark">
          GBM<b>CCLAS</b>
        </span>
        <KioskBadge
          isKioskOrigin={entryContext.isKioskOrigin}
          stationCode={entryContext.stationCode}
          stationLabel={entryContext.stationLabel}
          originTag={entryContext.originTag}
          assistedFlag={entryContext.assistedFlag}
        />
      </header>

      <div className="gems" id="gems" aria-label="Progreso de etapas">
        {JOURNEY_MILESTONES.map((milestoneLabel) => (
          <svg key={milestoneLabel} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h12l4 6-10 12L2 9z" />
          </svg>
        ))}
      </div>

      <NinaStageScene
        characterPose={characterPose}
        facialExpression={facialExpression}
        dialogueBubbleText={dialogueBubbleText}
      />

      <div id="panel" className="onboarding-content fade us01-action-sheet">
        {!isPrivacyDrawerOpen ? (
          <WelcomeBanner
            headline={entryContext.bannerHeadline}
            headlineSpec={entryContext.bannerHeadlineSpec}
            subtitle={entryContext.bannerSubtitle}
            isKioskOrigin={entryContext.isKioskOrigin}
            originTag={entryContext.originTag}
            stationLabel={entryContext.stationLabel}
            onListenPrompt={triggerSpokenGuidance}
            onStartJourney={openPrivacyGuarantee}
          />
        ) : (
          <ConsentModal
            onAccept={handleConsentGranted}
            onClose={handleConsentDeclined}
          />
        )}
      </div>
    </div>
  );
}
