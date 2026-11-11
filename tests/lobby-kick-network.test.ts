import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io,type Socket} from 'socket.io-client';

test('5인 대기실 강퇴 권한, 오프라인 제거 및 재접속 경쟁',{timeout:25000},async()=>{
 const sockets:Socket[]=[];
 const states=new Map<Socket,any>();
 const connect=async()=>{
  const socket=io(process.env.TEST_URL!,{forceNew:true,reconnection:false});
  sockets.push(socket);
  socket.on('state',state=>states.set(socket,state));
  await new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});
  return socket;
 };
 const act=(socket:Socket,action:object)=>socket.timeout(4000).emitWithAck('action',action);
 const wait=async(check:()=>boolean)=>{
  for(let i=0;i<200;i++){
   if(check())return;
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  assert.fail('참가자 목록 갱신 시간 초과');
 };
 try{
  const host=await connect();
  const {session:{code,token:hostToken}}=await act(host,{type:'create'});
  const players=[];
  for(let i=0;i<5;i++){
   const socket=await connect();
   const {session}=await act(socket,{type:'join',code,name:'친구'+i});
   players.push({socket,session});
  }
  const [target,offline,survivor]=players;
  const kick={type:'kick',id:target.session.id};
  const resume={...target.session,type:'resume'};
  await wait(()=>states.get(host)?.players.length===5);
  assert.equal((await act(survivor.socket,kick)).ok,false);
  const outsider=await connect();
  await act(outsider,{type:'create'});
  assert.equal((await act(outsider,{...kick,code})).ok,false);
  assert.equal((await act(host,{...kick,id:hostToken})).ok,false);
  assert.equal((await act(host,{...kick,id:'missing'})).ok,false);

  // Keep the old connection and a new connection in contention for the same token.
  const replacement=await connect();
  const notified:Socket[]=[];
  for(const socket of [target.socket,replacement])socket.on('kicked',()=>notified.push(socket));
  const [restored,removed]=await Promise.all([act(replacement,resume),act(host,kick)]);
  assert.ok(removed.ok,removed.error);
  const evicted=restored.ok?replacement:target.socket;
  await wait(()=>notified.includes(evicted)&&states.get(survivor.socket)?.players.length===4);
  const lastState=states.get(evicted);
  assert.equal((await act(host,kick)).ok,false);
  assert.equal((await act(evicted,resume)).ok,false);
  assert.equal((await act(evicted,{type:'submit',value:1})).ok,false);
  assert.equal((await act(await connect(),resume)).ok,false);
  offline.socket.disconnect();
  await wait(()=>states.get(host)?.players.some((p:any)=>p.id===offline.session.id&&!p.online));
  assert.ok((await act(host,{type:'kick',id:offline.session.id})).ok);
  await wait(()=>states.get(survivor.socket)?.players.length===3);
  assert.equal(states.get(evicted),lastState);
  assert.equal((await act(await connect(),{...offline.session,type:'resume'})).ok,false);

  const fresh=await act(evicted,{type:'join',code,name:'친구0'});
  assert.ok(fresh.ok,fresh.error);
  assert.notEqual(fresh.session.id,target.session.id);
  assert.notEqual(fresh.session.token,target.session.token);
  assert.ok((await act(await connect(),{type:'join',code,name:'친구1'})).ok);
  assert.ok((await act(host,{type:'start',mode:'mafia'})).ok);
  await wait(()=>states.get(host)?.round?.mafia);
  assert.equal(states.get(host).canKick,false);
  assert.equal((await act(host,{type:'kick',id:fresh.session.id})).ok,false);
  survivor.socket.disconnect();
  const rejoined=await act(await connect(),{...survivor.session,type:'resume'});
  assert.equal(rejoined.session.id,survivor.session.id);
  assert.ok((await act(host,{type:'stop'})).ok);
  await wait(()=>states.get(host)?.canKick===true);
  assert.ok((await act(host,{type:'kick',id:fresh.session.id})).ok);
 }finally{
  for(const socket of sockets)socket.disconnect();
 }
});
