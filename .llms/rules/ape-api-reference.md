---
oncalls: ['ape-platform']
applyto: '**/*.{js,html,ts,jsx,tsx}'
applytouserprompt: 'ape|api|llm|storage|whisper|image|gemini|claude|gpt'
---

# APE API Reference

Condensed API reference for all APE platform endpoints. For detailed code examples, use the corresponding skills.

## 1. Authentication

### API Key Storage
- **Location:** `localStorage` key `ape-api-key`
- **Authorization:** `Bearer <ape-api-key>` header on all requests
- **Validation timestamp:** `localStorage` key `ape-api-key-last-validated`

### Validation Endpoint
- **POST** `https://api.wearables-ape.io/models/v1/chat/completions`
- **Payload:** `{"model": "gemini-2.5-flash-lite", "messages": [{"role": "user", "content": "test"}], "max_tokens": 5}`
- **Validate once per 24 hours**; on failure, clear keys and show setup popup

> **Skill:** Use `ape-auth` skill for full popup implementation details.

---

## 2. Rate Limiting

**All endpoints are rate limited to 1 call per second per model.**

- Rate limit applies from call initiation (no need to wait for response)
- Each model has independent rate limits (see Available Models below)

**Implementation:** Use a global queue per model to manage 1-second intervals.

> **WARNING:** Rate limit errors return `{"error":"Unauthorized."}` which is **misleading**. This is NOT an authentication error - it indicates you've exceeded the rate limit. Always wait 1+ second between calls to the same model.

---

## 3. LLM APIs

### 3.1 Available Models

| Model ID | Type | Best For |
|----------|------|----------|
| `claude-haiku-4.5` | Claude | Fast, lightweight tasks |
| `claude-opus-4.1` | Claude | Highest quality output |
| `claude-sonnet-4.5` | Claude | Balanced performance |
| `gemini-2.5-flash` | Gemini | Fast general tasks |
| `gemini-2.5-flash-image` | Gemini | Image-optimized tasks |
| `gemini-2.5-flash-lite` | Gemini | Fastest, cheapest option |
| `gemini-2.5-pro` | Gemini | Complex reasoning (exposes chain-of-thought) |
| `gpt-5.1` | GPT | General purpose |
| `gpt-5.2` | GPT | Advanced capabilities |
| `gpt-5.2-chat` | GPT | Chat-optimized |

**All models support:** Text, Vision (images), Documents, System prompts, Multi-turn conversations

---

### 3.2 Async Endpoint (PRIMARY)

**Use this endpoint for all LLM calls.** Two-step process: submit request, then poll for completion.

#### Step 1: Submit Request

**Endpoint:** `POST https://api.wearables-ape.io/conversations?sync=false`

**Headers:**
```
Authorization: Bearer {ape-api-key}
Content-Type: application/json
```

**Payload:**
```json
{
  "name": "llm-text-gen-raw",
  "raw_model_request": {
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "system", "content": "..."},
      {"role": "user", "content": "..."}
    ],
    "stream": false
  }
}
```

**Response:** Contains `cid` (conversation ID) and `tasks[0].id` (task ID)

#### Step 2: Poll for Completion

**Endpoint:** `GET https://api.wearables-ape.io/conversations/{cid}/{taskId}`

- Poll every 500ms until `state === "COMPLETE"`
- URL-encode `cid` (`:` becomes `%3A`)
- Response at: `output.choices[0].message.content`

**Response States:**
- `PENDING` - Still processing
- `COMPLETE` - Result ready
- `FAILED` - Request failed

> **Skill:** Use `ape-llm` skill for complete implementation with polling and error handling.

---

### 3.3 Sync Endpoint (BACKUP)

**Use only when async endpoint has issues.** Simpler but less reliable for long-running requests.

**Endpoint:** `POST https://api.wearables-ape.io/models/v1/chat/completions`

**Headers:**
```
Authorization: Bearer {ape-api-key}
Content-Type: application/json
```

**Payload:**
```json
{
  "model": "gemini-2.5-flash",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "max_tokens": 2000
}
```

**Response:** `choices[0].message.content` contains the assistant's reply.

**When to use sync endpoint:**
- Async endpoint returns errors
- Simple, fast queries where polling overhead isn't worth it
- Debugging async issues

---

### 3.4 Special Model Features

#### gemini-2.5-pro Reasoning Content

`gemini-2.5-pro` returns chain-of-thought reasoning in a separate field:

```json
{
  "choices": [{
    "message": {
      "content": "The answer is 42.",
      "reasoning_content": "Let me think through this step by step..."
    }
  }]
}
```

Access reasoning via `output.choices[0].message.reasoning_content`

---

### 3.5 Vision (Image Analysis)

Works with **all models** via both async and sync endpoints.

**Message format with image:**
```json
{
  "role": "user",
  "content": [
    {"type": "text", "text": "Describe this image"},
    {"type": "image_url", "image_url": {"url": "...", "detail": "high"}}
  ]
}
```

**Image URL formats:**
- Public URL: `https://example.com/image.jpg`
- Base64 data URI: `data:image/png;base64,...`

**Key:** `detail` must be `"high"` for best results.

---

### 3.6 Document/File Content

**No native file attachments.** Inject file content directly into messages.

**Pattern:**
```
--- START OF FILE: {filename} ---
```{extension}
{content}
```
--- END OF FILE: {filename} ---
```

**Supported:** `.txt`, `.md`, `.json`, `.csv`, `.xml`, `.html`, `.yaml`, `.log`, source code files

**Token Limits:** ~96,000 tokens available for files (128K context minus prompt/response)

> **Skill:** Use `ape-documents` skill for file injection helpers and chunking strategies.

---

## 4. Audio Transcription (Whisper)

**Endpoint:** `POST https://api.wearables-ape.io/models/v1/audio/transcriptions`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer {ape-api-key}
```

**Form Data:**
- `model`: `whisper`
- `language`: `en`
- `file`: Audio file (multipart/form-data, NOT base64)

**Supported formats:** `.mp3`, `.wav`, `.m4a`, etc.

---

## 5. Image Generation (nano-banana)

**Two-step process. Images expire after 30 days.**

### Step 1: Generate

**Endpoint:** `POST https://api.wearables-ape.io/conversations?sync=true`

**Payload:**
```json
{
  "model_api_name": "nano-banana-pro",
  "name": "llm-image-gen",
  "output_type": "file_id",
  "user": "<prompt>",
  "attachment": "data:image/jpeg;base64,..." // optional input image
}
```

**Response:** `result.file_id[0]` contains the generated image ID

### Step 2: Retrieve

**Endpoint:** `GET https://api.wearables-ape.io/files/{file_id}?file_type=web_generated`

---

## 6. Structured Memories (JSON Storage)

**User-specific persistent JSON storage.**

**Base URL:** `https://api.wearables-ape.io/structured-memories`

### User Identification

**Endpoint:** `GET https://api.wearables-ape.io/user/me`

**Response:** `{"id": "user-id-here", "name": "...", "email": "..."}`

### Key Construction

**Format:** `{app_slug}-{userId}`

**Example:** `my-app-00ub3bnp6fWZ6R2JB357`

### CRUD Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/{key}` | Fetch data (404 = new user) |
| POST | `/{key}` | Create (only after GET 404) |
| PUT | `/{key}` | Update/replace |
| DELETE | `/{key}` | Delete |

### Granular Access (JSONPath)

**Endpoint:** `/{key}/in/{encoded_json_path}`

URL-encode the path (`$` becomes `%24`)

**CRITICAL:** Always GET before POST/PUT to avoid overwriting existing data.

> **Skill:** Use `ape-storage-json` skill for full StorageClass implementation.

---

## 7. File Storage

**Temporary file storage (30-day expiration).**

**Base URL:** `https://api.wearables-ape.io/files`

### Upload

**Endpoint:** `POST https://api.wearables-ape.io/files/`

**Headers:** `Content-Type: multipart/form-data`

**Form Data:** `file`: The file to upload

**Response:** `{"success": "...", "file_id": "uuid.extension"}`

### Download

**Endpoint:** `GET https://api.wearables-ape.io/files/{file_id}?file_type=default`

**Response:** Binary blob with appropriate Content-Type header

> **Skill:** Use `ape-storage-files` skill for upload/download with blob handling.

---

## 8. Image-to-3D Generation (SAM3/SAM3D)

**Two-step pipeline to convert 2D images to textured 3D GLB models.**

**Endpoint:** `POST https://api.wearables-ape.io/models/custom/invoke`

**Model IDs:**
- SAM3 Segmentation: `4f04b30f-d74b-4052-a4c0-55f64e50c734`
- SAM3D Mesh: `ce0c17e1-0a8c-4d98-8697-758c9fc2395e`

### Step 1: SAM3 Segmentation

Extract object mask from image using text prompt.

**Payload:**
```json
{
  "model_id": "4f04b30f-d74b-4052-a4c0-55f64e50c734",
  "endpoint_name": "SAM3",
  "body": {
    "model_operation": "segment",
    "prompt": "apple",
    "image": "<base64-encoded-image>"
  },
  "content_type": "application/json"
}
```

**CRITICAL:** The `body` field must be a JSON object, NOT a base64-encoded string.

**Response:** `model_response.masks[]` (base64 PNGs), `model_response.scores[]`

Select the mask with the highest score.

### Step 2: SAM3D Mesh Generation

Convert image + mask to 3D GLB. Processing time: **30-40 seconds**.

**Payload:**
```json
{
  "model_id": "ce0c17e1-0a8c-4d98-8697-758c9fc2395e",
  "endpoint_name": "SAM3D",
  "body": {
    "image": "<base64-encoded-image>",
    "mask": "<base64-mask-from-step1>",
    "output_format": "glb"
  },
  "content_type": "application/json"
}
```

**Response:** GLB data at `model_response.glb` (NOT `result.glb`)

### Best Practices

- **Image Resolution:** Resize to max 1024x1024
- **Prompts:** Use simple nouns ("apple", "chair"); fallback to "object" or "foreground"
- **Timeouts:** 120s for segmentation, 180s for mesh generation

> **Skill:** Use `ape-image-to-3d` skill for complete implementation with Three.js viewer integration.

---

## 9. Development Standards

### Technical Constraints
- **Stack:** HTML, CSS, JavaScript (no frameworks required)
- **Environment:** Chrome on MacOS
- **Network:** Any accessible API allowed

### Media Handling
- **Priority:** Use provided media URLs exactly
- **Fallback:** Use `https://picsum.photos/{size}` or `https://picsum.photos/{width}/{height}`
- **Cache busting:** Append `?random={n}`

### Analytics
- **Google Analytics Tag:** `G-Q98010P7LZ`

### Debuggability
- Add `console.log()` for:
  - Application loading
  - User flow steps
  - Key logic execution
  - API calls (endpoint + payload)
  - API responses
- **Base64:** Log `[BASE64_DATA]` placeholder instead of full string

### Documentation
- Maintain `README.md` with "Original Prompt" section
- Include at bottom: `"Protohub fullscreen deployment: true"`

### Security
- Internal use only
- Local or GitHub Enterprise deployment

---

## 10. Execution Methodology

### tasks.md Operating Model

1. **Create Master Plan:** Generate `tasks.md` before coding
2. **Task-Based Execution:** Only work on listed tasks
3. **Update-Execute-Complete Loop:**
   - Add new requests as tasks first
   - Execute tasks
   - Mark completed with `[x]`
4. **Context Resets:** Request `tasks.md` to resume

> **Agent:** Use `ape-scaffolder` agent for new app setup.
> **Agent:** Use `ape-debugger` agent to add logging statements.
