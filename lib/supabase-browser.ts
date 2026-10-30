import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type CloudConfig = { url: string; anonKey: string };
let client: SupabaseClient | null = null;

export function getCloudConfig(): CloudConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) return null;
    return { url: url.replace(/\/$/, ""), anonKey };
  } catch {
    return null;
  }
}

export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const config = getCloudConfig();
  if (!config) return null;
  client ??= createClient(config.url, config.anonKey, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}

export function accountRedirectUrl() {
  return `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/account/`;
}

export async function requestMagicLink(email: string) {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error("Account sign-in is not configured yet.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: accountRedirectUrl() }
  });
  if (error) throw error;
}

export function cloudEnabled() {
  return Boolean(getCloudConfig());
}

// Remove credentials/errors from history without disturbing ordinary section anchors.
export function clearAuthCallbackUrl() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  let changed = false;
  for (const key of ["code", "error", "error_code", "error_description"]) {
    if (url.searchParams.has(key)) { url.searchParams.delete(key); changed = true; }
  }
  if (["access_token", "refresh_token", "error", "error_description"].some(key => hash.has(key))) {
    url.hash = "";
    changed = true;
  }
  if (changed) window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function callbackHasError() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  return url.searchParams.has("error") || url.searchParams.has("error_code") || hash.has("error") || hash.has("error_code");
}

export function authErrorMessage(error: unknown, action: "link" | "session" | "logout") {
  const candidate = error as { status?: number; code?: string } | null;
  if (candidate?.status === 429 || candidate?.code === "over_email_send_rate_limit") return "Too many requests. Please wait a minute before trying again.";
  if (action === "link") return "We couldn't send the sign-in link. Please check your connection and try again.";
  if (action === "logout") return "We couldn't sign you out. Check your connection and try again.";
  return "We couldn't verify your session. Check your connection or request a new sign-in link.";
}
