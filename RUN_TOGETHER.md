# Running the two halves together

The system is two repositories:

- `kaziExpress_backend` — Express + Prisma + PostgreSQL (Neon) API
- `kaziExpress_frontend` — this Next.js dashboard, which consumes that API

The API must be running before the dashboard is useful; the dashboard holds no data of its own.

## 1. Backend

```bash
cd kaziExpress_backend
npm install
npx prisma generate
npx prisma migrate deploy     # or `migrate dev` on a fresh local database
npm run seed                  # optional demo data
npm run dev
```

Runs on `http://localhost:5000`, API base `http://localhost:5000/api/v1`.

Copy `.env.example` to `.env` first — the server validates its configuration at boot and
refuses to start if anything required is missing.

## 2. Frontend

```bash
cd kaziExpress_frontend
npm install
npm run dev
```

Create `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Runs on `http://localhost:3000`. Sign in with a seeded account.

## 3. Verify the connection

- **Login** → signing in should redirect to `/dashboard` with figures drawn from the database.
- **Components / Products** → both catalogue pages should list the seeded items.
- **Operations** → seeded production tasks should appear.
- **Employees** → the seeded workforce should appear.
- **Live updates** → edit a product in one browser tab; a second tab on a screen showing that
  product should update without a reload. If it does not, the Socket.IO connection is not
  established — check `NEXT_PUBLIC_API_URL`.

## Common problems

| Symptom | Cause |
| --- | --- |
| Every request fails with a network error | The API is not running, or `NEXT_PUBLIC_API_BASE_URL` points elsewhere |
| Login succeeds but every other call returns 401 | Backend `JWT_SECRET` changed since the session was issued — sign out and back in |
| Data changes only appear after a reload | Socket.IO is not connected; check `NEXT_PUBLIC_API_URL` and the browser console |
| Uploaded images do not appear | `STORAGE_PROVIDER` is `local` on a host with an ephemeral filesystem — use `cloudinary` |
