"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { NavigationIcon } from "@/components/NavigationIcon";

const sections = [
  { id: "style-studio", label: "Style", icon: "style" },
  { id: "decision-lab", label: "Decide", icon: "decide" },
  { id: "wardrobe", label: "Wardrobe", icon: "wardrobe" },
  { id: "shop-similar", label: "Similar", icon: "shop" },
  { id: "sale-radar", label: "Radar", icon: "sale" }
] as const;
export function MobileDock({ accountPage = false }: { accountPage?: boolean }) {
  const [active, setActive] = useState(accountPage ? "account" : "style-studio");
  const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  useEffect(() => {
    if (accountPage) return;
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
  }, [accountPage]);

  return (
    <nav className="mobile-dock" aria-label="Mobile navigation">
      {sections.map((section) => (
        <a key={section.id} href={accountPage ? `${publicBasePath}/#${section.id}` : `#${section.id}`} aria-current={!accountPage && active === section.id ? "location" : undefined} onClick={() => { if (!accountPage) setActive(section.id); }}>
          <NavigationIcon name={section.icon} /><span>{section.label}</span>
        </a>
      ))}
      <Link href="/account/" aria-current={accountPage ? "page" : undefined}>
        <NavigationIcon name="account" /><span>Account</span>
      </Link>
    </nav>
  );
}
