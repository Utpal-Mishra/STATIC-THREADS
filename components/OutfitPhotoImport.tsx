"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { clothingCategories, prepareImportPhoto, uniqueCandidates, validBox, type ClothingCategory, type GarmentCandidate, type ImportPhoto } from "@/lib/outfit-import";
import { detectGarments, loadImportedGarments, recognitionEnabled, saveImportedGarments } from "@/lib/outfit-import-client";

export function OutfitPhotoImport() {
  const auth = useAuth();
  return <ImportSession key={auth.user?.id ?? "guest"} userId={auth.status === "signed-in" ? auth.user!.id : null} />;
}
function CropPreview({ photo, item }: { photo: ImportPhoto; item: GarmentCandidate }) {
  const [x, y, w, h] = item.box;
  return <svg className="import-crop" role="img" aria-label={`Visible crop of ${item.name || "garment"}`} viewBox={[x * photo.width, y * photo.height, w * photo.width, h * photo.height].join(" ")}><image href={photo.data} width={photo.width} height={photo.height} /></svg>;
}
function ImportSession({ userId }: { userId: string | null }) {
  const [photo, setPhoto] = useState<ImportPhoto | null>(null);
  const [items, setItems] = useState<GarmentCandidate[]>([]);
  const [confirmed, setConfirmed] = useState<GarmentCandidate[]>([]);
  const [saved, setSaved] = useState<Array<{ id: string; name: string; category: string; primary_colour: string }>>([]);
  const [busy, setBusy] = useState(false), [consent, setConsent] = useState(false), [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0), [fileKey, setFileKey] = useState(0);
  const revision = useRef(0), request = useRef<AbortController | null>(null);
  useEffect(() => () => { revision.current++; request.current?.abort(); }, []);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void loadImportedGarments(userId, controller.signal).then(rows => { if (!controller.signal.aborted) setSaved(rows); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [userId, refresh]);
  function clear() {
    revision.current++; request.current?.abort(); setPhoto(null); setItems([]); setConfirmed([]); setConsent(false); setReviewed(false); setBusy(false); setMessage(""); setError(""); setFileKey(v => v + 1);
  }
  async function choose(file: File | undefined) {
    if (!file) return;
    clear(); const current = revision.current; setBusy(true);
    try { const prepared = await prepareImportPhoto(file); if (current === revision.current) setPhoto(prepared); }
    catch (e) { if (current === revision.current) setError(e instanceof Error ? e.message : "The photo could not be opened."); }
    finally { if (current === revision.current) setBusy(false); }
  }
  function edit(id: string, change: Partial<GarmentCandidate>) { setItems(old => old.map(item => item.id === id ? { ...item, ...change } : item)); setReviewed(false); setConfirmed([]); setMessage(""); }
  function adjustBox(item: GarmentCandidate, index: number, percent: number) {
    const box = [...item.box] as GarmentCandidate["box"]; box[index] = Math.max(index < 2 ? 0 : .02, Math.min(1, percent / 100));
    if (index === 0) box[0] = Math.min(box[0], 1 - box[2]);
    if (index === 1) box[1] = Math.min(box[1], 1 - box[3]);
    if (index === 2) box[2] = Math.min(box[2], 1 - box[0]);
    if (index === 3) box[3] = Math.min(box[3], 1 - box[1]);
    edit(item.id, { box });
  }
  const possibleDuplicate = (item: GarmentCandidate) => saved.some(row => row.name.trim().toLowerCase() === item.name.trim().toLowerCase() && row.category === item.category && row.primary_colour.toLowerCase() === item.colour.trim().toLowerCase());
  async function recognize() {
    if (!photo || !userId || !consent || busy) return;
    const current = ++revision.current, controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setError(""); setMessage("");
    try {
      const found = await detectGarments(photo, userId, controller.signal);
      if (current !== revision.current) return;
      setItems(found.map(item => ({ ...item, selected: !possibleDuplicate(item) }))); setConfirmed([]); setReviewed(false); setMessage(found.length ? "Suggested pieces are ready. Check every name, category and visible crop before confirming." : "No clear garments were found. You can add visible pieces manually.");
    } catch (e) { if (current === revision.current) setError(e instanceof Error ? e.message : "Recognition failed."); }
    finally { if (current === revision.current) setBusy(false); }
  }
  const selected = photo ? uniqueCandidates(photo.hash, items.filter(item => item.selected)) : [];
  const ready = !busy && reviewed && selected.length > 0 && selected.every(item => item.name.trim().length > 0 && item.name.length <= 100 && item.colour.length <= 40 && item.detail.length <= 200 && validBox(item.box));
  async function save() {
    if (!photo || !userId || !ready) return;
    const current = ++revision.current; setBusy(true); setError("");
    try {
      await saveImportedGarments(photo, selected, userId);
      if (current !== revision.current) return;
      setConfirmed(selected); setMessage(`${selected.length} reviewed piece(s) confirmed in your private wardrobe. Repeated saves reuse the same records.`); setRefresh(v => v + 1);
    } catch (e) { if (current === revision.current) setError(e instanceof Error ? e.message : "Saving could not be confirmed."); }
    finally { if (current === revision.current) setBusy(false); }
  }
  return <div className="outfit-import">
    <section className="import-intro"><p className="eyebrow">One photo. Separate pieces.</p><h1>Import an outfit</h1><p>Drop a full-look photo, review the visible clothing, and choose what belongs in your wardrobe.</p><p className="import-note">Dresses, jumpsuits, coordinated sets, layers and clothing from any culture are welcome. Use the garment names that are right for you.</p></section>
    <section className="import-panel" aria-label="Choose outfit photo">
      <label className="import-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void choose(e.dataTransfer.files[0]); }}><strong>Drop a photo or choose an image</strong><span>JPEG, PNG or WebP · up to 12 MB</span><input key={fileKey} aria-label="Outfit photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => void choose(e.target.files?.[0])} /></label>
      <p className="import-note">Your photo stays in this tab until you explicitly run recognition. It is resized and file metadata is removed first. Closing or clearing the page removes the local photo and crops.</p>
      {busy ? <p role="status">Processing…</p> : null}
      {photo ? <>
        <img className="import-source" src={photo.data} alt="Your selected full outfit, for garment review" />
        <div className="import-recognition"><h2>Find the pieces</h2>
          {!recognitionEnabled() ? <p>Automatic recognition is not connected yet. You can add pieces and adjust their crops manually.</p> : <p>Recognition sends this prepared photo to the configured OpenAI vision service. Provider processing may incur charges. Use a photo you have permission to process.</p>}
          {!userId ? <p><Link href="/account/">Sign in</Link> for recognition and private wardrobe saving. Manual review works without an account.</p> : null}
          <label><input type="checkbox" checked={consent} disabled={busy || !recognitionEnabled() || !userId} onChange={e => setConsent(e.target.checked)} /> I agree to send this photo for clothing recognition.</label>
          <button type="button" disabled={busy || !consent || !userId || !recognitionEnabled()} onClick={() => void recognize()}>{items.length ? "Recognize again (replaces draft pieces)" : "Detect garments"}</button>
          <button type="button" disabled={busy || items.length >= 20} onClick={() => { setItems(old => [...old, { id: crypto.randomUUID(), name: "", category: "other", colour: "Unknown", detail: "", confidence: 0, box: [.1, .1, .8, .8], selected: true }]); setReviewed(false); setMessage(""); }}>Add a piece manually</button>
          <button type="button" onClick={clear}>Clear photo and draft</button>
        </div>
      </> : null}
    </section>
    {error ? <p className="import-error" role="alert">{error}</p> : null}{message ? <p className="import-feedback" role="status">{message}</p> : null}
    {photo && items.length ? <section className="import-panel" aria-label="Review detected pieces"><h2>Review the pieces</h2><p>These are visible rectangular crops, not reconstructed garments or background-free cutouts. Hidden pieces may be missed. Model scores are estimates, not measured accuracy.</p>
      <div className="import-candidates">{items.map((item, index) => <article className="import-candidate" key={item.id} aria-label={`Piece ${index + 1}`}><CropPreview photo={photo} item={item} />
        <fieldset disabled={busy}><legend>Piece {index + 1}{item.id.startsWith("detected-") ? ` · model score ${Math.round(item.confidence * 100)}%` : " · manual"}</legend>
          {possibleDuplicate(item) ? <p className="import-note">Possible duplicate: an imported piece has the same name, category and colour. Include it only if this is a different garment.</p> : null}
          <label><input type="checkbox" checked={item.selected} onChange={e => edit(item.id, { selected: e.target.checked })} /> Include this piece</label>
          <label>Garment name<input maxLength={100} value={item.name} placeholder="e.g. sari, blouse, kaftan, jacket" onChange={e => edit(item.id, { name: e.target.value })} /></label>
          <label>Clothing category<select aria-label="Clothing category" value={item.category} onChange={e => edit(item.id, { category: e.target.value as ClothingCategory })}>{clothingCategories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
          <label>Colour<input maxLength={40} value={item.colour} onChange={e => edit(item.id, { colour: e.target.value })} /></label>
          <label>Garment detail<input maxLength={200} value={item.detail} placeholder="Use your preferred garment description" onChange={e => edit(item.id, { detail: e.target.value })} /></label>
          <details><summary>Adjust visible crop</summary>{["Left", "Top", "Width", "Height"].map((label, i) => <label key={label}>{label} (%)<input type="range" min={i < 2 ? 0 : 2} max={100} step={1} aria-label={`${label} for piece ${index + 1}`} value={Math.round(item.box[i] * 100)} onChange={e => adjustBox(item, i, Number(e.target.value))} /><output>{Math.round(item.box[i] * 100)}%</output></label>)}</details>
          <button type="button" onClick={() => { setItems(old => old.filter(value => value.id !== item.id)); setReviewed(false); setConfirmed([]); }}>Remove piece</button>
        </fieldset>
      </article>)}</div>
      <p>{selected.length} unique selected piece(s). Identical reviewed entries in the same photo are combined. Check for the same clothing imported from other photos yourself.</p>
      <label className="import-review"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e => setReviewed(e.target.checked)} /> I have checked the selected names, categories and crops.</label>
      <div className="import-buttons"><button type="button" disabled={!ready} onClick={() => { setConfirmed(selected); setMessage(`${selected.length} piece(s) kept in this tab only. They will disappear when you leave or clear this page.`); }}>Keep selected in this session</button><button type="button" disabled={!ready || !userId} onClick={() => void save()}>Save selected to my wardrobe</button></div>
      <p className="import-note">Private wardrobe saving stores only the reviewed garment descriptions. The photo and crops are not uploaded to wardrobe storage. After saving, reopen the outfit planner and choose your private wardrobe to use these pieces.</p>
      {confirmed.length ? <div className="import-confirmed" aria-label="Confirmed pieces"><h3>Confirmed pieces</h3>{clothingCategories.map(category => { const group = confirmed.filter(item => item.category === category); return group.length ? <section key={category}><h4>{category}</h4><ul>{group.map(item => <li key={item.id}>{item.name} · {item.colour}</li>)}</ul></section> : null; })}</div> : null}
    </section> : null}
    {userId ? <section className="import-panel" aria-label="Previously imported wardrobe"><h2>Your imported wardrobe</h2><p>Saved descriptions remain available after reload. Photo previews stay in the original import session.</p>{saved.length ? <ul>{saved.map(item => <li key={item.id}>{item.name} · {item.category} · {item.primary_colour}</li>)}</ul> : <p>No imported pieces loaded yet.</p>}</section> : null}
  </div>;
}
