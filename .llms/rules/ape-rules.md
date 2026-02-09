# **AI Agent Coding Rules**

This document outlines the specific rules, API endpoints, and development standards to be followed by the AI coding agent for this project.

## **1\. Authentication & Setup**

### **1.1. API Key Management**

* The single API key for all services hosted on [https://api.wearables-ape.io](https://api.wearables-ape.io) is stored in the browser's local storage under the key ape-api-key.
* All API calls requiring authorization must retrieve this key from local storage and pass it as a Bearer token in the Authorization header.

### **1.2. API Key Management and Validation**

This section outlines the startup and validation logic for the user's API key, which is essential for all application functionality.

#### **On Application Load**

On initial application load, the following validation sequence **MUST** be executed:

1. **Check for Key:** Verify if a value for `ape-api-key` exists in `localStorage`.
2. **Check for Daily Validation:** Verify if a timestamp for `ape-api-key-last-validated` exists in `localStorage` and is less than 24 hours old.
3. **Initiate Flow:** If either the key does not exist OR it has not been successfully validated in the last 24 hours, the **API Key Setup Flow** must be initiated immediately. Otherwise, the application can proceed with its normal startup.

#### **Validation Logic**

To meet the "once per day at most" requirement, the following logic must be used:

* **Timestamping:** When an API key is successfully validated, the current timestamp **MUST** be stored in `localStorage` under the key `ape-api-key-last-validated`.
* **Test Call:** The validation itself consists of making a `POST` call with the user's API key.
  * **Endpoint:** `https://api.wearables-ape.io/models/v1/chat/completions`
  * **Payload:**

```json
{
  "model": "gpt-4o",
  "messages": [{"role": "user", "content": "test"}],
  "max_tokens": 5
}
```

* **Failure Handling:** If a scheduled daily validation call fails, the `ape-api-key` and `ape-api-key-last-validated` values **MUST** be cleared from `localStorage`, and the **API Key Setup Flow** must be triggered.

#### **API Key Setup Flow (Popup)**

This flow is initiated when the initial key validation fails. A modal popup with all the content below fitting without need for scrolling down, styled consistently with the rest of the application, **MUST** be displayed and follow these steps:

1. **Inform the User:** Display the following information on the popup, in the following order:
   * **Title**: "One-Time Setup Required to Enjoy Vibe Coded Prototypes"
   * **Explanation below the title**: "As required by Meta guidelines, every user needs to go through this one-time flow, which should be required only once for all prototypes created through the [Vibe Coding @ Meta (XFN-Friendly)](http://fburl.com/vibe-code) Workshop"
   * **Important Notes section:**
     1. "An API key is essentially a way for meta servers to know that you are the one using the prototype, and this is required to enable the functionalities used in this prototype, such as meta-hosted LLMs to process the prototype logic."
     2. "The URL provided below is an internal, Meta-only service approved for company-wide use, regardless of your organization or function."
2. **Provide Instructions:** Display clear, step-by-step instructions for the user in a bullet list (not numbered list):
   * *Step 0: If never done before, go to [https://wearables-ape.io/consent](https://wearables-ape.io/consent) and sign the consent form*
   * **Step 1:** Go to [https://wearables-ape.io/settings/api-keys](https://wearables-ape.io/settings/api-keys)
   * **Step 2:** Press the "New API Key" button, and copy the API key *(long string of letters/numbers)*
   * **Step 3:** Paste your new API key into the field below and click "Save".
3. **Capture and Validate Input:** Provide a plain text input field (not password field) and a "Save" button.
   * When the "Save" button is clicked, the value from the input field **MUST** be used to perform the specific **Test Call** defined in the "Validation Logic" section. Make sure required event listeners and button logic is properly implemented to prevent cases of button clicks making no actions.
4. **Handle Success and Failure:**
   * **On Successful Validation:**
     1. Save the validated key to `localStorage` under the key `ape-api-key`.
     2. Save the current timestamp to `localStorage` under `ape-api-key-last-validated`.
     3. Display a clear success message to the user (e.g., "Success\! Your API key has been saved.").
     4. Automatically reload the page after a 1-2 second delay to re-initialize the app.
   * **On Failed Validation:**
     1. Display a clear error message (e.g., "Invalid API Key. Please check your key and try again.").
     2. The popup **MUST** remain open, allowing the user to correct the key and try again.

---

## **2\. API Usage**

### **2.1. Rate Limiting**

* **Constraint:** All API calls to any endpoint under [https://api.wearables-ape.io](https://api.wearables-ape.io) are **rate limited to 1 call per second per model** *(i.e. gpt-4o and gpt-4o-mini have separate and independent rate limits).*
* **Important:** The rate limiting applies from **API call to API call** - there is **no need to wait for the response** before the 1-second interval begins. This allows you to parallelize API calls to the same model with 1-second intervals between each call initiation.
* **Implementation Strategy:** You can implement a global queue that manages these 1-second intervals, allowing you to fully parallelize calls to multiple models in this app. For example:
  * Calls to `gpt-4o` can be made every 1 second (without waiting for responses)
  * Simultaneously, calls to `gpt-4o-mini` can be made every 1 second (independent queue)
  * Simultaneously, calls to `gemini-2.5-pro` can be made every 1 second (independent queue)
  * Simultaneously, calls to `gemini-3-pro-preview` can be made every 1 second (independent queue)
* You must ensure your code respects the 1-second interval between initiating calls to the same model to avoid errors.

### **2.2. LLM Logic**

* **Endpoint:** You MUST use the following endpoint for all chat completions, overriding the default OpenAI Chat Completion endpoint URL: `https://api.wearables-ape.io/models/v1/chat/completions`

#### API instructions per use case

Here are the specifications with the requested heading structure.

---

##### **1\. Text-Only Query**

This is the standard request for all text-based logic, such as answering questions, writing code, or summarizing text.

###### **Standard Models (GPT-4o, GPT-4o-mini)**

Use these models for general text-based queries where speed is important.

**API Payload (Request)**

The payload is a JSON object sent to the specified endpoint. The content field is a simple string.

```

curl -X POST https://api.wearables-ape.io/models/v1/chat/completions \
-H "Authorization: Bearer $YOUR_API_KEY" \
-H "Content-Type: application/json" \
-d '{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Explain the three laws of thermodynamics in simple terms."
    }
  ],
  "max_tokens": 2000
}'

```

**Key Parameters:**

* **model**: gpt-4o or gpt-4o-mini.
* **messages**: An array of message objects. For text-only, the content is a string.
* **max\_tokens**: Must be higher than 2000

**Expected Response Structure**

The response is a standard chat completion JSON object. The assistant's reply is in choices\[0\].message.content.

```

{
  "id": "chatcmpl-123456789abcdefg",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4o-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Here are the three laws of thermodynamics, simplified:\n\n1.  **You can't win (Conservation of Energy):** Energy can't be created or destroyed, only changed from one form to another. \n2.  **You can't break even (Entropy):** Things naturally tend to get more messy and disordered over time (entropy increases).\n3.  **You can't quit the game (Absolute Zero):** You can never reach absolute zero (the coldest possible temperature), where all particle motion stops."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 30,
    "completion_tokens": 105,
    "total_tokens": 135
  }
}

```

---

###### **Gemini Models with Async Reasoning (For Complex Reasoning Tasks)**

These are advanced reasoning models that provide superior performance for complex tasks. They use an asynchronous workflow that differs from the standard GPT-4o models.

**Available Models:**

| Model Name (API) | Description | Reliability |
|------------------|-------------|-------------|
| `gemini-2.5-pro` | Stable, high-performance reasoning model | High - Recommended for production |
| `gemini-3-pro-preview` | Latest generation model (Preview) | Medium - May have capacity issues |

**⚠️ IMPORTANT CAPACITY WARNING for Gemini 3.0 Pro:**

`gemini-3-pro-preview` is currently in preview and may experience capacity constraints during peak usage periods. If you encounter rate limiting or availability issues:

1. **Fallback Strategy:** Implement automatic fallback to `gemini-2.5-pro` if `gemini-3-pro-preview` requests fail
2. **User Communication:** Display a user-friendly message indicating temporary capacity issues
3. **Retry Logic:** Implement exponential backoff with a maximum of 3 retries before falling back

**When to Use Gemini Models:**

Gemini models are appropriate for:

* Complex mathematical problems requiring multi-step reasoning
* Advanced coding challenges with intricate logic
* Scientific analysis requiring deep theoretical understanding
* Multi-step problem solving with dependencies
* Tasks requiring chain-of-thought reasoning, including with long context data
* Complex data analysis requiring inference

**When NOT to Use Gemini Models:**

Do NOT use Gemini models for:

* Simple questions or basic information retrieval
* General conversation or chatbot interactions
* Basic code generation or simple debugging
* Standard text summarization or rewriting
* Any task where speed is prioritized over deep reasoning

---

**CRITICAL: Gemini Models Use Async Two-Step Process**

Unlike GPT-4o, Gemini models require an asynchronous workflow:

1. **Step 1:** Submit request → Receive conversation ID (cid) and task ID
2. **Step 2:** Poll for completion → Extract final response when state = "COMPLETE"

---

**Step 1: Submit the Reasoning Request**

**Endpoint:** `POST https://api.wearables-ape.io/conversations?sync=false`

**Headers:**

```
accept: application/json
Content-Type: application/json
Authorization: Bearer {ape-api-key}
```

**Request Payload:**

```json
{
  "name": "llm-text-gen-raw",
  "raw_model_request": {
    "model": "gemini-2.5-pro",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Solve this complex optimization problem..."
      }
    ],
    "stream": false
  }
}
```

**Key Parameters:**

* **name**: Must be `"llm-text-gen-raw"`
* **model**: `"gemini-2.5-pro"` (recommended) or `"gemini-3-pro-preview"` (with fallback logic)
* **messages**: Array of conversation messages (same format as standard chat completions)
* **stream**: Must be `false` for this async pattern

**Response Example (Step 1):**

```json
{
  "cid": "conv:00ub3bnp6fWZ6R2JB357-82f3f798-673b-462e-812b-c5c728890e81",
  "start": 1763593858,
  "expires": 1763597458,
  "tasks": [
    {
      "id": "6801a3ef-d6cb-4a9d-9b74-7c4059461974",
      "output": null,
      "received": 1763593858,
      "started": null,
      "completed": null
    }
  ]
}
```

**Extract Required Values:**

* **cid**: Conversation ID (e.g., `"conv:00ub3bnp6fWZ6R2JB357-..."`)
* **task.id**: Task ID (e.g., `"6801a3ef-d6cb-4a9d-9b74-7c4059461974"`)

---

**Step 2: Poll for Task Completion**

**Endpoint:** `GET https://api.wearables-ape.io/conversations/{cid}/{taskId}`

Replace `{cid}` and `{taskId}` with values from Step 1.

**Headers:**

```
accept: application/json
Authorization: Bearer {ape-api-key}
```

**Polling Strategy - CRITICAL IMPLEMENTATION REQUIREMENTS:**

1. **Polling Interval**: Query the endpoint every **500 milliseconds**
2. **State Check**: Continue polling until `state` field equals `"COMPLETE"`
3. **Early Termination**: As soon as a valid response is received (state is "COMPLETE"), stop polling and ignore any in-flight requests
4. **Response Handling**: Multiple polling requests may be in flight when completion occurs - only process the first successful response and discard others

**Example cURL:**

```bash
curl -X 'GET' \
  'https://api.wearables-ape.io/conversations/conv%3A00ub3bnp6fWZ6R2JB357-82f3f798-673b-462e-812b-c5c728890e81/6801a3ef-d6cb-4a9d-9b74-7c4059461974' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer {ape-api-key}'
```

**Note:** The `cid` in the URL must be properly URL-encoded (`:` becomes `%3A`)

**Response When In Progress:**

```json
{
  "state": "PENDING",
  "output": null
}
```

or

```json
{
  "state": "RUNNING",
  "output": null
}
```

Continue polling when state is not "COMPLETE".

**Response When Complete:**

```json
{
  "state": "COMPLETE",
  "output": {
    "id": "chatcmpl-CdlcB1xXFbPrRItaDsoNpHeFfNbS3",
    "created": 1763593859,
    "model": "gemini-2.5-pro",
    "object": "chat.completion",
    "choices": [
      {
        "finish_reason": "stop",
        "index": 0,
        "message": {
          "content": "Globe Life Field in Arlington, Texas.",
          "role": "assistant"
        }
      }
    ],
    "usage": {
      "completion_tokens": 83,
      "prompt_tokens": 54,
      "total_tokens": 137,
      "completion_tokens_details": {
        "reasoning_tokens": 64
      }
    }
  }
}
```

---

**Extracting the Final Response**

The LLM's response is located at: `output.choices[0].message.content`

**Response Format Handling:**

Gemini models can return content in two formats:

**Format 1: String (Simple Response)**

```json
{
  "message": {
    "content": "Globe Life Field in Arlington, Texas.",
    "role": "assistant"
  }
}
```

**Format 2: Array (With Reasoning Steps)**

```json
{
  "message": {
    "content": [
      {
        "type": "reasoning",
        "reasoning": "Let me think through this step by step..."
      },
      {
        "type": "text",
        "text": "Globe Life Field in Arlington, Texas."
      }
    ],
    "role": "assistant"
  }
}
```

---

**Complete JavaScript Implementation Example:**

```javascript
async function submitGeminiRequest(messages, apiKey, model = 'gemini-2.5-pro') {
  console.log(`Step 1: Submitting ${model} reasoning request...`);

  // Step 1: Submit the request
  const submitResponse = await fetch(
    'https://api.wearables-ape.io/conversations?sync=false',
    {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: 'llm-text-gen-raw',
        raw_model_request: {
          model: model,
          messages: messages,
          stream: false
        }
      })
    }
  );

  const submitData = await submitResponse.json();
  const cid = submitData.cid;
  const taskId = submitData.tasks[0].id;

  console.log(`Step 2: Polling for completion (cid: ${cid}, taskId: ${taskId})...`);

  // Step 2: Poll for completion
  const result = await pollForCompletion(cid, taskId, apiKey);
  return result;
}

async function pollForCompletion(cid, taskId, apiKey) {
  const pollUrl = `https://api.wearables-ape.io/conversations/${encodeURIComponent(cid)}/${taskId}`;
  let responseReceived = false;
  let finalResponse = null;
  let pollCount = 0;

  while (!responseReceived) {
    pollCount++;
    console.log(`Poll #${pollCount}`);

    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const data = await response.json();

    if (data.state === 'COMPLETE' && !responseReceived) {
      responseReceived = true;

      // Extract message content
      const choice = data.output.choices[0];
      let assistantMessage = '';
      let reasoningText = '';

      if (typeof choice.message.content === 'string') {
        assistantMessage = choice.message.content;
      } else if (Array.isArray(choice.message.content)) {
        for (const part of choice.message.content) {
          if (part.type === 'reasoning') {
            reasoningText = part.reasoning || '';
          } else if (part.type === 'text') {
            assistantMessage = part.text || '';
          }
        }
      }

      finalResponse = {
        message: assistantMessage,
        reasoning: reasoningText,
        usage: data.output.usage
      };

      console.log('Gemini Request Complete:', finalResponse);
      break;
    }

    // Wait 500ms before next poll
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return finalResponse;
}

// Example with fallback from Gemini 3 to Gemini 2.5
async function submitGeminiWithFallback(messages, apiKey, preferGemini3 = false) {
  const models = preferGemini3
    ? ['gemini-3-pro-preview', 'gemini-2.5-pro']
    : ['gemini-2.5-pro'];

  for (const model of models) {
    try {
      console.log(`Attempting request with model: ${model}`);
      const result = await submitGeminiRequest(messages, apiKey, model);
      return result;
    } catch (error) {
      console.warn(`${model} failed, trying fallback...`, error.message);
      if (model === models[models.length - 1]) {
        throw error; // No more fallbacks
      }
    }
  }
}
```

---

**Error Handling:**

Implement proper error handling for:

1. **Network Errors**: Handle failed requests during submission or polling
2. **Timeout**: Consider implementing a maximum polling duration (e.g., 2 minutes)
3. **Invalid State**: Handle unexpected state values
4. **Missing Data**: Validate that required fields exist in responses
5. **Capacity Issues (Gemini 3)**: Implement fallback to `gemini-2.5-pro` when `gemini-3-pro-preview` is unavailable

**Rate Limiting:**

* The async nature of Gemini requests means the 1-second rate limit applies to the **submission request** (Step 1)
* Polling requests (Step 2) are not subject to the same rate limiting
* You can submit a new Gemini request every 1 second, while simultaneously polling for previous requests
* Note: `gemini-2.5-pro` and `gemini-3-pro-preview` have **separate and independent rate limits**

---

##### **2\. Text and Document Query**

Follow the "text-only query" instructions for the endpoint to use and its parameters, and follow the following rules for handling documents:

---

###### **Critical Understanding: No Native File Attachments**

**IMPORTANT**: The `/v1/chat/completions` endpoint (for all models including GPT-4o, GPT-4o-mini, and Gemini models) **does not support native file uploads or attachments**. You cannot send a file object or reference a file ID.

###### **How File Content is Actually Handled**

The only way to have the model "read" a file is to:

1. Read the file's contents in your application (client-side)
2. Convert the content to text
3. Inject the text directly into the `content` field of a user or system message

---

###### **Supported Text-Based Files**

These files can be read as text and injected directly into prompts:

| File Type | Extensions | Recommended Format | Example |
|-----------|-----------|-------------------|---------|
| Plain Text | `.txt` | Use delimiters | `---START OF FILE---\n[content]\n---END OF FILE---` |
| Markdown | `.md` | Use delimiters | Same as plain text |
| JSON | `.json` | Markdown code block | ` ```json\n[content]\n``` ` |
| CSV | `.csv` | Markdown code block | ` ```csv\n[content]\n``` ` |
| XML | `.xml` | Markdown code block | ` ```xml\n[content]\n``` ` |
| HTML | `.html` | Markdown code block | ` ```html\n[content]\n``` ` |
| YAML | `.yaml`, `.yml` | Markdown code block | ` ```yaml\n[content]\n``` ` |
| Log Files | `.log` | Use delimiters | Same as plain text |
| Source Code | `.js`, `.py`, `.java`, `.cpp`, `.ts`, `.jsx`, `.tsx`, etc. | Markdown code block with language | ` ```python\n[content]\n``` ` |

---

###### **Best Practices for File Content Injection**

**1. Use Clear Delimiters**

**Good Example:**

```json
{
  "role": "user",
  "content": "Analyze this data:\n\n--- START OF FILE: data.csv ---\n```csv\nProduct,Price\nLaptop,999.99\n```\n--- END OF FILE: data.csv ---"
}
```

**Bad Example (No delimiters):**

```json
{
  "role": "user",
  "content": "Analyze this data: Product,Price\nLaptop,999.99"
}
```

**2. Use Markdown Code Blocks for Structured Data**

This helps the model correctly parse the structure:

```javascript
// JSON files
content: "Here's the config:\n```json\n{\"key\": \"value\"}\n```"

// CSV files
content: "Sales data:\n```csv\nDate,Amount\n2024-01-01,1000\n```"

// Code files
content: "Review this code:\n```python\ndef hello():\n    print('world')\n```"
```

**3. Multiple File Handling**

When handling multiple files, clearly separate each file:

```javascript
{
  "role": "user",
  "content": "Analyze these files:\n\n--- START OF FILE: config.json ---\n```json\n{...}\n```\n--- END OF FILE: config.json ---\n\n--- START OF FILE: data.csv ---\n```csv\n...\n```\n--- END OF FILE: data.csv ---"
}
```

---

###### **Token Limit Constraints**

**Critical Limitation**: All file content must fit within the model's context window along with your prompt and the model's response.

| Model | Max Context Tokens | Practical File Size Limit |
|-------|-------------------|---------------------------|
| GPT-4o | 128,000 tokens | ~96,000 tokens for files (assuming 16K for prompt + 16K for response) |
| GPT-4o-mini | 128,000 tokens | ~96,000 tokens for files |

**Rule of Thumb**: 1 token ≈ 4 characters (English text)

**Handling Large Files:**

If a file exceeds the token limit:

1. **Prevent Upload**: Check file size before reading. Show error if too large.
2. **Chunking Strategy**:
   * Split large files into smaller chunks
   * Process each chunk in separate API calls
   * Combine results programmatically
3. **User Alternatives**:
   * Ask user to provide a smaller file
   * Allow user to copy/paste specific sections

---

###### **Client-Side Implementation**

Your application is responsible for all file handling before the API call:

1. Provide a UI for the user to select a file (e.g., `<input type="file">`)
2. Use a client-side reader (like `FileReader` in JavaScript) to read the file's content into a string
3. Construct the API request payload by injecting this string into the prompt

**JavaScript Implementation Example:**

```javascript
async function buildPromptWithFiles(userPrompt, files) {
  if (files.length === 0) {
    return userPrompt;
  }

  let fullPrompt = userPrompt + '\n\n';

  for (const file of files) {
    const content = await readFileContent(file);
    const extension = file.name.split('.').pop().toLowerCase();

    fullPrompt += `--- START OF FILE: ${file.name} ---\n`;
    fullPrompt += '```' + extension + '\n';
    fullPrompt += content;
    fullPrompt += '\n```\n';
    fullPrompt += `--- END OF FILE: ${file.name} ---\n\n`;
  }

  return fullPrompt;
}

async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
```

**Example Usage:**

```javascript
// Read files selected by user
const files = Array.from(fileInput.files);

// Build prompt with file contents
const fullPrompt = await buildPromptWithFiles(
  "What is the average price in the CSV?",
  files
);

// Make API call
const response = await fetch(
  'https://api.wearables-ape.io/models/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      max_tokens: 2000
    })
  }
);
```

---

##### **3\. Text and Image Query**

This is for all image analysis use cases (Object Detection, OCR, Visual Q\&A, etc.). The payload structure requires the content to be an array containing text and image URLs (which can be a public URL or a Base64 data URI).

###### **API Payload (Request)**

```

curl -X POST https://api.wearables-ape.io/models/v1/chat/completions \
-H "Authorization: Bearer $YOUR_API_KEY" \
-H "Content-Type: application/json" \
-d '{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "How many people are in this photo, and what color is the car in the foreground?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/images/street-scene.jpg",
            "detail": "high"
          }
        }
      ]
    }
  ],
  "max_tokens": 2000
}'

```

**Key Parameters:**

* **model**: gpt-4o or gpt-4o-mini.
* **content**: An array containing text and image(s).
* **type: "image\_url"**: The object containing the image.
* **image\_url.url**: A public URL (e.g., https://...) or a Base64 data URI (data:image/png;base64,...).
* **image\_url.detail**: Must be set to **high**
* **max\_tokens**: Must be higher than 2000

###### **Expected Response Structure**

The response will contain the answer to your visual question.

```

{
  "id": "chatcmpl-123456789qrstuvw",
  "object": "chat.completion",
  "created": 1677652488,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "There are 3 people visible in the photo. The car in the foreground is red."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 845,
    "completion_tokens": 19,
    "total_tokens": 864
  }
}

```

##### 4\. Any other use case

Apply your logic and look up the latest OpenAI chat completion API documentation to understand how to structure the payload.

### **2.3. Audio Transcription (Whisper)**

To transcribe audio, use the following API specifications:

* **Method:** POST
* **Endpoint:** [https://api.wearables-ape.io/models/v1/audio/transcriptions](https://api.wearables-ape.io/models/v1/audio/transcriptions)
* **Headers:**
  * accept: application/json
  * Content-Type: multipart/form-data
  * Authorization: Bearer \<ape-api-key from local storage\>
* **Form Data:**
  * model: whisper
  * language: en
  * file: The audio file (e.g., \<FILE\>.mp3;type=audio/mpeg)
* **Constraint:** The file MUST be sent as multipart/form-data, not as a base64 encoded blob.

**Example cURL:**

```shell
curl -X 'POST' \
  'https://api.wearables-ape.io/models/v1/audio/transcriptions' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -H 'Authorization: Bearer TOKEN' \
  -F 'model=whisper' \
  -F 'language=en' \
  -F 'file=@<FILE>.mp3;type=audio/mpeg'
```

### **2.4. Image Generation (nano-banana)**

Image generation is a two-step process. **Note:** Generated images expire after 30 days.

#### **Step 1: Request Image Generation**

* **Endpoint:** [https://api.wearables-ape.io/conversations?sync=true](https://api.wearables-ape.io/conversations?sync=true)
* **API Key:** Use the ape-api-key from local storage.
* **Payload (JSON):**
  * model\_api\_name: "nano-banana-pro"
  * name: "llm-image-gen"
  * output\_type: "file\_id"
  * user: "\<user prompt\>"
* **Image Input (Optional):** If the user provides an input image, send it as a base64 string in the attachment field:
  * attachment: "data:image/jpeg;base64,..."

Example Response:

You will receive a JSON object containing a file\_id.

```json
{
  "cid": "conv:00ub3bnp6fWZ6R2JB357-ae3a144f-d51e-4358-b74c-37ce7c09900c",
  "result": {
    "base64": null,
    "file_id": [
      "913ef030-9c81-4428-aaee-57b7d245f329.png"
    ],
    "temp_url": null
  }
}
```

#### **Step 2: Retrieve Generated Image**

Use the file\_id from the Step 1 response to fetch the image.

* **Method:** GET
* **Endpoint:** \<[https://api.wearables-ape.io/files/\\](https://api.wearables-ape.io/files/\\)\<file\_id\>?file\_type=web\_generated\> (Replace \<file\_id\> with the ID from the response).
* **Headers:**
  * accept: application/json
  * Authorization: Bearer \<ape-api-key from local storage\>

**Example cURL:**

```shell
curl -X 'GET' \
  'https://api.wearables-ape.io/files/913ef030-9c81-4428-aaee-57b7d245f329.png?file_type=web_generated' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <ape-api-key from local storage>'
```

###

### **2.5. Cloud Storage of JSONs (Structured Memories)**

**CORE CONCEPTS:**

1. **Global Namespace:** Keys are globally unique. You cannot share keys between users.
2. **Strict Ownership:** If User A creates a key, User B cannot read/write to it.
3. **Persistence Strategy:** To maintain user-specific data, you must algorithmically generate a unique key that includes the user's ID.

#### **2.5.1. Phase 1: User Identification**

You must first retrieve the unique ID of the current user to generate a safe key.

* **Endpoint:** GET <https://api.wearables-ape.io/user/me>
* **Headers:** Authorization: Bearer \<APE-API-KEY\>

**Response Schema:**

JSON

```
{
  "id": "00ub3bnp6fWZ6R2JB357", // <--- Target this value for key generation
  "name": "Jeremie Guedj",
  "email": "jeremieg@meta.com",
  "acls": []
}
```

#### **2.5.2. Phase 2: Key Construction**

Construct the memory-key by combining a hardcoded app identifier with the dynamic User ID.

**Format:** \<app\_slug\>-\<userID\>

* **\<app\_slug\>**: A hardcoded string constant (e.g., fitness\_tracker). Must be unique to your app to avoid collisions.
* **\<userID\>**: The id string retrieved in Phase 1\.
* **Example Key:** fitness\_tracker-00ub3bnp6fWZ6R2JB357

#### **2.5.3. Phase 3: Safe Initialization ("Read-Before-Write")**

A new user will not have a memory key yet, but a returning user will. To avoid overwriting existing data, you must follow this strict logic:

1. **Attempt Fetch (GET):** Call GET /{derived\_key}.
2. **Check Status:**
   * **If HTTP 200 (OK):** The user has existing data. Parse response.value and load it into your app state. **DO NOT overwrite.**
   * **If HTTP 404 (Not Found):** This is a new user. Proceed to Step 3\.
3. **Initialize (POST):** Call POST /{derived\_key} with your default JSON payload (e.g., empty settings or default preferences).

**CRITICAL WARNING:** Do not use PUT as your first step. PUT acts as an upsert and will silently overwrite a returning user's existing data with your default template. Always GET first.

---

#### **2.5.4. API Reference**

Base URL: <https://api.wearables-ape.io/structured-memories>

Headers: Authorization: Bearer \<APE-API-KEY\>, Content-Type: application/json

**A. Full Object Operations**

| Method | Endpoint | Description |
| :---- | :---- | :---- |
| **GET** | /{memory-key} | **Fetch/Check.** Returns the JSON object. If response is 404, the key does not exist (New User). |
| **POST** | /{memory-key} | **Create.** Use this **only** after a GET returns 404\. Initializes the memory. Returns error if key exists. |
| **PUT** | /{memory-key} | **Update.** Replaces the existing memory. Use this for saving state *after* initialization. |
| **DELETE** | /{memory-key} | **Reset.** Deletes the key and data. |

B. Granular Access (JSONPath)

Use this to modify specific fields without transmitting the full object.

* **URL:** /{memory-key}/in/{encoded\_json\_path}
* **Note:** {encoded\_json\_path} must be URL encoded (e.g., $ \-\> %24).

**Example: Fetching specific data**

Bash

```
# Key: fitness_tracker-00ub3bnp6fWZ6R2JB357
# Path: $.daily_goals.steps
curl -X 'GET' \
  'https://api.wearables-ape.io/structured-memories/fitness_tracker-00ub3bnp6fWZ6R2JB357/in/%24.daily_goals.steps' \
  -H 'Authorization: Bearer <APE-API-KEY>'
```

#### **2.5.5. Coding Agent Logic Checklist**

When implementing the storage class, adhere to this control flow:

1. **init()**:
   * Call /user/me to get userID.
   * Construct key \= APP\_NAME \+ "-" \+ userID.
   * Call GET /structured-memories/{key}.
   * **IF 200**: this.data \= response.value. (Load Data)
   * **IF 404**: POST /structured-memories/{key} with defaultData. this.data \= defaultData. (Create New)
2. **save()**:
   * Call PUT /structured-memories/{key} with this.data.
3. **updateField(path, value)**:
   * Call PUT /structured-memories/{key}/in/{path} with value.

---

### **2.6. Cloud Storage of Files**

This API allows you to upload and retrieve files (images, documents, etc.) associated with the user's account. Files are stored temporarily for **30 days** and then automatically deleted.

**⚠️ Important Note:** Files are saved only for 30 days.

#### **Upload File**

Upload a file to cloud storage and receive a unique file ID for later retrieval.

* **Method:** POST
* **Endpoint:** `https://api.wearables-ape.io/files/`
* **Headers:**
  * `accept: application/json`
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <ape-api-key from local storage>`
* **Form Data:**
  * `file`: The file to upload (e.g., `@photo.jpeg;type=image/jpeg`)

**Example cURL:**

```shell
curl -X 'POST' \
  'https://api.wearables-ape.io/files/' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -H 'Authorization: Bearer c957d869-2fb4-427c-bfe6-72ac70ced836' \
  -F 'file=@photo-4223_singular_display_fullPicture.jpeg;type=image/jpeg'
```

**Example Response:**

```json
{
  "success": "photo-4223_singular_display_fullPicture.jpeg uploaded successfully.",
  "file_id": "c7d3172a-7822-4c0a-95f5-fe25b2911530.jpeg"
}
```

**Key Response Fields:**

* `success`: Confirmation message with the original filename
* `file_id`: Unique identifier to retrieve the file later (format: UUID.extension)

---

#### **Download/Retrieve File**

Retrieve a previously uploaded file using its file ID.

* **Method:** GET
* **Endpoint:** `https://api.wearables-ape.io/files/<file_id>?file_type=default`
  * `<file_id>`: The unique file ID returned from the upload response
  * `file_type=default`: Query parameter specifying the file type category
* **Headers:**
  * `accept: application/json`
  * `Authorization: Bearer <ape-api-key from local storage>`

**Example cURL:**

```shell
curl -X 'GET' \
  'https://api.wearables-ape.io/files/c7d3172a-7822-4c0a-95f5-fe25b2911530.jpeg?file_type=default' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer c957d869-2fb4-427c-bfe6-72ac70ced836'
```

**Response:**

The endpoint returns the raw file content as a binary blob with appropriate content-type headers, allowing the browser to handle it natively (display images, download documents, etc.).

**Response Details:**

* **HTTP Status Code:** `200` (on success)
* **Response Format:** Binary blob (raw file content)
* **Content-Type Header:** Dynamically set based on file type
  * For CSV files: `text/csv; charset=utf-8`
  * For JPEG images: `image/jpeg`
  * For PNG images: `image/png`
  * For other file types: Appropriate MIME type based on file extension

**Response Structure by File Type:**

1. **Document Files (CSV, TXT, etc.):**
   * Content-Type: `text/csv; charset=utf-8` or similar
   * Blob contains the raw text content
   * Can be read as text using blob.text()
   * Suitable for downloading or client-side processing

2. **Image Files (JPEG, PNG, etc.):**
   * Content-Type: `image/jpeg`, `image/png`, etc.
   * Blob contains the raw binary image data
   * Can be displayed directly using URL.createObjectURL()
   * Suitable for image preview or download

**Example Response Handling in JavaScript:**

```javascript
// Make the GET request
const response = await fetch(
  `https://api.wearables-ape.io/files/${fileId}?file_type=default`,
  {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  }
);

if (response.ok) {
  const blob = await response.blob();
  const contentType = response.headers.get('content-type');

  console.log('Response status:', response.status); // 200
  console.log('Content-Type:', contentType); // e.g., "image/jpeg" or "text/csv; charset=utf-8"
  console.log('Blob size:', blob.size); // File size in bytes

  // For images - display preview
  if (contentType.startsWith('image/')) {
    const imageUrl = URL.createObjectURL(blob);
    imageElement.src = imageUrl;
  }

  // For documents - provide download link
  else {
    const downloadUrl = URL.createObjectURL(blob);
    downloadLink.href = downloadUrl;
    downloadLink.download = originalFileName;
  }
}
```

**Console Log Examples from Actual API Calls:**

*CSV File Download:*

```
Download response status: 200
Download response ok: true
Response content-type: text/csv; charset=utf-8
File content type: text/csv; charset=utf-8
Downloaded blob size: 10293 bytes
```

*JPEG Image Download:*

```
Download response status: 200
Download response ok: true
Response content-type: image/jpeg
File content type: image/jpeg
Downloaded blob size: 1777911 bytes
```

---

#### **Use Cases**

* Temporarily storing user-uploaded files (images, documents, PDFs, etc.)
* Sharing files between different sessions or components of the application
* Caching processed or generated files that don't need permanent storage
* Providing temporary file URLs for display or download

---

#### **Best Practices**

1. **Always inform users** that files are stored for only 30 days
2. **Store the file_id** in your application state or localStorage if you need to retrieve the file later
3. **Handle upload errors gracefully** with user-friendly error messages
4. **Validate file types and sizes** on the client side before uploading to improve user experience
5. **Consider the 30-day expiration** when designing your application's file management strategy

---

## **3\. Development Standards**

### **3.1. Technical Constraints**

* **Stack:** The application must be a standard HTML, CSS, and JavaScript web app capable of being run locally.
* **Environment:** The app will be run on a Macbook using the latest version of Google Chrome.
* **Network:** Any network-accessible resource or API may be used.

### **3.2. Media Handling**

* **Priority Rule:** If you are provided with specific media URLs (e.g., from user prompts or existing Figma/React code using Unsplash), you **MUST** use those exact URLs. Do not substitute them.
* **Fallback Rule:** For any other image needs where a URL is *not* provided, you **MUST** use the [https://picsum.photos/](https://picsum.photos/) service.
  * **Square Image:** \<[https://picsum.photos/\\](https://picsum.photos/\\)\<size\>\> (e.g., [https://picsum.photos/400](https://picsum.photos/400))
  * **Rectangular Image:** \<[https://picsum.photos/\\](https://picsum.photos/\\)\<width\>/\<height\>\> (e.g., [https://picsum.photos/400/250](https://picsum.photos/400/250))
  * **Cache Busting:** To ensure a new image is fetched, append a random parameter (e.g., [https://picsum.photos/400?random=1](https://picsum.photos/400?random=1)).

### **3.3. Analytics**

You must integrate Google Analytics using the following Tag ID:

* **Tag ID:** G-Q98010P7LZ

### **3.4. Debuggability**

* The application must be highly debuggable.
* You **MUST** add extensive console.log() statements for every significant step, including:
  * Application loading
  * All user flow steps
  * Key logic execution
  * API call initiation and reception (success or failure)
  * Full REST API calls, including endpoint and full payload
  * Full response from API Calls
* **Important:** When logging REST API calls or responses that contain base64-encoded images, do NOT log the full base64 string. Instead, log a placeholder like `[BASE64_DATA]` or truncate to show only the first 50 characters to keep logs readable.

### **3.5. Documentation**

* A fully detailed README.md file must be created and maintained.
* The README.md must include a section titled **"Original Prompt"**.
* This section must contain the *full, unedited text* of the original prompt that initiated the project.
* The README.md **MUST** have the following string present at the bottom of the file: "Protohub fullscreen deployment: true"
* Every time you make changes to the code, you must reflect those changes in the README.me file to keep it updated

### **3.6. Security & Privacy**

* This application is intended for internal use only.
* It will be run in a secure environment, either:
  1. Locally on a secure company laptop.
  2. As a GitHub Page within a GitHub Enterprise environment, accessible only to company employees on a secure network.

---

## **4\. Execution Methodology**

### **4.1. The tasks.md Operating Model**

This project follows a structured, task-based execution methodology using a `tasks.md` file as the single source of truth for all development activities. This approach ensures transparency, traceability, and systematic progress tracking.

#### **Core Principles**

1. **Receive the Brief**
   * The user provides a complete, extensive brief covering all application requirements
   * The brief may include functional specifications, design requirements, API integrations, and user flows

2. **Create the Master Plan**
   * **CRITICAL FIRST STEP:** Before writing any code, generate a comprehensive `tasks.md` file
   * This file serves as the master execution plan, breaking down the entire brief into a detailed, step-by-step roadmap
   * The plan should outline all tasks required to build the first testable version of the application
   * Tasks should be:
     * Specific and actionable
     * Organized in logical sequence
     * Grouped by feature or component where appropriate
     * Marked with checkboxes for completion tracking

3. **Strict Task-Based Execution**
   * **MANDATORY RULE:** Only work on tasks that are explicitly listed in the `tasks.md` file
   * No code should be written or changes made unless they correspond to a task in the file
   * Follow the plan logically, executing tasks in the order that makes technical sense

#### **The "Update-Execute-Complete" Loop**

This is the fundamental workflow cycle that must be followed for all development work:

1. **If User Makes a New Request:**
   * First, update the `tasks.md` file to add the new request as one or more tasks
   * Mark these tasks as pending `[ ]`
   * Only after updating the task list should you proceed to execution

2. **Execute:**
   * Work on the task(s), writing code, making changes, or performing the required actions
   * Follow all coding standards and best practices defined in this rules document
   * Add comprehensive console.log statements for debuggability

3. **Update and Complete:**
   * **MANDATORY:** Every response that involves work completion must conclude with:
     * The complete, updated content of the `tasks.md` file
     * Tasks that are completed marked with `[x]`
     * Any new tasks discovered during execution added to the list
   * This ensures the task list always reflects the current project state

#### **Maintaining the Single Source of Truth**

The `tasks.md` file is the authoritative record of project progress. This means:

* **Always Current:** The file must be updated in real-time as work progresses
* **Complete History:** Completed tasks remain in the file (marked `[x]`) to provide a record of what was accomplished
* **User Visibility:** The user can save and reference this file at any time to understand project status
* **No Surprises:** All planned work is visible before execution begins

#### **Handling Context Resets**

When a session is interrupted or reset:

1. **Read the Current State:**
   * Request the latest `tasks.md` content from the user
   * Review all completed tasks `[x]` to understand what has been done
   * Review all pending tasks `[ ]` to understand what remains

2. **Resume Work:**
   * Pick up exactly where the previous session left off
   * Work on the next logical pending task in the sequence
   * Continue following the "Update-Execute-Complete" loop

#### **Example tasks.md Structure**

```markdown
# Project Tasks

## Setup and Configuration
- [x] Initialize project structure
- [x] Set up API key validation flow
- [x] Implement localStorage management for API keys

## Core Features
- [x] Create main chat interface
- [ ] Implement file upload functionality
- [ ] Add image analysis support
- [ ] Build Gemini reasoning integration

## Styling and UX
- [ ] Apply responsive design
- [ ] Add loading states and error handling
- [ ] Implement dark mode toggle

## Testing and Deployment
- [ ] Test all API integrations
- [ ] Verify error handling
- [ ] Update README.md with final documentation
```

#### **Benefits of This Methodology**

* **Transparency:** User always knows what's being worked on and what's planned
* **Accountability:** Clear record of completed vs. pending work
* **Efficiency:** Prevents scope creep and unnecessary work
* **Collaboration:** Easy for user to modify priorities by updating the task list
* **Context Resilience:** Sessions can be paused and resumed without losing progress
* **Quality:** Systematic approach ensures nothing is forgotten or overlooked
