# Agent Rules for Snip

Keep this file in sync with .github/copilot-instructions.md.

## Repo shape
- This repo is a superproject on main with one branch per layer.
- Submodules on main pin exact SHAs for backend, frontend, cli, and bundle.

## Layout and stack

| Path | Source branch | Purpose | Tech |
|---|---|---|---|
| backend/ | backend | URL shortener API + redirects | Bun, single-file server |
| frontend/ | frontend | Web client | Angular 19 |
| cli/ | cli | Terminal client | Node CommonJS, global fetch |
| bundle/ | bundle | Generated release output | Bun runtime + built UI + CLI |
| scripts/build-bundle.mjs | main | Assembles/pushes bundle + pointer bumps | Node (zero deps) |

## API contract (load-bearing)
- POST /api/links with { url } -> 201 { code, url, shortUrl, hits, createdAt }, 400 on invalid input.
- GET /api/links -> array of link objects.
- GET /:code -> 302 redirect and hit increment, 404 if unknown.
- Rule: change this contract everywhere or nowhere (backend, frontend, CLI, docs).

## Key commands
- Clone with submodules: git clone --recurse-submodules <repo>
- Run backend: cd backend ; bun start
- Run frontend: cd frontend ; npm install ; npx ng serve
- Run CLI: cd cli ; node cli.js ls
- Build release bundle: node scripts/build-bundle.mjs
- Build + push bundle/main: node scripts/build-bundle.mjs --push

## Edit and release workflow
1. Edit inside a layer submodule (backend/frontend/cli).
2. Commit and push in that submodule.
3. In superproject root: git submodule update --remote <path>
4. Commit pointer bump on main and push.
5. For releases, run build-bundle script and commit/push pointer bumps.

## Do and do not
- Do treat bundle/ as generated output only.
- Do keep CLI as CommonJS (no type: module near cli.js).
- Do preserve Angular output path frontend/dist/snip-frontend/browser.
- Do remember storage is in-memory by design (restart clears links).
- Do keep idempotent behavior in scripts/workflows.

- Do not hand-edit files in bundle/.
- Do not change API shape in only one client.
- Do not switch CLI module system.
- Do not remove bundle workflow schedule-only design.
- Do not misread docker workflow path filter: path bundle means the submodule gitlink change on main, not files inside bundle/.
