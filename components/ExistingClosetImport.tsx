"use client";
import { useEffect, useRef, useState } from "react";
import catalog from "@/data/catalog.json";
import type { WardrobeItem } from "@/types/catalog";
import { catalogueMetadata, cataloguePhoto } from "@/lib/catalogue-import";
import { personalSession, WardrobeError } from "@/lib/personal-wardrobe";
const items = catalog.items as WardrobeItem[];
export default function ExistingClosetImport({ userId, onChange }: { userId: string; onChange: () => void }) {
  const [open, setOpen] = useState(false), [chosen, setChosen] = useState(items.map(i => i.id)), [includePhotos, setIncludePhotos] = useState(true);
  const [confirmed, setConfirmed] = useState(false), [running, setRunning] = useState(false), [progress, setProgress] = useState("");
  const [results, setResults] = useState<Array<{ id: string; message: string }>>([]);
  const controller = useRef<AbortController | null>(null), active = useRef(true), working = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  async function start() {
    if (!confirmed || !chosen.length || working.current) return;
    const abort = new AbortController(); controller.current = abort; working.current = true; setRunning(true); setResults([]); setProgress("Checking your account…");
    let completed = 0;
    try {
      const api = await personalSession(userId, abort.signal);
      for (const source of items.filter(i => chosen.includes(i.id))) {
        abort.signal.throwIfAborted();
        if (active.current) setProgress(`Importing ${completed + 1} of ${chosen.length}: ${source.name}`);
        let message: string;
        try {
          const { item, created } = await api.importCatalogue(source.id, catalogueMetadata(source));
          if (item.deleted_at) message = "Previously imported item is awaiting deletion. Finish that deletion in your wardrobe first.";
          else if (!includePhotos) message = created ? "Details imported." : "Already imported; your details were kept.";
          else if (item.photo_id || item.revision !== 1) message = "Already imported or edited; current details and photo choice were kept.";
          else {
            const pending = await api.photos(item.id);
            if (pending.length) message = "Details imported. Clean up pending photos in your wardrobe, then retry this item.";
            else { await api.upload(item, await cataloguePhoto(source, abort.signal)); message = "Details and catalogue image imported."; }
          }
        } catch (e) { if (abort.signal.aborted || (e instanceof WardrobeError && e.kind !== "conflict")) throw e; message = `Needs retry: ${e instanceof Error ? e.message : "Import could not be confirmed."}`; }
        if (active.current && !abort.signal.aborted) setResults(r => [...r, { id: source.id, message }]);
        completed++;
      }
      if (active.current) setProgress("Import review finished. Check each result below; items marked for retry are not confirmed complete.");
    } catch (e) { if (active.current) setProgress(abort.signal.aborted ? "Import stopped. Completed items remain in your account; retry the same selection to continue." : e instanceof Error ? e.message : "Import unavailable."); }
    finally { working.current = false; if (active.current) { setRunning(false); onChange(); } }
  }
  return <section className="existing-closet-import" aria-label="Import existing closet">
    <button type="button" className="secondary" disabled={running} onClick={() => setOpen(v => !v)}>{open ? "Hide existing closet import" : "Import my existing closet"}</button>
    {open ? <div className="personal-editor"><h2>Bring your existing closet into your account</h2><p>Select the items that belong to you. This copies the previously catalogued details and, optionally, their approved illustrative images. Repeating the import keeps existing edits and photo choices. The public catalogue stays available.</p>
    <fieldset disabled={running}><div className="personal-actions"><button className="secondary" type="button" onClick={() => setChosen(items.map(i => i.id))}>Select all {items.length} items</button><button className="secondary" type="button" onClick={() => setChosen([])}>Clear selection</button></div>
    <div className="existing-closet-options">{items.map(i => <label key={i.id}><input type="checkbox" checked={chosen.includes(i.id)} onChange={e => setChosen(v => e.target.checked ? [...v, i.id] : v.filter(id => id !== i.id))} />{i.name} · {i.brand} · {i.primaryColour}</label>)}</div>
    <label className="cleanup-approval"><input type="checkbox" checked={includePhotos} onChange={e => setIncludePhotos(e.target.checked)} />Copy existing catalogue images to my private wardrobe</label>
    <label className="cleanup-approval"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I confirm the selected items belong in my personal wardrobe.</label>
    <button type="button" disabled={!confirmed || !chosen.length} onClick={() => void start()}>Import selected ({chosen.length})</button></fieldset>
    {running ? <button type="button" className="secondary" onClick={() => controller.current?.abort()}>Stop import</button> : null}
    <p role="status">{progress}</p>{results.length ? <ul className="existing-import-results">{results.map(r => <li key={r.id}><strong>{items.find(i => i.id === r.id)?.name}</strong>: {r.message}</li>)}</ul> : null}</div> : null}
  </section>;
}
