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
- Git user.email: `4956721+jacobnlangley@users.noreply.github.com`
- Expected remote owner: `AttuneBridge` organization (for example, `https://github.com/AttuneBridge/attune-bridge`)

Do not use `fullh3art` credentials in this repository.

### GitHub Account Switching Workflow

Use GitHub CLI account switching before any `gh` command (repo create, PRs, issue actions, release actions) and before first push in a new local clone.

Expected workflow:

1. Detect remote owner from `origin`.
2. Switch `gh` auth to `jacobnlangley`.
3. Verify active account is `jacobnlangley` and has access to the `AttuneBridge` org.
4. Run the GitHub operation.

Note: `AttuneBridge` is an organization, so the authenticated `gh` user must be a member account with access. For this repo, that account is `jacobnlangley`.

Preferred command:

```bash
pnpm gh:user:switch
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

## 13) Git Workflow (dev + main)

### Branch naming

All work branches follow this format:

`prefix/MM-DD-YYYY-contextual-name`

Prefixes:

- `feature/`
- `fix/`
- `docs/`
- `chore/`

### Branch roles (Vercel flow)

Use a two-branch deployment model:

- `dev` is the integration branch and deploys to `attune-bridge-dev` (Vercel dev project production branch = `dev`).
- `main` is the release branch and deploys to `attune-bridge-prod` (Vercel prod project production branch = `main`).
- Preview deployments are disabled for feature/chore branches; only production-branch deploys run in each project.
- Feature/fix/docs/chore branches are cut from `dev` unless explicitly handling a production hotfix.
- If a hotfix lands on `main` first, sync it back into `dev` immediately.

### Lifecycle of a unit of work

1. Start from `dev`: `git checkout dev && git pull origin dev`
2. Create a branch: `git checkout -b feature/MM-DD-YYYY-contextual-name`
3. Do the work with small, focused commits.
4. Push branch: `git push -u origin HEAD`
5. Open PR targeting `dev` immediately after the first push.
6. Squash merge into `dev` after checks pass.
7. Delete branch after merge.
8. Pull latest `dev` before next unit of work.

### Agent PR enforcement

To ensure Vercel deployments can be triggered from integration work:

- For any `feature/`, `fix/`, `docs/`, or `chore/` branch pushed by an agent, the agent must create a GitHub PR into `dev` in the same session.
- Do not stop after `git push` without opening the PR.
- Include the PR URL in the final response.
- Never continue adding commits to a branch after its PR is merged or closed.
- If more changes are needed after a merge/close, start a fresh branch from latest `dev`, move the new commits there (cherry-pick if needed), and open a new PR into `dev`.

### Promote to production

When changes are ready to ship:

1. Ensure `dev` is green in CI and deployed cleanly on `attune-bridge-dev`.
2. Open PR from `dev` into `main`.
3. Merge with **Create a merge commit** after checks pass (do not squash or rebase release promotions).
4. Confirm `attune-bridge-prod` deployment is healthy.

### Release promotion checklist

Before merging a `dev -> main` release PR:

1. Confirm PR base/head is exactly `dev -> main`.
2. Confirm CI checks are green on the release PR.
3. Merge using **Create a merge commit**.
4. Confirm the rolling draft release PR reopens cleanly after `dev` advances.

### Environment profile sync policy

When adding, removing, or renaming environment variables, keep these files aligned in the same PR:

- `.env.example` (committed contract/template, no secrets)
- `.env.local` (canonical local runtime profile)
- `.env.development.local` (optional local overrides for dev)
- `.env.production.local` (optional local overrides for production-mode testing)
- `.env.vercel.development` (Vercel import profile for `attune-bridge-dev`)
- `.env.vercel.production` (Vercel import profile for `attune-bridge-prod`)

Rules:

- Never commit secrets in tracked files.
- Treat `.env.local` as the source of truth locally.
- Keep dev-only toggles only in development profiles.
- Keep production profiles strict by default.
- If CI/GitHub Actions depends on a variable, update repository secrets and mention it in the PR.
- Use `pnpm env:vercel:sync-keys` to keep key structure aligned across Vercel profiles.
- Use `pnpm env:vercel:push-dev` and `pnpm env:vercel:push-prod` to copy values intentionally per environment.

### Rules

- Never force-push to `main`.
- One unit of work per branch.
- Keep `dev` and `main` in sync.
- Rebase stale feature branches onto `dev` before merge when needed.

## 14) Definition of Done

For early iterations, work is done when:

- The core flow works end-to-end
- The screens are understandable to non-technical users
- The product can be shown to a real business owner
- The repository remains easy to iterate on

Done does not mean feature-complete; done means useful for validation.
