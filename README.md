# Binti Events Corporate Suite — Frontend Client

> **Author:** Silvano Otieno  
> **Repository:** [Silvano254/Q-frontend](https://github.com/Silvano254/Q-frontend.git)  
> **Live Web Application:** [q-frontend-weld.vercel.app](https://q-frontend-weld.vercel.app)

Binti Events Corporate Suite is a modern, high-performance web application engineered for event management companies, marquee equipment providers, and corporate event planners. It provides automated quotations, tax invoice generation, payment ledgers, client relationship management, and **Binti**—an AI assistant powered by Google Gemini.

---

## ✨ Features & Functional Modules

### 1. 📊 Executive Dashboard & AI Analyst
- Real-time KPI summary (Total Revenue, Active Quotes, Issued Invoices, Pending Balances).
- Executive business report generation via **Binti AI Analyst**.
- Cash flow recovery metrics and conversion rate indicators.

### 2. 🧾 Quotations & Proposals Management
- Custom proposal creation with catalog equipment selection, line-item quantities, and custom discounting.
- **Optional Transport & Logistics Integration**: An interactive checkbox allows the admin to specify custom transport/rigging costs and descriptions directly into quotation line items.
- Proposal status tracking (*Draft*, *Sent*, *Converted*, *Expired*).
- **1-Click Conversion**: Automatically convert approved Quotations into official Tax Invoices.
- **Bank-Free Quotations**: Quotations strictly detail scope of work and pricing terms without bank/payment instructions.
- PDF generation (Binti Signature & Classic Corporate templates) and client email/WhatsApp sharing utilities.

### 3. 💳 Tax Invoices & Billing Ledger
- Official Tax Invoice generation with corporate tax numbers/PINs and due dates.
- **Transport & Logistics Line Items**: Add custom transport amounts with auto-calculated VAT and totals.
- **Conditional Banking Details**: Payment instructions and bank account details display **only** on invoices that have an active outstanding balance. Fully settled invoices omit banking details and reflect **Fully Paid / Settled** status.
- Partial & full payment recording with automated balance deduction.
- Dual PDF design exports (**Binti Signature** & **Classic Corporate**) and printable payment receipts.

### 4. 💰 Payments Ledger & Manual Receipts
- Centralized tracking for M-Pesa, Bank Transfers, Cheques, and Cash payments.
- Automatic balance deduction and printable transaction vouchers.
- Filter by payment method, date range, or client account.

### 5. 👥 Clients Directory
- Corporate and individual client profiles with contact details, tax numbers, and communication history.
- Lifetime Value (LTV) revenue analytics and transaction histories per client.

### 6. 🎪 Products & Services Catalog
- Inventory catalog for Tents & Marquees, Decor & Styling, Furniture & Seating, Audio & Lighting, Catering Equipment, and Consultation.
- Real-time stock status, billing units, and category pricing configuration.

### 7. 🔔 Smart Notification Center
- Real-time tracking of overdue invoices and upcoming payment due dates (3-day lookahead).
- **Persistent Clear & Dismiss**: Global clearance timestamp (`binti_notifications_cleared_at`) and individual alert dismissals persist across logins and devices.
- **Persistent Read States**: Alerts clicked by the user remain marked as read across page reloads.

### 8. 📱 Mobile & Responsive Experience
- Full mobile responsiveness with zero horizontal scroll overflow.
- Mobile navigation drawer, adaptive popovers, and touch-optimized data tables.

### 9. 🤖 Binti AI Assistant
- Interactive assistant (`Binti ✨`) powered by Google Gemini.
- Contextual suggestions across Dashboard, Quotes, Invoices, and Clients modules.
- AI contract terms generation and email dispatch drafting.

---

## 🛠️ Technology Stack

- **Framework**: React 18 / TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS / Custom Glassmorphism UI tokens
- **Icons**: Lucide React
- **Document Export**: html2canvas / jsPDF / DOM-to-Image
- **Deployment**: Vercel

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- Node.js `>= 18.0.0`
- npm `>= 9.0.0`

### 2. Installation
```bash
# Clone repository
git clone https://github.com/Silvano254/Q-frontend.git
cd Q-frontend

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Production backend Supabase/Edge Function endpoint
VITE_API_URL=https://ltinjyvcrgwcvudrnfby.supabase.co/functions/v1

# Application Branding Title
VITE_APP_NAME=Binti Events Corporate Suite
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Production Build
```bash
npm run build
```

---

## 🔒 License & Ownership
Copyright © 2026 Binti Events. All rights reserved.
