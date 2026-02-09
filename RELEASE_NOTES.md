# APE Platform Release Notes

## February 2025 Release

### Multi-Tool Support — Now Works Everywhere

**Previously:** APE rules only worked with DevMate VS Code.

**Now:** Drop the `ape-rules` folder into any project and it works automatically with:
- **Claude Code** (CLI)
- **Cursor** (IDE)
- **DevMate VS Code** (IDE)

No configuration needed. Each tool automatically discovers and loads the appropriate rules and skills.

---

### Expanded Model Library

We've refreshed the entire model lineup with 10 new models across three providers:

| Provider | Models | Best For |
|----------|--------|----------|
| **Claude** | Haiku 4.5, Sonnet 4.5, Opus 4.1 | Quality writing, complex reasoning |
| **Gemini** | 2.5 Flash, Flash-Lite, Flash-Image, Pro | Fast tasks, image analysis, deep reasoning |
| **GPT** | 5.1, 5.2, 5.2-Chat | General purpose, conversations |

All models now support text, images, documents, and multi-turn conversations.

---

### New: Image-to-3D Generation

Convert any 2D image into a textured 3D model with a single API call. Perfect for:
- Product visualization
- AR/VR prototyping
- Creative experimentation

The system automatically extracts objects from images and generates downloadable 3D files (GLB format) that work with any 3D viewer.

---

### Smarter Architecture for Better Performance

We've reorganized how AI agents receive context:

**Before:** One large rules file loaded every time, regardless of what you were building.

**Now:** Modular skills and agents that load only when relevant:
- **Skills** — Focused knowledge modules (authentication, storage, LLM calls, 3D generation)
- **Agents** — Specialized assistants for specific tasks (scaffolding, debugging)

This means faster responses, lower costs, and more accurate help since the AI only sees what it needs for your current task.

---

### Prompt Wizard — Now on Menace

The Prompt Wizard tool is now hosted on Menace with new capabilities:
- **Personal prompt history** — Your prompts are automatically saved to a personal database
- **Resume anytime** — Pick up where you left off across sessions
- **Faster access** — No local setup required

---

### Simplified API Key Setup

The one-time setup popup has been streamlined:
- Single link that handles consent and key generation in one flow
- Cleaner interface with fewer steps
- Faster validation using our most efficient model

---

### What's Next

We're continuing to improve the platform based on your feedback. If you have ideas or run into issues, reach out through the usual channels.

---

*For technical details and implementation examples, see the skill files in `.claude/skills/`*
