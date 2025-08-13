## Vibes Only Served – API

A minimal Node.js REST API showcasing OpenAPI/Swagger with a classic "hello world" endpoint, plus operational endpoints and a clean local/Podman developer experience.

The application source lives at `10-app/vibes-only-served`.

### Tech stack
- **Runtime**: Node.js 22 LTS
- **Framework**: Fastify 5
- **OpenAPI/Swagger**: `@fastify/swagger`, `@fastify/swagger-ui`
- **Language**: JavaScript (CommonJS)
- **Testing**: `tap`
- **Container**: `Containerfile` for Podman

### Endpoints (v0)
- `GET /api/v1/hello?name=World` → 200 `{ "message": "Hello, <name>!" }`
- `GET /healthz` → 200 `{ "status": "ok" }`
- `GET /readyz` → 200 `{ "status": "ready" }`
- `GET /version` → 200 `{ "version": "v0.1.0", "commit": "<sha|local>" }`
- `GET /docs` → Swagger UI
- `GET /openapi.json` → OpenAPI 3.0 document

### Project structure
- `10-app/vibes-only-served/src/server.js` — app bootstrap and plugin registration
- `10-app/vibes-only-served/src/plugins/swagger.js` — OpenAPI and Swagger UI configuration
- `10-app/vibes-only-served/src/routes/hello.js` — `GET /api/v1/hello`
- `10-app/vibes-only-served/src/routes/health.js` — `GET /healthz`, `GET /readyz`, `GET /version`
- `10-app/vibes-only-served/src/config/env.js` — environment variables and defaults
- `10-app/vibes-only-served/Containerfile` — OCI image definition for Podman

### Configuration
- **PORT**: server port (default `3000`)
- **APP_VERSION**: version string exposed by `/version` and OpenAPI (default `v0.1.0`)
- **GIT_COMMIT**: commit SHA exposed by `/version` (default `local`)

### Local development
From `10-app/vibes-only-served`:

```bash
npm install
npm run dev
```

Then test locally:
- `GET http://localhost:3000/docs`
- `GET http://localhost:3000/api/v1/hello?name=World`

Production mode:

```bash
npm start
```

### Testing
From `10-app/vibes-only-served`:

```bash
npm test
```

### Containerization (Podman)
From `10-app/vibes-only-served`:

```bash
podman build -t vibes-api -f Containerfile .
podman run --rm -p 3000:3000 --name vibes-api \
  -e APP_VERSION=v0.1.0 -e GIT_COMMIT=local \
  vibes-api
```

### Database seeding
From `10-app/vibes-only-served` you can seed the SQLite database from a directory of JSON files:

```bash
# Seed default DB (data/app.db) from a directory
npm run seed -- --dir ./seeds

# Specify a custom DB path
npm run seed -- --db ./data/app.db --dir ./seeds

# Dry-run (shows counts, no writes)
npm run seed -- --dir ./seeds --dry-run

# Clear table first, then seed
npm run seed -- --dir ./seeds --clear
```

JSON formats supported per file:

```json
["First idea", "Second idea"]
```

```json
[{ "content": "First idea" }, { "content": "Second", "createdAt": "2024-01-01T00:00:00Z" }]
```

```json
{ "ideas": ["One", { "content": "Two" }] }
```

- Files must have `.json` extension
- Duplicates (by exact `content`) are ignored during a single run and against existing DB rows
- `createdAt` is optional; if omitted the DB default will be used


