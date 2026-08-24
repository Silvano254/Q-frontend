# FIX: ai-chat Edge Function CORS breaks Binti on production

## Symptom
- On https://q-frontend-weld.vercel.app, Binti AI chat always fails with
  "couldn't reach the AI service" after ~8s of retries.
- Supabase logs show repeated `OPTIONS /functions/v1/ai-chat -> 200`
  but **zero POSTs arriving**.
- All other Edge Functions work fine.

## Root cause (verified 25 Aug 2026)
The currently deployed `ai-chat` function returns a hardcoded dev origin:

| Request Origin | ai-chat replies `Access-Control-Allow-Origin` |
|---|---|
| https://q-frontend-weld.vercel.app | http://localhost:5173 ❌ |
| http://127.0.0.1:* | http://localhost:5173 ❌ |
| http://localhost:5500 | http://localhost:5173 ❌ |
| http://localhost:4173 | http://localhost:4173 ✓ |

Browser rejects the preflight answer (origin mismatch) and never sends the
actual POST. Every other function (clients, invoices, auth-login, settings,
ai-email-draft) correctly returns `*`, which is why only Binti is down.
Note: `/api/ai/recommend-terms` maps to this same function, so it is down too.

## Fix (backend repo — supabase/functions/ai-chat/index.ts)

Make the CORS handling identical to the other healthy functions.

### Option A — quickest restore (matches every other function)
```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```
This app authenticates via `Authorization: Bearer <JWT>` (no cookies), so `*`
is safe and is already what the rest of the platform uses.

### Option B — explicit allow-list (stricter, recommended long-term)
```ts
const ALLOWED_ORIGINS = new Set([
  "https://q-frontend-weld.vercel.app",
  "https://bintievents.com",        // custom domain, if used
  "http://localhost:5173",          // vite dev
  "http://localhost:4173",          // vite preview
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, accept",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
```

### Critical checklist
1. The **OPTIONS branch** must return HTTP 200 with these headers.
2. **Every response of the POST flow** (success, 401, 500, streaming…) must
   also include the same headers — a common regression is attaching them only
   to the OPTIONS reply.
3. Do not echo arbitrary origins back unconditionally unless you intend to
   allow all sites.

## Deploy & verify
```bash
supabase functions deploy ai-chat
```
Then verify from any machine (expect `*` or your production origin):
```powershell
curl.exe -i -X OPTIONS "https://ltinjyvcrgwcvudrnfby.supabase.co/functions/v1/ai-chat" ^
  -H "Origin: https://q-frontend-weld.vercel.app" ^
  -H "Access-Control-Request-Method: POST"
```
Binti chat should respond immediately afterwards — no frontend rebuild needed.
