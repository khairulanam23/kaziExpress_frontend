# Dabang Admin — Sales, Inventory & Operations Dashboard

A production-ready, **frontend-only** enterprise admin dashboard built with Next.js App Router. Inspired by the layout and information architecture of the [Dabang](https://themewagon.github.io/dabang) template, redesigned from scratch with a distinct visual identity, and extended with full mock CRUD flows.

There is **no backend** — every feature runs on realistic, seeded mock data held in Zustand stores, ready to be swapped for real API calls later.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4**
- **Radix UI primitives** hand-assembled into a shadcn/ui-style component library (`src/components/ui`)
- **Framer Motion** for micro-interactions and page/element transitions
- **React Hook Form + Zod** for all form validation
- **TanStack Query** (wired up and ready for real API integration)
- **Zustand** for global state (auth session, inventory CRUD, sidebar UI state)
- **Recharts** for all analytics (area, bar, line, pie, composed charts)
- **Sonner** for toast notifications
- **next-themes** for full light/dark mode support
- **Geist Sans / Geist Mono** (self-hosted via the `geist` npm package)

## Getting Started

```bash
npm install
npm run dev
```

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
    login/ forgot-password/ reset-password/
    dashboard/          # Protected shell: dashboard, inventory, operations, employees, settings, profile
  components/
    ui/                 # Base primitives (button, card, dialog, table, select, sheet, ...)
    layout/              # Sidebar, topbar, auth shell, breadcrumb, guards
    shared/              # Reusable business components (StatCard, ChartCard, StatusBadges, Pagination...)
  features/              # Feature-scoped UI, grouped by domain
    auth/ dashboard/ inventory/ operations/ employees/
  data/                  # Deterministic seeded mock data generators
  store/                 # Zustand stores (auth, inventory, ui)
  providers/             # Theme / React Query / Toaster composition
  hooks/                 # Reusable hooks (pagination, etc.)
  lib/                   # Utilities + Zod validation schemas
  types/                 # Shared TypeScript interfaces
  constants/             # Nav config, icon map, demo credentials
```

## Feature Overview

- **Auth flow**: Login, Forgot Password, Reset Password — all with animated transitions, show/hide password, password-strength meter, and toast-based feedback. Session persists via `zustand/persist`.
- **Dashboard**: 7 overview stat cards with sparklines and trend indicators, revenue/units area chart (daily/weekly/monthly tabs), category pie chart, target-vs-reality bar chart, best-selling products table with progress bars, and a low-inventory watchlist.
- **Inventory Management**: full CRUD (add/edit/delete) via modal forms and a confirmation dialog, a details drawer, search, category + stock-status filtering, multi-key sorting, pagination, and a toggleable grid/list view. Products under 5 units are automatically flagged as low stock.
- **Operation Status**: clickable status cards (pending/processing/assigned/delivered/cancelled) that filter a searchable, paginated operations table with priority tags and colored status badges.
- **Employee Information**: workforce KPIs, monthly delivery vs. target chart, top-performer leaderboard, and a full employee table with performance progress bars.
- **Shell**: collapsible desktop sidebar (icon-rail mode) with a mobile drawer, sticky glassmorphic topbar with search, notifications, theme toggle, breadcrumbs, and a profile menu.

## Notes for Backend Integration

- Replace the seed data in `src/data/*` and the Zustand actions in `src/store/inventory-store.ts` with TanStack Query hooks in a new `src/services/` layer — the UI already consumes typed data shapes from `src/types`, so screens shouldn't need structural changes.
- `useAuthStore` currently checks credentials client-side; swap `login()` for a real API call and keep the same return contract (`{ success, message }`) to avoid touching the form.
