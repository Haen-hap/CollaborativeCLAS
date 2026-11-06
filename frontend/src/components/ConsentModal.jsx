export default function ConsentModal({ onAccept, onClose }) {
  return (
    <div className="nina-consent-panel fade">
      <div className="q">Tu información es solo tuya</div>

      <div className="pts">
        <div>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a9 9 0 100 18 9 9 0 000-18z M6 6l12 12" />
          </svg>
          No pedimos tu nombre
        </div>
        <div>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4a4 4 0 100 8 4 4 0 000-8z M4 21c0-5 4-7 8-7s8 2 8 7" />
          </svg>
          No pedimos tu cédula
        </div>
        <div>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 11h12v10H6z M8 11V7a4 4 0 018 0v4" />
          </svg>
          Nada se guarda de ti
        </div>
      </div>

      <p className="sub">
        Solo jugamos. Tus respuestas son anónimas, como manda la Ley 81 de Panamá.
      </p>

      <div style={{ flex: 1 }} />

      <button type="button" className="btn" onClick={onAccept}>
        Estoy de acuerdo
      </button>

      <button type="button" className="btn alt" onClick={onClose}>
        No, gracias
      </button>
    </div>
  );
}
