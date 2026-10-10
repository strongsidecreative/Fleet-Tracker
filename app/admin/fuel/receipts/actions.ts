"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getMonthReceipts, buildReceiptZip, receiptEmailHtml, zipFolderName, MAX_EMAIL_ZIP_BYTES } from "@/lib/receipts";
import { currentMonthKey, isMonthKey } from "@/lib/receiptMonths";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { resolvePhotoUrls } from "@/lib/photos";

type Caller = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  email: string;
  organisationId: string;
  organisationName: string;
};

async function requireAdmin(): Promise<Caller | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active, email, organisation_id, organisation:organisations(name)")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin" || !profile.active || !profile.organisation_id) return null;
  const orgRaw = profile.organisation as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { name?: string } | null;
  return {
    supabase,
    userId: user.id,
    email: profile.email,
    organisationId: profile.organisation_id,
    organisationName: org?.name ?? "Organisation",
  };
}

/** Marks a finished month as exported. The current month is still filling up, so it's never marked. */
async function markExported(caller: Caller, monthKey: string, via: "download" | "email", count: number) {
  if (monthKey >= currentMonthKey()) return;
  await caller.supabase.from("receipt_exports").upsert(
    {
      organisation_id: caller.organisationId,
      month: monthKey,
      receipt_count: count,
      exported_at: new Date().toISOString(),
      exported_by: caller.userId,
      exported_via: via,
    },
    { onConflict: "organisation_id,month" }
  );
  revalidatePath("/admin/fuel/receipts");
  revalidatePath("/admin");
}

export type DownloadPlan =
  | { error: string }
  | { error: null; folder: string; csvName: string; csv: string; files: { fileName: string; url: string }[] };

/** What the browser needs to build the ZIP itself (see ReceiptMonthActions). */
export async function getReceiptDownloadPlan(monthKey: string): Promise<DownloadPlan> {
  const caller = await requireAdmin();
  if (!caller) return { error: "Only admins can download receipts." };
  if (!isMonthKey(monthKey)) return { error: "That month isn't valid." };

  const month = await getMonthReceipts(caller.supabase, caller.organisationId, monthKey);
  if (month.logCount === 0) return { error: "No fuel was logged that month." };
  // Private photos: signed links (1 hour) the browser can fetch directly.
  const urls = await resolvePhotoUrls(caller.supabase, month.files.map((f) => f.value));
  return {
    error: null,
    folder: zipFolderName(monthKey, caller.organisationName),
    csvName: `fuel-log-${monthKey.slice(0, 7)}.csv`,
    csv: month.csv,
    files: month.files.flatMap((f) => {
      const url = urls.get(f.value);
      return url ? [{ fileName: f.fileName, url }] : [];
    }),
  };
}

/** Called by the browser once its ZIP download has been saved. */
export async function confirmReceiptDownload(monthKey: string, count: number): Promise<void> {
  const caller = await requireAdmin();
  if (!caller || !isMonthKey(monthKey)) return;
  await markExported(caller, monthKey, "download", count);
}

/** Emails the month's ZIP to the signed-in admin. */
export async function emailReceiptsToMe(monthKey: string): Promise<{ error: string | null; message?: string }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "Only admins can email receipts." };
  if (!isMonthKey(monthKey)) return { error: "That month isn't valid." };
  if (!isEmailConfigured()) return { error: "Email isn't set up for Fleet Tracker yet. Use Download instead." };

  const admin = createAdminClient();
  const month = await getMonthReceipts(admin, caller.organisationId, monthKey);
  if (month.logCount === 0) return { error: "No fuel was logged that month." };

  const { zip, missing } = await buildReceiptZip(admin, month, caller.organisationName);
  if (zip.byteLength > MAX_EMAIL_ZIP_BYTES) {
    return { error: "That month is too large to email. Please use Download instead." };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const { error } = await sendEmail({
    to: [caller.email],
    subject: `Fuel receipts: ${month.label} (${caller.organisationName})`,
    html: receiptEmailHtml({ organisationName: caller.organisationName, month, pageUrl: `${site}/admin/fuel/receipts`, attached: true }),
    attachments: [{ filename: `${zipFolderName(monthKey, caller.organisationName)}.zip`, content: zip }],
  });
  if (error) return { error };

  await markExported(caller, monthKey, "email", month.files.length);
  return {
    error: null,
    message: `Sent to ${caller.email}.${missing ? ` ${missing} photo${missing === 1 ? " was" : "s were"} missing and left out.` : ""}`,
  };
}

export async function saveReceiptSettings(
  prevState: { error: string | null; saved?: boolean },
  formData: FormData
): Promise<{ error: string | null; saved?: boolean }> {
  const caller = await requireAdmin();
  if (!caller) return { error: "Only admins can change this." };

  const delivery = formData.get("delivery") === "email" ? "email" : "remind";
  const retention = Number(formData.get("retention"));
  if (!Number.isInteger(retention) || retention < 0 || retention > 84) {
    return { error: "Please choose how long to keep receipt photos." };
  }

  const { data, error } = await caller.supabase
    .from("organisations")
    .update({ receipt_delivery: delivery, receipt_retention_months: retention })
    .eq("id", caller.organisationId)
    .select("id");
  if (error || !data || data.length === 0) return { error: "Something went wrong saving. Please try again." };

  revalidatePath("/admin/account");
  revalidatePath("/admin/fuel/receipts");
  return { error: null, saved: true };
}
