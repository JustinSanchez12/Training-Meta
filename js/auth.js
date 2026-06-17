// ============================================================
// auth.js - Local mode (no API key required)
// ============================================================

async function validateApiKey() {
  console.log('[Auth] Local mode: skipping API key validation');
  return true;
}

function showApiKeySetupPopup() {
  console.log('[Auth] Local mode: no API key setup needed');
}

function getApiKey() {
  return 'local';
}
