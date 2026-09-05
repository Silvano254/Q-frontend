const RAW_API_URL = (import.meta.env.VITE_API_URL as string) || '';

export const API_BASE_URL = RAW_API_URL.replace(/\/$/, '');

// Fail loudly at startup when the API base URL is missing. With a blank value
// every request targets this app's own origin, where the SPA fallback (e.g. the
// vercel.json rewrite) silently answers with index.html — the classic root
// cause of a completely unresponsive Binti AI chat after a rebuild.
if (!RAW_API_URL && typeof console !== 'undefined') {
  console.error(
    '[Binti] VITE_API_URL is not configured. AI chat and all data endpoints will fail. ' +
      'Set it to your Supabase Edge Functions URL ' +
      '(https://<your-project-ref>.supabase.co/functions/v1) in .env or your hosting ' +
      'provider environment settings, then rebuild.'
  );
}

/**
 * Maps Express-style REST routes to Supabase Edge Function names
 */
function mapToEdgeFunction(path: string): string {
  const normalized = path.replace(/^\/api\//, '').replace(/^\//, '');

  if (normalized.startsWith('auth/login')) return 'auth-login';
  if (normalized.startsWith('auth/biometric-login')) return 'auth-biometric-login';
  if (normalized.startsWith('auth/register-biometric')) return 'auth-register-biometric';
  if (normalized.startsWith('auth/verify')) return 'auth-verify';
  if (normalized.startsWith('auth/logout')) return 'auth-logout';
  if (normalized.startsWith('auth/request-reset') || normalized.startsWith('auth/verify-reset-otp')) return 'auth-reset';
  if (normalized.startsWith('auth/request-profile-update-otp') || normalized.startsWith('auth/verify-profile-update')) return 'auth-profile-update';
  if (normalized.startsWith('auth/seed-admin')) return 'auth-seed-admin';
  if (normalized.startsWith('import-products')) return 'import-products';
  if (normalized.startsWith('expenses')) return 'expenses';
  if (normalized.startsWith('clients')) return 'clients';
  if (normalized.startsWith('invoices') && normalized.includes('payments')) return 'payments';
  if (normalized.startsWith('invoices')) return 'invoices';
  if (normalized.startsWith('quotes')) return 'quotes';
  if (normalized.startsWith('products')) return 'products';
  if (normalized.startsWith('payments')) return 'payments';
  if (normalized.startsWith('analytics')) return 'analytics';
  if (normalized.startsWith('settings')) return 'settings';
  if (normalized.startsWith('email/send')) return 'email-send';
  if (normalized.startsWith('ai/chat')) return 'ai-chat';
  if (normalized.startsWith('ai/draft-email')) return 'ai-email-draft';
  if (normalized.startsWith('ai/recommend-terms')) return 'ai-chat';

  return normalized;
}

/**
 * Resolves full endpoint path for API requests.
 * Supports both Express backend (/api/...) and Supabase Edge Functions (/functions/v1/...).
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!API_BASE_URL) {
    return cleanPath;
  }

  // When configured to point to Supabase Edge Functions
  if (API_BASE_URL.includes('functions/v1') || API_BASE_URL.includes('supabase.co')) {
    const rawNoPrefix = cleanPath.replace(/^\/api\//, '').replace(/^\//, '');
    const parts = rawNoPrefix.split('/');
    const subResource = parts[1]; // e.g. the ID (e.g. /api/quotes/q_123)

    const edgeFunctionName = mapToEdgeFunction(cleanPath);
    
    const isSpecialAction = ['chat', 'draft-email', 'recommend-terms', 'login', 'verify', 'logout', 'request-reset', 'verify-reset-otp', 'biometric-login', 'register-biometric', 'request-profile-update-otp', 'verify-profile-update', 'seed-admin', 'send'].includes(subResource);
    if (subResource && !isSpecialAction) {
      const separator = edgeFunctionName.includes('?') ? '&' : '?';
      return `${API_BASE_URL}/${edgeFunctionName}${separator}id=${encodeURIComponent(subResource)}`;
    }

    return `${API_BASE_URL}/${edgeFunctionName}`;
  }

  return `${API_BASE_URL}${cleanPath}`;
}

