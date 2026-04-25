# Pingup

Uptime and cron monitoring for indie devs. Heartbeat & ping monitors, alerts to email and Telegram, Pro features paid in TON.

> Built in 14 days as a focused MVP. Self-hostable, dependency-light, no third-party trackers.

## Features

- **Heartbeat monitors** — your cron POSTs to a unique URL on each run. We alert if it doesn't arrive within the expected window plus grace.
- **Ping monitors** — we call your URL on a schedule (1m–1h) and alert when it stops responding with the expected status.
- **Alerts** — email via Resend, Telegram via a bot. Auto-attached to every monitor when verified.
- **Public status pages** — opt-in per monitor, served at `/status/{slug}` with current status, 30-day uptime %, 60-day daily bar, last-incident summary.
- **Subscriptions** — Free tier (3 monitors, 5-min minimum interval, email alerts) or Pro ($9/mo · $90/yr, 25 monitors, 1-min checks, Telegram, public status pages). Paid in TON via TonConnect.
- **i18n** — English and Russian, parity-checked by an audit script.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19.2)
- **Auth.js v5** with GitHub OAuth + Drizzle session adapter
- **Drizzle ORM** + `postgres-js` against **Neon Postgres**
- **next-intl** (cookie-based locale, no `/en` URL prefix)
- **next-themes** (light / dark / system)
- **TonConnect** UI + `@ton/core` for payments; toncenter for tx polling
- **Resend** for email alerts; Telegram Bot API for chat alerts
- **vitest** for unit tests; lightweight i18n audit script

## Getting started

Prerequisites: Node 20.9+, a Neon Postgres database, a GitHub OAuth App.

```bash
git clone https://github.com/DeadlySunset/pingup.git
cd pingup
npm install
cp .env.example .env.local
# fill in DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_*, CRON_SECRET — see below
npm run dev
```

### Required env

| Variable | What it's for | How to get it |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection | Create a project at [neon.tech](https://neon.tech), copy the pooled connection string |
| `AUTH_SECRET` | Auth.js session signing | `openssl rand -hex 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth | Create an app at github.com/settings/developers, callback `http://localhost:3000/api/auth/callback/github` |
| `APP_URL` | Used in emails, manifest, cron self-calls | `http://localhost:3000` for dev |
| `CRON_SECRET` | Bearer secret for `/api/cron/*` | `openssl rand -hex 32` |

### Optional env

| Variable | What it unlocks |
| --- | --- |
| `RESEND_API_KEY` / `RESEND_FROM` | Real email delivery. Without these, alerts log to console. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` / `TELEGRAM_WEBHOOK_SECRET` | Telegram alerts. Webhook secret is checked via the `X-Telegram-Bot-Api-Secret-Token` header. |
| `TON_PAYMENT_ADDRESS` / `TONCENTER_API_KEY` | TON checkout. Without `TON_PAYMENT_ADDRESS`, `/subscribe/[id]` will throw — checkout is gated. |
| `ADS_TITLE` / `ADS_BODY` / `ADS_URL` / `ADS_CTA` | Sponsor card shown to Free users. Without these, the slot falls back to an upgrade-to-Pro card. |

## Schema migrations

Schema lives in `src/lib/db/schema.ts`. Migrations are written by hand as one-off scripts in `scripts/migrate-*.ts` (we don't run `drizzle-kit push` interactively — too easy to drop a column).

```bash
npx tsx scripts/migrate-ton.ts
npx tsx scripts/migrate-public-status.ts
```

## Scripts

```bash
npm run dev          # next dev (Turbopack)
npm run build        # next build
npm test             # vitest run
npm run test:watch   # vitest in watch mode
npm run i18n:audit   # extract t() keys, verify en/ru parity
npm run check        # i18n:audit + test + tsc — what CI runs
```

## Cron

For prod, run two OS cron entries:

```cron
* * * * * curl -fsS -m 50 -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/tick
* * * * * curl -fsS -m 50 -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/check-payments
0 4 * * * curl -fsS -m 50 -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/expire
```

`tick` checks ping URLs and flags missed heartbeats; `check-payments` polls toncenter for matching invoices; `expire` downgrades users whose subscriptions have lapsed.

## Tests

```bash
npm test
```

Covers pure utilities (`usdToTon`, `buildTonDeeplink`, `computeGrace`, slug + verification code generators, `VERIFY_COMMAND_RE`) and en/ru locale parity. Anything DB- or network-bound is exercised manually via the dev server.

## Deploy

A Hetzner CAX11/CX22 VPS, nginx + certbot, systemd, and the cron entries above are enough. A `DEPLOYMENT.md` with the exact commands lands with the deploy step.

## License

MIT. See [LICENSE](LICENSE).
