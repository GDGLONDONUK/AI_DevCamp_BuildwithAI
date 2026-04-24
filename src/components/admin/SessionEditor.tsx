"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import toast from "react-hot-toast";
import { Session, Resource, SessionSelfCheckInDocument, SessionSpeaker } from "@/types";
import { X, Plus, Trash2, GripVertical, ExternalLink, KeyRound, ChevronUp, ChevronDown } from "lucide-react";
import CopyTextButton from "@/components/ui/CopyTextButton";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { SESSION_SELF_CHECKIN_COLLECTION } from "@/lib/sessionSelfCheckInConstants";

interface Props {
  session: Partial<Session> | null;
  onSave: (s: Session) => Promise<void>;
  onClose: () => void;
}

const BLANK: Partial<Session> = {
  number: 1,
  title: "",
  date: "",
  time: "6:00 PM – 9:00 PM",
  duration: "3 hours",
  week: 1,
  topic: "",
  description: "",
  speaker: "",
  speakerTitle: "",
  speakerPhoto: "",
  tags: [],
  whatYouWillLearn: [],
  buildIdeas: [],
  resources: [],
  speakers: [],
  isKickoff: false,
  isClosing: false,
};

function initialSpeakersDraft(s: Partial<Session> | null | undefined): SessionSpeaker[] {
  const raw = s?.speakers?.filter((x) => (x?.name ?? "").trim().length > 0);
  if (raw && raw.length > 0) {
    return raw.map((x) => ({
      name: x.name.trim(),
      title: x.title ?? "",
      photo: x.photo ?? "",
    }));
  }
  if (s?.speaker?.trim()) {
    return [
      {
        name: s.speaker.trim(),
        title: s.speakerTitle ?? "",
        photo: s.speakerPhoto ?? "",
      },
    ];
  }
  return [{ name: "", title: "", photo: "" }];
}

function generateId(n: number) {
  return `session-${n}`;
}

function isoToDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function randomSixDigitCode(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0]! % 1_000_000).padStart(6, "0");
}

export default function SessionEditor({ session, onSave, onClose }: Props) {
  const [form, setForm] = useState<Partial<Session>>(session ?? BLANK);
  const [saving, setSaving] = useState(false);
  const [checkInEnabled, setCheckInEnabled] = useState(false);
  const [liveCode, setLiveCode] = useState("");
  const [liveOpens, setLiveOpens] = useState("");
  const [liveCloses, setLiveCloses] = useState("");

  // Tag input states
  const [tagInput, setTagInput] = useState("");
  const [learnInput, setLearnInput] = useState("");
  const [buildInput, setBuildInput] = useState("");
  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [speakersDraft, setSpeakersDraft] = useState<SessionSpeaker[]>([{ name: "", title: "", photo: "" }]);

  useEffect(() => {
    setForm(session ?? BLANK);
    setSpeakersDraft(initialSpeakersDraft(session ?? null));
    setTagInput(""); setLearnInput(""); setBuildInput("");
    setResTitle(""); setResUrl("");
  }, [session]);

  useEffect(() => {
    const id = form.id;
    if (!id) {
      setCheckInEnabled(false);
      setLiveCode("");
      setLiveOpens("");
      setLiveCloses("");
      return;
    }
    let cancelled = false;
    getDoc(doc(db, SESSION_SELF_CHECKIN_COLLECTION, id)).then((snap) => {
      if (cancelled) return;
      if (!snap.exists()) {
        setCheckInEnabled(false);
        setLiveCode("");
        setLiveOpens("");
        setLiveCloses("");
        return;
      }
      const d = snap.data() as SessionSelfCheckInDocument;
      setCheckInEnabled(true);
      setLiveCode(d.code ?? "");
      setLiveOpens(isoToDatetimeLocal(d.opensAt ?? ""));
      setLiveCloses(isoToDatetimeLocal(d.closesAt ?? ""));
    });
    return () => {
      cancelled = true;
    };
  }, [form.id]);

  const set = (field: keyof Session, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ── Array helpers ──────────────────────────────────────────────────────────
  function addToArray(field: "tags" | "whatYouWillLearn" | "buildIdeas", value: string) {
    if (!value.trim()) return;
    const arr = (form[field] as string[]) ?? [];
    if (!arr.includes(value.trim())) set(field, [...arr, value.trim()]);
  }

  function removeFromArray(field: "tags" | "whatYouWillLearn" | "buildIdeas", value: string) {
    set(field, ((form[field] as string[]) ?? []).filter((v) => v !== value));
  }

  function addResource() {
    if (!resTitle.trim() || !resUrl.trim()) return;
    const res: Resource = { title: resTitle.trim(), url: resUrl.trim() };
    set("resources", [...(form.resources ?? []), res]);
    setResTitle(""); setResUrl("");
  }

  function removeResource(idx: number) {
    set("resources", (form.resources ?? []).filter((_, i) => i !== idx));
  }

  function updateSpeaker(i: number, field: keyof SessionSpeaker, value: string) {
    setSpeakersDraft((rows) => rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  }

  function addSpeakerRow() {
    setSpeakersDraft((rows) => [...rows, { name: "", title: "", photo: "" }]);
  }

  function removeSpeakerRow(i: number) {
    setSpeakersDraft((rows) => (rows.length <= 1 ? rows : rows.filter((_, j) => j !== i)));
  }

  function moveSpeakerRow(i: number, delta: -1 | 1) {
    setSpeakersDraft((rows) => {
      const j = i + delta;
      if (j < 0 || j >= rows.length) return rows;
      const next = [...rows];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  function handleKeyAdd(
    e: KeyboardEvent<HTMLInputElement>,
    field: "tags" | "whatYouWillLearn" | "buildIdeas",
    val: string,
    clear: () => void
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      addToArray(field, val);
      clear();
    }
  }

  async function persistSelfCheckIn(sessionId: string) {
    const ref = doc(db, SESSION_SELF_CHECKIN_COLLECTION, sessionId);
    if (!checkInEnabled) {
      try {
        await deleteDoc(ref);
      } catch {
        /* no document */
      }
      return;
    }
    if (!liveCode.trim() || !liveOpens || !liveCloses) {
      toast.error("Live check-in: add a code and open/close times, or turn check-in off.");
      throw new Error("Incomplete check-in settings");
    }
    const opensIso = new Date(liveOpens).toISOString();
    const closesIso = new Date(liveCloses).toISOString();
    if (new Date(closesIso).getTime() <= new Date(opensIso).getTime()) {
      toast.error("Check-in close time must be after open time.");
      throw new Error("Invalid check-in window");
    }
    await setDoc(
      ref,
      {
        code: liveCode.replace(/\D/g, "").padStart(6, "0").slice(-6),
        opensAt: opensIso,
        closesAt: closesIso,
        updatedAt: new Date().toISOString(),
        updatedByUid: auth.currentUser?.uid ?? "",
      },
      { merge: true }
    );
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title?.trim() || !form.date?.trim()) return;
    setSaving(true);
    const id = form.id || generateId(form.number ?? 1);
    const cleanedSpeakers = speakersDraft
      .map((x) => ({
        name: x.name.trim(),
        title: x.title?.trim() || undefined,
        photo: x.photo?.trim() || undefined,
      }))
      .filter((x) => x.name.length > 0);
    const first = cleanedSpeakers[0];
    try {
      await onSave({
        ...BLANK,
        ...form,
        id,
        speakers: cleanedSpeakers.length > 0 ? cleanedSpeakers : [],
        speaker: first?.name ?? "",
        speakerTitle: first?.title,
        speakerPhoto: first?.photo,
      } as Session);
      try {
        await persistSelfCheckIn(id);
      } catch {
        /* toast already shown */
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono";
  const labelClass = "block text-xs font-semibold text-gray-400 mb-1.5 font-mono uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d1210] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
          <h2 className="text-lg font-bold text-white font-mono">
            {form.id ? `Edit — ${form.title || "Session"}` : "New Session"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Row: number + week */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Session #</label>
              <input
                type="number" min={1}
                value={form.number ?? ""}
                onChange={(e) => set("number", parseInt(e.target.value) || 1)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Week</label>
              <input
                type="number" min={1}
                value={form.week ?? ""}
                onChange={(e) => set("week", parseInt(e.target.value) || 1)}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelClass}>Title *</label>
            <input
              value={form.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Kick Off"
              className={fieldClass}
            />
          </div>

          {/* Topic */}
          <div>
            <label className={labelClass}>Topic / Theme</label>
            <input
              value={form.topic ?? ""}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="e.g. Python for AI (Foundations)"
              className={fieldClass}
            />
          </div>

          {/* Description */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
                Description
              </label>
              <CopyTextButton text={(form.description ?? "").trim()} label="Copy description" />
            </div>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Brief overview of this session..."
              className={fieldClass + " resize-none"}
            />
          </div>

          {/* Row: date + time + duration */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={labelClass}>Date *</label>
              <input
                value={form.date ?? ""}
                onChange={(e) => set("date", e.target.value)}
                placeholder="23 April 2026"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Time</label>
              <input
                value={form.time ?? ""}
                onChange={(e) => set("time", e.target.value)}
                placeholder="6:00 PM – 9:00 PM"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Duration</label>
              <input
                value={form.duration ?? ""}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="3 hours"
                className={fieldClass}
              />
            </div>
          </div>

          {/* Speakers */}
          <div>
            <label className={labelClass}>Speakers</label>
            <p className="text-[11px] text-gray-500 mb-3 leading-snug">
              One or more presenters. Order is shown on the session schedule. The first entry is mirrored to legacy
              single-speaker fields for compatibility.
            </p>
            <ul className="space-y-3">
              {speakersDraft.map((sp, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wide">
                      Speaker {idx + 1}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        title="Move up"
                        onClick={() => moveSpeakerRow(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        onClick={() => moveSpeakerRow(idx, 1)}
                        disabled={idx === speakersDraft.length - 1}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => removeSpeakerRow(idx)}
                        disabled={speakersDraft.length <= 1}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      value={sp.name}
                      onChange={(e) => updateSpeaker(idx, "name", e.target.value)}
                      placeholder="Name"
                      className={fieldClass}
                    />
                    <input
                      value={sp.title ?? ""}
                      onChange={(e) => updateSpeaker(idx, "title", e.target.value)}
                      placeholder="Title / organisation"
                      className={fieldClass}
                    />
                  </div>
                  <input
                    value={sp.photo ?? ""}
                    onChange={(e) => updateSpeaker(idx, "photo", e.target.value)}
                    placeholder="Photo URL (optional)"
                    className={fieldClass}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addSpeakerRow}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-green-400 bg-green-500/15 border border-green-500/30 hover:bg-green-500/25 px-3 py-2 rounded-xl transition-colors"
            >
              <Plus size={14} /> Add speaker
            </button>
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => handleKeyAdd(e, "tags", tagInput, () => setTagInput(""))}
                placeholder="Type a tag and press Enter"
                className={fieldClass}
              />
              <button
                onClick={() => { addToArray("tags", tagInput); setTagInput(""); }}
                className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 rounded-xl border border-green-500/30 transition-colors flex-shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(form.tags ?? []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 bg-green-500/15 text-green-300 border border-green-500/25 px-2.5 py-0.5 rounded-full text-xs font-mono">
                  {tag}
                  <button onClick={() => removeFromArray("tags", tag)} className="hover:text-red-400 ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* What you will learn */}
          <div>
            <label className={labelClass}>What You Will Learn</label>
            <div className="flex gap-2 mb-2">
              <input
                value={learnInput}
                onChange={(e) => setLearnInput(e.target.value)}
                onKeyDown={(e) => handleKeyAdd(e, "whatYouWillLearn", learnInput, () => setLearnInput(""))}
                placeholder="Add a learning outcome and press Enter"
                className={fieldClass}
              />
              <button
                onClick={() => { addToArray("whatYouWillLearn", learnInput); setLearnInput(""); }}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 rounded-xl border border-blue-500/30 transition-colors flex-shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
            <ul className="space-y-1.5">
              {(form.whatYouWillLearn ?? []).map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-300 bg-white/[0.03] border border-white/6 rounded-lg px-3 py-1.5">
                  <span className="text-blue-400 text-xs">▸</span>
                  <span className="flex-1">{item}</span>
                  <button onClick={() => removeFromArray("whatYouWillLearn", item)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Build ideas */}
          <div>
            <label className={labelClass}>Build Ideas / Projects</label>
            <div className="flex gap-2 mb-2">
              <input
                value={buildInput}
                onChange={(e) => setBuildInput(e.target.value)}
                onKeyDown={(e) => handleKeyAdd(e, "buildIdeas", buildInput, () => setBuildInput(""))}
                placeholder="Add a build idea and press Enter"
                className={fieldClass}
              />
              <button
                onClick={() => { addToArray("buildIdeas", buildInput); setBuildInput(""); }}
                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 rounded-xl border border-purple-500/30 transition-colors flex-shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(form.buildIdeas ?? []).map((idea) => (
                <span key={idea} className="inline-flex items-center gap-1 bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2.5 py-0.5 rounded-full text-xs font-mono">
                  {idea}
                  <button onClick={() => removeFromArray("buildIdeas", idea)} className="hover:text-red-400 ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Video + Drive folder */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Session Recording URL</label>
              <input
                value={form.videoUrl ?? ""}
                onChange={(e) => set("videoUrl", e.target.value)}
                placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                className={fieldClass}
              />
              <p className="text-xs text-gray-600 mt-1 font-mono">Add after the session is completed (YouTube, Google Drive, Loom…)</p>
            </div>
            <div>
              <label className={labelClass}>Resources Folder URL</label>
              <input
                value={form.resourcesFolderUrl ?? ""}
                onChange={(e) => set("resourcesFolderUrl", e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className={fieldClass}
              />
              <p className="text-xs text-gray-600 mt-1 font-mono">Shared Google Drive folder, Notion page, or any link</p>
            </div>
          </div>

          {/* Resources */}
          <div>
            <label className={labelClass}>Resources / Links</label>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
              <input
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                placeholder="Resource title"
                className={fieldClass}
              />
              <input
                value={resUrl}
                onChange={(e) => setResUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addResource(); } }}
                placeholder="https://..."
                className={fieldClass}
              />
              <button
                onClick={addResource}
                className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-3 rounded-xl border border-orange-500/30 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <ul className="space-y-1.5">
              {(form.resources ?? []).map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm bg-white/[0.03] border border-white/6 rounded-lg px-3 py-1.5">
                  <ExternalLink size={12} className="text-orange-400 flex-shrink-0" />
                  <span className="flex-1 text-gray-300">{r.title}</span>
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline font-mono truncate max-w-[140px]">
                    {r.url}
                  </a>
                  <button onClick={() => removeResource(i)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Live self check-in (code never on public session docs) */}
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] p-4 space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-mono text-sm font-bold">
              <KeyRound size={16} />
              Live attendance code
            </div>
            <p className="text-xs text-gray-500 leading-snug">
              Attendees signed into the app can mark themselves present during the window below by entering this
              6-digit code on the session schedule. The code is stored separately from the public session document.
            </p>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-300">
              <input
                type="checkbox"
                checked={checkInEnabled}
                onChange={(e) => {
                  setCheckInEnabled(e.target.checked);
                  if (!e.target.checked) setLiveCode("");
                }}
                className="w-4 h-4 accent-cyan-500"
              />
              Enable self check-in for this session
            </label>
            {checkInEnabled && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[140px]">
                    <label className={labelClass}>6-digit code</label>
                    <div className="relative">
                      <input
                        value={liveCode}
                        onChange={(e) => setLiveCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className={fieldClass + " tracking-[0.35em] font-bold text-lg pr-11"}
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <CopyTextButton
                          text={liveCode.replace(/\D/g, "").padStart(6, "0").slice(-6)}
                          label="Copy attendance code"
                          disabled={!liveCode.replace(/\D/g, "")}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLiveCode(randomSixDigitCode())}
                    className="px-3 py-2.5 text-xs font-mono font-semibold rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-500/35 hover:bg-cyan-500/30"
                  >
                    Generate
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Window opens (local)</label>
                    <input
                      type="datetime-local"
                      value={liveOpens}
                      onChange={(e) => setLiveOpens(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Window closes (local)</label>
                    <input
                      type="datetime-local"
                      value={liveCloses}
                      onChange={(e) => setLiveCloses(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isKickoff ?? false}
                onChange={(e) => set("isKickoff", e.target.checked)}
                className="w-4 h-4 accent-green-500"
              />
              <span className="text-sm text-gray-300">🚀 Kick-off session</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isClosing ?? false}
                onChange={(e) => set("isClosing", e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <span className="text-sm text-gray-300">🏆 Closing session</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all font-mono"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title?.trim() || !form.date?.trim()}
            className="px-6 py-2.5 text-sm font-bold bg-green-500 hover:bg-green-400 text-gray-950 rounded-xl transition-all disabled:opacity-50 font-mono flex items-center gap-2"
          >
            {saving && <span className="animate-spin">◌</span>}
            {form.id ? "Save Changes" : "Create Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
