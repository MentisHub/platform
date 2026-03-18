# CLAUDE.md — platform/

Full documentation in docs/pt-br/srs-document.md (**read this for business logic implementations**)
Docker compose: docker/docker-compose.dev.yml

## Backend NestJS (apps/backend/)

- **DB models:** prisma/schema/**.prisma, use snake_case columns to camelCase in code
- **Auth:** `APP_GUARD` protects all routes globally. `@Public()` skips it, never add without explicit security review.
- **Service Domain:** never access Prisma models that belong to another domain directly
- **API:** URI versioning, default v1 for all routes implicitly. Swagger at `GET /docs`
- **Logs:** Use structured logging with context-rich fields: `logger.log({ action: 'node.activated', nodeId, federationId, orgId }, 'Node activated')`
  - **Layer principle:** Log at the outermost service layer for maximum context
  - **Boundaries:** HTTP requests/responses, gRPC calls, federated learning round transitions
  - **Levels:** `logger.debug` (verbose data), `logger.warn` (expected failures), `logger.error` + `err` field (exceptions)
  - **Avoid:** Logging inside loops, deep nested calls without business context

## Frontend Next.js (apps/frontend/)

- **Architecture:** Feature-driven structure (src/features/) with domain-specific components and logic
- **UI Components:** shadcn/ui design system in src/components/ui/ for consistent styling
- **Organization:** Create subfolders when domain has >3 related components
- **Hooks:** Separate hooks/ folder for custom hooks, features/*/hooks/ for domain-specific hooks when >2 hooks exist
- **Pages:** App Router pages compose feature components, never contain full UI implementations

## Constraints

- **Types:** always from packages/contracts/ using zod, never duplicate in app code
