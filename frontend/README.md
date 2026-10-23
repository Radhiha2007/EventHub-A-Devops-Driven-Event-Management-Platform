# EventHub frontend

React 19 + TypeScript + Vite + Tailwind 4 single-page app for the EventHub campus event platform.
It talks to the FastAPI backend and signs users in with Microsoft Entra ID (MSAL).

## Run it locally

Requirements: Node 20+ and the EventHub backend running (default `http://localhost:8000`).

```bash
npm install
cp .env.example .env.local      # then fill in the two Entra values below
npm run dev                     # http://localhost:5173
```

The dev server must stay on port **5173**: the backend's CORS allow-list contains only `http://localhost:5173`.

### Environment variables (`.env.local`, never committed)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (default `http://localhost:8000`) |
| `VITE_ENTRA_SPA_CLIENT_ID` | Client ID of your Entra **SPA** app registration (required to sign in) |
| `VITE_ENTRA_TENANT_ID` | Tenant ID (default `common`) |
| `VITE_ENTRA_API_CLIENT_ID` | The backend's `ENTRA_API_CLIENT_ID`; the app requests `api://<id>/access_as_user` |
| `VITE_ENTRA_API_SCOPE` | Optional full scope override |

Entra setup: on the SPA registration add the platform **Single-page application** with redirect URI
`http://localhost:5173`, and grant it the delegated permission `access_as_user` exposed by the API
registration. Without these variables the public pages still work and sign-in shows a configuration notice.
No secrets are used or stored in the frontend.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck (`tsc -b`) + production build into `dist/` |
| `npm run preview` | Serve the production build on :5173 |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit/component/contract tests |

## What the app does

- **Public:** home, event list with search/category/status filters, event detail, club list/detail, certificate verification (`/verify/:code`).
- **Auth:** Entra sign-in → `GET /users/me` → one-time role onboarding (`POST /users/me/onboarding`) → role-based route guards.
- **Student (`/dashboard`):** register for events and see the QR credential, tickets, notifications, certificates, feedback.
- **Club (`/club`):** club profile, create/edit events, status changes, attendee roster (+CSV), QR check-in, feedback, certificate issuance.

## Backend limitations the UI is honest about

- The QR credential is returned **once** at registration and cannot be recovered. The app keeps a copy in this browser's `localStorage` only and says so.
- There is no endpoint to list a student's registrations, so "My tickets" shows only tickets saved in this browser.
- The roster does not include student IDs, so a club issuing a certificate needs the student's EventHub ID (students copy it from their dashboard). The backend still verifies registration and check-in.
- Events have no `club_name` (resolved via `GET /api/clubs/{id}`) and no seats-left field.
- There is no delete-event endpoint, so there is no delete button; cancel instead.
- Feedback and notification endpoints are unauthenticated in the backend; feedback is therefore anonymous and the UI doesn't pretend otherwise.
- A club account manages the club whose `contact_email` equals its Microsoft email (the backend's rule); the club form fixes the email accordingly.

## Project layout

`src/api` typed client + one function per backend route · `src/auth` MSAL, provider, route guards ·
`src/pages` routes (`club/`, `student/` are lazy-loaded) · `src/components` shared UI · `src/lib` helpers.

---

## Backend-compatibility update (final backend)

Changes made against `EventHub-backend-latest` (UI/design unchanged):

| Area | Backend reality | Frontend change |
|---|---|---|
| Notifications | All routes require a token; recipient must be the caller | `auth: true` on list + mark-read |
| Feedback | `POST` needs STUDENT, COMPLETED event, and prior check-in; 409 on duplicate | `auth: true`; form shown only for checked-in students on completed events |
| My registrations | New `GET /api/registrations/me` | `api.listMyRegistrations`; Tickets page, dashboard count and event page now read from the server (no more browser-only tickets) |
| QR credential | New `POST /api/registrations/{id}/qr-credential` (re-issue, invalidates old QR, 409 once checked in) | "Show my QR code" with confirmation; latest QR cached in localStorage |
| Notification bell | — | `NotificationBell` in the header (students), unread count, 60 s polling |
| Check-in scanner | — | Fixed camera restarting on every render; clear fallback message when `BarcodeDetector` is unsupported (handheld scanners/paste still work) |

Tests updated: `api/endpoints.test.ts`, `pages/EventDetailPage.test.tsx`.

### Known backend limitations (cannot be fixed in the frontend)
- `GET /api/events/{id}/registrations` does **not** return `user_id`, but `POST /api/certificates/issue` needs the student's user UUID. Clubs must still obtain it from the student (shown on the student dashboard). Fix: add `user_id` to `RegistrationResponse`.
- Camera QR scanning relies on the browser `BarcodeDetector` API (Chrome/Edge/Android).

### Verification status
`npm install`, `npm run build` and `npm test` could **not** be run when this update was prepared (no network access in the build sandbox). Only a syntax check of all `.ts/.tsx` files was done. Please run: `npm install && npm test && npm run build`.
