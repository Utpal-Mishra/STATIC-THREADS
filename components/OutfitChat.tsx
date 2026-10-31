"use client";

import { FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { OutfitVisuals } from "@/components/OutfitVisuals";
import { useAuth } from "@/components/AuthProvider";
import { styleProfile } from "@/data/style-profile";
import catalog from "@/data/catalog.json";
import { emptyBrief, nextQuestion, planOutfits, updateBrief, type Brief, type Outfit, type PlannerItem } from "@/lib/outfit-planner";
import { loadPersonalWardrobe, readDemoActions, recordDemoOutfit, recordPersonalOutfit, type DemoActions } from "@/lib/outfit-chat-data";

type Message = { id: number; speaker: "You" | "Planner"; text: string };
const initialMessage: Message = { id: 0, speaker: "Planner", text: "Tell me what you're dressing for. For example: ‘Plan my outfit for dinner, smart casual, indoors.’ You can name a wardrobe piece, avoid colours or ask for a comfortable option." };
const demoItems: PlannerItem[] = catalog.items.map(item => ({ id: item.id, name: item.name, category: item.category, subcategory: item.subcategory, colour: item.primaryColour, secondaryColours: item.secondaryColours, material: item.material, occasions: item.occasions, status: item.status }));

export default function OutfitChat({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; element?.close(); };
  }, []);
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], summary, [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    const first = targets[0], last = targets[targets.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
  const personal = auth.status === "signed-in" && !demo;
  const sourceKey = `${auth.user?.id ?? "guest"}:${personal ? "personal" : "demo"}`;
  return <dialog ref={dialog} className="outfit-chat-dialog" aria-labelledby="outfit-chat-title" onCancel={onClose} onKeyDown={trapFocus}>
    <header className="outfit-chat-header">
      <div><p className="eyebrow">Static Threads</p><h2 id="outfit-chat-title">Your outfit planner</h2></div>
      <button type="button" className="outfit-chat-close" onClick={onClose} aria-label="Close outfit planner">×</button>
    </header>
    <div className="outfit-chat-source">
      <strong>{personal ? "Your private wardrobe" : "Demo Wardrobe"}</strong>
      <span hidden>Local outfit planner · optional web mannequin previews</span>
      {auth.status === "signed-in" ? <button type="button" onClick={() => setDemo(value => !value)}>{demo ? "Use my wardrobe" : "Try demo wardrobe"}</button> : <small hidden>Demo pieces belong to the sample catalogue. Personal wardrobe access requires a connected account.</small>}
    </div>
    {auth.status === "loading" ? <p className="outfit-chat-notice" role="status">Checking your account…</p> : <ChatSession key={sourceKey} userId={personal ? auth.user!.id : null} />}
  </dialog>;
}

function ChatSession({ userId }: { userId: string | null }) {
  const [items, setItems] = useState<PlannerItem[]>(userId ? [] : demoItems);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">(userId ? "loading" : "ready");
  const [retry, setRetry] = useState(0);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [question, setQuestion] = useState<string[]>(["Office", "Wedding", "Dinner", "Travel"]);
  const [input, setInput] = useState("");
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [actionState, setActionState] = useState<Record<string, "busy" | "done" | "error">>({});
  const [actionMessage, setActionMessage] = useState("");
  const [demoActions, setDemoActions] = useState<DemoActions>({ version: 1, saved: [], worn: [] });
  const [showSaved, setShowSaved] = useState(false);
  const transcript = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sequence = useRef(1);
  const pendingActions = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!userId) { setDemoActions(readDemoActions()); return; }
    const controller = new AbortController();
    setLoadStatus("loading");
    void loadPersonalWardrobe(userId, controller.signal).then(data => {
      if (!controller.signal.aborted) { setItems(data); setLoadStatus("ready"); }
    }).catch(() => { if (!controller.signal.aborted) { setItems([]); setLoadStatus("error"); } });
    return () => controller.abort();
  }, [userId, retry]);
  useEffect(() => {
    const container = transcript.current;
    if (!container) return;
    const replies = container.querySelectorAll<HTMLElement>(".outfit-chat-message.from-planner");
    const reply = outfits.length ? replies[replies.length - 1] : null;
    container.scrollTo({ top: reply ? container.scrollTop + reply.getBoundingClientRect().top - container.getBoundingClientRect().top : container.scrollHeight });
  }, [messages, outfits]);

  function addMessage(speaker: Message["speaker"], text: string) {
    setMessages(current => [...current.slice(-38), { id: sequence.current++, speaker, text }]);
  }
  function send(value: string) {
    const text = value.trim().slice(0, 600);
    if (!text || loadStatus !== "ready" || !items.length) return;
    addMessage("You", text);
    const next = updateBrief(brief, text, items);
    const changed = JSON.stringify(next) !== JSON.stringify(brief);
    setBrief(next); setInput(""); setActionMessage("");
    const followup = nextQuestion(next);
    if (followup) {
      setOutfits([]); setQuestion(followup.options); addMessage("Planner", followup.text);
    } else if (!changed && outfits.length && !/\b(another|alternative|more|again|options)\b/i.test(text)) {
      addMessage("Planner", "I can adjust this plan using an event, dress code, indoor/outdoor conditions, colours to avoid or an exact item name. Try ‘no black’, ‘prefer blue’ or ‘another option’. This local planner doesn't answer general questions.");
    } else {
      const result = planOutfits(items, next, changed ? [] : seen, userId ? [] : styleProfile.outfits.slice(0, 4).map(look => look.itemIds));
      setOutfits(result.outfits); setSeen(current => [...(changed ? [] : current), ...result.outfits.map(outfit => outfit.id)]);
      setQuestion(result.outfits.length ? ["Another option", "No black", "Prefer blue", "Comfortable"] : ["Casual", "Smart casual", "Clear preferences"]);
      addMessage("Planner", result.message);
    }
    inputRef.current?.focus();
  }
  function submit(event: FormEvent) { event.preventDefault(); send(input); }
  function reset() {
    setBrief(emptyBrief()); setMessages([initialMessage]); setOutfits([]); setSeen([]); setQuestion(["Office", "Wedding", "Dinner", "Travel"]); setInput(""); setActionMessage("");
    inputRef.current?.focus();
  }
  async function act(outfit: Outfit, action: "saved" | "worn") {
    const key = `${outfit.id}:${action}`;
    if (pendingActions.current.has(key) || actionState[key] === "done") return;
    pendingActions.current.add(key);
    setActionState(current => ({ ...current, [key]: "busy" })); setActionMessage("");
    try {
      if (userId) await recordPersonalOutfit(userId, outfit.items.map(item => item.id), action, brief.event);
      else {
        const value = recordDemoOutfit(outfit.id, action);
        if (mounted.current) setDemoActions(value);
      }
      if (mounted.current) {
        setActionState(current => ({ ...current, [key]: "done" }));
        setActionMessage(userId ? (action === "saved" ? "Outfit saved to your account." : "Wear event recorded in your account.") : (action === "saved" ? "Demo outfit saved on this browser." : "Demo wear event recorded on this browser."));
      }
    } catch {
      if (mounted.current) { setActionState(current => ({ ...current, [key]: "error" })); setActionMessage("This action couldn't be confirmed. Check your connection or browser storage before retrying."); }
    } finally { pendingActions.current.delete(key); }
  }
  const savedDemo = !userId ? demoActions.saved.map(id => ({ id, items: id.split("|").map(itemId => items.find(item => item.id === itemId)).filter((item): item is PlannerItem => Boolean(item)) })).filter(outfit => outfit.items.length === outfit.id.split("|").length) : [];
  return <>
    <div className="outfit-chat-toolbar"><span>{loadStatus === "loading" ? "Loading wardrobe…" : `${items.filter(item => item.status === "available").length} available pieces${items.length === 500 ? " · first 500 records" : ""}`}</span><button type="button" onClick={reset}>New plan</button></div>
    {loadStatus === "error" ? <div className="outfit-chat-notice" role="alert">Your private wardrobe could not be loaded. Check that account storage is set up and try again. Demo data has not been substituted.<button type="button" onClick={() => setRetry(value => value + 1)}>Retry wardrobe</button></div> : loadStatus === "ready" && !items.length ? <p className="outfit-chat-notice">Your wardrobe is empty. Add clothing when wardrobe uploads are available, or choose “Try demo wardrobe” above to explore the planner.</p> : null}
    <div className="outfit-chat-transcript" ref={transcript}>
      <div role="log" aria-label="Outfit planning conversation" aria-live="polite" aria-relevant="additions">
        {messages.map(message => <div className={`outfit-chat-message ${message.speaker === "You" ? "from-user" : "from-planner"}`} key={message.id}><span>{message.speaker}</span><p>{message.text}</p></div>)}
      </div>
      {outfits.length ? <div className="outfit-chat-results" aria-label="Outfit suggestions">{outfits.map((outfit, index) => <article className="outfit-chat-outfit" key={outfit.id}>
        <h3>Option {index + 1}</h3>
        <ul>{outfit.items.map(item => <li key={item.id}><strong>{item.name}</strong><span>{item.colour} · {item.category}</span></li>)}</ul>
        <p>{outfit.explanation}</p>
        <OutfitVisuals key={`${outfit.id}:${JSON.stringify(brief)}`} outfit={outfit} brief={brief} />
        <details><summary>Before you wear it</summary>{outfit.cautions.map(caution => <p key={caution}>{caution}</p>)}</details>
        <div className="outfit-chat-actions">{(["saved", "worn"] as const).map(action => {
          const state = actionState[`${outfit.id}:${action}`];
          const done = state === "done" || (!userId && action === "saved" && demoActions.saved.includes(outfit.id));
          return <button key={action} type="button" disabled={state === "busy" || done} onClick={() => void act(outfit, action)}>{state === "busy" ? "Recording…" : done ? action === "saved" ? "Saved" : "Wear recorded" : action === "saved" ? "Save outfit" : "Wore this"}</button>;
        })}</div>
      </article>)}</div> : null}
      {!outfits.length && messages.length > 1 && !nextQuestion(brief) ? <div className="chat-empty-visual"><OutfitVisuals key={JSON.stringify(brief)} outfit={{ id: "missing-wardrobe-look", items: [], explanation: "", cautions: [] }} brief={brief} /></div> : null}
      {!userId && savedDemo.length ? <div className="outfit-chat-saved"><button type="button" aria-expanded={showSaved} onClick={() => setShowSaved(value => !value)}>Saved demo outfits ({savedDemo.length})</button>{showSaved ? <ul>{savedDemo.map(outfit => <li key={outfit.id}>{outfit.items.map(item => item.name).join(" + ")}</li>)}</ul> : null}<small>{demoActions.worn.length} demo wear event(s) on this browser</small></div> : null}
    </div>
    <p className="outfit-chat-action-message" role="status">{actionMessage}</p>
    <div className="outfit-chat-quick" aria-label="Suggested replies">{question.map(value => <button type="button" key={value} disabled={loadStatus !== "ready" || !items.length} onClick={() => send(value)}>{value}</button>)}</div>
    <form className="outfit-chat-form" onSubmit={submit}>
      <label htmlFor="outfit-chat-input" className="outfit-chat-input-label">Tell the planner</label>
      <div><textarea id="outfit-chat-input" ref={inputRef} value={input} onChange={event => setInput(event.target.value)} maxLength={600} rows={2} placeholder="Dinner, smart casual, indoors…" disabled={loadStatus !== "ready" || !items.length} /><button type="submit" disabled={!input.trim() || loadStatus !== "ready" || !items.length}>Send</button></div>
      <small>Conversation stays in this session. Only explicit save/wear actions are stored.</small>
    </form>
  </>;
}
