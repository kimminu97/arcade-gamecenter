import {test,expect,type BrowserContext,type Page} from '@playwright/test';
test.setTimeout(240000);
for(const [kind,label,n] of [['bomber','폭탄마',5]] as const)test(`${n}인 ${label} 모바일 표식·실제 투표·비밀·새로고침·단독 승리`,async({browser},info)=>{
 const contexts:BrowserContext[]=[],players:Page[]=[],states=new Map<Page,any>();
 const page=async(phone=false)=>{const c=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:768}});contexts.push(c);const p=await c.newPage();p.on('dialog',d=>d.accept());p.on('websocket',ws=>ws.on('framereceived',({payload})=>{const raw=String(payload);if(raw.startsWith('42['))try{const[e,s]=JSON.parse(raw.slice(2));if(e==='state')states.set(p,s);}catch{}}));return p;};
 try{
 const h=await page();await h.goto('http://127.0.0.1:3101');await h.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-role','host');const code=await h.getByTestId('arcade').getAttribute('data-room-code');
 for(let i=0;i<n;i++){const p=await page(true);players.push(p);await p.goto('http://127.0.0.1:3101/?room='+code);await p.getByPlaceholder('오늘의 게임 닉네임').fill('누적친구'+i);await p.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();await expect(p.getByTestId('arcade')).toHaveAttribute('data-role','player');}
 await h.locator('.game-select').getByRole('button',{name:'🌙 정보전 마피아',exact:true}).click();
 const change=async(name:string,key:string,delta:number)=>{const before=states.get(h).mafiaSetup.config.direct[key]||0;await h.getByRole('button',{name:name+(delta>0?' 추가':' 제거'),exact:true}).click();await expect.poll(()=>states.get(h).mafiaSetup.config.direct[key]||0).toBe(before+delta);};
 await change('경찰','police',-1);await change('의사','doctor',-1);if(n>5)await change('일반 마피아','mafia',-1);await change(label,kind,1);
 while(Object.values(states.get(h).mafiaSetup.config.direct).reduce((a:number,b:any)=>a+b,0)<n)await change('일반 시민','citizen',1);
 await h.locator('.host-controls > .yellow').click();await h.getByRole('button',{name:'확인하고 진행',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','ROLE_REVEAL');for(const p of players)await expect(p.getByTestId('mafia-own-role')).toBeVisible();
 const m=()=>states.get(h).round.mafia,own=(p:Page)=>states.get(p).round.mafia,id=(p:Page)=>m().ids[players.indexOf(p)],neutral=players.find(p=>own(p).ownRole.roleId===kind)!,targets=players.filter(p=>own(p).ownRole.roleId==='citizen').slice(0,2),targetIds=targets.map(id);
 const privacy=async()=>{for(const p of [h,...players.filter(p=>p!==neutral)]){await expect(p.getByTestId('mafia-neutral-ability')).toHaveCount(0);expect(own(p).neutralAbility).toBeUndefined();expect(own(p).neutralObjective).toBeUndefined();expect(own(p).neutralProgress).toBeUndefined();}};
 await privacy();await h.reload();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','ROLE_REVEAL');await h.getByRole('button',{name:'첫 번째 밤 시작',exact:true}).click();

 await neutral.getByLabel('중립 능력 대상',{exact:true}).selectOption(targetIds[0]);await neutral.getByRole('button',{name:'표식 확정',exact:true}).click();await expect(neutral.getByTestId('bomb-mark')).toContainText('이번 밤 지정 확정');await neutral.reload();await expect(neutral.getByTestId('bomb-mark')).toContainText('이번 밤 지정 확정');await privacy();await neutral.getByTestId('mafia-neutral-ability').screenshot({path:info.outputPath('bomber-phone.png')});
 for(const name of ['바로 낮으로','낮 토론 시작','처형 투표 시작'])await h.getByRole('button',{name,exact:true}).click();for(const p of players)await p.locator(`[data-target-id="${id(neutral)}"]`).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','EXECUTION_PENDING');await expect(h.getByTestId('neutral-winner')).toContainText('폭탄마',{timeout:22000});await expect(neutral.getByTestId('neutral-winner')).toContainText('단독 승리자');expect(m().winnerPlayerIds).toEqual([id(neutral)]);
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
