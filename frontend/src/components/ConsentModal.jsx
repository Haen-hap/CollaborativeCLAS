import { useState } from "react";

export default function ConsentModal({ onAccept, onClose }) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const canContinue = termsAccepted && privacyAccepted;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Terms of Use and Privacy</h2>

        <div className="modal-text">
          <p>
            Before continuing, please accept our Terms of Use and Privacy
            Policy.
          </p>
        </div>

        <div className="modal-checkboxes">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>I accept the Terms of Use</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
            />
            <span>I accept the Privacy Policy</span>
          </label>
        </div>

        <div className="modal-actions">
          <button
            className="modal-button secondary"
            onClick={onClose}
            disabled={!canContinue}
          >
            Cancel
          </button>

          <button
            className="modal-button primary"
            onClick={onAccept}
            disabled={!canContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
