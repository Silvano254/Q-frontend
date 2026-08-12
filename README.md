# Binti Events Corporate Suite — Frontend Client

> **Author:** Silvano Otieno  
> **Repository:** [Silvano254/Q-frontend](https://github.com/Silvano254/Q-frontend.git)  
> **Live Web Application:** [binti-events.vercel.app](https://q-frontend-weld.vercel.app)

Binti Events Corporate Suite is a modern, high-performance web application engineered for event management companies, marquee equipment providers, and corporate event planners. It provides automated quotations, tax invoice generation, payment ledgers, client relationship management, and **Binti**—an AI assistant powered by Google Gemini 3.5+.

---

## ✨ Features & Functional Modules

### 1. 📊 Executive Dashboard & AI Analyst
- Real-time KPI summary (Total Revenue, Active Quotes, Issued Invoices, Pending Balances).
- Executive business report generation via **Binti AI Analyst**.
- Cash flow recovery metrics and conversion rate indicators.

### 2. 🧾 Quotations & Proposals Management
- Custom proposal creation with catalog equipment selection, line-item quantities, and custom discounting.
- Proposal status tracking (*Draft*, *Sent*, *Converted*, *Declined*).
- **1-Click Conversion**: Automatically convert approved Quotations into official Tax Invoices.
- PDF generation and client email/WhatsApp sharing utilities.

### 3. 💳 Tax Invoices & Billing Ledger
- Official Tax Invoice generation with corporate tax numbers/PINs and due dates.
- Partial & full payment recording with automated balance calculation.
- PDF downloads and printable payment receipts.
- Payment status indicators (*Paid*, *Partially Paid*, *Unpaid*, *Overdue*).

### 4. 💰 Payments Ledger
- Centralized tracking for M-Pesa, Bank Transfers, Cheques, and Cash payments.
- Automatic balance deduction and printable transaction vouchers.

### 5. 👥 Clients Directory
- Corporate and individual client profiles with contact details, tax numbers, and communication history.
- Lifetime Value (LTV) revenue analytics per client.

### 6. 🎪 Products & Services Catalog
- Inventory catalog for Tents & Marquees, Decor & Styling, Furniture & Seating, Audio & Lighting, Catering Equipment, and Consultation.
- Real-time stock status and category pricing configuration.

### 7. 🤖 Binti AI Assistant
- Interactive floating assistant (`Binti ✨`) powered by Google Gemini 3.5+ backend REST integration.
- Contextual suggestions across Dashboard, Quotes, Invoices, and Clients modules.
- Non-blocking onboarding introduction card.
- Live business context metric bar and Quick Action Cards.

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
# Optional production backend API URL (Leave empty to use Vite dev proxy to http://localhost:3000)
VITE_API_URL=

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

## 🔒 Security & Privacy
- **Zero Client API Keys**: Frontend holds no API credentials; 100% of AI requests delegate to the secure Render backend.
- **WebAuthn Biometric Authentication**: Native biometric passkey login integration.

---

## 👤 Author & Support
- **Author**: Silvano Otieno
- **GitHub**: [@Silvano254](https://github.com/Silvano254)
- **License**: MIT
