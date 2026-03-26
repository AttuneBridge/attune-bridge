# AGENTS.md

## 1) Mission

AttuneBridge is a lean validation prototype for small service businesses. The goal is to help businesses capture private customer feedback before negative public reviews occur.

This repository exists to test problem-solution fit and willingness to pay, not to build a full reputation-management platform.

## 2) Build Priorities

When implementing changes, optimize for:

- Clarity
- Speed of shipping
- Small scope
- Demoability with real business owners
- Maintainability for a tiny team
- Simple, understandable UX

Default to the simplest working approach.

## 3) Non-Goals

Avoid introducing:

- Overbuilt systems
- Speculative architecture
- Enterprise abstractions
- Unnecessary dependencies
- Features outside MVP scope
- Premature optimization

If a decision increases complexity without improving validation speed or learning, do not do it.

## 4) MVP Product Boundaries

Allowed initial functional scope:

- Landing page
- Feedback flow (Great / Okay / Not Good)
- Private feedback submission path
- Email notification to business owner
- Simple business-facing view (minimal dashboard)

Anything beyond this scope requires explicit instruction.

## 5) Architecture Guidance

- Keep the file structure simple and easy to navigate
- Prefer straightforward implementation patterns over abstraction layers
- Favor readability over cleverness
- Use minimal dependencies
- Do not add background jobs, queues, or event-driven systems unless explicitly required
- Do not design for scale before validation proves demand

Choose boring, predictable solutions first.

## 6) Technology Stack (Prototype)

### Frontend / Backend

Next.js (App Router)

Use:

- TypeScript
- Server Actions when possible
- Route Handlers for APIs when necessary

Next.js serves both frontend pages and backend endpoints.

### Database

Supabase Postgres

Supabase provides the hosted Postgres database used by the application.

The following should not be used during the prototype stage:

- Supabase client SDK
- Supabase Auth
- Supabase Edge Functions

Supabase is used strictly as the database host.

### ORM

Prisma

Prisma is the data access layer for the application.

All database reads and writes must go through Prisma.

Reasons:

- Strong TypeScript type safety
- Easier schema iteration
- Reliable migrations
- Better behavior from AI coding agents
- Cleaner developer experience for a multi-developer project

Use Prisma for:

- Schema definition
- Migrations
- Queries

Agents should maintain a `prisma/schema.prisma` file.

### Authentication

Authentication is not required for the earliest prototype.

Phase 1:

- No auth
- Demo businesses seeded in database

Phase 2:

- Optional Supabase Auth or Clerk if the product shows traction

Avoid introducing complex authentication systems early.

### Email Notifications

Resend

Purpose: send notification emails to business owners when private feedback is submitted.

This is a key validation feature.

### UI Framework

TailwindCSS

Optional:

- shadcn/ui may be used for quickly building UI components

Avoid creating a custom design system during the prototype phase.

### Hosting

Vercel

The application should deploy via Vercel for fast iteration and preview environments.

## 7) Architecture Diagram

Application Layer

- Next.js (App Router)

Data Access Layer

- Prisma ORM

Database

- Supabase Postgres

External Services

- Resend (email notifications)

Hosting

- Vercel

Canonical flow:

- Next.js
- Prisma
- Supabase Postgres

Do not introduce direct Supabase client queries in app code. Route all data access through Prisma.

## 8) Agent Development Rules

- Prefer simple architecture
- Avoid unnecessary dependencies
- Avoid adding infrastructure before validation
- Prioritize speed of iteration
- Keep the prototype understandable and lightweight

## 9) Final Stack Summary

Frontend / Backend

- Next.js + TypeScript

ORM

- Prisma

Database

- Supabase Postgres

UI

- TailwindCSS (+ optional shadcn/ui)

Email

- Resend

Hosting

- Vercel

## 10) UX Guidance

The interface should feel:

- Calm
- Simple
- Trustworthy
- Not overly corporate
- Not cluttered

The product should communicate:

- Conversation
- Bridge
- Early feedback
- Resolution before escalation

Favor clear language and low cognitive load over visual complexity.

## 11) Coding Guardrails

- Do not add features that were not requested
- Do not rename major product concepts without strong reason
- Do not invent platform complexity
- Keep components small and understandable
- Prefer incremental, reversible changes
- Explain tradeoffs when making structural decisions

When uncertain, choose the option that keeps the prototype easier to demo and modify.

## 12) Git Identity

This repository uses Jacob Langley's personal GitHub identity at the repo level.

- GitHub account: `jacobnlangley`
- Git user.name: `jacobnlangley`
- Git user.email: `jacob.n.langley@gmail.com`
- Expected remote owner: `jacobnlangley` (for example, `https://github.com/jacobnlangley/attune-bridge`)

Do not use `fullh3art` credentials in this repository.

### GitHub Account Switching Workflow

Use GitHub CLI account switching before any `gh` command (repo create, PRs, issue actions, release actions) and before first push in a new local clone.

Expected workflow:

1. Detect remote owner from `origin`.
2. Switch `gh` auth to that owner.
3. Verify active account matches expected owner.
4. Run the GitHub operation.

Preferred command:

```bash
gh_repo_user_switch
```

Manual fallback:

```bash
gh auth switch -u jacobnlangley
gh auth status -h github.com
```

If `jacobnlangley` is not authenticated on this machine yet, authenticate first:

```bash
gh auth login -h github.com -p https
```

Agents must not continue with GitHub operations while the active `gh` account is incorrect.

## 13) Definition of Done

For early iterations, work is done when:

- The core flow works end-to-end
- The screens are understandable to non-technical users
- The product can be shown to a real business owner
- The repository remains easy to iterate on

Done does not mean feature-complete; done means useful for validation.
