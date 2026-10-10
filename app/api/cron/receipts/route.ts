import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseFeatures } from "@/lib/orgFeatures";
import { addMonths, currentMonthKey, monthLabel, monthRangeIso } from "@/lib/receiptMonths";
import {
  getMonthReceipts,
  buildReceiptZip,
  receiptEmailHtml,
  zipFolderName,
  MAX_EMAIL_ZIP_BYTES,
} from "@/lib/receipts";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { storageLocation } from "@/lib/photos";

// Called once a day by pg_cron (migration 0022, run_receipt_job()),
// authenticated with the same secret as the push dispatcher. Safe to call
// any number of times: each organisation is prompted once per month, and
// photos are only cleared for months that were downloaded or emailed.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PURGE_PER_RUN = 300;

type Org = { id: string; name: string; features: unknown; receipt_delivery: "remind" | "email"; receipt_retention_months: number };

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-push-secret");
  if (!secret || secret !== process.env.PUSH_DISPATCH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const thisMonth = currentMonthKey();
  const lastMonth = addMonths(thisMonth, -1);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const pageUrl = `${site}/admin/fuel/receipts`;
  const emailOn = isEmailConfigured();
  const summary: Record<string, string> = {};

  const { data: orgs } = await admin
    .from("organisations")
    .select("id, name, features, receipt_delivery, receipt_retention_months");

  for (const org of (orgs ?? []) as Org[]) {
    if (!normaliseFeatures(org.features).fuel_tracking) continue;

    // ---------- 1. Prompt for last month, once ----------
    const { data: existing } = await admin
      .from("receipt_exports")
      .select("id, reminded_at, exported_at")
      .eq("organisation_id", org.id)
      .eq("month", lastMonth)
      .maybeSingle();

    if (!existing?.reminded_at && !existing?.exported_at) {
      const month = await getMonthReceipts(admin, org.id, lastMonth);
      if (month.logCount > 0) {
        const { data: admins } = await admin
          .from("profiles")
          .select("id, email")
          .eq("organisation_id", org.id)
          .eq("role", "admin")
          .eq("active", true);
        const adminRows = admins ?? [];
        const emails = adminRows.map((a) => a.email).filter((e) => e && !e.endsWith(".invalid"));

        let emailedZip = false;
        if (emailOn && org.receipt_delivery === "email" && emails.length > 0) {
          const { zip } = await buildReceiptZip(admin, month, org.name);
          if (zip.byteLength <= MAX_EMAIL_ZIP_BYTES) {
            const { error } = await sendEmail({
              to: emails,
              subject: `Fuel receipts: ${month.label} (${org.name})`,
              html: receiptEmailHtml({ organisationName: org.name, month, pageUrl, attached: true }),
              attachments: [{ filename: `${zipFolderName(lastMonth, org.name)}.zip`, content: zip }],
            });
            emailedZip = !error;
          }
        }

        if (!emailedZip) {
          // In-app + push prompt for every active admin.
          await admin.from("notifications").insert(
            adminRows.map((a) => ({
              recipient_id: a.id,
              type: "receipt_export_due",
              message: `${month.label} fuel receipts are ready to download (${month.files.length} photo${month.files.length === 1 ? "" : "s"}).`,
              related_table: "receipt_exports",
              organisation_id: org.id,
            }))
          );
          if (emailOn && emails.length > 0) {
            await sendEmail({
              to: emails,
              subject: `Download your ${month.label} fuel receipts (${org.name})`,
              html: receiptEmailHtml({ organisationName: org.name, month, pageUrl, attached: false }),
            });
          }
        }

        const now = new Date().toISOString();
        await admin.from("receipt_exports").upsert(
          {
            organisation_id: org.id,
            month: lastMonth,
            receipt_count: month.files.length,
            reminded_at: now,
            ...(emailedZip ? { exported_at: now, exported_via: "email" } : {}),
          },
          { onConflict: "organisation_id,month" }
        );
        summary[org.id] = emailedZip ? `emailed ${monthLabel(lastMonth)}` : `prompted ${monthLabel(lastMonth)}`;
      }
    }

    // ---------- 2. Tidy up photos of saved months past retention ----------
    const retention = org.receipt_retention_months;
    if (retention <= 0) continue;
    const purgeBefore = addMonths(thisMonth, -retention); // months strictly before this are due

    const { data: due } = await admin
      .from("receipt_exports")
      .select("id, month")
      .eq("organisation_id", org.id)
      .not("exported_at", "is", null)
      .is("images_purged_at", null)
      .lt("month", purgeBefore);

    let purgedThisRun = 0;
    for (const exp of due ?? []) {
      if (purgedThisRun >= MAX_PURGE_PER_RUN) break;
      const { fromIso, toIso } = monthRangeIso(exp.month);
      const { data: logs } = await admin
        .from("fuel_logs")
        .select("id, receipt_photo_url")
        .eq("organisation_id", org.id)
        .gte("created_at", fromIso)
        .lt("created_at", toIso)
        .not("receipt_photo_url", "is", null)
        .limit(MAX_PURGE_PER_RUN - purgedThisRun);

      const batch = (logs ?? []).map((l) => ({ id: l.id, loc: storageLocation(l.receipt_photo_url) }));
      for (let i = 0; i < batch.length; i += 100) {
        const chunk = batch.slice(i, i + 100);
        // Private receipts and older public ones live in different buckets.
        const byBucket = new Map<string, string[]>();
        for (const c of chunk) {
          if (c.loc) byBucket.set(c.loc.bucket, [...(byBucket.get(c.loc.bucket) ?? []), c.loc.path]);
        }
        let failed = false;
        for (const [bucket, paths] of Array.from(byBucket.entries())) {
          const { error } = await admin.storage.from(bucket).remove(paths);
          if (error) {
            console.error("receipt purge: storage remove failed", bucket, error.message);
            failed = true;
          }
        }
        if (failed) break;
        await admin
          .from("fuel_logs")
          .update({ receipt_photo_url: null, receipt_purged_at: new Date().toISOString() })
          .in("id", chunk.map((c) => c.id));
        purgedThisRun += chunk.length;
      }

      // Month finished only when no photos are left in it.
      const { count } = await admin
        .from("fuel_logs")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", org.id)
        .gte("created_at", fromIso)
        .lt("created_at", toIso)
        .not("receipt_photo_url", "is", null);
      if (!count) {
        await admin.from("receipt_exports").update({ images_purged_at: new Date().toISOString() }).eq("id", exp.id);
      }
    }
    if (purgedThisRun > 0) summary[`${org.id}:purged`] = String(purgedThisRun);
  }

  return NextResponse.json({ ok: true, month: lastMonth, summary });
}
