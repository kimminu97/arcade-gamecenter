import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,join,start,progressMafia,syncMafia,submit,view,extendMafia,advance,type Room} from '../server/game';
import {defaultMafiaConfig} from '../server/mafia/config';
import {expireMafiaNight} from '../server/mafia/engine';
import {nightReadinessChecks} from '../server/mafia/night-flow';
import {submitCivic} from '../server/mafia/civic';
import {submitCitizenAction} from '../server/mafia/citizen-rework';
import {configureMafiaReports,receiveAnonymousReport,reserveNewsArticle} from '../server/mafia/reports';
import {reserveFakeNews} from '../server/mafia/information-abilities';
import {submitNeutralAction} from '../server/mafia/neutral-progress';
import {AudioEvents,audioFrame} from '../src/mafia-audio';
import {PresentationEvents} from '../src/mafia-presentation-state';
const m=(r:Room)=>r.round!.mafia!,id=(r:Room,role:string)=>m(r).ids.find(p=>m(r).roleById[p]===role)!;
const step=(r:Room)=>progressMafia(r,m(r).id,m(r).version);
const fixture=(direct:Record<string,number>={mafia:1,police:1,doctor:1,citizen:2})=>{const r=createRoom('host');for(let i=0;i<5;i++)join(r,'자동친구'+i,'🐱','s'+i);r.mafiaSetup={revision:1,config:{...defaultMafiaConfig(5),direct,rules:{raidCooldown:false,mafiaChat:true}}};start(r,'mafia');step(r);return r;};
const nextNight=(r:Room)=>{assert.equal(m(r).phase,'DAY_DISCUSSION');for(let i=0;i<3;i++)step(r);assert.equal(m(r).phase,'NIGHT');};
const action=(r:Room,actor:string,targetId:string)=>submit(r,actor,{roundId:m(r).id,nightId:m(r).nightId,version:m(r).version,revision:m(r).revisions[actor]||0,targetId});
const attack=(r:Room,target:string)=>{for(const actor of m(r).alive.filter(p=>['mafia','fakeReporter'].includes(m(r).roleById[p])))action(r,actor,target);};
const data=(r:Room)=>({roundId:m(r).id,nightId:m(r).nightId,day:m(r).day,requestId:'auto-night-'+m(r).day});

test('Host 밤 마감은 결과1회 후 즉시 토론·추가 발표 버튼 불필요·늦은 요청 거부',()=>{
 const r=fixture(),before=m(r).version,night=m(r).nightId,doctor=id(r,'doctor');step(r);assert.equal(m(r).phase,'DAY_DISCUSSION');assert.equal(r.round!.phase,'DAY_DISCUSSION');assert.equal(r.round!.deadline,0);assert.equal(m(r).events.length,1);assert.equal(Object.keys(m(r).nightResolutions).length,1);assert.throws(()=>progressMafia(r,m(r).id,before));assert.throws(()=>submit(r,doctor,{roundId:m(r).id,nightId:night,version:before,revision:0,targetId:doctor}));const v=m(r).version;syncMafia(r);syncMafia(r);assert.equal(m(r).version,v);assert.equal(m(r).events.length,1);assert.equal(view(r,'',true).round!.mafia!.revealedRoles,undefined);
});
test('실제 서버 타이머 advance 및 엔진 만료 경로 모두 자동 토론·연장/중복 만료 보호',()=>{
 for(const engineExpiry of [false,true]){const r=fixture(),before=m(r).nightEndsAt;extendMafia(r,m(r).id,m(r).version);assert.equal(m(r).nightEndsAt,before+30000);assert.equal(expireMafiaNight(m(r),before),false);m(r).nightEndsAt=Date.now()-1;syncMafia(r);if(engineExpiry){assert.equal(expireMafiaNight(m(r)),true);syncMafia(r);}else advance(r);assert.equal(m(r).phase,'DAY_DISCUSSION');assert.equal(expireMafiaNight(m(r)),false);syncMafia(r);assert.equal(m(r).events.length,1);assert.equal(m(r).nightEndsAt,0);}
});
test('고정 밤 창은 전원 제출로 단축되지 않음·기존 조기 종료 게이트 허용 시 같은 경로',()=>{
 for(const allow of [false,true]){const r=fixture();step(r);nextNight(r);const gate=nightReadinessChecks.find(x=>x.key==='fixedNightWindow')!,original=gate.ready;
 try{if(allow)gate.ready=()=>true;const target=id(r,'citizen');attack(r,target);action(r,id(r,'police'),target);action(r,id(r,'doctor'),target);assert.equal(m(r).phase,allow?'DAY_DISCUSSION':'NIGHT');if(allow)assert.equal(m(r).events.filter(e=>e.kind==='night').length,2);}finally{gate.ready=original;}}
});
for(const protection of ['doctor','bodyguard','shield'])test('자동 토론: '+protection+' 보호 및 방패 우선순위 유지',()=>{
 const r=fixture({mafia:1,doctor:1,bodyguard:1,shieldMaker:1,citizen:1}),target=id(r,'citizen');submitCitizenAction(m(r),id(r,'shieldMaker'),{...data(r),targetId:target});step(r);nextNight(r);
 if(protection==='doctor')action(r,id(r,'doctor'),target);if(protection!=='shield')submitCivic(m(r),id(r,'bodyguard'),{...data(r),targetId:target});attack(r,target);step(r);assert.equal(m(r).phase,'DAY_DISCUSSION');assert.ok(m(r).alive.includes(target));assert.equal(m(r).citizen.shields[0].status,protection==='shield'?'consumed':'active');assert.equal(m(r).events.at(-1)!.guardStoppedAttack,protection==='bodyguard');
});
test('기사2종·밤 사망·역할 비공개·낮 사운드/연출 단회 유지',()=>{
 const r=fixture({mafia:1,fakeReporter:1,journalist:1,citizen:2}),reporter=id(r,'journalist'),sender=id(r,'citizen');receiveAnonymousReport(m(r),sender,{...data(r),text:'동일한 공개 기사'});reserveNewsArticle(m(r),reporter,{...data(r),reportId:m(r).anonymousReports.records[0].reportId});reserveFakeNews(m(r),id(r,'fakeReporter'),{...data(r),text:'동일한 공개 기사'});step(r);assert.equal(m(r).phase,'DAY_DISCUSSION');assert.equal(view(r,'',true).round!.mafia!.news.length,2);nextNight(r);
 const sound=new AudioEvents(),visual=new PresentationEvents();sound.observe(audioFrame(view(r,'',true)));visual.observe(view(r,'',true));attack(r,sender);step(r);const publicRoom=view(r,'',true);assert.equal(m(r).phase,'DAY_DISCUSSION');assert.deepEqual(m(r).events.at(-1)!.deaths,[sender]);assert.equal(publicRoom.round!.mafia!.revealedRoles,undefined);assert.deepEqual(sound.observe(audioFrame(publicRoom)),['day','death']);assert.deepEqual(sound.observe(audioFrame(publicRoom)),[]);assert.equal(visual.observe(publicRoom)!.kind,'day');assert.equal(visual.observe(publicRoom),null);assert.deepEqual(sound.observe(audioFrame(publicRoom),true),[]);
});
test('밤 승리면 토론에 진입하지 않음: 시민·마피아·중립·기록 단회',()=>{
 for(const team of ['town','mafia','neutral']){const r=team==='neutral'?fixture({mafia:1,swindler:1,citizen:3}):team==='mafia'?fixture({mafia:1,fakeReporter:1,citizen:3}):fixture();
  if(team==='neutral'){for(let i=0;i<2;i++){const owner=id(r,'swindler'),target=m(r).ids.filter(p=>m(r).roleById[p]==='citizen')[i];submitNeutralAction(m(r),owner,{...data(r),targetId:target,guessedRoleId:'citizen'});step(r);if(i===0)nextNight(r);}}
  else{step(r);nextNight(r);if(team==='town'){attack(r,id(r,'mafia'));step(r);}else{attack(r,id(r,'citizen'));step(r);nextNight(r);attack(r,m(r).alive.find(p=>m(r).roleById[p]==='citizen')!);step(r);}}
  assert.equal(m(r).phase,'GAME_END');assert.equal(m(r).winner,team);assert.equal(r.history.length,1);syncMafia(r);assert.equal(r.history.length,1);
 }
});
test('저장 실패 시 밤 상태·결과 미반영, 재시도 성공 시에만 자동 토론',()=>{
 const r=fixture();configureMafiaReports({receive:()=>{},reserve:()=>{},publish:()=>{throw Error('disk');}});try{assert.throws(()=>step(r),/disk/);assert.equal(m(r).phase,'NIGHT');assert.equal(m(r).events.length,0);assert.equal(Object.keys(m(r).nightResolutions).length,0);}finally{configureMafiaReports();}step(r);assert.equal(m(r).phase,'DAY_DISCUSSION');assert.equal(m(r).events.length,1);
});
