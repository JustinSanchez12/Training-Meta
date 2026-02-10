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
| Run locally | `npx serve` or `python -m http.server` |
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
- **Payload:** `{"model": "gemini-2.5-flash-lite", "messages": [{"role": "user", "content": "test"}], "max_tokens": 5}`
- Validate once per 24 hours; on failure, clear keys and show setup popup

### 2. Rate Limiting

**All endpoints are rate limited to 1 call per second per model.**

- Wait 1 second between **sends**, not between responses — no need to wait for previous response
- Each model has independent rate limits — send to different models simultaneously
- Use a global queue per model to manage intervals

> **WARNING:** Rate limit errors return `{"error":"Unauthorized."}` which is **misleading**. This is NOT an authentication error - it indicates you've exceeded the rate limit.

### 3. Available Models

| Model ID | Type | Best For |
|----------|------|----------|
| `claude-haiku-4.5` | Claude | Fast, lightweight tasks |
| `claude-opus-4.1` | Claude | Highest quality output |
| `claude-sonnet-4.5` | Claude | Balanced performance |
| `gemini-2.5-flash` | Gemini | Fast general tasks |
| `gemini-2.5-flash-image` | Gemini | Image-optimized tasks |
| `gemini-2.5-flash-lite` | Gemini | Fastest, cheapest option |
| `gemini-2.5-pro` | Gemini | Complex reasoning (exposes `reasoning_content`) |
| `gpt-5.1` | GPT | General purpose |
| `gpt-5.2` | GPT | Advanced capabilities |
| `gpt-5.2-chat` | GPT | Chat-optimized |

**All models support:** Text, Vision (images), Documents, System prompts, Multi-turn conversations

### 4. LLM APIs

**Async Endpoint (PRIMARY):**
- **Step 1:** `POST https://api.wearables-ape.io/conversations?sync=false`
- **Step 2:** `GET https://api.wearables-ape.io/conversations/{cid}/{taskId}` (poll every 500ms until `state === "COMPLETE"`)

**Sync Endpoint (BACKUP):**
- **Endpoint:** `POST https://api.wearables-ape.io/models/v1/chat/completions`
- Use when async endpoint has issues

**Vision:** Use `image_url` with `detail: "high"` (works with all models)

**gemini-2.5-pro:** Returns `reasoning_content` field with chain-of-thought

### 5. Other APIs

- **Whisper:** `POST https://api.wearables-ape.io/models/v1/audio/transcriptions`
- **Image Gen:** `POST https://api.wearables-ape.io/conversations?sync=true` (nano-banana-pro) — **must convert to blob URL for display**
- **JSON Storage:** `https://api.wearables-ape.io/structured-memories/{key}`
- **File Storage:** `https://api.wearables-ape.io/files/` (30-day expiration)
- **Image-to-3D:** `POST https://api.wearables-ape.io/models/custom/invoke` (SAM3 + SAM3D)

### 6. Development Standards

- **Stack:** HTML, CSS, JavaScript
- **Testing:** Always serve apps on a local server (never open HTML files directly)
- **Analytics:** Google Analytics tag `G-Q98010P7LZ`
- **Debuggability:** Extensive `console.log()` statements
- **Media:** Use `https://picsum.photos/` for placeholders
- **README:** Include "Original Prompt" section and `"Protohub fullscreen deployment: true"`

### 7. Execution Methodology

Use `tasks.md` for all development tracking. Follow Update-Execute-Complete loop.

<!-- END SYNCED RULES -->
