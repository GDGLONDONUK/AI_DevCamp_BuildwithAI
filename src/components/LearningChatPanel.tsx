"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  LEARNING_CHAT_WELCOME,
  LEARNING_QUICK_PROMPTS,
} from "@/lib/learning-chat/constants";
import { postLearningChat } from "@/lib/learning-chat/clientApi";
import { getActiveCohortId } from "@/lib/cohorts";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type LearningChatPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  focusSessionId?: string;
};

export function LearningChatPanel({
  isOpen,
  onClose,
  focusSessionId,
}: LearningChatPanelProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: LEARNING_CHAT_WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const runPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || !user) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setBusy(true);

      try {
        const history = messagesRef.current
          .filter((m) => m.id !== "welcome")
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }));

        const reply = await postLearningChat({
          message: trimmed,
          focusSessionId,
          pathname: pathname || undefined,
          cohortId: getActiveCohortId(),
          history,
        });

        setMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: "assistant", content: reply },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setMessages((m) => [
          ...m,
          { id: `e-${Date.now()}`, role: "assistant", content: msg },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, user, focusSessionId, pathname]
  );

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close learning chat"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-green-500/25 bg-[#0c120c] shadow-2xl shadow-green-900/40">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-green-400 font-mono">
              Learning assistant
            </p>
            <p className="text-sm text-gray-300">Sessions · RAG · Gemini</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setMessages([
                  { id: "welcome", role: "assistant", content: LEARNING_CHAT_WELCOME },
                ])
              }
              className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-white/5 font-mono"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/5"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-green-500 text-gray-950"
                      : "border border-white/10 bg-white/[0.04] text-gray-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" /> Thinking…
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        </div>

        <footer className="border-t border-white/10 p-4 space-y-3">
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {LEARNING_QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                disabled={busy}
                onClick={() => void runPrompt(prompt.message)}
                className="rounded-full border border-green-500/25 bg-green-500/10 px-2.5 py-1 text-[11px] text-green-200 hover:bg-green-500/20 disabled:opacity-50 font-mono"
              >
                {prompt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void runPrompt(input);
                }
              }}
              placeholder="Ask what a session covered, MCP, ADK, evals…"
              rows={3}
              className="flex-1 resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-gray-100 outline-none focus:border-green-500/50"
            />
            <button
              type="button"
              onClick={() => void runPrompt(input)}
              disabled={busy || !input.trim()}
              className="self-end rounded-xl bg-green-500 px-4 py-2.5 text-sm font-bold text-gray-950 disabled:opacity-40 font-mono"
            >
              Send
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}

/** Floating sparkle + right slider — signed-in attendees and admins only. */
export function FloatingLearningChat() {
  const { user, userProfile, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading || !user || !userProfile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-gray-950 shadow-[0_12px_40px_-8px_rgba(34,197,94,0.55)] transition hover:scale-105 hover:bg-green-400"
        aria-label="Open learning assistant"
      >
        <Sparkles size={22} />
      </button>
      <LearningChatPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
