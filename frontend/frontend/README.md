# Civic Frontend — Part 4

React + TypeScript + Tailwind frontend for the Civic Issue system. **Part 4**
covers the scaffold, design system, and full auth flow (login, register,
protected routes, role-based redirects).

## Prerequisites

- **Node.js 18+** — https://nodejs.org/ (LTS). Verify: `node -v`.

## Setup & run (Windows PowerShell)

From the `frontend/` folder:

```powershell
npm install
npm run dev
```

Open **http://localhost:5173**.

The dev server proxies `/api` and `/uploads` to the backend on port 8080
(see `vite.config.ts`), so **start the backend first** (and the AI service if
you want image analysis). No CORS setup needed in dev.

## Try it

1. Go to http://localhost:5173 → you're redirected to **/login**.
2. Sign in as the demo admin (`admin@civic.com` / `admin123`) → lands on the
   **Authority dashboard**.
3. Sign out, click **Create an account**, register → lands on the **Citizen**
   home as a new citizen.
4. Refresh the page — you stay signed in (the JWT is restored from storage).

## Design system

- **Identity:** "civic wayfinding" — highway-sign green (`sign-*`), hazard amber
  (`hazard-*`) reserved for severity/priority, asphalt neutrals.
- **Type:** Space Grotesk (display) + Archivo (UI/body).
- **Reusable classes** in `index.css`: `.field-input`, `.field-label`,
  `.btn-primary`, `.btn-ghost`. Reduced-motion is respected globally.

## Structure

```
src/
├── main.tsx                 # entry
├── App.tsx                  # routes + role redirects
├── types.ts                 # shared API types
├── index.css                # Tailwind + design tokens
├── api/
│   ├── client.ts            # axios instance, JWT interceptor, error helper
│   └── auth.ts              # login / register / me calls
├── auth/
│   ├── AuthContext.tsx      # session state (restores JWT on load)
│   └── ProtectedRoute.tsx   # auth + role guards
├── components/
│   ├── Signboard.tsx        # the green auth-page panel (design centrepiece)
│   └── AppLayout.tsx        # top bar shell for signed-in pages
└── pages/
    ├── Login.tsx
    ├── Register.tsx
    ├── CitizenHome.tsx      # placeholder cards (filled in Part 5)
    └── AdminHome.tsx        # placeholder cards (filled in Part 6)
```

## How auth works

- On login/register the JWT is stored (localStorage) and attached to every
  request via an axios interceptor.
- On app load, if a token exists, the app calls `/api/auth/me` to restore the
  session; a 401 clears the token.
- `ProtectedRoute` redirects anonymous users to `/login` and sends users to the
  area matching their role.

## Part 5 — Citizen module (implemented)

The full citizen experience:

- **Report an issue** (`/app/report`): photo upload with preview, optional
  category, description, and an interactive **Leaflet + OpenStreetMap** pin
  picker with a "use my location" button. On submit, the AI assessment
  (category, confidence, severity, priority) is shown right away.
- **My complaints** (`/app/complaints`): a list of everything you've reported,
  with status and severity at a glance, plus an empty state.
- **Complaint detail** (`/app/complaints/:id`): image, assessment, location
  (with a link to the map), description, and a **status timeline** showing the
  lifecycle plus a full activity log.
- **Home** (`/app`): a hero "Report an issue" call to action and your 3 most
  recent reports.

New dependencies: `leaflet`, `react-leaflet`, `@types/leaflet`. Run
`npm install` again after pulling Part 5.

> The map pin is a custom SVG divIcon, so no Leaflet marker-image asset config
> is needed.

## Part 6 — Admin dashboard (implemented)

The full authority experience, behind the `ADMIN` role:

- **Dashboard** (`/admin`): stat cards (total / pending / in progress / resolved)
  plus **Recharts** — a bar chart of issues by category and a donut of severity.
- **Complaint queue** (`/admin/complaints`): a filterable (category / severity /
  status), paginated table. Each row opens the complaint.
- **Manage a complaint** (`/admin/complaints/:id`): full details plus a sticky
  panel to change status, assign a team, and add a remark to the activity log.
- **Issue map** (`/admin/map`): every located complaint plotted on Leaflet,
  pins colour-coded by severity, with popups that link to the complaint.

Backend additions for this part: `GET /api/admin/complaints/analytics` and
`GET /api/admin/complaints/map`.

New dependency: `recharts`. Run `npm install` again after pulling Part 6.

## That's the full build

All six parts are in. From here, natural next steps are: notifications,
real YOLOv8 in the AI service (see `ai-service/README.md`), and deployment
(Docker). Happy to help with any of these.
