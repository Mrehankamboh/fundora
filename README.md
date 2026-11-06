# Fundora

Prop-trading marketing site and trader portal. Static HTML/CSS/JS front end with a Node server and Neon Postgres for auth, challenges, rewards, pricing, and support tickets.

Related admin app (separate repo): [fundora-admin](https://github.com/Mrehankamboh/fundora-admin) — shares the same Neon database.

## What’s included

### Landing / marketing
- Homepage challenge planner (prices load live from Neon `/api/prices`)
- Platforms, FAQ, CTA
- Auth pages: `login.html`, `register.html`, `forgot.html` (email + Google OAuth)
- Floating support chat widget (writes tickets to Neon)

### User portal (`/portal/`)
- Dashboard, Challenges, Rewards, Platforms, Rules
- Billing, Certificates, Support, Account, Settings
- Session-guarded shell (sidebar + topbar)

### Backend (`server.cjs` + `/api`)
- Register / login / logout / me / profile
- Forgot + reset password (Gmail SMTP)
- Challenge purchase + list
- Rewards requests
- Live challenge prices (from Neon `challenge_prices`)
- Support tickets (widget + portal)

## Stack

- HTML, CSS, vanilla JS
- Node `server.cjs` (static files + JSON API)
- Neon Postgres (`@neondatabase/serverless`)
- `bcryptjs` sessions, `nodemailer` (Gmail App Password)

## Setup

```bash
npm install
cp .env.example .env.local
# fill DATABASE_URL, GMAIL_* if you want email
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

### Environment (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon connection string |
| `PORT` | Local port (default `5173`) |
| `SESSION_COOKIE` | Cookie name (default `fundora_session`) |
| `APP_ORIGIN` | Site origin for links in emails |
| `GMAIL_USER` | SMTP from-address |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not normal password) |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

**Google login:** create an OAuth Web client in Google Cloud Console. Add authorized redirect URI:

`http://127.0.0.1:5173/api/auth/google/callback`

(Use the same host you open in the browser — `127.0.0.1` vs `localhost` must match.) If the OAuth app is in Testing mode, add your Gmail under Test users.

Do not commit `.env.local`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` / `npm start` | Run static + API server |
| `npm run test:api` | End-to-end API smoke test |
| `node scripts/test-mail.cjs` | Send sample welcome / reset / challenge emails |

## Project layout

```
├── index.html              # Marketing landing
├── login.html / register.html / forgot.html
├── portal/                 # Trader portal pages
├── css/                    # styles, auth, portal, support widget
├── js/                     # main, auth, portal, support-widget
├── lib/                    # db, schema, auth, mail, catalog, api-routes
├── routes/                 # API handlers (auth, challenges, rewards, tickets…)
├── scripts/                # check-api, e2e-api, test-mail
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
| `GET/POST /api/rewards` | Payout requests |
| `GET/POST /api/tickets` | Support chat (visitor or logged-in) |
| `GET /api/health` | Health check |

Schema is created/migrated automatically on first API use (`lib/schema.js`): `users`, `sessions`, `password_resets`, `challenges`, `challenge_prices`, `rewards`, `tickets`, `ticket_messages`.

## Admin

Operators use **fundora-admin** (Next.js, port `3000` locally). Set the same `DATABASE_URL` and `ADMIN_EMAIL` to a registered user email to promote that account to `role = admin`. Support messages from this site’s chat appear under **Call** in admin.

## License

ISC
