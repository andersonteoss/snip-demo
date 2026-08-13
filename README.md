# Snip Superproject

Snip is a tiny URL shortener demo with one backend and two clients:

- Backend API (Bun)
- Web frontend (Angular)
- Terminal client (Node CLI)

This repository uses one branch per layer and mounts each layer into `main` as a submodule.

## Layout on main

- `backend/` -> tracks branch `backend`
- `frontend/` -> tracks branch `frontend`
- `cli/` -> tracks branch `cli`

## API contract

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/links` | `{ "url": "https://..." }` | `201 { code, url, shortUrl, hits, createdAt }`, `400 { error }` |
| GET | `/api/links` | - | `200` array of links |
| GET | `/:code` | - | `302` redirect to original URL, `404 { error }` when unknown |

## Clone

Clone with submodules, otherwise submodule folders are empty:

```bash
git clone --recurse-submodules https://github.com/andersonteoss/snip-demo.git
```

## Run all parts

Terminal 1:

```bash
cd backend
bun start
```

Terminal 2:

```bash
cd frontend
npm install
npx ng serve
```

Terminal 3:

```bash
cd cli
node cli.js ls
```

## Update workflow

When you change a layer:

1. Commit and push inside that layer folder (`backend/`, `frontend/`, or `cli/`).
2. In the superproject root, move the pointer and commit it:

```bash
git submodule update --remote <path>
git add <path>
git commit -m "Bump <path> submodule"
git push
```

`main` is the pinned snapshot of all layer commits.
