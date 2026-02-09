---
description: Complete LLM implementation with async polling (primary) and sync fallback for all APE models
---

# APE LLM Skill

Complete implementation for calling LLM models via APE's async and sync endpoints.

## Available Models

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

## Complete Implementation

```javascript
/**
 * APE LLM Client - Async (Primary) + Sync (Backup)
 */
class ApeLLM {
  constructor() {
    this.baseUrl = 'https://api.wearables-ape.io';
    this.lastCallTime = {};
    this.minInterval = 1000; // 1 second rate limit per model
  }

  getApiKey() {
    const key = localStorage.getItem('ape-api-key');
    if (!key) {
      throw new Error('No API key found. Please complete APE setup.');
    }
    return key;
  }

  // Rate limiting - wait if needed before calling same model
  async throttle(model) {
    const now = Date.now();
    const lastCall = this.lastCallTime[model] || 0;
    const elapsed = now - lastCall;

    if (elapsed < this.minInterval) {
      const waitTime = this.minInterval - elapsed;
      console.log(`[LLM] Rate limiting: waiting ${waitTime}ms for ${model}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCallTime[model] = Date.now();
  }

  /**
   * PRIMARY: Async endpoint with polling
   * Use this for all LLM calls
   */
  async callAsync(messages, model = 'gemini-2.5-flash', options = {}) {
    await this.throttle(model);

    console.log(`[LLM] Async call to ${model}`);
    console.log('[LLM] Messages:', JSON.stringify(messages, null, 2));

    // Step 1: Submit request
    const submitResponse = await fetch(
      `${this.baseUrl}/conversations?sync=false`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getApiKey()}`
        },
        body: JSON.stringify({
          name: 'llm-text-gen-raw',
          raw_model_request: {
            model: model,
            messages: messages,
            stream: false,
            ...options
          }
        })
      }
    );

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      console.error('[LLM] Submit failed:', submitResponse.status, error);
      throw new Error(`LLM submit failed: ${submitResponse.status}`);
    }

    const submitData = await submitResponse.json();
    const cid = submitData.cid;
    const taskId = submitData.tasks[0].id;

    console.log(`[LLM] Polling for completion (cid: ${cid})`);

    // Step 2: Poll for completion
    return await this.poll(cid, taskId, options.timeout || 120000);
  }

  async poll(cid, taskId, timeout = 120000) {
    const pollUrl = `${this.baseUrl}/conversations/${encodeURIComponent(cid)}/${taskId}`;
    const pollInterval = 500;
    const maxPolls = Math.ceil(timeout / pollInterval);
    let pollCount = 0;

    while (pollCount < maxPolls) {
      pollCount++;

      try {
        const response = await fetch(pollUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getApiKey()}`
          }
        });

        if (!response.ok) {
          console.warn(`[LLM] Poll #${pollCount} failed: ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        const data = await response.json();

        if (data.state === 'COMPLETE') {
          console.log('[LLM] Request complete');
          return this.parseResponse(data.output);
        }

        if (data.state === 'FAILED') {
          throw new Error('LLM task failed');
        }

        // Still pending, continue polling
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.error(`[LLM] Poll error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(`LLM request timed out after ${timeout}ms`);
  }

  /**
   * BACKUP: Sync endpoint
   * Use when async endpoint has issues
   */
  async callSync(messages, model = 'gemini-2.5-flash', options = {}) {
    await this.throttle(model);

    console.log(`[LLM] Sync call to ${model} (backup mode)`);
    console.log('[LLM] Messages:', JSON.stringify(messages, null, 2));

    const response = await fetch(
      `${this.baseUrl}/models/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getApiKey()}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: options.max_tokens || 2000,
          ...options
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[LLM] Sync call failed:', response.status, error);
      throw new Error(`LLM sync call failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[LLM] Sync response received');

    return this.parseResponse(data);
  }

  /**
   * Call with automatic fallback to sync if async fails
   */
  async call(messages, model = 'gemini-2.5-flash', options = {}) {
    try {
      return await this.callAsync(messages, model, options);
    } catch (asyncError) {
      console.warn('[LLM] Async failed, trying sync fallback:', asyncError.message);

      try {
        return await this.callSync(messages, model, options);
      } catch (syncError) {
        console.error('[LLM] Both async and sync failed');
        throw syncError;
      }
    }
  }

  parseResponse(output) {
    const choice = output.choices[0];
    let content = '';
    let reasoning = '';

    // Handle string content
    if (typeof choice.message.content === 'string') {
      content = choice.message.content;
    }
    // Handle array content (some models return structured content)
    else if (Array.isArray(choice.message.content)) {
      for (const part of choice.message.content) {
        if (part.type === 'text') {
          content = part.text || '';
        } else if (part.type === 'reasoning') {
          reasoning = part.reasoning || '';
        }
      }
    }

    // gemini-2.5-pro returns reasoning_content separately
    if (choice.message.reasoning_content) {
      reasoning = choice.message.reasoning_content;
    }

    return {
      content: content,
      reasoning: reasoning,
      usage: output.usage,
      model: output.model
    };
  }
}

// Export singleton instance
const llm = new ApeLLM();
```

## Usage Examples

### Basic Text Query

```javascript
async function askQuestion(question) {
  const result = await llm.call([
    { role: 'user', content: question }
  ], 'gemini-2.5-flash');

  console.log('Answer:', result.content);
  return result.content;
}
```

### With System Prompt

```javascript
async function chat(systemPrompt, userMessage) {
  const result = await llm.call([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ], 'claude-sonnet-4.5');

  return result.content;
}
```

### Complex Reasoning with gemini-2.5-pro

```javascript
async function complexReasoning(problem) {
  const result = await llm.call([
    { role: 'system', content: 'Think step by step.' },
    { role: 'user', content: problem }
  ], 'gemini-2.5-pro');

  console.log('Answer:', result.content);
  console.log('Reasoning:', result.reasoning); // Chain-of-thought
  return result;
}
```

### Vision (Image Analysis)

```javascript
async function analyzeImage(imageUrl, question) {
  const result = await llm.call([
    {
      role: 'user',
      content: [
        { type: 'text', text: question },
        { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
      ]
    }
  ], 'gemini-2.5-flash-image');

  return result.content;
}

// With base64 image
async function analyzeBase64Image(base64Data, question) {
  const result = await llm.call([
    {
      role: 'user',
      content: [
        { type: 'text', text: question },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Data}`,
            detail: 'high'
          }
        }
      ]
    }
  ], 'gpt-5.1');

  return result.content;
}
```

### Document Processing

```javascript
async function analyzeDocument(filename, content, question) {
  const documentContent = `--- START OF FILE: ${filename} ---
${content}
--- END OF FILE: ${filename} ---

${question}`;

  const result = await llm.call([
    { role: 'user', content: documentContent }
  ], 'claude-opus-4.1');

  return result.content;
}
```

### Multi-turn Conversation

```javascript
async function conversation(history) {
  // history is array of {role, content} messages
  const result = await llm.call(history, 'gpt-5.2-chat');
  return result.content;
}

// Example usage
const history = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is 5 + 5?' },
  { role: 'assistant', content: '10' },
  { role: 'user', content: 'Now multiply that by 2.' }
];
const response = await conversation(history);
```

### Force Sync Endpoint (Backup)

```javascript
// If you know async is having issues, call sync directly
async function syncQuery(question) {
  const result = await llm.callSync([
    { role: 'user', content: question }
  ], 'gemini-2.5-flash-lite');

  return result.content;
}
```

## Rate Limiting

> **WARNING:** Rate limit errors return `{"error":"Unauthorized."}` which is **misleading**. This is NOT an authentication error - it indicates you've exceeded the 1 request/second limit.

The ApeLLM class automatically handles rate limiting by waiting 1 second between calls to the same model. Different models have independent rate limits.

## Error Handling

```javascript
async function safeCall(messages, model) {
  try {
    const result = await llm.call(messages, model);
    return { success: true, data: result };
  } catch (error) {
    console.error('[LLM] Error:', error.message);

    // Check if it's a rate limit error (misleadingly returns "Unauthorized")
    if (error.message.includes('Unauthorized')) {
      console.log('[LLM] Possible rate limit - waiting before retry');
      await new Promise(r => setTimeout(r, 2000));
      return safeCall(messages, model); // Retry once
    }

    return { success: false, error: error.message };
  }
}
```
