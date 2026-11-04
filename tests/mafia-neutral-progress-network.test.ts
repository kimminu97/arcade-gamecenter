import {test} from 'node:test';import assert from 'node:assert/strict';import {io,type Socket} from 'socket.io-client';import {randomUUID} from 'node:crypto';
async function setup(n:number,kind:string){
 const sockets:Socket[]=[],players:Socket[]=[],states=new Map<Socket,any>(),sessions=new Map<Socket,any>();
 const connect=async()=>{const s=io(process.env.TEST_URL!,{forceNew:true,reconnection:false});sockets.push(s);s.on('state',v=>states.set(s,v));await new Promise<void>(r=>s.once('connect',r));return s;};
 const act=(s:Socket,a:any)=>new Promise<any>((r,j)=>s.timeout(5000).emit('action',a,(e:any,v:any)=>e?j(e):r(v)));
 const wait=async(f:()=>boolean)=>{for(let i=0;i<2400;i++){if(f())return;await new Promise(r=>setTimeout(r,15));}throw Error('중립 동기화 시간 초과');};
 const h=await connect(),created=await act(h,{type:'create'});sessions.set(h,created.session);
 for(let i=0;i<n;i++){const s=await connect(),out=await act(s,{type:'join',code:created.session.code,name:'누적친구'+i,avatar:'🐱'});players.push(s);sessions.set(s,out.session);}
 await wait(()=>states.get(h)?.players.length===n);const setup=states.get(h).mafiaSetup;
 assert.ok((await act(h,{type:'mafia:configure',revision:setup.revision,config:{...setup.config,direct:{mafia:1,[kind]:1,citizen:n-2}}})).ok);assert.ok((await act(h,{type:'start',mode:'mafia'})).ok);
 await wait(()=>players.every(p=>!!states.get(p)?.round?.mafia));
 const m=()=>states.get(h).round.mafia,own=(s:Socket)=>states.get(s).round.mafia,id=(s:Socket)=>sessions.get(s).id;
 const next=async()=>{const v=m().version,out=await act(h,{type:'mafia:advance',roundId:m().id,version:v});assert.ok(out.ok,out.error);await wait(()=>m().version!==v);if(m().phase==='EXECUTION_PENDING')await wait(()=>m().phase!=='EXECUTION_PENDING');};
 return{h,players,states,sessions,m,own,id,connect,act,wait,next,close:()=>sockets.forEach(s=>s.disconnect())};
}
for(const n of [5,6,7])for(const kind of ['swindler','parasite','gambler'])test(`${n}인 ${kind} 정상 소켓 제출·비밀/위조 차단·2일 누적·재접속·단독 결과`,{skip:process.env.NETWORK_TEST!=='1'},async()=>{
 const x=await setup(n,kind);try{const {h,players,states,sessions,m,own,id,act,wait,next}=x;let owner=players.find(p=>own(p).ownRole.roleId===kind)!;const targets=players.filter(p=>own(p).ownRole.roleId==='citizen').slice(0,2),ownerId=id(owner);
 const privateOnly=()=>{assert.equal(m().neutralAbility,undefined);for(const p of players.filter(p=>p!==owner)){assert.equal(own(p).neutralAbility,undefined);assert.equal(own(p).neutralObjective,undefined);assert.equal(own(p).neutralProgress,undefined);}};privateOnly();
 for(let day=1;day<=2;day++){
  while(m().phase!=='NIGHT')await next();const a={type:'mafia:neutral:action',roundId:m().id,nightId:m().nightId,requestId:randomUUID(),targetId:id(targets[day-1]),...(kind==='swindler'?{guessedRoleId:'citizen'}:{})};
  if(kind!=='gambler'){
   assert.equal((await act(h,{...a,playerId:ownerId})).ok,false);assert.equal((await act(targets[0],{...a,playerId:ownerId})).ok,false);
   if(kind==='swindler'){assert.equal(own(owner).neutralAbility.roleOptions.length,25);assert.ok(own(owner).neutralAbility.roleOptions.some((r:any)=>r.roleId==='bomber'));assert.equal((await act(owner,{...a,guessedRoleId:'revenant'})).ok,false);}
   assert.ok((await act(owner,{...a,correct:true,successes:999})).ok);await wait(()=>own(owner).neutralAbility.remaining===(kind==='swindler'?3:2)-day);assert.equal((await act(owner,a)).duplicate,true);
   assert.equal((await act(owner,{...a,requestId:randomUUID(),targetId:ownerId})).ok,false);
   if(kind==='swindler')assert.equal(own(owner).neutralAbility.guesses.at(-1).correct,undefined);
  }else assert.equal((await act(owner,a)).ok,false);
  const fresh=await x.connect();assert.ok((await act(fresh,{type:'resume',...sessions.get(owner)})).ok);await wait(()=>!!states.get(fresh)?.round?.mafia?.neutralAbility);sessions.set(fresh,sessions.get(owner));players[players.indexOf(owner)]=fresh;owner=fresh;privateOnly();
  await next();if(kind==='swindler'){await wait(()=>own(owner).neutralAbility.successes===day);if(day===2)break;}
  while(m().phase!=='DAY_VOTE')await next();const cast=(p:Socket,t:string)=>act(p,{type:'submit',value:{roundId:m().id,version:m().version,revision:own(p).revision,targetId:t}});
  if(kind==='gambler')assert.ok((await cast(owner,ownerId)).ok);
  if(kind==='swindler'){await next();continue;}
  const target=id(targets[day-1]);for(const p of players.filter(p=>p!==owner&&m().alive.includes(id(p))).slice(0,2))assert.ok((await cast(p,target)).ok);
  assert.equal(own(owner).neutralAbility.successes,day-1);await next();await wait(()=>own(owner).neutralAbility.successes===day);privateOnly();
 }
 await wait(()=>m().phase==='GAME_END');assert.equal(m().winner,'neutral');assert.equal(m().winResult.roleId,kind);assert.deepEqual(m().winnerPlayerIds,[ownerId]);assert.equal(states.get(h).history.length,1);assert.deepEqual(states.get(h).history[0].winnerPlayerIds,[ownerId]);assert.ok(states.get(h).players.every((p:any)=>p.score===0));
 assert.equal((await act(owner,{type:'mafia:neutral:action',roundId:m().id,nightId:m().nightId,requestId:randomUUID(),targetId:id(targets[0]),guessedRoleId:'citizen'})).ok,false);
 const resumed=await x.connect();await act(resumed,{type:'resume',...sessions.get(owner)});await wait(()=>states.get(resumed)?.round?.mafia?.phase==='GAME_END');assert.equal(own(resumed).neutralAbility.successes,2);
 }finally{x.close();}
});
