# Binti Events Management System — Frontend

React and TypeScript web application for managing event quotations, invoices, payments, clients, products, and company settings. It includes Binti AI assistance and PDF exports in Corporate and Binti templates.

- **Repository:** See your organization's source control configuration.
- **Backend:** Supabase Edge Functions; see the backend repository's README.

## Features

- Dashboard metrics and business activity summaries.
- Quote and invoice builders, custom terms, PDF export, and email/WhatsApp sharing.
- Quote-to-invoice conversion and invoice payment tracking.
- Client directory and product/service catalog.
- Company profile, tax information, invoice/quote settings, and payment details.
- Responsive interface and Binti AI assistant.
- PDF templates: Classic Formal and Binti Signature.

## Tech stack

- React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4.
- jsPDF for PDF generation; Lucide React for icons.
- Supabase Edge Functions for authenticated API requests and persistence.

## Requirements

- Node.js 18 or later
- npm 9 or later
- A configured Supabase Edge Functions backend and its anon key

## Local development

```sh
git clone <frontend-repository-url>
cd <frontend-repository-directory>
npm install
```

Copy `.env.example` to `.env` and configure:

```env
VITE_API_URL=https://<your-supabase-project-ref>.supabase.co/functions/v1
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_APP_NAME=Binti Events Management System
```

Do not put Supabase service-role keys or other server secrets in frontend variables. Vite-exposed values are included in the client bundle.

Start the development server:

```sh
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Preview the production bundle locally |
| `npm run type-check` | Run TypeScript without emitting files |
| `npm run lint` | Run ESLint |
| `npm run format` | Format supported source files |

The text/PDF utility tests use Node's built-in test runner and TypeScript strip-types support:

```sh
node --experimental-strip-types --test src/utils/text.test.ts src/utils/pdfTerms.test.ts
```

## Deployment

Configure `VITE_API_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_APP_NAME` in the hosting provider before building. Connect the frontend repository to your selected hosting provider and deploy the Vite app; the static output directory is `dist`.

The frontend API client maps `/api/...` application routes to the corresponding Supabase Edge Function names. Backend configuration and deployment are documented in the backend repository.

## License

Copyright © 2026 Binti Events. All rights reserved.
