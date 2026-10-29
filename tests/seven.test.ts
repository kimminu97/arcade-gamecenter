import{test}from'node:test';import assert from'node:assert/strict';import{io,type Socket}from'socket.io-client';
test('7인 방, 초과 입장, 스파이 비밀 격리, 대기, 그림 권한, 최종 시상', {skip:process.env.NETWORK_TEST!=='1'},async()=>{
 const all:Socket[]=[];const states=new Map<Socket,any>();
 const connect=async()=>{const s=io(process.env.TEST_URL||'http://127.0.0.1:3000',{forceNew:true,reconnection:false});all.push(s);s.on('state',v=>states.set(s,v));await new Promise<void>(r=>s.once('connect',r));return s;};
 const act=(s:Socket,a:any)=>new Promise<any>((r,j)=>s.timeout(3000).emit('action',a,(e:any,v:any)=>e?j(e):r(v)));
 const wait=()=>new Promise(r=>setTimeout(r,40));
 try{const h=await connect(),created=await act(h,{type:'create'}),code=created.session.code;const players:{s:Socket;id:string}[]=[];
 for(let i=0;i<7;i++){const s=await connect(),r=await act(s,{type:'join',code,name:`친구${i}`,avatar:'🐱'});assert.ok(r.ok);players.push({s,id:r.session.id});}
 const extra=await connect();assert.equal((await act(extra,{type:'join',code,name:'초과',avatar:'🐶'})).ok,false);
 assert.equal((await act(players[0].s,{type:'roulette'})).ok,false);assert.equal((await act(players[0].s,{type:'events',enabled:true})).ok,false);await act(h,{type:'events',enabled:true});await act(h,{type:'start',mode:'spy'});await wait();const questions=players.map(p=>states.get(p.s).round.situation);assert.equal(new Set(questions).size,2);assert.equal(Math.min(...Object.values(questions.reduce((a:Record<string,number>,q)=>{a[q]=(a[q]||0)+1;return a;},{}))),1);assert.equal(states.get(h).round.word,undefined);assert.equal(states.get(h).round.spy,undefined);
 await act(h,{type:'pause'});assert.equal((await act(players[0].s,{type:'submit',value:'일시정지 중'})).ok,false);await act(h,{type:'pause'});
 for(const p of players)assert.ok((await act(p.s,{type:'submit',value:(()=>{const c=states.get(p.s).round.spyAnswer;return c.type==='player'?states.get(p.s).round.ids[0]:c.type==='number'?1:c.options?.[0]??'먼저 이야기한다';})()})).ok);
 await act(h,{type:'advance'});for(let i=0;i<players.length;i++)assert.ok((await act(players[i].s,{type:'submit',value:players[(i+1)%7].id})).ok);
 await act(h,{type:'start',mode:'draw'});await wait();const drawer=states.get(h).round.drawer;const artist=players.find(p=>p.id===drawer)!;const other=players.find(p=>p.id!==drawer)!;
 assert.ok(states.get(artist.s).round.word);assert.equal(states.get(other.s).round.word,undefined);assert.equal(states.get(h).round.word,undefined);
 const stroke={x:.4,y:.5,px:.3,py:.4,width:5,color:'#17112e'};assert.equal((await act(other.s,{type:'stroke',stroke})).ok,false);assert.ok((await act(artist.s,{type:'stroke',stroke})).ok);assert.ok((await act(artist.s,{type:'clear'})).ok);
 const word=states.get(artist.s).round.word;assert.ok((await act(other.s,{type:'submit',value:word})).ok);assert.equal((await act(other.s,{type:'submit',value:word})).ok,false);
 await act(h,{type:'reveal'});await act(h,{type:'final'});await wait();assert.equal(states.get(other.s).final,true);assert.equal((await act(h,{type:'start',mode:'number'})).ok,false);
 await act(h,{type:'reset'});await wait();assert.equal(states.get(h).final,false);assert.ok(states.get(h).players.every((p:any)=>p.score===0));
 }finally{all.forEach(s=>s.disconnect());}
});
