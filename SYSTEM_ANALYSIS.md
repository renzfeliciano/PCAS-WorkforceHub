# EychAr — System Analysis

*Prepared as a technical and functional overview for client review. Reflects the system as implemented, not aspirational scope.*

## 1. Executive Summary

EychAr is a modular Human Resource Information System (HRIS) built for PCAS to manage the full employee lifecycle — records, attendance, leave, travel, company assets, recruitment, and internal events — behind role-based access control, with an audit trail on every mutation.

It is built on a modern, server-rendered web stack (Next.js/React/TypeScript), backed by MongoDB Atlas, and deployed on Vercel. The codebase follows a strict layered architecture (UI → Services → Repositories → Database) so business rules live in one place, are enforced on the server regardless of what the UI shows, and are independently testable.

## 2. Technology Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | Server-rendered pages, API routes, and middleware in one codebase |
| Language | TypeScript (strict mode) | End-to-end type safety from database to UI |
| UI | React 19, Tailwind CSS 4, Lucide icon set | Custom design system (no third-party component library) |
| Forms & validation | React Hook Form, Zod | Client-side UX validation and server-side boundary validation share the same schemas |
| Client state | Zustand | Used where local component state isn't sufficient (e.g. recruitment kanban board) |
| Drag-and-drop | dnd-kit | Recruitment pipeline (kanban) |
| Database | MongoDB Atlas, Mongoose ODM | Document store; connection pooling tuned for serverless |
| Authentication | Auth.js (NextAuth) v4, credentials provider, bcrypt password hashing | JWT session strategy, single active session per account |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) | Distributed, tiered sliding-window limiters (read/write/auth), required for multi-instance serverless |
| Media | Cloudinary | Reserved for employee document/photo storage |
| Testing | Vitest | Regression suite for business logic, auth, and utilities, built test-first (TDD) |
| Hosting | Vercel | Serverless functions, edge-friendly middleware, environment-scoped config (dev/preview/production) |

No proprietary or paid third-party UI kit is used — the interface is fully custom-built and owned by the codebase.

## 3. System Architecture

```
UI (app/, features/, components/)
   │
   ▼
Services (services/) — use cases, authorization, validation orchestration, audit
   │
   ▼
Repositories (repositories/) — persistence ports + Mongoose adapters
   │
   ▼
MongoDB Atlas
```

This is a one-way dependency chain, enforced by convention across the codebase:

- **`src/app/`** — routes, layouts, and route-level access guards. Route handlers are thin transport adapters; they don't contain business logic.
- **`src/features/`** — one folder per business module (employees, leave, attendance, travel-orders, asset-issuance, recruitment, events, settings, permissions, dashboard), each composing its own components, API client, and (where needed) local state.
- **`src/components/`** — the shared design system: modal, buttons, tables, form fields, skeleton loaders, etc. Every dialog in the app is built on one accessible `Modal` component rather than each feature reinventing it.
- **`src/services/`** — business logic and authorization decisions. Every mutation is authenticated, authorized, validated (Zod), executed, persisted, and audit-logged in that order — the UI is never trusted as the source of truth for what's allowed.
- **`src/repositories/`** — the only layer that knows about MongoDB/Mongoose. Services depend on repository *interfaces*, not the database implementation directly, which is what makes the service layer unit-testable without a live database.
- **`src/lib/`** — cross-cutting infrastructure: database connection, authentication config, rate limiting, audit logging, session/idle-timeout handling, input sanitization.
- **`middleware.ts`** — runs before every protected request: session validity, inactivity staleness, and a CSRF origin check on state-changing API calls.
- **`tests/`** — the Vitest regression suite, structured to mirror `src/` (`tests/lib/`, `tests/services/`) rather than living next to the source files, so it can be reviewed and extended as its own concern.

This separation means a business rule (for example, "Emergency Leave draws from Vacation Leave") is enforced once in the service layer and applies identically no matter which screen triggered it — not re-implemented per form.

## 4. Feature Modules & Pages

### 4.1 Dashboard (`/`)
A workspace-wide snapshot: total employee count, headcount by employment status (Regular / Contractual / Probationary / Terminated), contracts ending within 30 days, recently added employees, upcoming events, and birthday celebrants this month. Data is server-rendered on first load and refreshed client-side.

### 4.2 Employees
- **Roster** (`/employees/roster`) — searchable, filterable, sortable, paginated employee directory. Supports CSV export and a print-friendly view. Create/edit via modal; archive (soft delete) for Admin/HR, permanent delete restricted to Admin.
- **Attendance** (`/employees/attendance`, `/employees/attendance/[id]`) — look up an employee, then log and review daily attendance against a configurable status catalog (e.g. Present, Absent, Late — defined in Settings).
- **Leave management** (`/employees/leave-management`, `/employees/leave-management/[id]`) — per-employee leave balances (Vacation, Sick, Emergency, and any custom leave types configured in Settings) and a leave-record log supporting full-day and half-day requests. Emergency Leave is a special case: it has no standing balance of its own and automatically draws from Vacation Leave at the point of logging, so a half-day Emergency Leave request never fails just because the Emergency bucket itself hasn't been manually funded.
- **Travel orders** (`/employees/travel-orders`) — dispatch one or more employees for a date range, with remarks; create/edit/delete gated to Admin/HR.
- **Asset issuance** (`/employees/asset-issuance`, `/employees/asset-issuance/[id]`) — track which company assets (laptops, equipment, etc.) are currently or were previously issued to each employee.

### 4.3 Recruitment
- **Application tracking** (`/recruitment/application-tracking`) — a drag-and-drop kanban board of applicants across configurable recruitment stages (sourced from Settings), with keyboard-accessible drag support and a "Move" menu as a non-drag alternative. Applicants no longer matching an active stage (e.g. a stage was renamed) still get their own column so nothing is silently hidden.

### 4.4 Events
- **Company calendar** (`/events`) — a month-view calendar of company-wide meetings, holidays, and deadlines, categorized and color-coded. Supports multiple events per day with an overflow ("+N more") indicator, and a responsive compact view below 640px width. Create/edit/delete gated to Admin/HR.

### 4.5 Settings
- **Catalog management** (`/settings/catalog-management`) — the single place Admin/HR configure the option lists used everywhere else in the system: positions, project/work sites, employment statuses, attendance statuses, recruitment stages, and leave types. Every catalog entry is active/inactive rather than hard-deleted by default, so historical records that reference a retired option remain intact and readable.
- **User management** (`/settings/user-management`) — Admin-only: create, edit, deactivate/reactivate application user accounts and assign roles. Includes an optional, explicitly flagged "reset workspace data" tool for pre-launch testing (disabled by default, environment-gated).

### 4.6 Authentication & Session
- **Login** (`/login`) — credentials-based sign-in (username/email + password, bcrypt-hashed), rate-limited per IP to resist brute-force/credential-stuffing attempts, independent of the general API rate limit.
- **Single active session per account**: signing in overwrites the account's active session marker server-side; any other open session is invalidated and shown a clear "your account was signed in elsewhere" notice rather than a silent, unexplained sign-out.
- **Inactivity timeout**: a configurable idle window shows a "Still there?" warning with a countdown before signing out, re-validated against the server — genuine user activity (mouse/keyboard/scroll) refreshes the server-side activity timestamp directly, so an actively-used session is never mistaken for an idle one just because it hasn't happened to fire an API call recently.

## 5. Security

Security is treated as an enforced, reviewed standard, not a one-time pass:

- **Authentication & session integrity** — bcrypt password hashing; JWT sessions validated server-side on every request via `middleware.ts`; single-active-session enforcement; live inactivity staleness check (not merely a client-side timer).
- **Authorization (RBAC)** — four roles (Admin, HR, Manager, Employee) with a centralized permission table (`src/lib/rbac.ts`). Every service function checks the actor's role before executing a mutation — hiding a button in the UI is never treated as sufficient authorization on its own.
- **Injection defense** — NoSQL operator-injection guards on every credential/identity lookup (explicit type checks, not truthiness) and regex-metacharacter escaping on any free-text search that builds a MongoDB `$regex` filter.
- **XSS** — no raw-HTML rendering sink exists in the codebase (JSX auto-escapes all text); a sanitization utility (`isomorphic-dompurify`-backed) is the mandated path if one is ever introduced.
- **CSRF** — NextAuth's `SameSite=Lax` session cookie plus an explicit `Origin` header check in middleware for every state-changing API request, rejecting cross-origin writes outright.
- **Resilience** — API requests automatically retry transient failures (dropped connections, momentary 502/503/504) with exponential backoff, capped at a configurable retry limit, while deterministic client errors (validation failures, permission denials) are never retried.
- **Rate limiting** — distributed (Upstash Redis-backed) sliding-window limiting, tiered by what the request actually is rather than one flat ceiling: a generous budget for reads (normal navigation and search-as-you-type), a tighter budget for writes (deliberate create/edit/delete actions), and a strict, separate budget on the login endpoint itself keyed by IP — the login tier exists specifically to slow down password-guessing, independent of and unaffected by ordinary API traffic. All tiers return standard `429`/`Retry-After`/`X-RateLimit-*` headers.
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS are always set; a Content-Security-Policy is enforced in production builds.
- **Audit trail** — every create/update/delete on employee, leave, and other sensitive records writes an immutable audit entry (actor, action, entity, request ID, timestamp).

## 6. Accessibility

The shared `Modal` component (used by every dialog in the app) implements the WAI-ARIA dialog pattern: `role="dialog"`, `aria-modal`, labelled/described-by association, Escape-to-close, and focus management (focus moves into the dialog on open and returns to the triggering control on close). Active navigation links carry `aria-current="page"`; icon-only controls carry `aria-label`; live-updating regions (toasts, loading indicators) carry appropriate `role`/`aria-live` attributes.

## 7. Responsive Design

The application is built mobile-first-aware across breakpoints, not just "shrunk down" for small screens: a collapsible sidebar (icon rail on desktop, drawer on mobile), a calendar view that degrades gracefully on narrow viewports, and modals capped to a maximum height (not a fixed one) so they always fit the visible viewport, including on devices with on-screen keyboards or non-standard browser chrome. Light and dark themes are both fully supported.

## 8. Testing & Quality Assurance

An automated regression suite (Vitest, kept in its own `tests/` directory mirroring `src/`, 183 tests across 26 files as of this writing) covers all four layers of the stack, not just business logic — every feature service has its own test file, and the layers under and around it are represented too:

- **Repository layer**: integration tests against a real MongoDB (in-memory, `mongodb-memory-server` — no external service needed), proving actual Mongoose query behavior rather than assumptions about it: regex-escaped search, duplicate-key handling, compound-unique catalog entries, password hashing, one-attendance-record-per-employee-per-day.
- **API route layer**: the Next.js route handlers themselves, with only the session lookup mocked — real database, real rate limiter, real service calls — proving the HTTP wiring (auth guard, validation, response shape) works, including an end-to-end proof that the EL/VL half-day fix (below) works through the actual route, not just the service function.
- **UI component layer**: React Testing Library tests against the shared primitives every dialog in the app is built on — the WAI-ARIA `Modal` contract (role, focus management, Escape-to-close) and the `ConfirmDialog` delete-confirmation pattern used across every feature.

- **Employees**: RBAC gating (who can edit/archive/permanently delete), the archive-before-permanent-delete rule, and leave-balance-history entries only being written for balances that actually changed.
- **Leave**: balance calculation, including the Vacation/Emergency Leave interaction described in §4.2.
- **Attendance, Travel Orders, Asset Issuance, Recruitment, Events, Catalog Settings, User Management**: RBAC gating and module-specific business rules — e.g. a travel order referencing a nonexistent employee is rejected, an Admin can't change their own role or deactivate their own account, catalog "status" entries require a category.
- Role-based access control rules (`rbac.ts`) directly.
- Date-range and duration-parsing utilities.
- The API retry/resilience mechanism.
- Authentication session callbacks (idle timeout vs. concurrent-session detection), the login rate limiter (checked *before* any credential/database work, keyed by client IP), and the login timing side-channel fix (bcrypt comparison runs at constant time whether or not the username exists).

The suite runs before every commit as a standing practice, alongside TypeScript strict-mode compilation and ESLint, and new logic is written test-first (TDD) rather than tested after the fact. Coverage across all four layers is representative rather than exhaustive — the modules/routes/components covered were chosen for having the most distinguishing behavior, not because every sibling module was tested too; see [STANDARDS.md](STANDARDS.md) for the honest, current gap list.

## 9. Engineering Approach

How this system gets built and maintained is as much a part of what's being delivered as the features themselves:

- **Test-driven development for new logic.** New business logic or components are built test-first: write the test against the intended behavior, confirm it fails for the right reason (not a setup mistake), then implement until it passes. This catches wrong assumptions about a dependency's actual behavior at the cheapest possible point — before the implementation is built around them.
- **Regression suite gates every commit — enforced, not just practiced.** A git pre-commit hook runs lint, type-checking, and the full Vitest suite before a commit can be created at all; a failure at any step blocks it.
- **Layered architecture as a hard rule, not a suggestion.** The one-way dependency chain in §3 (UI → Services → Repositories → Database) is enforced by convention across every feature, so a business rule is never duplicated per screen and is always independently testable.
- **Production-grade by default.** Explicit input validation over incidental behavior, defense-in-depth on anything security-sensitive, and accessible/reusable components are the default approach for new work — not something added later under a separate "hardening" pass.
- **Claims are checkable, not just asserted.** [STANDARDS.md](STANDARDS.md) traces every security/accessibility/testing claim in this document to the exact file and line that implements it, plus a command or manual step to verify it directly — including an explicit, un-hidden list of what's *not* done yet.

## 10. Deployment & Environment Model

- **Hosting**: Vercel, with independently configured Preview and Production environments.
- **Database**: MongoDB Atlas, with separate databases recommended per environment (local / preview / production) rather than a shared one.
- **Environment ownership**: the client owns the production accounts for Vercel, MongoDB Atlas, Auth.js secrets, Cloudinary, and Upstash — the codebase itself contains no provider-specific account identifiers, so it is portable between hosting arrangements.
- **Configuration**: all environment-specific values (database URI, auth secret, rate-limit credentials, feature seed flags) are supplied via environment variables, never committed to source control.

## 11. Summary for Decision-Makers

EychAr is not a prototype wearing production styling — the authorization, validation, and audit rules that matter for an HR system of record are enforced at the service layer on every request, independent of the UI, and are backed by an automated test suite that catches regressions before they reach users. The module boundaries (Employees, Leave, Attendance, Travel, Assets, Recruitment, Events, Settings) map directly onto how the business already operates, and each is independently extensible — new leave types, recruitment stages, attendance statuses, or employment statuses are configuration, not code changes. And unlike a document that only asserts quality, every claim above about security and testing is traceable to a specific line of code in [STANDARDS.md](STANDARDS.md) — nothing here has to be taken on faith.
