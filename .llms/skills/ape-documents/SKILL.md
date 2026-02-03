---
description: File content injection patterns, chunking strategies, and FileReader implementation for document handling
---

# APE Documents Skill

Complete implementation for handling document/file content in LLM prompts.

## Key Concepts

1. **No native file attachments** - Content must be injected into messages
2. **Use clear delimiters** - Separate file content from prompt
3. **Respect token limits** - ~96,000 tokens available for files
4. **Client-side processing** - FileReader API for reading files

## Supported File Types

| Type | Extensions | Format |
|------|------------|--------|
| Plain Text | `.txt`, `.log` | Delimiters |
| Markdown | `.md` | Delimiters |
| Structured | `.json`, `.csv`, `.xml`, `.yaml`, `.html` | Code blocks |
| Source Code | `.js`, `.py`, `.ts`, `.java`, etc. | Code blocks with language |

## File Reading Implementation

```javascript
/**
 * Read file content as text
 * @param {File} file - File object from input
 * @returns {Promise<string>} - File content
 */
async function readFileContent(file) {
  console.log(`[Documents] Reading file: ${file.name} (${file.size} bytes)`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target.result;
      console.log(`[Documents] File read complete: ${content.length} characters`);
      resolve(content);
    };

    reader.onerror = (error) => {
      console.error('[Documents] File read error:', error);
      reject(error);
    };

    reader.readAsText(file);
  });
}

/**
 * Get appropriate code block language for file extension
 * @param {string} filename - File name
 * @returns {string} - Language identifier
 */
function getLanguageForFile(filename) {
  const ext = filename.split('.').pop().toLowerCase();

  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'json': 'json',
    'csv': 'csv',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php'
  };

  return languageMap[ext] || ext;
}
```

## Prompt Building with Files

```javascript
/**
 * Build prompt with file contents properly formatted
 * @param {string} userPrompt - User's question/instruction
 * @param {File[]} files - Array of File objects
 * @returns {Promise<string>} - Complete prompt with file contents
 */
async function buildPromptWithFiles(userPrompt, files) {
  console.log(`[Documents] Building prompt with ${files.length} file(s)`);

  if (files.length === 0) {
    return userPrompt;
  }

  let fullPrompt = userPrompt + '\n\n';

  for (const file of files) {
    const content = await readFileContent(file);
    const language = getLanguageForFile(file.name);

    fullPrompt += `--- START OF FILE: ${file.name} ---\n`;
    fullPrompt += '```' + language + '\n';
    fullPrompt += content;
    fullPrompt += '\n```\n';
    fullPrompt += `--- END OF FILE: ${file.name} ---\n\n`;

    console.log(`[Documents] Added ${file.name} (${content.length} chars)`);
  }

  console.log(`[Documents] Total prompt length: ${fullPrompt.length} characters`);
  return fullPrompt;
}
```

## Token Estimation

```javascript
/**
 * Estimate token count (rough approximation)
 * Rule of thumb: 1 token ≈ 4 characters for English text
 * @param {string} text - Text to estimate
 * @returns {number} - Estimated token count
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Check if content fits within token limit
 * @param {string} content - Content to check
 * @param {number} limit - Token limit (default: 96000 for file content)
 * @returns {boolean} - Whether content fits
 */
function fitsInTokenLimit(content, limit = 96000) {
  const tokens = estimateTokens(content);
  const fits = tokens <= limit;

  console.log(`[Documents] Token check: ${tokens} estimated tokens, limit: ${limit}, fits: ${fits}`);
  return fits;
}
```

## File Size Validation

```javascript
/**
 * Validate file before processing
 * @param {File} file - File to validate
 * @returns {Object} - {valid, error}
 */
function validateFile(file) {
  console.log(`[Documents] Validating: ${file.name}`);

  // Check file size (rough estimate: 4 chars per token, 96K tokens = ~384KB)
  const maxSize = 384 * 1024; // 384 KB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024).toFixed(1)} KB. Maximum: ${maxSize / 1024} KB`
    };
  }

  // Check file type
  const ext = file.name.split('.').pop().toLowerCase();
  const supportedExtensions = [
    'txt', 'md', 'json', 'csv', 'xml', 'html', 'yaml', 'yml', 'log',
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php', 'sql', 'sh'
  ];

  if (!supportedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type: .${ext}`
    };
  }

  return { valid: true };
}
```

## Chunking Large Files

```javascript
/**
 * Split large file into chunks for processing
 * @param {string} content - File content
 * @param {number} maxTokensPerChunk - Max tokens per chunk
 * @returns {string[]} - Array of content chunks
 */
function chunkContent(content, maxTokensPerChunk = 30000) {
  const maxCharsPerChunk = maxTokensPerChunk * 4;
  const chunks = [];

  // Try to split at paragraph boundaries
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxCharsPerChunk) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If single paragraph is too large, split by lines
      if (paragraph.length > maxCharsPerChunk) {
        const lines = paragraph.split('\n');
        for (const line of lines) {
          if ((currentChunk + line).length > maxCharsPerChunk) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = line + '\n';
          } else {
            currentChunk += line + '\n';
          }
        }
      } else {
        currentChunk = paragraph + '\n\n';
      }
    } else {
      currentChunk += paragraph + '\n\n';
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  console.log(`[Documents] Split into ${chunks.length} chunks`);
  return chunks;
}
```

## Complete File Upload Component

```javascript
/**
 * Handle file input and prepare for API
 * @param {HTMLInputElement} fileInput - File input element
 * @param {string} userPrompt - User's question
 * @returns {Promise<string>} - Ready-to-send prompt
 */
async function handleFileUpload(fileInput, userPrompt) {
  const files = Array.from(fileInput.files);
  console.log(`[Documents] Processing ${files.length} file(s)`);

  // Validate all files
  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  // Build prompt with files
  const fullPrompt = await buildPromptWithFiles(userPrompt, files);

  // Check total token count
  if (!fitsInTokenLimit(fullPrompt)) {
    throw new Error('Combined file content exceeds token limit. Please use smaller files.');
  }

  return fullPrompt;
}
```

## API Call Example

```javascript
async function analyzeDocument(file, question, apiKey) {
  console.log(`[Documents] Analyzing: ${file.name}`);

  const prompt = await buildPromptWithFiles(question, [file]);

  const response = await fetch('https://api.wearables-ape.io/models/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000
    })
  });

  const data = await response.json();
  console.log('[Documents] Analysis complete');

  return data.choices[0].message.content;
}
```
