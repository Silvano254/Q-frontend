const RAW_API_URL = (import.meta.env.VITE_API_URL as string) || '';

export const API_BASE_URL = RAW_API_URL.replace(/\/$/, '');

/**
 * Resolves full endpoint path for API requests.
 * In local development (empty VITE_API_URL): returns relative '/api/...' path to leverage Vite proxy.
 * In production on Vercel: prepends VITE_API_URL (e.g. 'https://binti-events-backend.onrender.com/api/...').
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}
