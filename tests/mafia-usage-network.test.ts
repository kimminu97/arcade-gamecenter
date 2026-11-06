import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io,type Socket} from 'socket.io-client';
test('5인 의사·경호원 4밤 소켓 반복 보호·중복 요청·재접속·비공개',{timeout:60000},async()=>{
 const sockets:Socket[]=[],states=new Map<Socket,any>(),sessions=new Map<string,any>(),players=new Map<string,Socket>();
 const connect=async()=>{const s=io(process.env.TEST_URL!,{forceNew:true,reconnection:false});sockets.push(s);s.on('state',v=>states.set(s,v));await new Promise<void>((r,j)=>{s.once('connect',r);s.once('connect_error',j);});return s;};
 const wait=async(f:()=>boolean)=>{for(let i=0;i<500;i++){if(f())return;await new Promise(r=>setTimeout(r,10));}throw Error('usage socket state timeout');};
 const act=(s:Socket,a:any)=>new Promise<any>((r,j)=>s.timeout(5000).emit('action',a,(e:any,out:any)=>e?j(e):r(out)));
 try{
  const host=await connect(),made=await act(host,{type:'create'});assert.ok(made.ok);
  const joined:Socket[]=[];for(let i=0;i<5;i++){const s=await connect(),r=await act(s,{type:'join',code:made.session.code,name:'반복친구'+i,avatar:'🐱'});assert.ok(r.ok);sessions.set(r.session.id,r.session);joined.push(s);}
  await wait(()=>states.get(host)?.players.length===5);const setup=states.get(host).mafiaSetup;
  assert.ok((await act(host,{type:'mafia:configure',revision:setup.revision,config:{...setup.config,rules:{raidCooldown:false,mafiaChat:true},direct:{mafia:1,doctor:1,bodyguard:1,shieldMaker:1,citizen:1}}})).ok);
  assert.ok((await act(host,{type:'start',mode:'mafia'})).ok);await wait(()=>joined.every(s=>states.get(s)?.round?.mafia));
  for(const s of joined)players.set(states.get(s).round.mafia.ownRole.roleId,s);
  const m=()=>states.get(host).round.mafia,own=(role:string)=>states.get(players.get(role)!).round.mafia;
  const sessionForSocket=new Map<Socket,any>();for(let i=0;i<joined.length;i++)sessionForSocket.set(joined[i],[...sessions.values()][i]);
  const playerId=(role:string)=>sessionForSocket.get(players.get(role)!)!.id;
  const next=async()=>{const v=m().version;assert.ok((await act(host,{type:'mafia:advance',roundId:m().id,version:v})).ok);await wait(()=>m().version!==v);await wait(()=>[...players.values()].every(s=>states.get(s)?.round?.mafia?.version===m().version));};await next();
  for(let night=1;night<=4;night++){
   const target=playerId('citizen'),guard=players.get('bodyguard')!,doctor=players.get('doctor')!;
   assert.equal(own('bodyguard').civicAbility.canSend,true);assert.equal(own('bodyguard').civicAbility.remaining,null);assert.equal(own('doctor').submitted,false);
   const g={type:'mafia:civic',roundId:m().id,nightId:m().nightId,requestId:'socket-guard-'+night,targetId:target};
   assert.equal((await act(guard,{...g,targetId:playerId('bodyguard')})).ok,false);assert.ok((await act(guard,g)).ok);assert.equal((await act(guard,g)).duplicate,true);assert.equal((await act(guard,{...g,requestId:'guard-change-'+night,targetId:playerId('shieldMaker')})).ok,false);
   const d={type:'submit',value:{roundId:m().id,version:m().version,revision:own('doctor').revision,targetId:night%2===0?target:playerId('doctor')}};assert.ok((await act(doctor,d)).ok);assert.equal((await act(doctor,d)).ok,false);
   if(night===1)for(const role of ['doctor','bodyguard']){const old=players.get(role)!,session=sessionForSocket.get(old);old.disconnect();const fresh=await connect();assert.ok((await act(fresh,{type:'resume',...session})).ok);players.set(role,fresh);sessionForSocket.set(fresh,session);await wait(()=>!!states.get(fresh)?.round?.mafia);assert.equal(role==='doctor'?own(role).submitted:own(role).civicAbility.submitted,true);assert.equal(role==='doctor'?own(role).selectedTargetId:own(role).civicAbility.selectedTargetId,role==='doctor'?playerId('doctor'):target);}
   assert.equal(m().civicAbility,undefined);assert.equal(m().ownRole,undefined);assert.equal(m().revealedRoles,undefined);assert.equal(own('citizen').civicAbility,undefined);
   if(night>1)assert.ok((await act(players.get('mafia')!,{type:'mafia:attack',value:{roundId:m().id,nightId:m().nightId,version:m().version,revision:own('mafia').revision,targetId:target}})).ok);
   await next();assert.ok(m().alive.includes(target));assert.equal(m().winner,undefined);for(let i=0;i<3;i++)await next();assert.equal(m().phase,'NIGHT');
  }
 }finally{sockets.forEach(s=>s.disconnect());}
});
