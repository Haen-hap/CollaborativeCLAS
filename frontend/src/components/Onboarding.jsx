import { useState } from "react";
import ConsentModal from "./ConsentModal";

export default function Onboarding({ onComplete }) {
  const [showConsent, setShowConsent] = useState(false);

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <h1 className="onboarding-title">CLAS</h1>
        <p className="onboarding-subtitle">
          Collaborative Literacy Assessment System
        </p>

        <div className="onboarding-description">
          <p>
            Answer a few short questions to help us understand literacy needs
            in your community. You can complete the assessment at your own pace.
          </p>
        </div>

        <button
          className="onboarding-button"
          onClick={() => setShowConsent(true)}
        >
          Get started
        </button>
      </div>

      {showConsent && (
        <ConsentModal
          onAccept={() => {
            setShowConsent(false);
            onComplete();
          }}
          onClose={() => setShowConsent(false)}
        />
      )}
    </div>
  );
}
