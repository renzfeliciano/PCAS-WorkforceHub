# WorkforceHub Phase 1

## Architecture

`app/` owns routes and layouts only. `components/` owns presentation and user interaction. `features/` composes feature UI. `services/` contains use cases and authorization checks. `repositories/` contains persistence ports/adapters. `lib/` contains MongoDB, Auth.js, Cloudinary, session, and audit infrastructure. `schemas/` contains Zod contracts. `types/` contains shared domain types. A future `tests/` directory will contain Vitest unit tests and Playwright browser tests.

## Employee model

MongoDB Atlas is the system of record. Application-facing entity IDs are `string` values; repository/database adapters own conversion to and from MongoDB `ObjectId`. Numeric SQL-style IDs must not leak into domain types or API contracts. An employee stores employee number, name, position, project/site, hire and contract dates, status, contact, address, SSS, PhilHealth, Pag-ibig, TIN, and `leaveCredits: { sickLeave, vacationLeave }`. Supported employment statuses are Contractual, Probationary, Regular, Terminated, Resigned, and AWOL. Positions, projects/sites, and statuses are active/inactive catalogs; only active catalog items appear in employee dropdowns. Leave credit updates are audited and limited to Admin and HR by the service layer.

## RBAC and sessions

Roles are Admin, HR, Manager, and Employee. Admin/HR manage employee records, settings, and leave credits. Manager can view team records. Employee can view their own profile. Auth.js enriches the session with role and session ID. A server-side session repository enforces one active session per user; middleware and server actions reject inactive sessions after `SESSION_INACTIVITY_MINUTES`.

## API contracts

`GET /api/employees?page=&query=&status=` lists paginated records. `POST /api/employees` creates a record. `GET /api/employees/:id` returns the profile. `PATCH /api/employees/:id` updates a record. `DELETE /api/employees/:id` archives a record. `PATCH /api/employees/:id/leave-credits` accepts `{ sickLeave, vacationLeave }`, requires Admin/HR, validates with Zod, and writes an audit event. Settings use `/api/projects` and `/api/statuses` with the same service/repository split.

## Delivery plan

The current UI uses seed data so it can be previewed without secrets. Before deployment, implement the Mongoose adapters, Auth.js provider, session/audit collections, API handlers that call services, and replace seed data with repository calls. Testing is intentionally deferred for now; when resumed, add Vitest coverage for schemas/services/RBAC and Playwright coverage for login, CRUD, filtering, leave-credit authorization, and export csv. Vercel Hobby requires environment variables from `.env.example`, a connected MongoDB Atlas network rule, and `npm run build` passing.
