---
name: feature-workflow
description: End-to-end workflow for building one feature — spec, branch, build, test, review, PR. Use when starting any new feature or when /new-feature is run.
---

# Feature Workflow

Run these steps in order. Stop and ask the owner when a step says **Pause**.

## 1. Spec
- Use the `planner` agent with the feature idea. Save its output to `docs/spec.md` (overwrite it).
- **Pause** if the spec has open questions. Otherwise show the Goal and Tasks and continue.

## 2. Branch
```bash
git switch main && git pull
git switch -c feat/<slug>        # slug from the spec's "Branch:" line
```
If the working tree is dirty, **Pause** and ask. Never stash or discard the owner's changes.

## 3. Build
- Work through the spec's Tasks, ticking `- [x]` in `docs/spec.md` as you go.
- Follow `CLAUDE.md`: Zod at every boundary, feature code in `src/features/<name>/`, RLS on new tables.
- New env var? Add it to `.env.example` in the same commit.
- Commit per task with Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`).

## 4. Test
- Use the `qa-tester` agent. All of `npm run typecheck`, `npm run lint`, `npm test` and `npm run test:e2e` must pass.
- If a failure is in app code, fix it and re-run. After 3 failed attempts, **Pause**.

## 5. Review
- Use the `code-reviewer` agent. Fix all 🔴 Critical and 🟠 High findings, then re-run it.
- Medium/Low findings can be fixed or listed in the PR under "Known follow-ups".

## 6. PR
```bash
git push -u origin feat/<slug>
gh pr create --base main --title "feat: <short title>" --body-file <tmp-body.md>
```
- Fill the body using `.github/pull_request_template.md` (write it to a temp file first).
- Keep it scannable: plain-language summary first, then a table of changed files, then how to test.
  No walls of text and no pasted diffs.
- If `gh` isn't installed, push and give the owner the URL:
  `https://github.com/JustinSanchez12/Training-Meta/compare/main...feat/<slug>?expand=1`
- **Never merge.** Hand back the PR link and a two-line summary.
