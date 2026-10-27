"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  KeyRound,
  Laptop,
  MessageSquare,
  Shield,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type FaqItem = {
  id: string;
  q: string;
  category: "start" | "claude" | "chatgpt" | "cursor" | "tasks" | "access";
  a: ReactNode;
};

const CATEGORIES: { id: FaqItem["category"]; label: string }[] = [
  { id: "start", label: "Getting started" },
  { id: "access", label: "What you can access" },
  { id: "claude", label: "Claude" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "cursor", label: "Cursor & others" },
  { id: "tasks", label: "Tasks & lessons" },
];

function FaqAnswer({ children }: { children: ReactNode }) {
  return <div className="text-sm text-gray-300 leading-relaxed space-y-3 pt-3">{children}</div>;
}

const FAQS: FaqItem[] = [
  {
    id: "what-is-mcp",
    category: "start",
    q: "What is DevCamp MCP and why would I use it?",
    a: (
      <FaqAnswer>
        <p>
          The live programme at{" "}
          <a
            href="https://aidevcamp.gdg.london/"
            className="text-green-400 underline"
            target="_blank"
            rel="noreferrer"
          >
            aidevcamp.gdg.london
          </a>{" "}
          holds sessions, materials, and your tasks. MCP lets{" "}
          <strong className="text-white">your</strong> LLM (Claude, ChatGPT, Cursor) call those
          tools with your personal token — bring your own model; we provide authenticated data.
        </p>
        <p>
          Prefer the simplest path: stay on the site and use the in-app{" "}
          <strong className="text-white">Learning Assistant</strong> (our Gemini). Use MCP only
          when you want Claude/ChatGPT/Cursor as the chat UI.
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "not-repo",
    category: "start",
    q: "Do I need the GitHub repo or .claude skills?",
    a: (
      <FaqAnswer>
        <p>
          <strong className="text-white">No.</strong> Attendees never clone the project for
          learning. All learning tools run on the website and its APIs / MCP server.
        </p>
        <p>
          Folders like <code className="text-gray-300">.claude/skills</code> are instructions for
          coding agents that <em>edit the DevCamp source code</em> — irrelevant to studying
          sessions or tasks.
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "steps",
    category: "start",
    q: "Quick setup (all hosts)",
    a: (
      <FaqAnswer>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>
            Sign in at{" "}
            <a
              href="https://aidevcamp.gdg.london/"
              className="text-green-400 underline"
              target="_blank"
              rel="noreferrer"
            >
              aidevcamp.gdg.london
            </a>{" "}
            and join the active cohort.
          </li>
          <li>
            Open{" "}
            <Link href="/mcp" className="text-green-400 underline">
              /mcp
            </Link>{" "}
            → mint a <strong className="text-white">learning</strong> token. Copy{" "}
            <code className="text-green-300">dcmcp_…</code> (shown once).
          </li>
          <li>
            In Claude / ChatGPT / Cursor, add a remote MCP connector with server URL{" "}
            <code className="text-green-300">https://aidevcamp.gdg.london/api/mcp</code> and
            header <code className="text-green-300">Authorization: Bearer dcmcp_…</code> (see
            “Which URL do I paste?” below).
          </li>
          <li>
            Ask: “What’s on this week’s agenda?”, “Flashcards for Scale”, “What’s missing from
            my learning tasks?”
          </li>
        </ol>
      </FaqAnswer>
    ),
  },
  {
    id: "mcp-urls",
    category: "start",
    q: "Which URL do I paste into Claude / ChatGPT? (/mcp vs /api/mcp)",
    a: (
      <FaqAnswer>
        <p>
          There are <strong className="text-white">two different addresses</strong> — using the
          wrong one causes errors like <strong className="text-white">307</strong> or “Not
          found”.
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong className="text-white">Token page (browser only):</strong>{" "}
            <Link href="/mcp" className="text-green-400 underline">
              https://aidevcamp.gdg.london/mcp
            </Link>
            <br />
            <span className="text-gray-400">
              Sign in here to mint and revoke your <code className="text-green-300">dcmcp_…</code>{" "}
              token. Do <strong className="text-white">not</strong> use this as the MCP server URL
              in Claude or ChatGPT — it is a normal website page and will redirect (307) if you
              are not signed in.
            </span>
          </li>
          <li>
            <strong className="text-white">MCP connector URL (paste into Claude / ChatGPT / Cursor):</strong>{" "}
            <code className="text-green-300">https://aidevcamp.gdg.london/api/mcp</code>
            <br />
            <span className="text-gray-400">
              This is the real MCP endpoint. Always send{" "}
              <code className="text-green-300">Authorization: Bearer dcmcp_YOUR_TOKEN</code>.
            </span>
          </li>
        </ul>
        <pre className="overflow-x-auto rounded-lg bg-black/50 border border-white/10 p-3 text-xs text-green-200 font-mono whitespace-pre">{`{
  "mcpServers": {
    "ai-devcamp": {
      "url": "https://aidevcamp.gdg.london/api/mcp",
      "headers": {
        "Authorization": "Bearer dcmcp_YOUR_TOKEN"
      }
    }
  }
}`}</pre>
        <p className="text-gray-500 text-xs">
          You do not need to run anything on your laptop. Mint the token on the site, then point
          your LLM at <code className="text-gray-400">/api/mcp</code>.
        </p>
        <p className="text-gray-400 text-sm mt-3">
          If Claude says <strong className="text-white">“Server not initialized”</strong> on every
          tool call: remove the connector, save, then add{" "}
          <code className="text-green-300">https://aidevcamp.gdg.london/api/mcp</code> again with a
          fresh token from <Link href="/mcp" className="text-green-400 underline">/mcp</Link>. Do
          not trust web search for the schedule — ask the connector for{" "}
          <code className="text-green-300">list_public_sessions</code> (live cohort is September
          2026, not the April–May spring run).
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "tiers",
    category: "access",
    q: "What can my LLM see with a learning token?",
    a: (
      <FaqAnswer>
        <p>
          With a normal learning token (minted on{" "}
          <Link href="/mcp" className="text-green-400 underline">
            /mcp
          </Link>
          ), your LLM can use programme schedule, lesson materials for your cohort,
          flashcards / quizzes / Learning Guide, and <em>your own</em> learning tasks — not
          other people’s data.
        </p>
        <p>
          Prefer the in-app Learning Assistant if you only need help on the site.
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "data-source",
    category: "access",
    q: "Where does my LLM get programme content from?",
    a: (
      <FaqAnswer>
        <p>
          From this website’s live programme data — the same sessions, materials, and your
          personal learning tasks you already see when signed in. Your LLM only receives what
          your token is allowed to use; it cannot browse other people’s checklists.
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "claude-desktop",
    category: "claude",
    q: "How do I set up Claude Desktop?",
    a: (
      <FaqAnswer>
        <p>
          1) Mint a token on{" "}
          <Link href="/mcp" className="text-green-400 underline">
            /mcp
          </Link>
          . 2) In Claude, add a <strong className="text-white">remote / HTTP</strong> MCP
          connector. Use the <strong className="text-white">API</strong> URL below — not the
          token page URL (the page at <code className="text-gray-400">/mcp</code> is only for
          minting tokens).
        </p>
        <pre className="overflow-x-auto rounded-lg bg-black/50 border border-white/10 p-3 text-xs text-green-200 font-mono whitespace-pre">{`{
  "mcpServers": {
    "ai-devcamp": {
      "url": "https://aidevcamp.gdg.london/api/mcp",
      "headers": {
        "Authorization": "Bearer dcmcp_YOUR_TOKEN"
      }
    }
  }
}`}</pre>
        <p>
          Restart Claude and ask about sessions, materials, or your tasks. Exact config keys
          vary by Claude version — look for MCP / custom connectors.
        </p>
        <p className="text-gray-500 text-xs">
          Cloning this GitHub repo is only for site maintainers. Attendees use the live site +
          token.
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "claude-prompts",
    category: "claude",
    q: "What should I ask Claude?",
    a: (
      <FaqAnswer>
        <ul className="list-disc list-inside space-y-1">
          <li>“List this cohort’s sessions and what’s coming next.”</li>
          <li>“Search materials for RAG / ADK from the Scale workshop.”</li>
          <li>“Make flashcards for session &lt;id&gt; and quiz me.”</li>
          <li>“Start Learning Guide mode for Govern.”</li>
          <li>“Show my incomplete learning tasks and import any missing templates.”</li>
        </ul>
      </FaqAnswer>
    ),
  },
  {
    id: "chatgpt",
    category: "chatgpt",
    q: "How do I set up ChatGPT?",
    a: (
      <FaqAnswer>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            Mint a learning token on{" "}
            <Link href="/mcp" className="text-green-400 underline">
              /mcp
            </Link>
            .
          </li>
          <li>
            In ChatGPT, open <strong className="text-white">MCP / Connectors / Custom tools</strong>{" "}
            (label varies by plan) and add{" "}
            <code className="text-green-300">https://aidevcamp.gdg.london/api/mcp</code> with
            header <code className="text-green-300">Authorization: Bearer dcmcp_…</code>. Do not
            use the <code className="text-gray-400">/mcp</code> token page as the server URL.
          </li>
          <li>
            Or skip MCP and use the Learning Assistant on{" "}
            <a
              href="https://aidevcamp.gdg.london/"
              className="text-green-400 underline"
              target="_blank"
              rel="noreferrer"
            >
              aidevcamp.gdg.london
            </a>{" "}
            while signed in.
          </li>
        </ol>
      </FaqAnswer>
    ),
  },
  {
    id: "cursor",
    category: "cursor",
    q: "How do I set up Cursor (or other IDEs)?",
    a: (
      <FaqAnswer>
        <p>
          Cursor Settings → MCP: URL{" "}
          <code className="text-green-300">https://aidevcamp.gdg.london/api/mcp</code> and
          Bearer token from{" "}
          <Link href="/mcp" className="text-green-400 underline">
            /mcp
          </Link>
          . Ask the agent about this week’s sessions or your open tasks.
        </p>
        <p className="text-gray-500 text-xs">
          If you are a site maintainer developing the app itself, that is a different workflow
          (repo + Firebase Admin) — not required for learning the cohort.
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "tasks",
    category: "tasks",
    q: "How do I work on cohort learning tasks with an LLM?",
    a: (
      <FaqAnswer>
        <p>With a learning token and enrolment:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <code className="text-green-300">list_my_learning_tasks</code> — your checklist
          </li>
          <li>
            <code className="text-green-300">list_missing_learning_tasks</code> — gaps vs
            programme templates
          </li>
          <li>
            <code className="text-green-300">import_missing_learning_tasks</code> — copy missing
            templates into your list
          </li>
          <li>
            <code className="text-green-300">update_my_learning_task</code> — mark progress /
            notes
          </li>
        </ul>
        <p>
          You can also manage tasks on{" "}
          <Link href="/dashboard/tasks" className="text-green-400 underline">
            /dashboard/tasks
          </Link>
          . The LLM never sees other people’s tasks.
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "lessons",
    category: "tasks",
    q: "How do I study a lesson (materials, flashcards, quiz)?",
    a: (
      <FaqAnswer>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            <code className="text-green-300">list_public_sessions</code> or{" "}
            <code className="text-green-300">list_cohort_sessions</code> → pick a{" "}
            <code className="text-gray-400">sessionId</code>
          </li>
          <li>
            <code className="text-green-300">search_session_materials</code> /{" "}
            <code className="text-green-300">get_session_detail</code>
          </li>
          <li>
            <code className="text-green-300">prepare_flashcards</code>,{" "}
            <code className="text-green-300">prepare_quiz</code>, or{" "}
            <code className="text-green-300">start_learning_guide</code>
          </li>
        </ol>
        <p>
          Or use the in-site Learning Assistant (signed-in) — same materials, platform Gemini.
        </p>
      </FaqAnswer>
    ),
  },
  {
    id: "token-security",
    category: "access",
    q: "Is my token safe? What if it leaks?",
    a: (
      <FaqAnswer>
        <p>
          Tokens are shown once and stored hashed. Revoke anytime on{" "}
          <Link href="/mcp" className="text-green-400 underline">
            /mcp
          </Link>
          . Don’t commit tokens to git or paste them into public chats.
        </p>
      </FaqAnswer>
    ),
  },
];

export default function FaqPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>("steps");
  const [filter, setFilter] = useState<FaqItem["category"] | "all">("all");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/?login=1");
    }
  }, [loading, user, router]);

  const visible =
    filter === "all" ? FAQS : FAQS.filter((f) => f.category === filter);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 pt-24 pb-20 px-4 flex items-center justify-center">
        <p className="font-mono text-sm text-gray-500">Sign in required…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 space-y-3">
          <p className="font-mono text-xs text-green-400/80 tracking-widest">
            <span className="text-green-500/40">{"// "}</span>HELP
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <MessageSquare className="text-green-400 shrink-0" />
            LLM &amp; MCP FAQ
          </h1>
          <p className="text-gray-400 text-base max-w-2xl">
            Everything for learning goes through this website (
            <a
              href="https://aidevcamp.gdg.london/"
              className="text-green-400 underline"
              target="_blank"
              rel="noreferrer"
            >
              aidevcamp.gdg.london
            </a>
            ): mint a token on{" "}
            <Link href="/mcp" className="text-green-400 underline">
              /mcp
            </Link>
            , connect your LLM. You do <strong className="text-white">not</strong> need the
            GitHub repo or any <code className="text-gray-300">.claude</code> folders — those
            are only for people who maintain the site’s code.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/mcp"
              className="inline-flex items-center gap-2 rounded-lg bg-green-500/15 border border-green-500/30 px-4 py-2 text-sm text-green-300 hover:bg-green-500/25"
            >
              <KeyRound size={16} />
              Mint MCP token
            </Link>
            <Link
              href="/sessions"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              <BookOpen size={16} /> Sessions
            </Link>
            <Link
              href="/dashboard/tasks"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              <ListChecks size={16} /> Tasks
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-mono border ${
              filter === "all"
                ? "border-green-500/50 bg-green-500/10 text-green-300"
                : "border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            all
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-mono border ${
                filter === c.id
                  ? "border-green-500/50 bg-green-500/10 text-green-300"
                  : "border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {visible.map((item) => {
            const open = openId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/[0.04]"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                >
                  <span className="font-medium text-white text-sm sm:text-base">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-gray-500 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && <div className="px-4 pb-4 border-t border-white/5">{item.a}</div>}
              </div>
            );
          })}
        </div>

        <aside className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/5 to-transparent p-6 space-y-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-green-400" /> Tips
          </h2>
          <ul className="text-sm text-gray-400 space-y-2">
            <li className="flex gap-2">
              <Laptop size={16} className="shrink-0 mt-0.5 text-gray-500" />
              Always ground answers with tools — don’t invent session coverage.
            </li>
            <li className="flex gap-2">
              <Shield size={16} className="shrink-0 mt-0.5 text-gray-500" />
              Your token only unlocks your programme content and your own tasks — not other
              people’s data.
            </li>
            <li className="flex gap-2">
              <KeyRound size={16} className="shrink-0 mt-0.5 text-gray-500" />
              Rotate tokens if you shared a screenshot or committed env by mistake.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
