"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { outfitKey, outfitLibrary, type OutfitAction, type OutfitEvent } from "@/lib/outfit-library";

const views = [
  { action: "saved", label: "Saved outfits", empty: "Save an outfit from the planner to see it here." },
  { action: "liked", label: "Favourites", empty: "Add an outfit to favourites from your saved list." },
  { action: "worn", label: "Wear history", empty: "Choose Wore this in the planner to record an outfit here." }
] as const;
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function OutfitLibrary() {
  const auth = useAuth();
  return <section className="personal-wardrobe" aria-labelledby="outfit-library-title">
    <div className="section-heading">
      <div><p className="eyebrow">Your private collection</p><h1 id="outfit-library-title">My outfits</h1></div>
    </div>
    {auth.status === "loading" ? <p role="status">Checking your account…</p> : auth.status === "signed-in" && auth.user
      ? <AccountOutfits key={auth.user.id} userId={auth.user.id} />
      : <div className="empty-state compact"><p>Sign in to see your saved outfits, favourites and wear history.</p><Link className="photo-import-entry" href="/account/">Sign in</Link></div>}
  </section>;
}

function AccountOutfits({ userId }: { userId: string }) {
  const [action, setAction] = useState<OutfitAction>("saved");
  const [entries, setEntries] = useState<OutfitEvent[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<OutfitEvent>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("");
  const lifetime = useRef<AbortController | null>(null);
  const reading = useRef(false);
  const writing = useRef(false);
  const view = views.find(item => item.action === action)!;

  async function load(signal: AbortSignal, after?: OutfitEvent) {
    reading.current = true;
    setLoading(true);
    setLoadError(false);
    try {
      const api = await outfitLibrary(userId, signal);
      const page = await api.page(action, after);
      if (signal.aborted) return;
      setEntries(previous => after ? [...previous, ...page.entries] : page.entries);
      setNames(previous => after ? { ...previous, ...page.names } : page.names);
      setCursor(page.next);
    } catch {
      if (!signal.aborted) setLoadError(true);
    } finally {
      if (!signal.aborted) {
        reading.current = false;
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    setEntries([]);
    setNames({});
    setCursor(undefined);
    setMessage("");
    void load(controller.signal);
    const refresh = () => {
      if (document.visibilityState === "visible" && !reading.current && !writing.current) {
        void load(controller.signal);
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
    // A view or account change owns a new request lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, userId]);

  async function change(entry: OutfitEvent, operation: "favourite" | "unsave" | "unfavourite") {
    const signal = lifetime.current?.signal;
    if (!signal || reading.current || writing.current) return;
    writing.current = true;
    setBusy(true);
    setMessage("");
    try {
      const api = await outfitLibrary(userId, signal);
      if (operation === "favourite") await api.record("liked", entry.item_ids, entry.occasion ?? "");
      else await api.remove(operation === "unsave" ? "saved" : "liked", entry.item_ids);
      if (signal.aborted) return;
      setMessage(operation === "favourite" ? "Added to favourites." : operation === "unsave" ? "Outfit unsaved." : "Removed from favourites.");
      if (operation !== "favourite") {
        const key = outfitKey(entry.item_ids);
        setEntries(previous => previous.filter(row => outfitKey(row.item_ids) !== key));
      }
    } catch {
      if (!signal.aborted) setMessage("The change could not be confirmed. Refresh your outfits and try again.");
    } finally {
      writing.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  const unique = new Set<string>();
  const visible = entries.filter(entry => {
    const key = action === "worn" ? entry.id : outfitKey(entry.item_ids);
    if (entry.action !== action || unique.has(key)) return false;
    unique.add(key);
    return true;
  });
  const refresh = (after?: OutfitEvent) => {
    if (lifetime.current && !reading.current && !writing.current) void load(lifetime.current.signal, after);
  };

  return <>
    <div className="personal-actions" role="group" aria-label="Outfit lists">
      {views.map(item => <button key={item.action} type="button" className={action === item.action ? undefined : "secondary"} aria-pressed={action === item.action} disabled={busy} onClick={() => setAction(item.action)}>{item.label}</button>)}
      <button type="button" className="secondary" disabled={busy || loading} onClick={() => refresh()}>Refresh outfits</button>
    </div>
    <p className="personal-footnote">Outfits sync to your account. Favourites and saved outfits can be managed separately.</p>
    <div aria-live="polite">
      {loading ? <p role="status">Loading outfits…</p> : null}
      {loadError ? <p role="alert">Your outfits could not be refreshed. Try Refresh outfits.</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
    {!loading && !loadError && !visible.length ? <p>{view.empty}</p> : null}
    <div className="personal-grid outfit-library-grid" aria-label={view.label}>
      {visible.map(entry => <article className="personal-card personal-content" key={entry.id}>
        <h2>{entry.occasion || "Outfit"}</h2>
        <p><time dateTime={entry.created_at}>{dateFormat.format(new Date(entry.created_at))}</time></p>
        <ul>{entry.item_ids.map(id => <li key={id}>{names[id] ?? "Piece no longer in wardrobe"}</li>)}</ul>
        {entry.action === "saved" ? <div className="personal-actions">
          <button type="button" className="secondary" disabled={busy || loading || entry.item_ids.some(id => !names[id])} onClick={() => void change(entry, "favourite")}>Add to favourites</button>
          <button type="button" className="secondary" disabled={busy || loading} onClick={() => void change(entry, "unsave")}>Unsave outfit</button>
        </div> : entry.action === "liked" ? <button type="button" className="secondary" disabled={busy || loading} onClick={() => void change(entry, "unfavourite")}>Remove favourite</button> : null}
      </article>)}
    </div>
    {cursor ? <div className="personal-pagination"><button type="button" className="secondary" disabled={busy || loading} onClick={() => refresh(cursor)}>Load more outfits</button></div> : null}
  </>;
}
