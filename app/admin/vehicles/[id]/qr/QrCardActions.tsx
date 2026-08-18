"use client";

export default function QrCardActions({ qrDataUrl, vehicleName }: { qrDataUrl: string; vehicleName: string }) {
  return (
    <div className="mt-6 flex gap-2 print:hidden">
      <button
        onClick={() => window.print()}
        className="flex-1 rounded-xl bg-ink py-3 text-sm font-semibold text-paper"
      >
        Print
      </button>
      <a
        href={qrDataUrl}
        download={`${vehicleName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`}
        className="flex-1 rounded-xl border border-steel/30 py-3 text-center text-sm font-semibold text-ink"
      >
        Download
      </a>
    </div>
  );
}
