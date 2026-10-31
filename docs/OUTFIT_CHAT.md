# Outfit planning chatbot — Priority 9

Open **Plan an outfit** at the bottom-right of the home or Account page (above the mobile dock). The existing navigation, catalogue, images, rail and recommendations remain unchanged.

The current planner is a local, deterministic conversational feature, not a connected language-model service. There is no API key, paid model usage, external prompt transmission, image analysis or live weather lookup. It supports short event/dress-code/setting/weather replies and explicit preferences; unsupported conversation receives guidance instead of a fabricated answer.

## Workflow

1. Ask for an event, e.g. “Plan my outfit for dinner.”
2. Provide the dress code, indoors/outdoors and outdoor weather where relevant.
3. Optionally say “no black”, “no shorts”, “prefer blue”, “comfortable”, “covered”, or name an exact wardrobe item to build around. “Clear preferences” removes these preferences; “New plan” starts over.
4. Compare up to three available-item combinations, their explanations and suitability caveats. “Another option” excludes the already presented combinations for this brief.
5. Save an outfit or explicitly record wearing it.

Only items with status `available` can be recommended. Formal/black-tie/active/smart-casual briefs require corresponding item occasion metadata. The planner reports missing pieces instead of substituting unsuitable clothing. Its role mapping supports dresses, jumpsuits, coordinated sets, skirts, tops/bottoms, outerwear and footwear. User-named cultural garments retain their supplied category; no gender, religion or culture is inferred. Coverage, fit, warmth, waterproofing and venue acceptance cannot be verified from the available metadata.

## Demo versus personal wardrobe

- Signed-out or unconfigured accounts can use the explicitly labelled **Demo wardrobe** immediately. Demo save/wear records store only demo item signatures/action dates on this browser under a versioned key. Saved demo combinations can be reopened inside the chat. Blocked storage produces a failure message.
- Signed-in accounts default to **Your private wardrobe**. The client verifies identity and reads up to 500 records from `wardrobe_items` scoped to that user's ID. Empty data, an API/schema failure or owner mismatch never silently falls back to demo inventory. The user can deliberately select “Try demo wardrobe”.
- Each private save/wear action rechecks current identity, item ownership and availability, then writes an explicit `saved`/`worn` record to `outfit_events`. UI success appears only after the request succeeds. These actions are groundwork for the broader saved-outfit/history feature; this does not increment `wear_count` or implement a full history dashboard.
- Deploy `supabase/schema.sql` for a fresh project. For an existing project, apply `supabase/migrations/20261031_outfit_event_item_ownership.sql` before enabling personal chat. The restrictive policy rejects empty, missing or other-user garment references and enforces an upper bound of 20 items per event. Existing own-row policies remain in place. Client checks complement database enforcement; do not disable RLS. No database changes are applied automatically by this feature.
- Closing chat clears its conversation. Switching source or account resets the chat and private data state. Requests are cancelled/ignored on unmount. Chats are not written to browser/cloud history, analytics or logs. Only explicit save/wear actions persist.

## Verification

`npm run test:planner` runs deterministic inventory/constraint tests. `node scripts/check_outfit_chat.cjs` checks the demo conversation and UI. With the isolated auth build, `TEST_PRIVATE=1 node scripts/check_outfit_chat.cjs` adds intercepted-service tests for private inventory, empty/error states, save/wear payloads and account isolation. A separate PostgreSQL CI test checks actual RLS enforcement with two synthetic users, including insert/update bypass attempts and repeated migration application. These are isolated tests, not proof of production Supabase setup, RLS configuration or model/style quality. Real phones, owner acceptance and a real two-account RLS test remain production acceptance gates.

Future model-based conversation can use this planner's inventory/constraint boundary through an authenticated backend. Never embed provider secrets in the static application or send personal photos/prompts externally without a defined integration and user controls. Photo import and Rush Hour remain separate priorities.
