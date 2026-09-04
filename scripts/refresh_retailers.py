#!/usr/bin/env python3
"""Refresh Static Threads retailer suggestions from public product-page metadata.

The job deliberately uses standards-based metadata first (schema.org Product/Offer,
OpenGraph) rather than retailer-specific DOM selectors. Retailers can change their
HTML frequently; a failed adapter therefore keeps the curated fallback data and
marks the record stale instead of breaking the application.
"""

from __future__ import annotations

import html
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "data" / "retailer-sources.json"
OUTPUT_PATH = ROOT / "data" / "shop-similar.ts"
TIMEOUT_SECONDS = 18
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 "
    "StaticThreadsRetailerRefresh/1.0"
)


class MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.jsonld: list[str] = []
        self._capture_jsonld = False
        self._jsonld_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {k.lower(): (v or "") for k, v in attrs}
        if tag.lower() == "meta":
            key = values.get("property") or values.get("name")
            content = values.get("content")
            if key and content:
                self.meta[key.lower()] = content.strip()
        elif tag.lower() == "script" and "ld+json" in values.get("type", "").lower():
            self._capture_jsonld = True
            self._jsonld_buffer = []

    def handle_data(self, data: str) -> None:
        if self._capture_jsonld:
            self._jsonld_buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._capture_jsonld:
            raw = "".join(self._jsonld_buffer).strip()
            if raw:
                self.jsonld.append(raw)
            self._capture_jsonld = False
            self._jsonld_buffer = []


def iter_objects(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_objects(child)


def type_contains(obj: dict[str, Any], target: str) -> bool:
    raw = obj.get("@type")
    if isinstance(raw, str):
        return raw.lower() == target.lower()
    if isinstance(raw, list):
        return any(str(item).lower() == target.lower() for item in raw)
    return False


def first_product(jsonld_blocks: list[str]) -> dict[str, Any] | None:
    for raw in jsonld_blocks:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        for obj in iter_objects(data):
            if type_contains(obj, "Product"):
                return obj
    return None


def first_offer(product: dict[str, Any] | None) -> dict[str, Any] | None:
    if not product:
        return None
    offers = product.get("offers")
    candidates = offers if isinstance(offers, list) else [offers]
    for candidate in candidates:
        if isinstance(candidate, dict):
            if type_contains(candidate, "AggregateOffer"):
                nested = candidate.get("offers")
                if isinstance(nested, list) and nested and isinstance(nested[0], dict):
                    return nested[0]
            return candidate
    return None


def money_label(price: Any, currency: str | None) -> str | None:
    if price is None:
        return None
    text = str(price).strip()
    if not text:
        return None
    symbols = {"EUR": "€", "GBP": "£", "USD": "$"}
    symbol = symbols.get((currency or "EUR").upper(), f"{currency or 'EUR'} ")
    try:
        value = float(text.replace(",", ""))
        return f"{symbol}{value:.2f}" if value % 1 else f"{symbol}{value:.0f}"
    except ValueError:
        return f"{symbol}{text}"


def availability_label(value: Any, retailer: str) -> str | None:
    if not value:
        return None
    token = str(value).split("/")[-1].lower()
    if token in {"instock", "limitedavailability", "preorder", "presale"}:
        return f"Available from {retailer} when refreshed"
    if token in {"outofstock", "soldout", "discontinued"}:
        return f"Currently unavailable from {retailer} when refreshed"
    return f"{token.replace('_', ' ').replace('-', ' ').title()} at {retailer}"


def product_image(product: dict[str, Any] | None, parser: MetadataParser) -> str | None:
    if product:
        raw = product.get("image")
        if isinstance(raw, str):
            return raw
        if isinstance(raw, list) and raw:
            first = raw[0]
            if isinstance(first, str):
                return first
            if isinstance(first, dict):
                return first.get("url") or first.get("contentUrl")
        if isinstance(raw, dict):
            return raw.get("url") or raw.get("contentUrl")
    return parser.meta.get("og:image") or parser.meta.get("twitter:image")


def fetch_metadata(url: str) -> tuple[dict[str, Any], str]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.7",
            "Accept-Language": "en-IE,en;q=0.9",
            "Cache-Control": "no-cache",
        },
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS, context=context) as response:
        body = response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        final_url = response.geturl()

    parser = MetadataParser()
    parser.feed(body)
    product = first_product(parser.jsonld)
    offer = first_offer(product)

    result: dict[str, Any] = {}
    if product:
        if product.get("name"):
            result["sourceName"] = html.unescape(str(product["name"]).strip())
        if product.get("sku"):
            result["sourceProductCode"] = str(product["sku"]).strip()
    if offer:
        price = offer.get("price") or offer.get("lowPrice")
        currency = offer.get("priceCurrency")
        label = money_label(price, currency)
        if label:
            result["priceLabel"] = label
        available = availability_label(offer.get("availability"), "retailer")
        if available:
            result["rawAvailability"] = offer.get("availability")
    image = product_image(product, parser)
    if image:
        result["imageUrl"] = image

    if not result.get("priceLabel"):
        meta_price = parser.meta.get("product:price:amount") or parser.meta.get("og:price:amount")
        meta_currency = parser.meta.get("product:price:currency") or parser.meta.get("og:price:currency")
        label = money_label(meta_price, meta_currency)
        if label:
            result["priceLabel"] = label

    if not result.get("sourceName") and parser.meta.get("og:title"):
        result["sourceName"] = html.unescape(parser.meta["og:title"])

    return result, final_url


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def emit_ts(products: list[dict[str, Any]]) -> str:
    lines = [
        "// AUTO-GENERATED by scripts/refresh_retailers.py. Curated inputs live in data/retailer-sources.json.",
        "export type ShopSuggestion = {",
        "  id: string;",
        "  retailer: string;",
        "  name: string;",
        '  category: "shirt" | "overshirt" | "trousers" | "shorts" | "shoes";',
        "  colour: string;",
        "  priceLabel: string;",
        "  match: number;",
        "  pairsWith: string[];",
        "  reason: string;",
        "  href: string;",
        '  sourceType: "product" | "category";',
        "  checkedAt: string;",
        "  sale?: string;",
        "  imageUrl?: string;",
        "  imageAlt?: string;",
        "  availability?: string;",
        "  productCode?: string;",
        '  refreshStatus?: "live" | "stale" | "manual";',
        "  lastAttemptAt?: string;",
        "};",
        "",
        "export const shopSuggestions: ShopSuggestion[] = [",
    ]
    field_order = [
        "id", "retailer", "name", "category", "colour", "priceLabel", "sale", "match",
        "pairsWith", "reason", "href", "sourceType", "checkedAt", "availability", "productCode",
        "imageUrl", "imageAlt", "refreshStatus", "lastAttemptAt",
    ]
    for product in products:
        lines.append("  {")
        for field in field_order:
            if field not in product or product[field] is None:
                continue
            value = product[field]
            if isinstance(value, str):
                rendered = ts_string(value)
            elif isinstance(value, list):
                rendered = json.dumps(value, ensure_ascii=False)
            else:
                rendered = json.dumps(value)
            lines.append(f"    {field}: {rendered},")
        lines[-1] = lines[-1].rstrip(",")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    registry = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    attempt = now.isoformat(timespec="seconds").replace("+00:00", "Z")
    refreshed: list[dict[str, Any]] = []
    failures = 0

    for source in registry["products"]:
        item = dict(source)
        item["lastAttemptAt"] = attempt
        if source.get("sourceType") != "product":
            item["checkedAt"] = today
            item["refreshStatus"] = "manual"
            item["availability"] = f"Current {source['retailer']} range; category link refreshed"
            refreshed.append(item)
            continue

        try:
            metadata, final_url = fetch_metadata(source["href"])
            item["href"] = final_url
            if metadata.get("priceLabel"):
                item["priceLabel"] = metadata["priceLabel"]
            if metadata.get("imageUrl"):
                item["imageUrl"] = metadata["imageUrl"]
            if metadata.get("sourceProductCode") and not item.get("productCode"):
                item["productCode"] = metadata["sourceProductCode"]
            raw_availability = metadata.get("rawAvailability")
            item["availability"] = availability_label(raw_availability, source["retailer"]) or f"Product page reachable at {source['retailer']} when refreshed"
            item["checkedAt"] = today
            item["refreshStatus"] = "live"
            item.setdefault("imageAlt", f"{source['retailer']} {source['name']}")
            print(f"LIVE  {source['retailer']:<8} {source['id']}")
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, ValueError) as exc:
            failures += 1
            item["checkedAt"] = source.get("seedCheckedAt", "2026-09-02")
            item["refreshStatus"] = "stale"
            item["availability"] = f"Refresh unavailable; open {source['retailer']} to verify current stock"
            print(f"STALE {source['retailer']:<8} {source['id']}: {exc}", file=sys.stderr)
        refreshed.append(item)

    OUTPUT_PATH.write_text(emit_ts(refreshed), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)} with {len(refreshed)} records ({failures} stale).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
