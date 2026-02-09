# APE Platform Development Rules

This file provides AI coding agents with the context and rules needed to build applications on the APE platform.

## Overview

APE (API Platform for Experiments) provides a unified API for LLMs, image generation, audio transcription, and cloud storage. All endpoints are hosted at `https://api.wearables-ape.io`.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Environment:** Chrome on MacOS
- **APIs:** APE Platform (LLMs, Vision, Audio, Storage)

## Key Commands

| Task | Command |
|------|---------|
| Run locally | Open `index.html` in Chrome |
| Debug | Open Chrome DevTools (F12) |

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
