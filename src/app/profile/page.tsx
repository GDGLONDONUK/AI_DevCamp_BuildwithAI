"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureProfileOnServer } from "@/lib/meApi";
import { stripUndefinedForFirestoreClient } from "@/lib/stripUndefinedFirestore";
import { User, Globe, Save } from "lucide-react";
import LocationPicker from "@/components/ui/LocationPicker";
import SkillsSelector from "@/components/ui/SkillsSelector";
import { SKILL_TAGS, EXPERTISE_TAGS, WANT_TO_LEARN_TAGS as WANT_TAGS, CAN_OFFER_TAGS as OFFER_TAGS } from "@/data/tags";
import { GithubIcon, LinkedinIcon } from "@/components/icons/SocialBrandIcons";
import Input from "@/components/ui/Input";
import CopyTextButton from "@/components/ui/CopyTextButton";
import Button from "@/components/ui/Button";
import ProfileCompletion from "@/components/ui/ProfileCompletion";
import toast from "react-hot-toast";
import { unknownErrorMessage } from "@/lib/unknownErrorMessage";

export default function ProfilePage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    city: "",
    country: "",
    skills: [] as string[],
    expertise: [] as string[],
    wantToLearn: [] as string[],
    canOffer: [] as string[],
    linkedinUrl: "",
    githubUrl: "",
    websiteUrl: "",
    experienceLevel: "beginner" as "beginner" | "intermediate" | "advanced",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (userProfile) {
      setForm({
        displayName: userProfile.displayName || "",
        bio: userProfile.bio || "",
        city: userProfile.city || "",
        country: userProfile.country || "",
        skills: userProfile.skills || [],
        expertise: userProfile.expertise || [],
        wantToLearn: userProfile.wantToLearn || [],
        canOffer: userProfile.canOffer || [],
        linkedinUrl: userProfile.linkedinUrl || "",
        githubUrl: userProfile.githubUrl || "",
        websiteUrl: userProfile.websiteUrl || "",
        experienceLevel: userProfile.experienceLevel || "beginner",
      });
    }
  }, [user, userProfile, loading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const existing = await getDoc(userRef);
      if (!existing.exists()) {
        await ensureProfileOnServer();
        if (!(await getDoc(userRef)).exists()) {
          throw new Error(
            "No profile document. Try signing out and back in, or check your network."
          );
        }
      }
      const c = (s: string | undefined) => (s == null ? "" : s);
      const strList = (arr: string[] | undefined) =>
        (arr ?? []).filter((x): x is string => typeof x === "string" && x !== undefined);
      const updatePayload: Record<string, unknown> = {
        displayName: c(form.displayName),
        bio: c(form.bio),
        city: c(form.city),
        country: c(form.country),
        location: [c(form.city), c(form.country)].filter(Boolean).join(", "),
        skills: strList(form.skills),
        expertise: strList(form.expertise),
        wantToLearn: strList(form.wantToLearn),
        canOffer: strList(form.canOffer),
        linkedinUrl: c(form.linkedinUrl),
        githubUrl: c(form.githubUrl),
        websiteUrl: c(form.websiteUrl),
        experienceLevel: form.experienceLevel,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(
        userRef,
        stripUndefinedForFirestoreClient(updatePayload)
      );
      await refreshProfile();
      toast.success("Profile updated!");
    } catch (err) {
      console.error("Profile save failed:", err);
      const msg = unknownErrorMessage(
        err,
        "Failed to update profile. Try again or sign out and back in."
      );
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">
            Help mentors and other attendees get to know you.
          </p>
        </div>

        {/* Profile completion indicator */}
        <ProfileCompletion profile={userProfile} variant="full" />

        <form
          onSubmit={handleSave}
          className="bg-gray-900 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center gap-4 pb-5 border-b border-white/10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {(form.displayName || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-white font-semibold truncate">
                  {form.displayName || "Your Name"}
                </p>
                {(form.displayName || "").trim() ? (
                  <CopyTextButton text={form.displayName} label="Copy display name" />
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <p className="text-gray-400 text-sm truncate">{user.email}</p>
                {user.email ? <CopyTextButton text={user.email} label="Copy email" /> : null}
              </div>
              {userProfile?.role && (
                <span className="inline-block mt-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full capitalize">
                  {userProfile.role}
                </span>
              )}
            </div>
          </div>

          <Input
            id="displayName"
            label="Display Name"
            placeholder="Your full name or alias"
            icon={<User size={16} />}
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            trailingSlot={<CopyTextButton text={form.displayName} label="Copy display name" />}
          />

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-sm font-medium text-gray-300">Bio</label>
              <CopyTextButton text={form.bio} label="Copy bio" />
            </div>
            <textarea
              rows={4}
              placeholder="Tell us about yourself — your background, goals, and what excites you about AI..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <LocationPicker
            city={form.city}
            country={form.country}
            onCityChange={(v) => setForm({ ...form, city: v })}
            onCountryChange={(v) => setForm({ ...form, country: v })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Experience Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["beginner", "intermediate", "advanced"] as const).map(
                (level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm({ ...form, experienceLevel: level })}
                    className={`py-2.5 rounded-lg text-sm font-semibold border capitalize transition-all ${
                      form.experienceLevel === level
                        ? "bg-green-600 border-green-500 text-white"
                        : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {level}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Skills & Expertise */}
          <div className="space-y-5 bg-white/[0.02] border border-white/8 rounded-xl p-5">
            <p className="text-sm font-semibold text-white mb-3">Skills &amp; Expertise</p>

            <SkillsSelector
              label="My programming skills"
              selected={form.skills}
              onChange={(v) => setForm({ ...form, skills: v })}
              presets={SKILL_TAGS}
              color="purple"
            />

            <div className="border-t border-white/8 pt-5">
              <SkillsSelector
                label="My domain expertise"
                selected={form.expertise}
                onChange={(v) => setForm({ ...form, expertise: v })}
                presets={EXPERTISE_TAGS}
                color="orange"
              />
            </div>
          </div>

          {/* Learning & Offering */}
          <div className="space-y-5 bg-white/[0.02] border border-white/8 rounded-xl p-5">
            <p className="text-sm font-semibold text-white mb-3">AI DevCamp Tags</p>

            <SkillsSelector
              label="I want to learn"
              selected={form.wantToLearn}
              onChange={(v) => setForm({ ...form, wantToLearn: v })}
              presets={WANT_TAGS}
              color="green"
            />

            <div className="border-t border-white/8 pt-5">
              <SkillsSelector
                label="I can offer / help with"
                selected={form.canOffer}
                onChange={(v) => setForm({ ...form, canOffer: v })}
                presets={OFFER_TAGS}
                color="blue"
              />
            </div>
          </div>

          <Input
            id="linkedin"
            label="LinkedIn"
            placeholder="https://linkedin.com/in/yourname"
            icon={<LinkedinIcon />}
            value={form.linkedinUrl}
            onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
            trailingSlot={<CopyTextButton text={form.linkedinUrl} label="Copy LinkedIn URL" />}
          />

          <Input
            id="github"
            label="GitHub"
            placeholder="https://github.com/yourname"
            icon={<GithubIcon />}
            value={form.githubUrl}
            onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
            trailingSlot={<CopyTextButton text={form.githubUrl} label="Copy GitHub URL" />}
          />

          <Input
            id="website"
            label="Personal Website"
            placeholder="https://yourwebsite.com"
            icon={<Globe size={16} />}
            value={form.websiteUrl}
            onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
            trailingSlot={<CopyTextButton text={form.websiteUrl} label="Copy website URL" />}
          />

          <Button type="submit" loading={saving} className="w-full" size="lg">
            <Save size={16} />
            Save Profile
          </Button>
        </form>
      </div>
    </div>
  );
}
