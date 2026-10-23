import {test} from 'node:test';import assert from 'node:assert/strict';
import {resolveCourt} from '../server/court';import {createRoom,join,start,advance,finish,submit,view} from '../server/game';import {playerAction} from '../server/player-action';import {createDebugService} from '../server/debug';
const room=(n:number)=>{const r=createRoom('host');for(let i=0;i<n;i++)join(r,'친구'+i,'🐱','socket'+i);return r;};
for(const n of [5,6,7]){
 const ids=Array.from({length:n},(_,i)=>'p'+i),single=Object.fromEntries(ids.map(id=>[id,ids[0]])),joint=Object.fromEntries(ids.map((id,i)=>[id,ids[Math.floor(i/2)]])),equal=Object.fromEntries(ids.map(id=>[id,id]));
 const run=(votes:Record<string,string>,challengers:string[])=>resolveCourt(ids,votes,Object.fromEntries(ids.map(id=>[id,challengers.includes(id)])));
 const cases:[string,Record<string,string>,string[],string[],string[]][]=[
 ['단독 최다 도전 성공',single,['p0'],['p0'],ids.slice(1)],
 ['단독 최다 도전 실패',single,[],[],['p0']],
 ['잘못된 도전',single,['p1'],[],['p0','p1']],
 ['공동 최다 모두 성공',joint,['p0','p1',...(n>=6?['p2']:[])],n>=6?['p0','p1','p2']:['p0','p1'],n>=6?ids.slice(3):ids.slice(2)],
 ['공동 최다 일부 성공',joint,['p0'],['p0'],ids.slice(1)],
 ['공동 최다 전원 실패',joint,[],[],n>=6?['p0','p1','p2']:['p0','p1']],
 ['전원 도전',single,ids,['p0'],ids.slice(1)],
 ['전원 도전 안 함',single,[],[],['p0']],
 ['전원 동일 득표',equal,['p1'],['p1'],ids.filter(id=>id!=='p1')],
 ];
 for(const [name,votes,challengers,success,penalty] of cases)test(`${n}명 재판: ${name}`,()=>{const r=run(votes,challengers);assert.deepEqual(r.successfulPredictorIds,success);assert.deepEqual(r.penaltyPlayerIds,penalty);assert.equal(r.isInvalidRound,false);assert.equal(r.isTie,name.includes('공동')||name==='전원 동일 득표');});
 test(`${n}명 재판: 예측 미제출 기본값·이진 점수·중복·비밀·연결 끊김·점수 단회`,()=>{
 const r=room(n);start(r,'court');const g=r.round!,ps=r.players;for(const p of ps)submit(r,p.id,ps[0].id);assert.equal(g.phase,'predict');submit(r,ps[0].id,true);assert.throws(()=>submit(r,ps[0].id,false),/이미/);assert.throws(()=>submit(r,ps[1].id,1));const before:any=view(r,ps[1].id).round;assert.equal(before.result,null);assert.equal(before.predictions,undefined);assert.equal(before.votes,undefined);assert.equal(before.counts,undefined);assert.equal((view(r,'',true).round as any).predictions,undefined);
 for(const p of ps.slice(1,-1))submit(r,p.id,false);ps.at(-1)!.online=false;assert.throws(()=>playerAction(r,ps.at(-1)!.id,{type:'submit',value:true}));finish(r);const result=g.result;assert.equal(result.predictions[ps.at(-1)!.id],false);assert.ok(result.missingPredictionPlayerIds.includes(ps.at(-1)!.id));assert.equal(result.points[ps.at(-1)!.id],0);assert.equal(result.points[ps[0].id],150);assert.equal(result.points[ps[1].id],150);assert.ok(result.penaltyPlayerIds.includes(ps[1].id));assert.equal(result.penaltyPlayerIds.length,n-1);const scores=ps.map(p=>p.score);finish(r);assert.deepEqual(ps.map(p=>p.score),scores);assert.equal(r.history.length,1);for(const p of ps)assert.equal(p.score,r.history.reduce((sum,h)=>sum+(h.points[p.id]||0),0));
 });
 test(`${n}명 재판: 유효 투표 0개·잘못된 투표 무시·전원 0표 동점 아님`,()=>{const r=room(n);start(r,'court');advance(r);submit(r,r.players[0].id,true);finish(r);assert.equal(r.round!.result.isInvalidRound,true);assert.deepEqual(r.round!.result.penaltyPlayerIds,[]);assert.deepEqual(r.round!.result.topVotedPlayerIds,[]);assert.ok(r.players.every(p=>p.score===0));const bad=resolveCourt(ids,{outsider:'p0',p0:'outsider',p1:'p1'}, {},false);assert.equal(bad.validVoteCount,0);});
 test(`${n}명 재판: 타이머 미제출·도전 없는 동점·전원 같은 표 도전/미도전`,()=>{const missing=resolveCourt(ids,joint,{});assert.equal(missing.missingPredictionPlayerIds.length,n);assert.deepEqual(missing.penaltyPlayerIds,missing.topVotedPlayerIds);assert.deepEqual(run(equal,ids).penaltyPlayerIds,[]);assert.deepEqual(run(equal,[]).penaltyPlayerIds,ids);const r=room(n);start(r,'court');for(const p of r.players)submit(r,p.id,r.players[0].id);advance(r);assert.equal(r.round!.phase,'result');assert.equal(r.round!.result.predictions[r.players[0].id],false);});
}
test('Bot 자동·수동 예측도 일반 boolean 제출 경로와 중복 검증 사용',()=>{const r=room(1),service=createDebugService('development',()=>{}),grant=service.command(r,'host',undefined,{type:'debug:unlock'}).grant!;const command=(type:string,args:any={})=>service.command(r,'host',grant,{type:'debug:'+type,...args});command('enable',{enabled:true});command('add',{count:4});command('config',{auto:false});start(r,'court');for(const p of r.players)submit(r,p.id,r.players[0].id);const bot=r.players[1];command('manual',{id:bot.id,action:{type:'submit',value:true}});assert.equal(r.round!.predictions[bot.id],true);assert.throws(()=>command('manual',{id:bot.id,action:{type:'submit',value:false}}));command('now');for(const p of r.players.slice(1))assert.equal(typeof r.round!.predictions[p.id],'boolean');submit(r,r.players[0].id,false);assert.equal(r.round!.phase,'result');});
