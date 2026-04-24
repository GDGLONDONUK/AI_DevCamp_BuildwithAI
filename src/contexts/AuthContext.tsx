"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, syncAuthProvidersToUserDoc } from "@/lib/auth";
import { ensureProfileOnServer } from "@/lib/meApi";
import { UserProfile } from "@/types";

function profileAccessRevoked(profile: UserProfile | null | undefined): boolean {
  return profile?.accountDisabled === true || profile?.programOptOut === true;
}

function readBootstrapAuthError(e: unknown): "ACCOUNT_DISABLED" | "PROGRAM_OPT_OUT" | null {
  if (e instanceof Error && e.message === "ACCOUNT_DISABLED") return "ACCOUNT_DISABLED";
  if (e instanceof Error && e.message === "PROGRAM_OPT_OUT") return "PROGRAM_OPT_OUT";
  return null;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        try {
          await ensureProfileOnServer();
          profile = await getUserProfile(user.uid);
        } catch (e) {
          console.error("ensureProfileOnServer", e);
          const code = readBootstrapAuthError(e);
          if (code) {
            await signOut(auth);
            setUserProfile(null);
            return;
          }
        }
      }
      if (profileAccessRevoked(profile)) {
        await signOut(auth);
        setUserProfile(null);
        return;
      }
      if (profile) {
        try {
          await syncAuthProvidersToUserDoc(user);
          profile = (await getUserProfile(user.uid)) ?? profile;
        } catch (e) {
          console.error("syncAuthProvidersToUserDoc", e);
        }
      }
      if (profileAccessRevoked(profile)) {
        await signOut(auth);
        setUserProfile(null);
        return;
      }
      setUserProfile(profile);
    } catch (e) {
      // Network blips on getUserProfile must not look like a failed "save" after updateDoc
      console.error("refreshProfile", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Set a session cookie so the Edge proxy can detect auth state
        // The cookie has no sensitive data — real security is in Firestore rules
        document.cookie = "firebase-session=1; path=/; SameSite=Lax";
        let profile = await getUserProfile(firebaseUser.uid);
        if (!profile) {
          try {
            await ensureProfileOnServer();
            profile = await getUserProfile(firebaseUser.uid);
          } catch (e) {
            console.error("ensureProfileOnServer", e);
            const code = readBootstrapAuthError(e);
            if (code) {
              await signOut(auth);
              setUserProfile(null);
              setLoading(false);
              return;
            }
          }
        }
        if (profileAccessRevoked(profile)) {
          await signOut(auth);
          setUserProfile(null);
          setLoading(false);
          return;
        }
        if (profile) {
          try {
            await syncAuthProvidersToUserDoc(firebaseUser);
            profile = (await getUserProfile(firebaseUser.uid)) ?? profile;
          } catch (e) {
            console.error("syncAuthProvidersToUserDoc", e);
          }
        }
        if (profileAccessRevoked(profile)) {
          await signOut(auth);
          setUserProfile(null);
          setLoading(false);
          return;
        }
        setUserProfile(profile);
      } else {
        // Clear session cookie on sign-out
        document.cookie = "firebase-session=; path=/; max-age=0";
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
