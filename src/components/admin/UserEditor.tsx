"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { UserProfile, UserRole, UserStatus } from "@/types";
import StatusDropdown from "@/components/admin/StatusDropdown";
import { joiningInPersonLabel } from "@/lib/kickoffRsvp";

function splitList(s: string): string[] {
  return s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinList(arr: string[] | undefined): string {
  return (arr || []).join(", ");
}

interface UserEditorProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (uid: string, updates: Record<string, unknown>) => Promise<void>;
}

export default function UserEditor({ user, onClose, onSave }: UserEditorProps) {
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [handle, setHandle] = useState(user.handle || "");
  const [roleTitle, setRoleTitle] = useState(user.roleTitle || "");
  const [city, setCity] = useState(user.city || "");
  const [country, setCountry] = useState(user.country || "");
  const [location, setLocation] = useState(user.location || "");
  const [bio, setBio] = useState(user.bio || "");
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | "">(
    user.experienceLevel || ""
  );
  const [skills, setSkills] = useState(joinList(user.skills));
  const [expertise, setExpertise] = useState(joinList(user.expertise));
  const [wantToLearn, setWantToLearn] = useState(joinList(user.wantToLearn));
  const [canOffer, setCanOffer] = useState(joinList(user.canOffer));
  const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl || "");
  const [githubUrl, setGithubUrl] = useState(user.githubUrl || "");
  const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl || "");
  const [joiningInPerson, setJoiningInPerson] = useState(user.joiningInPerson || "");
  const [kickoffInPersonRsvp, setKickoffInPersonRsvp] = useState<"" | "yes" | "no">(
    typeof user.kickoffInPersonRsvp === "boolean" ? (user.kickoffInPersonRsvp ? "yes" : "no") : ""
  );
  const [userStatus, setUserStatus] = useState<UserStatus>(user.userStatus || "pending");
  const [role, setRole] = useState<UserRole>(user.role || "attendee");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        displayName: displayName.trim(),
        handle: (() => {
          const h = handle.trim().toLowerCase();
          return h.length >= 1 ? h : (user.handle || "");
        })(),
        roleTitle: roleTitle.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        experienceLevel: experienceLevel || null,
        skills: splitList(skills),
        expertise: splitList(expertise),
        wantToLearn: splitList(wantToLearn),
        canOffer: splitList(canOffer),
        linkedinUrl: linkedinUrl.trim() || null,
        githubUrl: githubUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        userStatus,
        role,
      };

      if (kickoffInPersonRsvp === "yes") {
        updates.kickoffInPersonRsvp = true;
        updates.joiningInPerson = joiningInPerson.trim() || joiningInPersonLabel(true);
      } else if (kickoffInPersonRsvp === "no") {
        updates.kickoffInPersonRsvp = false;
        updates.joiningInPerson = joiningInPerson.trim() || joiningInPersonLabel(false);
      } else if (joiningInPerson.trim()) {
        updates.joiningInPerson = joiningInPerson.trim();
      }

      await onSave(user.uid, updates);
      onClose();
    } catch {
      toast.error("Could not save user");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full bg-gray-900/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/8 bg-[#0d1117]/95">
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Edit user</h2>
            <p className="text-xs text-gray-500 font-mono truncate max-w-[280px] sm:max-w-md">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-gray-500 mb-1">Email (read-only)</label>
              <input readOnly value={user.email} className={`${inputCls} opacity-60 cursor-not-allowed`} />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">Display name *</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">Handle</label>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="username" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-gray-500 mb-1">Role / title</label>
              <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-green-400 uppercase tracking-widest mb-2">Access</div>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Status</label>
                <StatusDropdown status={userStatus} onChange={setUserStatus} />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className={`${inputCls} w-auto min-w-[140px]`}
                >
                  <option value="attendee">Attendee</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-2">Location</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Country</label>
                <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-mono text-gray-500 mb-1">Location (free text)</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={`${inputCls} resize-y min-h-[100px]`} />
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1">Experience level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as typeof experienceLevel)}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-2">Tags (comma-separated)</div>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Skills</label>
                <input value={skills} onChange={(e) => setSkills(e.target.value)} className={inputCls} placeholder="e.g. Python, TypeScript" />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Expertise</label>
                <input value={expertise} onChange={(e) => setExpertise(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Want to learn</label>
                <input value={wantToLearn} onChange={(e) => setWantToLearn(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Can offer</label>
                <input value={canOffer} onChange={(e) => setCanOffer(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-orange-400 uppercase tracking-widest mb-2">Links</div>
            <div className="grid gap-3">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">LinkedIn</label>
                <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={inputCls} placeholder="https://" />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">GitHub</label>
                <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className={inputCls} placeholder="https://" />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">Website</label>
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className={inputCls} placeholder="https://" />
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-2">Kick-off (23 Apr)</div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">RSVP</label>
                <select
                  value={kickoffInPersonRsvp}
                  onChange={(e) => setKickoffInPersonRsvp(e.target.value as "" | "yes" | "no")}
                  className={inputCls}
                >
                  <option value="">Not set</option>
                  <option value="yes">In person</option>
                  <option value="no">Online only</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono text-gray-500 mb-1">Joining note (optional)</label>
                <input
                  value={joiningInPerson}
                  onChange={(e) => setJoiningInPerson(e.target.value)}
                  className={inputCls}
                  placeholder="Overrides auto label if you type something"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-5 py-4 border-t border-white/8 bg-[#0d1117]/95">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-mono text-gray-400 border border-white/10 hover:border-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !displayName.trim()}
            onClick={submit}
            className="px-5 py-2 rounded-lg text-sm font-mono font-bold bg-green-500 hover:bg-green-400 text-gray-950 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
