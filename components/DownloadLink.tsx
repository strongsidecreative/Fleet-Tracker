"use client";

import { useState } from "react";

// Downloads a file (CSV export) without leaving the page. A plain link
// opened the CSV as a page, and in the installed app there is no back
// button to return from it. Here we fetch the file and hand it to the
// phone's share sheet (iPhone: Save to Files) or the browser's download.
export default function DownloadLink({
  href,
  children,
  className,
  fallbackName = "export.csv",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  fallbackName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
      const blob = await res.blob();
      const type = blob.type || "text/csv";
      const file = new File([blob], name, { type });

      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standalone && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: name });
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          // fall through to a normal download
        }
      }

      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <a href={href} onClick={onClick} className={className} aria-busy={busy}>
        {busy ? "Preparing…" : children}
      </a>
      {error && <span className="ml-2 text-xs text-rust">{error}</span>}
    </>
  );
}
