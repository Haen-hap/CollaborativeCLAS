import { useState } from "react";

export default function ConsentModal({ onAccept, onClose }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const canContinue = termsAccepted && privacyAccepted;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Before you begin</h2>

        <div className="modal-text">
          <p>
            Please review and accept the Terms of Use and Privacy Policy to continue.
          </p>
        </div>

        <div className="modal-checkboxes">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>I agree to the Terms of Use</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
            />
            <span>I agree to the Privacy Policy</span>
          </label>
        </div>

        <div className="modal-actions">
          <button
            className="modal-button secondary"
            onClick={onClose}
          >
            Close
          </button>

          <button
            className="modal-button primary"
            onClick={onAccept}
            disabled={!canContinue}
          >
            Agree and continue
          </button>
        </div>
      </div>
    </div>
  );
}
