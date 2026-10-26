import type { ReactNode } from "react";

type IconName = "style" | "wardrobe" | "decide" | "shop" | "sale" | "account";

export function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    style: <><path d="M10 7a2 2 0 1 1 3 1.7V11l7 4.5a1.5 1.5 0 0 1-.8 2.8H4.8a1.5 1.5 0 0 1-.8-2.8l8-5" /></>,
    wardrobe: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 3v18M9 11v3m6-3v3" /></>,
    decide: <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" /></>,
    shop: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    sale: <><path d="m3 12 9-9h8v8l-9 10-8-9Z" /><circle cx="16" cy="7" r="1" /></>,
    account: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

