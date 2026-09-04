# WorkforceHub

WorkforceHub is a modular HRIS for employee records, project assignments, employment catalogs, leave credits, and workforce operations. It is designed for incremental delivery, strict authorization, and deployment to Vercel Hobby.

> **Status:** Phase 1 modular foundation. The UI, MongoDB adapters, bcrypt-backed Auth.js credentials flow, role guard, versioned settings seed endpoint, and client-owned environment model are implemented. Employee CRUD persistence, complete audit storage, and distributed rate-limit enforcement remain integration work.

## Contents

- [Product Scope](#product-scope)
- [Technology](#technology)
- [Architecture](#architecture)
- [Domain Model](#domain-model)
- [Authorization](#authorization)
- [Local Development](#local-development)
- [Environment Management](#environment-management)
- [Delivery Roadmap](#delivery-roadmap)
- [Production Readiness](#production-readiness)
- [Engineering Conventions](#engineering-conventions)

## Product Scope

### Available in Phase 1

- Workforce dashboard with employee totals, status summaries, recent employees, and upcoming events.
- Employee roster with search, status filtering, responsive table layout, CSV export, and print view.
- Employee creation modal with catalog-backed position, project/site, and employment-status fields.
- Leave-credit action for Sick Leave (SL) and Vacation Leave (VL).
- Settings catalog for positions, projects/sites, and employment statuses.
- Active/inactive catalog states. Only active entries are available in new employee dropdowns; inactive entries remain available for reactivation.
- Permanent deletion controls for catalog records.

### Employee Record

The employee contract includes:

| Field                          | Description                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| Employee number                | Stable human-readable identifier                                  |
| Employee name                  | Employee's full name                                              |
| Position                       | Reference to the position catalog                                 |
| Project/site                   | Reference to the project catalog                                  |
| Date hired                     | Employment start date                                             |
| End of contract                | Contract end date                                                 |
| Employment status              | Contractual, Probationary, Regular, Terminated, Resigned, or AWOL |
| Contact number                 | Primary contact number                                            |
| Address                        | Residential address                                               |
| SSS, PhilHealth, Pag-ibig, TIN | Government identifiers                                            |
| Leave credits                  | `{ sickLeave, vacationLeave }`, measured in days                  |

## Technology

- Next.js App Router, currently pinned to the generated Next.js `16.3.4` release.
- TypeScript with strict mode enabled.
- Tailwind CSS and Lucide React.
- Auth.js / NextAuth integration dependencies.
- MongoDB Atlas, Mongoose, and the MongoDB Auth.js adapter. MongoDB ObjectIds are exposed to the application as strings; numeric SQL-style IDs are not used.
- Zod for boundary validation, React Hook Form for form orchestration, and Zustand for shared client state where needed.
- Cloudinary integration dependencies reserved for employee media.
- Vercel Hobby as the deployment target.

Automated tests are intentionally deferred. Vitest and Playwright should be introduced after the persistence and authentication contracts stabilize.

## Architecture

The dependency direction is deliberately one-way:

```text
UI -> Services -> Repositories -> Database
```

- `src/app/`: route composition, layouts, metadata, and route-level boundaries. Route handlers should be transport adapters, not business logic.
- `src/components/`: reusable UI, forms, tables, and modal interactions.
- `src/features/`: feature compositions for employees, dashboard, settings, leave, and future modules.
- `src/services/`: use cases, authorization checks, validation orchestration, and audit coordination.
- `src/repositories/`: persistence ports and Mongoose implementations. Components and services must not depend on Mongoose models directly.
- `src/lib/`: infrastructure for database connections, Auth.js, sessions, Cloudinary, audit logging, rate limiting, and shared utilities.
- `src/schemas/`: Zod schemas used at request and form boundaries.
- `src/types/`: domain types, role definitions, and API contracts.
- `scripts/seed.ts`: idempotent MongoDB Atlas catalog seed.
- `public/assets/`: versioned public assets, organized into `brand/`, `icons/`, `images/`, `fonts/`, and `social/`.

The current seed-backed shell is a preview surface. Before production, replace local state mutations with service calls while keeping the component contracts stable. The server-side Auth.js and Settings seed boundaries are already separated from the UI.

## Domain Model

Planned MongoDB collections:

- `users`: identity, role, and account state.
- `employees`: employee profile and references to catalog records.
- `positions`: configurable position catalog with `active` state.
- `projects`: configurable project/site catalog with `active` state.
- `employment_statuses`: configurable status catalog with `active` state.
- `leave_credit_ledger`: append-only SL/VL adjustments and balance snapshots.
- `audit_logs`: actor, action, entity, before/after values, request ID, and timestamp.
- `sessions`: active-session enforcement and inactivity tracking.

Catalog records should be deactivated before deletion when historical employee references exist. Deletion must be rejected or handled as an archival operation when referential integrity requires it.

## Authorization

| Role     | Access                                                |
| -------- | ----------------------------------------------------- |
| Admin    | Full employee, leave, catalog, user, and audit access |
| HR       | Employee, leave, catalog, and relevant audit access   |
| Manager  | Team-scoped read access; future approval workflows    |
| Employee | Own profile and future self-service workflows         |

Admin and HR are the only roles allowed to update leave credits or manage positions, projects, and employment statuses. Hiding a button in the UI is not authorization; the service layer and API boundary must enforce the policy.

Every mutation should execute in this order:

1. Authenticate the request.
2. Resolve the actor and tenant/workspace context.
3. Authorize the operation.
4. Validate input with Zod.
5. Execute the service use case.
6. Persist the mutation through a repository.
7. Write an audit event with the request ID.
8. Return a typed response.

## Local Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The Phase 1 preview does not require database or Cloudinary keys. The protected app requires Auth.js configuration and a bootstrap account.

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

## Database Seeding

After setting `MONGODB_URI` in `.env.local`, run:

```bash
npm run db:seed
```

The seed creates or preserves 13 positions, 15 projects/sites, and the six initial employment statuses. It is safe to run repeatedly: records are upserted by `kind` and `name`, while MongoDB generates the `_id` automatically. Existing active/inactive state is not overwritten and existing records are not deleted.

If `DEMO_ADMIN_USERNAME` and `DEMO_ADMIN_PASSWORD` contain real values, the same command creates a demo Super Admin account with the `Admin` role and a bcrypt password hash. The user is created only when the username does not already exist; rerunning the command preserves the existing account and password. `DEMO_ADMIN_EMAIL` is optional metadata for future account-recovery features.

```bash
npm run db:seed
```

Then sign in at `/login` using `DEMO_ADMIN_USERNAME` and `DEMO_ADMIN_PASSWORD` from your private `.env.local`. Do not place demo passwords in source control, README files, or `.env.example`.

## Environment Management

Commit only `.env.example`. Keep actual credentials in `.env.local` or the hosting provider's encrypted environment store. Never commit a connection string, API key, API secret, password, or Auth.js secret, even in an example file.

```text
.env.example       committed placeholders
.env.local         local development; never commit
.env.test          future automated-test environment
Vercel Preview     preview database and preview credentials
Vercel Production  production database and production credentials
```

Create local configuration with:

```bash
cp .env.example .env.local
```

Use separate MongoDB Atlas databases and Auth.js secrets for local, preview, and production. Do not reuse production credentials locally. The repository's `.gitignore` excludes `.env*`, so verify secrets are not force-added.

When the production API rate limiter is enabled, add the appropriate Upstash Redis URL and token to the environment store. A distributed limiter is required for serverless deployments; an in-memory limiter is not sufficient across Vercel instances.

The shared limiter is implemented in `src/lib/rate-limit.ts`. It uses a 30-request sliding window per minute and combines the authenticated subject with the request IP. `POST /api/v1/settings/seed` is the first protected endpoint; future API routes should call the same helper before authorization and mutation work. Rate-limited responses return HTTP `429`, `Retry-After`, `X-Request-Id`, and `X-RateLimit-*` headers. The limiter fails open only when Upstash variables are absent, which keeps local UI development usable; Preview and Production environments should always configure both values.

### Client-owned deployment accounts

The application is provider-account agnostic. For each client deployment, the client should own the following accounts and billing relationships:

| Service       | Client-owned resource                                         | Environment values                                   |
| ------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| Vercel        | Client team/project and billing                               | Project deployment settings                          |
| MongoDB Atlas | Dedicated project, database, database user, and network rules | `MONGODB_URI`                                        |
| Auth.js       | Client-generated secret and canonical application URL         | `AUTH_SECRET`, `AUTH_URL`                            |
| Cloudinary    | Client cloud, upload policy, and API credentials              | `CLOUDINARY_*`                                       |
| Upstash       | Client Redis database for distributed rate limiting           | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

Recommended ownership transfer:

1. The client creates the accounts under their organization email and enables billing directly.
2. The client creates separate development, preview, and production resources where the provider supports them.
3. The development team receives only the minimum environment values needed for the selected environment.
4. Vercel Preview and Production variables are entered by the client owner or delegated administrator.
5. The client retains account recovery, billing, and provider ownership; the application repository contains no provider-specific account identifiers.

Rotate any credential that was previously pasted into this file or shared in chat. Treat it as compromised, even if it was intended for development.

### Auth.js bootstrap accounts

The current credentials provider supports the first Admin and HR accounts through server-only environment variables:

```env
AUTH_ADMIN_EMAIL=admin@example.com
AUTH_ADMIN_PASSWORD=use-a-long-random-password
AUTH_HR_EMAIL=hr@example.com
AUTH_HR_PASSWORD=use-a-long-random-password
```

This is a temporary bootstrap adapter for the Phase 1 foundation. Before production, replace it with a MongoDB user repository and a password hashing provider. Do not use plaintext bootstrap passwords as a permanent identity store. Rotate any provider credentials that were previously placed in `.env.example`.

## Delivery Roadmap

### Phase 1: Workforce foundation

Complete the current UI, replace remaining seed-backed employee mutations with repositories, add employee Mongoose models, implement the remaining `/api/v1` contracts, connect client-provisioned Auth.js users, and persist audit events. Add pagination, profile pages, edit/delete dialogs, and full API rate limiting.

### Phase 2: Identity and operational security

Implement password login or approved OAuth, forgot/reset password, role assignment, single active session, inactivity timeout, CSRF-safe mutations, security headers, request IDs, structured errors, API versioning, and Redis-backed rate limiting.

### Phase 3: Leave and attendance

Add leave requests, approvals, holidays, attendance imports, balance calculation, and an append-only leave ledger. Keep balance changes traceable and policy-driven.

### Phase 4: Workforce operations

Add onboarding/offboarding checklists, contract renewal reminders, employee documents through Cloudinary, notifications, and configurable dashboard widgets. Use queued or event-driven work for reminders.

### Phase 5: Payroll and reporting

Add payroll-period snapshots, statutory exports, approval workflows, reporting, and versioned calculation services. Historical reports must use immutable snapshots rather than mutable employee fields.

### Phase 6: Multi-tenant scale

Add organization boundaries, tenant-scoped repositories, feature flags, retention policies, rate-limit tiers, observability, and query/index reviews based on production usage.

## Production Readiness

Before calling the application production-ready:

- Replace all seed-backed mutations with authenticated service calls.
- Implement MongoDB indexes and connection reuse for serverless execution.
- Add `/api/v1` routes with consistent response envelopes and error codes.
- Use a distributed rate limiter with separate limits for authentication, reads, and mutations.
- Enforce RBAC on the server and record all CRUD and leave-credit changes in immutable audit logs.
- Validate and sanitize every external input; never log government IDs or secrets.
- Configure security headers, strict CORS policy where applicable, request IDs, and bounded payload sizes.
- Add health/readiness checks that do not expose sensitive infrastructure details.
- Configure Vercel Preview and Production variables independently.
- Add unit and browser tests once the persistence/authentication boundary is implemented.

## Engineering Conventions

- Add a feature module and service use case before adding a new page.
- Keep API contracts independent from component props.
- Prefer stable IDs and references over display-name joins.
- Treat audit logs and leave ledgers as immutable records.
- Prefer soft deletion or deactivation for referenced catalog data.
- Make new permissions explicit in the RBAC policy.
- Use additive schema changes and migration scripts for live data.
- Keep external integrations behind `lib/` adapters and repository interfaces.
- Do not place credentials, secrets, or real employee government IDs in seed data.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the current technical contracts and integration checklist.
