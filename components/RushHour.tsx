"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { GarmentCrop } from "@/components/GarmentCrop";
import { clothingCategories, importKey, prepareImportPhoto, validBox, type ClothingCategory } from "@/lib/outfit-import";
import { detectGarments, recognitionEnabled, saveImportedGarments } from "@/lib/outfit-import-client";
import { emptyBrief, nextQuestion, updateBrief, type Brief, type Outfit } from "@/lib/outfit-planner";
import { MAX_RUSH_PHOTOS, MAX_RUSH_PIECES, planRushHour, reviewedRushPieces, rushPlannerItems, rushStyles, type RushPhoto, type RushPiece, type RushStyle } from "@/lib/rush-hour";

type Message = { id: number; speaker: "You" | "Rush Hour"; text: string };
const welcome: Message = { id: 0, speaker: "Rush Hour", text: "What are you dressing for? Add a few clothing photos, review the pieces, then I’ll combine only the options you confirm." };
export default function RushHour({ userId }: { userId: string | null }) {
  const [photos, setPhotos] = useState<RushPhoto[]>([]), [pieces, setPieces] = useState<RushPiece[]>([]);
  const [consent, setConsent] = useState(false), [reviewed, setReviewed] = useState(false), [confirmed, setConfirmed] = useState(false);
  const [brief, setBrief] = useState<Brief>(emptyBrief), [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome]), [outfits, setOutfits] = useState<Outfit[]>([]), [seen, setSeen] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(""), [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [savedCount, setSavedCount] = useState(0), [inputKey, setInputKey] = useState(0);
  const pending = useRef(false), revision = useRef(0), sequence = useRef(0), request = useRef<AbortController | null>(null), savedKeys = useRef(new Set<string>());
  const body = useRef<HTMLDivElement>(null), result = useRef<HTMLDivElement>(null);
  useEffect(() => () => { revision.current++; request.current?.abort(); }, []);
  useEffect(() => { if (outfits.length && body.current && result.current) body.current.scrollTo({ top: body.current.scrollTop + result.current.getBoundingClientRect().top - body.current.getBoundingClientRect().top }); }, [outfits]);
  const selected = reviewedRushPieces(photos, pieces);
  const canConfirm = !busy && reviewed && pieces.some(p => p.selected) && pieces.filter(p => p.selected).every(p => p.name.trim() && validBox(p.box));
  function say(speaker: Message["speaker"], text: string) { const id = ++sequence.current; setMessages(old => [...old.slice(-23), { id, speaker, text }]); }
  function invalidate() { setReviewed(false); setConfirmed(false); setOutfits([]); setSeen([]); setCompare([]); setFeedback(""); }
  function edit(id: string, value: Partial<RushPiece>) { setPieces(old => old.map(piece => piece.id === id ? { ...piece, ...value } : piece)); invalidate(); }
  function clear() {
    revision.current++; request.current?.abort(); pending.current = false; savedKeys.current.clear(); setBusy(false); setPhotos([]); setPieces([]); setConsent(false); invalidate(); setBrief(emptyBrief()); setMessages([welcome]); sequence.current = 0; setInput(""); setError(""); setSavedCount(0); setExpanded({}); setInputKey(v => v + 1);
  }
  async function addPhotos(files: FileList | null) {
    if (!files?.length || pending.current) return;
    if (photos.length + files.length > MAX_RUSH_PHOTOS) { setError(`Choose up to ${MAX_RUSH_PHOTOS} photos in this session. Remove a photo before adding more.`); return; }
    pending.current = true; setBusy(true); setError(""); const current = revision.current;
    const added: RushPhoto[] = [], failures: string[] = [];
    for (const file of Array.from(files)) {
      if (current !== revision.current) return;
      try { const photo = await prepareImportPhoto(file); if (![...photos, ...added].some(old => old.hash === photo.hash)) added.push({ ...photo, id: crypto.randomUUID() }); }
      catch (e) { failures.push(e instanceof Error ? e.message : "A photo could not be opened."); }
    }
    if (current !== revision.current) return;
    setPhotos(old => [...old, ...added]); setConsent(false); if (added.length) invalidate();
    if (failures.length) setError([...new Set(failures)].join(" "));
    if (!added.length && !failures.length) setFeedback("That exact photo is already in this session.");
    setInputKey(v => v + 1); pending.current = false; setBusy(false);
  }
  async function identify(photo: RushPhoto) {
    if (!userId || !consent || pending.current) return;
    if (pieces.filter(p => p.photoId !== photo.id).length >= MAX_RUSH_PIECES) { setError("Remove a draft piece before identifying another photo."); return; }
    pending.current = true; setBusy(true); setError(""); setFeedback("");
    const current = revision.current, controller = new AbortController(); request.current = controller;
    try {
      const found = await detectGarments(photo, userId, controller.signal);
      if (current !== revision.current) return;
      const other = pieces.filter(p => p.photoId !== photo.id), room = MAX_RUSH_PIECES - other.length;
      setPieces([...other, ...found.slice(0, room).map(item => ({ ...item, id: `${photo.id}-${item.id}`, photoId: photo.id, style: "unknown" as const }))]);
      invalidate(); setFeedback(found.length ? `Review the suggested names, categories and crops. Up to ${room} pieces can be kept from this photo. Check style labels before planning.` : "No clear pieces were found. Add visible pieces manually.");
    } catch (e) { if (current === revision.current) setError(e instanceof Error ? e.message : "Identification failed. You can add pieces manually."); }
    finally { if (current === revision.current) { pending.current = false; setBusy(false); } }
  }
  function addPiece(photo: RushPhoto) {
    if (pieces.length >= MAX_RUSH_PIECES) return;
    const id = crypto.randomUUID(); setExpanded(old => ({ ...old, [id]: true }));
    setPieces(old => [...old, { id, photoId: photo.id, name: "", category: "other", colour: "Unknown", detail: "", confidence: 0, box: [.1, .1, .8, .8], selected: true, style: "unknown" }]); invalidate();
  }
  function crop(piece: RushPiece, index: number, value: number) {
    const box = [...piece.box] as RushPiece["box"]; box[index] = Math.max(index < 2 ? 0 : .02, Math.min(1, value / 100));
    if (index === 0) box[0] = Math.min(box[0], 1 - box[2]); if (index === 1) box[1] = Math.min(box[1], 1 - box[3]);
    if (index === 2) box[2] = Math.min(box[2], 1 - box[0]); if (index === 3) box[3] = Math.min(box[3], 1 - box[1]); edit(piece.id, { box });
  }
  function build(next: Brief, excluded: string[] = []) {
    const response = planRushHour(photos, pieces, next, excluded); setOutfits(response.outfits); setSeen([...excluded, ...response.outfits.map(o => o.id)]); setCompare([]); say("Rush Hour", response.message);
  }
  function send(value: string) {
    const text = value.trim().slice(0, 600); if (!text || busy) return;
    say("You", text); setInput(""); const next = updateBrief(brief, text, rushPlannerItems(photos, pieces)); const changed = JSON.stringify(next) !== JSON.stringify(brief); setBrief(next);
    const question = nextQuestion(next);
    if (question) { setOutfits([]); say("Rush Hour", question.text); }
    else if (!confirmed || !selected.length) { setOutfits([]); say("Rush Hour", "Add photos and confirm the reviewed pieces below. You don’t need a complete wardrobe or an account to plan with them."); }
    else build(next, changed ? [] : seen);
  }
  function confirm() { if (!canConfirm) return; setConfirmed(true); setFeedback(`${selected.length} unique pieces confirmed for this session.`); if (!nextQuestion(brief)) build(brief); else say("Rush Hour", nextQuestion(brief)!.text); }
  async function save() {
    if (!userId || !confirmed || !selected.length || pending.current) return;
    pending.current = true; setBusy(true); setError(""); const current = revision.current; let completed = 0;
    try {
      for (const photo of photos) {
        const group = selected.filter(p => p.photoId === photo.id && !savedKeys.current.has(importKey(photo.hash, p)));
        if (!group.length) continue;
        await saveImportedGarments(photo, group, userId);
        if (current !== revision.current) return;
        group.forEach(piece => savedKeys.current.add(importKey(photo.hash, piece))); completed += group.length; setSavedCount(savedKeys.current.size);
      }
      setFeedback(`${savedKeys.current.size} reviewed piece(s) confirmed in your private wardrobe. Photos and Rush Hour style labels stay in this tab.`);
    } catch (e) { if (current === revision.current) setError(`${completed ? `${completed} piece(s) were saved before this failure. ` : ""}${e instanceof Error ? e.message : "Saving could not be confirmed."} Retry to continue; confirmed records are not duplicated.`); }
    finally { if (current === revision.current) { pending.current = false; setBusy(false); } }
  }
  function submit(event: FormEvent) { event.preventDefault(); send(input); }
  const followup = nextQuestion(brief);
  const replies = followup?.options ?? (outfits.length ? ["Another option", "No black", "Comfortable"] : ["Dinner casual indoors", "Wedding", "Travel"]);
  return <>
    <div className="outfit-chat-toolbar"><span>{photos.length}/{MAX_RUSH_PHOTOS} photos · {confirmed ? selected.length : 0} confirmed pieces</span><button type="button" disabled={busy} onClick={() => { setBrief(emptyBrief()); setInput(""); setOutfits([]); setSeen([]); setCompare([]); setMessages([welcome]); }}>New plan</button></div>
    <div className="rush-body" ref={body}>
      <p className="rush-note">A few options. One quick outfit. Photos and plans stay in this chat; switching modes or closing it clears them.</p>
      <div className="rush-uploads"><label>Photograph clothing (mobile)<input key={`camera-${inputKey}`} aria-label="Rush Hour camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy || photos.length >= MAX_RUSH_PHOTOS} onChange={e => void addPhotos(e.target.files)} /></label><label>Upload clothing options<input key={`gallery-${inputKey}`} aria-label="Rush Hour gallery" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || photos.length >= MAX_RUSH_PHOTOS} onChange={e => void addPhotos(e.target.files)} /></label></div>
      <p className="rush-note">Up to three JPEG/PNG/WebP photos, 12 MB each; up to 20 reviewed pieces. Crops show visible fabric, not reconstructed garments.</p>
      {recognitionEnabled() ? <label className="rush-note"><input type="checkbox" checked={consent} disabled={busy || !userId} onChange={e => setConsent(e.target.checked)} /> Allow the chosen photo to be sent to OpenAI for clothing recognition when I press Identify. Provider processing may incur charges.</label> : <p className="rush-note">Automatic identification is not connected yet. Add and identify pieces manually to use Rush Hour now.</p>}
      {!userId ? <p className="rush-note">No account is needed for manual review and outfit planning. Sign in from Account before starting if you want recognition or private saving.</p> : null}
      {busy ? <p role="status" className="rush-note">Processing…</p> : null}
      {error ? <p role="alert" className="rush-error">{error}</p> : null}{feedback ? <p role="status" className="rush-feedback">{feedback}</p> : null}
      <div className="rush-photos">{photos.map((photo, index) => <section className="rush-photo" aria-label={`Rush photo ${index + 1}`} key={photo.id}><img src={photo.data} alt={`Clothing options photo ${index + 1}`} /><div><strong>Photo {index + 1}</strong><button className="rush-button" type="button" disabled={busy || !consent || !userId || !recognitionEnabled() || pieces.filter(p => p.photoId !== photo.id).length >= MAX_RUSH_PIECES} onClick={() => void identify(photo)}>Identify photo {index + 1}</button><button className="rush-button" type="button" disabled={busy || pieces.length >= MAX_RUSH_PIECES} onClick={() => addPiece(photo)}>Add piece to photo {index + 1}</button><button className="rush-button" type="button" disabled={busy} onClick={() => { setPhotos(old => old.filter(p => p.id !== photo.id)); setPieces(old => old.filter(p => p.photoId !== photo.id)); invalidate(); }}>Remove photo {index + 1}</button></div></section>)}</div>
      {photos.length ? <p className="rush-note">Identify replaces the draft pieces for that photo. Check uncertain names, categories and crops. A model score is an estimate, not measured accuracy.</p> : null}
      {pieces.length ? <section aria-label="Rush Hour piece review"><h3>Review your options</h3>{pieces.map((piece, index) => {
        const photo = photos.find(p => p.id === piece.photoId)!;
        return <details className="rush-piece" key={piece.id} open={expanded[piece.id] ?? false} onToggle={e => { const open = e.currentTarget.open; setExpanded(old => old[piece.id] === open ? old : { ...old, [piece.id]: open }); }}>
          <summary>{piece.name || `New piece ${index + 1}`} · {piece.category}{piece.id.includes("detected-") ? ` · model score ${Math.round(piece.confidence * 100)}%` : ""}</summary>
          <GarmentCrop photo={photo} item={piece} className="rush-crop" /><fieldset disabled={busy}><legend>Piece {index + 1}</legend>
            <label><input type="checkbox" checked={piece.selected} onChange={e => edit(piece.id, { selected: e.target.checked })} /> Include this option</label>
            <label>Garment name<input aria-label={`Rush piece ${index + 1} name`} maxLength={100} value={piece.name} onChange={e => edit(piece.id, { name: e.target.value })} placeholder="e.g. blouse, sari, jacket" /></label>
            <label>Category<select aria-label={`Rush piece ${index + 1} category`} value={piece.category} onChange={e => edit(piece.id, { category: e.target.value as ClothingCategory })}>{clothingCategories.map(c => <option value={c} key={c}>{c}</option>)}</select></label>
            <label>Colour<input aria-label={`Rush piece ${index + 1} colour`} maxLength={40} value={piece.colour} onChange={e => edit(piece.id, { colour: e.target.value })} /></label>
            <label>Style for this session<select aria-label={`Rush piece ${index + 1} style`} value={piece.style} onChange={e => edit(piece.id, { style: e.target.value as RushStyle })}>{rushStyles.map(style => <option key={style} value={style}>{style === "unknown" ? "Unknown — check before formal events" : style}</option>)}</select></label>
            <label>Garment detail<input aria-label={`Rush piece ${index + 1} detail`} maxLength={200} value={piece.detail} onChange={e => edit(piece.id, { detail: e.target.value })} /></label>
            <details><summary>Adjust visible crop</summary>{["Left", "Top", "Width", "Height"].map((label, i) => <label key={label}>{label} (%)<input type="range" min={i < 2 ? 0 : 2} max={100} aria-label={`${label} for Rush piece ${index + 1}`} value={Math.round(piece.box[i] * 100)} onChange={e => crop(piece, i, Number(e.target.value))} /><output>{Math.round(piece.box[i] * 100)}%</output></label>)}</details>
            <button type="button" className="rush-button" onClick={() => { setPieces(old => old.filter(p => p.id !== piece.id)); invalidate(); }}>Remove piece {index + 1}</button>
          </fieldset>
        </details>;
      })}<label className="rush-note"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e => setReviewed(e.target.checked)} /> I checked the selected pieces, crops and style labels.</label><button className="rush-button" type="button" disabled={!canConfirm} onClick={confirm}>Confirm Rush Hour pieces</button><button className="rush-button" type="button" disabled={busy || !confirmed || !userId} onClick={() => void save()}>Save reviewed pieces to wardrobe</button>{savedCount ? <p className="rush-note">{savedCount} unique piece(s) confirmed saved. Descriptions persist; photos and session style labels do not.</p> : null}</section> : null}
      <div role="log" aria-label="Rush Hour conversation" aria-live="polite">{messages.map(message => <div className={`outfit-chat-message ${message.speaker === "You" ? "from-user" : "from-planner"}`} key={message.id}><span>{message.speaker}</span><p>{message.text}</p></div>)}</div>
      <div ref={result} className="rush-results" aria-label="Rush Hour outfit options">{outfits.map((outfit, index) => <article className="outfit-chat-outfit" key={outfit.id}><h3>Rush option {index + 1}</h3><div className="rush-option-pieces">{outfit.items.map(item => { const piece = selected.find(p => p.id === item.id)!, photo = photos.find(p => p.id === piece.photoId)!; return <figure key={item.id}><GarmentCrop photo={photo} item={piece} className="rush-crop" /><figcaption>{item.name}<small>{item.colour} · {item.category}</small></figcaption></figure>; })}</div><p>{outfit.explanation}</p><details><summary>Before you wear it</summary>{outfit.cautions.map(c => <p key={c}>{c}</p>)}</details><button type="button" className="rush-button" aria-pressed={compare.includes(outfit.id)} onClick={() => setCompare(old => old.includes(outfit.id) ? old.filter(id => id !== outfit.id) : [...old.slice(-1), outfit.id])}>Compare option {index + 1}</button></article>)}</div>
      {compare.length ? <section aria-label="Compared Rush Hour outfits" className="rush-compare">{outfits.filter(o => compare.includes(o.id)).map(outfit => <div key={outfit.id}><h4>Rush option {outfits.indexOf(outfit) + 1}</h4><ul>{outfit.items.map(item => <li key={item.id}>{item.name}</li>)}</ul></div>)}</section> : null}
      <button type="button" className="rush-button" onClick={clear}>Clear Rush Hour photos and plan</button>
    </div>
    <div className="outfit-chat-quick" aria-label="Rush Hour suggested replies">{replies.map(reply => <button key={reply} type="button" disabled={busy} onClick={() => send(reply)}>{reply}</button>)}</div>
    <form className="outfit-chat-form" onSubmit={submit}><label className="outfit-chat-input-label" htmlFor="rush-hour-input">Tell Rush Hour</label><div><textarea id="rush-hour-input" rows={2} maxLength={600} value={input} disabled={busy} onChange={e => setInput(e.target.value)} placeholder="Dinner, casual, indoors…" /><button type="submit" disabled={busy || !input.trim()}>Send</button></div><small>Session only. Recognition and wardrobe saving happen only when you explicitly request them.</small></form>
  </>;
}
