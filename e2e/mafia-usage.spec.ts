import {test,expect,type Page,type BrowserContext} from '@playwright/test';
test('5인 의사·경호원 3밤 UI 반복 사용·새로고침·개인 횟수·320/390px',async({browser},info)=>{
 const contexts:BrowserContext[]=[],players:Page[]=[],states=new Map<Page,any>();
 const page=async(phone=false)=>{const c=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:768}});contexts.push(c);const p=await c.newPage();p.on('dialog',d=>d.accept());p.on('websocket',ws=>ws.on('framereceived',({payload})=>{const text=String(payload);if(text.startsWith('42['))try{const[e,s]=JSON.parse(text.slice(2));if(e==='state')states.set(p,s);}catch{}}));return p;};
 try{
  const h=await page();await h.goto('http://127.0.0.1:3101');await expect(h.getByText('● 실시간 연결',{exact:true})).toBeVisible();await h.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-role','host');const code=await h.getByTestId('arcade').getAttribute('data-room-code');
  for(let i=0;i<5;i++){const p=await page(true);players.push(p);await p.goto('http://127.0.0.1:3101/?room='+code);await p.getByPlaceholder('오늘의 게임 닉네임').fill('보호친구'+i);await p.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();await expect(p.getByTestId('arcade')).toHaveAttribute('data-role','player');}
  await h.locator('.game-select').getByRole('button',{name:'🌙 정보전 마피아',exact:true}).click();await h.getByTestId('mafia-recommendations').getByRole('button',{name:'생존·방어 중심',exact:true}).click();await expect(h.getByTestId('mafia-config-advice')).toContainText('협박범이 있지만 기자가 없어');await h.locator('.host-controls > .yellow').click();await h.getByRole('button',{name:'확인하고 진행',exact:true}).click();
  for(const p of players)await expect(p.getByTestId('mafia-own-role')).toBeVisible();const own=(p:Page)=>states.get(p).round.mafia,guard=players.find(p=>own(p).ownRole.roleId==='bodyguard')!,doctor=players.find(p=>own(p).ownRole.roleId==='doctor')!;const target=await players.find(p=>own(p).ownRole.roleId==='shieldMaker')!.getByTestId('arcade').getAttribute('data-player-id');
  const next=async(name:string,phase:string)=>{await h.getByRole('button',{name,exact:true}).click();await expect(h.getByTestId('mafia-board')).toHaveAttribute('data-phase',phase);for(const p of players)await expect(p.getByTestId('mafia-board')).toHaveAttribute('data-phase',phase);};
  await next('첫 번째 밤 시작','NIGHT');
  for(let night=1;night<=3;night++){
   for(const p of [guard,doctor])await expect(p.getByTestId('mafia-role-card')).toContainText('매일 밤 사용 가능 · 한 밤에 1회');
   const civic=guard.getByTestId('mafia-civic');await expect(civic.getByRole('button',{name:'보호 확정',exact:true})).toBeVisible();await civic.getByLabel('시민 능력 대상',{exact:true}).selectOption(target);await civic.getByRole('button',{name:'보호 확정',exact:true}).click();await expect(civic).toContainText('✓ 확정 완료');await expect(civic.getByRole('button',{name:'보호 확정',exact:true})).toHaveCount(0);
   await doctor.getByTestId('mafia-private').locator(`button[data-target-id="${target}"]`).click();await expect.poll(()=>own(doctor).submitted).toBe(true);
   if(night===1)for(const p of [guard,doctor]){await p.reload();await expect(p.getByTestId('mafia-own-role')).toBeVisible();await expect.poll(()=>p===guard?own(p).civicAbility.submitted:own(p).submitted).toBe(true);}
   for(const width of [320,390]){await guard.setViewportSize({width,height:844});await expect(guard.getByTestId('mafia-civic')).toContainText('매일 밤 사용 가능');expect(await guard.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
   if(night===1)await guard.getByTestId('mafia-role-card').screenshot({path:info.outputPath('bodyguard-390.png')});
   await expect(h.getByTestId('mafia-private')).toHaveCount(0);expect(states.get(h).round.mafia.civicAbility).toBeUndefined();expect(states.get(h).round.mafia.revealedRoles).toBeUndefined();
   if(night<3){await next('바로 낮으로','DAY_DISCUSSION');await next('처형 투표 시작','DAY_VOTE');await next('투표 마감','DAY_RESOLUTION');await next('다음 밤 시작','NIGHT');}
  }
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
