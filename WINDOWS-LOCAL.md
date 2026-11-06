# Windows 로컬 플레이 가이드

노트북 1대(서버·Host·HDMI TV) + 같은 공유기의 휴대폰 5대 기준입니다. 유선 LAN 노트북과 Wi-Fi 휴대폰 조합도 가능합니다. 인터넷 공개·포트포워딩·Windows 서비스 등록은 필요 없습니다.

## ZIP 복원과 첫 실행

1. 이전 PC에서 게임을 마치고 서버를 **Ctrl+C로 종료**합니다. 개발 모드 watch 프로세스도 종료합니다. 서버 콘솔이 돌아왔는지, 아래 포트 확인 명령으로 해당 서버가 종료됐는지 확인합니다.
2. 숨김 항목을 포함해 프로젝트를 개인용 ZIP으로 보관합니다. 새 PC에서 프로젝트 폴더를 한 곳에 완전히 풉니다. **기존 폴더에 합쳐 덮어쓰면 삭제된 옛 파일이 남고 DB·미커밋 변경을 덮을 수 있으므로**, 기존 폴더는 별도로 보관하고 새 폴더로 복원하세요.
3. Node.js 24 이상과 npm을 설치하고 새 터미널에서 `node --version`, `npm --version`을 확인합니다. Codex 전용 Node 경로에 의존하지 않는 것이 좋습니다.
4. 프로젝트 폴더에서 다음을 실행합니다. 최초 `npm ci`는 인터넷이 필요하고 기존 node_modules를 다시 구성합니다. 이 문서 작성 작업에서는 패키지를 설치하지 않았습니다.

```powershell
cd D:\workspace\gapyeong-arcade
npm ci
npm run build
npm start
```

이후에는 빌드가 준비된 상태에서 **start.cmd 더블클릭**으로 실행할 수 있습니다. 폴더 위치가 달라도 cmd 파일이 자기 폴더로 이동합니다. 코드 변경·새 ZIP 복원 후에는 `npm run build`를 다시 하세요. start.cmd는 자동 설치·자동 빌드를 하지 않습니다. 의존성 또는 dist가 없으면 필요한 명령을 안내합니다. 오류 뒤 창을 닫지 않아 내용을 볼 수 있습니다.

시작 성공은 콘솔의 `GAPYEONG ARCADE http://localhost:포트`와 브라우저 접속으로 확인합니다. `http://localhost:3000/api/health`는 실제 서버가 준비되면 `ok: true`를 반환합니다. 기본 포트를 바꿨다면 해당 포트를 사용하세요.

## Host·휴대폰 접속

- Host 노트북: 기본 `http://localhost:3000`. 방을 만들면 참가자 URL과 QR이 표시됩니다. Host도 게임에 참가하려면 별도의 휴대폰 세션으로 입장합니다.
- 휴대폰: 콘솔 및 QR 아래의 **노트북 LAN IPv4 주소**로 접속합니다. 형태는 `http://노트북IPv4:실제포트/?room=방코드`입니다. 휴대폰의 localhost/127.0.0.1은 휴대폰 자신이므로 사용할 수 없습니다.
- 여러 주소가 있으면 QR 아래 선택 목록에서 휴대폰과 통신 가능한 유선 LAN 또는 Wi-Fi 주소를 선택하세요. 선택하면 링크와 QR이 바뀝니다. VPN·가상 어댑터는 후보에 남을 수 있으며 첫 주소가 항상 정답이라는 보장은 없습니다.
- 주소는 실행할 때마다 `/api/network`의 현재 IPv4 목록으로 생성됩니다. 루프백·IPv6·연결 실패용 169.254.x.x와 중복은 제외합니다. 실행 중 IP/공유기가 바뀌면 서버 재시작 후 새 방을 만들고 새 QR을 사용하세요.
- 기존 `PUBLIC_URL`이 설정되어 있으면 목록보다 우선합니다. 다른 PC의 옛 주소·localhost가 설정된 경우 LAN 안내가 틀릴 수 있습니다. 사용자가 해당 설정을 검토하세요. 이번 작업에서는 .env를 수정하지 않았습니다.
- QR은 외부 서비스 없이 브라우저의 qrcode 라이브러리로 URL을 이미지화합니다. Socket.IO는 `io()`로 **페이지와 같은 origin·포트**에 접속합니다. localhost에 고정되어 있지 않습니다. 서버에 별도 CORS 허용 목록·Origin 검사 추가는 하지 않았으며 기존 세션 토큰·Host 권한 검증을 유지합니다. 신뢰하는 로컬 네트워크에서 사용하세요.

노트북 주소 확인:

```powershell
ipconfig
Get-NetIPConfiguration | Select-Object InterfaceAlias,IPv4Address,IPv4DefaultGateway
```

현재 연결된 이더넷/Wi-Fi의 IPv4와 기본 게이트웨이를 확인합니다. 인터넷 사용 가능 여부와 휴대폰-노트북 간 통신 가능 여부는 별개입니다. 같은 공유기라도 게스트 Wi-Fi·AP/클라이언트 격리·회사 VLAN은 유무선 간 접속을 막을 수 있습니다. 휴대폰의 모바일 데이터/VPN도 확인하세요. 여기서는 특정 고정 IP를 가정하지 않습니다.

## 포트·개발 모드·방화벽

| 실행 | 웹·API·Socket.IO | 추가 포트 |
| --- | --- | --- |
| `npm start` / start.cmd | 기본 TCP 3000, PORT로 변경 | 없음 |
| `npm run dev` / dev.cmd | 동일 TCP 3000, Express 안의 Vite middleware | Vite HMR 기본 TCP 24678 |

실제 플레이는 **build 후 start**를 권장합니다. 개발 모드는 소스 변경 시 재시작·리로드가 생길 수 있고 개발자 기능이 활성화됩니다. 별도 5173 프런트 서버를 실행할 필요가 없습니다. Express는 `0.0.0.0`에 바인딩하며 Vite 화면도 같은 Express 포트로 제공합니다. 개발 HMR 포트는 실제 플레이에는 필요 없습니다.

사용 중인 포트와 소유 프로세스 확인:

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 3000,24678 |
  Select-Object LocalAddress,LocalPort,OwningProcess
# 위 결과의 실제 PID로 확인 (다른 프로그램을 임의로 종료하지 않음)
Get-Process -Id 실제PID
```

localhost는 되는데 휴대폰에서 안 되면 Windows 설정에서 현재 네트워크 프로필과 **Windows 보안 → 방화벽 및 네트워크 보호 → 방화벽에서 앱 허용**을 확인하세요. 신뢰하는 개인 네트워크에서 실제 사용 중인 node.exe를 허용할지 사용자가 결정합니다. 회사 정책으로 막힌 경우 관리자에게 문의하세요. 전체 방화벽을 끄지 마세요. Node 설치 경로가 바뀌면 이전 exe 허용 항목이 적용되지 않을 수 있습니다. 이 프로젝트는 방화벽을 자동 변경하거나 관리자 권한을 강제하지 않습니다. 라우터 포트포워딩·공인 IP 공개는 하지 마세요.

## HDMI·실전 체크

1. Windows 디스플레이 설정에서 TV 해상도·확장/복제를 선택하고 Host 브라우저를 TV로 옮깁니다. 전체화면(F11)과 배율, 가장자리 잘림을 확인합니다.
2. Windows 소리 출력에서 HDMI TV 또는 노트북 스피커를 선택합니다. 브라우저/Windows 음소거도 확인합니다.
3. Host 한 화면에서만 **사운드 켜기**를 클릭합니다. 새로고침·재접속·숨긴 탭 복귀 후에는 다시 클릭해야 합니다. 상세는 MAFIA-AUDIO.md를 참고하세요. 휴대폰에는 마피아 BGM을 재생하지 않습니다.
4. 휴대폰 5대 이름·연결 상태 → 추천 조합 → 시작 → 밤 능력 → 낮·뉴스 → 투표 → 종료 직업 공개를 확인합니다. 사망자 직업은 최종 종료 전 비공개입니다.
5. 노트북 절전·화면 잠금으로 서버를 중단하지 않도록 사용자 전원 설정을 확인하고 전원을 연결합니다. 설정을 스크립트로 변경하지 않습니다.

## 종료·재접속·데이터 백업

서버 콘솔에서 **Ctrl+C**, cmd가 배치 종료 여부를 물으면 종료를 선택합니다. start.cmd가 `Server exited`를 표시하거나 프롬프트로 돌아왔는지 확인하고 사용 포트의 LISTEN이 사라졌는지 확인합니다. 게임 중 콘솔 창을 닫거나 PC를 절전/종료하지 마세요.

브라우저 새로고침·일시 연결 해제는 같은 탭의 sessionStorage 토큰으로 기존 방에 재접속합니다. **Node 서버를 재시작하면 메모리의 방·진행 상태·방 내 점수는 사라집니다.** SQLite가 진행 중인 방 전체를 복원하는 구조가 아닙니다. 재시작 뒤 서버 접속은 가능하지만 새 방을 만들어야 합니다. 다른 PC로 폴더를 옮겨도 진행 중인 방과 브라우저 접속 세션은 이동하지 않습니다.

현재 설정의 `CHAT_DATA_DIR=data/live-chat` 기준:

| 데이터 | 경로 결정 순서 | 현재 기본 운영 파일 |
| --- | --- | --- |
| 카카오톡 분석 | CHAT_DATA_DIR → .chat-data | data/live-chat/chat.sqlite |
| 질문은행 제외·관리 상태 | QUESTION_DATA_DIR → CHAT_DATA_DIR → .chat-data | data/live-chat/question-bank.sqlite |
| 마피아 사용자 프리셋 | MAFIA_DATA_DIR → QUESTION_DATA_DIR → CHAT_DATA_DIR → .chat-data | data/live-chat/mafia-presets.sqlite |
| 마피아 비공개 제보·종료 기록 | 위와 동일 | data/live-chat/mafia-reports.sqlite |

상대 경로는 실행 작업 폴더 기준입니다. 절대 경로로 지정된 데이터는 ZIP 폴더 밖일 수 있으므로 별도로 보존해야 합니다. DB에 저장되지 않는 방 내 점수·세션과 영속 DB를 구분하세요. 정적 질문은행 JSON/소스도 함께 보존합니다.

기존 로더는 **CHAT_DATA_DIR 프로세스 환경 변수가 없고 .env가 있을 때만** `process.loadEnvFile('.env')`를 호출합니다. 프로세스 환경 변수가 우선이며, CHAT_DATA_DIR를 이미 지정한 실행에서는 나머지 .env 값도 자동 로드되지 않습니다. 테스트에서는 CHAT/QUESTION/MAFIA_DATA_DIR 모두 테스트 경로로 명시해야 합니다. 기존 로드 방식을 변경하지 않았습니다.

백업은 서버와 모든 분석 Worker를 종료한 뒤 데이터 폴더 전체를 복사하세요. SQLite 옆의 `-wal`, `-shm` 파일이 있으면 임의로 삭제하지 말고 **DB와 함께** 보존합니다. 실행 중 순차 파일 복사는 일관성을 보장하지 않습니다. 다른 PC의 DB 위에 합치거나 오래된 ZIP으로 덮어쓰지 마세요. 카카오톡 시스템·환경 변수는 이번 범위에서 제거하지 않았습니다.

## ZIP 구성

**보존:** src, server, public(있는 경우), scripts, tests, e2e, package.json, package-lock.json, 각종 설정, .git, AGENTS.md, SKILLS-SOURCES.md, .agents/skills, README·MAFIA·MAFIA-AUDIO 등 문서, 필요한 .env, 실제 운영 데이터 폴더와 외부 데이터 경로. 미커밋·미추적 파일도 포함하세요. git clone만으로 미커밋 파일과 ignored DB는 복구되지 않습니다.

**제외 가능:** node_modules(새 PC npm ci), dist(새 PC build), playwright-report, test-results, coverage, 재생성 가능한 빌드·캐시. 이 작업에서는 삭제·자동 정리·ZIP 생성을 하지 않았습니다.

`.chat-test-data`는 운영 DB 기본 위치와 별개이나 **통째로 버리지 마세요.** 기존 6c3a/6c3b 보고서·보존 해시·분석 문서(kakao-removal-impact.md)·테스트 설정과 재현 자료가 있습니다. 큰 trace.zip·PNG·임시 테스트 DB는 테스트를 종료하고 필요한 증거를 따로 백업한 뒤 ZIP 제외 여부만 결정할 수 있습니다. 설정이 이 폴더를 운영 DATA_DIR로 가리키면 해당 데이터는 반드시 보존해야 합니다. 이름만 보고 삭제하지 마세요.

ZIP은 .env·개인 대화·DB·Git 이력에 비밀번호/토큰/접속정보를 포함할 수 있으므로 **개인용 보관**으로 제한합니다. 외부 공유용은 별도 사본에서 비밀정보와 개인정보를 제외하세요.

## 자주 생기는 오류

- `node`를 찾을 수 없음: Node 24+ 설치 후 터미널 재실행. `where.exe node`, `node --version` 확인.
- 의존성 오류: 프로젝트 폴더에서 npm ci. 이전 PC의 node_modules를 그대로 신뢰하지 않습니다.
- 화면이 예전 버전: 서버 종료 → npm run build → npm start → 브라우저 새로고침.
- `EADDRINUSE`: 기존 서버/PID 확인 후 해당 콘솔에서 종료. 임의 프로세스를 강제 종료하지 않습니다.
- QR이 옛 주소/localhost: PUBLIC_URL 및 QR 아래 주소 선택 확인. IP 변경 시 새 방/QR 필요.
- 휴대폰만 실패: 동일 공유기, 게스트/AP 격리, VPN, Windows 개인 네트워크 방화벽, 실제 포트 순서로 확인.
- 방을 찾을 수 없음: 서버 재시작 여부 확인 후 새 방 생성. 새 방의 QR 사용.
- 프리셋이 안 보임: .env 포함 여부와 DATA_DIR/절대 경로 확인. 빈 DB로 덮어쓰거나 초기화하지 않습니다.
- 소리가 안 남: Host 사운드 켜기 클릭, HDMI 출력 장치·브라우저 음소거 확인.

실제 휴대폰·TV·공유기·Windows 방화벽 통과는 자동화 결과와 별도로 현장에서 확인해야 합니다.
