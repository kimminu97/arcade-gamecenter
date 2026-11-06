import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io,type Socket} from 'socket.io-client';
import {randomUUID} from 'node:crypto';
for(const [n,outcome] of [[5,'correct'],[6,'wrong'],[7,'timeout']] as const)test(`${n}인 복수귀 소켓: 실제15초·${outcome}·사망 권한·재접속·비밀`,{skip:process.env.NETWORK_TEST!=='1',timeout:100000},async()=>{
 const sockets:Socket[]=[],players:Socket[]=[],states=new Map<Socket,any>(),sessions=new Map<Socket,any>();
 const connect=async()=>{const s=io(process.env.TEST_URL!,{forceNew:true,reconnection:false});sockets.push(s);s.on('state',v=>states.set(s,v));await new Promise<void>(r=>s.once('connect',r));return s;};
 const act=(s:Socket,a:any)=>new Promise<any>((r,j)=>s.timeout(5000).emit('action',a,(e:any,v:any)=>e?j(e):r(v)));
 const wait=async(f:()=>boolean)=>{const end=Date.now()+40000;while(Date.now()<end){if(f())return;await new Promise(r=>setTimeout(r,20));}throw Error('복수귀 상태 동기화 시간 초과');};
 try{
 const h=await connect(),created=await act(h,{type:'create'});for(let i=0;i<n;i++){const s=await connect(),joined=await act(s,{type:'join',code:created.session.code,name:'복수친구'+i,avatar:'🐱'});assert.ok(joined.ok);players.push(s);sessions.set(s,joined.session);}
 await wait(()=>states.get(h)?.players.length===n);const setup=states.get(h).mafiaSetup;
 assert.ok((await act(h,{type:'mafia:configure',revision:setup.revision,config:{...setup.config,direct:{mafia:1,revenant:1,citizen:n-2}}})).ok);assert.ok((await act(h,{type:'start',mode:'mafia'})).ok);
 await wait(()=>players.every(s=>states.get(s)?.round?.mafia));const m=()=>states.get(h).round.mafia,own=(s:Socket)=>states.get(s).round.mafia,id=(s:Socket)=>sessions.get(s).id;
 let revenant=players.find(s=>own(s).ownRole.roleId==='revenant')!;const oid=id(revenant),mafia=players.find(s=>own(s).ownRole.team==='mafia')!,civ=players.find(s=>own(s).ownRole.roleId==='citizen')!,abstain=players.find(s=>s!==revenant&&s!==mafia&&s!==civ)!;
 const next=async()=>{const version=m().version,out=await act(h,{type:'mafia:advance',roundId:m().id,version});assert.ok(out.ok,out.error);await wait(()=>m().version!==version);};
 const assigned=Object.fromEntries(players.map(s=>[id(s),own(s).ownRole])),privateMarker='private-final-reveal-'+randomUUID();await next();assert.ok((await act(mafia,{type:'mafia:chat',roundId:m().id,chatId:m().id,messageId:randomUUID(),text:privateMarker})).ok);
 while(m().phase!=='DAY_VOTE')await next();
 for(const s of players.filter(s=>s!==abstain)){const v=own(s);assert.ok((await act(s,{type:'submit',value:{roundId:m().id,version:v.version,revision:v.revision,targetId:oid}})).ok);}
 await next();assert.equal(m().phase,'EXECUTION_PENDING');await wait(()=>m().phase==='REVENGE_PENDING');await wait(()=>own(revenant).revenge?.status==='pending');
 assert.ok(!m().alive.includes(oid));assert.equal(m().winner,undefined);const x=own(revenant).revenge;
 assert.deepEqual([...x.candidates].sort(),players.filter(s=>s!==revenant&&s!==abstain).map(id).sort());
 for(const s of [h,...players.filter(s=>s!==revenant)]){assert.equal(own(s).revealedRoles,undefined);assert.equal(own(s).revenge,undefined);assert.equal(own(s).voteRecords,undefined);assert.ok(!JSON.stringify(states.get(s)).includes('candidates'));}
 const action={type:'mafia:revenge',roundId:m().id,executionId:x.executionId,requestId:randomUUID(),targetId:id(mafia)};
 for(const s of [h,civ,mafia])assert.equal((await act(s,action)).ok,false);
 assert.equal((await act(revenant,{...action,targetId:oid})).ok,false);assert.equal((await act(revenant,{...action,targetId:id(abstain)})).ok,false);
 assert.equal((await act(revenant,{...action,playerId:oid})).ok,false);assert.equal((await act(h,{type:'mafia:advance',roundId:m().id,version:m().version})).ok,false);
 assert.equal((await act(revenant,{type:'submit',value:{roundId:m().id,version:m().version,revision:0,targetId:id(mafia)}})).ok,false);
 assert.equal((await act(revenant,{type:'mafia:report',roundId:m().id,nightId:m().nightId,requestId:randomUUID(),text:'dead'})).ok,false);
 const saved=sessions.get(revenant),old=revenant;old.disconnect();revenant=await connect();sessions.set(revenant,saved);assert.ok((await act(revenant,{type:'resume',...saved})).ok);await wait(()=>states.get(revenant)?.round?.mafia?.revenge?.status==='pending');
 assert.equal(own(revenant).revealedRoles,undefined);assert.equal(own(revenant).revenge.endsAt,x.endsAt);assert.deepEqual(own(revenant).revenge.candidates,x.candidates);assert.ok(!own(revenant).alive.includes(oid));
 const final={...action,targetId:outcome==='wrong'?id(civ):id(mafia)};
 if(outcome!=='timeout')assert.ok((await act(revenant,final)).ok);await wait(()=>m().phase!=='REVENGE_PENDING');
 if(outcome==='correct'){assert.equal(m().winner,'neutral');assert.deepEqual(m().winnerPlayerIds,[oid]);assert.equal(m().winResult.roleId,'revenant');assert.equal(states.get(h).history.length,1);for(const peer of[h,...players.filter(s=>s!==old),revenant]){await wait(()=>own(peer).phase==='GAME_END');assert.deepEqual(own(peer).revealedRoles,assigned);assert.equal(own(peer).chat,undefined);assert.ok(!JSON.stringify(states.get(peer)).includes(privateMarker));}assert.deepEqual(states.get(h).history[0].roles,assigned);}else{assert.equal(m().phase,'DAY_RESOLUTION');assert.equal(m().winner,undefined);assert.equal(states.get(h).history.length,0);}
 assert.equal((await act(revenant,final)).ok,false);assert.ok(states.get(h).players.every((p:any)=>p.score===0));assert.equal(m().events.filter((e:any)=>e.deaths.includes(oid)).length,1);if(outcome==='correct')for(const session of[saved,created.session]){const fresh=await connect();assert.ok((await act(fresh,{type:'resume',...session})).ok);await wait(()=>states.get(fresh)?.round?.mafia?.phase==='GAME_END');assert.deepEqual(own(fresh).revealedRoles,assigned);assert.ok(!JSON.stringify(states.get(fresh)).includes(privateMarker));}
 }finally{sockets.forEach(s=>s.disconnect());}
});
