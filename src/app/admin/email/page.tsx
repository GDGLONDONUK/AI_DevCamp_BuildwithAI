"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPreRegisteredUsers } from "@/lib/adminService";
import { PreRegisteredUser } from "@/types";
import { auth } from "@/lib/firebase";
import {
  Mail, Send, Users, ArrowLeft, RefreshCw, Eye, EyeOff,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Filter,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// ── Email Templates ──────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app-url.com";

const TEMPLATES = {
  invite: {
    id: "invite",
    label: "Registration Invite",
    description: "Invite pre-registered attendees to create their account",
    subject: "🚀 You're in — Create your AI DevCamp 2026 account",
    html: (appUrl: string) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f0a; color: #e5e7eb; border-radius: 16px; overflow: hidden;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #14532d 0%, #052e16 100%); padding: 40px 32px; text-align: center;">
    <div style="font-family: monospace; font-size: 11px; letter-spacing: 4px; color: #4ade80; margin-bottom: 12px;">BUILD WITH AI · GDG LONDON</div>
    <h1 style="color: #ffffff; font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -1px;">AI DevCamp 2026</h1>
    <p style="color: #4ade80; font-family: monospace; font-size: 16px; margin: 8px 0 0;">You're registered 🎉</p>
  </div>

  <!-- Body -->
  <div style="padding: 36px 32px;">
    <p style="font-size: 16px; color: #d1fae5; margin: 0 0 8px;">Hi <strong>{{name}}</strong>,</p>
    <p style="font-size: 15px; color: #9ca3af; line-height: 1.7; margin: 0 0 24px;">
      Your Google Form registration for <strong style="color: #fff;">AI DevCamp 2026 — Build with AI</strong> has been received!
      The next step is to create your account on the programme platform so you can access session materials, submit assignments, and track your progress.
    </p>

    <!-- CTA -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${appUrl}/register" style="display: inline-block; background: #22c55e; color: #052e16; font-weight: 800; font-size: 16px; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-family: monospace; letter-spacing: 0.5px;">
        Create My Account →
      </a>
    </div>

    <!-- Details -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="font-family: monospace; font-size: 11px; color: #4ade80; letter-spacing: 3px; margin-bottom: 16px;">PROGRAMME DETAILS</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 100px;">Kick Off</td><td style="padding: 6px 0; color: #e5e7eb; font-size: 13px; font-weight: 600;">23 April 2026 · 6:00 PM</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Venue</td><td style="padding: 6px 0; color: #e5e7eb; font-size: 13px; font-weight: 600;">Skyscanner HQ · London · W1D 4AL</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Sessions</td><td style="padding: 6px 0; color: #e5e7eb; font-size: 13px; font-weight: 600;">6 sessions · 23 Apr – 19 May 2026</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Cost</td><td style="padding: 6px 0; color: #4ade80; font-size: 13px; font-weight: 700;">Free</td></tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #6b7280; line-height: 1.7;">
      Sign up using the same email address you used in the Google Form (<strong style="color: #9ca3af;">{{email}}</strong>) and your registration details will be automatically matched to your account.
    </p>
  </div>

  <!-- Footer -->
  <div style="border-top: 1px solid #1f2937; padding: 24px 32px; text-align: center;">
    <p style="font-family: monospace; font-size: 11px; color: #374151; margin: 0;">
      AI DevCamp 2026 · GDG London × Build with AI × Skyscanner
    </p>
    <p style="font-family: monospace; font-size: 11px; color: #374151; margin: 6px 0 0;">
      Questions? Reply to this email.
    </p>
  </div>
</div>`,
  },

  welcome: {
    id: "welcome",
    label: "Welcome Email",
    description: "Welcome message for attendees who have already created an account",
    subject: "Welcome to AI DevCamp 2026 — Build with AI 🤖",
    html: (appUrl: string) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f0a; color: #e5e7eb; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #14532d 0%, #052e16 100%); padding: 40px 32px; text-align: center;">
    <div style="font-family: monospace; font-size: 11px; letter-spacing: 4px; color: #4ade80; margin-bottom: 12px;">BUILD WITH AI · GDG LONDON</div>
    <h1 style="color: #ffffff; font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -1px;">Welcome aboard 👋</h1>
    <p style="color: #4ade80; font-family: monospace; font-size: 14px; margin: 8px 0 0;">AI DevCamp 2026</p>
  </div>

  <div style="padding: 36px 32px;">
    <p style="font-size: 16px; color: #d1fae5; margin: 0 0 8px;">Hi <strong>{{name}}</strong>,</p>
    <p style="font-size: 15px; color: #9ca3af; line-height: 1.7; margin: 0 0 24px;">
      Welcome to <strong style="color: #fff;">AI DevCamp 2026 — Build with AI</strong>! We're thrilled to have you joining us for 6 sessions of hands-on AI agent development with GDG London, Build with AI, and Skyscanner.
    </p>

    <div style="display: grid; gap: 12px; margin: 24px 0;">
      <a href="${appUrl}/sessions" style="display: block; background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 16px 20px; text-decoration: none; color: #e5e7eb;">
        <div style="font-family: monospace; color: #4ade80; font-size: 12px; margin-bottom: 4px;">→ SESSIONS</div>
        <div style="font-size: 14px; font-weight: 600;">View the full session schedule</div>
      </a>
      <a href="${appUrl}/dashboard" style="display: block; background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 16px 20px; text-decoration: none; color: #e5e7eb;">
        <div style="font-family: monospace; color: #4ade80; font-size: 12px; margin-bottom: 4px;">→ DASHBOARD</div>
        <div style="font-size: 14px; font-weight: 600;">Track your attendance and submissions</div>
      </a>
    </div>

    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="font-family: monospace; font-size: 11px; color: #4ade80; letter-spacing: 3px; margin-bottom: 12px;">WHAT TO EXPECT</div>
      <ul style="margin: 0; padding-left: 18px; color: #9ca3af; font-size: 14px; line-height: 1.9;">
        <li>6 sessions: 23 Apr → 19 May 2026</li>
        <li>Hands-on codelabs with Google ADK, MCP &amp; Vertex AI</li>
        <li>Assignments + final project showcase</li>
        <li>Certificate for those who complete the programme</li>
      </ul>
    </div>
  </div>

  <div style="border-top: 1px solid #1f2937; padding: 24px 32px; text-align: center;">
    <p style="font-family: monospace; font-size: 11px; color: #374151; margin: 0;">
      AI DevCamp 2026 · GDG London × Build with AI × Skyscanner
    </p>
  </div>
</div>`,
  },

  reminder: {
    id: "reminder",
    label: "Session Reminder",
    description: "Reminder about an upcoming session",
    subject: "⏰ Reminder: AI DevCamp Session coming up!",
    html: (_appUrl: string) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f0a; color: #e5e7eb; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #14532d 0%, #052e16 100%); padding: 40px 32px; text-align: center;">
    <div style="font-family: monospace; font-size: 11px; letter-spacing: 4px; color: #4ade80; margin-bottom: 12px;">AI DEVCAMP 2026</div>
    <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; margin: 0;">Session Reminder ⏰</h1>
  </div>

  <div style="padding: 36px 32px;">
    <p style="font-size: 16px; color: #d1fae5; margin: 0 0 16px;">Hi <strong>{{name}}</strong>,</p>
    <p style="font-size: 15px; color: #9ca3af; line-height: 1.7; margin: 0 0 24px;">
      Just a reminder that the next AI DevCamp session is coming up soon. Don't forget to join us!
    </p>
    <!-- Edit this section with your session details -->
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="font-family: monospace; font-size: 11px; color: #4ade80; letter-spacing: 3px; margin-bottom: 12px;">SESSION DETAILS</div>
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.7; margin: 0;">
        Add your session details here — date, time, location, topic, speaker.
      </p>
    </div>
    <p style="font-size: 13px; color: #6b7280; line-height: 1.7;">
      See you there!<br/>The AI DevCamp team
    </p>
  </div>

  <div style="border-top: 1px solid #1f2937; padding: 24px 32px; text-align: center;">
    <p style="font-family: monospace; font-size: 11px; color: #374151; margin: 0;">
      AI DevCamp 2026 · GDG London × Build with AI × Skyscanner
    </p>
  </div>
</div>`,
  },

  custom: {
    id: "custom",
    label: "Custom",
    description: "Write your own email from scratch",
    subject: "",
    html: (_: string) => `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0a0f0a; color: #e5e7eb; border-radius: 16px;">
  <p>Hi {{name}},</p>
  <p>Write your email here...</p>
  <p>The AI DevCamp team</p>
</div>`,
  },
} as const;

type TemplateId = keyof typeof TEMPLATES;

// ── Recipient filter options ─────────────────────────────────────────────────

type RecipientFilter = "not-linked" | "linked" | "in-person" | "all";

const FILTER_LABELS: Record<RecipientFilter, string> = {
  "not-linked": "Not signed up yet (send invite)",
  "linked": "Already have accounts (send welcome)",
  "in-person": "Joining in person",
  "all": "Everyone in pre-registered list",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminEmailPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const [preRegistered, setPreRegistered] = useState<PreRegisteredUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [templateId, setTemplateId] = useState<TemplateId>("invite");
  const [filter, setFilter] = useState<RecipientFilter>("not-linked");
  const [subject, setSubject] = useState(TEMPLATES.invite.subject);
  const [htmlBody, setHtmlBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: { email: string; error: string }[]; total: number } | null>(null);

  useEffect(() => {
    if (!loading && userProfile?.role !== "admin") router.push("/");
  }, [loading, userProfile, router]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const users = await fetchPreRegisteredUsers();
      setPreRegistered(users);
    } catch {
      toast.error("Failed to load pre-registered users");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // When template changes, update subject and HTML
  useEffect(() => {
    const t = TEMPLATES[templateId];
    setSubject(t.subject);
    setHtmlBody(t.html(APP_URL));
  }, [templateId]);

  const recipients = preRegistered.filter((u) => {
    switch (filter) {
      case "not-linked": return !u.linkedUid;
      case "linked":     return !!u.linkedUid;
      case "in-person":  return u.joiningInPerson?.toLowerCase().startsWith("y");
      case "all":        return true;
    }
  });

  const handleSend = async () => {
    if (!recipients.length) { toast.error("No recipients selected"); return; }
    if (!subject.trim())    { toast.error("Subject is required"); return; }
    if (!htmlBody.trim())   { toast.error("Email body is required"); return; }

    const confirmed = window.confirm(
      `Send "${subject}" to ${recipients.length} recipient${recipients.length > 1 ? "s" : ""}?`
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipients: recipients.map((u) => ({ email: u.email, name: u.displayName })),
          subject,
          html: htmlBody,
          replyTo: replyTo || undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json.data);
        toast.success(`Sent to ${json.data.sent} recipient${json.data.sent > 1 ? "s" : ""}!`);
      } else {
        toast.error(json.error ?? "Send failed");
      }
    } catch {
      toast.error("Network error — could not send emails");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
    </div>
  );

  const templateKeys = Object.keys(TEMPLATES) as TemplateId[];

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono flex items-center gap-2">
              <Mail size={22} className="text-green-400" />
              Email Composer
            </h1>
            <p className="text-sm text-gray-400 mt-0.5 font-mono">
              Send emails to pre-registered attendees via Resend
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left — config panel */}
          <div className="lg:col-span-1 space-y-4">

            {/* Template selector */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Mail size={14} className="text-green-400" /> Template
              </h2>
              <div className="space-y-2">
                {templateKeys.map((id) => {
                  const t = TEMPLATES[id];
                  return (
                    <button
                      key={id}
                      onClick={() => setTemplateId(id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        templateId === id
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-white/8 hover:border-white/15 bg-white/[0.02]"
                      }`}
                    >
                      <div className={`text-sm font-semibold ${templateId === id ? "text-green-300" : "text-white"}`}>
                        {t.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient filter */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Filter size={14} className="text-blue-400" /> Recipients
              </h2>
              {loadingData ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(Object.keys(FILTER_LABELS) as RecipientFilter[]).map((f) => {
                    const count = preRegistered.filter((u) => {
                      switch (f) {
                        case "not-linked": return !u.linkedUid;
                        case "linked":     return !!u.linkedUid;
                        case "in-person":  return u.joiningInPerson?.toLowerCase().startsWith("y");
                        case "all":        return true;
                      }
                    }).length;
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          filter === f
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "border-white/8 hover:border-white/15 bg-white/[0.02]"
                        }`}
                      >
                        <span className={`text-sm ${filter === f ? "text-blue-300" : "text-gray-300"}`}>
                          {FILTER_LABELS[f]}
                        </span>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                          filter === f ? "bg-blue-500/20 text-blue-300" : "bg-white/8 text-gray-400"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Recipient list toggle */}
              {recipients.length > 0 && (
                <button
                  onClick={() => setShowRecipients(!showRecipients)}
                  className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors pt-1"
                >
                  <span className="font-mono">{recipients.length} recipient{recipients.length > 1 ? "s" : ""} selected</span>
                  {showRecipients ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}

              {showRecipients && (
                <div className="max-h-48 overflow-y-auto space-y-1 mt-1">
                  {recipients.map((u) => (
                    <div key={u.email} className="flex items-center justify-between text-xs font-mono py-1 border-b border-white/5">
                      <span className="text-gray-400 truncate max-w-[140px]">{u.displayName}</span>
                      <span className="text-gray-600 truncate max-w-[140px]">{u.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply-to */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
              <h2 className="font-bold text-white text-sm">Reply-To (optional)</h2>
              <input
                type="email"
                placeholder="organiser@yourdomain.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/40 font-mono"
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || !recipients.length || !subject.trim()}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold font-mono text-sm transition-all ${
                sending || !recipients.length
                  ? "bg-white/5 text-gray-600 border border-white/10 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-400 text-gray-950 shadow-lg shadow-green-500/30"
              }`}
            >
              {sending ? (
                <><RefreshCw size={15} className="animate-spin" /> Sending…</>
              ) : (
                <><Send size={15} /> Send to {recipients.length} recipient{recipients.length > 1 ? "s" : ""}</>
              )}
            </button>

            {/* Result */}
            {result && (
              <div className={`rounded-xl border p-4 space-y-2 ${
                result.failed.length === 0
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-yellow-500/10 border-yellow-500/20"
              }`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {result.failed.length === 0 ? (
                    <CheckCircle2 size={15} className="text-green-400" />
                  ) : (
                    <AlertTriangle size={15} className="text-yellow-400" />
                  )}
                  <span className={result.failed.length === 0 ? "text-green-300" : "text-yellow-300"}>
                    {result.sent} sent · {result.failed.length} failed
                  </span>
                </div>
                {result.failed.length > 0 && (
                  <div className="space-y-1">
                    {result.failed.map((f) => (
                      <div key={f.email} className="flex items-start gap-1.5 text-xs font-mono text-red-400">
                        <XCircle size={10} className="mt-0.5 flex-shrink-0" />
                        <span>{f.email}: {f.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — composer */}
          <div className="lg:col-span-2 space-y-4">

            {/* Subject */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
              <label className="text-sm font-bold text-white">Subject line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/40"
              />
              <p className="text-xs text-gray-600 font-mono">
                Tip: Use <code className="text-green-500">{"{{name}}"}</code> and <code className="text-green-500">{"{{email}}"}</code> as placeholders — they&apos;re replaced per recipient.
              </p>
            </div>

            {/* HTML Editor */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white">Email body (HTML)</label>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors font-mono"
                >
                  {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPreview ? "Edit" : "Preview"}
                </button>
              </div>

              {showPreview ? (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-500 ml-2 font-mono">Email Preview</span>
                  </div>
                  <div
                    className="p-4 overflow-auto max-h-[500px]"
                    dangerouslySetInnerHTML={{
                      __html: htmlBody
                        .replace(/\{\{name\}\}/g, "Jane Smith")
                        .replace(/\{\{email\}\}/g, "jane@example.com"),
                    }}
                  />
                </div>
              ) : (
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  rows={20}
                  className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-green-400 font-mono placeholder-gray-700 focus:outline-none focus:border-green-500/40 resize-y"
                  placeholder="<div>Your HTML email here...</div>"
                />
              )}
            </div>

            {/* Stats summary */}
            <div className="flex flex-wrap gap-4 font-mono text-xs text-gray-500 px-1">
              <span><span className="text-white">{preRegistered.length}</span> total pre-registered</span>
              <span><span className="text-green-400">{preRegistered.filter((u) => u.linkedUid).length}</span> have accounts</span>
              <span><span className="text-yellow-400">{preRegistered.filter((u) => !u.linkedUid).length}</span> haven&apos;t signed up</span>
              <span><span className="text-blue-400">{preRegistered.filter((u) => u.joiningInPerson?.toLowerCase().startsWith("y")).length}</span> joining in person</span>
              <span><Users size={10} className="inline mr-1" /><span className="text-white">{recipients.length}</span> selected to receive this email</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
