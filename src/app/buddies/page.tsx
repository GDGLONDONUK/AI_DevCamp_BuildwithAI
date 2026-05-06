"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import BuddyProfileModal from "@/components/buddies/BuddyProfileModal";
import {
  fetchBuddyConnections,
  fetchBuddyDirectory,
  fetchBuddyRequests,
  sendBuddyRequest,
  respondToBuddyRequest,
  type BuddyCard,
  type BuddyRequestRow,
  type ConnectionRow,
} from "@/lib/buddiesApi";
import { GithubIcon, LinkedinIcon } from "@/components/icons/SocialBrandIcons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { HeartHandshake, Inbox, Loader2, Search, Users } from "lucide-react";

type Tab = "discover" | "requests" | "connections";

export default function BuddiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      }
    >
      <BuddiesPageInner />
    </Suspense>
  );
}

function BuddiesPageInner() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profileModalUid, setProfileModalUid] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("discover");
  const [profiles, setProfiles] = useState<BuddyCard[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [incoming, setIncoming] = useState<BuddyRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<BuddyRequestRow[]>([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [loadingConn, setLoadingConn] = useState(false);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [pendingRespondId, setPendingRespondId] = useState<string | null>(null);

  const refreshDirectory = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await fetchBuddyDirectory(search.trim() || undefined);
      setProfiles(data.profiles);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load directory");
    } finally {
      setLoadingList(false);
    }
  }, [search]);

  const refreshRequests = useCallback(async () => {
    setLoadingReq(true);
    try {
      const data = await fetchBuddyRequests();
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load requests");
    } finally {
      setLoadingReq(false);
    }
  }, []);

  const refreshConnections = useCallback(async () => {
    setLoadingConn(true);
    try {
      const data = await fetchBuddyConnections();
      setConnections(data.buddies);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Could not load buddies");
    } finally {
      setLoadingConn(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [loading, user, router]);

  useEffect(() => {
    const u = searchParams.get("u")?.trim();
    setProfileModalUid(u && u.length > 0 ? u : null);
  }, [searchParams]);

  const openProfileModal = useCallback(
    (uid: string) => {
      setProfileModalUid(uid);
      router.replace(`/buddies?u=${encodeURIComponent(uid)}`, { scroll: false });
    },
    [router]
  );

  const closeProfileModal = useCallback(() => {
    setProfileModalUid(null);
    router.replace("/buddies", { scroll: false });
  }, [router]);

  const refreshBuddyLists = useCallback(() => {
    void refreshRequests();
    void refreshConnections();
    void refreshDirectory();
  }, [refreshRequests, refreshConnections, refreshDirectory]);

  useEffect(() => {
    if (!user) return;
    void refreshDirectory();
  }, [user, refreshDirectory]);

  useEffect(() => {
    if (!user || tab !== "requests") return;
    void refreshRequests();
  }, [user, tab, refreshRequests]);

  useEffect(() => {
    if (!user || tab !== "connections") return;
    void refreshConnections();
  }, [user, tab, refreshConnections]);

  const handleSendRequest = async (uid: string) => {
    setPendingUid(uid);
    try {
      const res = await sendBuddyRequest(uid);
      if (res.status === "pending") toast.success("Buddy request sent");
      else if (res.status === "connected") toast.success(res.message ?? "You are now buddies!");
      else toast(res.message ?? "Request already pending", { icon: "ℹ️" });
      await refreshBuddyLists();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send request");
    } finally {
      setPendingUid(null);
    }
  };

  const handleRespond = async (id: string, action: "accept" | "reject") => {
    setPendingRespondId(id);
    try {
      await respondToBuddyRequest(id, action);
      toast.success(action === "accept" ? "You are now buddies!" : "Request declined");
      await refreshBuddyLists();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update request");
    } finally {
      setPendingRespondId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  const needsPublic =
    userProfile?.profilePublic !== true ? (
      <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <strong className="text-amber-200">Make your profile public</strong> to appear in the directory and send buddy
        requests.{" "}
        <Link href="/profile" className="underline font-semibold text-white hover:text-amber-100">
          Open profile settings
        </Link>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <HeartHandshake className="text-green-400 shrink-0" />
              DevcampBuddies
            </h1>
            <p className="text-gray-400 mt-1">
              Discover attendees who opted in publicly, send buddy requests, and collaborate on projects.
            </p>
          </div>
        </div>

        {needsPublic}

        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-2">
          {(
            [
              ["discover", "Discover", Users],
              ["requests", "Requests", Inbox],
              ["connections", "My buddies", HeartHandshake],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id ? "bg-green-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              {label}
              {id === "requests" && incoming.length > 0 ? (
                <span className="text-[10px] bg-white/20 px-1.5 rounded-full">{incoming.length}</span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "discover" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  id="buddy-search"
                  label="Search by name"
                  placeholder="Start typing…"
                  icon={<Search size={16} />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={() => void refreshDirectory()}>
                  Search
                </Button>
              </div>
            </div>

            {loadingList ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No public profiles match your search yet.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {profiles.map((p) => (
                  <li
                    key={p.uid}
                    className="rounded-2xl border border-white/10 bg-gray-900/60 p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => openProfileModal(p.uid)}
                          className="text-lg font-semibold text-white hover:text-green-400 transition-colors text-left"
                        >
                          {p.displayName || "Attendee"}
                        </button>
                        {(p.city || p.country) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[p.city, p.country].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.isBuddy ? (
                          <span className="text-xs font-mono text-green-400 border border-green-500/40 px-2 py-1 rounded-lg whitespace-nowrap">
                            Buddy
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openProfileModal(p.uid)}
                          className="text-xs text-green-400 hover:underline"
                        >
                          View
                        </button>
                      </div>
                    </div>
                    {p.bio && <p className="text-sm text-gray-400 line-clamp-3">{p.bio}</p>}
                    {!p.isBuddy ? (
                      <div className="flex flex-wrap gap-2 mt-auto pt-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={userProfile?.profilePublic !== true || pendingUid === p.uid}
                          onClick={() => void handleSendRequest(p.uid)}
                        >
                          {pendingUid === p.uid ? <Loader2 className="animate-spin w-4 h-4" /> : "Buddy request"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600 mt-auto pt-2 font-mono">
                        Already buddies — open profile for GitHub and projects.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-8">
            {loadingReq ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : (
              <>
                <section>
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    Incoming
                    {incoming.length > 0 ? (
                      <span className="text-xs font-mono text-gray-500">({incoming.length})</span>
                    ) : null}
                  </h2>
                  {incoming.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pending requests.</p>
                  ) : (
                    <ul className="space-y-3">
                      {incoming.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-gray-900/50 px-4 py-3"
                        >
                          <div>
                            <p className="text-white font-medium">{r.fromDisplayName ?? "Attendee"}</p>
                            <p className="text-xs text-gray-500 font-mono">wants to connect</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={pendingRespondId === r.id}
                              onClick={() => void handleRespond(r.id, "accept")}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={pendingRespondId === r.id}
                              onClick={() => void handleRespond(r.id, "reject")}
                            >
                              Decline
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-white mb-3">Outgoing (pending)</h2>
                  {outgoing.length === 0 ? (
                    <p className="text-gray-500 text-sm">None waiting.</p>
                  ) : (
                    <ul className="space-y-2">
                      {outgoing.map((r) => (
                        <li
                          key={r.id}
                          className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-2 text-sm text-gray-400"
                        >
                          Waiting on <span className="text-gray-200">{r.toDisplayName}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {tab === "connections" && (
          <div>
            {loadingConn ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : connections.length === 0 ? (
              <p className="text-gray-500 text-center py-12">
                No buddies yet — approve incoming requests or send requests from Discover.
              </p>
            ) : (
              <ul className="grid gap-6">
                {connections.map((c) => (
                  <li
                    key={c.uid}
                    className="rounded-2xl border border-green-500/20 bg-gray-900/40 p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{c.displayName}</h3>
                        {c.pairSince && (
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            Buddies since {new Date(c.pairSince).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openProfileModal(c.uid)}
                        className="text-sm text-green-400 hover:underline"
                      >
                        Profile
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      {c.buddyExtras?.githubUrl ? (
                        <a
                          href={c.buddyExtras.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-gray-300 hover:text-white"
                        >
                          <GithubIcon /> GitHub
                        </a>
                      ) : null}
                      {c.linkedinUrl ? (
                        <a
                          href={c.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-gray-300 hover:text-white"
                        >
                          <LinkedinIcon /> LinkedIn
                        </a>
                      ) : null}
                      {c.buddyExtras?.websiteUrl ? (
                        <a
                          href={c.buddyExtras.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-300 hover:text-white underline"
                        >
                          Website
                        </a>
                      ) : null}
                    </div>

                    {(c.buddyExtras?.projects?.length ?? 0) > 0 ? (
                      <div>
                        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">Projects</p>
                        <ul className="space-y-2">
                          {c.buddyExtras!.projects.map((pr) => (
                            <li key={pr.id} className="text-sm border border-white/8 rounded-lg px-3 py-2">
                              <span className="text-white font-medium">{pr.title}</span>
                              <div className="flex flex-wrap gap-3 mt-1">
                                {pr.githubUrl ? (
                                  <a
                                    href={pr.githubUrl}
                                    className="text-xs text-green-400 hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Repo
                                  </a>
                                ) : null}
                                {pr.demoUrl ? (
                                  <a
                                    href={pr.demoUrl}
                                    className="text-xs text-blue-400 hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Demo
                                  </a>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600">No submitted projects listed yet.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <BuddyProfileModal
        uid={profileModalUid}
        onClose={closeProfileModal}
        onBuddyStatusChanged={refreshBuddyLists}
      />
    </div>
  );
}
