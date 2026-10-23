> 후속 변경: **이 말 누가 했게?**는 [핵심 발언 선별 v4](CHAT-SPEAKER.md)로 전환했습니다. 이 게임만 품질 통과 후보를 자동 승인합니다. 아래 v3 발언자 후보 수·선정 기준은 변경 전 기록이며, 나머지 게임의 수동 승인 정책은 유지합니다.

# 카톡 게임별 배정·승인 v3 (2026-10-22)

이 문서가 이전 자동 출제(v2) 문서보다 우선한다. **후보 생성은 자동, 출제는 관리자 승인 후**다. 게임 규칙·점수·TXT 가져오기는 유지했다. 예시로 언급된 명언/상황 게임을 새로 추가하지 않았다.

## 실제 7개 게임과 선정 기준

| 게임 / 내부 키 | 문제 유형 / 정답 | 선정 기준 | 실제 새 후보 |
| --- | --- | --- | ---: |
| 이 말 누가 했게? / guess-speaker | speaker·sequence / 발언자 | 고유 어휘·개성, 후속 대화, 같은 사람의 연속 발언 | 28 |
| 말버릇 맞히기 / chat-habit | habit / 발언자 | 실제 통계의 메시지 1,000개당 표현 포함 메시지 비율이 단독 1위 | 18 |
| 카톡 통계 배틀 / chat-battle | battle / 두 사람 중 발언자 | 실제 사용률이 다른 두 사람 비교, 동률 제외 | 70 |
| 연도 맞히기 / chat-year | year / 연도 | 학교·군대·사회 사건 등의 시기 단서, 정답 연도가 대화에 직접 나오면 제외 | 9 |
| 빈칸 채우기 / chat-blank | blank / 원문의 단어 | 연결된 대화로 추론할 핵심 어휘, 원문·오타 보존 | 2 |
| 흑역사 퀴즈 / chat-cringe | cringe / 발언자 | 허세·민망한 실수·발언 반전과 친구의 후속 반응 | 3 |
| 과거의 나를 변호하라 / chat-defend | defend / 본인 해명 후 1~5점 평가 | 약속·입장·단언을 해명할 수 있고 후속 대화가 연결됨 | 5 |

최소 맥락 점수와 주제 연결/복수 반응/회상/반전이 없는 후보는 만들지 않는다. 게임별 적합성 점수·정적 선정 사유를 별도로 저장하고 가장 적합한 게임 하나만 고른다. 통계 문제는 동일 표현/비교 조합을 반복 생성하지 않는다. 수량 할당이나 부족분 강제 채우기는 하지 않는다. 점수는 규칙 기반 휴리스틱이며 실제 재미와 의미적 이해를 보장하지 않는다.

## 원인과 실행 경로

기존 3000번 서버는 빈 `.chat-data/chat.sqlite`를 읽고 있었다. 191,047개 실제 메시지와 기존 맥락 문제는 검증 폴더 DB에 따로 있었다. 원본 DB와 빈 기본 DB를 보존하고 검수 이력이 있는 DB를 `data/live-chat/chat.sqlite`로 SQLite backup API를 이용해 복제했다. Git에서 제외되는 로컬 `.env`의 `CHAT_DATA_DIR=data/live-chat`로 실제 경로를 명시했다. 명시적인 프로세스 환경변수가 있으면 `.env`보다 우선한다.

이전 생성기는 같은 target에 speaker/cringe/defend/year/blank 등을 연달아 생성했다. 관리자 카드에서는 단일 target 원문이 먼저 보이고 맥락 미리보기가 접혀 있었으며, 생성 완료 후 summary만 갱신되고 문제 목록은 갱신되지 않았다.

현재: Worker → `analysis.generateQuestions` → `context.generateContextQuestions` → `game-policy.gameSpecs` → 단일 게임 배정/중복 검사 → SQLite → 인증된 `/api/chat/questions` → 게임별 React 목록 → 관리자 승인 → `repository.playableQuestions`/`pickFromBank` → 기존 게임 엔진.

## 중복과 승인

- 같은 메시지 ID와 대화에 포함된 주변 메시지 ID도 예약한다. 단순히 target만 검사하지 않는다.
- 의미 있는 메시지의 정규화 텍스트 SHA-256으로 다른 위치의 같은 문장도 검사한다. 짧은 웃음/맞장구 문자열 자체를 전역 예약하지 않는다.
- 문자 3-gram Jaccard 0.88 초과를 유사 내용으로 본다. 의역까지 이해하는 외부 AI 의미 판별은 아니다.
- v3 승인 대기 문제도 기존 게임 배정을 유지한다. 재생성으로 다른 게임에 자동 배정하지 않는다. 이미 승인되거나 반려된 원본을 다른 게임에 신규 배정하지 않는다.
- `ChatSourceAllocation.sourceKey` 기본키로 승인을 직렬화한다. 승인 상태·검수 이력·예약 기록은 하나의 SQLite 트랜잭션으로 저장한다. 중복 승인 실패 시 승인 상태만 남지 않는다.
- 기존 중복은 `duplicateGroup`으로 연결하고 검수 대상으로 남긴다. 충돌하는 기존 복수 승인은 재검수로 전환하고 이력을 기록한다. 유일한 기존 승인은 유지한다.
- 출제는 `reviewStatus='approved'`이며 제외되지 않은 문제만 가능하다. `AUTO_READY`는 적합 후보/승인 문제에서 쓰는 호환 상태이며 **그 값만으로 출제할 수 없다**.
- 같은 방의 출제 이력과 원본 키를 함께 검사해 다른 게임으로 전환해도 동일 대사·대화·유사 내용이 다시 나오지 않도록 한다. 다른 방은 별도 세션이다.

## DB 변경·안전성

`ChatQuestion` 추가: `gameMode`, `suitabilityScore`, `selectionReason`, `duplicateGroup`, `generationBatchId`. 기존 `engineVersion`, target/conversation/source 연결은 유지한다. 새 생성 버전은 3이다. 게임명은 기존 questionType에서 마이그레이션한다.

추가 테이블: `ChatSourceAllocation(sourceKey PRIMARY KEY, questionId)` 및 `ChatGenerationBatch(id,status,engineVersion,startedAt,completedAt,backupPath,questionCount,error)`.

실제 DB 스키마 변경 전 백업했고, Worker 생성 전에도 WAL 포함 일관된 전체 백업을 만든다. 후보 변경·무결성 검증·배치 완료 기록은 동일 트랜잭션에서 확정한다. 오류/중단 시 이전 은행으로 롤백하며 실패 배치를 기록한다. 원문·발언자 매핑·검수/출제 이력·점수를 삭제하지 않는다. 수동 반려는 재생성으로 되살리지 않는다.

수동 복구가 필요하면 서버를 멈추고 `data/live-chat/backups/`의 해당 백업을 **새 폴더**의 `chat.sqlite`로 복제한 후 로컬 `.env`의 경로를 새 폴더로 바꿔 재시작한다. 현재 DB·원본·WAL 파일을 임의로 삭제하거나 실행 중인 DB에 덮어쓰지 않는다.

## 관리자 사용

방 만들기 → 카카오톡 분석·문제은행 → 게임별 탭 → 기본 `게임별 생성 v3` / `승인 대기` 목록에서 대화·정답·선정 사유·점수·중복 그룹 확인 → 개별 승인/반려/수정. 실제 참가자가 입장한 방에서 발언자 매핑을 완료한 뒤 게임을 시작한다. 이전 문제는 생성 버전을 `기존 문제 포함`으로 바꾸면 볼 수 있다. 탭별 전체/대기/승인/반려 수는 기존 문제를 포함하며, 현재 필터 수는 별도 표시한다.

재분류는 선택한 게임의 적합성을 다시 평가하고 질문/선택지/정답을 해당 게임 형식으로 재구성한다. 부적합하면 거절하며, 성공해도 승인 대기로 돌아간다. 이미 출제된 문제는 이력 보존을 위해 재분류를 거절한다. 일괄 승인 기능은 추가하지 않았다.

목록은 생성 완료·인증 변경·필터 변경 시 다시 조회하고 오래된 응답은 버린다. 페이지 범위를 벗어나면 처음으로 돌아간다. 연결 DB·최근 생성 시각/버전/배치·필터 수·현재 방 출제 가능 수를 표시하며 데이터 없음/미생성/조건 미충족/필터 없음/API 오류를 구분한다. 현재 DB의 승인 0개는 최신 요청에 따른 정상 상태다.

## 실제 데이터 결과

- 실제 서비스 DB: `D:\workspace\gapyeong-arcade\data\live-chat\chat.sqlite`
- 정상 메시지 191,047개 / 발언자 5명 / 기존 매핑 20건 보존.
- 문제 총 2,503개: v1 1,040개, v2 1,328개, v3 135개. v3 게임별 수량은 위 표와 같다.
- 기존 반려 17개 유지. 원본 메시지 ID·발언자·시각·본문의 마이그레이션 전후 해시 일치.
- 기존 은행 포함 중복 검수 2,435개 / 281그룹. 기존 v1/v2의 같은 대화를 여러 게임으로 만들었던 흔적을 삭제하지 않았다.
- 새 v3 135개는 모두 승인 대기. 122개는 이전 은행과의 중복 검수가 필요하고 13개는 해당 충돌이 없는 적합 후보다. 실제 서비스에서는 사용자 대신 임의 승인하지 않았다.
- 별도 실제 DB 복사본에서 게임별 1문제씩 테스트 승인 후 1명+Bot6으로 7종 모두 종료·최종 랭킹·점수 합계·비밀 필드 비노출을 검증했다. 복사본은 `data/game-policy-validation/2026-10-22T07-27-19-070Z/`에 남겼다.
- 기존 speaker 50개와 새 speaker 16개를 같은 연도/발언자 분산 방식으로 추출했다. 새 speaker가 16개뿐이므로 50개로 부풀리지 않았다. 표시 메시지 평균 1 → 16.75개, 발언자 평균 1 → 2.94명. 사람이 느끼는 재미·맥락 완결성 검수 완료로 주장하지 않는다.

실제 생성 약 4.7초(검증 복사본 약 4.8초). 100MiB 원본에서 만든 가상 100만 메시지 DB는 새 엔진 처리 7.02초, 백업 포함 벽시계 17.63초, health P95 17ms, 동시 숫자 게임 3ms. 해당 가상 데이터는 반복 단답형이므로 적합 새 후보 **0개**다. 의미 있는 대화 후보 생성 성능을 증명하는 수치로 해석하지 않는다.

## 파일과 재현

- 엔진/정책: `server/chat/context.ts`, `game-policy.ts`, `exclusivity.ts`, `reclassify.ts`, `question-state.ts`, `repository.ts`
- 저장/서비스: `server/chat/db.ts`, `bank.ts`, `snapshot.ts`, `worker.ts`, `service.ts`, `bank-diagnostics.ts`
- UI: `src/chat-admin.tsx`, `src/chat-bank-status.tsx`
- 테스트: `tests/chat.test.ts`, `tests/chat-context.test.ts`, `e2e/chat-bank.spec.ts`, `e2e/chat.spec.ts`, `e2e/spy.spec.ts`, `scripts/chat-fixture.ts`
- 진단: `scripts/chat-bank-inspect.ts`, `chat-live-bank-check.ts`, `chat-live-ui-check.ts`, `chat-game-policy-check.ts`
- 문서/로컬 설정: `README.md`, `CHAT-CONTEXT.md`, `CHAT-ANALYSIS.md`, `CHAT-TEST-RESULTS.md`, `.env.example` (실제 `.env`는 Git 제외)

`npm run test:all`로 전체 검증한다. Node 24에서 `node --import tsx scripts/chat-live-bank-check.ts`는 실제 서버의 집계만 조회한다. `node --import tsx scripts/chat-game-policy-check.ts`는 실제 DB를 별도 검증 폴더로 복제하고 그 복사본에서만 테스트 승인/게임을 수행한다. 원문이 들어 있는 샘플/DB/보고서는 `data/` 밖으로 이동하거나 Git에 추가하지 않는다.
