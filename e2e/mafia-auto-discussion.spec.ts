import{test,expect,type Page,type BrowserContext}from'@playwright/test';

test('5인 밤 타이머 만료·바로 낮으로 후 자동 토론 및 재접속',async({browser})=>{
 test.setTimeout(90000);const contexts:BrowserContext[]=[],players:Page[]=[];
 const page=async(phone=false)=>{const c=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:768}});contexts.push(c);const p=await c.newPage();p.on('dialog',d=>d.accept());return p;};
 try{
  const h=await page();await h.goto('http://127.0.0.1:3101');await expect(h.getByText('● 실시간 연결',{exact:true})).toBeVisible({timeout:30000});await h.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();const arcade=h.getByTestId('arcade');await expect(arcade).toHaveAttribute('data-role','host');const code=await arcade.getAttribute('data-room-code');
  for(let i=0;i<5;i++){const p=await page(true);players.push(p);await p.goto('http://127.0.0.1:3101/?room='+code);await p.getByPlaceholder('오늘의 게임 닉네임').fill('자동토론'+i);await p.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();await expect(p.getByTestId('arcade')).toHaveAttribute('data-role','player');}
  await h.getByLabel('단계별 제한시간').selectOption('15');await h.locator('.game-select').getByRole('button',{name:'🌙 정보전 마피아',exact:true}).click();await h.locator('.host-controls > .yellow').click();await h.getByRole('button',{name:'확인하고 진행',exact:true}).click();await h.getByRole('button',{name:'첫 번째 밤 시작',exact:true}).click();await expect(arcade).toHaveAttribute('data-phase','NIGHT');
  // No Host command: the real server timer must move every screen to discussion.
  await expect(arcade).toHaveAttribute('data-phase','DAY_DISCUSSION',{timeout:22000});
  for(const p of[h,...players]){await expect(p.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_DISCUSSION');await expect(p.getByTestId('mafia-final-roles')).toHaveCount(0);}
  await expect(h.getByRole('button',{name:'낮 토론 시작',exact:true})).toHaveCount(0);await expect(h.getByRole('button',{name:'처형 투표 시작',exact:true})).toBeVisible();
  for(const p of[h,players[0]]){await p.reload();await expect(p.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_DISCUSSION');await expect(p.getByTestId('mafia-transition')).toHaveCount(0);}
  await h.getByRole('button',{name:'처형 투표 시작',exact:true}).click();await h.getByRole('button',{name:'투표 마감',exact:true}).click();await expect(arcade).toHaveAttribute('data-phase','DAY_RESOLUTION');await h.getByRole('button',{name:'다음 밤 시작',exact:true}).click();await h.getByRole('button',{name:'밤 30초 연장',exact:true}).click();await h.getByRole('button',{name:'바로 낮으로',exact:true}).click();
  for(const p of[h,...players])await expect(p.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_DISCUSSION');await expect(h.getByRole('button',{name:'낮 토론 시작',exact:true})).toHaveCount(0);
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
