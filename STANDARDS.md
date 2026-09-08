# WorkforceHub — Standards Verification Checklist

*Every claim in [SYSTEM_ANALYSIS.md](SYSTEM_ANALYSIS.md) and README.md's "Security & Accessibility Standards" section, traced to the exact file and line that enforces it, plus how to check it yourself. If a line number below doesn't match what's in the file, treat the claim as unverified and flag it — this document is meant to be checked against the code, not trusted on its own.*

*Last verified: 2026-09-08.*

## How to use this file

Each row is a claim → the file/line that implements it → a command or manual step you can run yourself to confirm it's actually there. Nothing here should require taking my word for it.

## 1. Authentication & Session Security

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Passwords are bcrypt-hashed, never stored/compared in plain text | [src/lib/auth.ts:67](src/lib/auth.ts) (`compare(credentials.password, user.passwordHash)`) | `grep -n "bcryptjs" src/lib/auth.ts` |
| Login credentials are explicitly type-checked before reaching a DB query (blocks NoSQL operator injection like `{ "$ne": null }`) | [src/lib/auth.ts:46-47](src/lib/auth.ts) | `grep -n "typeof credentials" src/lib/auth.ts` |
| Only one active session per account — a new sign-in invalidates every other open session | [src/lib/auth.ts:78](src/lib/auth.ts) sets `activeSessionId`; [src/lib/auth.ts:127](src/lib/auth.ts) checks it on every token refresh | See §9 "Live re-verification" below for a real end-to-end check |
| Inactivity timeout is checked live on the server on every request, not just trusted from the client's clock | [middleware.ts:17-18](middleware.ts) (`authorized` callback checks `token.expired`) | `grep -n "authorized:" middleware.ts` |
| A session invalidated by a concurrent login shows an explicit "signed in elsewhere" notice, not a silent bounce | [src/context/concurrent-session-guard.tsx](src/context/concurrent-session-guard.tsx) (whole file) | Open the app in a session, then sign in again elsewhere with the same account; the open tab should show the modal within ~30s |
| Login response timing doesn't reveal whether a username exists — `compare()` always runs, against a dummy hash when no user was found, so a real vs. made-up account takes the same time | [src/lib/auth.ts](src/lib/auth.ts) (`DUMMY_PASSWORD_HASH`, and `user?.passwordHash ?? DUMMY_PASSWORD_HASH` in `authorize()`) | `npm test -- auth` — see the "still runs a password comparison when the username doesn't exist" test |

## 2. Authorization (RBAC)

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Four roles (Admin, HR, Manager, Employee) with a single, centralized permission table | [src/lib/rbac.ts](src/lib/rbac.ts) (whole file, ~44 lines) | Open the file directly — every `canManageX`/`canDeleteX` check the services call lives here, nowhere else |
| Every mutating service function checks the actor's role before executing, independent of what the UI shows | e.g. [src/services/leave-record-service.ts:52-53](src/services/leave-record-service.ts) (`canManageLeaveBalances`) | `grep -rn "canManage\|canDelete\|canEdit\|canAccess" src/services/*.ts` — every service file that mutates data should have at least one hit |
| RBAC rules have automated regression coverage | [src/lib/rbac.test.ts](src/lib/rbac.test.ts) | `npm test -- rbac` |

## 3. Injection & Input Handling

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Free-text search escapes regex metacharacters before building a MongoDB `$regex` filter | [src/repositories/employee-repository.ts:98](src/repositories/employee-repository.ts) (`escapeRegex`) | `grep -n "escapeRegex" src/repositories/employee-repository.ts` |
| All request/form boundaries are validated with Zod schemas, not trusted raw | [src/schemas/](src/schemas/) (one schema file per domain object) | `ls src/schemas/` — every mutating API route should import from here |

## 4. XSS

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| No raw-HTML rendering sink exists — JSX auto-escapes all text | N/A (absence of a pattern) | `grep -rn "dangerouslySetInnerHTML" src/` — should return nothing |
| If raw HTML is ever needed, a sanitizer is already in place as the mandated path | [src/lib/sanitize.ts:10](src/lib/sanitize.ts) (`sanitizeHtml`, backed by `isomorphic-dompurify`) | `grep -n "sanitizeHtml" src/lib/sanitize.ts` |

## 5. CSRF

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| State-changing API requests (`POST`/`PUT`/`PATCH`/`DELETE`) are rejected if their `Origin` header doesn't match the app's own origin | [middleware.ts:36-45](middleware.ts) (`isCrossOriginApiWrite`) | `grep -n "isCrossOriginApiWrite\|CROSS_ORIGIN_REQUEST_BLOCKED" middleware.ts` |
| Session cookie itself defaults to `SameSite=Lax` (NextAuth default, defense-in-depth alongside the check above) | NextAuth internals, not app code | Inspect the `next-auth.session-token` cookie in browser devtools after logging in — `SameSite` should read `Lax` |

## 6. Security Headers

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS set on every response | [next.config.ts:25-30](next.config.ts) | `grep -n "key:" next.config.ts` |
| Content-Security-Policy enforced in production builds only | [next.config.ts:31](next.config.ts) | Run `npm run build && npm start`, then check response headers (dev server intentionally omits CSP so it doesn't fight Turbopack's HMR websocket) |

## 7. Rate Limiting

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Distributed (not in-memory) sliding-window limiter, required because Vercel serverless functions don't share memory across instances | [src/lib/rate-limit.ts:15](src/lib/rate-limit.ts) (`LIMITS` config), [src/lib/rate-limit.ts:45](src/lib/rate-limit.ts) (`checkApiRateLimit`), Upstash-backed | `grep -n "slidingWindow\|Ratelimit" src/lib/rate-limit.ts` |
| Reads, writes, and login attempts are on **separate** budgets, not one shared ceiling — each gets its own Redis key prefix so one tier can't be starved by another | [src/lib/rate-limit.ts:15-20](src/lib/rate-limit.ts) (`LIMITS.read`/`.write`/`.auth`, each with its own `prefix`) | `grep -n "prefix:" src/lib/rate-limit.ts` — should show three distinct prefixes |
| A `GET`/`HEAD` request gets the generous "read" budget; any mutating verb gets the tighter "write" budget | [src/lib/api-guard.ts](src/lib/api-guard.ts) (`kind = request.method === "GET" ... ? "read" : "write"`) | `grep -n "\"read\" : \"write\"" src/lib/api-guard.ts` |
| The login endpoint itself is rate-limited (5/min per IP), checked before any credential or database work — separate from, and unaffected by, general API traffic | [src/lib/auth.ts:47-49](src/lib/auth.ts) (`checkApiRateLimit(\`login:${ip}\`, "auth")`, called first in `authorize()`) | `grep -n "login:\${ip}" src/lib/auth.ts`; regression-tested in [tests/lib/auth.test.ts](tests/lib/auth.test.ts) (`describe("auth.ts authorize (login)")`) |
| Rate-limited responses return standard `429` + `Retry-After` + `X-RateLimit-*` headers | [src/lib/api-guard.ts](src/lib/api-guard.ts) | `grep -n "RATE_LIMITED\|X-RateLimit" src/lib/api-guard.ts` |

## 8. Resilience (API Retry)

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Transient failures (dropped connections, 502/503/504) retry automatically with exponential backoff, capped at a configurable limit | [src/lib/api-client.ts:47-52](src/lib/api-client.ts) (`MAX_RETRIES`, `RETRYABLE_STATUS`) | `grep -n "MAX_RETRIES\|RETRYABLE_STATUS" src/lib/api-client.ts`; env var is `NEXT_PUBLIC_API_MAX_RETRIES` in `.env.example` |
| Deterministic 4xx errors (validation, permission) are never retried | [src/lib/api-client.ts:76](src/lib/api-client.ts) (only status codes in `RETRYABLE_STATUS` retry) | `npm test -- api-client` — see the "never retries a deterministic 4xx" test case |
| Covered by automated tests, including the retry-exhaustion path | [src/lib/api-client.test.ts](src/lib/api-client.test.ts) | `npm test -- api-client` |

## 9. Audit Trail

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Every create/update/delete on leave records writes an immutable audit entry with actor, action, entity, and request ID | [src/services/leave-record-service.ts:86,125,149](src/services/leave-record-service.ts) (`audit.record(...)` on create/update/delete) | `grep -n "audit.record" src/services/*.ts` — check each mutating service |

## 10. Accessibility (WAI-ARIA)

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Every dialog in the app is built on one shared, accessible Modal component | [src/components/ui/modal.tsx:80-81](src/components/ui/modal.tsx) (`role: "dialog"`, `"aria-modal": true`) | `grep -rln "from \"@/components/ui/modal\"" src/features/` — every feature's dialogs should import from here, not build their own |
| Escape closes the dialog; focus moves in on open and returns to the trigger on close | [src/components/ui/modal.tsx:40-54](src/components/ui/modal.tsx) | Open any modal, press `Tab` then `Escape` — focus should return to whatever button opened it |

## 11. Responsive Design

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Modals are capped at a maximum height that respects the actual viewport, never a fixed height that overflows on small screens | [src/app/globals.css:1748](src/app/globals.css) (base rule, `calc(100dvh - 40px)`) and [src/app/globals.css:2371](src/app/globals.css) (≤620px rule, `min(75vh, calc(100dvh - 24px))`) | Open any modal at a narrow browser width (e.g. 375px) — it should never be taller than the visible screen |

## 12. Automated Test Coverage

| Claim | Enforced in | Verify it yourself |
| --- | --- | --- |
| Vitest regression suite covering business logic, RBAC, auth callbacks, date/duration utilities, and the retry mechanism, kept in its own `tests/` directory (mirrors `src/`) rather than co-located with source | [tests/lib/api-client.test.ts](tests/lib/api-client.test.ts), [tests/lib/auth.test.ts](tests/lib/auth.test.ts), [tests/lib/date-range.test.ts](tests/lib/date-range.test.ts), [tests/lib/duration.test.ts](tests/lib/duration.test.ts), [tests/lib/leave-eligibility.test.ts](tests/lib/leave-eligibility.test.ts), [tests/lib/rbac.test.ts](tests/lib/rbac.test.ts) | `npm test` — should report all files passing |
| Every feature service has dedicated RBAC + business-rule regression tests: employee records, attendance, leave, travel orders, asset issuance, recruitment/application tracking, events, catalog settings, and user management | [tests/services/employee-service.test.ts](tests/services/employee-service.test.ts), [tests/services/attendance-service.test.ts](tests/services/attendance-service.test.ts), [tests/services/leave-record-service.test.ts](tests/services/leave-record-service.test.ts), [tests/services/travel-order-service.test.ts](tests/services/travel-order-service.test.ts), [tests/services/asset-issuance-service.test.ts](tests/services/asset-issuance-service.test.ts), [tests/services/job-application-service.test.ts](tests/services/job-application-service.test.ts), [tests/services/event-service.test.ts](tests/services/event-service.test.ts), [tests/services/settings-service.test.ts](tests/services/settings-service.test.ts), [tests/services/user-service.test.ts](tests/services/user-service.test.ts) — 120 tests total across the whole suite as of this writing | `npm test` — check the "Test Files" and "Tests" summary line count |
| Repository-layer integration tests run against a real MongoDB (in-memory, via `mongodb-memory-server`) — not fakes — so they catch actual Mongoose query bugs: regex-escaped search, duplicate-key handling, compound-unique catalog entries, one-attendance-record-per-employee-per-day | [tests/global-setup.ts](tests/global-setup.ts) (starts the shared in-memory MongoDB once for the run), [tests/repositories/employee-repository.test.ts](tests/repositories/employee-repository.test.ts), [tests/repositories/user-repository.test.ts](tests/repositories/user-repository.test.ts), [tests/repositories/setting-repository.test.ts](tests/repositories/setting-repository.test.ts), [tests/repositories/attendance-record-repository.test.ts](tests/repositories/attendance-record-repository.test.ts), [tests/repositories/leave-record-repository.test.ts](tests/repositories/leave-record-repository.test.ts) | `npm test` — these run alongside the fake-backed tests automatically, no separate command needed |
| Suite runs (and must be green) before every commit | Process convention, not code | Ask whoever is committing to confirm `npm test` was run — this isn't wired into a git hook yet (see §13) |
| New logic is written test-first (TDD): the test is written and confirmed to fail before the implementation exists | Process convention, not code | Check the commit history for a given feature — the test file should not appear only after the implementation is already working |
| Any change to an already-tested service also updates that service's designated test file, in the same piece of work | Process convention, not code | Check that a commit touching `src/services/*.ts` also touches the matching `tests/services/*.test.ts`, unless the change is genuinely untestable (e.g. a comment-only edit) |

## 13. Known Gaps (Honest, Not Hidden)

Things claimed nowhere as "done" but worth being explicit about, so this document doesn't overstate what exists:

- **No git pre-commit hook** enforces `npm test`/`npm run lint`/`tsc --noEmit` automatically — it's currently a manual discipline, not a technical guarantee. Worth adding a Husky/lint-staged hook if this needs to be enforced rather than just practiced.
- **Test coverage is service- and repository-first**, not full-stack. Every feature service has RBAC/business-rule tests, and the repositories with the most distinguishing behavior have real-MongoDB integration tests (see §12), but API routes and UI components don't yet — the suite doesn't prove the HTTP wiring (auth guard + rate limit + request parsing) or the rendered UI are bug-free, only the layers under them.
- **Not every repository has an integration test yet** — attendance-record, travel-order, asset-issuance, job-application, event, and leave-type repositories follow the same CRUD pattern already proven by the five covered ones, but aren't individually tested.
- **A Mongoose index-build race exists**: schema-declared unique indexes build asynchronously in the background, and nothing in `connectMongoDB()` waits for that to finish — worked around per test file (`Model.init()`) rather than fixed at the app level. Flagged as a follow-up, not yet resolved.
- **CSP is production-only by design** (see §6) — anyone checking security headers against `npm run dev` will not see it and should not conclude it's missing.
- **Cloudinary and Upstash are configured as dependencies** but require the client's own account credentials in `.env.local`/hosting environment to be active — they are not "on" by default in a fresh clone.

## How to re-generate this file's line numbers

Line numbers drift as the code changes. Re-run the `grep -n` commands in each row above against the current codebase before relying on this document for anything client-facing; if a line number is off, the claim itself should still be checked for whether it still holds, not assumed stale.
