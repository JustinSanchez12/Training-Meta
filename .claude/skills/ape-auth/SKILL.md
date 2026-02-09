---
description: API key validation flow and setup popup implementation for APE platform authentication
---

# APE Authentication Skill

Complete implementation for API key validation and setup flow.

## API Key Validation Flow

```javascript
async function validateApiKey() {
  console.log('[Auth] Checking API key validation status...');

  const apiKey = localStorage.getItem('ape-api-key');
  const lastValidated = localStorage.getItem('ape-api-key-last-validated');

  // Check if key exists and was validated within 24 hours
  if (apiKey && lastValidated) {
    const hoursSinceValidation = (Date.now() - parseInt(lastValidated)) / (1000 * 60 * 60);
    if (hoursSinceValidation < 24) {
      console.log('[Auth] API key valid, last validated', hoursSinceValidation.toFixed(1), 'hours ago');
      return true;
    }
  }

  // Need validation
  if (apiKey) {
    console.log('[Auth] API key needs revalidation...');
    const isValid = await testApiKey(apiKey);
    if (isValid) {
      localStorage.setItem('ape-api-key-last-validated', Date.now().toString());
      console.log('[Auth] API key revalidated successfully');
      return true;
    } else {
      console.log('[Auth] API key validation failed, clearing...');
      localStorage.removeItem('ape-api-key');
      localStorage.removeItem('ape-api-key-last-validated');
    }
  }

  return false;
}

async function testApiKey(apiKey) {
  try {
    const response = await fetch('https://api.wearables-ape.io/models/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
    });

    console.log('[Auth] API key test response status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('[Auth] API key test failed:', error);
    return false;
  }
}
```

## Setup Popup Implementation

```javascript
function showApiKeySetupPopup() {
  console.log('[Auth] Showing API key setup popup...');

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'api-key-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
  `;

  // Create modal content
  overlay.innerHTML = `
    <div style="background: white; padding: 24px; border-radius: 12px; max-width: 500px; width: 90%;">
      <h2 style="margin: 0 0 8px 0;">One-Time Setup Required to Enjoy Vibe Coded Prototypes</h2>

      <p style="margin: 0 0 16px 0;">
        <a href="http://fburl.com/vibe-code" target="_blank" style="color: #007bff;">Vibe Coding @ Meta (XFN-Friendly)</a>
      </p>

      <p style="margin: 0 0 16px 0;">
        Get your API key here:<br>
        <a href="https://wearables-ape.io/consent?redirect=https://wearables-ape.io/settings/api-keys" target="_blank" style="color: #007bff;">
          wearables-ape.io/consent
        </a>
      </p>

      <div style="display: flex; gap: 12px;">
        <input type="text" id="api-key-input" placeholder="Paste your API key here"
               style="flex: 1; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px;">
        <button id="api-key-save-btn"
                style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
          Save
        </button>
      </div>

      <div id="api-key-message" style="margin-top: 12px; padding: 8px; border-radius: 4px; display: none;"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add event listener
  const saveBtn = document.getElementById('api-key-save-btn');
  const input = document.getElementById('api-key-input');
  const messageDiv = document.getElementById('api-key-message');

  saveBtn.addEventListener('click', async () => {
    const apiKey = input.value.trim();
    if (!apiKey) {
      showMessage('Please enter an API key', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Validating...';
    console.log('[Auth] Validating entered API key...');

    const isValid = await testApiKey(apiKey);

    if (isValid) {
      localStorage.setItem('ape-api-key', apiKey);
      localStorage.setItem('ape-api-key-last-validated', Date.now().toString());
      showMessage('Success! Your API key has been saved.', 'success');
      console.log('[Auth] API key saved successfully, reloading...');
      setTimeout(() => location.reload(), 1500);
    } else {
      showMessage('Invalid API Key. Please check your key and try again.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    messageDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
  }
}
```

## App Initialization Pattern

```javascript
async function initApp() {
  console.log('[App] Initializing application...');

  const isValid = await validateApiKey();

  if (!isValid) {
    showApiKeySetupPopup();
    return; // Stop initialization until valid key
  }

  console.log('[App] API key valid, proceeding with app initialization...');
  // Continue with app setup
}

// Call on page load
document.addEventListener('DOMContentLoaded', initApp);
```

## Helper: Get API Key

```javascript
function getApiKey() {
  const key = localStorage.getItem('ape-api-key');
  if (!key) {
    throw new Error('No API key found. Please complete setup.');
  }
  return key;
}
```
