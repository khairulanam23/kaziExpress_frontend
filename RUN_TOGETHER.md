# Running the connected Charger Labs system

Two zips, one system:
- `backend-charger-labs.zip` — Express + Prisma + PostgreSQL (Neon) API
- `dabang-dashboard.zip` — Next.js dashboard, wired to that API via TanStack Query

## 1. Backend setup

```bash
unzip backend-charger-labs.zip && cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```
Runs on `http://localhost:5000`, API base `http://localhost:5000/api/v1`.
Demo accounts seeded: `admin@example.com` / `admin123`, `employee@example.com` / `employee123`.

## 2. Frontend setup

```bash
unzip dabang-dashboard.zip && cd dabang-dashboard
npm install
cp .env.local.example .env.local   # already points to http://localhost:5000/api/v1
npm run dev
```
Runs on `http://localhost:3000`. Log in with the seeded admin/employee accounts above.

## 3. Verify the connection

- Login page → sign in → should redirect to `/dashboard` with real counts (not zeros/mock numbers)
- Inventory page → should list the 4 seeded products
- Operations page → should show the 1 seeded task
- Employees page → should show the 2 seeded employees
