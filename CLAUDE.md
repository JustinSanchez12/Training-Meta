# AI Coding Agent Configuration Synchronization

## Purpose

You are responsible for maintaining synchronized AI coding configurations across three tools:
- **Claude Code** (CLI-based, uses `CLAUDE.md` and `.claude/`)
- **Devmate VS Code** (IDE-based, uses `.llms/`)
- **Cursor** (IDE-based, uses `.cursor/`)

When the user creates, updates, or deletes rules, skills, or agents, you must ensure all three tools have the appropriate files in their native formats and locations.

---

## Repository Structure

This repository has two levels:

```
/                                    # Agent workspace (this level)
├── CLAUDE.md                        # THIS FILE - Agent operating instructions
├── README.md                        # Repository documentation
│
└── ape-rules/                       # Distributable package
    ├── CLAUDE.md                    # End-user project context + synced rules
    ├── .claude/
    │   ├── commands/                # Slash commands
    │   ├── skills/                  # Skills (PRIMARY - Cursor reads this too)
    │   └── agents/                  # Sub-agents
    ├── .llms/
    │   ├── rules/                   # Rules (YAML frontmatter required)
    │   ├── skills/                  # Skills (synced FROM .claude/skills/)
    │   ├── agents/                  # Sub-agents
    │   └── commands/                # Slash commands
    └── .cursor/
        └── rules/                   # Rules (no frontmatter)
```

**How it works:**
- You operate from the root level, maintaining files in `ape-rules/`
- Users download/clone `ape-rules/` and place it at their project root
- When unzipped, all config files are in the correct locations

> **Note:** `.cursorrules` is deprecated. Use `.cursor/rules/` instead.
> **Note:** Cursor auto-discovers skills from `.claude/skills/` — no separate sync needed.

---

## Synchronization Rules

All paths below are relative to `ape-rules/`.

### 1. Rules / Context Files

Rules provide persistent context and guidelines to the AI agent.

| Source of Truth | Claude Code | Devmate VS Code | Cursor |
|-----------------|-------------|-----------------|--------|
| `.llms/rules/<name>.md` | Copy content to `CLAUDE.md` (append as section) | Native ✓ | Copy to `.cursor/rules/<name>.md` |

**When creating or updating a rule:**

1. **Create/update the Devmate version first** (source of truth):
   ```
   ape-rules/.llms/rules/<rule-name>.md
   ```
   Format with required YAML frontmatter:
   ```markdown
   ---
   oncalls: ['<team-name>']
   applyto: '<glob-pattern>'
   applytouserprompt: '<regex-pattern>'
   ---

   # <Rule Title>
   <rule content>
   ```

2. **Sync to Claude Code** — Append/update section in `ape-rules/CLAUDE.md`:
   ```markdown
   ## <Rule Title>
   <rule content>
   ```
   > ⚠️ Claude Code does not use YAML frontmatter. Strip it when copying.

3. **Sync to Cursor** — Copy to `ape-rules/.cursor/rules/<rule-name>.md`:
   ```markdown
   # <Rule Title>
   <rule content>
   ```
   > ⚠️ Cursor does not use YAML frontmatter. Strip it when copying.

---

### 2. Skills

Skills provide on-demand domain knowledge that the AI loads when relevant.

| Source of Truth | Claude Code | Devmate VS Code | Cursor |
|-----------------|-------------|-----------------|--------|
| `.claude/skills/<name>/SKILL.md` | Native ✓ (PRIMARY) | Copy to `.llms/skills/<name>/SKILL.md` | ✅ Auto-discovers from `.claude/skills/` |

**When creating or updating a skill:**

1. **Create/update the Claude Code version first** (source of truth):
   ```
   ape-rules/.claude/skills/<skill-name>/SKILL.md
   ```
   Format:
   ```markdown
   ---
   description: <brief description>
   ---

   # <Skill Title>
   <skill content>
   ```

2. **Sync to Devmate** — Copy entire file to:
   ```
   ape-rules/.llms/skills/<skill-name>/SKILL.md
   ```
   > ✅ Devmate uses the same SKILL.md format.

3. **Cursor** — No action needed. Cursor auto-discovers skills from `.claude/skills/`.
   > ✅ Cursor reads from `.claude/skills/` directly (same as Claude Code).

---

### 3. Agents / Sub-agents

Agents are specialized AI personas with focused prompts and scopes.

| Source of Truth | Claude Code | Devmate VS Code | Cursor |
|-----------------|-------------|-----------------|--------|
| `.llms/agents/<name>.md` | Copy to `.claude/agents/<name>.md` | Native ✓ | Use `AGENTS.md` (different format) |

**When creating or updating an agent:**

1. **Create/update the Devmate version first** (source of truth):
   ```
   ape-rules/.llms/agents/<agent-name>.md
   ```
   Format with required frontmatter:
   ```markdown
   ---
   name: '<agent-name>'
   description: '<brief description>'
   tools: ['<tool1>', '<tool2>']  # Optional
   max-iterations: 20              # Optional
   ---

   # <Agent Title>
   <agent prompt>
   ```

2. **Sync to Claude Code** — Copy to `ape-rules/.claude/agents/<agent-name>.md`:
   Adjust frontmatter for Claude Code format if needed:
   ```markdown
   ---
   name: '<agent-name>'
   description: '<brief description>'
   ---

   # <Agent Title>
   <agent prompt>
   ```

3. **Cursor** — Optionally create/update `ape-rules/AGENTS.md`:
   ```markdown
   # Agent Instructions

   <simplified agent instructions for Cursor>
   ```
   > ℹ️ Cursor's `AGENTS.md` is a simpler format — plain markdown without frontmatter.

---

### 4. Commands

Commands are reusable prompt templates invoked with `/command-name`.

| Source of Truth | Claude Code | Devmate VS Code | Cursor |
|-----------------|-------------|-----------------|--------|
| `.llms/commands/<name>.md` | Copy to `.claude/commands/<name>.md` | Native ✓ | ❌ Not supported |

**When creating or updating a command:**

1. **Create/update the Devmate version first**:
   ```
   ape-rules/.llms/commands/<command-name>.md
   ```

2. **Sync to Claude Code** — Copy to `ape-rules/.claude/commands/<command-name>.md`

3. **Cursor** — Commands are not supported. No action needed.

---

## Synchronization Workflow

### On Any Configuration Change

Execute this checklist:

```
□ 1. Identify the type: rule | skill | agent | command
□ 2. Create/update the source of truth in ape-rules/
□ 3. Sync to other tool locations within ape-rules/
□ 4. Update ape-rules/CLAUDE.md if rules changed
□ 5. Verify all files are consistent
□ 6. Commit changes to git
```

### File Deletion

When removing a configuration:

1. **Delete from source of truth** (`.llms/` or `.claude/skills/`)
2. **Delete synced copies** (`.claude/` or `.llms/skills/`)
3. **Delete from `.cursor/rules/`** (if applicable)
4. **Update `ape-rules/CLAUDE.md`** (if rule was removed)

---

## New Capability Propagation Process

When adding ANY new capability (API endpoint, skill, agent, rule, or feature), follow this methodical thinking process:

### Step 1: Classify the Capability

Ask yourself:
- **Is it an API endpoint?** → Add to `ape-api-reference.md` rules file
- **Is it detailed implementation code?** → Create a skill in `.claude/skills/`
- **Is it a specialized workflow/persona?** → Create an agent in `.llms/agents/`
- **Is it a reusable prompt template?** → Create a command in `.llms/commands/`
- **Is it a general guideline/standard?** → Add to existing rules or create new rule

### Step 2: Determine Tool Support Matrix

For each capability type, understand what each tool supports:

| Capability | Devmate (.llms/) | Claude Code (.claude/) | Cursor (.cursor/) |
|------------|------------------|------------------------|-------------------|
| Rules | ✅ Native | ✅ CLAUDE.md section | ✅ .cursor/rules/ |
| Skills | ✅ Synced from .claude/ | ✅ Native (PRIMARY) | ✅ Auto-discovers .claude/skills/ |
| Agents | ✅ Native | ✅ .claude/agents/ | ⚠️ AGENTS.md (different format) |
| Commands | ✅ Native | ✅ .claude/commands/ | ❌ Not supported |

### Step 3: Execute Propagation Checklist

```
□ 1. Create/update in appropriate source of truth location
□ 2. For RULES:
    □ a. Create in ape-rules/.llms/rules/ with proper YAML frontmatter
    □ b. Strip YAML frontmatter and add/update section in ape-rules/CLAUDE.md
    □ c. Copy to ape-rules/.cursor/rules/<name>.md (without frontmatter)
□ 3. For SKILLS:
    □ a. Create in ape-rules/.claude/skills/<name>/SKILL.md (PRIMARY)
    □ b. Copy to ape-rules/.llms/skills/<name>/SKILL.md for Devmate
    □ c. (Cursor: auto-discovers from .claude/skills/ — no action needed)
□ 4. For AGENTS:
    □ a. Create in ape-rules/.llms/agents/ (source of truth)
    □ b. Copy to ape-rules/.claude/agents/<name>.md
    □ c. (Cursor: optionally update ape-rules/AGENTS.md with simplified instructions)
□ 5. For COMMANDS:
    □ a. Create in ape-rules/.llms/commands/ (source of truth)
    □ b. Copy to ape-rules/.claude/commands/<name>.md
    □ c. (Cursor: not supported)
□ 6. Verify all files are consistent
□ 7. Commit changes to git (see Git Commit Requirements)
```

### Step 4: Cross-Reference Check

Before finalizing, verify:
- If adding an API endpoint to rules, does it need a detailed skill?
- If adding a skill, is the API endpoint referenced in the condensed rules?
- Are there agents that should reference this new capability?
- Does the ape-rules/CLAUDE.md synced section need updating?

---

## Git Commit Requirements

**MANDATORY: Every completed task MUST trigger a git commit to the main branch.**

### Commit Workflow

After completing any task (creating files, updating configurations, adding capabilities):

1. **Stage the relevant files:**
   ```bash
   git add <specific-files>
   ```
   > Prefer adding specific files over `git add .` to avoid accidentally committing sensitive files.

2. **Create a descriptive commit:**
   ```bash
   git commit -m "$(cat <<'EOF'
   <type>: <brief description>

   <optional body with details>
   EOF
   )"
   ```

3. **Commit message format:**
   - **feat:** New feature or capability
   - **fix:** Bug fix or correction
   - **docs:** Documentation changes
   - **refactor:** Code restructuring
   - **chore:** Maintenance tasks

### Examples

| Task Completed | Commit Message |
|----------------|----------------|
| Added new skill | `feat: add ape-image-to-3d skill for 3D model generation` |
| Updated API reference | `docs: add Image-to-3D endpoint to API reference` |
| Fixed sync issue | `fix: correct YAML frontmatter stripping for Cursor rules` |
| Created new agent | `feat: add ape-debugger agent for logging assistance` |

### Commit Timing

- Commit immediately after task completion, before moving to next task
- Group related changes into a single commit (e.g., skill + API reference update)
- Never leave uncommitted changes when ending a session

### What to Commit

Always commit:
- `ape-rules/.llms/` changes
- `ape-rules/.claude/` changes
- `ape-rules/.cursor/rules/` changes
- `ape-rules/CLAUDE.md` updates
- Root `CLAUDE.md` if agent instructions changed

---

## Format Transformation Reference

### Devmate → Claude Code (Rules)

**Before (Devmate `ape-rules/.llms/rules/coding-standards.md`):**
```markdown
---
oncalls: ['my-team']
applytouser_prompt: 'code|review|standards'
---

# Coding Standards

Always use TypeScript strict mode. Never use any type.
```

**After (Claude Code `ape-rules/CLAUDE.md` section):**
```markdown
## Coding Standards

Always use TypeScript strict mode. Never use any type.
```

---

### Devmate → Cursor (Rules)

**Before (Devmate `ape-rules/.llms/rules/coding-standards.md`):**
```markdown
---
oncalls: ['my-team']
applytouser_prompt: 'code|review|standards'
---

# Coding Standards

Always use TypeScript strict mode. Never use any type.
```

**After (Cursor `ape-rules/.cursor/rules/coding-standards.md`):**
```markdown
# Coding Standards

Always use TypeScript strict mode. Never use any type.
```

---

## End-User CLAUDE.md Structure Template

Maintain this structure in `ape-rules/CLAUDE.md`:

```markdown
# <Project Name>

## Overview
<project description>

## Tech Stack
<technologies used>

## Key Commands

| Task | Command |
|------|---------|
| Build | `<build command>` |
| Test | `<test command>` |
| Lint | `<lint command>` |

<!-- BEGIN SYNCED RULES -->

## <Rule 1 Title>
<rule 1 content>

## <Rule 2 Title>
<rule 2 content>

<!-- END SYNCED RULES -->
```

> Use the `<!-- BEGIN SYNCED RULES -->` and `<!-- END SYNCED RULES -->` markers to identify the section that should be kept in sync with `.llms/rules/` files.

---

## Validation Checklist

Run this validation when requested or after major changes:

```
□ All ape-rules/.llms/rules/<name>.md files have valid YAML frontmatter with 'oncalls'
□ ape-rules/CLAUDE.md contains sections for each rule in .llms/rules/
□ ape-rules/.cursor/rules/ contains a file for each rule in .llms/rules/
□ All ape-rules/.claude/skills/<name>/SKILL.md files are mirrored in .llms/skills/
□ All ape-rules/.llms/agents/<name>.md files are mirrored in .claude/agents/
□ All ape-rules/.llms/commands/<name>.md files are mirrored in .claude/commands/
□ No YAML frontmatter appears in ape-rules/CLAUDE.md or .cursor/rules/ files
□ No .cursorrules file exists (deprecated)
```

---

## Quick Reference Commands

When the user says:

| User Request | Action |
|--------------|--------|
| "Add a rule for X" | Create in `ape-rules/.llms/rules/`, sync to `CLAUDE.md` and `.cursor/rules/` |
| "Add a skill for X" | Create in `ape-rules/.claude/skills/X/SKILL.md`, sync to `.llms/skills/` |
| "Add an agent for X" | Create in `ape-rules/.llms/agents/`, sync to `.claude/agents/` |
| "Update rule X" | Update in `ape-rules/.llms/rules/`, sync changes to other locations |
| "Update skill X" | Update in `ape-rules/.claude/skills/`, sync to `.llms/skills/` |
| "Delete rule X" | Remove from `.llms/rules/`, `CLAUDE.md`, and `.cursor/rules/` |
| "Delete skill X" | Remove from `.claude/skills/` and `.llms/skills/` |
| "Sync all configs" | Validate and synchronize all files across all tools |
| "Validate configs" | Run validation checklist and report discrepancies |

---

## Important Notes

1. **Source of Truth**:
   - **Rules**: `ape-rules/.llms/rules/` is the source of truth
   - **Skills**: `ape-rules/.claude/skills/` is the source of truth (Claude Code is primary)
   - **Agents/Commands**: `ape-rules/.llms/` is the source of truth

2. **YAML Frontmatter**: Only Devmate requires YAML frontmatter for rules. Always strip it when syncing to Claude Code or Cursor.

3. **Cursor Compatibility**:
   - `.cursorrules` is **deprecated** — use `.cursor/rules/` instead
   - Cursor auto-discovers skills from `.claude/skills/` (no manual sync needed)
   - For agents, use `AGENTS.md` (simpler format than `.llms/agents/`)

4. **End-User CLAUDE.md**: The file at `ape-rules/CLAUDE.md` serves dual purpose for end users — project context AND synced rules. Keep synced rules in a clearly marked section.

5. **File Naming**: Use consistent kebab-case naming across all tools (e.g., `coding-standards.md`).

6. **Atomic Updates**: When updating, modify all target files in a single operation to prevent drift.
