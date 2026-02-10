# Vibecoding at Meta Release Notes

## February 2026

---

## Prompt Wizard v1.5

The Prompt Wizard is now hosted on Manus with powerful new capabilities:

- **Personal Prompt History** — Your prompts are automatically saved to a personal database, so you never lose your work
- **Resume Anytime** — Pick up exactly where you left off across sessions
- **Faster Access** — No local setup required, just open and start creating

---

## Vibe Coding Capabilities

### Agentic Architecture for Deterministic and Context-Friendly Coding

We've reorganized how AI agents receive context to make your vibe coding experience faster and more accurate.

**Before:** One large rules file loaded every time, regardless of what you were building.

**Now:** Modular skills and agents that load only when relevant:
- **Skills** — Focused knowledge modules (authentication, storage, LLM calls, 3D generation)
- **Agents** — Specialized assistants for specific tasks (scaffolding, debugging)

This means faster responses, lower costs, and more accurate help since the AI only sees what it needs for your current task.

Additionally, the rules now work automatically with multiple AI coding tools:
- Claude Code (CLI)
- Cursor (IDE)
- DevMate VS Code (IDE)

Just drop the rules folder into any project — no configuration needed.

### Expanded Model Library Powered by APE

We've refreshed the entire model lineup with 10 new models across three providers. All models support text, images, documents, and multi-turn conversations.

**Claude Models:**
- Haiku 4.5 — Fast, lightweight tasks
- Sonnet 4.5 — Balanced performance
- Opus 4.1 — Highest quality output

**Gemini Models:**
- Gemini 2.5 Flash — Fast general tasks
- Gemini 2.5 Flash-Lite — Fastest, most affordable option
- Gemini 2.5 Flash-Image — Optimized for image analysis
- Gemini 2.5 Pro — Complex reasoning with chain-of-thought

**GPT Models:**
- GPT 5.1 — General purpose
- GPT 5.2 — Advanced capabilities
- GPT 5.2-Chat — Optimized for conversations

### Simplified API Key Setup

The one-time setup popup has been streamlined:
- Single link that handles consent and key generation in one flow
- Cleaner interface with fewer steps
- Faster validation using our most efficient model

### Image-to-3D Generation

Convert any 2D image into a textured 3D model. Perfect for:
- Product visualization
- AR/VR prototyping
- Creative experimentation

The system automatically extracts objects from images and generates downloadable 3D files (GLB format) that work with any 3D viewer.

---

We're continuing to improve the platform based on your feedback. If you have ideas or run into issues, reach out through the usual channels.
