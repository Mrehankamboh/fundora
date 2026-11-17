# Fundora

Prop-trading marketing site and trader portal. Static HTML/CSS/JS front end with a Node server and Neon Postgres for auth, challenges, rewards, pricing, support tickets, and identity verification.

Live site: [https://fundora-eight.vercel.app](https://fundora-eight.vercel.app)

Related admin app (separate repo): [fundora-admin](https://github.com/Mrehankamboh/fundora-admin) — shares the same Neon database. Live admin: [https://fundora-admin-gamma.vercel.app/login](https://fundora-admin-gamma.vercel.app/login).

## What’s included

### Landing / marketing
- Homepage challenge planner (prices load live from Neon `/api/prices`)
- Phone layout: stacked sections, menu from 980px, and a globe sized to the screen
- Platforms, FAQ, CTA
- Auth pages: `login.html`, `register.html`, `forgot.html` (email + Google OAuth)
- Floating support chat widget (writes tickets to Neon)

### User portal (`/portal/`)
- Dashboard, Challenges, Rewards, Platforms, Rules
- Billing, Certificates, Support, Account, Settings
- Identity verification (`/portal/kyc.html`): on a phone, location must be shared before the form opens
- Document step (`/portal/kyc-document.html`): desk shows a QR code; the phone shows the camera wizard
- Session-guarded shell (sidebar + topbar)

### Backend (`server.cjs` + `/api`)
- Register / login / logout / me / profile
- Forgot + reset password (Gmail SMTP)
- Google sign-in
- Challenge purchase + list (card, crypto, or demo pay)
- Rewards requests
- Live challenge prices (from Neon `challenge_prices`)
- Support tickets (widget + portal)
- Identity applications and private document files

## Stack

- HTML, CSS, vanilla JS
- Node `server.cjs` (static files + JSON API)
- Neon Postgres (`@neondatabase/serverless`)
- `bcryptjs` sessions, `nodemailer` (Gmail App Password), `qrcode`

On Vercel the static files are exported to `dist`, and `/api/:path*` is rewritten to `api/handler.js`. Google start and callback are their own functions so the OAuth query string is not dropped.

## Setup

```bash
npm install
cp .env.example .env.local
# fill DATABASE_URL, GMAIL_* if you want email
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The server also prints the LAN address for a phone on the same Wi-Fi. Camera and location need HTTPS (the live site) or `localhost`.

### Environment (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon connection string |
| `PORT` | Local port (default `5173`) |
| `SESSION_COOKIE` | Cookie name (default `fundora_session`) |
| `APP_ORIGIN` | Public origin for email links and the Google callback |
| `GMAIL_USER` | SMTP from-address |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not normal password) |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `STRIPE_SECRET_KEY` | Optional. Empty keeps checkout on demo pay |
| `STRIPE_PUBLISHABLE_KEY` | Optional Stripe publishable key |
| `CRYPTO_USDT_ADDRESS` | Optional address shown on crypto checkout |

**Google login:** create an OAuth Web client in Google Cloud Console. Add both authorized redirect URIs:

- `http://127.0.0.1:5173/api/auth/google/callback`
- `https://fundora-eight.vercel.app/api/auth/google/callback`

`APP_ORIGIN` must match the site you open. If the OAuth app is in Testing mode, add your Gmail under Test users.

Do not commit `.env.local`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` / `npm start` | Run static + API server |
| `npm run build` | Check the database schema (`scripts/check-api.cjs`) |
| `npm run test:api` | End-to-end API smoke test |
| `node scripts/kyc-flow.cjs` | Identity submit, privacy, reject, and approve (needs admin on port 3000) |
| `node scripts/test-mail.cjs` | Send sample welcome / reset / challenge emails |

## Project layout

```
├── index.html              # Marketing landing
├── login.html / register.html / forgot.html
├── portal/                 # Trader portal pages, including KYC
├── css/                    # styles, auth, portal, support widget
├── js/                     # main, auth, globe, kyc, portal, support-widget
├── js/vendor/cobe.js       # Globe used on the landing and auth pages
├── lib/                    # db, schema, auth, mail, kyc, api-routes
├── routes/                 # API handlers
├── api/                    # Vercel function entry points
├── scripts/                # export, check-api, e2e-api, kyc-flow, test-mail
├── server.cjs              # Local server
└── .env.example
```

## API overview

| Path | Notes |
|------|--------|
| `POST /api/auth/register` | Create account + welcome email |
| `POST /api/auth/login` | Session cookie |
| `POST /api/auth/logout` | Clear session |
| `GET /api/auth/me` | Current user |
| `POST /api/auth/forgot` / `reset` | Password reset flow |
| `GET /api/auth/google` | Start Google OAuth |
| `GET /api/auth/google/callback` | Google OAuth callback |
| `GET/PATCH /api/auth/profile` | Account profile |
| `GET /api/prices` | Challenge price catalog |
| `GET/POST /api/challenges` | List / buy challenge |
| `POST /api/checkout/create` | Start a checkout order |
| `POST /api/checkout/confirm` | Confirm demo, card, or crypto pay |
| `GET /api/checkout/order` | Read one order |
| `GET/POST /api/rewards` | Payout requests |
| `GET/POST /api/tickets` | Support chat (visitor or logged-in) |
| `GET /api/kyc` | Current identity application |
| `POST /api/kyc` | Submit identity details, location, and photos |
| `GET /api/kyc/file` | Document bytes for the owner only |
| `GET /api/qr` | SVG QR code for the phone verification link |
| `GET /api/network` | Public origin used by the QR code |
| `GET /api/health` | Health check |

Schema is created or migrated on first API use (`lib/schema.js`): `users`, `sessions`, `password_resets`, `challenges`, `challenge_prices`, `challenge_orders`, `rewards`, `tickets`, `ticket_messages`, `kyc_applications`, `kyc_documents`, `kyc_audit`. Identity photos stay in the database and are never returned by list or detail queries.

## Admin

Operators use **fundora-admin** (Next.js, port `3000` locally). Set the same `DATABASE_URL` and set `ADMIN_EMAIL` to a registered user email to promote that account to `role = admin`. Support messages from this site’s chat appear under **Tickets**. Identity applications, including the shared location, appear under **KYC**. Approval is manual.

## License

ISC
