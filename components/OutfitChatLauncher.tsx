"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

const OutfitChat = dynamic(() => import("@/components/OutfitChat"), { ssr: false, loading: () => <span className="outfit-chat-loading" role="status">Opening outfit planner…</span> });

export function OutfitChatLauncher() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return <>
    <button className="outfit-chat-launcher" ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/></svg>
      Plan an outfit
    </button>
    {open ? <OutfitChat onClose={close} /> : null}
  </>;
}
