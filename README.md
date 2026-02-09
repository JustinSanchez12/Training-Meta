# APE LLM Rules

AI coding rules and skills for building applications on the APE (API Platform for Experiments) platform. This repository provides AI coding agents with everything they need to build web apps using APE's unified API for LLMs, image generation, audio transcription, and cloud storage.

## Supported AI Coding Tools

This repository is designed to work with multiple AI coding assistants:

| Tool | Status | Configuration Location |
|------|--------|----------------------|
| **Claude Code** (CLI) | Fully Supported | `.claude/` + `CLAUDE.md` |
| **Devmate VS Code** | Fully Supported | `.llms/` |
| **Cursor** | Fully Supported | `.cursor/rules/` + `.claude/skills/` |

All three tools receive identical capabilities through synchronized configuration files.

## Quick Start

### 1. Clone the Repository

```bash
git clone https://ghe.oculus-rep.com/Vibe-Coding-Meta/APE-LLM-Rules.git
```

### 2. Copy to Your Project

Copy the configuration folders to your project root:

```bash
cp -r APE-LLM-Rules/.claude your-project/
cp -r APE-LLM-Rules/.llms your-project/
cp -r APE-LLM-Rules/.cursor your-project/
cp APE-LLM-Rules/CLAUDE.md your-project/
```

### 3. Get Your APE API Key

1. Go to [https://wearables-ape.io/consent](https://wearables-ape.io/consent) and sign the consent form (first time only)
2. Go to [https://wearables-ape.io/settings/api-keys](https://wearables-ape.io/settings/api-keys)
3. Click "New API Key" and copy the key

### 4. Start Building

Open your project in your preferred AI coding tool and start building. The AI will automatically use the APE rules and skills.

---

## Repository Structure

```
.
├── README.md                 # This file
├── CLAUDE.md                 # Project context for Claude Code
├── .claude/
│   ├── skills/               # On-demand implementation code
│   │   ├── ape-auth/
│   │   ├── ape-documents/
│   │   ├── ape-image-to-3d/
│   │   ├── ape-llm-gemini/
│   │   ├── ape-storage-files/
│   │   └── ape-storage-json/
│   └── agents/               # Specialized AI agents
│       ├── ape-scaffolder.md
│       └── ape-debugger.md
├── .llms/                    # Devmate VS Code configuration
│   ├── rules/
│   │   └── ape-api-reference.md
│   ├── skills/               # (mirrors .claude/skills/)
│   └── agents/               # (mirrors .claude/agents/)
└── .cursor/
    └── rules/
        └── ape-api-reference.md
```

---

## Available Skills

Skills provide complete, copy-paste-ready implementation code for specific APE features. They are loaded on-demand when the AI detects relevant tasks.

### ape-auth
**API key validation and setup popup implementation**

- 24-hour validation cycle
- Complete popup UI with Meta-specific wording
- localStorage management
- Error handling and retry logic

### ape-llm-gemini
**Gemini async reasoning with polling and fallback**

- Two-step async process (submit + poll)
- Response parsing for string and array formats
- Automatic fallback from Gemini 3 to Gemini 2.5
- Rate limiter class

### ape-documents
**File content injection and chunking strategies**

- FileReader implementation
- Token estimation and limits
- Delimiter-based file injection
- Support for .txt, .md, .json, .csv, .xml, .html, .yaml, and source code

### ape-storage-json
**Complete StorageClass for JSON persistence**

- User-specific storage with automatic key generation
- CRUD operations (GET, POST, PUT, DELETE)
- JSONPath granular access
- Read-before-write pattern to prevent data loss

### ape-storage-files
**File upload and download with blob handling**

- Multipart form-data uploads
- Binary blob downloads
- Image preview and file download triggers
- 30-day expiration handling

### ape-image-to-3d
**Convert 2D images to 3D GLB models**

- SAM3 segmentation with text prompts
- SAM3D mesh generation
- Fallback prompt strategies
- Three.js viewer integration

---

## Available Agents

Agents are specialized AI personas for specific workflows.

### ape-scaffolder
Creates new APE applications with correct structure, including:
- HTML/CSS/JS boilerplate
- API key validation flow
- Google Analytics integration
- README template with "Original Prompt" section

### ape-debugger
Adds comprehensive console.log statements:
- Application lifecycle logging
- API call logging (with base64 placeholder)
- User action logging
- Consistent prefix system (`[App]`, `[API]`, `[Auth]`, etc.)

---

## APE API Overview

All endpoints are hosted at `https://api.wearables-ape.io`

| API | Endpoint | Description |
|-----|----------|-------------|
| **Chat Completions** | `POST /models/v1/chat/completions` | GPT-4o, GPT-4o-mini |
| **Gemini Reasoning** | `POST /conversations?sync=false` | Async reasoning with polling |
| **Vision** | `POST /models/v1/chat/completions` | Image analysis with `image_url` |
| **Whisper** | `POST /models/v1/audio/transcriptions` | Audio transcription |
| **Image Generation** | `POST /conversations?sync=true` | nano-banana-pro |
| **JSON Storage** | `/structured-memories/{key}` | Persistent user data |
| **File Storage** | `/files/` | Temporary file storage (30 days) |
| **Image-to-3D** | `POST /models/custom/invoke` | SAM3 + SAM3D pipeline |

### Rate Limiting

All endpoints are rate limited to **1 call per second per model**. Each model has independent limits:
- `gpt-4o`
- `gpt-4o-mini`
- `gemini-2.5-pro`
- `gemini-3-pro-preview`

### Authentication

All requests require a Bearer token:
```
Authorization: Bearer <ape-api-key>
```

The API key is stored in `localStorage` under the key `ape-api-key`.

---

## Development Standards

When building APE applications, follow these standards:

### Tech Stack
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Environment:** Chrome on MacOS
- **No frameworks required**

### Debuggability
Add extensive `console.log()` statements for:
- Application loading
- User flow steps
- API calls (endpoint + payload)
- API responses
- Errors

**Important:** Never log full base64 strings. Use `[BASE64_DATA]` placeholder.

### Media Handling
- Use provided media URLs exactly when available
- Fallback to `https://picsum.photos/` for placeholders

### Documentation
Every app must have a `README.md` with:
- "Original Prompt" section containing the full initial request
- `"Protohub fullscreen deployment: true"` at the bottom

### Analytics
Include Google Analytics tag: `G-Q98010P7LZ`

---

## Task-Based Development

APE projects use a `tasks.md` file as the single source of truth:

1. **Create Master Plan** - Generate `tasks.md` before coding
2. **Task-Based Execution** - Only work on listed tasks
3. **Update-Execute-Complete Loop**:
   - Add new requests as tasks first
   - Execute tasks
   - Mark completed with `[x]`

---

## Troubleshooting

### API Key Issues
- Ensure key is stored in `localStorage` as `ape-api-key`
- Keys are validated once per 24 hours
- On validation failure, clear both `ape-api-key` and `ape-api-key-last-validated`

### Rate Limiting Errors
- Implement 1-second delays between calls to the same model
- Different models have independent rate limits
- Rate limit applies from call initiation (no need to wait for response)

### Gemini Timeouts
- Default timeout: 2 minutes
- Poll every 500ms until `state === "COMPLETE"`
- Implement fallback to `gemini-2.5-pro` if `gemini-3-pro-preview` fails

---

## Contributing

To add or update rules:

1. Edit files in `.llms/` (source of truth)
2. Sync to `.claude/` and `.cursor/`
3. Update `CLAUDE.md` synced section if rules change
4. Commit and push to main

---

## License

Internal use only. For Meta employees on the corporate network or GitHub Enterprise.
