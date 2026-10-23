import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spyQuestions,quality,answerContract,validateSpyAnswer} from '../server/spy-bank';
import {createRoom,join,start,submit,advance,finish,view} from '../server/game';
import {spyValue} from './spy-helper';
import {createDebugService} from '../server/debug';
test('새 질문 100세트: ID·내용·분류·공통 답변 계약·자체 품질 검사',()=>{
 assert.equal(spyQuestions.length,100);
 assert.equal(new Set(spyQuestions.map(q=>q.id)).size,100);
 const counts=(key:'category'|'answerType')=>Object.fromEntries([...new Set(spyQuestions.map(q=>q[key]))].map(k=>[k,spyQuestions.filter(q=>q[key]===k).length]));
 assert.deepEqual(counts('category'),{'연애·바람':25,'성인 연애관':15,'친구·배신':20,'우리끼리 폭로':20,'돈·결혼':10,'선택·딜레마':10});
 assert.deepEqual(counts('answerType'),{yes_no:40,number:15,text:15,balance:10,player:20});
 assert.equal(new Set(spyQuestions.flatMap(q=>[q.normalQuestion,q.spyQuestion])).size,200);
 for(const q of spyQuestions){assert.ok(q.id&&q.normalQuestion&&q.spyQuestion);assert.notEqual(q.normalQuestion,q.spyQuestion);assert.ok(quality(q).score===100,`${q.id}: ${JSON.stringify(quality(q))}`);const c=answerContract(q);assert.ok(!JSON.stringify(c).includes(q.spyQuestion));if(c.options)assert.equal(new Set(c.options).size,2);}
});
for(const n of [5,6,7])test(`${n}명: 100개 새 질문 무중복·비밀 분리·전 유형 입력·투표·점수`,()=>{
 const r=createRoom('h');for(let i=0;i<n;i++)join(r,`친구${i}`,'🐱',String(i));
 const seen=new Set<string>();for(let i=0;i<100;i++){
 start(r,'spy');const g=r.round!,q=spyQuestions.find(q=>q.normalQuestion===g.question)!;assert.ok(q);assert.ok(!seen.has(q.id));seen.add(q.id);
 const host=JSON.stringify(view(r,'',true));assert.ok(!host.includes(g.secret));assert.ok(!host.includes(q.id));assert.ok(!host.includes(q.category));
 assert.equal(r.players.filter(p=>view(r,p.id).round!.question===g.secret).length,1);
 const normal=r.players.find(p=>p.id!==g.spy)!;assert.ok(!JSON.stringify(view(r,normal.id)).includes(g.secret));
 const before=r.players.map(p=>p.score);for(const p of r.players){submit(r,p.id,spyValue(r));assert.throws(()=>submit(r,p.id,spyValue(r)));}
 assert.equal(g.phase,'discuss');assert.equal(view(r,'',true).round!.answers!.length,n);advance(r);
 for(const p of r.players)submit(r,p.id,p.id===g.spy?normal.id:g.spy);
 assert.equal(g.phase,'result');assert.equal(g.result.secret,q.spyQuestion);r.players.forEach((p,j)=>assert.equal(p.score-before[j],p.id===g.spy?0:100));const scores=r.players.map(p=>p.score);finish(r);assert.deepEqual(scores,r.players.map(p=>p.score));
 }assert.equal(seen.size,100);assert.throws(()=>start(r,'spy'),/100세트/);
});
test('답변 위조·범위·단위·참가자 검증 및 모든 유형 Bot 자동 행동',()=>{
 const r=createRoom('h'),human=join(r,'사람','🐱','s'),service=createDebugService('development',()=>{}),grant=service.command(r,'h',undefined,{type:'debug:unlock'}).grant!;
 const cmd=(a:any)=>service.command(r,'h',grant,a);cmd({type:'debug:enable',enabled:true});cmd({type:'debug:add',count:6});cmd({type:'debug:config',delay:0});
 for(const type of ['yes_no','player','number','text','balance']){const q=spyQuestions.find(q=>q.answerType===type)!;r.spyUsed=spyQuestions.filter(p=>p.id!==q.id).map(p=>p.id);start(r,'spy');const c=r.round!.spyAnswer!;
 assert.throws(()=>submit(r,human.id,type==='text'?'x'.repeat(81):type==='number'?-1:'위조'));
 if(type==='number')for(const v of [NaN,Infinity,1.5,'1'])assert.throws(()=>validateSpyAnswer(c,v,r.players));
 service.tick(r);assert.equal(Object.keys(r.round!.answers).length,6);submit(r,human.id,spyValue(r));assert.equal(r.round!.phase,'discuss');advance(r);service.tick(r);submit(r,human.id,r.players[1].id);assert.equal(r.round!.phase,'result');
 }cmd({type:'debug:reset'});assert.deepEqual(r.spyUsed,[]);
});
