# CLAUDE.md — platform/

NestJS + Next.js monorepo. pnpm + Turbo. Node.js 25, pnpm 10.19.0.
Full documentation in `docs/pt-br/`.

## Commands
```bash
pnpm dev && pnpm test && pnpm lint
pnpm prisma:deploy   # migrations (production-safe)
pnpm prisma:generate # regenerate Prisma client after schema changes
pnpm db:seed
```

## Constraints

- **Types:** always from `@platform/contracts` using zod — never duplicate in app code
- **DB models:** `@@schema("platform")`, UUID PKs, snake_case columns → camelCase in code (non-default Prisma behavior)
- **Auth:** `APP_GUARD` protects all routes globally. `@Public()` skips it — never add without explicit security review. Node bootstrap (`POST /nodes/activate`) is `@Public()` by design; PSK is the auth mechanism
- **Events vs gRPC:** `EventEmitter2` for internal platform events only; `@grpc/grpc-js` exclusively for Flower SuperLink. Never use gRPC internally
- **Proto generation:** runs inside Docker (`Dockerfile.dev` installs `protoc` via apt). Don't run `pnpm flower:proto` on host unless `protoc` is installed locally
- **API:** URI versioning, default v1 — all routes implicitly `/v1/...`. Swagger at `GET /api/docs`
- **Logs:** never log auth tokens, passwords, or PSK fields. Use structured logging via PinoLogger:
  prefer `logger.log({ nodeId, federationId }, 'node activated')` over string interpolation —
  keeps fields queryable in Grafana/Loki. Log at boundaries (HTTP in/out, gRPC calls, FL round
  start/end), not inside loops. Use `logger.debug` for verbose data, `logger.warn` for expected
  failures (cert expired, PSK invalid), `logger.error` + `err` field for unexpected exceptions.
