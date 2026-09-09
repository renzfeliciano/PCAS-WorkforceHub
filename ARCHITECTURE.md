# WorkforceHub Architecture

*This describes the system as it actually stands today. For a line-by-line, re-verifiable trace of every security/accessibility/testing claim below, see [STANDARDS.md](STANDARDS.md) — that file is the source of truth when the two disagree.*

## Layers

`app/` owns routes, layouts, and API route handlers only — no business logic. `components/` owns shared, feature-agnostic presentation (`components/ui/`) plus a handful of cross-feature composites (employee lookup/picker). `features/<domain>/` composes a domain's UI: `components/` (dialogs, forms, tables), `api/` (a thin `fetch` client per domain), `store/` (Zustand, only where optimistic local state earns its keep — see Recruitment), and `hooks/`. `services/` holds use cases and every authorization check (`canX(role)` from `lib/rbac.ts`) — this is the one layer every mutation must pass through, regardless of which route or script calls it. `repositories/` holds persistence ports/adapters (`Mongo*Repository` classes) plus their Mongoose `models/`; service code depends on the repository *interface*, never the model, so tests can substitute an in-memory fake. `lib/` holds MongoDB, Auth.js, rate limiting, audit, and sanitize infrastructure. `schemas/` holds Zod contracts (request/form boundary validation). `types/` holds shared domain types. `tests/` mirrors `src/` and is real (see Testing below), not aspirational.

## Domains

Employees (roster, the shared profile other domains link out to), Attendance, Leave management, Travel orders, Asset issuance, Recruitment (a Kanban application-tracking board), Events, Settings (catalog management + user management), and Auth. Each domain that mutates data has its own service + repository pair and its own Vitest coverage; see STANDARDS.md §13 for exactly which layers are covered per domain.

## Entity references: id, not copied name

The standard for any field that points at another record: store that record's id, never a copy of its current display name/label, and resolve the display value from the referenced document at read time. This is what makes renaming a catalog entry (a Position, Project, employment/attendance/recruitment status) or an employee show up everywhere immediately, instead of every existing record silently keeping whatever name was current when it was created.

Reference implementations: `leaveBalances[].leaveTypeId` on Employee; `AttendanceRecord.statusId`, `LeaveRecord.employeeId`/`leaveTypeId`, `AssetIssuance.employeeId`, `TravelOrder.employees[].employeeId`, `JobApplication.positionId`/`stageId`, `Event.categoryId`, and `Employee.positionId`/`projectSiteId`/`employmentStatusId` — all resolved to a display name via a batched catalog lookup (`repositories/catalog-lookup.ts`'s `resolveCatalogNames`) rather than stored alongside the id. A reference to a deleted entity displays `"—"` (the same convention used for a genuinely absent value, e.g. Age with no birth date) instead of a blank string or a dropped row. An inactive catalog entry is excluded from *new* selections but a record's own already-assigned value stays visible, selectable, and labeled "(inactive)" so editing a record can never silently discard it. Full detail and verification commands: STANDARDS.md §10.

**Known exception:** `Employee.employmentStatus` *is* id-based, but the specific business rule for which statuses require an end-of-contract/last-day date (`src/lib/employment-status.ts`) still matches against the status's display *name*, not a stable code — renaming one of those specific statuses would silently stop matching. Closing that gap needs a `code` field on status catalog entries (mirroring `LeaveType.code`); not done yet.

## RBAC and sessions

Four roles — Admin, HR, Manager, Employee — defined as a fixed TypeScript union (`types/user.ts`) and a single permission table (`lib/rbac.ts`), not a Settings catalog: every `canX(role)` check is a literal string comparison against that union, so roles are wired into authorization code itself, not descriptive data. Widening Role into an admin-editable catalog (like Position/Project) would let a rename or a new entry silently break or bypass permission checks — a decision explicitly declined during this project's Entity Reference work; the role dropdown just reads from one shared constant instead. Auth.js issues the session with role and a session id; a server-side check enforces one active session per user, and middleware/server actions reject sessions past their inactivity window on every request, not just at sign-in.

## API contracts

Routes live under `/api/v1/<domain>` (e.g. `/api/v1/employees`, `/api/v1/employees/[id]/attendance`, `/api/v1/job-applications/[id]/stage`), each a thin wrapper: session guard → rate-limit check → Zod-parsed body/query → one service call → JSON response, with a request id carried on every response header for tracing. A route handler owns none of the guard/validation/authorization logic itself — that all lives in `lib/api-guard.ts`, `schemas/`, and `services/` so it's identical whether the caller is the UI, a script, or a test.

## Security

Zod (`src/schemas/`) validates shape at every request/form boundary. Beyond that: no `dangerouslySetInnerHTML` anywhere (JSX auto-escapes; `lib/sanitize.ts` is the mandated sink if raw HTML is ever needed) — XSS. `escapeRegex()` before any `$regex` filter, explicit type-checks on login credentials before they reach a Mongo query — NoSQL injection. Cross-origin state-changing requests to `/api/*` are rejected by `middleware.ts`, on top of the session cookie's own `SameSite=Lax` — CSRF. Security headers are unconditional; CSP is production-only by design. A distributed (Upstash-backed) sliding-window limiter gives reads, writes, and login attempts separate budgets so one tier can't starve another. Full detail and verify-it-yourself commands: STANDARDS.md §1–§9.

## Accessibility

One shared, WAI-ARIA-correct `Modal` (`role="dialog"`, `aria-modal`, labelled/described-by, Escape-to-close, focus in on open / return to trigger on close) that every dialog in the app composes rather than reimplements — `ConfirmDialog` is built on it. Beyond the modal itself: form errors are `role="alert"` (`FormField`, `ConfirmDialog`); sortable table headers expose `aria-sort` (`SortableHeader`); grouped/interactive regions that aren't native form controls carry an explicit `role` and `aria-label` computed from live state, not a static string (`KanbanColumn`'s `"<stage>, N applications"`, `ThemeToggle`'s `role="group"`); icon-only buttons always take an explicit `aria-label` (`IconButton`, pagination's prev/next, `Modal`'s close button). New interactive UI should extend these shared primitives instead of hand-rolling ARIA.

## Test hooks

Interactive elements involved in a test assertion or an automated flow carry `data-testid`, scoped to the entity it acts on rather than a bare generic name — `edit-employee-${id}`, `sort-${field}`, `catalog-${kind}-row-${id}`, `move-application-${id}`, `modal-close`. This is what lets component tests (React Testing Library) and any future browser-driven tests target elements without depending on visible text or DOM structure that copy changes would break.

## Testing

Vitest, run sequentially (`fileParallelism: false` — several files hit one shared in-memory MongoDB, and parallel runs produced genuine non-deterministic failures). Repository tests run against a real MongoDB (`mongodb-memory-server`), not fakes, so they catch actual Mongoose query bugs — regex-escaped search, duplicate-key handling, compound-unique catalog entries, and (per the Entity Reference standard above) that a catalog rename is reflected without touching the referencing document. Service tests use hand-written in-memory fakes of the repository interface to isolate RBAC/business-rule logic. API route tests exercise the real route handler, guard, and service wiring end-to-end with only `next-auth`'s session lookup mocked. Shared UI primitives (`Modal`, `ConfirmDialog`) get real DOM-rendered interaction tests. New logic is written test-first; a change to an already-tested service updates that service's test file in the same commit. Exact coverage and how to verify it: STANDARDS.md §13. Known gaps (some repositories/routes/components share a proven pattern but aren't individually tested yet): STANDARDS.md §14.

## Stack

Next.js 16 (App Router, Turbopack) on React 19. MongoDB Atlas via Mongoose; Auth.js (NextAuth) with the MongoDB adapter for sessions. Zod for all validation. Zustand for the one domain (Recruitment) whose optimistic drag-and-drop UX needs local store state ahead of the server response; everything else reads server state directly. dnd-kit powers the Recruitment Kanban board. Upstash Redis backs distributed rate limiting. `isomorphic-dompurify` is the sanitizer of record if raw HTML rendering is ever introduced. Tailwind v4 for utility styling alongside a larger handwritten `globals.css` for the app's own design system. Vitest + Testing Library + `mongodb-memory-server` for the full test pyramid described above. `tsx` runs one-off scripts (`scripts/seed.ts`, and any one-time data migration like the Entity Reference id backfill) outside the Next.js process.

## Delivery

`npm run build` (Turbopack) then `npm start`; Vercel deploy requires `MONGODB_URI` and the other vars in `.env.example`, plus an Atlas network rule allowing the deployment. `.husky/pre-commit` runs lint → typecheck → test and blocks the commit on any failure — this is enforced, not just practiced. A schema change that alters an existing unique/sparse index (e.g. making a previously-required field optional) needs the old index dropped on the live database before the app's own index-sync (`lib/mongodb.ts`'s `ensureIndexesReady`) can rebuild it with the new options — `Model.init()` treats an already-existing index as a fast no-op confirmation, not a migration, so a genuinely changed index definition conflicts rather than silently updating.
