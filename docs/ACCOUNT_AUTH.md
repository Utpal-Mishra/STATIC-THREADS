# Account sign-in

Priority 1 adds email magic-link sign-in using Supabase Auth, while leaving the public wardrobe demo available. Signing in does not yet enable personal wardrobe uploads or cloud sync (priorities 2–3).

## Deployment configuration

1. Use a Supabase project with Email authentication enabled. Configure production mail delivery and the desired sign-up/rate-limit settings.
2. Set GitHub Actions secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to that project's URL and **public anon/publishable key**. Never use a service-role or secret key in these variables.
3. In Supabase Auth URL Configuration, set the site URL to the deployed app and allow its exact account callback, including base path and trailing slash: `https://utpal-mishra.github.io/STATIC-THREADS/account/`. Add `http://localhost:3000/account/` only for local development as needed. Custom domains need their own exact callback.
4. Keep the magic-link email template using `{{ .ConfirmationURL }}`. The SDK supplies `emailRedirectTo`; do not replace the confirmation link with an unverified redirect.
5. Rebuild/deploy: Next.js embeds public configuration at build time. Missing or invalid configuration keeps the account page in demo mode.

## Behaviour

- One browser client uses PKCE. Request and open a link in the same browser/device; its stored code verifier is required. A missing verifier or expired/used link offers a new-link recovery path.
- The SDK exchanges the callback, persists sessions and refreshes tokens. Callback credentials and error parameters are removed from history. Callback processing also works when returning to the homepage.
- The provider verifies the user with Supabase `getUser()` before showing signed-in UI. Local session data is not sufficient authorization. Authentication events synchronize tabs and clear account UI after logout.
- Logout uses `scope: 'local'`: this browser's session only. A failed logout shows an error and does not falsely claim success. Other devices keep their sessions. Previously issued access JWTs remain valid until expiry; configure appropriate lifetimes.
- Friendly errors do not display raw server responses, tokens or callback messages. The resend countdown helps avoid accidental duplicate mail; Supabase enforces actual server rate limits.
- Static hosting has no private server routes. Any future private data access must enforce Supabase JWT/RLS/storage policies; hiding UI is not an access-control boundary. The current public demo contains no protected user data.
- Sessions persist in browser storage. Use trusted devices. Do not store user tokens in analytics, logs, URLs or public code. SDK cross-tab behavior is within one origin/project.

## Verification

CI builds an isolated test configuration and runs `node scripts/check_account_auth.cjs` against intercepted Supabase endpoints with the real SDK. It covers PKCE challenge/verifier/callback, session reload, multiple tabs, token refresh, rejected cached identity, logout and failure, invalid/expired links, credential cleanup, rate limits, and mobile/desktop bounds. Existing navigation/catalogue checks run against the unconfigured demo build.

Before calling production sign-in verified, use a real test account to request and receive mail, open the link, reload, navigate away/back, sign out and verify reload remains signed out. Verify a second account cannot read the first account's private records when those features are added. No production Supabase access, delivery or RLS test is implied by the intercepted-service tests.

References: [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [magic links](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [sign-out scope](https://supabase.com/docs/reference/javascript/auth-signout).
