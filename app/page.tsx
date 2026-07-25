import catalogData from "@/data/catalog.json";
import { WardrobeCatalogView } from "@/components/WardrobeCatalog";
import type { WardrobeCatalog } from "@/types/catalog";

export default function HomePage() {
  const catalog = catalogData as WardrobeCatalog;

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Your wardrobe, understood</p>
          <h1>Static Threads</h1>
          <p className="hero-copy">
            Catalogue what you own, uncover new combinations and check whether a future purchase
            genuinely adds value.
          </p>
        </div>
        <div className="hero-badge" aria-label="Catalogue status">
          <span>{catalog.items.length}</span>
          approved items
        </div>
      </section>

      <WardrobeCatalogView catalog={catalog} />
    </main>
  );
}
