"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Shield, Trash2, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { unknownErrorMessage } from "@/lib/unknownErrorMessage";

type TokenMeta = {
  id: string;
  uid: string;
  scopes: string[];
  label: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  lastUsedAt?: string;
};

type Minted = {
  token: string;
  tokenId: string;
  scopes: string[];
  expiresAt: string;
  label: string;
  warning?: string;
};

export default function McpTokensPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const isStaff = ["admin", "moderator"].includes(userProfile?.role || "");

  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [minted, setMinted] = useState<Minted | null>(null);
  const [label, setLabel] = useState("claude-desktop");
  const [scope, setScope] = useState<"learning" | "admin">("admin");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminScope, setAdminScope] = useState<"learning" | "admin">("admin");
  const [adminLabel, setAdminLabel] = useState("admin-claude");
  const [adminMinted, setAdminMinted] = useState<Minted | null>(null);

  const authHeader = useCallback(async () => {
    if (!user) throw new Error("Sign in required");
    const idToken = await user.getIdToken();
    return { Authorization: `Bearer ${idToken}` };
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const headers = await authHeader();
      const res = await fetch("/api/mcp/tokens", { headers });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load");
      setTokens(json.data.tokens || []);
    } catch (e) {
      toast.error(unknownErrorMessage(e, "Failed to load tokens"));
    }
  }, [user, authHeader]);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [loading, user, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mintSelf() {
    setBusy(true);
    setMinted(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/mcp/tokens", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: isStaff ? scope : "learning",
          label,
          ttlHours: 24 * 30,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Mint failed");
      setMinted(json.data);
      toast.success("Token created — copy it now");
      await load();
    } catch (e) {
      toast.error(unknownErrorMessage(e, "Mint failed"));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/mcp/tokens/${id}`, { method: "DELETE", headers });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Revoke failed");
      toast.success("Token revoked");
      await load();
    } catch (e) {
      toast.error(unknownErrorMessage(e, "Revoke failed"));
    } finally {
      setBusy(false);
    }
  }

  async function mintForUser() {
    setBusy(true);
    setAdminMinted(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/mcp/tokens", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail.trim(),
          scope: adminScope,
          label: adminLabel,
          ttlHours: 24 * 30,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Admin mint failed");
      setAdminMinted(json.data);
      toast.success("Admin-minted token ready — copy it now");
    } catch (e) {
      toast.error(unknownErrorMessage(e, "Admin mint failed"));
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  const connectorUrl =
    process.env.NEXT_PUBLIC_MCP_HTTP_URL?.trim() ||
    `${(process.env.NEXT_PUBLIC_SITE_URL || "https://aidevcamp.gdg.london").replace(/\/+$/, "")}/api/mcp`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <header className="space-y-2">
          <p className="text-green-400 font-mono text-xs tracking-wider">BYO LLM</p>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <KeyRound className="text-green-400" /> MCP access tokens
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Mint a personal token, then paste it into Claude, ChatGPT, or Cursor with the
            connector URL below. If Claude says the connection expired, mint a new token here
            and update the connector Bearer token. Organisers: choose{" "}
            <strong className="text-white">admin</strong> scope — attendee tokens cannot list
            other people&apos;s attendance or submissions.
          </p>
          <p className="text-gray-500 text-xs">
            Setup guides:{" "}
            <Link href="/faq" className="text-green-400 underline">
              LLM &amp; MCP FAQ
            </Link>
            {" · "}
            <Link href="/dashboard/tasks" className="text-green-400 underline">
              learning tasks
            </Link>
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="font-semibold text-lg">Connector URL (for Claude / ChatGPT)</h2>
          <p className="text-sm text-gray-400">
            Use this as the MCP server address — <strong className="text-white">not</strong>{" "}
            this page’s address. Add header{" "}
            <code className="text-gray-200">Authorization: Bearer &lt;your token&gt;</code>.
          </p>
          <code className="block text-xs break-all text-green-300">{connectorUrl}</code>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => copy(connectorUrl)}
          >
            <Copy size={16} /> Copy connector URL
          </Button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="font-semibold text-lg">Mint your token</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm space-y-1">
              <span className="text-gray-400">Label</span>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            {isStaff ? (
              <label className="text-sm space-y-1">
                <span className="text-gray-400">Scope</span>
                <select
                  className="w-full rounded-lg bg-gray-900 border border-white/10 px-3 py-2"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "learning" | "admin")}
                >
                  <option value="admin">admin (staff — cohort reports, attendance)</option>
                  <option value="learning">learning (sessions, study, my tasks)</option>
                </select>
              </label>
            ) : (
              <div className="text-sm space-y-1">
                <span className="text-gray-400">Scope</span>
                <p className="rounded-lg bg-gray-900 border border-white/10 px-3 py-2 text-gray-300">
                  learning (sessions, study, your tasks)
                </p>
              </div>
            )}
          </div>
          <Button onClick={() => void mintSelf()} disabled={busy}>
            Create token
          </Button>
          {minted && (
            <div className="rounded-xl bg-black/40 border border-green-500/30 p-4 space-y-2">
              <p className="text-amber-300 text-sm">{minted.warning}</p>
              <code className="block text-xs break-all text-green-300">{minted.token}</code>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => copy(minted.token)}
              >
                <Copy size={16} /> Copy token
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 className="font-semibold text-lg">Your tokens</h2>
          {tokens.length === 0 ? (
            <p className="text-sm text-gray-500">No tokens yet.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{t.label || t.id.slice(0, 8)}</span>
                    <span className="text-gray-500 ml-2">{t.scopes.join(", ")}</span>
                    {t.revoked && (
                      <span className="ml-2 text-red-400">revoked</span>
                    )}
                    <div className="text-xs text-gray-500">
                      expires {t.expiresAt ? new Date(t.expiresAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  {!t.revoked && (
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-300 p-2"
                      onClick={() => void revoke(t.id)}
                      aria-label="Revoke"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {isStaff && (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Shield size={18} className="text-amber-400" /> Admin: mint for a user
            </h2>
            <p className="text-sm text-gray-400">
              Mint learning or admin tokens for another account. Admin scope only works
              if that user is already admin or moderator.
            </p>
            <p className="text-sm text-gray-400">
              With an <span className="text-amber-200">admin</span> token in Claude or
              ChatGPT you can fix attendance:{" "}
              <code className="text-amber-200/90 text-xs">admin_list_users</code>{" "}
              (search by email) →{" "}
              <code className="text-amber-200/90 text-xs">admin_get_attendance</code> →{" "}
              <code className="text-amber-200/90 text-xs">admin_set_attendance</code>
              . Open or close the hackathon with{" "}
              <code className="text-amber-200/90 text-xs">admin_update_hackathon_settings</code>{" "}
              (submissionsOpen / votingOpen). Day-of:{" "}
              <code className="text-amber-200/90 text-xs">admin_hackathon_board</code>{" "}
              (submissions, votes, leaderboard),{" "}
              <code className="text-amber-200/90 text-xs">admin_set_project_status</code>{" "}
              (shortlist / winner). Example: “Show the hackathon board and current vote leaders.”
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm space-y-1 sm:col-span-2">
                <span className="text-gray-400">User email</span>
                <Input
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-gray-400">Label</span>
                <Input
                  value={adminLabel}
                  onChange={(e) => setAdminLabel(e.target.value)}
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-gray-400">Scope</span>
                <select
                  className="w-full rounded-lg bg-gray-900 border border-white/10 px-3 py-2"
                  value={adminScope}
                  onChange={(e) =>
                    setAdminScope(e.target.value as "learning" | "admin")
                  }
                >
                  <option value="learning">learning</option>
                  <option value="admin">admin</option>
                </select>
              </label>
            </div>
            <Button onClick={() => void mintForUser()} disabled={busy || !adminEmail.trim()}>
              Mint for user
            </Button>
            {adminMinted && (
              <div className="rounded-xl bg-black/40 border border-amber-500/30 p-4 space-y-2">
                <p className="text-amber-300 text-sm">{adminMinted.warning}</p>
                <code className="block text-xs break-all text-amber-200">
                  {adminMinted.token}
                </code>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => copy(adminMinted.token)}
                >
                  <Copy size={16} /> Copy token
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
