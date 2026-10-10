"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zipSync, strToU8, type Zippable } from "fflate";
import { getReceiptDownloadPlan, confirmReceiptDownload, emailReceiptsToMe } from "./actions";

/**
 * Download builds the ZIP right here in the browser (photos fetched
 * straight from storage), so a big month never runs into the server's
 * response-size limit. Email builds it on the server and attaches it.
 */
export default function ReceiptMonthActions({
  monthKey,
  canEmail,
  hasLogs,
}: {
  monthKey: string;
  canEmail: boolean;
  hasLogs: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"download" | "email" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function download() {
    setBusy("download");
    setMessage(null);
    try {
      const plan = await getReceiptDownloadPlan(monthKey);
      if (plan.error !== null) {
        setMessage({ kind: "error", text: plan.error });
        return;
      }
      const entries: Zippable = { [`${plan.folder}/${plan.csvName}`]: strToU8(plan.csv) };
      let missing = 0;
      for (const f of plan.files) {
        try {
          const res = await fetch(f.url);
          if (!res.ok) throw new Error(String(res.status));
          entries[`${plan.folder}/${f.fileName}`] = [new Uint8Array(await res.arrayBuffer()), { level: 0 }];
        } catch {
          missing++;
        }
      }
      const zip = zipSync(entries);
      const url = URL.createObjectURL(new Blob([zip as unknown as BlobPart], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${plan.folder}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      await confirmReceiptDownload(monthKey, plan.files.length - missing);
      setMessage({
        kind: missing ? "error" : "ok",
        text: missing
          ? `Downloaded, but ${missing} photo${missing === 1 ? " couldn't" : "s couldn't"} be fetched. Try again on a better connection.`
          : `Downloaded ${plan.files.length} receipt${plan.files.length === 1 ? "" : "s"}.`,
      });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Something went wrong building the download. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function email() {
    setBusy("email");
    setMessage(null);
    try {
      const result = await emailReceiptsToMe(monthKey);
      setMessage(result.error ? { kind: "error", text: result.error } : { kind: "ok", text: result.message ?? "Sent." });
      if (!result.error) router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Something went wrong sending the email. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  if (!hasLogs) return null;

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          disabled={busy !== null}
          className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60"
        >
          {busy === "download" ? "Preparing…" : "Download ZIP"}
        </button>
        {canEmail && (
          <button
            type="button"
            onClick={email}
            disabled={busy !== null}
            className="rounded-lg border border-ink px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60"
          >
            {busy === "email" ? "Sending…" : "Email to me"}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className={`mt-2 text-xs font-medium ${message.kind === "ok" ? "text-track" : "text-rust"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
