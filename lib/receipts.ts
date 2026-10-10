import { zipSync, strToU8, type Zippable } from "fflate";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toCsv } from "./csv";
import { monthRangeIso, monthLabel } from "./receiptMonths";
import { escapeHtml } from "./email";

/**
 * Monthly fuel receipt export. SERVER-ONLY (the ZIP builder downloads
 * through the service-role client). The admin page's "Download" button
 * builds its ZIP in the browser instead, from getMonthReceipts() output,
 * so a large month never hits Vercel's 4.5 MB response limit.
 */

export const RECEIPT_BUCKET = "vehicle-photos";

// Resend's 40 MB limit counts the attachment after base64 (x1.33), so
// keep the raw ZIP comfortably under ~28 MB; above this, email a link.
export const MAX_EMAIL_ZIP_BYTES = 25 * 1024 * 1024;

export type ReceiptFile = { fileName: string; storagePath: string; publicUrl: string };
export type MonthReceipts = {
  monthKey: string;
  label: string;
  files: ReceiptFile[];
  csv: string;
  logCount: number;
  totalCost: number;
};

/** Storage path inside the bucket, from a stored public URL. */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${RECEIPT_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

function safe(part: string): string {
  return part
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // ā -> a, so "Whānau" stays readable
    .replace(/[^A-Za-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "x";
}

type FuelRow = {
  id: string;
  created_at: string;
  litres: number | null;
  cost: number;
  notes: string | null;
  receipt_photo_url: string | null;
  receipt_purged_at: string | null;
  vehicle: { name: string; registration: string } | null;
  driver: { name: string } | null;
};

/**
 * Every fuel log for one organisation in one NZ month: a CSV of all of
 * them, plus a file list for those that still have a receipt photo.
 * `client` can be the user's own client (RLS scopes it) or the
 * service-role client (then organisationId is what scopes it).
 */
export async function getMonthReceipts(client: SupabaseClient, organisationId: string, monthKey: string): Promise<MonthReceipts> {
  const { fromIso, toIso } = monthRangeIso(monthKey);
  const { data } = await client
    .from("fuel_logs")
    .select("id, created_at, litres, cost, notes, receipt_photo_url, receipt_purged_at, vehicle:vehicles(name, registration), driver:profiles(name)")
    .eq("organisation_id", organisationId)
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as FuelRow[];
  const used = new Set<string>();
  const files: ReceiptFile[] = [];
  const csvRows = rows.map((r) => {
    const when = new Date(r.created_at);
    const date = when.toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
    const time = when.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "2-digit", minute: "2-digit", hour12: false });
    let fileName = "";
    const path = r.receipt_photo_url ? storagePathFromUrl(r.receipt_photo_url) : null;
    if (r.receipt_photo_url && path) {
      const ext = (path.split(".").pop() || "jpg").toLowerCase();
      const base = `${date}_${safe(r.vehicle?.registration ?? "vehicle")}_${safe(r.driver?.name ?? "driver")}_${r.cost.toFixed(2)}`;
      fileName = `${base}.${ext}`;
      for (let n = 2; used.has(fileName); n++) fileName = `${base}_${n}.${ext}`;
      used.add(fileName);
      files.push({ fileName, storagePath: path, publicUrl: r.receipt_photo_url });
    }
    return {
      date,
      time,
      driver: r.driver?.name ?? "",
      vehicle: r.vehicle?.name ?? "",
      registration: r.vehicle?.registration ?? "",
      litres: r.litres ?? "",
      cost: r.cost.toFixed(2),
      notes: r.notes ?? "",
      receipt_file: fileName || (r.receipt_purged_at ? "(photo cleared)" : "(no photo)"),
    };
  });

  const csv = toCsv(csvRows, ["date", "time", "driver", "vehicle", "registration", "litres", "cost", "notes", "receipt_file"]);
  return {
    monthKey,
    label: monthLabel(monthKey),
    files,
    csv,
    logCount: rows.length,
    totalCost: rows.reduce((s, r) => s + r.cost, 0),
  };
}

export function zipFolderName(monthKey: string, organisationName: string): string {
  return `fuel-receipts-${monthKey.slice(0, 7)}-${safe(organisationName)}`;
}

/** Builds the ZIP on the server (for email). Photos are stored, not recompressed (JPEGs don't shrink). */
export async function buildReceiptZip(
  admin: SupabaseClient,
  month: MonthReceipts,
  organisationName: string
): Promise<{ zip: Uint8Array; missing: number }> {
  const folder = zipFolderName(month.monthKey, organisationName);
  const entries: Zippable = { [`${folder}/fuel-log-${month.monthKey.slice(0, 7)}.csv`]: strToU8(month.csv) };
  let missing = 0;
  for (const f of month.files) {
    const { data, error } = await admin.storage.from(RECEIPT_BUCKET).download(f.storagePath);
    if (error || !data) {
      missing++;
      continue;
    }
    entries[`${folder}/${f.fileName}`] = [new Uint8Array(await data.arrayBuffer()), { level: 0 }];
  }
  return { zip: zipSync(entries), missing };
}

export function receiptEmailHtml(opts: {
  organisationName: string;
  month: MonthReceipts;
  pageUrl: string;
  attached: boolean;
}): string {
  const { organisationName, month, pageUrl, attached } = opts;
  const total = month.totalCost.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0B1220;line-height:1.5">
<p>Kia ora,</p>
<p>${escapeHtml(organisationName)}'s fuel receipts for <strong>${escapeHtml(month.label)}</strong> are ready:
${month.files.length} receipt photo${month.files.length === 1 ? "" : "s"} across ${month.logCount} fill-up${month.logCount === 1 ? "" : "s"}, ${total} in total.</p>
<p>${
    attached
      ? "They're attached as a ZIP, with a spreadsheet (CSV) of every fill-up. Save it somewhere safe for your records."
      : `Download them as a ZIP (photos plus a spreadsheet of every fill-up) here:<br><a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a>`
  }</p>
<p style="color:#57647C;font-size:13px">Fleet Tracker clears receipt photos from the app a few months after they've been downloaded or emailed, to stay within free storage. The fuel log itself (date, driver, vehicle, litres, cost) is always kept.</p>
</div>`;
}
