# Quickstart: Database Download Management

**Feature**: 006-database-download-mgmt

## Prerequisites

- Node.js 20+
- npm 9+
- Project dependencies installed (`npm install` from repo root)

## New Dependency

```bash
cd server
npm install 7z-wasm
```

## Development Workflow

### 1. Start the dev servers

```bash
# Terminal 1: Server
cd server && npm run serve

# Terminal 2: Client (Vite dev server)  
cd client && npm run dev
```

### 2. Open the Settings page

Navigate to `http://localhost:5173/settings` (or whatever port Vite assigns).

The new **Database** section appears below the existing Indexing section.

### 3. Test the download flow

1. Click **"Download Memory Alpha Dump"**
2. Watch the progress bar update in real-time (SSE)
3. After download completes, decompression starts automatically
4. On completion, the file appears in the XML file list below

### 4. Test the file list

- XML files in `data/` appear with name, size, date, and import button
- Click **Import** next to a file to trigger the mw-import pipeline

### 5. Test freshness check

- If the XML file was downloaded within the last 7 days, a notice appears:  
  *"Last updated X days ago — an update may not be necessary"*
- The re-download button remains available

### 6. Test cancellation

- Start a download and click **Cancel**
- Verify partial files are cleaned up and UI returns to idle state

## Key Files

| File | Purpose |
|------|---------|
| `server/src/lib/download-manager.ts` | Download + decompress orchestrator |
| `server/src/api/routes/database.ts` | REST + SSE endpoints |
| `server/src/api/routes/indexing.ts` | Modified: SSE endpoint added |
| `client/src/hooks/useSSE.ts` | Reusable SSE React hook |
| `client/src/pages/SettingsPage.tsx` | Modified: Database section added |
| `shared/src/types/wiki.ts` | Modified: new shared types |

## Running Tests

```bash
# Server unit tests
cd server && npx vitest run tests/unit/download-manager.test.ts

# Server integration tests
cd server && npx vitest run tests/integration/database-endpoints.test.ts

# Client tests  
cd client && npx vitest run tests/components/SettingsPage.test.tsx
cd client && npx vitest run tests/unit/useSSE.test.ts
```
