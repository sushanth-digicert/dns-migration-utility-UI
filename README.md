# DNS Migration Utility UI

A production-quality Angular frontend for the **DNS Account & User Migration Utility** — enabling Support Engineers to validate, migrate, monitor, and search the history of DNS account migrations.

## Tech Stack

- **Angular 22** — standalone components, signals, built-in control flow (`@if`, `@for`)
- **Angular Material 22** — tabs, cards, steppers, dialogs, checkboxes, form fields
- **RxJS** — HTTP, polling with `interval` + `takeWhile`
- **TypeScript 6** — strict types, no `any`
- **SCSS** — component-scoped styles
- **Mock HTTP Interceptor** — stateful in-memory backend, controlled by `environment.useMockApi`

## Features

| Screen | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Action cards + recent migrations table |
| Validate Accounts | `/migrate` | Enter Batch ID + Account IDs, run validation |
| Validation Results | `/migrate` (inline) | Per-account pass/fail with reason; select eligible accounts |
| Review & Start | `/migrate` (step 2) | Confirm selected accounts, start async migration |
| Migration In Progress | `/migrate` (step 3) | Live status polling every 3 seconds |
| Migration Completed | `/migrate` (step 4) | Final status + per-account log reports |
| Search by Account ID | `/history` (tab 1) | Account migration history + log report |
| Search by Batch ID | `/history` (tab 2) | Batch migration status + batch log report |

## Project Structure

```
src/app/
├── core/
│   ├── interceptors/mock-api.interceptor.ts   # Stateful mock backend
│   ├── models/migration.models.ts             # All API types
│   └── services/
│       ├── migration.service.ts               # 9 typed API methods
│       └── migration-session.service.ts       # Signal-based shared state
├── shared/
│   ├── status-badge/                          # Colour-coded status pill
│   └── log-report-dialog/                     # Modal log viewer
├── layout/shell/shell.component.ts            # Blue sidebar + router outlet
└── features/
    ├── dashboard/dashboard.component.ts
    ├── migrate/migrate.component.ts           # Full 4-step migration flow
    └── history/history.component.ts           # Account + Batch search tabs
```

## API Endpoints Integrated

| Method | Endpoint |
|---|---|
| POST | `/api/v1/migrations/validate` |
| POST | `/api/v1/migrations` |
| GET | `/api/v1/migrations/{migrationJobId}` |
| GET | `/api/v1/migrations/{migrationJobId}/accounts` |
| GET | `/api/v1/migrations/{migrationJobId}/accounts/{accountId}` |
| GET | `/api/v1/migrations/history/accounts/{accountId}` |
| GET | `/api/v1/migrations/history/batches/{batchId}` |
| GET | `/api/v1/migrations/{migrationJobId}/logs` |
| GET | `/api/v1/migrations/{migrationJobId}/accounts/{accountId}/logs` |

## Quick Start

```bash
npm install

# With real backend
npm start

# With mock backend (no backend needed)
npm run start:mock
```

Open http://localhost:4200

## Build

```bash
npm run build           # production
npm run build -- --configuration mock   # mock build
```
