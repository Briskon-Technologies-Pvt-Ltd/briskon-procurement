"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

/* --------------------------------------------
   User Profile Type (Enhanced)
-------------------------------------------- */
export type UserProfile = {
  id: string;                          // ← add profile id
  user_id?: string;
  organization_id?: string | null;
  fname?: string;
  lname?: string;
  email?: string;
  role?: string;
  avatar_url?: string | null;
  metadata?: Record<string, any> | null;
};

/* --------------------------------------------
   Context Type Definition
-------------------------------------------- */
type AuthContextType = {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

/* --------------------------------------------
   Context Initialization
-------------------------------------------- */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* --------------------------------------------
   Provider Component
-------------------------------------------- */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /* --------------------------------------------
     Load Session on Init
  -------------------------------------------- */
  useEffect(() => {
    const initAuth = async () => {
      console.log("🔹 Checking for existing Supabase session...");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        console.log("✅ Session found:", session.user.email);
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        console.log("⚠️ No session found, redirecting if protected route...");
        const path = window.location.pathname;
        if (
          path.startsWith("/admin") ||
          path.startsWith("/buyer") ||
          path.startsWith("/supplier")
        ) {
          router.push("/login");
        }
      }

      setLoading(false);
    };

    initAuth();

    // Listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          console.log("🔄 Auth state changed: logged in");
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          console.log("🚪 Logged out");
          setUser(null);
          setProfile(null);
          const path = window.location.pathname;
          if (
            path.startsWith("/admin") ||
            path.startsWith("/buyer") ||
            path.startsWith("/supplier")
          ) {
            router.push("/login");
          }
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  /* --------------------------------------------
     Helper: Load Profile from Supabase
  -------------------------------------------- */
  const loadProfile = async (userId: string) => {
    console.log("📥 Fetching profile for:", userId);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, organization_id, fname, lname, metadata, avatar_url")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      console.log("✅ Profile loaded:", data);
      setProfile({
        id: data.id,
        user_id: data.user_id,
        organization_id: data.organization_id,
        fname: data.fname,
        lname: data.lname,
        email: user?.email || "",
        role:
          data?.metadata?.role ||
          (data.organization_id ? "admin" : "supplier"), // default logic
        avatar_url: data.avatar_url || null,
        metadata: data.metadata || {},
      });
    } else {
      console.warn("⚠️ No profile found for user ID:", userId, error);
    }
  };

  /* --------------------------------------------
     Logout Function
  -------------------------------------------- */
  const signOut = async () => {
    console.log("🚪 Signing out...");
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/login");
  };

  /* --------------------------------------------
     Return Provider
  -------------------------------------------- */
  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

/* --------------------------------------------
   Custom Hook
-------------------------------------------- */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
