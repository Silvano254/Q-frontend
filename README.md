# Binti Events — Frontend Client (React + Vite)

Corporate Quotation, Tax Invoice & Billing Ledger Web Application.

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Dev Server
```bash
npm run dev
```
The client app runs on `http://localhost:5173`. Any `/api/*` requests will be proxied automatically to `http://localhost:3000`.

---

## 🚀 Deploying to Vercel (Step-by-Step)

You can deploy this React client application to [Vercel](https://vercel.com) in under 2 minutes.

### Option A: Deploy via Vercel Dashboard

1. Push your code (or the `client` folder) to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... -> Project**.
3. Import your repository.
4. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` *(if deploying from a monorepo)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - `VITE_API_URL`: `https://binti-events-backend.onrender.com` *(Replace with your live Render backend URL)*
6. Click **Deploy**.

---

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the client directory
cd client
vercel
```

When prompted:
- **Set up and deploy?**: `Yes`
- **Which scope?**: Choose your Vercel account
- **Link to existing project?**: `No`
- **Project Name**: `binti-events-client`
- **In which directory is your code located?**: `./`

To set the production environment variable via CLI:
```bash
vercel env add VITE_API_URL production https://binti-events-backend.onrender.com
vercel --prod
```

---

## 🔗 Environment Variables Reference

| Variable | Local Default | Production (Vercel) Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | *(empty)* | `https://<your-render-app>.onrender.com` | Base URL of your deployed Express API backend service |
| `VITE_APP_NAME` | `Binti Events` | `Binti Events` | App branding title |
