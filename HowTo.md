# HowTo — DNS Migration Utility UI

## Running the App

### Prerequisites

- Node.js 20+ and npm 9+
- (Optional) A running backend at `http://localhost:8080` that proxies `/api/v1`

### Install dependencies

```bash
cd dns-migration-utility-UI
npm install
```

### Start with the mock backend (recommended for development)

```bash
npm run start:mock
```

This activates `environment.mock.ts` which sets `useMockApi: true`. The `mockApiInterceptor` intercepts every HTTP call and returns realistic in-memory responses with 300–800 ms simulated latency. No backend required.

Open http://localhost:4200

### Start against a real backend

```bash
npm start
```

Configure your dev server proxy in `proxy.conf.json` if the backend is on a different port:

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "changeOrigin": true
  }
}
```

Add `"proxyConfig": "proxy.conf.json"` under the `serve` → `options` block in `angular.json`.

---

## End-to-End Workflow (UI)

### 1. Validate Accounts

1. Click **Validate Accounts** on the Dashboard, or navigate to **Migrate Accounts** in the sidebar.
2. (Optional) Enter a **Batch ID** to group this migration.
3. Enter one **Account ID per line** in the text area (e.g. `AC-10045`).
4. Click **Validate Accounts**.
5. The Validation Results table appears below:
   - **Passed** accounts are pre-selected (green badge).
   - **Failed** accounts are shown with the failure reason and cannot be selected.
   - Deselect any valid account if you do not want to migrate it.

### 2. Review & Start Migration

1. Click **Proceed to Review (N Selected)**.
2. Review the list of selected accounts. If a Batch ID was entered, it appears at the top.
3. Click **Start Migration (N Accounts)**.
4. The app calls `POST /api/v1/migrations` and moves to the **In Progress** screen.

### 3. Migration In Progress

- The account status table polls `GET /api/v1/migrations/{jobId}/accounts` every **3 seconds**.
- Statuses progress: `QUEUED` → `MIGRATING` → `COMPLETED` or `FAILED`.
- When all accounts reach a terminal state, the view advances automatically to **Completed**.

### 4. Migration Completed

- The final status of every account is shown.
- Click **View Log Report** for any account to open a diagnostic log modal.
- Click **Migrate Another Batch** to reset the flow, or **Search History** to look up past migrations.

### 5. Search History

Navigate to **Search History** in the sidebar.

#### By Account ID

1. Select the **By Account ID** tab.
2. Enter an Account ID and click **Search**.
3. Each historical migration entry shows the status and a **View Log Report** link.

#### By Batch ID

1. Select the **By Batch ID** tab.
2. Enter a Batch ID and click **Search**.
3. The result shows the overall batch status and a **View Log Report** link for the full batch diagnostic log.

---

## Switching Between Mock and Real API

The toggle is in the environment files:

| File | `useMockApi` |
|---|---|
| `src/environments/environment.ts` | `false` (default dev) |
| `src/environments/environment.mock.ts` | `true` |

`npm run start:mock` uses the `mock` Angular build configuration, which replaces `environment.ts` with `environment.mock.ts` at build time.

To permanently point a custom environment at the mock API, copy `environment.mock.ts` and set `useMockApi: true` there.

---

## Mock Backend Behaviour

The interceptor in `src/app/core/interceptors/mock-api.interceptor.ts` maintains an in-memory `jobs` map keyed by `migrationJobId`.

- **Validation**: the 3rd account in the list (or any account whose ID ends in `7`) always fails with `"Account does not exist in source system."`. All others pass.
- **Migration**: accounts start as `QUEUED`, advance to `MIGRATING` after ~1 s, then to `COMPLETED`. Any account whose ID ends in `8` is marked `FAILED`.
- **History**: returns two sample historical entries for any searched Account ID or Batch ID.
- **Logs**: returns INFO and ERROR entries appropriate to the account's final state.

All responses have a 300–800 ms random delay to simulate network latency.

---

## Adding a Proxy for the Real Backend

Create `proxy.conf.json` in the project root:

```json
{
  "/api": {
    "target": "http://your-backend-host:8080",
    "changeOrigin": true,
    "secure": false
  }
}
```

Update `angular.json` under `serve` → `configurations` → `development` → `options`:

```json
"proxyConfig": "proxy.conf.json"
```

Then `npm start` will forward all `/api/v1/...` requests to your backend.
