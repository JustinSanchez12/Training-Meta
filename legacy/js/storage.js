// ============================================================
// storage.js - localStorage-backed storage (local mode)
// ============================================================

class ApeStorage {
  constructor(appSlug) {
    this.appSlug = appSlug;
    this.storageKey = `ape-storage-${appSlug}`;
    this.data = null;
    this.initialized = false;
  }

  async init(defaultData = {}) {
    console.log(`[Storage] Initializing local storage for app: ${this.appSlug}`);
    const raw = localStorage.getItem(this.storageKey);
    if (raw !== null) {
      try {
        this.data = JSON.parse(raw);
        console.log('[Storage] Loaded existing data from localStorage');
      } catch (e) {
        console.warn('[Storage] Failed to parse stored data, using defaults');
        this.data = defaultData;
      }
    } else {
      this.data = defaultData;
      console.log('[Storage] No existing data found, using defaults');
    }
    this.initialized = true;
    return this.data;
  }

  async save() {
    this.ensureInitialized();
    console.log('[Storage] Saving data to localStorage...');
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    console.log('[Storage] Data saved successfully');
  }

  async updateField(path, value) {
    this.ensureInitialized();
    console.log(`[Storage] Updating field: ${path}`);
    this.setNestedValue(path, value);
    await this.save();
    console.log('[Storage] Field updated successfully');
  }

  async reset() {
    this.ensureInitialized();
    console.log('[Storage] Deleting all data...');
    localStorage.removeItem(this.storageKey);
    this.data = null;
    this.initialized = false;
    console.log('[Storage] Data deleted successfully');
  }

  setNestedValue(path, value) {
    const keys = path.replace(/^\$\.?/, '').split('.');
    let obj = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Storage not initialized. Call init() first.');
    }
  }

  getData() {
    return this.data;
  }

  setData(newData) {
    this.data = newData;
  }
}
