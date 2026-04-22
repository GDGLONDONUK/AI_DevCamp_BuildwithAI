"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, syncAuthProvidersToUserDoc } from "@/lib/auth";
import { ensureProfileOnServer } from "@/lib/meApi";
import { UserProfile } from "@/types";

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
        }
      }
      if (profile) {
        try {
          await syncAuthProvidersToUserDoc(user);
          profile = (await getUserProfile(user.uid)) ?? profile;
        } catch (e) {
          console.error("syncAuthProvidersToUserDoc", e);
        }
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
          }
        }
        if (profile) {
          try {
            await syncAuthProvidersToUserDoc(firebaseUser);
            profile = (await getUserProfile(firebaseUser.uid)) ?? profile;
          } catch (e) {
            console.error("syncAuthProvidersToUserDoc", e);
          }
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
