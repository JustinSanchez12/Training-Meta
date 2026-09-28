import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  // The in-progress workout session is persisted here (src/features/workout/sessionStorage.ts).
  sessionStorage.clear();
});
