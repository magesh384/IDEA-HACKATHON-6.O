# AI Business Assistant — MSME / Retail ERP

A full-stack, AI-powered business assistant for small retail and MSME businesses: POS billing
with GST, live profit & loss, inventory, employees, customers, expenses, notifications, and an
AI chatbot (via Groq) grounded in your real business data.

## Stack

- **Frontend:** React (Vite), Tailwind CSS, Framer Motion, Chart.js, React Router
- **Backend:** Node.js, Express, MVC architecture
- **Database:** MySQL
- **Auth:** JWT (access + refresh tokens), bcrypt password hashing
- **AI:** Groq API (chat completions) for the chatbot; a deterministic SQL rules-engine for automatic recommendations and notifications (fast, free, always numerically correct — the LLM is reserved for open-ended natural-language Q&A)

## Quick start (local, without Docker)

### 1. Database

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
```

This creates the `ai_business_assistant` database with demo data. Demo login:
**owner@demo-store.com / Passw0rd!**

### 2. Backend

```bash
cd backend
cp .env.example .env      # fill in DB_PASSWORD, JWT secrets, and GROQ_API_KEY
npm install
npm run dev                # http://localhost:5000
```

Get a free Groq API key at https://console.groq.com — the chatbot and investment-advice
endpoints need it; everything else (billing, inventory, reports, rule-based recommendations)
works without it.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000` (see `frontend/vite.config.js`),
so no CORS config is needed locally.

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env   # fill in secrets
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:5000
- MySQL: localhost:3306 (schema + seed load automatically on first boot)

## Project structure

```
ai-business-assistant/
├── docker-compose.yml
├── backend/
│   ├── server.js                 # Express app entry
│   ├── database/
│   │   ├── schema.sql            # Full MySQL schema (17 tables)
│   │   └── seed.sql              # Demo business, products, invoices, etc.
│   └── src/
│       ├── config/db.js          # MySQL connection pool
│       ├── middleware/           # auth (JWT), error handling
│       ├── utils/                # jwt, gst calc, async handler
│       ├── services/             # groqService, plService (P&L), analyticsService,
│       │                         # recommendationService (rule-based AI), notificationService
│       ├── controllers/          # one per resource (auth, business, product, billing, ...)
│       └── routes/               # one per resource, mounted in server.js
└── frontend/
    └── src/
        ├── api/client.js         # axios instance with JWT refresh interceptor
        ├── context/AuthContext.jsx
        ├── components/           # Layout, ChatWidget, StatCard, ProtectedRoute
        └── pages/                # Login, Signup, RegisterBusiness, Dashboard, Billing,
                                   # Products, Employees, Customers, Expenses, Reports, Settings
```

## What's fully implemented vs. deliberately simplified

**Fully implemented and tested end-to-end** (verified against a live MySQL instance during
development — login, invoice creation with correct CGST/SGST/IGST split, dashboard analytics,
HSN→GST auto-lookup, and rule-based AI recommendations were all exercised with real queries):

- JWT auth (register/login/refresh/forgot-password), role field on users
- Multi-step business onboarding, stored in MySQL
- Product CRUD with HSN-code → GST-rate auto-fetch (reference table, extendable)
- POS billing: cart, per-line GST calc, CGST/SGST vs IGST (inter-state), invoice numbering,
  stock decrement, transactional integrity (rolls back on any failure)
- Profit & Loss engine (revenue, COGS, operating expenses, salaries, loan EMI → net profit)
- Dashboard widgets + charts (revenue/profit trend, expense breakdown, top products, cash flow)
- Employees (CRUD, attendance stub, payroll run that also logs a salary expense)
- Customers (CRUD, purchase history, simple churn-risk + CLV heuristic)
- Expenses (CRUD, categorized)
- Notifications (low stock, out of stock, expiry, loan EMI due, negative cash flow) — rule-based,
  triggered after invoice creation and via a manual "run checks" endpoint (wire to a cron for
  production)
- AI chatbot via Groq, grounded in a live snapshot of the business's real numbers, with short
  conversational memory
- Rule-based AI recommendations engine (reorder suggestions, dead stock, sales/expense trend
  alerts, customer credit risk) — deterministic SQL, not an LLM, so figures are always exact
- Investment advisor (educational, static option set + live "excess profit" figure from the P&L
  engine)
- Reports: P&L, GST (by rate), invoices, expenses — with CSV export for invoices/expenses

**Intentionally simplified / stubbed** (flagged here rather than silently faked):

- **Email delivery** (invoice emails, password reset emails) is stubbed — the endpoints exist and
  return success, but no SMTP send is wired up. Add `nodemailer` calls using the SMTP env vars
  already in `.env.example`.
- **Demand forecasting / dead-stock prediction** uses simple SQL heuristics (sales velocity, "no
  sales in N days"), not a trained ML model. This is a reasonable and honest MSME-scale approach —
  a real forecasting model would need historical volume this tool doesn't assume you have yet.
- **Real-time notifications**: Socket.IO is wired up server-side (`server.js` sets up a room per
  business) but the frontend currently polls `/api/notifications` every 60s rather than
  subscribing to the socket. Swap in `socket.io-client` in `Layout.jsx` if you want push-based
  delivery.
- **Audit logs** table exists in the schema but isn't yet written to by controllers — add a
  small middleware if you need a full audit trail.
- **Role-based access control** middleware (`authorize()`) exists but most routes only require
  authentication, not a specific role — tighten this per-route as you add staff accounts.

## Security notes

- Passwords hashed with bcrypt (12 rounds)
- JWT access + refresh token pattern, with automatic refresh handled in the frontend's axios
  interceptor
- `helmet`, `cors`, rate limiting on `/api/auth/*`, parameterized SQL everywhere (no string-built
  queries) to prevent SQL injection
- Change all secrets in `.env` before deploying — the `.env.example` values are placeholders only
