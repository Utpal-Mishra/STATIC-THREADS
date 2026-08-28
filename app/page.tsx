import catalogData from "@/data/catalog.json";
import { SaleRadar } from "@/components/SaleRadar";
import { StyleStudio } from "@/components/StyleStudio";
import { WardrobeCatalogView } from "@/components/WardrobeCatalog";
import type { WardrobeCatalog } from "@/types/catalog";

export default function HomePage() {
  const catalog = catalogData as WardrobeCatalog;

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Static Threads home">
          <span>ST</span>
          Static Threads
        </a>
        <nav aria-label="Primary navigation">
          <a href="#style-studio">Style</a>
          <a href="#wardrobe">Wardrobe</a>
          <a href="#shop-similar">Shop similar</a>
          <a href="#sale-radar">Sale radar</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy-wrap">
          <p className="eyebrow">Your wardrobe, understood</p>
          <h1>Wear more.<br />Buy better.</h1>
          <p className="hero-copy">
            Your closet now learns from the outfits you actually wear: relaxed shirts, neutral layers,
            dark bottoms and clean sneakers. Use that profile to build better combinations and judge
            future purchases against what already works.
          </p>
          <div className="hero-tags" aria-label="Static Threads capabilities">
            <span>Personal style profile</span>
            <span>Wardrobe combinations</span>
            <span>Retail match</span>
            <span>Sale alerts</span>
          </div>
        </div>

        <div className="hero-orbit" aria-label={`${catalog.items.length} approved catalogue items`}>
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />
          <div className="hero-badge">
            <span>{catalog.items.length}</span>
            wardrobe signals
          </div>
        </div>
      </section>

      <StyleStudio catalog={catalog} />

      <div id="wardrobe">
        <WardrobeCatalogView catalog={catalog} />
      </div>

      <SaleRadar catalog={catalog} />

      <footer className="site-footer">
        <span>Static Threads</span>
        <p>Own the wardrobe. Question the purchase.</p>
      </footer>
    </main>
  );
}
