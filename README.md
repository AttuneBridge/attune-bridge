# AttuneBridge

AttuneBridge is a lean micro-SaaS prototype for small service businesses to capture private customer feedback before negative public reviews happen.

## Overview

After a service interaction, a business shares an AttuneBridge link with a customer. The customer selects one of three outcomes:

- Great
- Okay
- Not Good

Positive responses can be guided toward a public review prompt. Negative responses are routed to a private feedback form sent directly to the business owner.

## Problem Statement

Small service businesses often discover unhappy customers too late, after a public review is already posted. They need a simple way to surface concerns early and create a chance to resolve issues privately.

## Solution Summary

AttuneBridge creates a lightweight feedback checkpoint between service completion and public review behavior. It enables early dialogue, helps recover at-risk experiences, and protects reputation without complex workflows.

## Target Customers

Primary audience: small service businesses, including:

- Tattoo studios
- Salons
- Massage therapists
- Dentists
- Chiropractors
- Therapists
- Aesthetic clinics

## Value Proposition

- Catch dissatisfaction before it becomes a public review
- Give owners direct, actionable private feedback
- Keep setup and daily use simple
- Offer a practical, low-friction reputation protection workflow

## MVP Scope

The MVP includes only:

- Landing page
- Customer feedback page (Great / Okay / Not Good)
- Private feedback form for negative experiences
- Email notification to business owner
- Simple dashboard (optional, minimal)

## Out of Scope (For Now)

- Review platform API integrations
- SMS workflows
- Complex analytics
- CRM features
- Multi-location management
- Advanced reporting
- Heavy automation
- Any feature creep beyond MVP validation needs

## Pricing Hypothesis

Early pricing assumption: small monthly subscription for solo operators and small teams (for example, low double-digit USD/month), focused on simplicity and clear ROI versus a single lost customer or negative review.

This is a hypothesis to test, not a finalized pricing model.

## Validation Strategy

- Demo the prototype to real small business owners
- Observe if value is understood within seconds
- Capture willingness-to-pay reactions
- Measure if businesses would use it in real customer follow-up
- Collect objections and refine positioning before expanding scope

## Success Criteria

Validation is successful if early users consistently show:

- Clear understanding of the product value quickly
- Strong acknowledgment of the underlying pain
- Willingness to try the workflow with real customers
- Indication they would pay for a simple version

Secondary success signal:

- The product remains easy to explain, easy to demo, and easy to iterate without added complexity

## Local Development

### Prerequisites

- Node.js 20+
- A Postgres connection string (Supabase Postgres)

### Environment

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL`
- `AUTH_MODE` (`clerk_only`; default `clerk_only`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (required when Clerk auth is enabled)
- `CLERK_SECRET_KEY` (required when Clerk auth is enabled)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `MANAGE_TOKEN_SECRET` (required in production for secure owner manage links)
- `DEMO_SESSION_SECRET` (required in production when demo one-click access is enabled)
- Optional: `NEXT_PUBLIC_APP_URL`
- Optional: `NEXT_PUBLIC_DEMO_HOST` (defaults to `demo.attunebridge.com`)
- Optional: `DEMO_MODE_ENABLED` (`true` on demo deployments to enable demo gate and outbound-send blocking)
- Optional (loyalty booking fallback): `LOYALTY_DEFAULT_BOOKING_LINK`
- Required for scheduled loyalty processing: `CRON_SECRET`
- Optional (SMS alerts): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`

### Environment value source checklist

- `DATABASE_URL`: Supabase project settings -> Database -> Connection string (Prisma format).
- `AUTH_MODE`: auth mode (`clerk_only` enforces Clerk sign-in for owner workspace routes).
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk dashboard -> API Keys -> Publishable key.
- `CLERK_SECRET_KEY`: Clerk dashboard -> API Keys -> Secret key.
- `RESEND_API_KEY`: Resend dashboard -> API Keys.
- `RESEND_FROM_EMAIL`: verified sender/domain in Resend (for example `hello@yourdomain.com`).
- `MANAGE_TOKEN_SECRET`: app secret; generate a random 32+ byte value.
- `DEMO_SESSION_SECRET`: app secret for signed demo session cookies (32+ bytes recommended).
- `CRON_SECRET`: shared secret used by cron callers and `/api/cron/loyalty/process`.
- `NEXT_PUBLIC_APP_URL`: base URL for current environment (`http://localhost:3000`, dev domain, or production domain).
- `NEXT_PUBLIC_DEMO_HOST`: canonical demo hostname used for demo-route gating.
- `DEMO_MODE_ENABLED`: enables demo one-click gate + blocks outbound email/SMS sends.
- `LOYALTY_DEFAULT_BOOKING_LINK`: optional fallback booking URL for loyalty messages.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`: Twilio Console values (only needed if SMS alerts are enabled).

To generate local secrets quickly:

```bash
node -e "const c=require('crypto'); console.log('MANAGE_TOKEN_SECRET='+c.randomBytes(32).toString('hex')); console.log('CRON_SECRET='+c.randomBytes(32).toString('hex'));"
```

Env sync commands:

- `pnpm env:check`: verify required keys exist in local and Vercel profile files.
- `pnpm env:sync`: add missing keys from `.env.example` with blank values.
- `pnpm env:sync:all`: add missing keys across local, local overrides, and Vercel profile files.
- `pnpm env:set -- --key MY_VAR --value my-value --profiles vercel-development,vercel-production`: set one key across selected profiles.
- `pnpm env:push`: copy non-empty values from `.env.local` into both Vercel profile files (advanced).
- `pnpm env:vercel:sync-keys`: sync key structure for both Vercel profile files, then validate.
- `pnpm env:vercel:push-dev`: copy non-empty values from `.env.development.local` into `.env.vercel.development`.
- `pnpm env:vercel:push-prod`: copy non-empty values from `.env.production.local` into `.env.vercel.production`.

Auth migration commands:

- `pnpm auth:backfill-owner-users:dry-run`: preview owner user + membership backfill changes.
- `pnpm auth:backfill-owner-users`: create missing owner users and owner memberships from existing businesses.
- `pnpm auth:link-clerk-user -- --email dev.superadmin@attunebridge.com --clerk-user-id user_xxx --business-email owner@democoffee.com --system-role SUPER_ADMIN`: link a Clerk user ID to a local user and optionally grant owner membership for a business.

`pnpm env:push` skips empty source values by default so blank local values do not overwrite populated Vercel profile files.

### Scheduled loyalty processing

Loyalty emails are queued and processed by calling:

- `POST /api/cron/loyalty/process`
- `POST /api/cron/demo/reset`

This endpoint requires `CRON_SECRET` via `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`).

`/api/cron/demo/reset` reseeds the canonical demo business and is intended for a daily schedule (configured in `vercel.json` for `05:00 UTC`). It only executes when `DEMO_MODE_ENABLED=true`.

Short-term hosting can use Vercel scheduled jobs. When migrating off Vercel, add an OS cron entry on EC2 to call this endpoint on your desired cadence (for example every 5-15 minutes). Keep the same `CRON_SECRET` protection in place.

EC2 helper script:

- `scripts/cron/loyalty-process.sh`

Example EC2 setup:

```bash
chmod +x scripts/cron/loyalty-process.sh
```

```bash
export APP_BASE_URL="https://your-domain.com"
export CRON_SECRET="your-shared-secret"
export LIMIT_PER_BUSINESS="25"
```

Sample crontab (every 5 minutes):

```cron
*/5 * * * * APP_BASE_URL="https://your-domain.com" CRON_SECRET="your-shared-secret" LIMIT_PER_BUSINESS="25" /path/to/repo/scripts/cron/loyalty-process.sh >> /var/log/attunebridge-loyalty-cron.log 2>&1
```

### Clone production data into development database

Use this when you need to refresh the Supabase dev database from production.

```bash
PROD_DATABASE_URL='postgresql://...prod-direct-url...' \
DEV_DATABASE_URL='postgresql://...dev-direct-url...' \
pnpm db:clone:prod-to-dev -- --yes
```

Important:

- This overwrites objects in the target schema on the dev database.
- Use direct Postgres URLs (not pooled transaction URLs) for both source and target.
- By default, only the `public` schema is cloned.
- Add `KEEP_DUMP=1` if you want to keep the temporary dump artifact.

### Setup

```bash
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:seed
pnpm run dev
```

Demo route after seeding:

- `/feedback/demo-coffee-downtown`
- `/demo-access`
- `/playbook`

## Git and Deployment Workflow

AttuneBridge uses a two-branch release flow:

- `dev` is the integration branch.
- `main` is the production release branch.
- Feature/fix/docs/chore branches are created from `dev`.
- PRs for unit work target `dev` and are squash merged.
- Release PRs promote `dev -> main` and must use **Create a merge commit**.

## Vercel Project Mapping

- `attune-bridge-dev`
  - Production branch: `dev`
  - Purpose: integration/staging environment
- `attune-bridge-prod`

### Vercel build behavior

- Vercel uses `pnpm run vercel-build` (set in `vercel.json`).
- `vercel-build` runs `scripts/vercel-build.sh`.
- By default it skips Prisma migrations for faster, more stable deploys.
- Set `VERCEL_RUN_MIGRATIONS=true` in an environment when you explicitly want `prisma migrate deploy` during build.
  - Production branch: `main`
  - Purpose: live production environment

Preview deployments are intentionally skipped via `vercel.json` so only production-branch deploys run per project:

- `attune-bridge-dev` deploys on `dev`
- `attune-bridge-prod` deploys on `main`

## Environment Profile Files

Keep these files aligned whenever env vars are added/removed/renamed:

- `.env.example`
- `.env.local`
- `.env.development.local` (optional overrides)
- `.env.production.local` (optional overrides)
- `.env.vercel.development`
- `.env.vercel.production`

Never commit real secrets to tracked files.
