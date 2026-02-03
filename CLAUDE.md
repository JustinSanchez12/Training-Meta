# AI Coding Agent Configuration Synchronization

## Purpose

You are responsible for maintaining synchronized AI coding configurations across three tools:
- **Claude Code** (CLI-based, uses `CLAUDE.md` and `~/.claude/`)
- **Devmate VS Code** (IDE-based, uses `.llms/`)
- **Cursor** (IDE-based, uses `.cursor/`)

When the user creates, updates, or deletes rules, skills, or agents, you must ensure all three tools have the appropriate files in their native formats and locations.

---

## Directory Structure to Maintain

```
/
├── CLAUDE.md                     # Claude Code: project context
├── .claude/
│   ├── commands/                 # Claude Code: slash commands
│   │   └── *.md
│   └── agents/                   # Claude Code: sub-agents
│       └── *.md
├── .llms/
│   ├── rules/                    # Devmate: rules (YAML frontmatter required)
│   │   └── *.md
│   ├── skills/                   # Devmate: skills
│   │   └── <skill-name>/
│   │       └── SKILL.md
│   ├── agents/                   # Devmate: sub-agents
│   │   └── *.md
│   └── commands/                 # Devmate: slash commands
│       └── *.md
└── .cursor/
    └── rules/                    # Cursor: rules
        └── *.md
```

---

## Synchronization Rules

### 1. Rules / Context Files

Rules provide persistent context and guidelines to the AI agent.

| Source of Truth | Claude Code | Devmate VS Code | Cursor |
|-----------------|-------------|-----------------|--------|
| `.llms/rules/<name>.md` | Copy content to `CLAUDE.md` (append as section) | Native ✓ | Copy to `.cursor/rules/<name>.md` |

**When creating or updating a rule:**

1. **Create/update the Devmate version first** (source of truth):
   ```
   .llms/rules/<rule-name>.md
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

2. **Sync to Claude Code** — Append/update section in `CLAUDE.md`:
   ```markdown
   ## <Rule Title>
   <rule content>
   ```
   > ⚠️ Claude Code does not use YAML frontmatter. Strip it when copying.

3. **Sync to Cursor** — Copy to `.cursor/rules/<rule-name>.md`:
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
| `.llms/skills/<name>/SKILL.md` | Copy to `.claude/skills/<name>/SKILL.md` | Native ✓ | ❌ Not supported |

**When creating or updating a skill:**

1. **Create/update the Devmate version first** (source of truth):
   ```
   .llms/skills/<skill-name>/SKILL.md
   ```
   Format:
   ```markdown
   ---
   description: <brief description>
   ---

   # <Skill Title>
   <skill content>
   ```

2. **Sync to Claude Code** — Copy entire file to:
   ```
   .claude/skills/<skill-name>/SKILL.md
   ```
   > ✅ Claude Code uses the same SKILL.md format.

3. **Cursor** — Skills are not supported. No action needed.
   > ℹ️ If critical skill content must be available in Cursor, consider adding key points to a Cursor rule file instead.

---

### 3. Agents / Sub-agents

Agents are specialized AI personas with focused prompts and scopes.

| Source of Truth | Claude Code | Devmate VS Code | Cursor |
|-----------------|-------------|-----------------|--------|
| `.llms/agents/<name>.md` | Copy to `.claude/agents/<name>.md` | Native ✓ | ❌ Not supported |

**When creating or updating an agent:**

1. **Create/update the Devmate version first** (source of truth):
   ```
   .llms/agents/<agent-name>.md
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

2. **Sync to Claude Code** — Copy to `.claude/agents/<agent-name>.md`:
   Adjust frontmatter for Claude Code format if needed:
   ```markdown
   ---
   name: '<agent-name>'
   description: '<brief description>'
   ---

   # <Agent Title>
   <agent prompt>
   ```

3. **Cursor** — Agents are not supported. No action needed.

---

### 4. Commands

Commands are reusable prompt templates invoked with `/command-name`.

| Source of Truth | Claude Code | Devmate VS Code | Cursor |
|-----------------|-------------|-----------------|--------|
| `.llms/commands/<name>.md` | Copy to `.claude/commands/<name>.md` | Native ✓ | ❌ Not supported |

**When creating or updating a command:**

1. **Create/update the Devmate version first**:
   ```
   .llms/commands/<command-name>.md
   ```

2. **Sync to Claude Code** — Copy to `.claude/commands/<command-name>.md`

3. **Cursor** — Commands are not supported. No action needed.

---

## Synchronization Workflow

### On Any Configuration Change

Execute this checklist:

```
□ 1. Identify the type: rule | skill | agent | command
□ 2. Create/update the source of truth in .llms/
□ 3. Sync to Claude Code locations (.claude/ or CLAUDE.md)
□ 4. Sync to Cursor locations (.cursor/rules/) if applicable
□ 5. Verify all files are consistent
```

### File Deletion

When removing a configuration:

1. **Delete from `.llms/`** (source of truth)
2. **Delete from `.claude/`** (corresponding file or CLAUDE.md section)
3. **Delete from `.cursor/rules/`** (if applicable)

---

## New Capability Propagation Process

When adding ANY new capability (API endpoint, skill, agent, rule, or feature), follow this methodical thinking process:

### Step 1: Classify the Capability

Ask yourself:
- **Is it an API endpoint?** → Add to `ape-api-reference.md` rules file
- **Is it detailed implementation code?** → Create a skill in `.llms/skills/`
- **Is it a specialized workflow/persona?** → Create an agent in `.llms/agents/`
- **Is it a reusable prompt template?** → Create a command in `.llms/commands/`
- **Is it a general guideline/standard?** → Add to existing rules or create new rule

### Step 2: Determine Tool Support Matrix

For each capability type, understand what each tool supports:

| Capability | Devmate (.llms/) | Claude Code (.claude/) | Cursor (.cursor/) |
|------------|------------------|------------------------|-------------------|
| Rules | ✅ Native | ✅ CLAUDE.md section | ✅ .cursor/rules/ |
| Skills | ✅ Native | ✅ .claude/skills/ | ❌ Not supported |
| Agents | ✅ Native | ✅ .claude/agents/ | ❌ Not supported |
| Commands | ✅ Native | ✅ .claude/commands/ | ❌ Not supported |

### Step 3: Execute Propagation Checklist

```
□ 1. Create/update in .llms/ (source of truth) with proper YAML frontmatter
□ 2. For RULES:
    □ a. Strip YAML frontmatter
    □ b. Add/update section in CLAUDE.md between sync markers
    □ c. Copy to .cursor/rules/<name>.md (without frontmatter)
□ 3. For SKILLS:
    □ a. Copy entire file to .claude/skills/<name>/SKILL.md
    □ b. (Cursor: not supported - consider adding key points to a rule if critical)
□ 4. For AGENTS:
    □ a. Copy to .claude/agents/<name>.md
    □ b. (Cursor: not supported)
□ 5. For COMMANDS:
    □ a. Copy to .claude/commands/<name>.md
    □ b. (Cursor: not supported)
□ 6. Verify all files are consistent
□ 7. Commit changes to git (see Git Commit Requirements)
```

### Step 4: Cross-Reference Check

Before finalizing, verify:
- If adding an API endpoint to rules, does it need a detailed skill?
- If adding a skill, is the API endpoint referenced in the condensed rules?
- Are there agents that should reference this new capability?
- Does the CLAUDE.md synced section need updating?

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
- `.llms/` changes (source of truth)
- `.claude/` synced files
- `.cursor/rules/` synced files
- `CLAUDE.md` updates
- Any other project files modified as part of the task

---

## Format Transformation Reference

### Devmate → Claude Code (Rules)

**Before (Devmate `.llms/rules/coding-standards.md`):**
```markdown
---
oncalls: ['my-team']
applytouser_prompt: 'code|review|standards'
---

# Coding Standards

Always use TypeScript strict mode. Never use any type.
```

**After (Claude Code `CLAUDE.md` section):**
```markdown
## Coding Standards

Always use TypeScript strict mode. Never use any type.
```

---

### Devmate → Cursor (Rules)

**Before (Devmate `.llms/rules/coding-standards.md`):**
```markdown
---
oncalls: ['my-team']
applytouser_prompt: 'code|review|standards'
---

# Coding Standards

Always use TypeScript strict mode. Never use any type.
```

**After (Cursor `.cursor/rules/coding-standards.md`):**
```markdown
# Coding Standards

Always use TypeScript strict mode. Never use any type.
```

---

## CLAUDE.md Structure Template

Maintain this structure in the project's `CLAUDE.md`:

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
□ All .llms/rules/<name>.md files have valid YAML frontmatter with 'oncalls'
□ CLAUDE.md contains sections for each rule in .llms/rules/
□ .cursor/rules/ contains a file for each rule in .llms/rules/
□ All .llms/skills/<name>/SKILL.md files are mirrored in .claude/skills/
□ All .llms/agents/<name>.md files are mirrored in .claude/agents/
□ All .llms/commands/<name>.md files are mirrored in .claude/commands/
□ No YAML frontmatter appears in CLAUDE.md or .cursor/rules/ files
```

---

## Quick Reference Commands

When the user says:

| User Request | Action |
|--------------|--------|
| "Add a rule for X" | Create in `.llms/rules/`, sync to `CLAUDE.md` and `.cursor/rules/` |
| "Add a skill for X" | Create in `.llms/skills/X/SKILL.md`, sync to `.claude/skills/` |
| "Add an agent for X" | Create in `.llms/agents/`, sync to `.claude/agents/` |
| "Update rule X" | Update in `.llms/rules/`, sync changes to other locations |
| "Delete rule X" | Remove from all three locations |
| "Sync all configs" | Validate and synchronize all files across all tools |
| "Validate configs" | Run validation checklist and report discrepancies |

---

## Important Notes

1. **Source of Truth**: `.llms/` is always the source of truth. Never edit `.claude/` or `.cursor/` files directly for synced content.

2. **YAML Frontmatter**: Only Devmate requires YAML frontmatter. Always strip it when syncing to Claude Code or Cursor.

3. **Cursor Limitations**: Cursor only supports rules. Skills, agents, and commands cannot be synced to Cursor.

4. **Claude Code CLAUDE.md**: This file serves dual purpose — project context AND synced rules. Keep synced rules in a clearly marked section.

5. **File Naming**: Use consistent kebab-case naming across all tools (e.g., `coding-standards.md`).

6. **Atomic Updates**: When updating, modify all target files in a single operation to prevent drift.

---

<!-- BEGIN SYNCED RULES -->

## APE API Reference

Condensed API reference for all APE platform endpoints. For detailed code examples, use the corresponding skills.

### 1. Authentication

**API Key Storage:**
- **Location:** `localStorage` key `ape-api-key`
- **Authorization:** `Bearer <ape-api-key>` header on all requests
- **Validation timestamp:** `localStorage` key `ape-api-key-last-validated`

**Validation Endpoint:**
- **POST** `https://api.wearables-ape.io/models/v1/chat/completions`
- **Payload:** `{"model": "gpt-4o", "messages": [{"role": "user", "content": "test"}], "max_tokens": 5}`
- Validate once per 24 hours; on failure, clear keys and show setup popup

### 2. Rate Limiting

**All endpoints are rate limited to 1 call per second per model.**
- Rate limit applies from call initiation (no need to wait for response)
- Each model has independent rate limits: `gpt-4o`, `gpt-4o-mini`, `gemini-2.5-pro`, `gemini-3-pro-preview`

### 3. LLM APIs

**Chat Completions (GPT-4o / GPT-4o-mini):**
- **Endpoint:** `POST https://api.wearables-ape.io/models/v1/chat/completions`
- `max_tokens` must be ≥2000

**Gemini Async Reasoning:**
- **Step 1:** `POST https://api.wearables-ape.io/conversations?sync=false`
- **Step 2:** `GET https://api.wearables-ape.io/conversations/{cid}/{taskId}` (poll every 500ms)

**Vision:** Use `image_url` with `detail: "high"`

### 4. Other APIs

- **Whisper:** `POST https://api.wearables-ape.io/models/v1/audio/transcriptions`
- **Image Gen:** `POST https://api.wearables-ape.io/conversations?sync=true` (nano-banana-pro)
- **JSON Storage:** `https://api.wearables-ape.io/structured-memories/{key}`
- **File Storage:** `https://api.wearables-ape.io/files/` (30-day expiration)

### 5. Development Standards

- **Stack:** HTML, CSS, JavaScript
- **Analytics:** Google Analytics tag `G-Q98010P7LZ`
- **Debuggability:** Extensive `console.log()` statements
- **Media:** Use `https://picsum.photos/` for placeholders
- **README:** Include "Original Prompt" section and `"Protohub fullscreen deployment: true"`

### 6. Execution Methodology

Use `tasks.md` for all development tracking. Follow Update-Execute-Complete loop.

<!-- END SYNCED RULES -->
