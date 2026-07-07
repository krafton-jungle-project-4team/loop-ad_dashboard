# 로깅 표준 레퍼런스

## 목적

이 문서는 프로젝트 전체에서 동일하게 적용할 로깅 표준을 정의한다.

언어와 프레임워크에 종속되지 않는다. NestJS, FastAPI, Spring, Express, 배치 워커, 서버리스
함수는 각 런타임에 맞는 구현체를 둘 수 있지만, 로그의 의미, 필드, 이벤트 이름, 컨텍스트
전파, 실패 처리 규칙은 이 문서를 따라야 한다.

이 문서는 기능 설명서가 아니다. 각 기능의 비즈니스 흐름은 이미 이해하고 있다고 가정하고,
어디에 어떤 로그를 남겨야 하는지만 정의한다.

## 기본 원칙

- 로그는 JSON 구조화 로그로 남긴다.
- 로그는 사람이 grep으로 따라갈 수 있어야 한다.
- `event`는 첫 번째 인자로 고정한다.
- 요청, 사용자, 프로젝트, 실행 ID 같은 추적용 값은 context로 유지한다.
- 각 로그 payload에는 해당 순간에만 필요한 정보를 넣는다.
- 객체는 가능하면 그대로 넘긴다. 수동 문자열 직렬화는 하지 않는다.
- 공통 context 값을 모든 로그 payload에 반복해서 넣지 않는다.
- 공용 진입점은 `started`, `completed`, `failed` 흐름을 가진다.
- 단순 함수 진입 로그는 남기지 않는다.
- 원인 분석에 필요한 분기, 외부 I/O, 상태 변경, 반복 처리 단위는 남긴다.

## 표준 API 모델

각 언어별 이름은 달라도 된다. 단, 구현체는 아래 개념을 제공해야 한다.

| 개념              | 의미                                                    |
| ----------------- | ------------------------------------------------------- |
| `assignContext`   | 현재 실행 흐름의 공통 로그 필드를 추가, 갱신, 제거한다. |
| `info/warn/error` | `event`와 선택 payload를 받아 JSON 로그를 남긴다.       |
| `debug`           | 동적으로 켜고 끌 수 있는 상세 진단 로그를 남긴다.       |
| `ContextScope`    | 공용 유스케이스 단위의 context 생명주기를 관리한다.     |

권장 호출 형태:

```ts
log.assignContext({ projectId, promotionId });
log.info("started", { request });
log.warn("promotion_not_found", { promotionId });
log.error("provider_request_failed", { err, request });
```

Python 구현이라면 이름은 PEP 8에 맞춰도 된다.

```py
log.assign_context({"projectId": project_id, "promotionId": promotion_id})
log.info("started", {"request": request})
log.warn("promotion_not_found", {"promotionId": promotion_id})
log.error("provider_request_failed", {"err": error, "request": request})
```

## Context Scope

`ContextScope`는 공용 유스케이스 경계를 감싼다.

필수 책임:

- 함수 또는 요청 처리 단위의 독립적인 로그 context를 만든다.
- `operation`을 자동으로 넣는다.
- 함수가 끝날 때 context를 자동 해제한다.
- 예외가 발생하면 context가 살아 있는 상태에서 `failed`를 남긴 뒤 예외를 다시 던진다.
- 동기/비동기 실행 흐름에서 context가 유지되어야 한다.

프레임워크별 구현 예:

| 환경           | 구현 방식 예시                                     |
| -------------- | -------------------------------------------------- |
| NestJS/Node.js | decorator + `AsyncLocalStorage`                    |
| FastAPI/Python | decorator/dependency + `contextvars.ContextVar`    |
| Spring/Java    | annotation/aspect + MDC                            |
| Go             | `context.Context`에 logger field 주입              |
| Serverless     | handler wrapper + 런타임 request id context 초기화 |
| Batch/Worker   | job runner wrapper + job id context 초기화         |

`ContextScope`는 인자를 받지 않는 것을 기본으로 한다. 함수 인자에서 context를 뽑는 복잡한
mapper를 decorator에 넣지 않는다. 함수 시작부에서 직접 `assignContext`를 호출하는 쪽이 더
명확하다.

```ts
@LogContextScope()
async startPromotionAnalysis(projectId: string, promotionId: string, request: Request) {
  log.assignContext({ projectId, promotionId });
  log.info("started", { request });
}
```

```py
@log_context_scope
async def start_promotion_analysis(project_id: str, promotion_id: str, request: Request):
    log.assign_context({"projectId": project_id, "promotionId": promotion_id})
    log.info("started", {"request": request})
```

## Context 규칙

`assignContext`는 현재 실행 흐름의 이후 로그에 자동으로 붙을 공통 필드를 관리한다.

사용해야 하는 위치:

- HTTP middleware 또는 interceptor에서 `requestId`, `method`, `path`를 등록한다.
- 인증/인가 계층에서 `userId`, `tenantId` 등 요청 주체 정보를 등록한다.
- 공용 서비스 함수 시작부에서 인자로 이미 받은 주요 ID를 등록한다.
- 리소스를 읽은 뒤 새로 알게 된 안정적인 ID를 등록한다.
- job, batch, provider, model, experiment처럼 trace 검색에 필요한 값을 등록한다.

사용하지 말아야 하는 위치:

- 단순 private helper 진입마다 context를 다시 넣지 않는다.
- 이미 상위 함수에서 넣은 값을 하위 함수마다 반복하지 않는다.
- 로그 한 줄에만 필요한 값은 context가 아니라 payload에 넣는다.

값 제거:

- `null` 또는 `undefined`에 해당하는 값은 context에서 제거한다.
- Python 구현은 `None`을 제거 의미로 맞춰도 된다.

## 로그 레코드 형식

모든 로그는 JSON 한 줄이어야 한다.

공통 필드:

| 필드          | 출처               | 의미                                 |
| ------------- | ------------------ | ------------------------------------ |
| `timestamp`   | logger             | ISO timestamp                        |
| `level`       | logger             | `debug`, `info`, `warn`, `error`     |
| `service`     | logger base        | 서비스 식별자                        |
| `environment` | logger base        | 실행 환경                            |
| `version`     | logger base        | 배포 버전                            |
| `region`      | runtime env        | 클라우드 runtime이 제공하는 region   |
| `runtime`     | runtime env        | 실행 runtime                         |
| `operation`   | context scope      | `Class.method`, `module.function` 등 |
| `requestId`   | request middleware | 요청 correlation id                  |
| `event`       | log call           | 안정적인 이벤트 이름                 |
| `err`         | log payload        | 직렬화된 error                       |
| `durationMs`  | log payload        | 처리 시간                            |

클라우드 런타임이 기본으로 제공하는 필드는 base에 넣을 수 있다. 사용자가 `.env`에 새로
관리해야 하는 pino base 전용 환경변수는 추가하지 않는다.

## Context 필드 이름

로그 필드는 camelCase를 사용한다. 외부 API가 snake_case여도 로깅 경계에서 camelCase로 바꾼다.

자주 쓰는 필드:

| 영역      | 필드                                                                 |
| --------- | -------------------------------------------------------------------- |
| HTTP      | `requestId`, `method`, `path`, `statusCode`, `durationMs`, `outcome` |
| 사용자    | `userId`, `tenantId`, `accountId`                                    |
| 프로젝트  | `projectId`                                                          |
| 캠페인    | `campaignId`                                                         |
| 프로모션  | `promotionId`, `promotionRunId`                                      |
| 실험      | `adExperimentId`, `segmentId`, `contentId`, `contentOptionId`        |
| 발송      | `channel`, `provider`, `dispatchJobId`, `redirectId`                 |
| AI/데이터 | `queryId`, `objectId`, `conversationId`, `model`, `provider`         |
| 외부 I/O  | `provider`, `endpoint`, `statusCode`, `durationMs`                   |

피해야 하는 필드:

- `id`: 도메인별 이름을 쓴다. 예: `promotionId`.
- `data`, `meta`, `payload`: 의도적으로 raw snapshot을 넣는 경우에만 쓴다.
- `message`: 이벤트 이름 대체용으로 쓰지 않는다.

## Event 이름 규칙

`event`는 lowercase snake_case를 사용한다.

좋은 예:

```ts
log.info("dispatch_assignments_loaded", { assignments });
log.warn("redirect_expired", { redirectId, link });
log.info("provider_request_completed", { provider, statusCode, durationMs });
```

나쁜 예:

```ts
log.info("Dispatch assignments loaded");
log.info("requireDispatchAssignments");
log.info("Ad dispatch step entered", { step: "dispatchGroup" });
```

규칙:

- `started`, `completed`, `failed`는 공용 유스케이스 경계에서 사용한다.
- helper 함수 이름을 event에 넣지 않는다.
- event는 코드 위치가 아니라 발생한 사실을 설명한다.
- 이미 일어난 일은 과거형을 사용한다.
- 도메인 분기는 명시적인 suffix를 사용한다.

권장 suffix:

| suffix       | 사용 상황                                   |
| ------------ | ------------------------------------------- |
| `_loaded`    | 리소스를 성공적으로 읽음                    |
| `_not_found` | 리소스를 찾지 못함                          |
| `_prepared`  | 요청, 입력, 명령 객체를 준비함              |
| `_created`   | 리소스를 생성함                             |
| `_updated`   | 리소스를 갱신함                             |
| `_validated` | 검증 통과                                   |
| `_invalid`   | 검증 실패                                   |
| `_mismatch`  | 불변식 또는 기대 상태 불일치                |
| `_conflict`  | 충돌 상태                                   |
| `_empty`     | 기대한 컬렉션이 비어 있음                   |
| `_started`   | 내부 장기 작업 시작                         |
| `_completed` | 내부 장기 작업 완료                         |
| `_skipped`   | 의도적으로 건너뜀                           |
| `_failed`    | 실패를 잡아서 계속 진행하거나 결과로 변환함 |

## Level 규칙

### `debug`

동적으로 켜서 보는 상세 진단 정보에 사용한다.

예:

- 후보군 scoring 상세.
- SQL parameter snapshot.
- local-only prompt fragment.

production incident 복원에 반드시 필요한 이벤트는 `debug`에만 두지 않는다.

### `info`

정상 상태 전이와 주요 분기에 사용한다.

예:

- 공용 유스케이스 `started`, `completed`.
- 리소스 `loaded`.
- 외부 요청 `prepared`, `completed`.
- job, group, attempt 성공.
- 의도된 `skipped`.

### `warn`

예상 가능한 도메인 실패 또는 계속 진행 가능한 문제에 사용한다.

예:

- 404를 던지기 전 `*_not_found`.
- 409를 던지기 전 `unsupported_*`, `*_conflict`.
- provider 실패를 failed attempt로 바꾸고 계속 진행하는 경우.
- retry 가능한 외부 I/O 실패.

### `error`

예상하지 못한 실패 또는 공용 유스케이스 실패에 사용한다.

규칙:

- 공용 함수에 실패 로그만 남기는 `try/catch`를 직접 추가하지 않는다.
- `ContextScope`가 `failed`를 남기게 한다.
- catch 후 계속 진행, retry, error 변환이 필요한 경우에만 local `error` 또는 `warn`을 남긴다.

## Layer별 배치 규칙

### HTTP Middleware / Interceptor / Filter

요청 시작:

- `requestId`를 보장한다.
- `requestId`, `method`, `path`를 context에 등록한다.

요청 종료:

- response finish 시점에 한 번만 `http_request_completed`를 남긴다.
- `statusCode`, `outcome`, `durationMs`를 payload에 넣는다.

요청 context 추출:

- params, query, body, auth principal에서 안정적인 ID를 추출해 context에 등록한다.
- 이 단계에서는 일반 로그를 남기지 않는다.

예외 필터:

- HTTP 응답 변환에 필요한 에러 metadata를 context에 넣을 수 있다.
- 서비스 scope에서 이미 남긴 `failed`를 중복으로 남기지 않는다.

### Controller / Router

기본적으로 모든 controller method에 로그를 넣지 않는다.

controller 로그가 필요한 경우:

- stream, SSE, 파일 다운로드, manual response write를 직접 처리한다.
- controller 안에서 실제 분기나 외부 I/O 변환을 수행한다.
- service로 위임되지 않는 예외 변환을 직접 수행한다.

대부분의 controller는 아래 로그에 의존한다.

- HTTP completion log.
- request context log.
- public service log.

### Public Service / Use Case

공용 유스케이스 함수는 이 구조를 따른다.

```ts
@LogContextScope()
async runUseCase(projectId: string, request: Request) {
  const startedAt = Date.now();
  log.assignContext({ projectId });
  log.info("started", { request });

  const resource = await this.reader.get(projectId);
  log.assignContext({ campaignId: resource.campaignId });
  log.info("resource_loaded", { resource });

  const response = await this.doWork(resource, request);
  log.info("completed", { response, durationMs: Date.now() - startedAt });
  return response;
}
```

필수 로그:

- `started`
- `completed`
- `ContextScope`가 남기는 `failed`
- throw 전 예상 가능한 도메인 실패 분기
- 외부 I/O 경계
- 상태 변경
- 의미 있는 loop, group, job, attempt 단위

### Private Helper

남긴다:

- 리소스 없음.
- 지원하지 않는 상태.
- 외부 I/O input 준비.
- 상태 생성/갱신.
- loop/group/job boundary.
- catch 후 계속 진행하는 recoverable failure.

남기지 않는다:

- helper 함수 진입.
- 순수 mapping.
- null coalescing 같은 표현식 분기.
- 상위 함수에서 이미 context로 추적되는 값의 반복 등록.

### Repository / DAO

기본값은 정상 repository 호출을 로깅하지 않는 것이다.

repository 로그가 허용되는 경우:

- 여러 단계의 write를 수행하고 service 로그만으로 진단이 어렵다.
- DB constraint, retry, lock, conflict 같은 DB 특화 분기를 처리한다.
- 외부 DB 응답을 도메인 오류로 변환하며 원본 상태가 필요하다.
- query plan, dynamic SQL처럼 원인 분석에 필요한 실행 정보를 만든다.

단순 SELECT, INSERT, UPDATE마다 로그를 남기지 않는다.

### External Provider / Client

외부 I/O 경계는 반드시 남긴다.

호출 전:

```ts
log.info("provider_request_prepared", { provider, endpoint, request });
```

성공:

```ts
log.info("provider_request_completed", { provider, endpoint, result, durationMs });
```

실패:

```ts
log.warn("provider_request_failed", { provider, endpoint, err, durationMs });
```

응답 schema가 깨진 경우:

```ts
log.warn("provider_response_invalid", { provider, endpoint, err, body });
```

API key, authorization header, cookie, session token은 절대 로그에 넣지 않는다.

## 반복문과 분기 커버리지

“모든 if/for에 로그”를 문자 그대로 적용하지 않는다.

남긴다:

- 행동이 바뀌는 분기.
- throw, retry, skip, fallback, conflict, invalid 상태.
- 저장 상태가 달라지는 분기.
- 외부 호출을 수행하는 loop.
- 각 항목이 독립적인 추적 단위인 loop. 예: 발송 attempt.

남기지 않는다:

- 단순 formatting 분기.
- 순수 mapping loop.
- 타입 좁히기만 하는 guard.
- 바로 다음 throw와 context만으로 충분히 설명되는 한 줄 guard.

## Payload 규칙

객체는 그대로 넘긴다.

```ts
log.info("assignment_sent", { assignment, contact, targetUrl, sendResult, attempt });
```

규칙:

- `JSON.stringify`를 직접 호출하지 않는다.
- logger의 serializer를 사용한다.
- error는 `err` 키로 넣는다.
- trace ID는 context에 넣고 payload마다 반복하지 않는다.
- payload에는 해당 event의 구체 정보만 넣는다.
- 로그 출력이 길어져도 코드가 단순한 쪽을 우선한다.
- 단, secret은 절대 넣지 않는다.

secret 예:

- API key.
- DB password.
- Authorization header.
- Cookie.
- Session token.
- refresh token.

현재 테스트/demo 데이터는 raw email/phone을 남길 수 있다. 실제 사용자 production 데이터는 별도
redaction 정책을 확정하기 전까지 같은 정책을 적용하지 않는다.

## 코드 포맷 규칙

로그 호출이 100자를 넘지 않으면 한 줄로 쓴다.

```ts
log.info("recipient_resolved", { channel, assignment, recipient });
```

100자를 넘으면 언어별 formatter 규칙을 따른다.

```ts
log.assignContext({
  adExperimentId: assignment.adExperimentId,
  campaignId: assignment.campaignId,
  promotionId: assignment.promotionId
});
```

로그 줄을 줄이기 위한 helper를 만들지 않는다. helper는 실제 중복을 제거하거나 의미를 명확히 할
때만 만든다.

## 성능 규칙

logger 구현은 level이 꺼져 있으면 직렬화를 수행하지 않아야 한다.

주의:

- level check 이전에도 함수 인자 객체 생성은 언어 런타임에서 이미 일어날 수 있다.
- 비싼 debug payload는 inline으로 만들지 않는다.

나쁜 예:

```ts
log.debug("candidates_scored", { candidates: expensiveCandidateDump(candidates) });
```

좋은 예:

```ts
if (shouldInspectCandidates) {
  log.debug("candidates_scored", { candidates: expensiveCandidateDump(candidates) });
}
```

일반 객체 payload에는 별도 level guard를 남발하지 않는다.

## 에러 처리 규칙

하지 않는다:

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

`ContextScope`가 처리해야 한다.

허용된다:

```ts
try {
  const result = await provider.send(input);
  log.info("provider_send_completed", { result });
  return result;
} catch (error) {
  const attempt = toFailedAttempt(error);
  log.warn("assignment_failed", { attempt, err: error });
  return attempt;
}
```

catch 후 계속 진행하거나 결과로 변환하는 경우에는 local 로그가 필요하다.

## FastAPI 적용 기준

FastAPI 구현은 아래 구조를 만족해야 한다.

- middleware에서 `requestId`, `method`, `path`를 contextvars에 등록한다.
- dependency 또는 middleware에서 auth/user/project ID를 등록한다.
- router 함수는 stream/manual response가 아니면 로그를 남기지 않는다.
- service 함수에 decorator를 붙여 `operation`, `started`, `completed`, `failed`를 관리한다.
- 외부 client wrapper에서 provider boundary 로그를 남긴다.

예시:

```py
@log_context_scope
async def create_promotion_run(project_id: str, promotion_id: str, request: dict):
    started_at = now_ms()
    log.assign_context({"projectId": project_id, "promotionId": promotion_id})
    log.info("started", {"request": request})

    response = await decision_client.create_promotion_run(promotion_id, request)
    log.assign_context({"promotionRunId": response["promotion_run_id"]})
    log.info("completed", {"response": response, "durationMs": now_ms() - started_at})
    return response
```

## NestJS 적용 기준

NestJS 구현은 아래 구조를 만족해야 한다.

- middleware에서 request id와 HTTP 기본 context를 등록한다.
- interceptor에서 params, query, body의 주요 ID를 context에 등록한다.
- `@LogContextScope()`는 공용 service method에 붙인다.
- controller는 manual response, stream, SSE가 아니면 로그를 남기지 않는다.
- provider/client에서 외부 I/O boundary를 남긴다.

예시:

```ts
@LogContextScope()
async createPromotionRun(projectId: string, promotionId: string, request: Request) {
  const startedAt = Date.now();
  log.assignContext({ projectId, promotionId });
  log.info("started", { request });

  const response = await this.decisionClient.createPromotionRun({ promotionId, request });
  log.assignContext({ promotionRunId: response.promotion_run_id });
  log.info("completed", { response, durationMs: Date.now() - startedAt });
  return response;
}
```

## 기능에 로그 추가 체크리스트

1. 공용 유스케이스 함수를 찾는다.
2. 각 공용 함수에 `ContextScope`를 적용한다.
3. 함수 시작부에서 이미 알고 있는 주요 ID를 `assignContext`로 등록한다.
4. `started`를 남긴다.
5. 핵심 리소스를 읽은 뒤 새로 알게 된 ID를 context에 등록한다.
6. 예상 가능한 도메인 실패 분기를 throw 전에 남긴다.
7. 외부 provider input/result/failure를 남긴다.
8. persisted state 변경을 남긴다.
9. 의미 있는 loop/group/job/attempt 경계를 남긴다.
10. `completed`를 response/result와 `durationMs`로 남긴다.
11. 함수 진입만 알리는 helper 로그를 제거한다.
12. 실패 로그만 위한 `try/catch`를 제거한다.
13. 중요한 branch event 또는 context scope cleanup은 테스트한다.

## 리뷰 체크리스트

거절한다:

- logger를 거치지 않는 직접 `console.*`, `print`, `System.out` 사용.
- JSON이 아닌 plain text 로그.
- `event` 대신 `message`를 쓰는 로그.
- 함수 이름을 event에 넣은 로그.
- context scope decorator에 복잡한 mapper를 넣은 구현.
- 실패 로그만 위한 `try/catch`.
- context 필드를 payload마다 반복하는 코드.
- secret을 남기는 로그.
- 모든 helper 진입 로그.
- pino base 또는 logger base만을 위해 사용자 관리 `.env`를 추가하는 변경.

승인한다:

- 공용 유스케이스가 scope context를 가진다.
- 첫 로그에서 trace 검색에 필요한 ID를 확인할 수 있다.
- 하위 로그가 context를 자동 상속한다.
- event 이름이 안정적이고 grep에 적합하다.
- 코드 호출부는 짧고 payload는 필요한 정보를 담는다.
- 실패 로그가 context 해제 전에 남는다.
- 외부 I/O와 domain branch가 원인 분석 가능한 수준으로 남는다.

## 현재 API 서버 구현 매핑

현재 `apps/api-server` 구현:

- logger 파일: `src/infra/logger/logger-context.ts`
- logger 라이브러리: `pino`
- context 구현: `AsyncLocalStorage`
- 공용 API: `log.assignContext`, `log.debug`, `log.info`, `log.warn`, `log.error`,
  `LogContextScope`
- error key: `err`
- log level env: `LOOPAD_LOG_LEVEL`
- base field: 앱 config 또는 runtime-provided env만 사용한다.

현재 HTTP context 구현:

- `request-logging.middleware.ts`: `requestId`, `method`, `path` 등록 및 completion log.
- `request-context.interceptor.ts`: params, query, body의 주요 ID 등록.
- `api-exception.filter.ts`: exception metadata 등록.

현재 마이그레이션된 영역:

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
