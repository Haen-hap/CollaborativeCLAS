import { useMemo } from "react";
import { makeQrDataUrl } from "../utils/qrCode";

export default function QrEntryPage() {
  const appUrl = `${window.location.origin}/`;
  const qrImage = useMemo(() => {
    try {
      return { src: makeQrDataUrl(appUrl), error: "" };
    } catch (error) {
      return { src: "", error: error.message };
    }
  }, [appUrl]);

  const downloadQr = () => {
    if (!qrImage.src) return;
    const link = document.createElement("a");
    link.href = qrImage.src;
    link.download = "clas-participant-qr.png";
    link.click();
  };

  return (
    <main className="qr-page">
      <section className="qr-card">
        <p className="qr-eyebrow">CLAS participant entry</p>
        <h1>Scan to get started</h1>
        <p className="qr-intro">Open CLAS on your phone to begin. No account is needed.</p>
        {qrImage.src ? (
          <img className="qr-image" src={qrImage.src} alt={`QR code for ${appUrl}`} />
        ) : (
          <p className="qr-error" role="alert">Could not create the QR code: {qrImage.error}</p>
        )}
        <a className="qr-url" href={appUrl}>{appUrl}</a>
        <button className="qr-download" type="button" onClick={downloadQr} disabled={!qrImage.src}>
          Download QR as PNG
        </button>
        <p className="qr-note">This link works while the app is running. For a local link, keep your phone and this computer on the same Wi-Fi network.</p>
      </section>
    </main>
  );
}
