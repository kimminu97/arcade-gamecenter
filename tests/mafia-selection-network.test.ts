import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io,type Socket} from 'socket.io-client';
import {spawn} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer,type AddressInfo} from 'node:net';
test('5인 필수/랜덤 설정·서버 검증·프리셋·Host/참가자 재접속·비밀 배정',{timeout:60000},async()=>{
 // Presets are database-wide, so isolate this save/load test from parallel suites.
 const probe=createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const port=(probe.address()as AddressInfo).port;await new Promise<void>((r,j)=>probe.close(e=>e?j(e):r()));
 const data=mkdtempSync(join(tmpdir(),'selection-network-')),base='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,NODE_ENV:'production',PORT:String(port),CHAT_DATA_DIR:data,QUESTION_DATA_DIR:data,MAFIA_DATA_DIR:data,PUBLIC_URL:''},stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',v=>log+=v);server.stderr.on('data',v=>log+=v);
 const sockets:Socket[]=[],states=new Map<Socket,any>(),players:Socket[]=[],sessions=new Map<Socket,any>();
 const connect=async()=>{const s=io(base,{forceNew:true,reconnection:false});sockets.push(s);s.on('state',v=>states.set(s,v));await new Promise<void>((r,j)=>{s.once('connect',r);s.once('connect_error',j);});return s;};
 const act=(s:Socket,a:any)=>new Promise<any>((r,j)=>s.timeout(5000).emit('action',a,(e:any,out:any)=>e?j(e):r(out)));
 const wait=async(f:()=>boolean)=>{for(let i=0;i<500;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('selection socket state timeout');};
 try{
  let ready=false;for(let i=0;i<150;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,log);
  let h=await connect();const made=await act(h,{type:'create'});for(let i=0;i<5;i++){const s=await connect(),r=await act(s,{type:'join',code:made.session.code,name:'필수친구'+i,avatar:'🐱'});assert.ok(r.ok);players.push(s);sessions.set(s,r.session);}await wait(()=>states.get(h)?.players.length===5);
  const setup=()=>states.get(h).mafiaSetup,before=(await act(h,{type:'mafia:preset:list'})).items;
  const config={...setup().config,version:2,mode:'teamRandom',teams:{mafia:2,citizen:3,neutral:0},required:{mafia:['mafia','fakeReporter'],citizen:['journalist'],neutral:[]},candidates:{mafia:[],citizen:['police','doctor','bodyguard','shieldMaker','voteAppraiser'],neutral:[]}};
  assert.equal((await act(players[0],{type:'mafia:configure',revision:setup().revision,config})).ok,false);
  const configure=async(config:any)=>{const v=setup().revision,out=await act(h,{type:'mafia:configure',revision:v,config});assert.ok(out.ok,out.error);await wait(()=>setup().revision!==v);};
  for(const required of [{...config.required,citizen:['journalist','police','doctor','bodyguard']},{...config.required,citizen:['missing']}]){await configure({...config,required});assert.equal(setup().validation.valid,false);assert.equal((await act(h,{type:'start',mode:'mafia'})).ok,false);}
  await configure(config);assert.equal(setup().validation.valid,true);assert.deepEqual((await act(h,{type:'mafia:preset:list'})).items,before);
  const saved=await act(h,{type:'mafia:preset:save',name:'필수 랜덤 테스트',revision:setup().revision});assert.ok(saved.ok);await wait(()=>setup().presetId===saved.item.id);assert.equal(saved.item.version,2);const expected=structuredClone(setup().config);
  await configure({...config,required:{...config.required,citizen:[]}});assert.ok((await act(h,{type:'mafia:preset:load',id:saved.item.id,revision:setup().revision})).ok);await wait(()=>setup().config.required.citizen.includes('journalist'));assert.deepEqual(setup().config,expected);
  h.disconnect();h=await connect();assert.ok((await act(h,{type:'resume',...made.session})).ok);await wait(()=>!!states.get(h)?.mafiaSetup);assert.deepEqual(setup().config,expected);
  assert.ok((await act(h,{type:'start',mode:'mafia',mafiaSetupRevision:setup().revision,mafiaRosterKey:setup().rosterKey,requestId:'selection-start-01'})).ok);await wait(()=>players.every(s=>states.get(s)?.round?.mafia));
  const roles=players.map(s=>states.get(s).round.mafia.ownRole);assert.equal(roles.filter(r=>r.roleId==='journalist').length,1);assert.equal(new Set(roles.map(r=>r.roleId)).size,5);assert.equal(roles.filter(r=>r.team==='mafia').length,2);assert.equal(roles.filter(r=>r.team==='town').length,3);
  for(const s of [h,...players]){const r=states.get(s);assert.equal(r.mafiaSetup,undefined);assert.equal(r.round.mafia.revealedRoles,undefined);assert.equal(r.round.mafia.teammateIds,undefined);assert.equal(r.round.mafia.selectedSlots,undefined);}assert.equal(states.get(h).round.mafia.ownRole,undefined);
  const p=players[0],role=states.get(p).round.mafia.ownRole;p.disconnect();const fresh=await connect();assert.ok((await act(fresh,{type:'resume',...sessions.get(p)})).ok);await wait(()=>!!states.get(fresh)?.round?.mafia);assert.deepEqual(states.get(fresh).round.mafia.ownRole,role);
  const after=(await act(h,{type:'mafia:preset:list'})).items;for(const item of before)assert.deepEqual(after.find((p:any)=>p.id===item.id),item);
 }finally{sockets.forEach(s=>s.disconnect());server.kill();}
});
