"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchBuddyProfile, sendBuddyRequest } from "@/lib/buddiesApi";
import { GithubIcon, LinkedinIcon } from "@/components/icons/SocialBrandIcons";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { Loader2, X } from "lucide-react";
import { SKILL_TAGS, EXPERTISE_TAGS, WANT_TO_LEARN_TAGS as WANT_TAGS } from "@/data/tags";

type Props = {
  uid: string | null;
  onClose: () => void;
  /** After buddy request changes relationship (e.g. became buddies). */
  onBuddyStatusChanged?: () => void;
};

export default function BuddyProfileModal({ uid, onClose, onBuddyStatusChanged }: Props) {
  const { userProfile } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchBuddyProfile>> | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!uid) {
      setData(null);
      setLoadErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      setLoadErr(null);
      try {
        const res = await fetchBuddyProfile(uid);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [uid]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!uid) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [uid, handleKey]);

  const handleBuddyRequest = async () => {
    if (!uid) return;
    setSending(true);
    try {
      const res = await sendBuddyRequest(uid);
      if (res.status === "pending") toast.success("Buddy request sent");
      else if (res.status === "connected") toast.success(res.message ?? "You are now buddies!");
      else toast(res.message ?? "Already pending", { icon: "ℹ️" });
      const refreshed = await fetchBuddyProfile(uid);
      setData(refreshed);
      onBuddyStatusChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send request");
    } finally {
      setSending(false);
    }
  };

  if (!uid) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buddy-profile-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[min(90vh,880px)] overflow-y-auto rounded-2xl border border-white/10 bg-gray-950 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close profile"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8 pt-14">
          {loadingProfile ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
          ) : loadErr || !data ? (
            <p className="text-red-400 text-center py-8">{loadErr ?? "Profile not found"}</p>
          ) : (
            <article className="space-y-6">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <h1 id="buddy-profile-title" className="text-2xl font-bold text-white pr-8">
                    {data.profile.displayName}
                  </h1>
                  {(data.profile.city || data.profile.country) && (
                    <p className="text-gray-500 text-sm mt-1">
                      {[data.profile.city, data.profile.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                {!data.viewerIsSelf && userProfile?.profilePublic === true && !data.isBuddy && (
                  <Button type="button" disabled={sending} onClick={() => void handleBuddyRequest()}>
                    {sending ? <Loader2 className="animate-spin w-4 h-4" /> : "Buddy request"}
                  </Button>
                )}
                {data.isBuddy && !data.viewerIsSelf && (
                  <span className="text-xs font-mono text-green-400 border border-green-500/40 px-2 py-1 rounded-lg">
                    Buddy
                  </span>
                )}
              </header>

              {data.profile.bio && (
                <section>
                  <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-2">Bio</h2>
                  <p className="text-gray-300 whitespace-pre-wrap">{data.profile.bio}</p>
                </section>
              )}

              <section className="flex flex-wrap gap-4">
                {data.profile.linkedinUrl && (
                  <a
                    href={data.profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm"
                  >
                    <LinkedinIcon /> LinkedIn
                  </a>
                )}
                {data.isBuddy && data.buddyExtras?.githubUrl && (
                  <a
                    href={data.buddyExtras.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm"
                  >
                    <GithubIcon /> GitHub
                  </a>
                )}
                {data.isBuddy && data.buddyExtras?.websiteUrl && (
                  <a
                    href={data.buddyExtras.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-300 hover:text-white underline"
                  >
                    Website
                  </a>
                )}
              </section>

              {!data.isBuddy && !data.viewerIsSelf && (
                <p className="text-xs text-gray-600 border border-white/8 rounded-lg px-3 py-2">
                  GitHub, website, and submitted projects are visible only to buddies (and to them on their own
                  profile).
                </p>
              )}

              {(data.viewerIsSelf || data.isBuddy) &&
                data.buddyExtras?.projects &&
                data.buddyExtras.projects.length > 0 && (
                  <section>
                    <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-3">Projects</h2>
                    <ul className="space-y-3">
                      {data.buddyExtras.projects.map((pr) => (
                        <li key={pr.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                          <p className="font-semibold text-white">{pr.title}</p>
                          <div className="flex gap-4 mt-2 text-xs">
                            {pr.githubUrl && (
                              <a
                                href={pr.githubUrl}
                                className="text-green-400 hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Repository
                              </a>
                            )}
                            {pr.demoUrl && (
                              <a
                                href={pr.demoUrl}
                                className="text-blue-400 hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Demo
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              <TagBlock title="Skills" items={data.profile.skills} presets={SKILL_TAGS} />
              <TagBlock title="Domain expertise" items={data.profile.expertise} presets={EXPERTISE_TAGS} />
              <TagBlock title="I want to learn" items={data.profile.wantToLearn} presets={WANT_TAGS} />
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

function TagBlock({
  title,
  items,
  presets,
}: {
  title: string;
  items?: string[];
  presets: readonly string[];
}) {
  if (!items?.length) return null;
  return (
    <section>
      <h2 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-2">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((tag) => (
          <span
            key={tag}
            className={`text-xs px-2 py-1 rounded-full border font-mono ${
              presets.includes(tag)
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : "border-white/15 bg-white/5 text-gray-300"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
