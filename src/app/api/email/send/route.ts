/**
 * POST /api/email/send
 * Admin-only — sends bulk emails via Gmail SMTP (hello@gdglondon.dev).
 *
 * Body: {
 *   recipients: { email: string; name: string }[]
 *   subject:    string
 *   html:       string   ({{name}} and {{email}} are replaced per recipient)
 *   replyTo?:   string
 * }
 *
 * Returns: { sent: number; failed: { email, error }[]; total: number }
 */

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { requireAdmin, isErrorResponse } from "@/lib/api-helpers";

const GMAIL_USER = process.env.GMAIL_USER ?? "";
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD ?? "";

// Re-use the transporter across requests (Next.js caches module scope)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
  },
});

// Send in small concurrent batches to avoid Gmail rate limits
// Gmail free limit: ~500 emails/day, ~100/hour via SMTP
const CONCURRENCY = 5;

interface Recipient { email: string; name: string }

async function sendOne(
  recipient: Recipient,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<void> {
  const personalised = html
    .replace(/\{\{name\}\}/g, recipient.name)
    .replace(/\{\{email\}\}/g, recipient.email);

  await transporter.sendMail({
    from: `AI DevCamp <${GMAIL_USER}>`,
    to: `${recipient.name} <${recipient.email}>`,
    subject,
    html: personalised,
    replyTo: replyTo || GMAIL_USER,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  if (!GMAIL_USER || !GMAIL_PASS) {
    return NextResponse.json(
      { ok: false, error: "GMAIL_USER or GMAIL_APP_PASSWORD not configured in .env.local" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const { recipients, subject, html, replyTo } = body as {
    recipients: Recipient[];
    subject: string;
    html: string;
    replyTo?: string;
  };

  if (!Array.isArray(recipients) || !recipients.length)
    return NextResponse.json({ ok: false, error: "No recipients provided" }, { status: 400 });
  if (!subject?.trim())
    return NextResponse.json({ ok: false, error: "Subject is required" }, { status: 400 });
  if (!html?.trim())
    return NextResponse.json({ ok: false, error: "Email body is required" }, { status: 400 });

  let sent = 0;
  const failed: { email: string; error: string }[] = [];

  // Process in small concurrent chunks
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const chunk = recipients.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (r) => {
        try {
          await sendOne(r, subject, html, replyTo);
          sent++;
        } catch (e: unknown) {
          failed.push({
            email: r.email,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      })
    );
    // Small delay between chunks to respect Gmail's rate limits
    if (i + CONCURRENCY < recipients.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json({ ok: true, data: { sent, failed, total: recipients.length } });
}
