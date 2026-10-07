# Cost-control policy

This repository is intentionally built without paid APIs or mandatory subscriptions.

## Services used

- Cloudflare Pages/Functions: Free plan target. Static requests are free; Functions share the Workers Free daily request allowance.
- Supabase: Free plan target for Postgres, Auth, Storage and RLS.
- Google: Google OAuth is used only for admin identity via Supabase Auth.

## No automatic billing in the app

There is no application code that changes provider plans, adds payment methods, enables pay-as-you-go, or purchases domains.

Keep the provider accounts on Free plans. Do not enable paid add-ons. Monitor quotas manually.

## Safe degradation

When the free quota is exhausted, the expected behavior is an error/temporary unavailable state rather than a paid fallback. The site does not contain a paid API fallback.

For metadata extraction, failure simply leaves fields for manual entry.

For images, optimization is performed in-browser before upload; there is no dependency on paid image-transformation services.
