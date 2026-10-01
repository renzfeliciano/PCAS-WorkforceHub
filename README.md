# EychAr by Renz

> *Say it "H-R."* Your HRIS, simplified.

EychAr is a web-based HR information system that moves day-to-day HR work out of spreadsheets and into one secure workspace. It brings employee records, leave, attendance, recruitment, and HR operations together, with role-based access for administrators, HR staff, managers, and employees.

This deployment is configured for **PCAS**.

## Contents

- [Key Features](#key-features)
- [How It's Built](#how-its-built)
- [Technology](#technology)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Roles & Permissions](#roles--permissions)
- [Environment Management](#environment-management)
- [Database Seeding](#database-seeding)
- [Security & Accessibility Standards](#security--accessibility-standards)
- [Engineering Conventions](#engineering-conventions)
- [What's Next](#whats-next)

## Key Features

- **Employee roster**: search, filters, sorting, CSV export, and print-ready reports.
- **Leave credit management**: per-type balances with a full change history.
- **Attendance**: calendar-based logging, plus a self-service "My attendance" view.
- **Travel orders, asset issuance, and case monitoring**: each with its own records, filters, and reports.
- **Events calendar**: company events and important dates.
- **Recruitment pipeline**: drag-and-drop Kanban board for job applications.
- **Live dashboard**: headcount, tenure, demographics, expiring contracts, hiring trends, and upcoming birthdays.
- **Admin-configurable catalogs**: positions, projects/sites, employment statuses, leave types, and more.
- **User management**: provision accounts, assign roles, and deactivate users. New accounts must change their default password on first sign-in.

## How It's Built

A layered architecture keeps business rules and permissions on the server, so the interface is never the only thing standing in the way.

```text
UI -> Services -> Repositories -> Database
```

Security is built in:

- Passwords hashed with bcrypt
- One active session per user, with an idle timeout and a "Still there?" warning
- CSRF protection (SameSite cookies plus an explicit Origin check on API writes)
- Strict security headers, including a production Content Security Policy
- Zod validation on every request
- Distributed rate limiting through Upstash Redis
- An audit trail of every change

The app was developed test-first. Lint, typecheck, and the full Vitest suite run automatically before every commit, and screens follow WAI-ARIA accessibility standards.

## Technology

| Area           | Stack                                                    |
| -------------- | -------------------------------------------------------- |
| Framework      | Next.js 16 (App Router), React 19, TypeScript (strict)   |
| Styling        | Tailwind CSS 4, Lucide icons, next-themes (light/dark)   |
| Data           | MongoDB Atlas, Mongoose                                  |
| Auth           | Auth.js / NextAuth (credentials provider, JWT sessions)  |
| Forms & state  | React Hook Form, Zod, Zustand                            |
| Infrastructure | Upstash Redis (rate limiting), Vercel (hosting)          |
| Quality        | Vitest, Testing Library, mongodb-memory-server, ESLint, Husky |

## Getting Started

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill in your values
npm run db:seed              # optional: seed the default catalogs
npm run dev
```

Open `http://localhost:4000`. A MongoDB connection (`MONGODB_URI`) and an Auth.js secret (`AUTH_SECRET`) are required to sign in.

## Scripts

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Start the dev server on port 4000                |
| `npm run build`     | Production build                                 |
| `npm start`         | Serve the production build on port 4000          |
| `npm run lint`      | ESLint                                           |
| `npm run typecheck` | Generate Next.js route types, then run `tsc`     |
| `npm test`          | Run the Vitest suite once                        |
| `npm run test:watch`| Vitest in watch mode                             |
| `npm run db:seed`   | Idempotent catalog seed (see below)              |

The Husky pre-commit hook runs `lint`, `typecheck`, and `test`, and blocks the commit if any of them fail.

## Project Structure

- `src/app/`: routes, layouts, metadata, and `/api/v1` route handlers. Route handlers are transport adapters, not business logic.
- `src/features/`: feature modules (employees, leave, attendance, travel orders, asset issuance, case monitoring, events, recruitment, dashboard, settings, profile, user management).
- `src/components/`: shared UI, layout, and form fields.
- `src/services/`: use cases, authorization checks, validation orchestration, and audit coordination.
- `src/repositories/`: persistence ports and Mongoose models. Components and services never touch Mongoose models directly.
- `src/lib/`: infrastructure (database connection, Auth.js, RBAC, rate limiting, sanitizing, shared utilities).
- `src/schemas/`: Zod schemas used at request and form boundaries.
- `src/types/`: domain types and API contracts.
- `src/proxy.ts`: Next.js 16 request proxy (formerly middleware). Handles auth redirects, idle-timeout checks, the API Origin check, and blanket API rate limiting.
- `scripts/`: seed and one-off migration scripts.
- `tests/`: Vitest suites for API routes, components, lib, repositories, and services.
- `public/assets/`: versioned static assets (`brand/`, `icons/`, `images/`, `fonts/`, `social/`).

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical contracts and [SYSTEM_ANALYSIS.md](SYSTEM_ANALYSIS.md) for the system overview.

## Roles & Permissions

| Role     | Access                                                                                  |
| -------- | --------------------------------------------------------------------------------------- |
| Admin    | Everything, including archiving employees, deleting catalog entries, and workspace reset |
| HR       | Employees, leave, attendance, travel orders, assets, recruitment, events, cases, catalogs, users, and exports |
| Manager  | Read access to employees and leave                                                      |
| Employee | Read access, own profile, and own attendance                                            |

Permissions are defined in `src/lib/rbac.ts` and enforced on the server. Hiding a button in the UI is not authorization.

Every mutation runs in this order:

1. Authenticate the request.
2. Resolve the actor.
3. Authorize the operation.
4. Validate input with Zod.
5. Execute the service use case.
6. Persist through a repository.
7. Write an audit event.
8. Return a typed response.

## Environment Management

Commit only `.env.example`. Keep real credentials in `.env.local` or the hosting provider's encrypted environment store, and never commit a connection string, API key, password, or Auth.js secret.

| Variable(s)                                           | Purpose                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `MONGODB_URI`                                         | MongoDB Atlas connection string                                |
| `AUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`      | Auth.js configuration                                          |
| `SESSION_INACTIVITY_MINUTES`                          | Idle time before the "Still there?" warning (default 30 min)   |
| `SESSION_INACTIVITY_TIMEOUT`                          | Countdown before automatic sign-out (default 30 s)             |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`  | Distributed rate limiting                                      |
| `ENABLE_*_SEEDING`                                    | Which catalogs the seed creates                                |
| `ENABLE_DATA_RESET`                                   | Enables the Admin-only "reset all workspace data" action       |
| `NEXT_PUBLIC_API_MAX_RETRIES`                         | Client retries for transient API failures                      |
| `CLOUDINARY_*`                                        | Reserved for employee media                                    |

Use separate databases and secrets for local, Preview, and Production. Do not reuse production credentials locally.

### Rate limiting

`src/lib/rate-limit.ts` defines three sliding-window tiers per minute: **reads 120**, **writes 30**, and **auth 5**. Each tier has its own Redis key prefix (`eychar:*`). Limited responses return HTTP `429` with `Retry-After` and `X-RateLimit-*` headers. The limiter fails open only when the Upstash variables are missing, which keeps local development usable. Preview and Production should always set both.

### Client-owned deployment accounts

The application is provider-account agnostic. For each client deployment, the client owns these accounts and billing relationships:

| Service       | Client-owned resource                                         | Environment values                                   |
| ------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| Vercel        | Client team/project and billing                               | Project deployment settings                          |
| MongoDB Atlas | Dedicated project, database, database user, and network rules | `MONGODB_URI`                                        |
| Auth.js       | Client-generated secret and canonical application URL         | `AUTH_SECRET`, `NEXTAUTH_URL`                        |
| Cloudinary    | Client cloud, upload policy, and API credentials              | `CLOUDINARY_*`                                       |
| Upstash       | Client Redis database for distributed rate limiting           | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

Rotate any credential that was ever pasted into a file or shared in chat.

## Database Seeding

```bash
npm run db:seed
```

The CLI seed upserts positions, projects/sites, and employment statuses, each gated by its `ENABLE_*_SEEDING` flag.

The other default catalogs are seeded from inside the app by Admin or HR users, again gated by their flags:

- `POST /api/v1/catalogs/seed`: attendance statuses, recruitment stages, event categories, and case-monitoring classifications and statuses
- `POST /api/v1/leave-types/seed`: leave types

All seeding is safe to run repeatedly. Existing records and their active/inactive state are never overwritten or deleted.

## Security & Accessibility Standards

These are enforced patterns, checked at review time, not aspirations.

### XSS

JSX escapes every rendered text node, and the codebase has no `dangerouslySetInnerHTML` or other raw-HTML sink. If one is ever introduced, it must go through `sanitizeHtml()` in `src/lib/sanitize.ts` (backed by `isomorphic-dompurify`).

### Injection (NoSQL)

- Free-text searches that build a `$regex` filter escape metacharacters first with `escapeRegex()` from `src/lib/regex.ts`.
- Credential or identity fields from a request body are checked with `typeof value === "string"` before reaching a query filter, since `{ username: { $ne: null } }` is truthy. See `authorize()` in `src/lib/auth.ts`.

### Sessions

Sessions are JWTs with an 8-hour maximum lifetime. Signing in records a server-side `activeSessionId`, so signing in elsewhere invalidates the old session. `src/proxy.ts` checks inactivity on every request, not only on the next client-side session fetch.

### CSRF

NextAuth's session cookie ships `SameSite=Lax`. On top of that, `src/proxy.ts` rejects state-changing (`POST`/`PUT`/`PATCH`/`DELETE`) `/api/*` requests whose `Origin` doesn't match the app's own host.

### Security headers

`next.config.ts` always sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`, plus a `Content-Security-Policy` in production builds only (kept out of dev so it doesn't fight Turbopack's HMR websocket). Verify header changes against `npm run build && npm start`, not just the dev server.

### WAI-ARIA

- `src/components/ui/modal.tsx` is the single Modal every dialog composes. It carries `role="dialog"`, `aria-modal`, and `aria-labelledby`/`aria-describedby`, closes on Escape, and manages focus. Build new dialogs on top of it.
- Active navigation links carry `aria-current="page"`. Icon-only buttons carry `aria-label`. Live-updating regions (toasts, the global loader) use `role="status"` / `aria-live`.

## Engineering Conventions

- Add a feature module and service use case before adding a new page.
- Keep API contracts independent from component props.
- Prefer stable IDs and references over display-name joins.
- Treat audit logs and leave-balance history as immutable records.
- Prefer soft deletion or deactivation for referenced catalog data.
- Make new permissions explicit in the RBAC policy.
- Use additive schema changes and migration scripts for live data.
- Keep external integrations behind `lib/` adapters and repository interfaces.
- Never put credentials, secrets, or real government IDs in seed data or tests.

## What's Next

- Onboarding and offboarding checklists, plus contract-renewal reminders
- Employee documents and media through Cloudinary
- Notifications and configurable dashboard widgets
- Payroll-period snapshots, statutory exports, and reporting
- Multi-tenant boundaries, feature flags, and observability

---

© 2026 PCAS. All rights reserved. · EychAr by Renz
