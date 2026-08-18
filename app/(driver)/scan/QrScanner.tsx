"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SCANNER_ELEMENT_ID = "qr-reader";

export default function QrScanner() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (handledRef.current) return;
            handledRef.current = true;

            let path: string;
            try {
              path = new URL(decodedText).pathname;
            } catch {
              // Not a full URL — assume it's just the vehicle's qr_identifier.
              path = `/vehicle/${decodedText}`;
            }

            scanner.stop().catch(() => {});
            router.push(path);
          },
          () => {
            // Fires continuously while no code is found — ignored, not an error.
          }
        )
        .catch(() => {
          setError(
            "Couldn't access the camera. Check that you've allowed camera permission for this site, or try a different browser."
          );
        });
    });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [router]);

  return (
    <div>
      <div id={SCANNER_ELEMENT_ID} className="overflow-hidden rounded-2xl" />
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-rust">
          {error}
        </p>
      )}
      <p className="mt-4 text-center text-xs text-steel">Point your camera at the QR code inside the vehicle.</p>
    </div>
  );
}
