"use client";

import { useState } from "react";

export default function QrCardActions({
  qrDataUrl,
  vehicleName,
  registration,
}: {
  qrDataUrl: string;
  vehicleName: string;
  registration: string;
}) {
  const [error, setError] = useState<string | null>(null);

  // Draws the QR code plus vehicle name/registration onto a canvas, then
  // resolves a PNG Blob for it. Wrapped in a promise since image loading
  // is async and canvas.toBlob is callback-based.
  const renderCard = () =>
    new Promise<Blob>((resolve, reject) => {
      const qrImage = new Image();
      qrImage.onload = () => {
        const padding = 32;
        const qrSize = qrImage.width;
        const textBlockHeight = 90;

        const canvas = document.createElement("canvas");
        canvas.width = qrSize + padding * 2;
        canvas.height = qrSize + padding * 2 + textBlockHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(qrImage, padding, padding, qrSize, qrSize);

        const centerX = canvas.width / 2;
        ctx.textAlign = "center";
        ctx.fillStyle = "#070E1F";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(vehicleName, centerX, padding + qrSize + 40);
        ctx.fillStyle = "#5B6472";
        ctx.font = "20px sans-serif";
        ctx.fillText(registration, centerX, padding + qrSize + 70);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not generate image"));
        }, "image/png");
      };
      qrImage.onerror = () => reject(new Error("Could not load QR code image"));
      qrImage.src = qrDataUrl;
    });

  const handleDownload = async () => {
    setError(null);
    try {
      const blob = await renderCard();
      const filename = `${vehicleName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // On phones (especially iOS, including installed PWAs) the classic
      // <a download> click either does nothing or just opens the image —
      // there's no real "Downloads" destination the way desktop has one.
      // The Web Share API's native sheet includes "Save Image", which is
      // the actual save-to-device action on those platforms, so prefer it
      // whenever the browser can share a file.
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: filename });
          return;
        } catch (shareError) {
          // AbortError just means the user closed the share sheet — not a
          // real failure, don't fall through to the desktop-style download.
          if (shareError instanceof Error && shareError.name === "AbortError") return;
          // Any other share failure: fall through and try the download
          // link below instead of leaving the user with nothing.
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      // Needs to be in the document for .click() to reliably trigger a
      // download in every browser, not just most of them.
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't generate the download. Try Print instead, or reload the page and try again.");
    }
  };

  return (
    <div className="mt-6 print:hidden">
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-xl bg-ink py-3 text-sm font-semibold text-paper"
        >
          Print
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 rounded-xl border border-steel/30 py-3 text-center text-sm font-semibold text-ink"
        >
          Download
        </button>
      </div>
      {error && <p className="mt-2 text-center text-xs font-medium text-rust">{error}</p>}
    </div>
  );
}
