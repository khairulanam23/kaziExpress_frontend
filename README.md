# Kazi Express Admin — Sales, Inventory & Operations Dashboard

The Next.js dashboard for the Kazi Express inventory system. It is the client half of a
two-part application: this repository renders the UI, and the Express + Prisma + PostgreSQL
API in `kaziExpress_backend` owns the data and every business rule.

All data is live. Screens read and write through the API — there is no mock or seeded data
in this repository.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4**
- **Radix UI primitives** hand-assembled into a shadcn/ui-style component library (`src/components/ui`)
- **TanStack Query** for all server state — fetching, caching and invalidation
- **Axios** for HTTP, with a shared client that handles auth headers and token refresh
- **Socket.IO** for live updates: the API announces model changes and the client invalidates the matching queries
- **Zustand** for the small amount of genuinely client-side state (auth session, sidebar UI)
- **React Hook Form + Zod** for form validation
- **Framer Motion** for micro-interactions and transitions
- **Recharts** for analytics charts
- **Sonner** for toast notifications
- **next-themes** for light/dark mode
- **Geist Sans / Geist Mono** (self-hosted via the `geist` npm package)

## Getting Started

The API must be running first — see the backend repository's readme.

```bash
npm install
npm run dev
```

Create `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_URL=http://localhost:5000
```

`NEXT_PUBLIC_API_BASE_URL` is the REST base; `NEXT_PUBLIC_API_URL` is the Socket.IO origin.
When only the first is set, the socket origin is derived from it.

Visit `http://localhost:3000`. You'll be redirected to `/login`.

**Demo credentials**
```
Email:    admin@example.com
Password: admin123
```
(A "Use demo credentials" button on the login form fills these in for you.)

## Folder Structure

```
src/
  app/                 # Next.js App Router routes
    login/ signup/ forgot-password/ reset-password/
    dashboard/         # Protected shell — one route per area (see Features)
  components/
    ui/                # Base primitives (button, card, dialog, table, select, sheet, ...)
    layout/            # Sidebar, topbar, auth shell, breadcrumb, guards
    shared/            # Reusable business components (StatCard, ChartCard, Pagination, states, ...)
  features/            # Feature-scoped UI, grouped by domain
                       # auth, dashboard, inventory, operations, employees, attendance,
                       # payroll, permissions, profile, refills, reports, sales, vendors,
                       # categories, notifications, search, settings
  services/            # One module per API area — the only place that talks to the backend
  hooks/queries/       # TanStack Query hooks wrapping those services
  hooks/               # Other reusable hooks (pagination, permissions, object URLs)
  store/               # Zustand stores (auth session, UI state)
  providers/           # Theme / React Query / Socket / Toaster composition
  lib/                 # API client, permission helpers, formatting, Zod schemas
  types/               # Shared TypeScript interfaces mirroring the API contracts
  constants/           # Nav config, icon map, permission keys
```

## Features

Each area below is a route under `/dashboard`, gated by the same permission the API enforces.
Frontend permission checks are a UX convenience — the backend remains authoritative.

- **Auth** — login, signup, forgot/reset password. Session persists via `zustand/persist`; the API client refreshes expired access tokens transparently.
- **Dashboard** — overview stat cards, revenue and production charts, low-stock watchlist.
- **Components / Products** — the two halves of the catalogue: raw materials and manufactured goods. Card grid and table views, search, category and low-stock filters, pagination, full CRUD, bill-of-materials editing, and image upload.
- **Batches / Stock Movements** — inventory batches with cost per unit, and the movement ledger behind every stock change.
- **Operations / Shopfloor** — production tasks: assignment, acceptance, production and damage reporting, refill requests, and the shopfloor board.
- **Finished Goods / Customers** — manufactured batches with their real cost, selling price and margin; recording a sale, store transfer or write-off against a customer.
- **Employees / Attendance / Payroll** — the workforce directory, attendance records and overtime decisions, and salary payments.
- **Permissions** — per-user permission grants over the backend's permission catalogue, with an audit trail.
- **Reports** — production, production cost, profit, waste, reorder, valuation, labour efficiency, vendor performance, inventory, attendance, payroll and stock movement, with PDF and CSV export.
- **Profile / Settings** — personal profile, legal documents, organisation profile and system configuration.

## Architecture Notes

- **`services/` is the only layer that talks to the API.** Components consume `hooks/queries/*`, which wrap those services in TanStack Query. Nothing else should call `apiClient` directly.
- **Live updates** are handled in `providers/socket-provider.tsx`. The API emits a model name on every write; `MODEL_QUERY_KEYS` maps it to the query keys to invalidate. A model missing from that map is a screen that silently shows stale data, so it is guarded by a backend test.
- **Decimal fields** arrive as strings from Prisma. `lib/decimal.ts` coerces the known decimal fields in the response interceptor so components can do arithmetic without per-call parsing.
- **Media URLs** may be a host-relative path or an absolute CDN URL. `lib/media.ts` resolves both, so no component needs to know where files are stored.

---

## Contributors

### Final Contributor

**Khairul Anam**
- GitHub: [github.com/khairulanam23](https://github.com/khairulanam23)
- Email: [mka.rifat.24@gmail.com](mailto:mka.rifat.24@gmail.com)

Responsible for the final round of work on this frontend — feature completion, integration with the backend API, fixes, and documentation.

### Special Thanks

Special thanks to [Ishrat](https://github.com/Ishrat2413) for the contributions and support that made this project possible.
