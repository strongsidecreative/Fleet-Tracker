"use client";

export default function QrCardActions({
  qrDataUrl,
  vehicleName,
  registration,
}: {
  qrDataUrl: string;
  vehicleName: string;
  registration: string;
}) {
  const handleDownload = () => {
    const qrImage = new Image();
    qrImage.onload = () => {
      const padding = 32;
      const qrSize = qrImage.width;
      const textBlockHeight = 90;

      const canvas = document.createElement("canvas");
      canvas.width = qrSize + padding * 2;
      canvas.height = qrSize + padding * 2 + textBlockHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

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

      const link = document.createElement("a");
      link.download = `${vehicleName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    qrImage.src = qrDataUrl;
  };

  return (
    <div className="mt-6 flex gap-2 print:hidden">
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
  );
}
