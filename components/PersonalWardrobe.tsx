"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { clothingCategories } from "@/lib/outfit-import";
import { emptyDraft, personalSession, WardrobeError, type ItemDraft, type PersonalItem, type PrivatePhoto } from "@/lib/personal-wardrobe";

export function PersonalWardrobe() {
  const auth = useAuth();
  return <section className="personal-wardrobe" aria-labelledby="personal-heading"><div className="section-heading"><div><p className="eyebrow">Your private collection</p><h1 id="personal-heading">Personal wardrobe</h1></div><Link className="photo-import-entry" href="/import/">Import outfit photo</Link></div>{auth.status === "loading" ? <p role="status">Checking your account…</p> : auth.status === "signed-in" && auth.user ? <WardrobeManager key={auth.user.id} userId={auth.user.id} /> : <div className="empty-state compact"><h2>Keep your clothing with your account.</h2><p>Sign in to add clothing and privately sync photos across your devices.</p><Link className="photo-import-entry" href="/account/">Sign in</Link></div>}</section>;
}
const occasions = ["casual", "smart-casual", "office", "formal", "black-tie", "sport", "travel"];
function draftFrom(item: PersonalItem): ItemDraft {
  return { name: item.name, brand: item.brand ?? "", category: item.category, subcategory: item.subcategory ?? "", size: item.size ?? "", fit: item.fit || "unknown", primary_colour: item.primary_colour ?? "", material: item.material ?? "", notes: item.notes ?? "", status: item.status, occasions: item.occasions ?? [] };
}
function WardrobeManager({ userId }: { userId: string }) {
  const [items, setItems] = useState<PersonalItem[]>([]), [photos, setPhotos] = useState<PrivatePhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({}), [page, setPage] = useState(0), [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true), [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(""), [notice, setNotice] = useState(""), [synced, setSynced] = useState("");
  const [query, setQuery] = useState(""), [editor, setEditor] = useState<{ id: string; revision: number } | null>(null), [draft, setDraft] = useState<ItemDraft>(emptyDraft);
  const [confirm, setConfirm] = useState<{ id: string; action: "delete" | "photo" } | null>(null);
  const lifetime = useRef<AbortController | null>(null), sequence = useRef(0), working = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  async function reload(signal: AbortSignal, currentPage: number) {
    const seq = ++sequence.current;
    try {
      const api = await personalSession(userId, signal);
      const rows = await api.list(currentPage), visible = rows.slice(0, 20);
      const nextPhotos = visible.length ? await api.photos(visible.map(row => row.id)) : [];
      const nextUrls: Record<string, string> = {};
      let failedPreview = false;
      // Limit signing concurrency; signed URLs live only in component memory.
      for (let i = 0; i < nextPhotos.length; i += 5) {
        await Promise.all(nextPhotos.slice(i, i + 5).filter(p => p.state === "current").map(async p => { try { nextUrls[p.id] = await api.signedPhoto(p); } catch { failedPreview = true; } }));
      }
      if (signal.aborted || seq !== sequence.current) return;
      setItems(visible); setMore(rows.length > 20); setPhotos(nextPhotos); setUrls(nextUrls); setReady(true);
      setLoadError(failedPreview ? "Some photo previews could not load. Retry sync to refresh them." : "");
      setSynced(new Date().toLocaleTimeString());
    } catch (error) {
      if (!signal.aborted && seq === sequence.current) setLoadError(error instanceof WardrobeError ? error.message : "Cloud sync is unavailable. Check your connection and retry.");
    } finally { if (!signal.aborted && seq === sequence.current) setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController(); lifetime.current = controller;
    setLoading(true); void reload(controller.signal, page);
    const sync = () => { if (!working.current && document.visibilityState === "visible") void reload(controller.signal, page); };
    const interval = window.setInterval(sync, 45000);
    window.addEventListener("focus", sync); window.addEventListener("online", sync); document.addEventListener("visibilitychange", sync);
    return () => { controller.abort(); ++sequence.current; clearInterval(interval); window.removeEventListener("focus", sync); window.removeEventListener("online", sync); document.removeEventListener("visibilitychange", sync); };
  }, [userId, page]);
  async function run(action: (api: Awaited<ReturnType<typeof personalSession>>) => Promise<string>) {
    if (working.current || !lifetime.current) return;
    const signal = lifetime.current.signal; working.current = true; setBusy(true); setNotice(""); ++sequence.current;
    try {
      const api = await personalSession(userId, signal), message = await action(api);
      if (!signal.aborted) { setNotice(message); setConfirm(null); }
    } catch (error) {
      if (!signal.aborted) setNotice(error instanceof Error ? error.message : "The change could not be confirmed. Reload before retrying.");
    } finally {
      if (!signal.aborted) { await reload(signal, page); setBusy(false); }
      working.current = false;
    }
  }
  function openEditor(item?: PersonalItem) {
    setEditor(item ? { id: item.id, revision: item.revision } : { id: crypto.randomUUID(), revision: 0 }); setDraft(item ? draftFrom(item) : emptyDraft()); setNotice("");
    window.setTimeout(() => { form.current?.scrollIntoView({ block: "center", behavior: "smooth" }); form.current?.querySelector<HTMLInputElement>("input")?.focus(); }, 0);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!editor) return;
    await run(async api => { await api.save(editor.id, editor.revision, draft); setEditor(null); return "Clothing saved to your account."; });
  }
  async function cleanup(api: Awaited<ReturnType<typeof personalSession>>, item: PersonalItem, includeCurrent = false) {
    const pending = await api.photos(item.id);
    for (const photo of pending.filter(p => includeCurrent || p.state !== "current")) await api.removePhoto(item, photo);
  }
  const filtered = items.filter(item => [item.name, item.brand, item.category, item.primary_colour].join(" ").toLowerCase().includes(query.toLowerCase()));
  const editLatest = editor ? items.find(i => i.id === editor.id) : null;
  const conflict = editLatest && editLatest.revision !== editor?.revision;
  return <>
    <div className="personal-toolbar"><p>Private to your account. Changes sync on opening, returning to this tab and every 45 seconds while visible.</p><div className="personal-actions"><button disabled={busy || !ready} onClick={() => openEditor()}>Add clothing</button><button className="secondary" disabled={busy || loading} onClick={() => { if (lifetime.current) void reload(lifetime.current.signal, page); }}>Retry sync</button></div></div>
    <p className="personal-sync" role="status">{busy ? "Saving changes…" : loading ? "Loading your wardrobe…" : synced ? `Last synced ${synced}` : "Not synced yet"}</p>
    {loadError ? <div className="personal-warning" role="alert"><p>{loadError}</p><a href="https://github.com/Utpal-Mishra/STATIC-THREADS/blob/main/docs/PERSONAL_WARDROBE.md" target="_blank" rel="noreferrer">Wardrobe setup guide</a></div> : null}
    {notice ? <p className="personal-warning" role="status">{notice}</p> : null}
    {editor ? <form className="personal-editor" ref={form} onSubmit={save} aria-label="Clothing details"><h2>{editor.revision ? "Edit clothing" : "Add clothing"}</h2><fieldset disabled={busy}><div className="personal-fields">
      <label>Item name<input required maxLength={100} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <label>Category<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{[...new Set([...clothingCategories, "trousers", "jeans", "shorts", draft.category])].map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Garment type / cultural name<input maxLength={200} value={draft.subcategory} onChange={e => setDraft({ ...draft, subcategory: e.target.value })} placeholder="Oxford shirt, sari, kurta…" /></label>
      <label>Brand<input maxLength={100} value={draft.brand} onChange={e => setDraft({ ...draft, brand: e.target.value })} /></label>
      <label>Colour<input maxLength={100} value={draft.primary_colour} onChange={e => setDraft({ ...draft, primary_colour: e.target.value })} /></label>
      <label>Size<input maxLength={100} value={draft.size} onChange={e => setDraft({ ...draft, size: e.target.value })} /></label>
      <label>Fit<select value={draft.fit} onChange={e => setDraft({ ...draft, fit: e.target.value })}>{["unknown", "slim", "regular", "relaxed", "oversized"].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Material<input maxLength={100} value={draft.material} onChange={e => setDraft({ ...draft, material: e.target.value })} /></label>
      <label>Availability<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>{["available", "laundry", "repair", "stored"].map(x => <option key={x}>{x}</option>)}</select></label>
    </div><fieldset className="personal-occasions"><legend>Suitable occasions</legend>{occasions.map(o => <label key={o}><input type="checkbox" checked={draft.occasions.includes(o)} onChange={e => setDraft({ ...draft, occasions: e.target.checked ? [...draft.occasions, o] : draft.occasions.filter(v => v !== o) })} />{o}</label>)}</fieldset>
    <label>Notes<textarea maxLength={1000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
    <p>Add or replace a photo after saving the clothing details.</p>{conflict ? <p role="alert">A newer version is available. Your draft is still here. Copy any notes you need, then <button type="button" className="secondary" onClick={() => openEditor(editLatest)}>Load latest details</button>.</p> : null}
    <div className="personal-actions"><button disabled={!!conflict}>Save clothing</button><button type="button" className="secondary" onClick={() => setEditor(null)}>Cancel</button></div></fieldset></form> : null}
    <label className="personal-search">Search this page<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, brand, category or colour" /></label>
    {!loading && ready && !items.length ? <div className="empty-state compact"><h2>Your wardrobe is ready for its first piece.</h2><p>Add clothing above or import reviewed descriptions from an outfit photo.</p></div> : null}
    {items.length > 0 && !filtered.length ? <p>No clothing matches this search on this page.</p> : null}
    <div className="personal-grid">{filtered.map(item => {
      const photo = photos.find(p => p.id === item.photo_id), pending = photos.filter(p => p.item_id === item.id && p.state !== "current");
      return <article className="personal-card" key={item.id} aria-label={item.name}>
        <div className="personal-photo">{photo && urls[photo.id] && !item.deleted_at ? <img src={urls[photo.id]} alt={item.name} referrerPolicy="no-referrer" onError={() => setUrls(current => { const next = { ...current }; delete next[photo.id]; return next; })} /> : <span>{item.deleted_at ? "Deletion pending" : photo ? "Preview unavailable · retry sync" : "Add your photo"}</span>}</div>
        <div className="personal-content"><p className="eyebrow">{item.category} · {item.status}</p><h2>{item.name}</h2><p>{[item.brand, item.primary_colour, item.size].filter(Boolean).join(" · ") || "Details can be added anytime"}</p>
        {item.deleted_at ? <><p>Removed from outfit planning. Photo and record deletion must finish before this disappears.</p><button disabled={busy} onClick={() => void run(async api => { await cleanup(api, item, true); await api.finishDelete(item); return "Clothing and photo deletion confirmed."; })}>Retry deletion</button></> : <>
          <div className="personal-actions"><button className="secondary" disabled={busy} onClick={() => openEditor(item)}>Edit</button><button className="secondary" disabled={busy} onClick={() => setConfirm({ id: item.id, action: "delete" })}>Delete</button></div>
          <label className="personal-upload">{photo ? "Replace photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void run(async api => { await api.upload(item, file); await cleanup(api, item); return "Photo saved privately to your account."; }); }} /></label>
          <label className="personal-upload">Take photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void run(async api => { await api.upload(item, file); await cleanup(api, item); return "Photo saved privately to your account."; }); }} /></label>
          {photo ? <button className="secondary" disabled={busy} onClick={() => setConfirm({ id: item.id, action: "photo" })}>Remove photo</button> : null}
          {pending.length ? <div className="personal-warning"><p>{pending.length} unfinished upload / old photo(s). Cleanup discards these and keeps the current photo.</p><button className="secondary" disabled={busy} onClick={() => void run(async api => { await cleanup(api, item); return "Pending photos cleaned up."; })}>Clean up pending photos</button></div> : null}
        </>}
        {confirm?.id === item.id ? <div className="personal-warning"><p>{confirm.action === "delete" ? "Permanently delete this clothing record and its private photo? Existing outfit history is retained; it may reference a removed piece." : "Permanently delete this photo? Clothing details will remain."}</p><div className="personal-actions"><button disabled={busy} onClick={() => void run(async api => { if (confirm.action === "delete") { await api.beginDelete(item); await cleanup(api, item, true); await api.finishDelete(item); if (editor?.id === item.id) setEditor(null); return "Clothing and photo deletion confirmed."; } if (photo) await api.removePhoto(item, photo); return "Photo deletion confirmed."; })}>Confirm deletion</button><button className="secondary" disabled={busy} onClick={() => setConfirm(null)}>Keep it</button></div></div> : null}
        </div></article>;
    })}</div>
    <div className="personal-actions personal-pagination"><button className="secondary" disabled={!page || busy || loading || !!editor} onClick={() => { setItems([]); setPhotos([]); setUrls({}); setPage(p => p - 1); }}>Previous page</button><span>Page {page + 1}</span><button className="secondary" disabled={!more || busy || loading || !!editor} onClick={() => { setItems([]); setPhotos([]); setUrls({}); setPage(p => p + 1); }}>Next page</button></div>
    <p className="personal-footnote">JPEG, PNG or WebP up to 12 MB. Photos are resized and metadata is stripped before private upload. HEIC needs conversion. Changes require a connection; there is no offline upload queue.</p>
  </>;
}
