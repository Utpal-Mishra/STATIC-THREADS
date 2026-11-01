# Rush Hour — Priority 10

Open **Plan an outfit → Rush Hour**. No complete digital wardrobe is required. This mode plans from the selected clothing candidates in the current session, never from the demo catalogue or silently loaded personal inventory.

## Session flow

1. Photograph clothing with the mobile camera picker or upload gallery images. Mobile web capture uses `capture="environment"`; a native app and physical camera behaviour are not claimed as tested. Desktop browsers may show an ordinary file chooser.
2. Add up to three JPEG/PNG/WebP photos (12 MB each), with up to 20 draft pieces across the session. Reuse Priority 8 preparation, resizing, metadata stripping and local source hashing. Exact repeated source files are skipped.
3. When Priority 8's vision service is configured, sign in, explicitly consent and press **Identify photo N**. Identification replaces that photo's draft candidates. Images are not sent merely by choosing files. The shared three-recognition-request daily allowance also covers full-outfit import; provider failures consume allowance. Existing in-flight provider work may still incur usage after cancellation.
4. Without that service, add pieces manually. Review names, broad categories, colours, visible crops and style labels, include/exclude alternatives, then explicitly confirm the selected pieces. Dresses, jumpsuits, sets and free-form garment names support alternatives to top + bottom. Crops are rectangles, not reconstructed garments or background-free cutouts.
5. Describe the occasion. The local planner asks for dress code, setting and weather as needed, respects preferences and named anchors, and asks for missing essentials such as footwear or an outer layer. It uses only confirmed session candidates. Unknown style is not assumed formal; users must review suitability labels before formal/black-tie/active suggestions. Warmth, water resistance, fit and venue acceptance remain user checks.
6. Compare up to two options. Each option shows the supplied garment crops, not an unrelated catalogue mannequin or a claimed virtual try-on. “Another option” explores remaining confirmed combinations. “New plan” resets the brief and options while retaining photos/pieces. Clearing, closing, switching modes or changing authenticated account removes the transient Rush Hour state.

Photos, crops, conversation, brief and session combinations are not persisted in localStorage or automatically uploaded. Browser in-memory state is not a promise of forensic erasure or zero provider retention.

## Explicit optional private saving

After review/confirmation, a signed-in user can press **Save reviewed pieces to wardrobe**. This reuses Priority 8's owner-scoped, atomic, retry-safe metadata RPC per source photo. Descriptions persist; photos and Rush Hour style labels do not. No private outfit/wear event is invented for unsaved session options. Account configuration and the Priority 8 migration must be active for saving.

A multi-photo save consists of one atomic metadata import per photo. If a later photo fails, the UI reports partial progress and a retry skips groups already confirmed in this session. Stable import keys protect retries even after ambiguous network failures. Recognition and metadata writes carry the exact session token verified at the start of the operation, so a concurrent account switch cannot redirect a prior user’s photo or metadata into the new account. Saving all photos is not a single global database transaction. Clearing local state does not delete previously saved private records.

Exact duplicate descriptions/crops from the same source are combined. This does not establish garment identity across different or re-encoded photos; users must review possible duplicates. The mode does not assert ownership until the user explicitly chooses to add reviewed pieces to their private wardrobe.

## Activation and acceptance

Automatic identification reuses the OFF-by-default `NEXT_PUBLIC_OUTFIT_IMPORT_ENABLED` flag, `outfit-import` Edge Function, verified Supabase auth, provider model/key and server-side quota from [Priority 8 setup](OUTFIT_PHOTO_IMPORT.md). No new provider key, paid call, production backend activation or photo persistence is introduced by this change.

Local manual identification/planning is usable without an account. Actual recognition quality, physical camera behaviour, model costs and production private saves still need real configuration and acceptance. Test varied user-labelled clothing, layers, lighting and culturally specific garment names; no fixed accuracy claim is made.

## Verification

`npm run test:rush-hour` exercises grounded combinations, missing essentials, weather/layers, one-piece/sets, user-confirmed formality, exclusions/anchors, alternatives and exact duplicate handling. `node scripts/check_rush_hour.cjs` exercises capture/gallery controls, photo limits/dedup, manual review, missing footwear, options/comparison, preferences, responsive dialog bounds and mode/close clearing. `TEST_RUSH=1` against the isolated fake-auth build adds intercepted recognition consent, partial-save/retry and stale-response clearing. Public catalogue art is a contract fixture, not a model-quality benchmark. Existing chatbot, import, account, image and navigation checks remain in CI.
