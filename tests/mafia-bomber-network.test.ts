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

for(const n of [5,6,7])test(`${n}인 폭탄마 실제 소켓: 표식·위조/중복·재접속·처형 단독 승리`,{skip:process.env.NETWORK_TEST!=='1'},async()=>{
 const x=await setup(n,'bomber');try{const {h,players,states,sessions,m,own,id,act,wait,next}=x;let bomber=players.find(p=>own(p).ownRole.roleId==='bomber')!;const ownerId=id(bomber),target=players.find(p=>own(p).ownRole.roleId==='citizen')!;
 await next();const a={type:'mafia:neutral:action',roundId:m().id,nightId:m().nightId,requestId:randomUUID(),targetId:id(target)};
 assert.equal((await act(h,a)).ok,false);assert.equal((await act(target,a)).ok,false);assert.equal((await act(bomber,{...a,targetId:ownerId})).ok,false);assert.ok((await act(bomber,a)).ok);assert.equal((await act(bomber,a)).duplicate,true);assert.equal((await act(bomber,{...a,requestId:randomUUID(),targetId:id(players.find(p=>p!==target&&p!==bomber)!)})).ok,false);
 await wait(()=>own(bomber).neutralAbility.bombMark?.targetId===id(target));for(const p of [h,...players.filter(p=>p!==bomber)]){assert.equal(own(p).neutralAbility,undefined);assert.equal(own(p).neutralProgress,undefined);assert.equal(own(p).neutralObjective,undefined);}
 const saved=sessions.get(bomber);bomber.disconnect();bomber=await x.connect();assert.ok((await act(bomber,{type:'resume',...saved})).ok);await wait(()=>states.get(bomber)?.round?.mafia?.neutralAbility?.bombMark?.targetId===id(target));
 while(m().phase!=='DAY_VOTE')await next();for(const p of players.map(p=>id(p)===ownerId?bomber:p)){const v=own(p);assert.ok((await act(p,{type:'submit',value:{roundId:m().id,version:v.version,revision:v.revision,targetId:ownerId}})).ok);}
 await wait(()=>m().phase==='GAME_END');assert.equal(m().winner,'neutral');assert.deepEqual(m().winnerPlayerIds,[ownerId]);assert.equal(m().winResult.roleId,'bomber');assert.equal(states.get(h).history.length,1);assert.ok(states.get(h).players.every((p:any)=>p.score===0));
 }finally{x.close();}
});
