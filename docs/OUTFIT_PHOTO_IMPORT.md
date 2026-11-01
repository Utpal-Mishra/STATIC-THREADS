# Full-outfit photo import — Priority 8

Entry: **My closet → Import outfit photo**, or `/STATIC-THREADS/import/` on Pages.

## Available without a recognition provider

Choose or drop a JPEG/PNG/WebP up to 12 MB. The browser checks decoded dimensions (40 MP / 12,000px limit), resizes to 1,600px maximum edge and re-encodes JPEG to strip file metadata. The original file is hashed locally for retry-safe keys. Photos, prepared images and crop previews stay in component memory; they are not written to localStorage, a public catalogue or cloud photo storage. Browser memory/HTTP processing is not a claim of forensic secure erasure.

Add visible pieces manually, supply your preferred garment names, choose a broad category, adjust normalized crop coordinates and exclude unwanted candidates. Dresses, jumpsuits, sets and free-form garment descriptions support alternatives to top/bottom assumptions. “Other” preserves a description without forcing a category; the outfit planner may not treat it as a complete garment role until corrected. Crops are rectangular visible regions, not segmentation masks, garment reconstruction, fit estimation or exact brand identification.

An explicit review checkbox gates session confirmation and account saving. Source changes/clear/navigation/account changes remove local drafts. Previously imported descriptions can be reloaded from a configured private account. No source photo is persisted by this feature; private cloud photo storage remains separate launch work.

## Private wardrobe metadata saving

Apply the existing `supabase/schema.sql` and migrations, then `20261101220000_outfit_photo_import.sql`. The `import_outfit_items` RPC uses the authenticated caller's identity and existing row-level ownership rules. It validates the whole batch before an atomic insertion and uses the existing `(user_id, client_item_id)` uniqueness constraint to reuse identical reviewed entries on retry. It accepts no image payload and sets no public image URL.

The stable key covers exact source-file hash, reviewed name/category/colour and crop. This prevents the same reviewed record from being inserted twice; it cannot prove garment identity across re-encoded photos, different photos or changed descriptions. The UI flags matching imported name/category/colour records among the latest 100 loaded and initially excludes those matches after detection. Users must review possible duplicates; fuzzy garment identity is not claimed.

Confirmed private items enter `wardrobe_items` with available status. Reopen the chatbot and choose the private wardrobe to plan with them. The public sample rail/catalogue is preserved. Import review is not Rush Hour; Priority 10 remains separate.

## Automatic recognition — activation required

The supplied `outfit-import` Supabase Edge Function is not deployed or invoked with real provider credentials by this code change. Automatic recognition is OFF by default; there is no fake local detection fallback.

1. Configure and verify real Supabase authentication and wardrobe RLS.
2. Apply the import migration. It adds server-only allowances of **three recognition requests per user per UTC day**; failed provider calls still consume allowance. Client roles cannot invoke the quota function or read usage records.
3. Deploy `supabase/functions/outfit-import/`. Verify gateway/JWT compatibility with a real account; the handler verifies every bearer token against Supabase Auth independently.
4. Set server secrets `OPENAI_API_KEY`, `OUTFIT_VISION_MODEL` (supports image input and strict structured JSON), `OUTFIT_ALLOWED_ORIGINS=https://utpal-mishra.github.io`. The function uses Edge-provided Supabase URL, anon and service-role keys. Never put provider/service keys in NEXT_PUBLIC variables or the repository.
5. Set provider spending limits and review provider photo processing/retention terms. The function requests `store:false`, but this is not a guarantee of zero provider retention.
6. Test real varied garments, layers, lighting, one-piece outfits and user-labelled cultural clothing examples. Record category/crop correction rate, missed items, duplicate rate, latency and cost. Real model quality and physical-device acceptance are not established by contract tests.
7. Enable repository Actions variable `NEXT_PUBLIC_OUTFIT_IMPORT_ENABLED=true` and redeploy only after real acceptance. Users must explicitly consent before their prepared photo is sent. File name, account IDs, email and full chat are not forwarded to the model provider.

The handler enforces exact origins, POST, bounded streaming request size, consent, inline JPEG geometry limits, verified identity and quota before any paid call. It does not fetch arbitrary photo URLs. Responses are bounded and validated; invalid or out-of-bounds candidates fail safely. Image text is treated as untrusted input; the model is instructed to avoid identity/demographic/cultural/religious inference, infer no brands or hidden garments and preserve uncertainty. These instructions do not establish model accuracy.

## Verification

`npm run test:outfit-import` exercises pure candidate/duplicate rules and the handler with simulated provider/auth/quota responses. `node scripts/check_outfit_import.cjs` covers local review and crop interactions; `TEST_IMPORT=1` against the isolated fake-auth build covers recognition, saving/retry/reload contracts. The PostgreSQL CI job runs `scripts/test_outfit_import.sql` after the existing isolation harness to verify real database permissions, idempotency, atomic validation and quota limits. Test fixtures are public catalogue art, not personal user photos or model-quality benchmarks.

Primary API reference: [OpenAI images and vision](https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses).
