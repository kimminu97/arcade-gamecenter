import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createMafia,advanceMafia,submitMafia,submitRevenge,mafiaView,type MafiaState} from '../server/mafia/engine';
import {defaultMafiaConfig,drawMafiaSlots} from '../server/mafia/config';
import {submitJudgement} from '../server/mafia/civic';
import {configureMafiaReports} from '../server/mafia/reports';
import {openMafiaReportStore} from '../server/mafia/report-store';
import {sendMafiaChat} from '../server/mafia/chat';
import {roles} from '../server/mafia/roles';
const fixture=(n=7,mafia='mafia')=>createMafia(Array.from({length:n},(_,i)=>'p'+i),300,{...defaultMafiaConfig(n),direct:{[mafia]:1,revenant:1,judge:1,citizen:n-3}});
const owner=(m:MafiaState)=>m.ids.find(i=>m.roleById[i]==='revenant')!;
const citizen=(m:MafiaState)=>m.ids.find(i=>m.roleById[i]==='citizen')!;
const enemy=(m:MafiaState)=>m.ids.find(i=>['mafia','hacker','fakeReporter','blackmailer','eavesdropper'].includes(m.roleById[i]))!;
const next=(m:MafiaState)=>advanceMafia(m,m.version,m.phase==='EXECUTION_PENDING'?m.executionPending!.endsAt:Date.now());
function until(m:MafiaState,phase:string){for(let i=0;i<15&&m.phase!==phase;i++)next(m);assert.equal(m.phase,phase);}
function ballot(m:MafiaState,votes:Record<string,string>){until(m,'DAY_VOTE');m.votes={...votes};next(m);}
function execute(m:MafiaState,votes=Object.fromEntries(m.alive.map(i=>[i,owner(m)]))){ballot(m,votes);next(m);}
const guess=(m:MafiaState,targetId:string,id=owner(m),overrides:any={})=>submitRevenge(m,id,{roundId:m.id,executionId:m.revengePending!.id,requestId:randomUUID(),targetId,...overrides},m.revengePending!.revenge!.endsAt-1);
test('최종 공개: 5인 진행 중 밤 사망은 비공개, 종료 뒤 신/구 ID 혼동 없이 전원 실제 직업·진영',()=>{
 const m=createMafia(['p0','p1','p2','p3','p4'],300,{...defaultMafiaConfig(5),direct:{mafia:1,voteBlocker:1,voteAppraiser:1,shieldMaker:1,citizen:1}}),assigned=Object.fromEntries(m.ids.map(id=>[id,roles[m.roleById[id]]]));
 const hidden=()=>{for(const id of['',...m.ids]){const v=mafiaView(m,id);assert.equal(v.revealedRoles,undefined);assert.equal((v as any).roleById,undefined);assert.equal((v as any).votes,undefined);}};
 hidden();until(m,'NIGHT');next(m);until(m,'NIGHT');const target=m.ids.find(id=>m.roleById[id]==='citizen')!,attacker=m.ids.find(id=>m.roleById[id]==='mafia')!;submitMafia(m,attacker,{roundId:m.id,version:m.version,nightId:m.nightId,revision:0,targetId:target});next(m);assert.equal(m.phase,'DAY_ANNOUNCEMENT');assert.ok(!m.alive.includes(target));hidden();
 ballot(m,Object.fromEntries(m.alive.map(id=>[id,attacker])));hidden();next(m);assert.equal(m.winner,'town');assert.ok(!m.alive.includes(attacker));for(const id of['',...m.ids])assert.deepEqual(mafiaView(m,id).revealedRoles,assigned);assert.equal(Object.keys(mafiaView(m,'').revealedRoles!).length,5);assert.equal(Object.values(assigned).some(r=>['informant','archivist','wiretapper'].includes(r.roleId)),false);
});
test('최종 공개: 복수귀 사망·15초 대기의 개인/Host 뷰에는 없고 중립 승리 확정 뒤에만 공개',()=>{
 const m=fixture(5),assigned=Object.fromEntries(m.ids.map(id=>[id,roles[m.roleById[id]]]));until(m,'NIGHT');sendMafiaChat(m,enemy(m),{roundId:m.id,chatId:m.id,messageId:randomUUID(),text:'final-reveal-private-chat-marker'});execute(m);assert.equal(m.phase,'REVENGE_PENDING');assert.ok(!m.alive.includes(owner(m)));
 for(const id of['',...m.ids]){assert.equal(mafiaView(m,id).revealedRoles,undefined);}
 guess(m,enemy(m));assert.equal(m.winner,'neutral');for(const id of['',...m.ids]){const v=mafiaView(m,id);assert.deepEqual(v.revealedRoles,assigned);assert.equal(v.chat,undefined);assert.equal((v as any).secretLog,undefined);assert.equal((v as any).privateChats,undefined);assert.ok(!JSON.stringify(v).includes('final-reveal-private-chat-marker'));}
});
test('모든 직업 활성화 후에도 예정 직업 배정 차단 검증 유지',()=>{const previous=roles.revenant.implementationStatus;try{roles.revenant.implementationStatus='planned';assert.throws(()=>fixture());assert.throws(()=>drawMafiaSlots({...defaultMafiaConfig(5),mode:'teamRandom',teams:{mafia:1,citizen:3,neutral:1},candidates:{mafia:['mafia'],citizen:['citizen'],neutral:['revenant']}},5));}finally{roles.revenant.implementationStatus=previous;}});
for(const n of [5,6,7])test(`${n}인 복수귀 직접·랜덤 배정, 사망 후 유효표 후보·비밀·단독 승리`,()=>{
 const cfg={...defaultMafiaConfig(n),mode:'teamRandom' as const,teams:{mafia:1,citizen:n-2,neutral:1},candidates:{mafia:['mafia'],citizen:['citizen'],neutral:['revenant']}};
 assert.ok(drawMafiaSlots(cfg,n).includes('revenant'));const m=fixture(n);execute(m);
 assert.equal(m.phase,'REVENGE_PENDING');assert.ok(!m.alive.includes(owner(m)));assert.equal(m.winner,undefined);
 const view=mafiaView(m,owner(m)).revenge!;assert.deepEqual([...view.candidates].sort(),m.ids.filter(i=>i!==owner(m)).sort());
 for(const id of ['',...m.ids.filter(i=>i!==owner(m))]){assert.equal(mafiaView(m,id).revenge,undefined);assert.ok(!JSON.stringify(mafiaView(m,id)).includes('voteRecords'));}
 guess(m,enemy(m));assert.equal(m.winner,'neutral');assert.deepEqual(m.winnerPlayerIds,[owner(m)]);assert.equal(m.winResult!.roleId,'revenant');assert.equal(m.events.filter(e=>e.deaths.includes(owner(m))).length,1);
 assert.throws(()=>guess(m,enemy(m)));assert.throws(()=>next(m));
});
for(const role of ['mafia','hacker','fakeReporter','blackmailer','eavesdropper'])test(`복수귀는 마피아팀 ${role}를 맞히면 승리`,()=>{const m=fixture(5,role);execute(m);guess(m,enemy(m));assert.equal(m.winner,'neutral');});
test('시민 오답·시간초과는 실패, 승리 없으면 기존 낮 결과로 복귀',()=>{for(const timeout of [false,true]){const m=fixture();execute(m);if(timeout)advanceMafia(m,m.version,m.revengePending!.revenge!.endsAt);else guess(m,citizen(m));assert.equal(m.winner,undefined);assert.equal(m.phase,'DAY_RESOLUTION');assert.equal(m.executions.at(-1)!.revenge!.status,timeout?'timedOut':'submitted');assert.equal(m.executions.at(-1)!.revenge!.correct,false);next(m);assert.equal(m.phase,'NIGHT');}});
test('판사 취소·동률·무투표·자기표만 있으면 추측 단계 없음',()=>{
 for(const kind of ['cancel','tie','empty','self']){const m=fixture();const o=owner(m),c=citizen(m);ballot(m,kind==='tie'?{[o]:o,[c]:c}:kind==='empty'?{}:kind==='self'?{[o]:o}:Object.fromEntries(m.alive.map(i=>[i,o])));
 if(kind==='cancel')submitJudgement(m,m.ids.find(i=>m.roleById[i]==='judge')!,{roundId:m.id,executionId:m.executionPending!.id,requestId:randomUUID(),cancel:true});
 if(m.phase==='EXECUTION_PENDING')next(m);assert.equal(m.phase,'DAY_RESOLUTION');assert.equal(m.revengePending,undefined);assert.equal(m.alive.includes(o),kind!=='self');
 if(kind==='self')assert.equal(m.executions.at(-1)!.revenge!.status,'unavailable');}
});
test('유효표 동결 사용·비투표자/자기/위조/일반 사망자 행동·조기 마감 차단',()=>{
 const m=fixture(),o=owner(m),e=enemy(m),c=citizen(m);ballot(m,{[o]:o,[e]:o,ghost:o,[c]:'missing'});m.votes={[c]:o};next(m);
 assert.deepEqual(mafiaView(m,o).revenge!.candidates,[e]);const version=m.version;
 for(const t of [o,c,'ghost','missing'])assert.throws(()=>guess(m,t));assert.throws(()=>guess(m,e,c));
 for(const extra of [{playerId:o},{roleId:'revenant'},{roundId:'wrong'},{executionId:'wrong'},{requestId:'x'}])assert.throws(()=>guess(m,e,o,extra));
 assert.throws(()=>advanceMafia(m,m.version,m.revengePending!.revenge!.endsAt-1));assert.equal(m.version,version);
 assert.throws(()=>submitMafia(m,o,{roundId:m.id,version:m.version,revision:0,targetId:e}));assert.throws(()=>sendMafiaChat(m,o,{roundId:m.id,nightId:m.nightId,messageId:randomUUID(),text:'no'}));
 const at=m.revengePending!.revenge!.endsAt;assert.throws(()=>submitRevenge(m,o,{roundId:m.id,executionId:m.revengePending!.id,requestId:randomUUID(),targetId:e},at));assert.equal(m.phase,'REVENGE_PENDING');guess(m,e);
});
test('밤 습격 사망은 복수귀 기회 없음',()=>{const m=fixture();until(m,'DAY_VOTE');next(m);until(m,'NIGHT');submitMafia(m,enemy(m),{roundId:m.id,version:m.version,revision:0,targetId:owner(m)});next(m);assert.ok(!m.alive.includes(owner(m)));assert.equal(m.revengePending,undefined);assert.equal(mafiaView(m,owner(m)).revenge,undefined);});
for(const correct of [true,false,'timeout'] as const)test(`마피아 다수 승리 보류 및 복수귀 우선/실패 복귀: ${correct}`,()=>{
 const m=fixture(),o=owner(m),e=enemy(m),c=citizen(m);until(m,'DAY_VOTE');const other=m.ids.find(i=>!['revenant','mafia','citizen'].includes(m.roleById[i]))!;m.roleById[other]='mafia';m.alive=[o,e,other,c];m.votes=Object.fromEntries(m.alive.map(i=>[i,o]));next(m);next(m);assert.equal(m.winner,undefined);
 if(correct==='timeout')advanceMafia(m,m.version,m.revengePending!.revenge!.endsAt);else guess(m,correct?e:c);assert.equal(m.winner,correct===true?'neutral':'mafia');
});
test('일반 시민 승리 평가보다 복수귀가 먼저, 정답 불가능 시 시민 승리',()=>{
 const m=fixture(),e=enemy(m),o=owner(m);execute(m);m.alive=m.alive.filter(i=>i!==e);guess(m,e);assert.equal(m.winner,'neutral');
 const failed=fixture();execute(failed);failed.alive=failed.alive.filter(i=>i!==enemy(failed));guess(failed,citizen(failed));assert.equal(failed.winner,'town');assert.ok(!failed.winnerPlayerIds!.includes(owner(failed)));
});
test('SQLite v8 JSON: 대기/최종 원자 저장·재오픈·DB 실패 후 재시도·중복 방지',()=>{
 const path='.chat-test-data/revenant-'+randomUUID()+'/r.sqlite',store=openMafiaReportStore(path);configureMafiaReports(store);const db=new DatabaseSync(path);let m:MafiaState;
 try{m=fixture();ballot(m,Object.fromEntries(m.alive.map(i=>[i,owner(m)])));db.exec("CREATE TRIGGER FailPending BEFORE UPDATE ON MafiaExecution BEGIN SELECT RAISE(ABORT,'fail');END");assert.throws(()=>next(m));assert.ok(m.alive.includes(owner(m)));assert.equal(m.phase,'EXECUTION_PENDING');db.exec('DROP TRIGGER FailPending');next(m);
 const saved=JSON.parse((db.prepare('SELECT resultJson FROM MafiaExecution WHERE gameSessionId=?').get(m.id) as any).resultJson);assert.equal(saved.revenge.status,'pending');assert.equal(saved.revenge.endsAt-saved.endsAt,15000);assert.equal(saved.executedPlayerId,owner(m));
 db.exec("CREATE TRIGGER FailWin BEFORE INSERT ON MafiaGameResult BEGIN SELECT RAISE(ABORT,'fail');END");assert.throws(()=>guess(m,enemy(m)));assert.equal(m.phase,'REVENGE_PENDING');assert.equal(m.revengePending!.revenge!.status,'pending');assert.equal(m.winner,undefined);db.exec('DROP TRIGGER FailWin');guess(m,enemy(m));
 assert.throws(()=>store.execution!(m.executions.at(-1)!));assert.equal((db.prepare('SELECT count(*) n FROM MafiaGameResult').get() as any).n,1);assert.equal((db.prepare('SELECT count(*) n FROM MafiaExecution').get() as any).n,1);
 }finally{db.close();store.close();configureMafiaReports();}
 const read=new DatabaseSync(path,{readOnly:true});try{assert.equal((read.prepare("SELECT value FROM MafiaReportMeta WHERE key='schemaVersion'").get() as any).value,'10');const e=JSON.parse((read.prepare('SELECT resultJson FROM MafiaExecution').get() as any).resultJson);assert.equal(e.revenge.correct,true);assert.equal(e.personalWinResult.roleId,'revenant');assert.ok(e.revenge.requestId);assert.equal(e.revenge.candidates.includes(e.revenge.targetId),true);}finally{read.close();}
});
