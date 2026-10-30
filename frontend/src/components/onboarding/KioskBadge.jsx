/**
 * Header status badges for the US-01 Kiosk / QR Entry flow.
 * Renders the origin station pill and, when `?assisted=1` is present,
 * an explicit "Modo asistido" (Assisted Mode) indicator.
 */
export default function KioskBadge({
  isKioskOrigin,
  stationCode,
  stationLabel,
  originTag,
  assistedFlag,
}) {
  return (
    <div className="us01-badge-cluster" data-origin={originTag}>
      <span
        className={`us01-origin-pill ${
          isKioskOrigin ? "is-kiosk" : "is-community"
        }`}
        title={
          isKioskOrigin
            ? `${stationLabel || stationCode} (${stationCode})`
            : "Acceso comunitario general (UNKNOWN)"
        }
      >
        <span className="us01-origin-dot" aria-hidden="true" />
        {isKioskOrigin ? stationCode : "Comunidad"}
      </span>

      {assistedFlag && (
        <span
          id="asst"
          className="us01-assisted-badge"
          role="status"
          aria-label="Modo asistido activo (Assisted Mode)"
          data-assisted="true"
        >
          Modo asistido
        </span>
      )}
    </div>
  );
}
