import { useState } from "react";
import ConsentModal from "./ConsentModal";

export default function Onboarding({ onComplete }) {
  const [showConsent, setShowConsent] = useState(false);

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <h1 className="onboarding-title">CCLAS</h1>
        <p className="onboarding-subtitle">
          Collaborative Community Literacy Assessment System
        </p>

        <div className="onboarding-description">
          <p>
            CCLAS is a platform for assessing and improving literacy in the
            community. Through interactive tasks and collaboration, we help
            users develop key reading, comprehension, and critical thinking
            skills.
          </p>
        </div>

        <button
          className="onboarding-button"
          onClick={() => setShowConsent(true)}
        >
          Get Started
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
