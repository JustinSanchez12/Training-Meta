---
description: File upload and download implementation for APE cloud file storage with blob handling
---

# APE File Storage Skill

Complete implementation for file upload/download using APE cloud storage.

## Key Facts

- **Expiration:** Files are stored for 30 days only
- **Upload:** `multipart/form-data`
- **Download:** Returns binary blob with Content-Type header

## File Upload Implementation

```javascript
/**
 * Upload a file to APE cloud storage
 * @param {File} file - File object to upload
 * @param {string} apiKey - APE API key
 * @returns {Promise<string>} - File ID for retrieval
 */
async function uploadFile(file, apiKey) {
  console.log(`[FileStorage] Uploading: ${file.name} (${file.size} bytes)`);

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://api.wearables-ape.io/files/', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  console.log(`[FileStorage] Upload response status: ${response.status}`);

  if (!response.ok) {
    const error = await response.text();
    console.error('[FileStorage] Upload failed:', error);
    throw new Error(`Upload failed: ${response.status}`);
  }

  const result = await response.json();
  console.log(`[FileStorage] Upload success, file_id: ${result.file_id}`);

  return result.file_id;
}
```

## File Download Implementation

```javascript
/**
 * Download a file from APE cloud storage
 * @param {string} fileId - File ID from upload
 * @param {string} apiKey - APE API key
 * @returns {Promise<Blob>} - File as Blob
 */
async function downloadFile(fileId, apiKey) {
  console.log(`[FileStorage] Downloading: ${fileId}`);

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

  console.log(`[FileStorage] Download response status: ${response.status}`);
  console.log(`[FileStorage] Content-Type: ${response.headers.get('content-type')}`);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  console.log(`[FileStorage] Downloaded blob size: ${blob.size} bytes`);

  return blob;
}
```

## Display Image Preview

```javascript
/**
 * Download and display image in an img element
 * @param {string} fileId - File ID
 * @param {HTMLImageElement} imgElement - Target img element
 * @param {string} apiKey - APE API key
 */
async function displayImage(fileId, imgElement, apiKey) {
  console.log(`[FileStorage] Loading image: ${fileId}`);

  const blob = await downloadFile(fileId, apiKey);
  const contentType = blob.type;

  if (!contentType.startsWith('image/')) {
    throw new Error(`Not an image: ${contentType}`);
  }

  // Create object URL for display
  const imageUrl = URL.createObjectURL(blob);
  imgElement.src = imageUrl;

  console.log(`[FileStorage] Image displayed: ${imageUrl}`);

  // Clean up URL when image is removed
  imgElement.onload = () => {
    // URL can be revoked after image loads if not needed elsewhere
    // URL.revokeObjectURL(imageUrl);
  };
}
```

## Trigger File Download

```javascript
/**
 * Download file and trigger browser download
 * @param {string} fileId - File ID
 * @param {string} filename - Suggested filename for download
 * @param {string} apiKey - APE API key
 */
async function triggerDownload(fileId, filename, apiKey) {
  console.log(`[FileStorage] Preparing download: ${filename}`);

  const blob = await downloadFile(fileId, apiKey);

  // Create download link
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(downloadUrl);

  console.log(`[FileStorage] Download triggered: ${filename}`);
}
```

## Read Text File Content

```javascript
/**
 * Download file and read as text
 * @param {string} fileId - File ID
 * @param {string} apiKey - APE API key
 * @returns {Promise<string>} - File content as text
 */
async function readTextFile(fileId, apiKey) {
  console.log(`[FileStorage] Reading text file: ${fileId}`);

  const blob = await downloadFile(fileId, apiKey);
  const text = await blob.text();

  console.log(`[FileStorage] Text content length: ${text.length} chars`);
  return text;
}
```

## Complete File Manager Class

```javascript
/**
 * APE File Storage Manager
 * Handles upload, download, and display of files
 */
class ApeFileManager {
  constructor() {
    this.uploadedFiles = new Map(); // Track uploaded files
  }

  getApiKey() {
    const key = localStorage.getItem('ape-api-key');
    if (!key) throw new Error('No API key found');
    return key;
  }

  /**
   * Upload file and track it
   * @param {File} file - File to upload
   * @returns {Promise<Object>} - {fileId, filename, type, size, uploadedAt}
   */
  async upload(file) {
    const fileId = await uploadFile(file, this.getApiKey());

    const metadata = {
      fileId,
      filename: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    this.uploadedFiles.set(fileId, metadata);
    console.log(`[FileManager] Tracked file:`, metadata);

    return metadata;
  }

  /**
   * Download file as blob
   * @param {string} fileId - File ID
   * @returns {Promise<Blob>}
   */
  async download(fileId) {
    return downloadFile(fileId, this.getApiKey());
  }

  /**
   * Display image in element
   * @param {string} fileId - File ID
   * @param {HTMLImageElement} element - Target element
   */
  async displayImage(fileId, element) {
    return displayImage(fileId, element, this.getApiKey());
  }

  /**
   * Trigger browser file download
   * @param {string} fileId - File ID
   * @param {string} filename - Download filename
   */
  async triggerDownload(fileId, filename) {
    return triggerDownload(fileId, filename, this.getApiKey());
  }

  /**
   * Read file as text
   * @param {string} fileId - File ID
   * @returns {Promise<string>}
   */
  async readAsText(fileId) {
    return readTextFile(fileId, this.getApiKey());
  }

  /**
   * Get metadata for tracked file
   * @param {string} fileId - File ID
   * @returns {Object|undefined}
   */
  getMetadata(fileId) {
    return this.uploadedFiles.get(fileId);
  }
}
```

## Usage Example

```javascript
const fileManager = new ApeFileManager();

// Handle file input
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    // Upload
    const metadata = await fileManager.upload(file);
    console.log('Uploaded:', metadata);

    // Store file ID for later use
    localStorage.setItem('lastUploadedFile', metadata.fileId);

    // If image, display preview
    if (file.type.startsWith('image/')) {
      const preview = document.getElementById('preview');
      await fileManager.displayImage(metadata.fileId, preview);
    }

    alert(`File uploaded! Expires: ${metadata.expiresAt}`);
  } catch (error) {
    console.error('Upload failed:', error);
    alert('Upload failed: ' + error.message);
  }
});

// Download button
document.getElementById('downloadBtn').addEventListener('click', async () => {
  const fileId = localStorage.getItem('lastUploadedFile');
  if (!fileId) {
    alert('No file uploaded');
    return;
  }

  const metadata = fileManager.getMetadata(fileId);
  const filename = metadata?.filename || 'download';

  await fileManager.triggerDownload(fileId, filename);
});
```

## Important Reminder

Always inform users that files expire after 30 days:

```javascript
function showUploadSuccess(metadata) {
  const expiresDate = new Date(metadata.expiresAt).toLocaleDateString();
  alert(`File uploaded successfully!\n\nNote: This file will expire on ${expiresDate} (30 days)`);
}
```
