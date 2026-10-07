# theking._.edit

A real multilingual discovery platform for Apps, Websites, Tools, AI Tools, and Prompts.

## Architecture

- Frontend: semantic HTML + modern CSS + ES modules (no heavy JS framework required for runtime)
- Auth + Postgres + Storage: Supabase Free
- Serverless metadata extraction + `/robots.txt` + `/sitemap.xml`: Cloudflare Pages Functions
- Hosting: Cloudflare Pages Free
- Favorites: browser `localStorage`, no end-user account required
- Image optimization: browser-side resize + WebP conversion before upload

## Important security model

Admin access is NOT granted merely because a user signs in with Google. Supabase Postgres RLS checks the authenticated Google email against `public.admin_allowlist` server-side. The browser never receives a service-role key.

## Setup

1. Create a Supabase project on the Free plan.
2. Open SQL Editor and run `schema.sql`.
3. Before going live, replace `admin@example.com` in `schema.sql` with the exact Gmail address that should own the dashboard. You can also update `public.admin_allowlist` from the Supabase SQL editor later.
4. In Supabase Auth, enable Google provider. Create a Google OAuth Web client in Google Auth Platform and set the authorized redirect URI to the Supabase callback URL shown in the Supabase Google provider settings.
5. Deploy this repository to Cloudflare Pages. Build command is empty; output directory is `/`.
6. Add Cloudflare Pages environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SITE_URL` (your Cloudflare Pages URL)
7. For local development with Wrangler, create `.dev.vars` with the same values, and run `npm install` then `npm run dev`.

For simple local static development without Wrangler, copy `config.example.js` to `config.js` and put your public Supabase URL/key there. The OAuth redirect for that local mode must be added to your Supabase/Google configuration.

## Free-tier guardrails

This project does not include paid API integrations, card-gated services, pay-as-you-go APIs, or automatic upgrades. Metadata extraction is done by your Cloudflare Function. Image transformation is performed in the browser to avoid paid image-transformation features.

Supabase Free currently includes 500 MB database, 1 GB file storage, 50,000 MAU and 500,000 Edge Function invocations. Cloudflare Pages static assets are free/unlimited, while Pages Functions count toward the Workers Free allowance. Keep usage within the documented free quotas. Supabase Free projects may pause after 7 days of low activity; pausing does not upgrade the project to a paid plan.

## Production notes

- Do not expose a Supabase service-role key.
- Keep the admin allowlist minimal.
- Use HTTPS in production.
- Monitor Supabase and Cloudflare usage dashboards manually.
- `/api/extract` is intentionally best-effort: if a source blocks metadata fetching or uses heavy client-side rendering, the extracted fields can stay blank for manual editing.
- The platform does not download or host third-party applications.
