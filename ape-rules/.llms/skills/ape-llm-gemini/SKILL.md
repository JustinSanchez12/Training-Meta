---
description: Complete Gemini async reasoning implementation with polling, response parsing, and fallback logic
---

# APE Gemini LLM Skill

Complete implementation for Gemini async reasoning models.

## When to Use Gemini

**Use Gemini for:**
- Complex mathematical problems
- Multi-step reasoning tasks
- Advanced coding challenges
- Scientific analysis
- Chain-of-thought reasoning
- Complex data analysis

**Don't use for:**
- Simple questions
- Basic chat interactions
- Standard text summarization
- Speed-critical operations

## Available Models

| Model | Reliability | Notes |
|-------|-------------|-------|
| `gemini-2.5-pro` | High | Recommended for production |
| `gemini-3-pro-preview` | Medium | May have capacity issues |

## Complete Implementation

```javascript
/**
 * Submit a request to Gemini reasoning models
 * @param {Array} messages - Array of message objects
 * @param {string} apiKey - APE API key
 * @param {string} model - Model name (default: gemini-2.5-pro)
 * @returns {Promise<Object>} - {message, reasoning, usage}
 */
async function submitGeminiRequest(messages, apiKey, model = 'gemini-2.5-pro') {
  console.log(`[Gemini] Step 1: Submitting ${model} request...`);
  console.log('[Gemini] Messages:', JSON.stringify(messages, null, 2));

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

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[Gemini] Submit failed:', submitResponse.status, errorText);
    throw new Error(`Gemini submit failed: ${submitResponse.status}`);
  }

  const submitData = await submitResponse.json();
  const cid = submitData.cid;
  const taskId = submitData.tasks[0].id;

  console.log(`[Gemini] Step 2: Polling for completion`);
  console.log(`[Gemini] cid: ${cid}`);
  console.log(`[Gemini] taskId: ${taskId}`);

  // Step 2: Poll for completion
  const result = await pollForCompletion(cid, taskId, apiKey);
  return result;
}

/**
 * Poll for Gemini task completion
 * @param {string} cid - Conversation ID
 * @param {string} taskId - Task ID
 * @param {string} apiKey - APE API key
 * @returns {Promise<Object>} - Parsed response
 */
async function pollForCompletion(cid, taskId, apiKey) {
  const pollUrl = `https://api.wearables-ape.io/conversations/${encodeURIComponent(cid)}/${taskId}`;
  let responseReceived = false;
  let finalResponse = null;
  let pollCount = 0;
  const maxPolls = 240; // 2 minute timeout at 500ms intervals
  const pollInterval = 500;

  console.log(`[Gemini] Poll URL: ${pollUrl}`);

  while (!responseReceived && pollCount < maxPolls) {
    pollCount++;

    try {
      const response = await fetch(pollUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        console.error(`[Gemini] Poll #${pollCount} failed:`, response.status);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      const data = await response.json();
      console.log(`[Gemini] Poll #${pollCount} state: ${data.state}`);

      if (data.state === 'COMPLETE' && !responseReceived) {
        responseReceived = true;
        finalResponse = parseGeminiResponse(data.output);
        console.log('[Gemini] Request complete');
        console.log('[Gemini] Response:', finalResponse.message.substring(0, 200) + '...');
        break;
      }

      if (data.state === 'FAILED') {
        throw new Error('Gemini task failed');
      }

    } catch (error) {
      console.error(`[Gemini] Poll #${pollCount} error:`, error.message);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  if (!responseReceived) {
    throw new Error('Gemini request timed out after 2 minutes');
  }

  return finalResponse;
}

/**
 * Parse Gemini response handling both string and array formats
 * @param {Object} output - Raw output from Gemini
 * @returns {Object} - {message, reasoning, usage}
 */
function parseGeminiResponse(output) {
  const choice = output.choices[0];
  let assistantMessage = '';
  let reasoningText = '';

  // Handle both string and array content formats
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

  return {
    message: assistantMessage,
    reasoning: reasoningText,
    usage: output.usage
  };
}
```

## Fallback Implementation

```javascript
/**
 * Submit Gemini request with automatic fallback
 * @param {Array} messages - Array of message objects
 * @param {string} apiKey - APE API key
 * @param {boolean} preferGemini3 - Try Gemini 3 first
 * @returns {Promise<Object>} - Response object
 */
async function submitGeminiWithFallback(messages, apiKey, preferGemini3 = false) {
  const models = preferGemini3
    ? ['gemini-3-pro-preview', 'gemini-2.5-pro']
    : ['gemini-2.5-pro'];

  for (const model of models) {
    try {
      console.log(`[Gemini] Attempting request with model: ${model}`);
      const result = await submitGeminiRequest(messages, apiKey, model);
      return result;
    } catch (error) {
      console.warn(`[Gemini] ${model} failed:`, error.message);

      if (model === models[models.length - 1]) {
        throw error; // No more fallbacks
      }

      console.log('[Gemini] Trying fallback model...');
    }
  }
}
```

## Rate Limiting Integration

```javascript
class GeminiRateLimiter {
  constructor() {
    this.lastCallTime = {};
    this.minInterval = 1000; // 1 second
  }

  async throttle(model) {
    const now = Date.now();
    const lastCall = this.lastCallTime[model] || 0;
    const elapsed = now - lastCall;

    if (elapsed < this.minInterval) {
      const waitTime = this.minInterval - elapsed;
      console.log(`[Gemini] Rate limiting: waiting ${waitTime}ms for ${model}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCallTime[model] = Date.now();
  }

  async submitRequest(messages, apiKey, model = 'gemini-2.5-pro') {
    await this.throttle(model);
    return submitGeminiRequest(messages, apiKey, model);
  }
}

// Usage
const geminiLimiter = new GeminiRateLimiter();
// await geminiLimiter.submitRequest(messages, apiKey, 'gemini-2.5-pro');
```

## Example Usage

```javascript
async function analyzeComplexProblem(problem, apiKey) {
  const messages = [
    {
      role: 'system',
      content: 'You are an expert problem solver. Think step by step.'
    },
    {
      role: 'user',
      content: problem
    }
  ];

  try {
    const result = await submitGeminiWithFallback(messages, apiKey, true);

    console.log('[Gemini] Final answer:', result.message);
    if (result.reasoning) {
      console.log('[Gemini] Reasoning:', result.reasoning);
    }
    console.log('[Gemini] Token usage:', result.usage);

    return result.message;
  } catch (error) {
    console.error('[Gemini] Analysis failed:', error);
    throw error;
  }
}
```
