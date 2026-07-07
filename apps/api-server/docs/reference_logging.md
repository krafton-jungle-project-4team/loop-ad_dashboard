# API Server Logging Reference

## Scope

This document defines how to add logs across `apps/api-server`.

It assumes the reader already understands each feature's business flow. It only specifies logging
contracts, placement rules, context propagation, event naming, and review criteria.

## Runtime API

Use only the shared logger exported from `src/infra/logger`.

```ts
import { LogContextScope, log } from "../../infra/logger/index.js";
```

### `@LogContextScope()`

Use on public service methods that represent a use case boundary.

Responsibilities:

- Create a function-scoped async log context.
- Add `operation` automatically as `ClassName.methodName`.
- Keep context alive until the method resolves or rejects.
- On thrown sync/async errors, log `log.error("failed", { err, durationMs })` before rethrow.
- Release scoped context after the method completes.

It does not take arguments. Do not pass mapper functions to it.

```ts
@LogContextScope()
async dispatchPromotionRun(promotionRunId: string) {
  log.assignContext({ promotionRunId });
  log.info("started", { promotionRunId });
}
```

### `log.assignContext(fields)`

Use to add, update, or remove common fields for all later logs in the current async context.

```ts
log.assignContext({ projectId, campaignId, promotionId });
log.assignContext({ userId: null });
```

Rules:

- Call it at the top of public service methods for identifiers already available from arguments.
- Call it again after loading resources that reveal stable identifiers.
- Do not call it from private helpers unless the private helper is the first place a stable
  cross-cutting identifier becomes available and moving it to the public method would make the code
  less direct.
- Passing `null` or `undefined` removes the field from the current context.
- It does not emit a log line.

### `log.info|warn|error|debug(event, payload?)`

`event` is always the first argument.

```ts
log.info("started", { promotionRunId });
log.warn("promotion_run_not_found", { promotionRunId });
log.error("provider_send_failed", { err, input });
```

Rules:

- Use one line when the call is 100 characters or less.
- Pass objects directly. Do not pre-stringify payloads.
- Use `err` for errors so pino's error serializer is used.
- Do not add `message` when `event` already names the fact.
- Do not duplicate context fields in every payload when they are already in `assignContext`.
- Include payload fields only when they are specific to that event.

## Log Shape

Every emitted log line is JSON.

Common fields:

| Field         | Source            | Meaning                              |
| ------------- | ----------------- | ------------------------------------ |
| `timestamp`   | logger            | ISO timestamp                        |
| `level`       | logger            | `debug`, `info`, `warn`, `error`     |
| `service`     | logger base       | service id                           |
| `environment` | logger base       | app environment                      |
| `version`     | logger base       | package version if available         |
| `region`      | AWS runtime env   | `AWS_REGION` or `AWS_DEFAULT_REGION` |
| `runtime`     | AWS runtime env   | `AWS_EXECUTION_ENV` or `node`        |
| `operation`   | `LogContextScope` | `ClassName.methodName`               |
| `requestId`   | HTTP middleware   | request correlation id               |
| `event`       | log call          | stable event name                    |
| `err`         | log payload       | serialized error                     |

AWS Lambda runtime fields may appear when AWS provides them:

- `lambdaFunctionName`
- `lambdaFunctionVersion`
- `lambdaLogGroupName`
- `lambdaLogStreamName`

Do not add pino base fields that require users to manage new `.env` values. Base fields may use
runtime-provided environment variables only.

## Context Field Names

Use camelCase for log field names. Convert API snake_case names at the logging boundary.

Required common identifiers when available:

| Domain        | Fields                                                               |
| ------------- | -------------------------------------------------------------------- |
| HTTP          | `requestId`, `method`, `path`, `statusCode`, `durationMs`, `outcome` |
| Project       | `projectId`                                                          |
| Campaign      | `campaignId`                                                         |
| Promotion     | `promotionId`, `promotionRunId`                                      |
| Experiment    | `adExperimentId`, `segmentId`, `contentId`, `contentOptionId`        |
| User          | `userId`                                                             |
| Dispatch      | `channel`, `provider`, `dispatchJobId`, `redirectId`                 |
| Data Explorer | `queryId`, `objectId`, `conversationId`, `model`, `provider`         |
| External I/O  | `provider`, `endpoint`, `statusCode`, `durationMs`                   |

Avoid generic keys:

- Do not use `id` if a domain-specific id exists.
- Do not use `data`, `meta`, `payload` unless the value is intentionally a raw object snapshot.
- Do not use `message` for event names.

## Event Naming

Use lowercase snake_case.

Good:

```ts
log.info("dispatch_assignments_loaded", { storedAssignments, assignments });
log.warn("redirect_expired", { redirectId, link });
log.info("provider_selected", { channel, promotionRunId, provider });
```

Bad:

```ts
log.info("Dispatch assignments loaded");
log.info("requireDispatchAssignments");
log.info("Ad dispatch step entered", { step: "dispatchGroup" });
```

Rules:

- `started`, `completed`, and decorator-generated `failed` are reserved for public use case methods.
- Private/helper events must describe the fact, not the function name.
- Prefer `<resource>_<state>` or `<operation>_<result>`.
- Use past tense for facts that already happened: `loaded`, `created`, `prepared`, `sent`.
- Use `not_found`, `invalid`, `expired`, `conflict`, `mismatch`, `empty` for branch outcomes.
- Do not include class or function names in `event`; `operation` already covers that.

Recommended event suffixes:

| Suffix       | Use                                                   |
| ------------ | ----------------------------------------------------- |
| `_loaded`    | resource was read successfully                        |
| `_not_found` | resource lookup failed                                |
| `_prepared`  | input/request object was built                        |
| `_created`   | resource was inserted/created                         |
| `_updated`   | resource was changed                                  |
| `_validated` | validation passed                                     |
| `_invalid`   | validation failed                                     |
| `_mismatch`  | invariant mismatch                                    |
| `_conflict`  | conflicting state detected                            |
| `_empty`     | expected collection is empty                          |
| `_started`   | nested long-running step started                      |
| `_completed` | nested long-running step completed                    |
| `_skipped`   | work was intentionally skipped                        |
| `_failed`    | recoverable internal step failed and method continues |

## Log Levels

### `debug`

Use for details that are useful only during active debugging.

Examples:

- Candidate lists before scoring.
- SQL parameter snapshots when not already visible through service logs.
- Model prompt fragments in local-only debugging.

Do not use `debug` for events required to reconstruct production incidents.

### `info`

Use for normal state transitions and major branches.

Examples:

- Public method `started` and `completed`.
- Resource `loaded`.
- External request input `prepared`.
- Job/group/attempt success.
- Intentional `skipped`.

### `warn`

Use when the request can continue or fails with expected domain behavior, but the branch matters.

Examples:

- `not_found` before throwing a 404 domain error.
- `unsupported_*` before throwing a 409 domain error.
- Assignment conflict before throwing invariant error.
- Recoverable provider/recipient failure that is converted to a failed attempt.

### `error`

Use when the operation fails unexpectedly or the public use case rejects.

Rules:

- Do not add `try/catch` only to log failure in public methods.
- Let `LogContextScope` emit `failed`.
- Add local `error` logs only when catching and continuing, retrying, or converting an error where
  the automatic public failure log would not show the important branch.

## Placement Rules By Layer

### HTTP Middleware / Interceptors / Filters

Request middleware:

- Ensure `requestId`.
- Assign `requestId`, `method`, and `path`.
- Emit one completion log on response finish.

```ts
log.assignContext({ requestId, method, path });
log[level]("http_request_completed", { statusCode, outcome, durationMs });
```

Request context interceptor:

- Extract stable request-level identifiers from params, query, and body.
- Assign them to context.
- Do not emit normal logs.

Exception filter:

- Assign error metadata that later error handling can use.
- Do not duplicate `failed` logs emitted by `LogContextScope` unless the exception happens outside
  service scope.

### Controllers

Do not log every controller method by default.

Controller logs are allowed only when:

- The controller performs real branching that is not delegated to a service.
- The controller handles streaming, manual response writing, or non-standard HTTP behavior.
- The controller catches and converts external errors directly.

Most controller methods should rely on:

- HTTP completion log.
- Request context interceptor.
- Public service logs.

### Public Services

Every public use case method should use this shape:

```ts
@LogContextScope()
async runUseCase(primaryId: string) {
  const startedAt = Date.now();
  log.assignContext({ primaryId });
  log.info("started", { primaryId });

  const resource = await this.requireResource(primaryId);
  log.assignContext({ projectId: resource.projectId, campaignId: resource.campaignId });

  const result = await this.doWork(resource);

  log.info("completed", { result, durationMs: Date.now() - startedAt });
  return result;
}
```

Required logs:

- `started`
- `completed`
- automatic `failed` from `LogContextScope`
- expected domain failure branches before throwing
- major external I/O boundaries
- major loop/group/job boundaries

Do not add `try/catch` only to log `failed`.

### Private Helpers

Private helper logs should explain meaningful branches.

Log:

- Resource not found.
- Unsupported state.
- Input prepared for external I/O.
- State created/updated.
- Loop group started/completed when it helps trace multiple items.
- Recoverable failure that becomes a domain result.

Do not log:

- Function entry for every helper.
- Trivial branches where the next thrown error already carries all needed context.
- Context reassignment that can be done in the public method.

### Repositories

Default: do not log normal repository calls.

Repository logs are allowed when:

- The repository performs a multi-step write that cannot be understood from service logs.
- It handles a DB-specific branch, retry, or constraint conflict.
- It maps an external DB response into a non-obvious fallback-free error.

Do not log every SQL query result count unless the count is required to diagnose a use case.

### External Providers

Log at provider boundary.

Before call:

```ts
log.info("provider_request_prepared", { provider, input });
```

After success:

```ts
log.info("provider_request_completed", { provider, result, durationMs });
```

On recoverable failure:

```ts
log.warn("provider_request_failed", { provider, err, input, durationMs });
```

If the error escapes the public method, do not duplicate an extra `error` log. The decorator will
emit `failed`.

## Loop And Branch Coverage

Do not interpret "log every if/for" literally.

Required:

- Log loop boundaries when a loop processes meaningful groups or external calls.
- Log each iteration only when each item is an independently important unit, such as dispatch
  assignment attempts.
- Log branch outcomes that change behavior, skip work, throw domain errors, or affect persisted
  state.

Not required:

- Boolean formatting branches.
- Null coalescing branches.
- Pure mapping loops.
- Single-line guards where the thrown error and context are already enough.

## Payload Rules

Objects may be logged directly.

```ts
log.info("assignment_sent", { assignment, contact, targetUrl, sendResult, attempt });
```

Rules:

- Do not manually serialize with `JSON.stringify`.
- Do not flatten large domain objects unless flattening makes grep/search materially better.
- Keep trace identifiers in context, not repeated payload fields.
- Put full objects in payload when inspecting state matters more than compactness.
- Keep code shorter than log output. Long JSON log lines are acceptable.
- Do not log secrets: API keys, DB passwords, authorization headers, cookies, session tokens.
- Current test/demo dispatch logs do not mask email/phone. Revisit redaction before using the same
  policy for real user production data.

## Formatting Rules

Use one line if the log call is 100 characters or less.

```ts
log.info("recipient_resolved", { channel, assignment, recipient });
```

If it exceeds 100 characters, use standard Prettier multiline formatting.

```ts
log.assignContext({
  adExperimentId: assignment.adExperimentId,
  campaignId: assignment.campaignId,
  promotionId: assignment.promotionId
});
```

Do not introduce helper functions only to make logging shorter unless the helper removes real
duplication from non-logging code.

## Error Handling Rules

Do not do this:

```ts
@LogContextScope()
async run(id: string) {
  try {
    return await this.doWork(id);
  } catch (error) {
    log.error("failed", { err: error });
    throw error;
  }
}
```

The decorator already handles it.

Do this only when the method catches and continues:

```ts
try {
  const result = await this.provider.send(input);
  log.info("provider_send_completed", { result });
  return result;
} catch (error) {
  const attempt = toFailedAttempt(error);
  log.warn("assignment_failed", { assignment, attempt, err: error });
  return attempt;
}
```

## Performance Rules

The logger checks `pinoLogger.isLevelEnabled(level)` before calling pino.

Implications:

- Pino serialization is skipped when the level is disabled.
- Object literals passed to `log.debug(...)` are still created by JavaScript before the call.
- Do not build expensive debug payloads inline.

Bad:

```ts
log.debug("candidates_scored", { candidates: expensiveCandidateDump(candidates) });
```

Better:

```ts
if (shouldInspectCandidates) {
  log.debug("candidates_scored", { candidates: expensiveCandidateDump(candidates) });
}
```

Use this only for genuinely expensive payload construction. Do not add level guards around ordinary
object payloads.

## Adding Logs To A Feature

Checklist:

1. Identify public service use case methods.
2. Add `@LogContextScope()` to each public use case method.
3. At method start, assign known identifiers with `log.assignContext(...)`.
4. Emit `log.info("started", { primaryIdOrRequest })`.
5. After loading core resources, assign newly discovered identifiers.
6. Emit logs for expected domain failure branches before throwing.
7. Emit logs for external provider inputs and results.
8. Emit logs for persisted state changes.
9. Emit `log.info("completed", { responseOrResult, durationMs })`.
10. Remove helper logs that only say a function was entered.
11. Remove `try/catch` blocks that only log and rethrow.
12. Add or update tests for important events and scoped context cleanup.

## Review Checklist

Reject a logging change when:

- It uses `console.*` directly outside logger internals or tests.
- It logs plain text instead of structured JSON through `log`.
- It uses `message` as a duplicate event name.
- It puts function names in `event`.
- It adds `LogContextScope` arguments.
- It adds `try/catch` only for failed logging.
- It repeats context fields in every log payload.
- It logs secrets.
- It logs every helper entry without diagnostic value.
- It adds user-managed `.env` variables only for pino base fields.

Accept a logging change when:

- Public use cases have scoped context.
- The first log line has enough context to search the request/use case.
- Later logs automatically inherit context.
- Event names are stable and grep-friendly.
- Logs are short in code and detailed in payload.
- Failure logs happen before context is released.
- Tests cover scope cleanup or important branch events when behavior is non-trivial.

## Current Implementation Notes

Current logger implementation:

- File: `src/infra/logger/logger-context.ts`
- Library: `pino`
- Context: `AsyncLocalStorage`
- Public API: `log.assignContext`, `log.debug`, `log.info`, `log.warn`, `log.error`,
  `LogContextScope`
- Error key: `err`
- Log level env: `LOOPAD_LOG_LEVEL`
- Base runtime fields use only app config or runtime-provided env values.

Current HTTP context implementation:

- `request-logging.middleware.ts` assigns `requestId`, `method`, `path`.
- `request-context.interceptor.ts` assigns known IDs from request params/query/body.
- `api-exception.filter.ts` assigns exception metadata.

Current migrated areas:

- `features/ad-execution/service/promotion-dispatch.service.ts`
- `features/ad-execution/service/banner-resolve.service.ts`
- `features/ad-execution/service/redirect.service.ts`
- `features/ad-execution/adapters/dispatch-sender.ts`
- `features/ad-execution/controller/redirect.controller.ts`
- `features/dashboard/service/dashboard-query.service.ts`
- `features/dashboard/provider/dashboard-decision-client.ts`
- `features/dashboard/repository/dashboard-segment-query-repository.ts`
- `features/data-explorer/service/data-explorer.service.ts`
- `features/data-explorer/service/data-explorer-chatkit.service.ts`
- `features/data-explorer/provider/openai-query-planner.provider.ts`
- `features/data-explorer/controller/data-explorer.controller.ts`
