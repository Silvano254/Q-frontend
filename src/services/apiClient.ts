import { getApiUrl } from '../config/api';

const TOKEN_KEY = 'binti_token';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // ms
const REQUEST_TIMEOUT = 30000; // ms

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Exponential backoff helper for retry logic
 */
function getRetryDelay(retryCount: number): number {
  return INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
}

/**
 * Make an API request with retry logic and timeout
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  requireAuth = true
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers = new Headers(init.headers);
      headers.set('Content-Type', 'application/json');

      const token = getAuthToken();
      if (requireAuth) {
        if (!token) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        headers.set('Authorization', `Bearer ${token}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch(getApiUrl(path), {
          ...init,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const payload = await response.json().catch((): null => null);

        if (!response.ok) {
          const errorMessage =
            payload?.message ||
            payload?.error ||
            `Request failed (${response.status}).`;
          throw new Error(errorMessage);
        }

        return payload as T;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors
      if (lastError.message.includes('session has expired')) {
        throw lastError;
      }

      // Don't retry on non-retryable errors
      if (lastError.name === 'AbortError') {
        lastError = new Error('Request timeout. Please try again.');
      }

      if (attempt < MAX_RETRIES) {
        const delayMs = getRetryDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Request failed after maximum retries.');
}
