import {test,expect,type BrowserContext,type Page} from '@playwright/test';
test.setTimeout(240000);
for(const [kind,label,n] of [['swindler','사기꾼',5],['parasite','기생충',6],['gambler','도박사',7]] as const)test(`${n}인 ${label} 모바일 능력·두 낮 누적·비밀·새로고침·단독 승리`,async({browser},info)=>{
 const contexts:BrowserContext[]=[],players:Page[]=[],states=new Map<Page,any>();
 const page=async(phone=false)=>{const c=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:768}});contexts.push(c);const p=await c.newPage();p.on('dialog',d=>d.accept());p.on('websocket',ws=>ws.on('framereceived',({payload})=>{const raw=String(payload);if(raw.startsWith('42['))try{const[e,s]=JSON.parse(raw.slice(2));if(e==='state')states.set(p,s);}catch{}}));return p;};
 try{
 const h=await page();await h.goto('http://127.0.0.1:3101');await expect(h.getByText('● 실시간 연결',{exact:true})).toBeVisible({timeout:30000});await h.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-role','host');await expect(h.getByTestId('arcade')).toHaveAttribute('data-room-code',/^[0-9A-F]{6}$/);const code=await h.getByTestId('arcade').getAttribute('data-room-code');
 for(let i=0;i<n;i++){const p=await page(true);players.push(p);await p.goto('http://127.0.0.1:3101/?room='+code);await p.getByPlaceholder('오늘의 게임 닉네임').fill('누적친구'+i);await p.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();await expect(p.getByTestId('arcade')).toHaveAttribute('data-role','player');}
 await h.locator('.game-select').getByRole('button',{name:'🌙 정보전 마피아',exact:true}).click();
 const change=async(name:string,key:string,delta:number)=>{const before=states.get(h).mafiaSetup.config.direct[key]||0;await h.getByRole('button',{name:name+(delta>0?' 추가':' 제거'),exact:true}).click();await expect.poll(()=>states.get(h).mafiaSetup.config.direct[key]||0).toBe(before+delta);};
 await change('경찰','police',-1);await change('의사','doctor',-1);if(n>5)await change('일반 마피아','mafia',-1);await change(label,kind,1);
 while(Object.values(states.get(h).mafiaSetup.config.direct).reduce((a:number,b:any)=>a+b,0)<n)await change('일반 시민','citizen',1);
 await h.locator('.host-controls > .yellow').click();await h.getByRole('button',{name:'확인하고 진행',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','ROLE_REVEAL');for(const p of players)await expect(p.getByTestId('mafia-own-role')).toBeVisible();
 const m=()=>states.get(h).round.mafia,own=(p:Page)=>states.get(p).round.mafia,id=(p:Page)=>m().ids[players.indexOf(p)],neutral=players.find(p=>own(p).ownRole.roleId===kind)!,targets=players.filter(p=>own(p).ownRole.roleId==='citizen').slice(0,2),targetIds=targets.map(id);
 const privacy=async()=>{for(const p of [h,...players.filter(p=>p!==neutral)]){await expect(p.getByTestId('mafia-neutral-ability')).toHaveCount(0);expect(own(p).neutralAbility).toBeUndefined();expect(own(p).neutralObjective).toBeUndefined();expect(own(p).neutralProgress).toBeUndefined();}};
 await privacy();await h.reload();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','ROLE_REVEAL');await h.getByRole('button',{name:'첫 번째 밤 시작',exact:true}).click();
 for(let day=1;day<=2;day++){
  await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','NIGHT');await expect(neutral.getByTestId('mafia-neutral-ability')).toBeVisible();
  if(kind!=='gambler'){
   await neutral.getByLabel('중립 능력 대상',{exact:true}).selectOption(targetIds[day-1]);
   if(kind==='swindler'){const select=neutral.getByLabel('추측 직업',{exact:true});await expect(select.locator('option')).toHaveCount(27);expect(own(neutral).neutralAbility.roleOptions).toHaveLength(26);expect(own(neutral).neutralAbility.roleOptions.some((r:any)=>r.roleId==='bomber')).toBe(true);await select.selectOption('citizen');}
   if(day===1)await neutral.getByTestId('mafia-neutral-ability').screenshot({path:info.outputPath(kind+'-phone.png')});
   await neutral.getByRole('button',{name:kind==='swindler'?'추측 확정':'표식 확정',exact:true}).click();await expect.poll(()=>own(neutral).neutralAbility.remaining).toBe((kind==='swindler'?3:2)-day);await expect(neutral.getByLabel('중립 능력 대상',{exact:true})).toHaveCount(0);if(kind==='swindler')expect(own(neutral).neutralAbility.guesses.at(-1).correct).toBeUndefined();
  }
  await neutral.reload();await expect(neutral.getByTestId('mafia-neutral-ability')).toBeVisible();await privacy();
  await h.getByRole('button',{name:'바로 낮으로',exact:true}).click();
  if(kind==='swindler'&&day===2)break;
  await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_ANNOUNCEMENT');await h.getByRole('button',{name:'낮 토론 시작',exact:true}).click();await h.getByRole('button',{name:'처형 투표 시작',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_VOTE');
  const choose=async(p:Page,targetId:string)=>{await p.locator(`[data-target-id="${targetId}"]`).click();await expect.poll(()=>own(p).submitted).toBe(true);};
  if(kind==='gambler')await choose(neutral,id(neutral));
  if(kind!=='swindler')for(const p of players.filter(p=>p!==neutral&&m().alive.includes(id(p))).slice(0,2))await choose(p,targetIds[day-1]);
  await h.getByRole('button',{name:'투표 마감',exact:true}).click();if(kind!=='swindler'){await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','EXECUTION_PENDING');expect(own(neutral).neutralAbility.successes).toBe(day-1);}
  await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase',day===2?'GAME_END':'DAY_RESOLUTION',{timeout:20000});
  if(day===1)await h.getByRole('button',{name:'다음 밤 시작',exact:true}).click();
 }
 await expect(h.getByTestId('mafia-winner')).toHaveText('🎭 중립 단독 승리!',{timeout:20000});await expect(h.getByTestId('neutral-winner')).toContainText(label);await expect(neutral.getByTestId('neutral-progress')).toContainText('2 / 2');expect(m().winnerPlayerIds).toEqual([id(neutral)]);expect(states.get(h).history).toHaveLength(1);expect(states.get(h).players.every((p:any)=>p.score===0)).toBe(true);await neutral.reload();await expect(neutral.getByTestId('neutral-status')).toContainText('단독 승리');await privacy();await h.getByTestId('neutral-winner').screenshot({path:info.outputPath(kind+'-win.png')});await h.reload();await expect(h.getByTestId('neutral-winner')).toContainText(label);expect(states.get(h).history).toHaveLength(1);
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
