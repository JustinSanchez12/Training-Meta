---
name: refactor-workflow
description: Behaviour-preserving cleanup — remove duplication and dead code, simplify — through targets → branch → refactor → verify → review → PR. Use when /refactor is run or the owner asks to reduce code, dedupe or clean up without changing behaviour.
---

# Refactor Workflow

**The one rule: no behaviour change.** Users must not be able to tell anything changed. Stop and ask the owner when a step says **Pause**.

The goal is less duplication and dead code, not fewer lines at any cost. Don't compress readable code into dense one-liners, rename things for taste, or reformat whole files.

## 1. Targets
- Use the `planner` agent: "List refactor targets for: <request>. Read-only. For each target give the files, what is duplicated or dead, the proposed change, and the estimated lines removed. Flag anything that could change behaviour. Keep to about one day of work, largest wins first."
- Save the output to `docs/refactor.md` (overwrite it).
- **Pause:** show the target list and let the owner pick or trim it. Only continue with what they approve.

## 2. Branch
```bash
git switch main && git pull
git switch -c refactor/<slug>
```
If the working tree is dirty, **Pause** and ask.

## 3. Baseline
Before changing anything, record the starting point in `docs/refactor.md`:
- `npm run typecheck && npm run lint && npm test && npm run test:e2e`. It all must pass; if not, **Pause**, since you can't refactor on a red baseline.
- The pass counts and the line counts (`git ls-files 'src/*' | xargs cat | wc -l`, and the same for `tests/`).

## 4. Refactor
- One target per commit (`refactor: …`), running `npm test` after each. Revert a target that breaks tests rather than "fixing" the tests.
- **Tests are the safety net, so don't weaken them.**
  - Leave assertions and e2e specs unchanged.
  - You may update tests only when they reference an internal that no longer exists (e.g. an import path, or a helper that was merged). Say so in the commit message.
  - Deduplicating test setup code is a valid target of its own.
- Deleting code: prove it's unused first (`Grep` for the symbol, CSS class or route). For CSS, check class names built dynamically too (e.g. `` `xp-popup${…}` ``).
- Don't change dependencies, public behaviour, saved data shapes or storage keys.

## 5. Verify
- Run all four checks again. Unit and e2e pass counts must be **equal to or above** the baseline, and no e2e spec may be edited.
- If the UI was touched (components or CSS), check the affected screens in a real browser with the Playwright MCP at 390px width against the baseline.
- Add the after-refactor line counts to `docs/refactor.md`.

## 6. Review
- Use the `code-reviewer` agent with: "This is a behaviour-preserving refactor. Flag any behaviour change (rendering, focus, validation, storage, timing) as High. Also flag weakened or edited assertions."
- Fix Critical and High findings. One round is enough unless a fix is non-trivial.

## 7. PR
Same as the feature workflow (`gh pr create --base main`, using the PR template, never merging). The PR body leads with:
- "No behaviour change" and how that was verified (test counts before and after, browser check).
- A table of the targets with the lines removed per target, and the totals for src/, CSS and tests.
