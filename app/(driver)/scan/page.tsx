import QrScanner from "./QrScanner";

export default function ScanPage() {
  return (
    <div>
      <h1 className="mb-4 font-display text-xl font-bold text-ink">Scan Vehicle QR</h1>
      <QrScanner />
    </div>
  );
}
