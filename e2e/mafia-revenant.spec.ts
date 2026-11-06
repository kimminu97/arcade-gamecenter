import {expectFinalRoles} from './mafia-helpers';
import {test,expect,type BrowserContext,type Page} from '@playwright/test';
test.setTimeout(150000);
for(const [n,outcome] of [[5,'correct'],[6,'timeout']] as const)test(`${n}인 복수귀 모바일: ${outcome}·개인 후보·실제15초·새로고침`,async({browser},info)=>{
 const contexts:BrowserContext[]=[],players:Page[]=[],states=new Map<Page,any>();let cancel=false;
 const page=async(phone=false)=>{const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:768}});contexts.push(context);const p=await context.newPage();p.on('dialog',d=>cancel?d.dismiss():d.accept());p.on('websocket',ws=>ws.on('framereceived',({payload})=>{const raw=String(payload);if(raw.startsWith('42['))try{const [event,state]=JSON.parse(raw.slice(2));if(event==='state')states.set(p,state);}catch{}}));return p;};
 try{
 const h=await page();await h.goto('http://127.0.0.1:3101');await expect(h.getByText('● 실시간 연결',{exact:true})).toBeVisible({timeout:30000});await h.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-role','host');await expect(h.getByTestId('arcade')).toHaveAttribute('data-room-code',/^[0-9A-F]{6}$/);const code=await h.getByTestId('arcade').getAttribute('data-room-code');
 for(let i=0;i<n;i++){const p=await page(true);players.push(p);await p.goto('http://127.0.0.1:3101/?room='+code);await p.getByPlaceholder('오늘의 게임 닉네임').fill('복수친구'+i);await p.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();await expect(p.getByTestId('arcade')).toHaveAttribute('data-role','player');}
 await h.locator('.game-select').getByRole('button',{name:'🌙 정보전 마피아',exact:true}).click();
 const change=async(name:string,key:string,delta:number)=>{const before=states.get(h).mafiaSetup.config.direct[key]||0;await h.getByRole('button',{name:name+(delta>0?' 추가':' 제거'),exact:true}).click();await expect.poll(()=>states.get(h).mafiaSetup.config.direct[key]||0).toBe(before+delta);};
 await change('경찰','police',-1);await change('의사','doctor',-1);if(n>5)await change('일반 마피아','mafia',-1);await change('복수귀','revenant',1);
 while(Object.values(states.get(h).mafiaSetup.config.direct).reduce((a:number,b:any)=>a+b,0)<n)await change('일반 시민','citizen',1);
 await h.locator('.host-controls > .yellow').click();await h.getByRole('button',{name:'확인하고 진행',exact:true}).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','ROLE_REVEAL');for(const p of players)await expect(p.getByTestId('mafia-own-role')).toBeVisible();
 const m=()=>states.get(h).round.mafia,own=(p:Page)=>states.get(p).round.mafia,id=(p:Page)=>m().ids[players.indexOf(p)],revenant=players.find(p=>own(p).ownRole.roleId==='revenant')!,mafia=players.find(p=>own(p).ownRole.team==='mafia')!;
 const assigned=Object.fromEntries(players.map((p,i)=>[id(p),{playerName:'복수친구'+i,roleName:own(p).ownRole.roleName,team:own(p).ownRole.team}]));for(const p of[h,...players])await expect(p.getByTestId('mafia-final-roles')).toHaveCount(0);
 for(const name of ['첫 번째 밤 시작','바로 낮으로','처형 투표 시작'])await h.getByRole('button',{name,exact:true}).click();
 for(const p of players)await p.locator(`[data-target-id="${id(revenant)}"]`).click();await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','EXECUTION_PENDING');await expect(revenant.getByTestId('mafia-revenge')).toBeVisible({timeout:22000});
 expect(m().alive).not.toContain(id(revenant));await expect(h.getByTestId('revenge-waiting')).toHaveText('복수귀의 마지막 선택 진행 중');await expect(h.getByRole('button',{name:'복수귀의 마지막 선택 진행 중',exact:true})).toBeDisabled();
 await Promise.all([h,...players.filter(p=>p!==revenant)].map(async p=>{await expect.poll(()=>own(p).phase).toBe('REVENGE_PENDING');expect(own(p).revenge).toBeUndefined();expect(own(p).revealedRoles).toBeUndefined();await expect(p.getByTestId('mafia-final-roles')).toHaveCount(0);await expect(p.getByTestId('mafia-revenge')).toHaveCount(0);}));
 const selector=revenant.getByLabel('마지막 추측 대상',{exact:true});await expect(selector.locator('option')).toHaveCount(n);expect(own(revenant).revenge.candidates).not.toContain(id(revenant));
 expect(own(revenant).revealedRoles).toBeUndefined();await expect(revenant.getByTestId('mafia-final-roles')).toHaveCount(0);const deadline=own(revenant).revenge.endsAt;await revenant.reload({waitUntil:'domcontentloaded'});await expect(revenant.getByTestId('mafia-revenge')).toBeVisible();expect(own(revenant).revenge.endsAt).toBe(deadline);await expect(revenant.getByTestId('revenge-seconds')).toContainText('00:');
 if(outcome==='correct'){
 await selector.selectOption(id(mafia));cancel=true;await revenant.getByRole('button',{name:'최종 추측 확정',exact:true}).click();cancel=false;await expect(revenant.getByTestId('mafia-revenge')).toBeVisible();await expect(selector).toHaveValue(id(mafia));
 await revenant.getByRole('button',{name:'최종 추측 확정',exact:true}).click();await expect(h.getByTestId('neutral-winner')).toContainText('복수귀');await expect(revenant.getByTestId('neutral-winner')).toContainText('단독 승리자');expect(m().winnerPlayerIds).toEqual([id(revenant)]);expect(states.get(h).history).toHaveLength(1);
 for(const p of[h,...players])await expectFinalRoles(p,assigned);await h.reload();await expectFinalRoles(h,assigned);await revenant.reload();await expectFinalRoles(revenant,assigned);await h.getByTestId('mafia-final-roles').screenshot({path:info.outputPath('neutral-final-roles-tv.png')});await revenant.getByTestId('mafia-final-roles').screenshot({path:info.outputPath('neutral-final-roles-phone.png')});
 // Capture after the choice so rendering cannot consume the real 15-second window.
 await revenant.screenshot({path:info.outputPath('revenant-phone.png')});
 }else{await expect(h.getByTestId('arcade')).toHaveAttribute('data-phase','DAY_RESOLUTION',{timeout:20000});await expect(revenant.getByTestId('mafia-revenge')).toHaveCount(0);expect(m().winner).toBeUndefined();expect(states.get(h).history).toHaveLength(0);}
 expect(states.get(h).players.every((p:any)=>p.score===0)).toBe(true);
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
