import{spawn}from'node:child_process';import{existsSync}from'node:fs';import{join}from'node:path';
const bundled=join(process.env.USERPROFILE||'','.cache','codex-runtimes','codex-primary-runtime','dependencies','node','bin','node.exe');
const node=Number(process.versions.node.split('.')[0])>=24?process.execPath:existsSync(bundled)?bundled:null;
if(!node){console.error('카카오톡 SQLite 분석에는 Node.js 24 이상이 필요합니다. Node.js 24 LTS를 설치하세요.');process.exit(1);}
const mode=process.argv[2],args=process.argv.slice(3),commands={dev:['scripts/dev.mjs'],start:['--import','tsx','server/index.ts'],unit:['--import','tsx','--test','tests/game.test.ts','tests/show.test.ts','tests/debug.test.ts','tests/chat.test.ts'],network:['scripts/test-network.mjs'],e2e:['node_modules/playwright/cli.js','test'],all:['scripts/test-all.mjs'],chatperf:['--import','tsx','scripts/chat-performance.ts']};
if(!(mode in commands)){console.error('지원하지 않는 실행 모드');process.exit(1);}const child=spawn(node,[...commands[mode],...args],{stdio:'inherit',env:{...process.env,...(mode==='start'?{NODE_ENV:'production'}:{})}});child.on('exit',code=>process.exit(code??1));
