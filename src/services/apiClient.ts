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
  init: RequestInit & { timeoutMs?: number } = {},
  requireAuth = true
): Promise<T> {
  let lastError: Error | null = null;

  // Per-call timeout override — long-running operations like Binti's AI chat
  // legitimately need far more than the default 30s (thinking-class Gemini
  // models can reason for 30-60s before answering).
  const { timeoutMs, ...restInit } = init;
  const effectiveTimeout = timeoutMs ?? REQUEST_TIMEOUT;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers = new Headers(init.headers);
      headers.set('Content-Type', 'application/json');

      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      if (supabaseAnonKey) {
        headers.set('apikey', supabaseAnonKey);
      }

      const token = getAuthToken();
      if (requireAuth) {
        if (!token) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        headers.set('Authorization', `Bearer ${token}`);
      } else if (!headers.has('Authorization') && supabaseAnonKey) {
        headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

      try {
        let requestBody = init.body;
        const method = (init.method || 'GET').toUpperCase();

        if (!requestBody && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
          if (path.includes('reset')) {
            requestBody = JSON.stringify({ action: 'reset', confirm: true, reset: true });
          } else {
            requestBody = JSON.stringify({});
          }
        }

        const response = await fetch(getApiUrl(path), {
          ...restInit,
          body: requestBody,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Guard against SPA-fallback / proxy responses that answer with HTML
        // (often with HTTP 200) instead of JSON. Without this guard a
        // misconfigured VITE_API_URL silently resolves to null and the UI only
        // reports a vague "service unavailable" while every feature breaks.
        const contentType = response.headers.get('content-type') || '';
        const isJsonResponse = contentType.includes('application/json');
        const payload = isJsonResponse
          ? await response.json().catch((): null => null)
          : null;

        if (!isJsonResponse && contentType) {
          const configError = new Error(
            'The API endpoint returned a non-JSON response. Check that VITE_API_URL points to your Supabase Edge Functions URL.'
          ) as Error & { status?: number };
          configError.name = 'ConfigError';
          configError.status = response.status;
          throw configError;
        }

        if (!response.ok) {
          // A rejected authenticated request means our stored JWT is dead
          // (server-side expiry is independent of the UI inactivity timer).
          // Clear it immediately so the app prompts for a fresh sign-in
          // instead of silently failing on every subsequent request.
          if (requireAuth && response.status === 401) {
            clearAuthToken();
            const sessionError = new Error(
              'Your session has expired. Please sign in again.'
            ) as Error & { status?: number };
            sessionError.status = 401;
            throw sessionError;
          }
          const errorMessage =
            payload?.message ||
            payload?.error ||
            `Request failed (${response.status}).`;
          const httpError = new Error(errorMessage) as Error & { status?: number };
          httpError.status = response.status;
          throw httpError;
        }

        // Handle both raw payloads (Express) and wrapped { success: true, data: [...] } payloads (Edge Functions)
        if (
          payload &&
          typeof payload === 'object' &&
          'success' in payload &&
          'data' in payload &&
          payload.data !== undefined &&
          !('token' in payload)
        ) {
          return payload.data as T;
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

      // Configuration/routing problems are never transient — retrying only
      // stalls the UI (e.g. a spinner hanging on every AI chat message).
      if (lastError.name === 'ConfigError') {
        throw lastError;
      }

      // Timeouts & caller cancellations: fail fast instead of stacking
      // 30s timeouts × retries (~2 minutes of dead air in the worst case).
      if (lastError.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }

      // 4xx client errors (except 408 Request Timeout / 429 Too Many Requests)
      // will not succeed on retry.
      const httpStatus = (lastError as Error & { status?: number }).status;
      const isClientError =
        typeof httpStatus === 'number' &&
        httpStatus >= 400 &&
        httpStatus < 500 &&
        httpStatus !== 408 &&
        httpStatus !== 429;
      if (isClientError) {
        throw lastError;
      }

      if (attempt < MAX_RETRIES) {
        const delayMs = getRetryDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Request failed after maximum retries.');
}
