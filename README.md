# Snip Backend

Tiny Bun backend for the Snip URL shortener.

## Run

- Install Bun 1.x
- Start server: `bun start`

## Environment

- `PORT` (default `3000`)
- `BASE_URL` (origin used for generated short links)
- `RAILWAY_PUBLIC_DOMAIN` (fallback origin as `https://<domain>`)
- `PUBLIC_DIR` (optional static directory, where `/` serves `index.html`)

## API

- `POST /api/links` with `{ "url": "https://..." }`
- `GET /api/links`
- `GET /:code`

Storage is in-memory and resets on restart.
