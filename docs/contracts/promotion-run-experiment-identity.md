# Promotion run의 experiment identity 불변식

## 불변식과 거절 시점

`launchPromotionExperiment`에 전달되는 한 run 응답의 모든 `adExperimentId`는 유일해야 한다. 선택 고객군과 fallback을 포함하며 서로 다른 `segmentId`를 가졌다고 같은 experiment ID를 사용할 수는 없다. 비교는 원래 ID 문자열 그대로 수행한다. ID를 재생성하거나 중복 항목을 조용히 제거하지 않는다.

검증 위치는 `promotionExperimentFlow.ts`의 `validateRunContract`다. `createRun`이 끝난 직후, 기존 scope 검사 다음에 ID 유일성을 검사한다. 실패하면 `광고 실험 ID가 중복되어 있어요. 다시 시도해 주세요.` 오류로 launch promise를 reject한다. **build/start/dispatch는 모두 0회**여야 한다. activation 결과, 실험 status, fallback 배정 필요 여부를 판단하기 전에 적용한다.

이는 이미 완료된 `createRun` 요청이나 producer의 DB transaction을 되돌리는 기능이 아니다. API client의 DTO parser와 직접 호출되는 다른 API에는 새 검증을 추가하지 않는다. 이 변경이 보호하는 경계는 Dashboard의 launch orchestration이다.

## 재현 원인

수정 전 client는 `ad_experiment_id`의 문자열 타입만 검사했다. launch는 요청한 segment scope, 고객군당 실험 수, fallback 표식을 검사했지만 experiment ID 유일성을 검사하지 않았다. 다음 입력은 기존 고객군 검사들을 모두 통과했다.

```text
segmentIds: [segment-a, segment-b]
experiments:
  - { segmentId: segment-a, adExperimentId: experiment-shared, status: planned }
  - { segmentId: segment-b, adExperimentId: experiment-shared, status: planned }
```

그 결과 build 다음 동일 ID로 start가 두 번 호출됐다. 이 현상은 PR 3B의 RCC-04 probe에서 Decision producer `9ace3b6ef5d1aaa7851d7ffbb180f1802f5c7008`의 RCG-01 body를 파생해 fixed/latest 모두 재현했다. 두 번째 실험 ID만 첫 번째 ID로 바꾸고 segment IDs는 유지했다. 원본 producer가 중복 ID를 실제 반환한 사례나 운영 장애로 해석하면 안 된다.

실험 행 전체 중복은 기존 고객군 개수 검사로 거절되므로 identity 중복과 별도로 검증해야 한다. RCC-04의 기대값은 변경하지 않는다. 이 문서와 수정 PR은 3B 변환 추출, bundle runner, CI artifact 구현을 포함하지 않는다.

## 회귀 검증

기준 Dashboard main은 `df9daf13b57324d52a0eacb15b33c845a399c79f`다. 같은 새 테스트를 production 수정 전에 실행했을 때 19개 중 6개 실패, 13개 통과했다. planned/running/scheduled와 불필요한 fallback 중복은 거절되지 않았고, goal_met/insufficient_data는 build 이후 상태 오류로 거절됐다. 수정 후에는 여섯 경우 모두 명시적인 중복 ID 오류로 build/start/dispatch 이전에 거절된다.

| 시나리오                        | 검증 내용                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 서로 다른 선택 고객군의 동일 ID | planned, running, goal_met, insufficient_data에서 중복 오류 및 downstream 0회                                       |
| 예약 실행 예정 응답             | assignment 대역이 scheduled를 반환할 예정이어도 build 자체가 0회                                                    |
| 선택 실험과 fallback의 동일 ID  | fallback 배정이 필요 없더라도 downstream 0회                                                                        |
| 기존 응답 fixture               | 수정 전부터 존재한 `decision-promotion-run-response.v1.json`의 ID·scope를 유지하며 build/start/dispatch 인자를 확인 |
| 같은 정상 run 재사용            | 같은 fixture로 두 번 호출해 모두 통과; 응답 내부 유일성만 검사하고 요청 사이의 ID 재사용은 허용                     |

정상 재사용 테스트는 호출 인자와 순서의 보존을 검증하며 실제 assignment/start/발송의 멱등성을 입증하지 않는다. 기존 running, fallback, start 실패, dispatch 실패, 다음 루프 복수 고객군 테스트도 함께 통과했다.

2026-09-19 로컬 실행 결과:

```sh
npm run build -w @loopad/shared
node --import tsx --test apps/web-client/tests/promotion-experiment-flow.test.ts apps/api-server/tests/dashboard-decision-client-contract.test.ts
npm run typecheck
```

- 관련 테스트 38개 PASS: launch 19개 + 실제 client contract 테스트 19개. skip/cancel/failure 0개.
- 전체 workspace typecheck PASS: shared, api-server, web-client.
- 변경 TypeScript 파일 eslint 및 Prettier 검사 PASS; `git diff --check` PASS.
- 기존 contract test의 HTTP fetch 대역과 launch operation 대역을 사용했다. 이 수정 PR에서 3B의 실제 HTTP replay나 RCC-01~06 전체 검증을 다시 수행하지 않았다.

## 변경 파일과 자체 검토

production 변경은 `apps/web-client/src/features/dashboard/ui/pages/campaign/promotion/promotionExperimentFlow.ts`의 응답별 ID 유일성 검사 5줄이다. 회귀 검증은 `apps/web-client/tests/promotion-experiment-flow.test.ts`, 계약 및 검증 기록은 이 문서에 있다.

1. **Verdict — incomplete evidence (배포 및 전체 3B 경계).** 수정 범위의 코드 검토·회귀 테스트·typecheck에서 미해결 문제를 발견하지 않았다. 전체 3B 및 배포 검증의 완료 판정은 후속 단계로 남긴다.
2. **Affected Dashboard journey.** run 생성/재사용 → launch 계약 검사 → assignment build → experiment start → 해당 채널 dispatch. 이 PR의 마지막 검증 범위는 operation 대역 호출 및 반환값이다.
3. **Contract impact.** 한 응답 내부의 중복 experiment ID만 새로 거절한다. Decision producer, API path/DTO 필드, ID 생성·의미, 상태 값, PostgreSQL/ClickHouse schema와 event는 변경하지 않는다. Data Contract `0ec2cef0290f4659ad21ccc1dd2a20df2801ff50`의 `ad_experiments.ad_experiment_id`는 이미 primary key다. Data Contract/Decision의 선행 수정이 필요하지 않다.
4. **Existing-data compatibility.** 기존 fixture의 고유 ID, fallback, 복수 고객군, 정상 run 재사용이 유지된다. 과거 데이터라도 중복 ID를 담은 잘못된 launch 응답은 더 이상 진행되지 않는 의도적인 호환성 제한이다. 기존 row를 수정·삭제하지 않으며 데이터 backfill은 없다.
5. **Required verification.** 위 unit/contract/typecheck는 완료했다. DB integration, 실제 발송, browser E2E, deployed smoke는 수행하지 않았다. 후속 3B에서는 merge된 수정 revision을 기준으로 보존한 malformed body가 실제 client → 공유 변환 → launch에서 거절되고 downstream이 0회인지 검증해야 한다. 배포 smoke가 필요하면 지정된 합성 데이터에서 정상 launch와 조작된 중복 응답 거절을 확인해야 한다.
6. **Merge order.** 이 별도 수정 PR 검토·merge → 명시적 후속 3B 재개 → RCC 전체 검증 → 최종 revision 조합 기록. 이 작업은 수정 PR 생성 후 멈춘다. feature flag나 동시 producer 배포가 필요하지 않다.
7. **Rollback boundary.** 이 PR revert는 consumer 검증만 되돌린다. DB row/ID 해석이나 다른 팀 변경을 되돌리지 않는다. revert하면 중복 ID 허용 결함이 다시 열리므로 RCC-04를 충족한다고 표시할 수 없다.
8. **Excluded local context.** `AGENTS.md`, `agent/`, 기존 3B worktree·변환 추출·재현 evidence 및 Decision E-17 로컬 문서는 이 PR에서 제외한다. Decision E-17은 `3B stopped / fix pending`으로 유지한다. 수정 merge와 3B 전체 검증 후에만 최종 조합으로 갱신한다.
