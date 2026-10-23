# 승인 목록 0건 오류 수정 — 2026-10-23

## 확인한 원인

실제 연결 DB는 `data/live-chat/chat.sqlite`다. 관리자 Host 인증을 거친 실제 Express API와 SQLite를 코드 수정 전에 비교했다. 원문은 출력하지 않았다.

이 말 누가 했게? 탭의 대기 집계는 `WHERE gameMode='guess-speaker' AND reviewStatus='pending'`로 모든 엔진 버전을 계산했다. 반면 React 기본 필터와 탭 클릭은 `version=4`를 강제했다. 상태를 대기로 바꾸어도 버전은 4여서 실제 목록 SQL에는 `engineVersion=4 AND reviewStatus='pending'`이 함께 적용됐다.

| 수정 전 실제 API 요청 | 검색 총수 | 첫 페이지 |
| --- | ---: | ---: |
| 게임=guess-speaker, 상태=pending, 버전=4 | 0 | 0 |
| 게임=guess-speaker, 상태=pending, 버전 제한 없음 | 562 | 50 |
| 게임=guess-speaker, 상태=approved, 버전=4 | 1 | 1 |

기존 React 기본 상태는 approved였으므로 처음에는 승인 1개가 보이지만, 대기를 선택하면 0개가 되는 조건이었다. 목록 API는 별도 발언자 매핑 필터나 React 후처리로 데이터를 버리고 있지 않았다. LIMIT 50은 페이지 크기였고 전체 건수는 별도 count였다. API 오류와 빈 응답은 이미 일부 구분했으나 버전 범위 불일치 안내가 부족했다.

## 실제 DB 상태

실제 컬럼 `reviewStatus`와 `availability`는 서로 다른 차원이다. 존재하지 않는 PENDING/APPROVED 값을 새로 가정하거나 DB 전체 상태를 변환하지 않았다.

| 엔진 | reviewStatus | availability | 개수 |
| --- | --- | --- | ---: |
| v1 | pending | NEEDS_REVIEW | 211 |
| v1 | excluded | EXCLUDED | 3 |
| v2 | pending | NEEDS_REVIEW | 342 |
| v3 | pending | NEEDS_REVIEW | 9 |
| v3 | excluded | EXCLUDED | 19 |
| v4 | approved | AUTO_READY | 1 |
| 합계 | | | 585 |

승인 대기 562개, 승인 1개, 제외 22개다. 수정 후에도 실제 DB의 해당 개수는 그대로다. 목록만 정상적으로 접근 가능하게 했다.

## 수정 사항

- `server/chat/bank-diagnostics.ts`: `questionWhere`로 게임·버전·유형·상태·검색·연도 조건을 공통 구성한다. `questionCounts`는 같은 조건 생성기를 사용하고 검색어·검수 상태를 빼서 해당 범위의 상태별 건수를 반환한다. 페이지 총수와 행 조회는 완전히 같은 WHERE를 사용한다.
- `server/chat/service.ts`: meta 응답에 counts와 페이지 크기·보정된 offset을 전달한다. Host/로컬 권한과 기존 승인·중복 검사는 유지한다.
- `src/chat-admin.tsx`: 기본/게임 탭 선택을 모든 버전의 승인 대기로 변경했다. 전체·대기·승인·자동 출제 가능·검수 필요·제외·현재 검색 결과를 표시한다. 필터 초기화, 페이지 번호, 정확한 다음 페이지 활성화, 필터 변경 시 첫 페이지, 검수 후 즉시 재조회가 적용된다.
- `src/chat-bank-status.tsx`: 기존 전체 DB 진단은 모든 게임·버전 합계임을 명시해 선택 게임의 건수와 혼동하지 않도록 했다.
- 오래된 offset은 빈 화면 대신 마지막 유효 페이지로 보정한다. 서버가 반환한 offset을 화면에서도 반영한다.
- 미매핑 문제도 관리자 검수에서는 보이며 매핑 필요 문구를 표시한다. 실제 게임의 매핑·v4 출제 제한은 변경하지 않았다.

`pending`은 excluded를 제외한 수동 검수 대기다. `NEEDS_REVIEW`는 그중 추가 확인이 필요한 상태다. `approved`는 승인 완료이며, `AUTO_READY`는 승인 여부와 별도로 출제 준비 상태를 조회한다. `excluded`/`EXCLUDED`는 제외를 우선 적용한다. 따라서 상태별 숫자는 서로 더해서 총수가 되는 단일 분할이 아니며 UI에 중첩 관계를 설명한다.

## 실제 브라우저·검수 검증

`scripts/chat-review-check.ts`로 localhost:3000의 실제 관리자 화면을 Chromium에서 열었다. 가상 문제를 넣지 않고 실제 SQLite의 대기 **562개**를 조회했다. **첫 페이지 50개, 전체 12페이지, 마지막 페이지 12개**를 확인했다.

승인/제외를 임의로 운영 데이터에 남기지 않도록 SQLite 온라인 백업으로 새 복사본을 만들고 별도 서버 3125에서 정상 관리 API를 호출했다.

- 복사본 실제 문제 승인 성공: 대기 **562 → 561**.
- 복사본 실제 문제 제외 성공: 대기 **561 → 560**.
- 복사본 서버를 종료·재시작한 뒤 대기 **560** 유지.
- 실제 DB의 메시지·매핑·문제·검수 이력 해시 전후 동일.

보고서와 실제 대화가 포함될 수 있는 스크린샷은 Git 제외 폴더 `data/review-validation/2026-10-23T00-57-13-476Z/`에만 보관했다. `report.json`은 집계이며 `live-last-page.png`는 로컬 검수용이다. 원문 TXT나 DB를 삭제·초기화하지 않았다.

## 회귀 테스트

- `tests/review-fixture.ts`: 개인정보 없는 가상 문제 500개 및 상태 비교 표본.
- `tests/review-list.test.ts`: 500개 이상 조회, 상태/게임/버전/검색, 페이지와 마지막 페이지, 대기 집계 일치, 승인·제외 감소, 매핑 독립, DB 재개방 영속성.
- `e2e/review-list.spec.ts`: 실제 React에서 50개 목록·페이지·승인/제외 즉시 갱신·필터 초기화·새로고침·빈 검색과 API 실패 구분.
- 기존 `tests/chat-context.test.ts`의 범위 밖 페이지 기대값을 마지막 유효 페이지로 갱신했다.
- 기존 `e2e/chat-speaker.spec.ts`는 v4 자동 승인 문제를 확인할 때 승인 상태를 명시적으로 선택한다.
- `scripts/launch.mjs`, `scripts/test-all.mjs`에 새 단위 테스트를 등록했다.

실행: `node scripts/launch.mjs all`. Git 커밋·Push는 수행하지 않는다.

최종 실행 종료 코드 **0**. 단위 **46개**, 실제 네트워크 **2개**, Playwright **12개**, 총 **60개 통과**. TypeScript·Vite 프로덕션 빌드도 통과했다. 기존 약 507kB 번들 크기 경고는 남아 있다. 새 브라우저 테스트의 초기 세션 대기 누락을 보완한 뒤 전체 테스트를 다시 실행해 통과했다.
