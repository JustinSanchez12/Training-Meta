# The Training Meta

A fitness RPG: players level up real-life "stats" (1–99) by logging workouts and healthy habits.
See `README.md` for the game design and XP rules.

## Stack

| Layer | Choice |
|-------|--------|
| UI | React 18 + TypeScript + Vite |
| Validation | Zod (schemas are the source of truth for types: `z.infer<typeof X>`) |
| Data + auth | Supabase (Postgres, Auth, Row Level Security) |
| Hosting | Vercel (static build + serverless functions in `api/`) |
| Unit tests | Vitest + React Testing Library |
| E2E tests | Playwright |
| Node | 20 LTS or newer (see `.nvmrc`) |

> **Migration in progress:** the original vanilla-JS app is in `legacy/` (run it with `npm run legacy`).
> Screens are being ported slice by slice. See "Later slices" in `docs/spec.md` or the latest spec PR.
> Don't add features to `legacy/`. It gets deleted when the port is done.

Optional AI layer: APE (`docs/ape-api.md`). Only call it from `api/`, never from the browser.

## Key commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm test` (watch: `npm run test:watch`) |
| E2E tests | `npm run test:e2e` (first time: `npx playwright install chromium`) |
| New DB migration | `npx supabase migration new <name>` |
| Apply migrations locally | `npx supabase db reset` (needs Docker) |

## Folder conventions

```
src/
  app/             routing, providers, layout
  features/<name>/ one folder per feature: components, hooks, schema.ts, api.ts
  components/      shared presentational components only
  lib/             supabase client, env.ts (Zod-parsed env), utilities
api/               Vercel serverless functions (server-only secrets live here)
supabase/migrations/  SQL migrations, never edit one that has been applied
tests/unit/        mirrors src/ paths: src/lib/xp.ts -> tests/unit/lib/xp.test.ts
tests/e2e/         one spec per feature: <feature>.spec.ts
docs/              spec.md (current feature), decisions, reference
```

- Feature code stays inside `src/features/<name>/`. Promote something to `components/` or `lib/` only when a second feature needs it.
- Files: `PascalCase.tsx` for components, `camelCase.ts` for everything else.

## Rules

1. **Validate all input with Zod.** This covers form input, URL params, `localStorage`, API request bodies in `api/`, and Supabase rows at the boundary. Use `safeParse` and handle the error; don't use `as` casts on external data.
2. **Never commit secrets.** Real values go only in `.env.local` (gitignored) and in Vercel/Supabase dashboards. Update `.env.example` whenever you add a variable. Only `VITE_`-prefixed vars reach the browser, so never prefix a secret with `VITE_`.
3. **Every feature needs an e2e test.** It needs at least one Playwright spec covering its happy path, plus unit tests for its logic (see the `testing` skill). A PR without one isn't done.
4. **Row Level Security on every table.** Enable RLS in the same migration that creates the table.
5. **Strict TypeScript.** No `any` and no `@ts-ignore` without a comment explaining why.
6. **Small PRs.** One feature per branch `feat/<slug>`, off `main`, PR back to `main`. The owner reviews and merges; agents never merge or push to `main`.

## Workflow

- New feature: `/new-feature <idea>` runs the `feature-workflow` skill (spec → branch → build → test → review → PR).
- Specs live in `docs/spec.md`. Its task checklist replaces the old `tasks.md`, which is now in `docs/archive/`.
- Agents: `planner` (writes specs), `code-reviewer` (read-only review), `qa-tester` (writes and runs tests).
- Before deploying, use the `deploy-checklist` skill.
- Use the Context7 MCP for current library docs and the Playwright MCP to check UI in a real browser.

## Legacy APE files

`.cursor/`, `.llms/`, the `ape-*` skills and the `ape-scaffolder`/`ape-debugger` agents come from the
original APE template. They target vanilla JS. Only use them when working with APE APIs.
