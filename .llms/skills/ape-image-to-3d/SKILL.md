---
description: Convert 2D images to 3D GLB models using SAM3 segmentation and SAM3D mesh generation APIs. Use when building web apps that need image-to-3D conversion, 3D model generation from photos, or object extraction and mesh creation.
---

# Image-to-3D Generation Skill

Convert 2D images to textured 3D GLB models using a two-step pipeline:
1. **SAM3 Segmentation** - Extract object masks from images using text prompts
2. **SAM3D Mesh Generation** - Convert image + mask to 3D mesh

## API Configuration

```
Base URL: https://api.wearables-ape.io
Endpoint: POST /models/custom/invoke
Auth: Bearer token from localStorage (ape-api-key)
```

**Model IDs:**
- SAM3 Segmentation: `4f04b30f-d74b-4052-a4c0-55f64e50c734`
- SAM3D Mesh: `ce0c17e1-0a8c-4d98-8697-758c9fc2395e`

## API Key Setup (APE Auth Flow)

**IMPORTANT:** Use the APE authentication flow from localStorage, NOT environment variables.

```javascript
// Get API key from APE auth flow (localStorage)
function getApiKey() {
  const key = localStorage.getItem('ape-api-key');
  if (!key) {
    throw new Error('No API key found. Please complete APE setup.');
  }
  return key;
}

// Ensure API key is validated before using this skill
// Use the ape-auth skill's validateApiKey() function first
```

---

## Step 1: SAM3 Segmentation

Segments objects from images based on text prompts. Returns binary masks with confidence scores.

### Request Format

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

### Response Format

```json
{
  "endpoint_name": "SAM3",
  "model_response": {
    "masks": ["<base64-png>", ...],
    "scores": [0.96, 0.85, ...],
    "boxes": [[x1, y1, x2, y2], ...],
    "count": 2
  },
  "latency_ms": 1234,
  "status_code": 200
}
```

**Always select the mask with the highest score for best 3D results.**

---

## Step 2: SAM3D Mesh Generation

Converts image + mask to textured 3D GLB mesh. Processing time: **30-40 seconds**.

### Request Format

```json
{
  "model_id": "ce0c17e1-0a8c-4d98-8697-758c9fc2395e",
  "endpoint_name": "SAM3D",
  "body": {
    "image": "<base64-encoded-image>",
    "mask": "<base64-encoded-mask-from-step1>",
    "output_format": "glb"
  },
  "content_type": "application/json"
}
```

### Response Format

```json
{
  "endpoint_name": "SAM3D",
  "model_response": {
    "glb": "<base64-encoded-glb>",
    "pose": {
      "rotation": [0, 0, 0, 1],
      "translation": [0, 0, 0],
      "scale": [1, 1, 1]
    }
  },
  "latency_ms": 35000,
  "status_code": 200
}
```

**CRITICAL Response Path:** The GLB data is at `model_response.glb`, NOT `result.glb`.

---

## Complete Implementation (APE Auth Integrated)

```javascript
const BASE_URL = 'https://api.wearables-ape.io';
const SAM3_MODEL_ID = '4f04b30f-d74b-4052-a4c0-55f64e50c734';
const SAM3D_MODEL_ID = 'ce0c17e1-0a8c-4d98-8697-758c9fc2395e';

// Use APE auth flow - get key from localStorage
function getApiKey() {
  const key = localStorage.getItem('ape-api-key');
  if (!key) {
    throw new Error('No API key found. Please complete APE setup.');
  }
  return key;
}

// Convert image file to base64
async function imageToBase64(file) {
  console.log('[3D] Converting image to base64:', file.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(result.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Step 1: Segment image
async function segmentImage(imageBase64, prompt) {
  console.log('[3D] Segmenting image with prompt:', prompt);

  const response = await fetch(`${BASE_URL}/models/custom/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model_id: SAM3_MODEL_ID,
      endpoint_name: 'SAM3',
      body: {
        model_operation: 'segment',
        prompt: prompt,
        image: imageBase64
      },
      content_type: 'application/json'
    })
  });

  console.log('[3D] SAM3 response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('[3D] SAM3 API error:', error);
    throw new Error(`SAM3 API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[3D] SAM3 response:', {
    count: data.model_response?.count,
    scores: data.model_response?.scores
  });

  // Check if masks were found
  if (!data.model_response?.masks?.length) {
    throw new Error('No mask found for the given prompt');
  }

  // Return the highest-scoring mask
  const scores = data.model_response.scores;
  const bestIndex = scores.indexOf(Math.max(...scores));
  console.log('[3D] Selected mask index:', bestIndex, 'with score:', scores[bestIndex]);

  return data.model_response.masks[bestIndex];
}

// Step 2: Generate 3D mesh
async function generateMesh(imageBase64, maskBase64) {
  console.log('[3D] Generating 3D mesh (this takes 30-40 seconds)...');

  const response = await fetch(`${BASE_URL}/models/custom/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify({
      model_id: SAM3D_MODEL_ID,
      endpoint_name: 'SAM3D',
      body: {
        image: imageBase64,
        mask: maskBase64,
        output_format: 'glb'
      },
      content_type: 'application/json'
    })
  });

  console.log('[3D] SAM3D response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('[3D] SAM3D API error:', error);
    throw new Error(`SAM3D API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[3D] SAM3D latency:', data.latency_ms, 'ms');

  // CRITICAL: Response path is model_response.glb, NOT result.glb
  if (!data.model_response?.glb) {
    throw new Error('No GLB data returned from mesh generation');
  }

  console.log('[3D] GLB generated successfully');
  return data.model_response.glb;
}

// Convert base64 GLB to Blob URL for use in 3D viewers
function glbBase64ToBlobUrl(glbBase64) {
  console.log('[3D] Converting GLB to blob URL');
  const binary = atob(glbBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  console.log('[3D] Blob URL created:', url);
  return url;
}

// Full pipeline with fallback
async function convertImageTo3D(imageBase64, objectName) {
  console.log('[3D] Starting image-to-3D conversion for:', objectName);

  // Try segmentation with fallback
  let maskBase64;

  try {
    maskBase64 = await segmentImage(imageBase64, objectName);
  } catch (error) {
    if (error.message.includes('No mask found')) {
      console.log('[3D] Original prompt failed, trying fallbacks...');

      // Try generic prompts as fallback
      const fallbacks = ['object', 'main subject', 'foreground'];
      for (const fallback of fallbacks) {
        try {
          console.log('[3D] Trying fallback prompt:', fallback);
          maskBase64 = await segmentImage(imageBase64, fallback);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    if (!maskBase64) {
      throw new Error('Could not segment object from image');
    }
  }

  // Generate 3D mesh
  const glbBase64 = await generateMesh(imageBase64, maskBase64);

  console.log('[3D] Conversion complete!');
  return {
    glbBase64,
    blobUrl: glbBase64ToBlobUrl(glbBase64)
  };
}
```

---

## Fallback Mechanism

SAM3 segmentation can fail when prompts are too specific. Implement fallback:

```javascript
async function attemptSegmentation(imageBase64, prompt) {
  // Try original prompt first
  try {
    return await segmentImage(imageBase64, prompt);
  } catch (error) {
    if (!error.message.includes('No mask found')) {
      throw error;
    }
  }

  // Fallback: try generic prompts
  const fallbackPrompts = ['object', 'main subject', 'foreground', 'thing'];

  for (const fallback of fallbackPrompts) {
    try {
      console.log('[3D] Trying fallback prompt:', fallback);
      return await segmentImage(imageBase64, fallback);
    } catch (e) {
      continue;
    }
  }

  return null; // No mask found with any prompt
}
```

---

## 3D Viewer Integration (Three.js)

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function createViewer(container, glbBlobUrl) {
  console.log('[3D] Creating viewer for:', glbBlobUrl);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(2, 2, 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Load model
  const loader = new GLTFLoader();
  loader.load(glbBlobUrl, (gltf) => {
    console.log('[3D] Model loaded');
    const model = gltf.scene;

    // Center and scale model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;

    model.position.sub(center);
    model.scale.setScalar(scale);

    scene.add(model);
    console.log('[3D] Model added to scene');
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return { scene, camera, renderer, controls };
}
```

---

## Error Handling Reference

| Error | Cause | Solution |
|-------|-------|----------|
| 422 "Input should be a valid dictionary" | `body` sent as base64 string | Send `body` as JSON object |
| 401 Unauthorized | Invalid/missing API key | Check APE auth flow, validate key first |
| Empty masks array | Object not found in image | Use fallback prompts |
| No GLB in response | Reading wrong response path | Use `model_response.glb` |
| Timeout | Large image or slow network | Increase timeout (120s segment, 180s mesh) |

---

## Best Practices

### Image Preparation
1. **Resolution**: Resize to max 1024x1024 before processing
2. **Background**: White/neutral backgrounds produce better results
3. **Object Clarity**: Clear, well-lit objects work best
4. **Single Object**: One main object per image

### Prompt Engineering
1. **Simple Nouns**: "apple", "chair", "car" (not "red delicious apple on table")
2. **Category Fallback**: "animal" instead of "unicorn"
3. **Generic Last Resort**: "object", "main subject", "foreground"

### Timeouts
- SAM3 Segmentation: 120 seconds
- SAM3D Mesh Generation: 180 seconds (typically 30-40s)

### Memory Management
```javascript
// Clean up blob URLs when done
URL.revokeObjectURL(blobUrl);
```
