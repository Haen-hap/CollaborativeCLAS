import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LanguageSelector, useI18n } from "../utils/i18n";
import { resolveLanPortalUrl } from "../utils/lanPortal";
import { buildQrMatrixGrid, drawMatrixGridToCanvas } from "../utils/qrCode";

const EXPORT_FILENAME = "gbm-cclas-credential-qr.png";
const LAN_INFO_POLL_MS = 5000;

export default function QrEntryPage() {
  const { t } = useI18n();
  const matrixCanvasRef = useRef(null);
  const [portalEndpoint, setPortalEndpoint] = useState(() =>
    resolveLanPortalUrl({
      lanInfo: null,
      locationOrigin: typeof window !== "undefined" ? window.location.origin : "",
    }),
  );
  const [activeNetworkMode, setActiveNetworkMode] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshLanInfo = async () => {
      try {
        const response = await fetch("/lan-info.json", { cache: "no-store" });
        if (!response.ok) throw new Error("lan-info unavailable");
        const lanInfo = await response.json();
        const resolvedEndpoint = resolveLanPortalUrl({
          lanInfo,
          locationOrigin: window.location.origin,
        });
        setPortalEndpoint(resolvedEndpoint);

        let nextMode = null;
        if (resolvedEndpoint && lanInfo?.ipv4) {
          nextMode =
            lanInfo.mode === "hotspot"
              ? `Hotspot (${lanInfo.ipv4})`
              : `LAN / Wi-Fi (${lanInfo.ipv4})`;
        }
        setActiveNetworkMode(nextMode);
      } catch {
        setPortalEndpoint(
          resolveLanPortalUrl({
            lanInfo: null,
            locationOrigin: window.location.origin,
          }),
        );
        setActiveNetworkMode(null);
      }
    };

    refreshLanInfo();
    const pollTimer = window.setInterval(refreshLanInfo, LAN_INFO_POLL_MS);
    return () => window.clearInterval(pollTimer);
  }, []);

  const synthesisState = useMemo(() => {
    if (!portalEndpoint) {
      return {
        isReady: false,
        moduleGrid: null,
        faultMessage: "",
      };
    }

    try {
      const moduleGrid = buildQrMatrixGrid(portalEndpoint);
      return {
        isReady: true,
        moduleGrid,
        faultMessage: "",
      };
    } catch (synthesisFault) {
      return {
        isReady: false,
        moduleGrid: null,
        faultMessage:
          synthesisFault?.message || t("qr.faultDefault"),
      };
    }
  }, [portalEndpoint, t]);

  useEffect(() => {
    const surfaceNode = matrixCanvasRef.current;
    if (!surfaceNode || !synthesisState.moduleGrid) {
      return undefined;
    }

    drawMatrixGridToCanvas(surfaceNode, synthesisState.moduleGrid, {
      pixelScale: 8,
      quietZone: 4,
      darkModuleHex: "#0A192F",
      lightSurfaceHex: "#FFFFFF",
    });

    return () => {
      const ctx2d = surfaceNode.getContext("2d");
      if (ctx2d) {
        ctx2d.clearRect(0, 0, surfaceNode.width, surfaceNode.height);
      }
    };
  }, [synthesisState.moduleGrid]);

  const handleExportTicket = useCallback(() => {
    const surfaceNode = matrixCanvasRef.current;
    if (!surfaceNode || !synthesisState.isReady) {
      return;
    }

    const saveCanvasToDisk = (pngPayloadUrl, shouldRevoke = false) => {
      const ephemeralAnchor = document.createElement("a");
      ephemeralAnchor.href = pngPayloadUrl;
      ephemeralAnchor.download = EXPORT_FILENAME;
      ephemeralAnchor.rel = "noopener";
      document.body.appendChild(ephemeralAnchor);
      ephemeralAnchor.click();
      document.body.removeChild(ephemeralAnchor);

      if (shouldRevoke) {
        window.setTimeout(() => URL.revokeObjectURL(pngPayloadUrl), 250);
      }
    };

    if (typeof surfaceNode.toBlob === "function") {
      surfaceNode.toBlob((pngBlob) => {
        if (!pngBlob) {
          saveCanvasToDisk(surfaceNode.toDataURL("image/png"), false);
          return;
        }
        const objectUrl = URL.createObjectURL(pngBlob);
        saveCanvasToDisk(objectUrl, true);
      }, "image/png");
      return;
    }

    saveCanvasToDisk(surfaceNode.toDataURL("image/png"), false);
  }, [synthesisState.isReady]);

  return (
    <div className="gbm-credential-stage">
      <article
        className="gbm-print-widget"
        aria-labelledby="gbm-credential-heading"
      >
        <header className="gbm-credential-banner">
          <div className="gbm-lanyard-slot" aria-hidden="true" />
          <div className="gbm-credential-header-row">
            <span className="gbm-brand-monogram">
              GBM<b>CCLAS</b>
            </span>
            <div className="gbm-credential-header-actions">
              <span className="gbm-credential-badge">{t("qr.badge")}</span>
              <LanguageSelector />
            </div>
          </div>
          <p className="gbm-credential-kicker">
            {t("qr.kicker")}
          </p>
          <h1 id="gbm-credential-heading" className="gbm-credential-title">
            {t("qr.title")}
          </h1>
        </header>

        <div className="gbm-credential-body">
          <p className="gbm-credential-summary">
            {t("qr.summary")}
          </p>

          <figure className="gbm-matrix-frame">
            {portalEndpoint ? (
              <canvas
                ref={matrixCanvasRef}
                className="gbm-matrix-canvas"
                role="img"
                aria-label={t("qr.canvasAria", { url: portalEndpoint })}
              />
            ) : (
              <div
                className="gbm-matrix-canvas"
                role="status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 248,
                  boxSizing: "border-box",
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1C2530",
                }}
              >
                Esperando red Wi-Fi o Hotspot...
              </div>
            )}
            {synthesisState.faultMessage ? (
              <figcaption className="gbm-matrix-fault" role="alert">
                {t("qr.faultPrefix", { message: synthesisState.faultMessage })}
              </figcaption>
            ) : (
              <figcaption className="gbm-matrix-caption">
                {t("qr.caption")}
              </figcaption>
            )}
          </figure>

          <dl className="gbm-credential-meta">
            <div className="gbm-meta-item">
              <dt>{t("qr.meta.rootLabel")}</dt>
              <dd>
                {portalEndpoint ? (
                  <a className="gbm-endpoint-link" href={portalEndpoint}>
                    {portalEndpoint}
                  </a>
                ) : (
                  <span>—</span>
                )}
              </dd>
            </div>
            <div className="gbm-meta-item">
              <dt>{t("qr.meta.modeLabel")}</dt>
              <dd>{activeNetworkMode || t("qr.meta.modeValue")}</dd>
            </div>
          </dl>
        </div>

        <footer className="gbm-credential-footer">
          <button
            type="button"
            className="gbm-export-trigger"
            onClick={handleExportTicket}
            disabled={!synthesisState.isReady}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            <span>{t("qr.download")}</span>
          </button>
          <p className="gbm-network-hint">
            {t("qr.networkHint")}
          </p>
        </footer>
      </article>
    </div>
  );
}
