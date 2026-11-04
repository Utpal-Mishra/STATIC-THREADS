"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cleanupSource, defaultCleanup, renderCleanup, type CleanupOptions } from "@/lib/photo-cleanup";
export function PhotoCleanup({ file, onClose, onSave }: { file: File; onClose: () => void; onSave: (photo: File) => Promise<boolean> }) {
  const dialog = useRef<HTMLDialogElement>(null), original = useRef<HTMLCanvasElement>(null), preview = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<ImageData | null>(null), [options, setOptions] = useState<CleanupOptions>(defaultCleanup);
  const [error, setError] = useState(""), [warning, setWarning] = useState(""), [valid, setValid] = useState(false), [busy, setBusy] = useState(false), [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<"erase" | "restore" | "off">("off"), [radius, setRadius] = useState(.035);
  const previousFocus = useRef<HTMLElement | null>(null), drawing = useRef(false);
  useEffect(() => { previousFocus.current = document.activeElement as HTMLElement; dialog.current?.showModal(); let active = true; void cleanupSource(file).then(image => { if (active) setSource(image); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; dialog.current?.close(); previousFocus.current?.focus(); }; }, [file]);
  useEffect(() => {
    if (!source || !original.current || !preview.current) return;
    setChecked(false); setError(""); setValid(false);
    try { original.current.width = source.width; original.current.height = source.height; original.current.getContext("2d")?.putImageData(source, 0, 0); setWarning(renderCleanup(source, options, preview.current)); setValid(true); } catch(e) { setError(e instanceof Error ? e.message : "Preview unavailable."); }
  }, [source, options]);
  function brush(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || mode === "off" || busy || options.marks.length >= 1500) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const mark = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)), radius, keep: mode === "restore" };
    setOptions(o => ({ ...o, marks: [...o.marks, mark].slice(-1500) }));
  }
  async function save(cleaned: boolean) {
    if (busy || !source || (cleaned && (!valid || !checked))) return;
    setBusy(true); setError("");
    try {
      let chosen = file;
      if (cleaned) { const blob = await new Promise<Blob>((resolve, reject) => preview.current?.toBlob(value => value ? resolve(value) : reject(new Error("Photo export failed.")), "image/png")); chosen = new File([blob], "reviewed-clothing.png", { type: "image/png" }); }
      if (!(await onSave(chosen))) setError("Photo saving could not be confirmed. Close this preview to see the wardrobe sync message before retrying.");
    } catch (e) { setError(e instanceof Error ? e.message : "Photo saving failed."); } finally { setBusy(false); }
  }
  return <dialog className="photo-cleanup personal-wardrobe" ref={dialog} aria-labelledby="cleanup-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="cleanup-head"><h2 id="cleanup-title">Review clothing photo</h2><button className="secondary" disabled={busy} onClick={onClose}>Cancel photo</button></div>
    <p>Cleanup runs on this device. Check edges, colour and garment details before saving. Plain backgrounds work best; this does not reconstruct hidden clothing or remove a person automatically.</p>
    {!source && !error ? <p role="status">Preparing preview…</p> : null}
    <div className="cleanup-images"><figure><figcaption>Original · brush here to erase or restore</figcaption><canvas ref={original} aria-label="Original photo mask editor" style={{ touchAction: mode === "off" ? "auto" : "none", cursor: mode === "off" ? "default" : "crosshair" }} onPointerDown={e => { if (mode !== "off") { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); brush(e); } }} onPointerMove={brush} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} /></figure><figure><figcaption>Cleaned preview · centred 4:5 frame</figcaption><canvas ref={preview} aria-label="Cleaned clothing preview" /></figure></div>
    {warning ? <p className="personal-warning" role="status">{warning}</p> : null}{error ? <p className="personal-warning" role="alert">{error}</p> : null}
    <fieldset disabled={busy || !source}><div className="cleanup-controls">
      <label className="cleanup-toggle"><input type="checkbox" checked={options.removeBackground} onChange={e => setOptions({ ...options, removeBackground: e.target.checked })} />Remove plain background</label>
      <label>Removal strength<input type="range" min="0" max="100" value={options.tolerance} onChange={e => setOptions({ ...options, tolerance: +e.target.value })} /></label>
      <label>Background<select aria-label="Background" value={options.background} onChange={e => setOptions({ ...options, background: e.target.value })}><option value="#eee9df">Warm neutral</option><option value="#ffffff">White</option><option value="#17201c">Dark neutral</option></select></label>
      <label>Lighting adjustment ({options.exposure}%)<input type="range" min="-20" max="20" value={options.exposure} onChange={e => setOptions({ ...options, exposure: +e.target.value })} /></label>
      <label>Brush mode<select aria-label="Brush mode" value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="off">Off · scroll normally</option><option value="erase">Erase background</option><option value="restore">Restore original pixels</option></select></label>
      <label>Brush size<input type="range" min=".01" max=".15" step=".005" value={radius} onChange={e => setRadius(+e.target.value)} /></label>
      {(["Left crop", "Top crop", "Right crop", "Bottom crop"] as const).map((label, index) => <label key={label}>{label}<input type="range" min={index < 2 ? "0" : ".05"} max={index < 2 ? ".95" : "1"} step=".01" value={options.crop[index]} onChange={e => { const crop = [...options.crop] as CleanupOptions["crop"]; crop[index] = +e.target.value; setOptions({ ...options, crop }); }} /></label>)}
    </div><p>Lighting adjustments can change perceived colour. Leave at 0% to retain the original lighting. Brush correction uses touch or pointer; crop and other controls also support keyboard input.</p>
    <div className="personal-actions"><button type="button" className="secondary" disabled={!options.marks.length} onClick={() => setOptions({ ...options, marks: options.marks.slice(0, -1) })}>Undo brush mark</button><button type="button" className="secondary" onClick={() => { setOptions(defaultCleanup()); setMode("off"); }}>Reset cleanup</button></div>
    <label className="cleanup-approval"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />I checked the garment edges, colour and details.</label>
    <div className="personal-actions"><button type="button" disabled={!valid || !checked} onClick={() => void save(true)}>{busy ? "Saving…" : "Save cleaned photo"}</button><button type="button" className="secondary" onClick={() => void save(false)}>Use original photo</button></div>
    </fieldset><p className="personal-footnote">Nothing is uploaded until you choose Save or Use original. Unsaved source and preview are cleared on closing. The saved image replaces the current photo; the source is not kept as a separate cloud original.</p>
  </dialog>;
}
