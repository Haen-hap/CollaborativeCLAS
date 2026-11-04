import { useCallback, useEffect, useMemo, useRef } from "react";
import { buildQrMatrixGrid, drawMatrixGridToCanvas } from "../utils/qrCode";

const EXPORT_FILENAME = "gbm-cclas-credential-qr.png";

function resolvePortalEndpoint() {
  if (typeof window === "undefined") {
    return "/";
  }
  return `${window.location.origin}/`;
}

export default function QrEntryPage() {
  const matrixCanvasRef = useRef(null);
  const portalEndpointUri = useMemo(() => resolvePortalEndpoint(), []);

  const synthesisState = useMemo(() => {
    try {
      const moduleGrid = buildQrMatrixGrid(portalEndpointUri);
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
          synthesisFault?.message || "Unable to synthesize matrix.",
      };
    }
  }, [portalEndpointUri]);

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
            <span className="gbm-credential-badge">CREDENTIAL · QR</span>
          </div>
          <p className="gbm-credential-kicker">
            Punto de Acceso Comunitario · Smart Oasis
          </p>
          <h1 id="gbm-credential-heading" className="gbm-credential-title">
            Pase de Ingreso Digital
          </h1>
        </header>

        <div className="gbm-credential-body">
          <p className="gbm-credential-summary">
            Escanee este código desde la cámara del teléfono para iniciar la
            evaluación sin necesidad de cuenta ni contraseña.
          </p>

          <figure className="gbm-matrix-frame">
            <canvas
              ref={matrixCanvasRef}
              className="gbm-matrix-canvas"
              role="img"
              aria-label={`Código QR de acceso para ${portalEndpointUri}`}
            />
            {synthesisState.faultMessage ? (
              <figcaption className="gbm-matrix-fault" role="alert">
                Error al generar la matriz: {synthesisState.faultMessage}
              </figcaption>
            ) : (
              <figcaption className="gbm-matrix-caption">
                Codificación ISO/IEC 18004 · Nivel L
              </figcaption>
            )}
          </figure>

          <dl className="gbm-credential-meta">
            <div className="gbm-meta-item">
              <dt>Destino raíz</dt>
              <dd>
                <a className="gbm-endpoint-link" href={portalEndpointUri}>
                  {portalEndpointUri}
                </a>
              </dd>
            </div>
            <div className="gbm-meta-item">
              <dt>Modo de entrada</dt>
              <dd>Cero teclado · Anónimo (Ley 81)</dd>
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
            <span>Descargar credencial PNG</span>
          </button>
          <p className="gbm-network-hint">
            Mantenga el teléfono y el servidor en la misma red Wi-Fi cuando
            opere en entorno local de kiosco.
          </p>
        </footer>
      </article>
    </div>
  );
}
