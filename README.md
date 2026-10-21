# RiskPulse

RiskPulse is a modern, high-fidelity full-stack SaaS application built for Managed Service Providers (MSPs) to monitor the financial and cybersecurity risks of their small and medium business (SME) clients. It integrates security awareness with financial insights, includes an AI Risk Advisor, automated Fraud Detection, Vendor Risk dashboards, custom PDF report exports, a Mini RAG knowledge base for uploaded documents, and an interactive AI Chatbot with source citations.

---

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (v4)
- **Database & Auth**: Supabase (PostgreSQL with pgvector for embeddings)
- **AI Integration**: OpenAI GPT-4o-mini & Text Embeddings
- **PDF Engine**: jsPDF server-side buffer compilation
- **Charts**: Recharts Responsive Visualizers

---

## 🛠️ Key Features

1. **MSP Workspace Switcher**: Manage multiple SME clients from a single, responsive panel with a clean dark theme (inspired by Stripe/Linear).
2. **Dual-Mode Adapter**: Runs instantly out-of-the-box using a high-fidelity **Local Demo Mode** (persisting updates to a local `db.json` file) when database environment variables are omitted, automatically upgrading to **Supabase Integration** when credentials are added.
3. **Cybersecurity & Financial Metrics Calculation**: Calculates working capital, Quick Ratio, Current Ratio, Debt Ratio, cash runway, and customer/vendor concentration, alongside a weighted Cybersecurity Risk Score.
4. **AI Risk Advisor**: Merges financial and security scores into a contextual executive summary prompt. Uses OpenAI API with a local rule-based fallback.
5. **Mini RAG & Citations Chatbot**: Upload documents (policies, contracts, agreements) and query them. Highlights document sources (with clickable citations) in the floating bot assistant.
6. **Automated Fraud Audit Ledger**: Flags duplicate invoices, off-hours transaction outlays, and volume spending spikes in real-time.
7. **Ad-hoc PDF Export**: Generate and download comprehensive, multi-page risk audit summaries containing ratios, metrics tables, warning flags, and next steps.

---

## 📦 Setup & Installation

### 1. Prerequisites
Ensure you have **Node.js 18+** installed:
```bash
node -v
npm -v
```

### 2. Install Dependencies
Run the installation command inside the project directory:
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` or `.env.local` file in the root directory:
```env
# OpenAI Configuration (For AI Chatbot & AI Advisor)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (Optional: falls back to local db.json if empty)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Running the Development Server
Launch the development server locally:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🗄️ Database Table Migrations
If you are connecting a production Supabase instance, execute the initial schema query located in [supabase/migrations/20260630_init.sql](file:///Users/sai/riskpulse/supabase/migrations/20260630_init.sql) inside the Supabase SQL Editor.

This automatically configures the tables:
- `organizations` & `users`
- `clients` & `financial_metrics`
- `transactions` & `vendors`
- `cybersecurity_assessments`
- `documents` & `embeddings` (via `pgvector`)
- `reports` & `chat_history`

---

## 🤖 Demo Interaction Guide

- **Login**: Select between the **Analyst** or **Administrator** profiles on the login page to sign in instantly.
- **Client Switcher**: Use the sidebar select menu to switch between Acme Industrial, Stark Energy, or Apex Retail. Each profile loads dedicated metrics, historical cash-flows, and RAG document listings.
- **Trigger Fraud Engine**: Go to the **Fraud Audit** tab and submit a test outlay. Try executing it at **11:00 PM** (to trigger the off-hours check) or matching an existing item's name/amount within 48 hours (to trigger the double-invoice check). The transaction will instantly flag and display an alert.
- **RAG Chatbot**: Click the floating chatbot icon in the bottom right corner, click any suggested question (e.g. *What is our current cyber insurance coverage?*), and read the generated response referencing the indexed files.
- **AI Advisor**: Go to the main dashboard tab and click **Run Risk Analysis** to synthesize executive warnings and suggestions.
