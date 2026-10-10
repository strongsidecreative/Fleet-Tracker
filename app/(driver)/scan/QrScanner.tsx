"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SCANNER_ELEMENT_ID = "qr-reader";

// html5-qrcode's stop() THROWS (synchronously, not a rejected promise) when
// the scanner is already stopped or still stopping. We used to call it on
// a successful scan AND again when the page unmounted during navigation;
// that second call threw inside React's cleanup and showed the error
// screen for a moment before the vehicle page loaded. Every stop now goes
// through here, runs at most once, and can never throw.
async function safeStop(scanner: any, stoppedRef: { current: boolean }) {
  if (!scanner || stoppedRef.current) return;
  stoppedRef.current = true;
  try {
    await scanner.stop();
  } catch {
    // already stopped, or the camera never started
  }
  try {
    scanner.clear();
  } catch {
    // element already gone
  }
}

export default function QrScanner() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);
  const stoppedRef = useRef(false);

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

            // Stop the camera first, then navigate, so the scanner isn't
            // torn down mid-stop by the page change.
            safeStop(scanner, stoppedRef).finally(() => router.push(path));
          },
          () => {
            // Fires continuously while no code is found — ignored, not an error.
          }
        )
        .catch(() => {
          if (cancelled || handledRef.current) return;
          setError(
            "Couldn't access the camera. Check that you've allowed camera permission for this site, or try a different browser."
          );
        });
    });

    return () => {
      cancelled = true;
      void safeStop(scannerRef.current, stoppedRef);
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
