"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { authErrorMessage, getSupabaseBrowser, requestMagicLink } from "@/lib/supabase-browser";

export function AccountPanel() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "signing-out">("idle");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const enabled = auth.status !== "disabled";
  const signedIn = auth.status === "signed-in";
  const loading = auth.status === "loading";

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => { setMessage(""); setStatus("idle"); setEmail(""); }, [auth.status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.status !== "signed-out" || !email.trim() || cooldown || status === "sending") return;
    setStatus("sending"); setMessage("");
    try {
      await requestMagicLink(email.trim());
      setStatus("sent"); setCooldown(60);
      setMessage("Check your email for the sign-in link. Open it in this browser on this device to finish signing in.");
    } catch (error) {
      setStatus("error"); setMessage(authErrorMessage(error, "link"));
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (!supabase || status === "signing-out") return;
    setStatus("signing-out"); setMessage("");
    try {
      // This browser only; other devices keep their own sessions.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setStatus("idle"); setMessage("You are signed out on this browser.");
    } catch (error) {
      setStatus("error"); setMessage(authErrorMessage(error, "logout"));
    }
  }

  return (
    <section className="account-shell" aria-labelledby="account-heading">
      <div className="account-card">
        <p className="eyebrow">Private wardrobe foundation</p>
        <h1 id="account-heading">Your wardrobe should belong to you.</h1>
        <p className="account-copy">Sign in with an email link to access your account. You can keep exploring the wardrobe demo at any time.</p>
        <div className="account-status-grid">
          <div><span>Current mode</span><strong>{loading ? "Checking account…" : signedIn ? "Signed in" : enabled ? "Ready to sign in" : "Demo"}</strong></div>
          <div><span>Authentication</span><strong>{enabled ? "Magic-link email" : "Not configured"}</strong></div>
          <div><span>Wardrobe storage</span><strong>Demo catalogue</strong></div>
        </div>
        {loading ? <p className="account-note" role="status">Checking your session…</p> : signedIn ? (
          <div className="account-form">
            <p className="account-identity">Signed in as <strong>{auth.user?.email ?? "your account"}</strong></p>
            <p className="account-message">Your account is connected. Personal wardrobe uploads and cloud sync are coming next; the current catalogue remains the demo.</p>
            <button type="button" onClick={signOut} disabled={status === "signing-out"}>{status === "signing-out" ? "Signing out…" : "Sign out of this browser"}</button>
          </div>
        ) : enabled ? (
          <form className="account-form" onSubmit={submit}>
            <label><span>Email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" maxLength={254} required disabled={status === "sending"} /></label>
            <button type="submit" disabled={status === "sending" || cooldown > 0}>{status === "sending" ? "Sending…" : cooldown ? `Resend in ${cooldown}s` : "Send secure sign-in link"}</button>
            <p className="account-message">Use the same browser to request and open your link. Only sign in on a device you trust.</p>
          </form>
        ) : (
          <div className="account-note"><strong>Account sign-in is not available yet.</strong><p>You can continue exploring the demo. Private accounts will become available once sign-in is connected.</p></div>
        )}
        {(message || auth.message) ? <p className={`account-message account-feedback ${status === "error" || (!message && auth.message) ? "error" : "sent"}`} role={status === "error" || (!message && auth.message) ? "alert" : "status"}>{message || auth.message}</p> : null}
      </div>
    </section>
  );
}
