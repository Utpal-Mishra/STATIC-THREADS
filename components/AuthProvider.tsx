"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authErrorMessage, callbackHasError, clearAuthCallbackUrl, getSupabaseBrowser } from "@/lib/supabase-browser";

type AuthState = {
  status: "loading" | "disabled" | "signed-out" | "signed-in";
  user: User | null;
  message: string;
};
const AuthContext = createContext<AuthState>({ status: "loading", user: null, message: "" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null, message: "" });
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      clearAuthCallbackUrl();
      setState({ status: "disabled", user: null, message: "" });
      return;
    }
    let active = true;
    let revision = 0;
    const callbackError = callbackHasError();
    async function verify(session: Session | null) {
      const current = ++revision;
      if (!session) {
        if (active) setState({ status: "signed-out", user: null, message: "" });
        return;
      }
      try {
        // Never treat a user object from local storage alone as a verified identity.
        const { data, error } = await supabase!.auth.getUser();
        if (!active || current !== revision) return;
        if (error || !data.user) throw error;
        setState({ status: "signed-in", user: data.user, message: "" });
      } catch (error) {
        if (active && current === revision) setState({ status: "signed-out", user: null, message: authErrorMessage(error, "session") });
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Initialization below owns INITIAL_SESSION and callback error reporting.
      if (event !== "INITIAL_SESSION") queueMicrotask(() => { if (active) void verify(session); });
    });
    void (async () => {
      try {
        const { error: initializationError } = await supabase.auth.initialize();
        clearAuthCallbackUrl();
        if (initializationError || callbackError) {
          if (active) { ++revision; setState({ status: "signed-out", user: null, message: "This sign-in link is invalid or has expired. Request a new link and open it in the same browser." }); }
          return;
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (active) await verify(data.session);
      } catch (error) {
        clearAuthCallbackUrl();
        if (active) { ++revision; setState({ status: "signed-out", user: null, message: authErrorMessage(error, "session") }); }
      }
    })();
    return () => { active = false; ++revision; subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
