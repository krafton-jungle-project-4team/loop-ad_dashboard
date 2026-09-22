# PR 3B: 실제 Dashboard run consumer 검증

Decision의 `rcg-run-consumer.v1` 원본 HTTP status/body를 로컬 서버에서 replay하고, **실제 `DashboardDecisionClient` → hook과 공유하는 `promotionRunLaunchTarget` → 실제 `launchPromotionExperiment`**를 한 검사 안에서 실행한다. build/start/dispatch만 인자·순서·횟수를 기록하는 대역이다. fetch, client schema, 변환, launch를 복제하거나 대체하지 않는다.

## 고정 revision과 제출 범위

| 항목                        | 고정 값                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision producer           | [`4ee89c5c894098e87e71edd1c50d64c69b5664e2`](https://github.com/krafton-jungle-project-4team/loop-ad_decision/pull/402)                                                                                |
| producer source SHA-256     | `dd998267361ddd0a878586832e7e661a7f240fd2b9ccdce458410ac8a8466995`                                                                                                                                  |
| Dashboard prerequisite      | merged [fix PR #246](https://github.com/krafton-jungle-project-4team/loop-ad_dashboard/pull/246), head `b77b90165682e4dc9bb63bf93b04f19133e2965d`, merge `7d4a8a231e102eaaf6e6eae816902cbd45e1abcb` |
| PR base / head              | `main` / `feat/run-consumer-integration`                                                                                                                                                            |
| fixed Data Contract         | `0ec2cef0290f4659ad21ccc1dd2a20df2801ff50`                                                                                                                                                          |
| 독립 baseline expected hash | `0fb6c279a84c65e585cc17edaa0103288f952a7061cb5c4d4de0711814f6c2f9`                                                                                                                                  |

[pins.json](../../tools/run-consumer-gate/pins.json)이 실행 기준이다. runner는 시작과 종료 시 #246이 정확한 head와 merge commit으로 `main`에 MERGED됐는지 확인한다. pull request CI에서는 target이 `main`인지, base가 #246 merge commit을 포함하는지, 임시 merge checkout이 base와 PR head를 모두 포함하는지도 검사한다. CI의 실제 checkout SHA, PR head/base SHA, dirty 여부, Node/npm 버전, source 파일 hash는 `inputs.json`에 기록한다. PR head와 GitHub의 임시 merge checkout은 구분한다.

이 PR의 production 변경은 기존 hook 반환식을 순수 함수로 추출하고 호출하도록 연결한 두 파일뿐이다. 반환식의 AST가 고정 base의 원래 식과 같고, 실제 hook의 `createRun`이 그 함수를 호출하는지 테스트한다. 이 wiring 검사는 실제 HTTP consumer 검사를 보완하며 대체하지 않는다. ID 중복 거절은 base의 #246 변경이다.

## 기존 중단과 수정 후 결과

기존 worktree `loop-ad_dashboard-run-consumer`는 `wip/run-consumer-integration-stopped-20260919` 브랜치로 이름만 바꿔 보존했다. 그 안의 `PR3B-STOP.md`, JSON/JUnit, 원본/파생 body와 미커밋 변환 추출은 덮어쓰지 않았다. 재개 작업은 별도 `loop-ad_dashboard-run-consumer-resumed` worktree에서 진행했다.

| 증거                      | 기존 중단                                                          | b77b901 기반 재개                     |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| Dashboard 기준            | `df9daf13b57324d52a0eacb15b33c845a399c79f` + 추출                  | `b77b901` + 같은 추출 + consumer gate |
| 중복 ID 파생 body SHA-256 | `18a1d5a32de8d8e320f9ae17b59fbe17eeb12af8f67343a4a5897ee35ac6a34a` | **동일**                              |
| 거절                      | 없음                                                               | launch에서 명시적 중복 ID 오류        |
| build / start / dispatch  | 1 / 같은 ID로 2 / 0                                                | **0 / 0 / 0**                         |
| 판정                      | focused probe 6개 중 2 FAIL, STOP_REQUIRED                         | fixed/latest 각 RCC 34개 PASS         |

원래 실패 JSON hash는 `45541ded4f8cf977ba91716361245171f427e919180ae23021c79fa0d5e375d1`, JUnit hash는 `adc4a6ed829ce49bc1e1c2f3129ef46d748013f27befe1b371507775aa958d8e`다. 원본 producer가 중복 ID를 반환했다는 뜻이 아니다. 서로 다른 고객군의 두 번째 experiment ID 한 필드만 의도적으로 바꾼 RCC-04 파생 입력이다. 기대값을 완화하거나 해당 사례를 제거하지 않았다.

## Case와 판정

[cases.json](../../tools/run-consumer-gate/cases.json)에 논리 ID별 필수 실행 34개를 모두 열거한다.

| ID     | 실행 수 | 범위                                                                                                                                     |
| ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| RCC-01 | 2       | 원본 생성, next-loop preparation 전달을 명시적으로 파생한 요청; analysis/generation/segment/loop 전달                                    |
| RCC-02 | 7       | 순차 first/retry, 동시 commit A/B, rollback 후 성공, 두 overlap 승자; 각 원본 scope와 ID 보존                                            |
| RCC-03 | 1       | RCG-08 기존 baseline row 재사용; 고정 producer의 독립 `expected.json`과 비교                                                             |
| RCC-04 | 8       | malformed DTO, 다른/중복 scope, 실험 누락, 행 중복, **서로 다른 segment의 ID 중복**, 잘못된/중복 fallback; downstream 모두 0회           |
| RCC-05 | 3       | RCG-11/12의 실제 409 status/body; 실제 client 오류 status/code/detail, 변환·downstream 미호출                                            |
| RCC-06 | 13      | scheduled, start/dispatch/build 실패, email/SMS/onsite, already-running, fallback 필요/count/미사용/필요한 fallback 누락, 시작 불가 상태 |

RCC-06의 assignment·상태·채널 조합은 합성 시나리오로 표시한다. 실제 flow가 build 후 거절하도록 정의된 missing-required-fallback/unstartable/build-failure와 RCC-04의 **build 전** 계약 거절을 구분한다. scheduled는 build까지만, start 실패는 dispatch 없이, 이미 running인 email은 start 없이 dispatch로 이어지는 현재 동작을 그대로 검사한다.

성공 입력에는 client 결과와 공유 변환의 모든 필드, run/experiment ID, scope/status/fallback, 정확한 downstream 호출 순서와 반환값을 검증한다. 원본 12개 응답을 모두 소비한다. 응답을 채우거나 성공 모양으로 보정하지 않는다. 파생 입력은 별도 body 파일과 parent/replay hash·변경 필드를 남긴다.

고정 lane은 필수다. latest는 별도 `PASS` / `WARN_DRIFT` / `WARN_UNVERIFIED`로 표시하며 fixed 실패를 덮지 않는다. common 준비·무결성·cleanup 실패는 `INCOMPLETE`다. 필수 case 누락, 0개 수집, 중복, skip, JUnit 불일치, evidence 누락/손상, provenance 혼동 등을 23개 consumer control로 검사한다. producer의 21개/lane 및 54개 control과 consumer 수를 중복 합산하지 않는다.

서비스 계약 불일치, 실제 producer 500, 비결정적 timeout, 추가 production 동작 변경 필요가 발견되면 원인을 남기고 중단한다. 최신 lane이 경고만 남기더라도 이를 “전체 3B 검증 완료”로 주장하지 않는다.

## 실행과 artifact 검증

Node `25.2.1`, npm lock 기반 의존성, Python 3 표준 라이브러리, Git/gh, 로컬 Unix Docker가 필요하다. gh는 공개 #246 metadata의 읽기 검증에만 쓴다. runner는 `.env`를 읽지 않고 localhost와 합성 환경값으로 client를 생성한다. producer DB는 Decision Gate의 network-disabled 컨테이너와 합성 데이터만 사용한다.

```sh
npm ci --ignore-scripts --no-audit --no-fund
bash scripts/run-consumer-gate.sh /tmp/rcc-new-output
```

출력 디렉터리는 새 경로여야 한다. 명령은 정확한 Decision SHA를 임시 detached checkout하고 producer를 새로 실행한 뒤 bundle의 provenance·전체 파일 inventory/hash·JSON/JUnit을 고정 revision의 validator로 검증한다. 원본 source hash는 선언값뿐 아니라 pinned checkout의 실제 파일 hash와 대조한다. baseline expected도 별도의 고정 hash로 검증한다. 다운로드/producer 준비 후 실제 Node consumer는 loopback 서버를 이용하며 downstream 서비스 객체를 만들지 않는다.

이미 생성한 산출물을 재사용할 때는 checkout·output 및 선택한 두 manifest hash를 모두 지정한다. 아래 조합은 기존 중단과 재개를 같은 bundle로 비교한 실제 실행 값이다.

```sh
bash scripts/run-consumer-gate.sh /tmp/rcc-reuse-output \
  --producer-checkout /private/tmp/rcg-decision-producer-9ace3b6 \
  --producer-output /private/tmp/rcg-pr3b-producer-9ace3b6 \
  --fixed-manifest-sha256 179ada3261572a329bd7437a8e4751a7e8c279018934b10260274ac1d2297223 \
  --latest-manifest-sha256 f8a82b130996fae3e5cd827dda31244473c0399478c734eea9814482f486851a
```

새 producer 실행은 새 run ID와 manifest hash를 만든다. 기존 hash를 새 실행에 재사용하지 않는다. 해시는 byte/provenance 일치 검사이며 발행자 신원 서명이 아니다. 생성 command, pinned checkout, CI run을 함께 검토한다.

출력에는 전체 판정 `result.json`, 입력 `inputs.json`, producer 결과, 원본 `bundles/{fixed,latest}`, baseline expected/provenance, consumer `{fixed,latest}`의 case별 JSON·파생 body·JUnit, `controls`, 전체 artifact inventory/hash가 포함된다. 원시 서버 log·credentials·환경 전체는 CI artifact에 넣지 않는다. producer 전체 출력은 출력 경로 옆 `-producer`에 보존하며 업로드 대상에서 제외한다. Docker가 생성한 보존 산출물을 host-owned 임시 checkout/log 디렉터리의 자동 삭제 대상에 넣지 않는다. 임시 디렉터리 정리 후에 최종 판정을 쓰며 정리 실패는 JSON도 INCOMPLETE가 된다. 실행 실패 진단은 `-diagnostics`에 분리한다. 준비가 실패한 case나 JUnit을 만들어내지 않는다.

다운로드한 artifact는 아래처럼 **서비스 재실행 없이** 다시 검증한다. 원래 실행 머신의 절대 경로가 달라도 artifact 내부 상대 경로를 기준으로 검사한다.

```sh
python3 -B tools/run-consumer-gate/verify.py /tmp/downloaded-artifact \
  --producer-checkout /private/tmp/rcg-decision-producer-9ace3b6
```

[CI workflow](../../.github/workflows/run-consumer-gate.yml)는 `main` 대상 PR에 실행되며, 관련 40개 테스트·workspace/consumer typecheck 이후 같은 Gate command를 실행한다. artifact는 실패 시에도 생성된 구조화 근거를 14일 보관한다. 실제 CI head/checkout/run/artifact hash는 PR 본문과 Decision E-17 문서 PR에 기록한다.

## 검토 범위와 한계

1. **Verdict:** consumer 경계 검증을 제공한다. 실제 DB assignment/start/dispatch 및 browser/배포 경계는 `incomplete evidence`로 남는다.
2. **Affected Dashboard journey:** create/reuse run → shared transform → launch → build/start/dispatch 인자·미호출·순서. 실제 발송이나 DB lifecycle 완료를 주장하지 않는다.
3. **Contract impact:** #246 이후 추가 API/DTO/ID/status/table/event 동작 변경은 없다. PR diff의 production 변경은 기존 변환식 추출뿐이다.
4. **Existing-data compatibility:** Decision baseline writer의 고정 row를 후보 reader로 재사용한 RCG-08 원본을 독립 expected와 대조하고 실제 consumer에 전달한다.
5. **Required verification:** RCC fixed/latest 각 34, consumer controls 23, 관련 테스트 40, typecheck, CI artifact 재검증. source wiring만으로 integration을 대신하지 않는다.
6. **Merge order:** 먼저 merge된 #246의 정확한 head와 merge commit을 포함한 `main` 기준으로 이 PR을 검증한다. 3B/Decision 문서 PR은 자동 merge하지 않으며 base 변경 시 provenance 검사를 다시 통과해야 한다.
7. **Rollback boundary:** 이 PR revert는 테스트 도구와 동작 보존 추출만 되돌린다. #246의 중복 ID 거절과 producer/DB row는 변경하지 않는다.
8. **Excluded local context:** `AGENTS.md`, `agent/`, 기존 중단 worktree와 private local evidence. 기존 3B 및 Decision 중간 문서는 별도로 보존하고 완료된 조합은 별도 E-17 문서 PR에 추가한다.
