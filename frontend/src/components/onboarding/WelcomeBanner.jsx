/**
 * US-01 Welcome Banner & Zero-Keyboard Action Deck.
 *
 * Spec alignment:
 * - Kiosk present (`?kiosk=PTYK001..003`):
 *   Spec EN: "Play for 2 minutes and win a prize!"
 *   UI ES:   "Juega 2 minutos y gana un premio"
 * - Kiosk missing / unknown (`origin = UNKNOWN`):
 *   Spec EN: "Play for 2 minutes and help your community!"
 *   UI ES:   "Juega 2 minutos y ayuda a tu comunidad"
 *
 * Touch targets strictly enforce >= 48x48 dp for 360x640 viewports.
 */
export default function WelcomeBanner({
  headline,
  headlineSpec,
  subtitle,
  isKioskOrigin,
  originTag,
  stationLabel,
  onListenPrompt,
  onStartJourney,
}) {
  return (
    <section
      className="us01-welcome-banner"
      aria-labelledby="us01-welcome-heading"
      data-origin={originTag}
      data-spec-banner={headlineSpec}
    >
      <div className="us01-banner-card">
        <span className="us01-banner-kicker">
          {isKioskOrigin
            ? `Punto Smart Oasis · ${stationLabel || "Kiosco"}`
            : " Evaluación Comunitaria · Panamá"}
        </span>
        <h1 id="us01-welcome-heading" className="q us01-banner-title">
          {headline}
        </h1>
        <p className="sub us01-banner-subtitle">{subtitle}</p>
      </div>

      <div className="us01-audio-row">
        <button
          type="button"
          className="audio us01-audio-trigger"
          onClick={onListenPrompt}
          aria-label="Escuchar instrucciones en voz alta"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0014 8v8a4.5 4.5 0 002.5-4zM14 3.2v2.1a7 7 0 010 13.4v2.1a9 9 0 000-17.6z" />
          </svg>
        </button>
      </div>

      <div className="us01-cta-spacer" aria-hidden="true" />

      <button
        type="button"
        className="btn onboarding-button us01-start-cta"
        onClick={onStartJourney}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="#FFFFFF"
          aria-hidden="true"
        >
          <path d="M6 3l15 9-15 9z" />
        </svg>
        <span>Jugar</span>
      </button>
    </section>
  );
}
