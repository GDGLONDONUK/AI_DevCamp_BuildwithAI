"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, RotateCcw, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_HOME_SITE_CONTENT,
  type HomeSiteContent,
} from "@/lib/siteContent";
import {
  fetchAdminHomeSiteContent,
  saveAdminHomeSiteContent,
  seedAdminHomeSiteContent,
} from "@/lib/siteContentApi";

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const className =
    "w-full bg-gray-950 border border-white/15 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-green-500/50";
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          className={className}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={className}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

export default function AdminSiteContentPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<HomeSiteContent>({ ...DEFAULT_HOME_SITE_CONTENT });
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  const allowed = userProfile?.role === "admin" || userProfile?.role === "moderator";

  const refresh = useCallback(async () => {
    if (!user || !allowed) return;
    setBusy(true);
    try {
      const data = await fetchAdminHomeSiteContent();
      setForm(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [user, allowed]);

  useEffect(() => {
    if (!loading && (!user || !allowed)) router.push("/");
  }, [user, allowed, loading, router]);

  useEffect(() => {
    if (user && allowed) void refresh();
  }, [user, allowed, refresh]);

  const save = async () => {
    if (!allowed) {
      toast.error("Not allowed");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAdminHomeSiteContent(form);
      setForm(saved);
      toast.success("Home content saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    if (!allowed) return;
    setSaving(true);
    try {
      const saved = await seedAdminHomeSiteContent();
      setForm(saved);
      toast.success("Seeded defaults into Firestore");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || busy) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center text-green-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-300 font-mono mb-2"
            >
              <ArrowLeft size={14} /> Admin
            </Link>
            <h1 className="text-2xl font-bold font-mono">Home site content</h1>
            <p className="text-sm text-gray-400 mt-1">
              Edit announcement, Discord, next-cohort copy, and kickoff CTA. Cached ~60s on the
              public API.
            </p>
            {form.updatedAt ? (
              <p className="text-xs text-gray-500 font-mono mt-1">Updated {form.updatedAt}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {allowed ? (
              <>
                <button
                  type="button"
                  onClick={() => void seed()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 text-sm font-mono hover:border-amber-400/40"
                >
                  <RotateCcw size={14} /> Seed defaults
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-gray-950 font-bold text-sm font-mono disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
              </>
            ) : null}
          </div>
        </div>

        <section className="space-y-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h2 className="font-mono text-green-400 text-sm tracking-widest">DISCORD</h2>
          <Field
            label="Invite URL"
            value={form.discordInviteUrl}
            onChange={(v) => setForm((f) => ({ ...f, discordInviteUrl: v }))}
          />
          <Field
            label="Link label"
            value={form.discordLinkLabel}
            onChange={(v) => setForm((f) => ({ ...f, discordLinkLabel: v }))}
          />
        </section>

        <section className="space-y-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h2 className="font-mono text-green-400 text-sm tracking-widest">ANNOUNCEMENT BANNER</h2>
          <label className="flex items-center gap-2 text-sm font-mono text-gray-300">
            <input
              type="checkbox"
              checked={form.announcementBanner.enabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  announcementBanner: { ...f.announcementBanner, enabled: e.target.checked },
                }))
              }
            />
            Enabled
          </label>
          <Field
            label="Banner text"
            value={form.announcementBanner.text}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                announcementBanner: { ...f.announcementBanner, text: v },
              }))
            }
          />
        </section>

        <section className="space-y-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h2 className="font-mono text-green-400 text-sm tracking-widest">PAST COHORTS CTA</h2>
          <label className="flex items-center gap-2 text-sm font-mono text-gray-300">
            <input
              type="checkbox"
              checked={form.pastCohortsCta.enabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pastCohortsCta: { ...f.pastCohortsCta, enabled: e.target.checked },
                }))
              }
            />
            Enabled
          </label>
          <Field
            label="Label"
            value={form.pastCohortsCta.label}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                pastCohortsCta: { ...f.pastCohortsCta, label: v },
              }))
            }
          />
          <Field
            label="Href"
            value={form.pastCohortsCta.href}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                pastCohortsCta: { ...f.pastCohortsCta, href: v },
              }))
            }
          />
        </section>

        <section className="space-y-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h2 className="font-mono text-green-400 text-sm tracking-widest">
            NEXT COHORT / TERMINAL
          </h2>
          <Field
            label="Terminal filename"
            value={form.terminal.filename}
            onChange={(v) =>
              setForm((f) => ({ ...f, terminal: { ...f.terminal, filename: v } }))
            }
          />
          <Field
            label="Terminal lines (one per line)"
            multiline
            value={form.terminal.lines.join("\n")}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                terminal: {
                  ...f.terminal,
                  lines: v.split("\n").map((l) => l.trim()).filter(Boolean),
                },
              }))
            }
          />
        </section>

        <section className="space-y-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h2 className="font-mono text-green-400 text-sm tracking-widest">COHORT PILLS</h2>
          {form.cohortPills.map((pill, i) => (
            <Field
              key={pill.id}
              label={`Pill ${i + 1} (${pill.id})`}
              value={pill.label}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  cohortPills: f.cohortPills.map((p, idx) =>
                    idx === i ? { ...p, label: v } : p
                  ),
                }))
              }
            />
          ))}
        </section>

        <section className="space-y-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h2 className="font-mono text-green-400 text-sm tracking-widest">JOIN COHORT BANNER</h2>
          <Field
            label="Title"
            value={form.joinCohortBanner.title}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                joinCohortBanner: { ...f.joinCohortBanner, title: v },
              }))
            }
          />
          <Field
            label="Body"
            multiline
            value={form.joinCohortBanner.body}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                joinCohortBanner: { ...f.joinCohortBanner, body: v },
              }))
            }
          />
          <Field
            label="Button"
            value={form.joinCohortBanner.buttonLabel}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                joinCohortBanner: { ...f.joinCohortBanner, buttonLabel: v },
              }))
            }
          />
        </section>

        <section className="space-y-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h2 className="font-mono text-green-400 text-sm tracking-widest">KICKOFF CTA</h2>
          <Field
            label="Partners label"
            value={form.kickoffCta.partnersLabel}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                kickoffCta: { ...f.kickoffCta, partnersLabel: v },
              }))
            }
          />
          <Field
            label="Headline"
            value={form.kickoffCta.headline}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                kickoffCta: { ...f.kickoffCta, headline: v },
              }))
            }
          />
          <Field
            label="Date line"
            value={form.kickoffCta.dateLine}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                kickoffCta: { ...f.kickoffCta, dateLine: v },
              }))
            }
          />
          <Field
            label="Location line"
            value={form.kickoffCta.locationLine}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                kickoffCta: { ...f.kickoffCta, locationLine: v },
              }))
            }
          />
        </section>

        <section className="space-y-4 border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <h2 className="font-mono text-green-400 text-sm tracking-widest">STATS & SCHEDULE</h2>
          <Field
            label="Weeks value"
            value={form.stats.weeksValue}
            onChange={(v) =>
              setForm((f) => ({ ...f, stats: { ...f.stats, weeksValue: v } }))
            }
          />
          <Field
            label="Projects value"
            value={form.stats.projectsValue}
            onChange={(v) =>
              setForm((f) => ({ ...f, stats: { ...f.stats, projectsValue: v } }))
            }
          />
          <Field
            label="Active attendees value"
            value={form.stats.activeAttendeesValue}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                stats: { ...f.stats, activeAttendeesValue: v },
              }))
            }
          />
          <Field
            label="Schedule subtitle"
            value={form.scheduleSubtitle}
            onChange={(v) => setForm((f) => ({ ...f, scheduleSubtitle: v }))}
          />
        </section>

        <p className="text-xs text-gray-500 font-mono pb-8">
          Sessions & speakers stay in Firestore (`sessions`, `speakers`) — edit under Admin →
          Sessions, or run `npm run sync-firestore-programme`.
        </p>
      </div>
    </div>
  );
}
