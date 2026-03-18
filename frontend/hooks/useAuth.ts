import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useChatStore } from "../stores/chatStore";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || (session && !session.user)) {
        // Stale/invalid session — silently clear it
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
      } else {
        setSession(session);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" && !session) {
        // Refresh failed — stale token, silently clear
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    useChatStore.getState().reset();
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  return { session, loading, signUp, signIn, signOut };
}
