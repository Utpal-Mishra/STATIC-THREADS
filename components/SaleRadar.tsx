"use client";

import { useEffect, useMemo, useState } from "react";
import type { WardrobeCatalog } from "@/types/catalog";

interface SaleRadarProps {
  catalog: WardrobeCatalog;
}

interface StoredSalePreferences {
  enabled: boolean;
  minimumDiscount: string;
  maximumPrice: string;
  retailers: string[];
}

const STORAGE_KEY = "static-threads-sale-preferences";

const retailerOptions = [
  {
    name: "Brand stores",
    role: "Direct releases, colourways and brand-specific promotions",
    accent: "mint"
  },
  {
    name: "JD Sports",
    role: "Multi-brand footwear, trainers and streetwear offers",
    accent: "violet"
  },
  {
    name: "Sports Direct",
    role: "Cross-brand sportswear, footwear and seasonal reductions",
    accent: "amber"
  },
  {
    name: "NEXT",
    role: "Clothing, footwear and selected third-party brand ranges",
    accent: "blue"
  }
] as const;

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function SaleRadar({ catalog }: SaleRadarProps) {
  const [enabled, setEnabled] = useState(false);
  const [minimumDiscount, setMinimumDiscount] = useState("20");
  const [maximumPrice, setMaximumPrice] = useState("150");
  const [retailers, setRetailers] = useState<string[]>(retailerOptions.map((retailer) => retailer.name));
  const [saveMessage, setSaveMessage] = useState("Rules have not been saved on this device yet.");
  const [notificationMessage, setNotificationMessage] = useState(
    "Browser permission is optional and can be enabled when live feeds are connected."
  );

  const wardrobeBrands = useMemo(
    () => unique(catalog.items.map((item) => item.brand)),
    [catalog.items]
  );
  const wardrobeSizes = useMemo(
    () => unique(catalog.items.map((item) => item.size)),
    [catalog.items]
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return;
    }

    try {
      const preferences = JSON.parse(stored) as StoredSalePreferences;
      setEnabled(Boolean(preferences.enabled));
      setMinimumDiscount(preferences.minimumDiscount || "20");
      setMaximumPrice(preferences.maximumPrice || "150");
      setRetailers(preferences.retailers?.length ? preferences.retailers : retailerOptions.map((item) => item.name));
      setSaveMessage("Saved rules restored from this device.");
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function toggleRetailer(retailer: string) {
    setRetailers((current) =>
      current.includes(retailer)
        ? current.filter((value) => value !== retailer)
        : [...current, retailer]
    );
  }

  function savePreferences() {
    const preferences: StoredSalePreferences = {
      enabled,
      minimumDiscount,
      maximumPrice,
      retailers
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setSaveMessage("Sale rules saved on this device.");
  }

  async function requestBrowserNotifications() {
    if (!("Notification" in window)) {
      setNotificationMessage("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      new Notification("Static Threads sale radar", {
        body: "Notifications are enabled. Live sale alerts will start after retailer feeds are connected."
      });
      setNotificationMessage("Browser notifications are enabled.");
      return;
    }

    setNotificationMessage("Notification permission was not granted.");
  }

  return (
    <section className="sale-section" id="sale-radar" aria-labelledby="sale-heading">
      <div className="section-heading sale-heading">
        <div>
          <p className="eyebrow eyebrow-coral">Smart shopping</p>
          <h2 id="sale-heading">Sale radar</h2>
        </div>
        <span className="feature-status">Preference setup live · feeds next</span>
      </div>

      <div className="sale-intro-grid">
        <article className="sale-intro-card">
          <p className="micro-label">The useful alert</p>
          <h3>Only notify me when the product fits my wardrobe.</h3>
          <p>
            A sale alone is not enough. Static Threads will compare the brand, saved size, category,
            price and outfit compatibility before surfacing an offer.
          </p>
          <div className="match-logic" aria-label="Sale matching logic">
            <span>Brand</span>
            <span>Size</span>
            <span>Wardrobe match</span>
            <span>Retailer</span>
            <span>Price</span>
          </div>
        </article>

        <article className="wardrobe-signal-card">
          <div>
            <p className="micro-label">Current wardrobe signal</p>
            <strong>{wardrobeBrands.length || 0}</strong>
            <span>saved brands</span>
          </div>
          <div>
            <strong>{wardrobeSizes.length || 0}</strong>
            <span>saved sizes</span>
          </div>
          <p>
            {catalog.items.length > 0
              ? "Future sale matches will inherit these wardrobe preferences automatically."
              : "Add your first clothing or shoe item to activate personalised brand and size matching."}
          </p>
        </article>
      </div>

      <div className="sale-control-grid">
        <article className="sale-rule-panel">
          <div className="rule-panel-heading">
            <div>
              <p className="micro-label">Notification rule</p>
              <h3>My sale threshold</h3>
            </div>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              <span aria-hidden="true" />
              {enabled ? "Enabled" : "Paused"}
            </label>
          </div>

          <div className="sale-fields">
            <label>
              <span>Minimum discount</span>
              <div className="input-with-suffix">
                <input
                  inputMode="numeric"
                  min="0"
                  max="90"
                  type="number"
                  value={minimumDiscount}
                  onChange={(event) => setMinimumDiscount(event.target.value)}
                />
                <span>%</span>
              </div>
            </label>

            <label>
              <span>Maximum item price</span>
              <div className="input-with-suffix prefix">
                <span>€</span>
                <input
                  inputMode="decimal"
                  min="0"
                  type="number"
                  value={maximumPrice}
                  onChange={(event) => setMaximumPrice(event.target.value)}
                />
              </div>
            </label>
          </div>

          <fieldset className="retailer-checks">
            <legend>Retailers to monitor</legend>
            {retailerOptions.map((retailer) => (
              <label key={retailer.name}>
                <input
                  type="checkbox"
                  checked={retailers.includes(retailer.name)}
                  onChange={() => toggleRetailer(retailer.name)}
                />
                <span>{retailer.name}</span>
              </label>
            ))}
          </fieldset>

          <div className="sale-actions">
            <button className="primary-button" type="button" onClick={savePreferences}>
              Save sale rules
            </button>
            <button className="secondary-button" type="button" onClick={requestBrowserNotifications}>
              Enable browser alerts
            </button>
          </div>

          <p className="form-message" aria-live="polite">{saveMessage}</p>
          <p className="form-message subtle" aria-live="polite">{notificationMessage}</p>
        </article>

        <aside className="feed-readiness-card">
          <p className="micro-label">Honest status</p>
          <h3>Rules are ready. Live retailer feeds are not connected yet.</h3>
          <p>
            The interface now stores your sale preferences. The next technical stage is to add approved
            retailer or affiliate feeds, a scheduled matching job and a notification service. Until then,
            no live price or stock alert is claimed.
          </p>
          <ol>
            <li>Collect permitted retailer product data.</li>
            <li>Match brand, size, category and wardrobe compatibility.</li>
            <li>Notify only when the saved rule is satisfied.</li>
          </ol>
        </aside>
      </div>

      <div className="retailer-grid" aria-label="Planned retailer coverage">
        {retailerOptions.map((retailer) => (
          <article className={`retailer-card retailer-${retailer.accent}`} key={retailer.name}>
            <span className="retailer-dot" aria-hidden="true" />
            <h3>{retailer.name}</h3>
            <p>{retailer.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
