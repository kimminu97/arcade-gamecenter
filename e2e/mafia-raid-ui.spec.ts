import {test,expect,type Page,type BrowserContext} from '@playwright/test';

for(const chatEnabled of [true,false])test(`5인 습격 투표 UI · 채팅 ${chatEnabled?'ON':'OFF'} · 익명·권한·합의·모바일`,async({browser},info)=>{
 const contexts:BrowserContext[]=[],players:Page[]=[],states=new Map<Page,any>();
 const page=async(phone=false)=>{
  const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:768}});contexts.push(context);
  const p=await context.newPage();p.on('dialog',d=>d.accept());
  p.on('websocket',ws=>ws.on('framereceived',({payload})=>{const raw=String(payload);if(raw.startsWith('42[')){try{const[event,state]=JSON.parse(raw.slice(2));if(event==='state')states.set(p,state);}catch{}}}));
  return p;
 };
 const open=async(p:Page)=>{await p.locator('.mafia-team-launch > button').click();await expect(p.getByTestId('mafia-team-panel')).toBeVisible();};
 const close=async(p:Page)=>{await p.getByTestId('mafia-team-panel').locator('.mafia-overlay-header button').click();};
 try{
  const h=await page();await h.goto('http://127.0.0.1:3101');await expect(h.getByText('● 실시간 연결',{exact:true})).toBeVisible();
  await h.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-room-code',/^[0-9A-F]{6}$/);
  const code=await h.getByTestId('arcade').getAttribute('data-room-code');
  for(let i=0;i<5;i++){const p=await page(true);players.push(p);await p.goto('http://127.0.0.1:3101/?room='+code);await expect(p.getByText('● 실시간 연결',{exact:true})).toBeVisible();await p.getByPlaceholder('오늘의 게임 닉네임').fill('습격친구'+i);await p.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();await expect(p.getByTestId('arcade')).toHaveAttribute('data-role','player');}
  await h.locator('.game-select').getByRole('button',{name:'🌙 정보전 마피아',exact:true}).click();
  for(const role of ['경찰','의사',...(chatEnabled?['일반 시민']:[])])await h.getByRole('button',{name:role+' 제거',exact:true}).click();
  for(const role of ['일반 마피아','광대',...(chatEnabled?['흉내쟁이']:[])])await h.getByRole('button',{name:role+' 추가',exact:true}).click();
  await h.getByLabel('마피아 비밀 채팅',{exact:true}).selectOption(chatEnabled?'on':'off');
  await h.locator('.host-controls > .yellow').click();await h.getByRole('button',{name:'확인하고 진행',exact:true}).click();
  for(const p of players)await expect(p.getByTestId('mafia-own-role')).toBeVisible();
  const own=(p:Page)=>states.get(p).round.mafia,mafia=players.filter(p=>own(p).ownRole.team==='mafia'),id=(p:Page)=>p.getByTestId('arcade').getAttribute('data-player-id');
  const next=async(label:string,phase:string)=>{await h.getByRole('button',{name:label,exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase',phase);};
  await next('첫 번째 밤 시작','NIGHT');
  for(const p of [h,...players.filter(p=>own(p).ownRole.team!=='mafia')]){await expect(p.locator('.mafia-team-launch')).toHaveCount(0);expect(own(p).attack).toBeUndefined();expect(own(p).chat).toBeUndefined();}
  const p=mafia[0],panel=p.getByTestId('mafia-team-panel'),raid=p.getByTestId('mafia-attack'),title=chatEnabled?'마피아 습격 투표 · 채팅방':'마피아 습격 투표';
  await open(p);await panel.screenshot({path:info.outputPath('first-night.png')});
  await expect(panel.getByRole('heading',{level:2})).toHaveText(title);await expect(panel).toHaveAttribute('aria-label',title);
  await expect(raid.getByRole('heading')).toHaveText('🌙 습격 대상 투표');await expect(raid).toContainText('첫째 밤에는 습격할 수 없습니다');await expect(raid.locator('button:enabled')).toHaveCount(0);
  const visibleTargets=async()=>{const buttons=raid.locator('[data-attack-target-id]');await expect(buttons).toHaveCount(5);const boxes=await buttons.evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{top:b.top,bottom:b.bottom,height:b.height,width:b.width};}));const height=p.viewportSize()!.height;expect(boxes.every(b=>b.top>=0&&b.bottom<=height-12&&b.height>=44&&b.width>=44)).toBe(true);expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);};
  await visibleTargets();await p.setViewportSize({width:320,height:640});await visibleTargets();await panel.screenshot({path:info.outputPath('compact-phone.png')});await p.setViewportSize({width:390,height:844});
  if(chatEnabled){expect(await raid.evaluate(el=>!!(el.compareDocumentPosition(el.parentElement!.querySelector('[data-testid="mafia-chat"]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);await expect(p.getByTestId('mafia-chat')).toBeVisible();}
  else await expect(p.getByTestId('mafia-chat')).toHaveCount(0);
  await close(p);
  if(chatEnabled){const mimic=players.find(p=>own(p).ownRole.roleId==='mimic')!;await mimic.getByRole('button',{name:'마피아 채팅 잠입',exact:true}).click();await open(mimic);await expect(mimic.getByTestId('mafia-team-panel').getByRole('heading',{level:2})).toHaveText('마피아 비밀 채팅');await expect(mimic.getByTestId('mafia-attack')).toHaveCount(0);await close(mimic);}
  await next('바로 낮으로','DAY_ANNOUNCEMENT');
  if(chatEnabled){await open(p);await expect(panel.getByRole('heading',{level:2})).toHaveText('마피아 비밀 채팅');await close(p);}else await expect(p.locator('.mafia-team-launch')).toHaveCount(0);
  for(const [label,phase] of [['낮 토론 시작','DAY_DISCUSSION'],['처형 투표 시작','DAY_VOTE'],['투표 마감','DAY_RESOLUTION'],['다음 밤 시작','NIGHT']])await next(label,phase);
  await expect.poll(()=>own(p).attack?.available).toBe(true);await open(p);await visibleTargets();await panel.screenshot({path:info.outputPath('raid-ready.png')});
  const target=await id(p);await raid.locator(`[data-attack-target-id="${target}"]`).click();await expect(raid.locator(`[data-attack-target-id="${target}"]`)).toHaveAttribute('aria-pressed','true');expect(own(p).attack.locked).toBe(false);
  await open(mafia[1]);await mafia[1].locator(`[data-attack-target-id="${await id(mafia[1])}"]`).click();await expect.poll(()=>own(mafia[1]).selectedTargetId).toBe(await id(mafia[1]));expect(own(mafia[1]).attack.locked).toBe(false);
  await mafia[1].locator(`[data-attack-target-id="${target}"]`).click();await expect.poll(()=>own(p).attack.locked).toBe(true);
  for(const actor of mafia){await expect(actor.getByTestId('mafia-attack')).toContainText('공동 공격 확정');await expect(actor.getByTestId('mafia-attack').locator('button:enabled')).toHaveCount(0);expect(own(actor).teammateIds).toBeUndefined();expect(own(actor).attack.selections).toBeUndefined();}
  await panel.screenshot({path:info.outputPath('raid-locked.png')});
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
