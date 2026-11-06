import{test,expect,type BrowserContext,type Page}from'@playwright/test';

// Observe real Web Audio nodes in Chromium; no product debug hooks or speaker needed.
function observeAudio(){
 const w=window as any,Native=w.AudioContext;
 w.audioProbe={contexts:0,loops:0,fx:0,active:0,maxLoops:0,liveLoops:0,gains:[]};
 w.AudioContext=class extends Native{
  constructor(...args:any[]){super(...args);w.audioProbe.contexts++;}
  createGain(){const node=super.createGain();w.audioProbe.gains.push(node.gain);return this.watch(node);}
  watch(node:any){const connect=node.connect.bind(node);node.connect=(target:any,...rest:any[])=>{node.probeTarget=target;if(target===this.destination)node.probeMaster=true;target.probeChildren=(target.probeChildren??0)+1;node.probeOrdinal=target.probeChildren;return connect(target,...rest);};return node;}
  source(node:any){this.watch(node);const start=node.start.bind(node);node.start=(...args:any[])=>{let parent=node.probeTarget;while(parent){if(parent.probeTarget?.probeMaster&&parent.probeOrdinal===2){w.audioProbe.fx++;break;}parent=parent.probeTarget;}w.audioProbe.active++;if(node.loop){w.audioProbe.loops++;w.audioProbe.liveLoops++;w.audioProbe.maxLoops=Math.max(w.audioProbe.maxLoops,w.audioProbe.liveLoops);}let finished=false;const done=()=>{if(finished)return;finished=true;w.audioProbe.active--;if(node.loop)w.audioProbe.liveLoops--;};const disconnect=node.disconnect.bind(node);node.disconnect=(...rest:any[])=>{done();return disconnect(...rest);};node.addEventListener('ended',done,{once:true});return start(...args);};return node;}
  createOscillator(){return this.source(super.createOscillator());}
  createBufferSource(){return this.source(super.createBufferSource());}
 };
}
const probe=(p:Page)=>p.evaluate(()=>{const a=(window as any).audioProbe;return{contexts:a.contexts,loops:a.loops,fx:a.fx,active:a.active,maxLoops:a.maxLoops,volume:a.gains[0]?.value};});
test('5인 Host 전용 오디오: 설정·단계·연장·재접속·종료·탭 중복',async({browser},info)=>{
 test.setTimeout(150000);const contexts:BrowserContext[]=[],players:Page[]=[],states=new Map<Page,any>();
 const page=async(mobile=false)=>{const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768}});contexts.push(c);await c.addInitScript(observeAudio);const p=await c.newPage();p.on('dialog',d=>d.accept());p.on('websocket',ws=>ws.on('framereceived',({payload})=>{const text=String(payload);if(text.startsWith('42['))try{const[e,s]=JSON.parse(text.slice(2));if(e==='state')states.set(p,s);}catch{}}));return p;};
 try{
  const h=await page();await h.goto('http://127.0.0.1:3101');await expect(h.getByText('● 실시간 연결',{exact:true})).toBeVisible({timeout:30000});await h.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-role','host');const code=await h.getByTestId('arcade').getAttribute('data-room-code');
  for(let i=0;i<5;i++){const p=await page(true);players.push(p);await p.goto('http://127.0.0.1:3101/?room='+code);await p.getByPlaceholder('오늘의 게임 닉네임').fill('소리친구'+i);await p.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();await expect(p.getByTestId('arcade')).toHaveAttribute('data-role','player');}
  await h.getByLabel('단계별 제한시간').selectOption('60');await h.locator('.game-select').getByRole('button',{name:'🌙 정보전 마피아',exact:true}).click();
  const control=h.getByTestId('mafia-audio'),enable=async()=>{await control.getByRole('button',{name:'🔇 사운드 켜기',exact:true}).click();await expect(control.getByRole('button',{name:'🔊 사운드 끄기',exact:true})).toHaveAttribute('aria-pressed','true');};await expect(control).toBeVisible();expect((await probe(h)).contexts).toBe(0);await enable();await expect(control.getByRole('button',{name:'🔊 사운드 끄기',exact:true})).toHaveAttribute('aria-pressed','true');expect((await probe(h)).loops).toBe(1);
  // Native lock held by the real Host blocks another tab in the same browser profile.
  const other=await h.context().newPage();await other.goto('http://127.0.0.1:3101');expect(await other.evaluate(async()=>{const module=await import(/* @vite-ignore */ '/src/mafia-audio-lease.ts' as string);const release=await module.acquireAudioOutput(()=>{});release?.();return !!release;})).toBe(false);await other.close();
  await control.locator('summary').click();await control.getByLabel('전체 볼륨',{exact:true}).fill('18');await expect.poll(async()=>(await probe(h)).volume).toBeCloseTo(.18,2);
  await control.getByLabel('BGM',{exact:true}).uncheck();await expect.poll(async()=>(await probe(h)).active).toBe(0);await control.getByLabel('BGM',{exact:true}).check();await expect.poll(async()=>(await probe(h)).loops).toBe(2);
  await control.getByRole('button',{name:'4초 미리 듣기',exact:true}).click();expect((await probe(h)).fx).toBe(4);
  await control.getByLabel('효과음',{exact:true}).uncheck();const mutedFX=(await probe(h)).fx;await control.getByRole('button',{name:'4초 미리 듣기',exact:true}).click();expect((await probe(h)).fx).toBe(mutedFX);await control.getByLabel('효과음',{exact:true}).check();await control.locator('summary').click();
  await control.getByRole('button',{name:'🔊 사운드 끄기',exact:true}).click();await expect.poll(async()=>(await probe(h)).active).toBe(0);await enable();const beforeStart=(await probe(h)).fx;
  await h.locator('.host-controls > .yellow').click();await h.getByRole('button',{name:'확인하고 진행',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','ROLE_REVEAL');await expect.poll(async()=>(await probe(h)).fx).toBe(beforeStart+4);
  for(const p of players){await expect(p.getByTestId('mafia-own-role')).toBeVisible();await expect(p.getByTestId('mafia-audio')).toHaveCount(0);expect((await probe(p)).contexts).toBe(0);}
  await h.getByRole('button',{name:'첫 번째 밤 시작',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','NIGHT');await expect.poll(async()=>(await probe(h)).fx).toBe(beforeStart+7);await expect.poll(async()=>(await probe(h)).loops).toBe(4);const night=await probe(h);const deadline=states.get(h).round.mafia.nightEndsAt;
  await h.getByRole('button',{name:'밤 30초 연장',exact:true}).click();await expect.poll(()=>states.get(h).round.mafia.nightEndsAt).toBe(deadline+30000);expect((await probe(h)).fx).toBe(night.fx);expect((await probe(h)).loops).toBe(night.loops);
  await h.screenshot({path:info.outputPath('audio-host-night.png')});
  await h.reload();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','NIGHT');expect((await probe(h)).contexts).toBe(0);await expect(control.getByRole('button',{name:'🔇 사운드 켜기',exact:true})).toBeVisible();await control.locator('summary').click();await expect(control.getByLabel('전체 볼륨',{exact:true})).toHaveValue('18');await expect(control.getByLabel('BGM',{exact:true})).toBeChecked();await control.locator('summary').click();await enable();expect((await probe(h)).fx).toBe(0);expect((await probe(h)).loops).toBe(1);
  await h.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(async()=>(await probe(h)).active).toBe(0);
  await h.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(control.getByRole('button',{name:'🔇 사운드 켜기',exact:true})).toBeVisible();expect((await probe(h)).fx).toBe(0);await enable();const recoveredLoops=(await probe(h)).loops;
  await h.getByRole('button',{name:'바로 낮으로',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_DISCUSSION');await expect.poll(async()=>(await probe(h)).fx).toBe(3);await expect.poll(async()=>(await probe(h)).loops).toBe(recoveredLoops+1);
  await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_DISCUSSION');expect((await probe(h)).loops).toBe(recoveredLoops+1);expect((await probe(h)).fx).toBe(3);
  await h.getByRole('button',{name:'처형 투표 시작',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_VOTE');await expect.poll(async()=>(await probe(h)).fx).toBe(6);
  const target=players.find(p=>states.get(p).round.mafia.ownRole.roleId==='mafia')!;const id=states.get(target).round.mafia.ids[players.indexOf(target)];
  for(const p of players)await p.locator(`[data-target-id="${id}"]`).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','EXECUTION_PENDING');await expect.poll(async()=>(await probe(h)).fx).toBe(10);
  await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','GAME_END',{timeout:22000});await expect.poll(async()=>(await probe(h)).fx).toBe(18);await expect(h.getByTestId('revealed-role')).toHaveCount(5);await expect.poll(async()=>(await probe(h)).active,{timeout:10000}).toBe(0);expect((await probe(h)).maxLoops).toBe(1);
  for(const p of players){expect((await probe(p)).contexts).toBe(0);await expect(p.getByTestId('mafia-audio')).toHaveCount(0);}await h.screenshot({path:info.outputPath('audio-host-end.png')});
  await h.reload();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','GAME_END');await enable();expect((await probe(h)).fx).toBe(0);expect((await probe(h)).loops).toBe(0);
  await control.getByRole('button',{name:'🔊 사운드 끄기',exact:true}).click();await h.evaluate(()=>{(window as any).AudioContext.prototype.resume=async()=>{throw Error('autoplay blocked');};});await control.getByRole('button',{name:'🔇 사운드 켜기',exact:true}).click();await expect(control.getByRole('status')).toContainText('브라우저 오디오 권한');await expect(control.getByRole('button',{name:'🔇 사운드 켜기',exact:true})).toHaveAttribute('aria-pressed','false');expect((await probe(h)).active).toBe(0);
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
