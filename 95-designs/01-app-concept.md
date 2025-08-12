## Vibes Only Served – API Concept

A minimal Node.js REST API showcasing OpenAPI/Swagger with a classic "hello world" endpoint, plus operational endpoints and a clean local/Podman developer experience.

### Goals
- **Hello world**: `GET /api/v1/hello?name=World` → `{ "message": "Hello, World!" }`
- **Docs**: Interactive Swagger UI at `/docs`; OpenAPI JSON at `/openapi.json`.
- **Ops**: Liveness at `/healthz`, readiness at `/readyz`, version at `/version`.
- **DX**: Start locally with one command; build/run in Podman easily.

### Scope (v0)
- **Endpoints**
  - `GET /api/v1/hello?name=World` → 200 `{ "message": "Hello, <name>!" }`
  - `GET /healthz` → 200 `{ "status": "ok" }`
  - `GET /readyz` → 200 `{ "status": "ready" }`
  - `GET /version` → 200 `{ "version": "v0.1.0", "commit": "<sha|local>" }`
  - `GET /docs` → Swagger UI
  - `GET /openapi.json` → OpenAPI 3.0 document
- **Non-goals (v0)**: Auth, database, background jobs, multi-service orchestration.

### Tech choices
- **Runtime**: Node.js 22 LTS
- **Framework**: Fastify (lightweight, fast, first-class Swagger support)
- **OpenAPI/Swagger**: `@fastify/swagger` and `@fastify/swagger-ui` (code-first)
- **Validation**: Fastify JSON schemas for request/response
- **Config**: `PORT`; optional `APP_VERSION`, `GIT_COMMIT`
- **Logging**: Fastify logger (JSON to stdout)
- **Language**: JavaScript (CommonJS) for minimal friction

### API conventions
- **Versioning**: Prefix with `/api/v1`
- **Content type**: JSON only
- **Error format**: `{ "error": { "code": "BAD_REQUEST", "message": "..." } }`
- **CORS**: Off by default in v0 (enable later if needed)

### Project structure
- `src/server.js` — app bootstrap and plugin registration
- `src/plugins/swagger.js` — OpenAPI and Swagger UI configuration
- `src/routes/hello.js` — `GET /api/v1/hello`
- `src/routes/health.js` — `GET /healthz`, `GET /readyz`, `GET /version`
- `src/config/env.js` — environment variables and defaults
- `openapi.json` — optional export (primary spec generated from code)
- `package.json` — scripts (`dev`, `start`, `lint`, `test`)
- `Containerfile` — OCI image definition for Podman

### Local developer experience
- `npm run dev` — development with auto-reload (via `nodemon`)
- `npm start` — production mode
- Test locally:
  - `GET http://localhost:3000/docs`
  - `GET http://localhost:3000/api/v1/hello?name=World`

### Containerization
- I use Podman, not Docker.
- Build: `podman build -t vibes-api .`
- Run: `podman run --rm -p 3000:3000 --name vibes-api vibes-api`
- Image guidelines: small base, non-root user, optional healthcheck

### OpenAPI basics (generated)
- `info`: title "Vibes Only Served API", version from env
- `servers`: `[ { url: "http://localhost:3000" } ]`
- `paths`: hello, healthz, readyz, version

### Observability and ops
- Logs: JSON to stdout
- Health endpoints double as readiness/liveness probes
- Optional next: `/metrics` via Prometheus plugin

### Testing (optional for v0)
- Smoke tests with `supertest` + `vitest` or `jest` for hello and health endpoints

### Acceptance checklist
- App starts with `npm run dev` and `npm start`
- `/docs` renders Swagger UI
- `/openapi.json` returns valid OpenAPI 3.0
- Hello, health, readiness, version endpoints respond as specified
- Podman build and run commands work as documented

### Sources
- Swagger UI: [Installation and usage](https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/)
- OpenAPI 3.0: [Specification overview](https://swagger.io/docs/specification/v3_0/about/)
