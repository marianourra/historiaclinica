import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the initial session lookup finishes. */
  loading: boolean;
  /** True only while the first profile fetch for the current user is in flight. */
  profileLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    specialty?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function resolveEmail(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed;
  const { data, error } = await supabase.rpc("email_for_login", {
    p_identifier: trimmed,
  });
  if (error) throw error;
  if (!data) throw new Error("No encontramos un usuario con ese nombre.");
  return data as string;
}

function normalizeProfile(data: Profile | null): Profile | null {
  if (!data) return null;
  return {
    ...data,
    role: data.role === "paciente" ? "paciente" : "medico",
    patient_id: data.patient_id ?? null,
    is_admin: Boolean(data.is_admin),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile(userId: string, opts?: { quiet?: boolean }) {
      const quiet = opts?.quiet || profileUserIdRef.current === userId;
      if (!quiet) setProfileLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select(
            "id, full_name, username, specialty, license_number, is_admin, role, patient_id",
          )
          .eq("id", userId)
          .maybeSingle();
        if (!active) return;
        profileUserIdRef.current = userId;
        setProfile(normalizeProfile(data as Profile | null));
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      if (data.session?.user.id) {
        void loadProfile(data.session.user.id);
      } else {
        profileUserIdRef.current = null;
        setProfile(null);
        setProfileLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        // Never await Supabase calls directly inside this callback (auth deadlock).
        queueMicrotask(() => {
          if (!active) return;
          if (!nextSession?.user.id) {
            profileUserIdRef.current = null;
            setProfile(null);
            setProfileLoading(false);
            return;
          }
          const sameUser = profileUserIdRef.current === nextSession.user.id;
          // Token refresh / same user: refresh profile quietly if needed.
          if (event === "TOKEN_REFRESHED" && sameUser) return;
          void loadProfile(nextSession.user.id, { quiet: sameUser });
        });
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      signIn: async (identifier, password) => {
        const email = await resolveEmail(identifier);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signUp: async ({ email, password, fullName, username, specialty }) => {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: username.trim().toLowerCase(),
              specialty: specialty?.trim() || null,
            },
          },
        });
        if (error) throw error;
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [loading, profile, profileLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
