import QrScanner from "./QrScanner";
import BackButton from "@/components/BackButton";

export default function ScanPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Scan Vehicle QR</h1>
        <BackButton />
      </div>
      <QrScanner />
    </div>
  );
}
