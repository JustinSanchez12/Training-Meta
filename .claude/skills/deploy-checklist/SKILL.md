---
name: deploy-checklist
description: Pre-deploy checklist for Vercel + Supabase — env vars, database migrations and smoke tests. Use before merging to main or promoting a deploy to production.
---

# Deploy Checklist

Go through each item and report ✅ / ❌. Stop on any ❌.

## 1. Code is green
- [ ] `npm run typecheck && npm run lint && npm test && npm run build` pass locally.
- [ ] `npm run test:e2e` passes.
- [ ] The PR is approved by the owner. Agents never merge.

## 2. Environment variables
- [ ] Every variable in `.env.example` is set in Vercel → Project → Settings → Environment Variables
      for **Production** and **Preview**. Compare with `npx vercel env ls`.
- [ ] Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `APE_API_KEY`) have **no** `VITE_` prefix.
- [ ] `git grep -nE "(sk_|service_role|eyJhbGci)"` finds nothing committed.

## 3. Database migrations
- [ ] New files in `supabase/migrations/` apply cleanly on a fresh DB: `npx supabase db reset`.
- [ ] Each new table has `enable row level security` and policies.
- [ ] Migrations are backward compatible with the currently deployed app (add columns first, remove them in a later deploy).
- [ ] Preview what will run: `npx supabase db push --dry-run`.
- [ ] Apply to production **before** the app deploy: `npx supabase db push`. **Ask the owner first.**

## 4. Deploy
- Merging to `main` triggers a Vercel production deploy. PRs get preview URLs automatically.

## 5. Smoke test (production URL, about 2 minutes)
- [ ] The app loads with no console errors.
- [ ] Sign in works.
- [ ] Log one workout → XP updates → reload → progress is still there.
- [ ] The feature just shipped works on its happy path.
- [ ] You can also run the e2e suite against production (read-only specs only):
      `E2E_BASE_URL=https://<prod-url> npx playwright test --grep @smoke`

## Rollback
- App: Vercel → Deployments → previous deploy → **Promote to Production**.
- DB: write a new forward migration that reverts the change. Never edit an applied migration.
