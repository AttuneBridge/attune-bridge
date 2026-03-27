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

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `MANAGE_TOKEN_SECRET` (required in production for secure owner manage links)
- `OWNER_SESSION_SECRET` (optional; falls back to `MANAGE_TOKEN_SECRET`)
- Optional: `NEXT_PUBLIC_APP_URL`
- Optional (loyalty booking fallback): `LOYALTY_DEFAULT_BOOKING_LINK`
- Required for scheduled loyalty processing: `CRON_SECRET`
- Optional (SMS alerts): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`

### Scheduled loyalty processing

Loyalty emails are queued and processed by calling:

- `POST /api/cron/loyalty/process`

This endpoint requires `CRON_SECRET` via `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`).

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
