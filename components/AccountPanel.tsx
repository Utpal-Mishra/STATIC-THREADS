"use client";

import { FormEvent, useMemo, useState } from "react";
import { cloudEnabled, requestMagicLink } from "@/lib/supabase-browser";

export function AccountPanel() {
  const enabled = useMemo(() => cloudEnabled(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || !email.trim()) return;
    setStatus("sending");
    setMessage("");
    try {
      await requestMagicLink(email.trim());
      setStatus("sent");
      setMessage("Check your email for the secure sign-in link.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send sign-in link.");
    }
  }

  return (
    <section className="account-shell" aria-labelledby="account-heading">
      <div className="account-card">
        <p className="eyebrow">Private wardrobe foundation</p>
        <h1 id="account-heading">Your wardrobe should belong to you.</h1>
        <p className="account-copy">
          Static Threads now has the integration point for private accounts and cloud-backed wardrobe data.
          The public demo remains usable while the cloud environment is optional.
        </p>

        <div className="account-status-grid">
          <div>
            <span>Current mode</span>
            <strong>{enabled ? "Cloud ready" : "Private demo"}</strong>
          </div>
          <div>
            <span>Authentication</span>
            <strong>{enabled ? "Magic-link email" : "Not configured"}</strong>
          </div>
          <div>
            <span>Wardrobe storage</span>
            <strong>{enabled ? "Supabase-ready" : "Static demo data"}</strong>
          </div>
        </div>

        {enabled ? (
          <form className="account-form" onSubmit={submit}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send secure sign-in link"}
            </button>
            {message ? <p className={`account-message ${status}`}>{message}</p> : null}
          </form>
        ) : (
          <div className="account-note">
            <strong>Cloud sync is intentionally off until deployment secrets are added.</strong>
            <p>The app still works as the public demo. Once the Supabase URL and anonymous key are configured in GitHub Actions, this page activates without another UI rewrite.</p>
          </div>
        )}
      </div>
    </section>
  );
}
