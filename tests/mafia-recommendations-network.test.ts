import{test}from'node:test';import assert from'node:assert/strict';import{io,type Socket}from'socket.io-client';
import{mafiaRecommendations,recommendationConfig}from'../src/mafia-recommendations';
test('5인 추천 구성 소켓: 세 조합·프리셋 보존·권한·비공개·2마피아 실제 승리',{skip:process.env.NETWORK_TEST!=='1',timeout:90000},async()=>{
 const sockets:Socket[]=[],players:{socket:Socket;id:string}[]=[],states=new Map<Socket,any>();
 const connect=async()=>{const s=io(process.env.TEST_URL!,{forceNew:true,reconnection:false});sockets.push(s);s.on('state',v=>states.set(s,v));await new Promise<void>(r=>s.once('connect',r));return s;};
 const act=(s:Socket,a:any)=>new Promise<any>((r,j)=>s.timeout(5000).emit('action',a,(e:any,out:any)=>e?j(e):r(out)));
 const wait=async(f:()=>boolean)=>{for(let i=0;i<2500;i++){if(f())return;await new Promise(r=>setTimeout(r,15));}throw Error('추천 조합 상태 대기 초과');};
 try{
  const h=await connect(),made=await act(h,{type:'create'});for(let i=0;i<5;i++){const s=await connect(),joined=await act(s,{type:'join',code:made.session.code,name:'추천친구'+i,avatar:'🐱'});assert.ok(joined.ok);players.push({socket:s,id:joined.session.id});}
  const setup=()=>states.get(h).mafiaSetup;await wait(()=>setup()?.validation.playerCount===5);const original=await act(h,{type:'mafia:preset:save',name:'변경하면 안 되는 테스트 프리셋',revision:setup().revision});assert.ok(original.ok);const before=(await act(h,{type:'mafia:preset:list'})).items;
  for(const rec of mafiaRecommendations){
   const s=setup(),cfg=recommendationConfig(s.config,rec);assert.equal((await act(players[0].socket,{type:'mafia:configure',config:cfg,revision:s.revision})).ok,false);const configured=await act(h,{type:'mafia:configure',config:cfg,revision:s.revision});assert.ok(configured.ok,configured.error);await wait(()=>setup().revision!==s.revision);assert.equal(setup().validation.valid,true);assert.deepEqual(setup().validation.totals,{mafia:2,citizen:3,neutral:0});assert.deepEqual((await act(h,{type:'mafia:preset:list'})).items,before);
   assert.ok((await act(h,{type:'start',mode:'mafia',mafiaSetupRevision:setup().revision,mafiaRosterKey:setup().rosterKey,requestId:'recommend-'+rec.id})).ok);await wait(()=>players.every(p=>states.get(p.socket)?.round?.mafia));const m=()=>states.get(h).round.mafia,own=(p:typeof players[number])=>states.get(p.socket).round.mafia;
   assert.deepEqual(players.map(p=>own(p).ownRole.roleId).sort(),[...rec.mafia,...rec.town].sort());assert.equal(players.filter(p=>own(p).ownRole.team==='mafia').length,2);assert.equal(m().ownRole,undefined);assert.equal(m().roleById,undefined);assert.equal(m().revealedRoles,undefined);for(const p of players){assert.equal(own(p).teammateIds,undefined);assert.equal(own(p).revealedRoles,undefined);}
   const next=async()=>{const v=m().version,out=await act(h,{type:'mafia:advance',roundId:m().id,version:v});assert.ok(out.ok,out.error);await wait(()=>m().version!==v);};
   if(rec.id==='deduction'){
    const maf=players.filter(p=>own(p).ownRole.team==='mafia'),police=players.find(p=>own(p).ownRole.roleId==='police')!,citizen=players.find(p=>own(p).ownRole.roleId==='citizen')!;
    await next();for(const p of maf)assert.equal(own(p).attack.reason,'firstNight');await next();await next();await next();for(const p of players){const v=own(p);assert.ok((await act(p.socket,{type:'submit',value:{roundId:m().id,version:v.version,revision:v.revision,targetId:police.id}})).ok);}await wait(()=>m().phase==='EXECUTION_PENDING');await wait(()=>m().phase==='DAY_RESOLUTION');assert.equal(m().alive.length,4);assert.equal(m().winner,undefined);for(const p of[h,...players.map(x=>x.socket)])assert.equal(states.get(p).round.mafia.revealedRoles,undefined);
    await next();for(const p of maf){const v=own(p);assert.ok((await act(p.socket,{type:'mafia:attack',value:{roundId:m().id,nightId:m().nightId,version:v.version,revision:v.revision,targetId:citizen.id}})).ok);}await next();assert.equal(m().phase,'GAME_END');assert.equal(m().winner,'mafia');assert.equal(m().alive.length,3);assert.equal(Object.keys(m().revealedRoles).length,5);assert.equal(states.get(h).history.length,1);assert.ok((await act(h,{type:'mafia:close',roundId:m().id,version:m().version})).ok);
   }else assert.ok((await act(h,{type:'stop'})).ok);
   await wait(()=>!!setup());assert.deepEqual((await act(h,{type:'mafia:preset:list'})).items,before);
  }
  const bad={...setup().config,teams:{mafia:2,citizen:1,neutral:2},required:{mafia:['mafia','fakeReporter'],citizen:['citizen'],neutral:['jester','prophet']},candidates:{mafia:[],citizen:[],neutral:[]}},v=setup().revision;assert.ok((await act(h,{type:'mafia:configure',config:bad,revision:v})).ok);await wait(()=>setup().revision!==v);assert.ok(setup().validation.errors.some((e:string)=>e.includes('중립은 최대 1명')));assert.equal((await act(h,{type:'start',mode:'mafia'})).ok,false);
  const loadRevision=setup().revision;assert.ok((await act(h,{type:'mafia:preset:load',id:original.item.id,revision:loadRevision})).ok);await wait(()=>setup().revision!==loadRevision);assert.deepEqual(setup().config,original.item.config);
 }finally{sockets.forEach(s=>s.disconnect());}
});
