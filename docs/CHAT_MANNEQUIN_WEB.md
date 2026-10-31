# Mannequin previews in outfit chat

## Catalogue previews — available immediately

Every chatbot option checks for an exact garment-ID combination in the existing catalogue lookbook registry. Matching options display Walking, Sitting, Front, Back and Side thumbnails, a selected pose, and a full-board toggle. Existing approved image bytes, pose coordinates and styling outside chat are preserved.

Catalogue boards are illustrative style previews. Their palette/accessories may differ from the owned item descriptions; this is stated beside the gallery. The chat never labels these as exact product photography or body/fit simulation. Missing or broken images do not fall back to an unrelated outfit.

Suitable illustrated catalogue combinations receive a ranking preference only when their actual item IDs satisfy the same availability, dress-code, weather, anchor and exclusion checks as other combinations. Personal inventory is not matched to public images by name alone.

## Missing catalogue preview

A missing preview offers **Suggest top 5 outfits from the web**. This is also offered when the wardrobe cannot produce a complete suitable outfit. The next step explicitly confirms external search and generation, disclosing that event/garment descriptions are sent to the provider and that usage can incur charges. No photos, full chat, account details or tokens are sent to the model provider.

When configured and signed in, the service finds up to five distinct sourced outfit ideas. Each result has garment descriptions, source links and the date of automated lookup. These are inspiration, not owned items or verified stock/price claims. It then generates one five-view mannequin interpretation per result, with two requests at a time. Source validation may yield fewer than five results. A generated board is an interpretation of descriptions, not an exact copy of a retailer image or virtual try-on. Users can inspect the full board for garment fidelity and pose layout.

Loading, per-image failure/retry, invalid responses, rate limits and cancellation are explicit. Closing chat, resetting the plan or switching accounts/source removes results and stops further queued work. Already-started provider work may still incur usage.

## Production activation — currently pending

The GitHub Pages frontend cannot hold provider secrets or execute paid background services. The new server implementation is supplied in `supabase/functions/outfit-visuals/`; it has not been deployed to a real Supabase account or called with real provider credentials by this change.

1. Finish real Supabase authentication configuration and verify a real account.
2. Apply `supabase/migrations/20261031160000_outfit_visual_quota.sql` to the project using the SQL editor/migration process. It adds server-only daily allowances: 5 searches and 25 generated boards per user per UTC day. Provider failures consume allowance too. The function uses a locked atomic upsert; anon/authenticated clients cannot read usage or invoke it. Existing garment/event ownership policies remain intact.
3. Deploy the `outfit-visuals` Edge Function using the Supabase CLI. Its handler verifies every access token against Supabase Auth, regardless of gateway settings. Check the project's gateway/JWT configuration with a real access token before enabling the frontend.
4. Configure **server-side only**: `OPENAI_API_KEY`, `OUTFIT_SEARCH_MODEL` (supports Responses web_search and strict JSON outputs), `OUTFIT_IMAGE_MODEL` (supports PNG output at 1536x1024), `OUTFIT_VISUAL_SIGNING_SECRET` (random, at least 32 characters), and `OUTFIT_ALLOWED_ORIGINS=https://utpal-mishra.github.io`. The Edge Function also uses its server `SUPABASE_URL`, public anon key and service-role key. Never put provider/service/signing secrets in NEXT_PUBLIC variables or source control.
5. Set provider project spending limits and verify account/model access. There is no automatic provider/model substitution and no claim that generation is free.
6. Test source-grounded search, consent, JWT checks, quotas, five actual pose views and garment fidelity with a real account. Contract/fixture tests are not evidence of real model quality.
7. Only then set GitHub repository **Actions variable** `NEXT_PUBLIC_OUTFIT_VISUALS_ENABLED=true` and redeploy Pages. It is off by default. Missing server configuration keeps requests unavailable; catalogue galleries still work.

For local contract/browser tests only, a fake auth URL/public key and the flag enable intercepted test endpoints. They are not production credentials or a live search service.

## Server boundaries

- CORS allowlist, POST-only requests, 16KB request limit, explicit consent and verified identity before work.
- Minimal brief/garment fields; no arbitrary model, URL-fetch destination, prompt forwarding or image upload from the client.
- Search uses source URLs returned by the search tool/citations. Unsupported source links and descriptions that violate explicit exclusion terms are discarded.
- Render requests need an expiring HMAC-signed ticket bound to the verified user and the sourced outfit. Client-altered descriptions or another user's ticket cannot trigger rendering.
- Durable database allowances are consumed before each paid request. Secrets and raw provider errors are never returned.
- Generated PNGs are checked for signature, IHDR/IEND, expected dimensions and crop bounds. The app also handles image decode failures. File geometry cannot establish visual fidelity; inspect actual model outputs before production acceptance.
- Results/images stay in the open chat session. Static Threads does not persist them as wardrobe items or public image assets. Provider processing/retention is governed by the configured provider's settings and terms.

## Validation

`npm run test:outfit-visuals` checks the server handler with simulated provider responses: cited five-result search, owner/expiry/tamper tickets, image geometry/truncation, auth/consent/origin/configuration, quotas before paid calls and exclusion filtering. CI's PostgreSQL job checks actual server-only quota permissions and limits. `node scripts/check_chat_visuals.cjs` exercises catalogue galleries and the unconfigured state; with the isolated build, `TEST_WEB=1 node scripts/check_chat_visuals.cjs` tests confirmation, five sourced results, five per-result image boards, reset and failures. Existing chat/account/navigation tests remain in place.

Official API references: [Web search](https://developers.openai.com/api/docs/guides/tools-web-search), [Image generation](https://developers.openai.com/api/docs/guides/image-generation).
