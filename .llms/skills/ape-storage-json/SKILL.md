---
description: Complete StorageClass implementation for APE structured memories (JSON persistence)
---

# APE JSON Storage Skill

Complete implementation for user-specific JSON persistence using APE structured memories.

## Key Concepts

1. **Global namespace** - Keys are globally unique
2. **Strict ownership** - Users can only access their own keys
3. **Key format** - `{app_slug}-{userId}`
4. **Read-before-write** - Always GET before POST to avoid overwrites

## Complete StorageClass Implementation

```javascript
/**
 * APE Structured Memory Storage Class
 * Provides user-specific JSON persistence
 */
class ApeStorage {
  constructor(appSlug) {
    this.appSlug = appSlug;
    this.baseUrl = 'https://api.wearables-ape.io/structured-memories';
    this.userId = null;
    this.memoryKey = null;
    this.data = null;
    this.initialized = false;
  }

  /**
   * Get API key from localStorage
   */
  getApiKey() {
    const key = localStorage.getItem('ape-api-key');
    if (!key) throw new Error('No API key found');
    return key;
  }

  /**
   * Initialize storage - must be called before other operations
   * @param {Object} defaultData - Default data for new users
   */
  async init(defaultData = {}) {
    console.log(`[Storage] Initializing storage for app: ${this.appSlug}`);

    // Phase 1: Get user ID
    this.userId = await this.fetchUserId();
    this.memoryKey = `${this.appSlug}-${this.userId}`;

    console.log(`[Storage] Memory key: ${this.memoryKey}`);

    // Phase 2: Try to load existing data
    const existing = await this.fetch();

    if (existing !== null) {
      // Returning user - load their data
      this.data = existing;
      console.log('[Storage] Loaded existing data:', this.data);
    } else {
      // New user - create with defaults
      this.data = defaultData;
      await this.create(defaultData);
      console.log('[Storage] Created new storage with defaults:', this.data);
    }

    this.initialized = true;
    return this.data;
  }

  /**
   * Fetch current user ID from APE API
   */
  async fetchUserId() {
    console.log('[Storage] Fetching user ID...');

    const response = await fetch('https://api.wearables-ape.io/user/me', {
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const user = await response.json();
    console.log(`[Storage] User ID: ${user.id}, Name: ${user.name}`);

    return user.id;
  }

  /**
   * Fetch data from storage
   * @returns {Object|null} - Data or null if not found
   */
  async fetch() {
    console.log(`[Storage] Fetching data for key: ${this.memoryKey}`);

    const response = await fetch(`${this.baseUrl}/${this.memoryKey}`, {
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`
      }
    });

    console.log(`[Storage] Fetch response status: ${response.status}`);

    if (response.status === 404) {
      console.log('[Storage] No existing data found (new user)');
      return null;
    }

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const result = await response.json();
    return result.value;
  }

  /**
   * Create new storage (only for new users)
   * @param {Object} data - Initial data
   */
  async create(data) {
    console.log('[Storage] Creating new storage...');
    console.log('[Storage] Initial data:', JSON.stringify(data));

    const response = await fetch(`${this.baseUrl}/${this.memoryKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: data })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Create failed: ${response.status} - ${error}`);
    }

    console.log('[Storage] Storage created successfully');
  }

  /**
   * Save current data to storage
   */
  async save() {
    this.ensureInitialized();

    console.log('[Storage] Saving data...');
    console.log('[Storage] Data to save:', JSON.stringify(this.data));

    const response = await fetch(`${this.baseUrl}/${this.memoryKey}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: this.data })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Save failed: ${response.status} - ${error}`);
    }

    console.log('[Storage] Data saved successfully');
  }

  /**
   * Update a specific field using JSONPath
   * @param {string} path - JSONPath (e.g., "$.settings.theme")
   * @param {any} value - New value
   */
  async updateField(path, value) {
    this.ensureInitialized();

    console.log(`[Storage] Updating field: ${path} = ${JSON.stringify(value)}`);

    const encodedPath = encodeURIComponent(path);
    const response = await fetch(`${this.baseUrl}/${this.memoryKey}/in/${encodedPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: value })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update field failed: ${response.status} - ${error}`);
    }

    // Update local data too
    this.setNestedValue(path, value);
    console.log('[Storage] Field updated successfully');
  }

  /**
   * Get a specific field using JSONPath
   * @param {string} path - JSONPath
   * @returns {any} - Field value
   */
  async getField(path) {
    this.ensureInitialized();

    console.log(`[Storage] Getting field: ${path}`);

    const encodedPath = encodeURIComponent(path);
    const response = await fetch(`${this.baseUrl}/${this.memoryKey}/in/${encodedPath}`, {
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Get field failed: ${response.status}`);
    }

    const result = await response.json();
    return result.value;
  }

  /**
   * Delete all storage (reset)
   */
  async reset() {
    this.ensureInitialized();

    console.log('[Storage] Deleting all data...');

    const response = await fetch(`${this.baseUrl}/${this.memoryKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status}`);
    }

    this.data = null;
    this.initialized = false;
    console.log('[Storage] Data deleted successfully');
  }

  /**
   * Helper: Set nested value from JSONPath
   */
  setNestedValue(path, value) {
    // Convert $.foo.bar to ['foo', 'bar']
    const keys = path.replace(/^\$\.?/, '').split('.');
    let obj = this.data;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
  }

  /**
   * Helper: Ensure storage is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Storage not initialized. Call init() first.');
    }
  }

  /**
   * Get current data (in-memory)
   */
  getData() {
    return this.data;
  }

  /**
   * Update local data (call save() to persist)
   */
  setData(newData) {
    this.data = newData;
  }
}
```

## Usage Example

```javascript
// Initialize storage
const storage = new ApeStorage('my-awesome-app');

// Default data for new users
const defaults = {
  settings: {
    theme: 'light',
    notifications: true
  },
  profile: {
    name: '',
    preferences: []
  },
  history: []
};

// Initialize (call once on app load)
await storage.init(defaults);

// Read data
const theme = storage.getData().settings.theme;
console.log('Current theme:', theme);

// Update and save
storage.getData().settings.theme = 'dark';
await storage.save();

// Update specific field (more efficient for large objects)
await storage.updateField('$.settings.notifications', false);

// Add to array
storage.getData().history.push({ action: 'login', timestamp: Date.now() });
await storage.save();

// Reset all data
// await storage.reset();
```

## App Integration Pattern

```javascript
class MyApp {
  constructor() {
    this.storage = new ApeStorage('my-app');
  }

  async init() {
    console.log('[App] Initializing...');

    // Validate API key first
    const isValid = await validateApiKey();
    if (!isValid) {
      showApiKeySetupPopup();
      return;
    }

    // Initialize storage
    await this.storage.init({
      visits: 0,
      lastVisit: null,
      savedItems: []
    });

    // Track visit
    this.storage.getData().visits++;
    this.storage.getData().lastVisit = new Date().toISOString();
    await this.storage.save();

    console.log(`[App] Welcome back! Visit #${this.storage.getData().visits}`);
  }
}

const app = new MyApp();
document.addEventListener('DOMContentLoaded', () => app.init());
```
