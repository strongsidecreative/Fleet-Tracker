/**
 * Outgoing email through Resend (free plan: 3,000 emails a month, 100 a
 * day, up to 40 MB per email including attachments). SERVER-ONLY.
 *
 * Optional: with RESEND_API_KEY unset, isEmailConfigured() is false and
 * the app simply skips email (in-app prompts and push still work).
 *
 *   RESEND_API_KEY  re_... from resend.com > API Keys
 *   EMAIL_FROM      e.g. "Fleet Tracker <receipts@yourdomain.co.nz>" on a
 *                   domain verified in Resend. Until a domain is verified,
 *                   "Fleet Tracker <onboarding@resend.dev>" works but can
 *                   only deliver to the Resend account owner's own address.
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export type EmailAttachment = { filename: string; content: Uint8Array };

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<{ error: string | null }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { error: "Email isn't set up for Fleet Tracker yet." };
  if (opts.to.length === 0) return { error: "No one to send to." };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Fleet Tracker <onboarding@resend.dev>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
      })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend send failed", res.status, detail.slice(0, 300));
    return { error: "The email couldn't be sent. Please try again later." };
  }
  return { error: null };
}

/** Escape text for safe inclusion in an HTML email body. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
