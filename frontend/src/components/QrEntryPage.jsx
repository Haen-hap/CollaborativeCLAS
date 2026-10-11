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
    link.download = "cclas-participant-qr.png";
    link.click();
  };

  return (
    <main className="qr-page">
      <section className="qr-card">
        <p className="qr-eyebrow">CCLAS participant entry</p>
        <h1>Scan to start</h1>
        <p className="qr-intro">This code opens the participant onboarding page. No account or login is required.</p>
        {qrImage.src ? (
          <img className="qr-image" src={qrImage.src} alt={`QR code for ${appUrl}`} />
        ) : (
          <p className="qr-error" role="alert">Could not create the QR code: {qrImage.error}</p>
        )}
        <a className="qr-url" href={appUrl}>{appUrl}</a>
        <button className="qr-download" type="button" onClick={downloadQr} disabled={!qrImage.src}>
          Download QR as PNG
        </button>
        <p className="qr-note">Use the address shown above for this environment. Local network addresses only work while this computer is running the app and the phone is on the same Wi‑Fi.</p>
      </section>
    </main>
  );
}
