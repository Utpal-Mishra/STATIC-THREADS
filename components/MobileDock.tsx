"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type IconName = "style" | "wardrobe" | "decide" | "menu" | "shop" | "sale" | "account";

export function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    style: <><path d="M10 7a2 2 0 1 1 3 1.7V11l7 4.5a1.5 1.5 0 0 1-.8 2.8H4.8a1.5 1.5 0 0 1-.8-2.8l8-5" /></>,
    wardrobe: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 3v18M9 11v3m6-3v3" /></>,
    decide: <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" /></>,
    menu: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    shop: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    sale: <><path d="m3 12 9-9h8v8l-9 10-8-9Z" /><circle cx="16" cy="7" r="1" /></>,
    account: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const sections = [
  { id: "style-studio", label: "Style", icon: "style" },
  { id: "decision-lab", label: "Decide", icon: "decide" },
  { id: "wardrobe", label: "Wardrobe", icon: "wardrobe" },
  { id: "shop-similar", label: "Shop similar", icon: "shop" },
  { id: "sale-radar", label: "Sale radar", icon: "sale" }
] as const;
const dockSections = [sections[0], sections[2], sections[1]];

export function MobileDock() {
  const [active, setActive] = useState("style-studio");
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 680px)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!media.matches) return;
      const marker = window.innerHeight * 0.3;
      let current = "style-studio";
      let nearestTop = -Infinity;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (!element) continue;
        const top = element.getBoundingClientRect().top;
        if (top <= marker && top > nearestTop) { current = section.id; nearestTop = top; }
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(max-width: 680px)");
    const onResize = () => { if (!media.matches) menu.current?.close(); };
    media.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previous;
      media.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  const closeMenu = () => menu.current?.close();

  return (
    <>
      <nav className="mobile-dock" aria-label="Mobile navigation">
        {dockSections.map((section) => (
          <a key={section.id} href={`#${section.id}`} aria-current={active === section.id && !menuOpen ? "location" : undefined} onClick={() => setActive(section.id)}>
            <NavigationIcon name={section.icon} /><span>{section.label}</span>
          </a>
        ))}
        <button ref={menuButton} type="button" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="mobile-navigation-menu" className={menuOpen || active === "shop-similar" || active === "sale-radar" ? "is-active" : ""} onClick={() => { menu.current?.showModal(); menu.current?.querySelector<HTMLButtonElement>("button")?.focus(); setMenuOpen(true); }}>
          <NavigationIcon name="menu" /><span>Menu</span>
        </button>
      </nav>

      <dialog ref={menu} id="mobile-navigation-menu" className="mobile-navigation-menu" aria-labelledby="mobile-menu-title" onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(element => element.getClientRects().length > 0);
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }} onClose={() => { setMenuOpen(false); if (window.matchMedia("(max-width: 680px)").matches) menuButton.current?.focus(); }} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu(); } }}>
        <div className="mobile-menu-heading"><h2 id="mobile-menu-title">Explore Static Threads</h2><button type="button" onClick={closeMenu} aria-label="Close navigation menu" autoFocus>×</button></div>
        <nav aria-label="All mobile sections">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined} onClick={() => { setActive(section.id); closeMenu(); }}><NavigationIcon name={section.icon} /><span>{section.label}</span><span aria-hidden="true">↗</span></a>
          ))}
          <Link href="/account/" onClick={closeMenu}><NavigationIcon name="account" /><span>Account</span><span aria-hidden="true">↗</span></Link>
        </nav>
      </dialog>
    </>
  );
}
