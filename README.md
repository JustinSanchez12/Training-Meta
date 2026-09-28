# The Training Meta

A fitness RPG web application that gamifies working out by letting you build your character through exercise. Level up your stats from 1 to 99, just like in an MMO-RPG — but the character you're improving is *yourself*.

## Original Prompt

This is a workout application that is tailored to building your own personal workout, similar to how players in a MMO-RPG build up their character and level up their stats. The purpose of this application is to gamify working out and provide fun yet motivating app to promote a healthy lifestyle. In a MMO-RPG, players play and level up their stats (e.g. strength, defense, speed, sorcery, archery, etc.). We are taking that concept and transforming that into the physical world.

Players will level up their stats by exercising or eating healthy. The levels will be from 1-99. These are some examples of stats and how to level up:
- Stat: Bench Press (level 1) -> each rep/set is 1 EXP and a certain EXP will level up to level 2
- Stat: Mile Run (level 1) -> 1 Mile = 1 EXP
- Stat: Weight (level 1) -> 0.5-1lb = 1EXP

The player will achieve complete satisfactory because the character they play is themselves and improving their character means improving their life.

## Features

- **12 Trackable Stats** across Strength, Cardio, Flexibility, and Body categories
- **OSRS-inspired Stats Grid** — tap any stat to see level, XP, and progress
- **Workout Logging** — log sets, reps, weight, distance, or meals per exercise
- **Exponential XP Curve** — levels 1–99 with increasing XP requirements
- **XP Gain Animations** — visual feedback when you earn XP
- **Level Up Celebrations** — overlay animation when you level up a stat
- **Saved Progress** — stored in your browser for now (cloud sync via Supabase is planned)
- **Mobile-First Design** — optimized for phone-sized screens
- **RPG Themed UI** — dark theme with gold accents and medieval typography

## Tech Stack

- React 18 + TypeScript + Vite
- Zod for validation
- Vitest + React Testing Library (unit), Playwright (e2e)
- Hosting: Vercel · Data: localStorage for now, Supabase planned
- Google Fonts (MedievalSharp, Inter)

> The original vanilla-JS app lives in `legacy/` until the port is finished. Run it with `npm run legacy`.

## Getting Started

Requires Node 22.22+ or 24.15+ (see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173
```

| Task | Command |
|------|---------|
| Unit tests | `npm test` |
| E2E tests | `npx playwright install chromium` (once), then `npm run test:e2e` |
| Typecheck / lint | `npm run typecheck` · `npm run lint` |
| Production build | `npm run build` |

## Stats

| Stat | Category | XP Rule |
|------|----------|---------|
| Bench Press | Strength | sets × reps = XP |
| Squat | Strength | sets × reps = XP |
| Deadlift | Strength | sets × reps = XP |
| OHP | Strength | sets × reps = XP |
| Bicep Curl | Strength | sets × reps = XP |
| Pull Up | Strength | sets × reps = XP |
| Mile Run | Cardio | 1 mile = 10 XP |
| Cycling | Cardio | 1 mile = 5 XP |
| Swimming | Cardio | 1 lap = 5 XP |
| Yoga | Flexibility | 1 session = 10 XP |
| Weight | Body | 0.5–1 lb = 10 XP |
| Nutrition | Body | 1 meal = 5 XP |

Protohub fullscreen deployment: true
