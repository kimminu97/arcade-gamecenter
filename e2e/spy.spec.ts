import {test,expect} from '@playwright/test';
import {io} from 'socket.io-client';
test('스파이 모바일 다섯 입력 유형·서버 제출·Bot·토론·투표·결과',async({browser})=>{test.setTimeout(180000);
 const host=io('http://127.0.0.1:3101',{forceNew:true}),context=await browser.newContext({viewport:{width:390,height:844}});let state:any;
 host.on('state',s=>state=s);
 const action=(a:any)=>new Promise<any>((resolve,reject)=>host.timeout(5000).emit('action',a,(e:any,r:any)=>e?reject(e):r.ok?resolve(r):reject(Error(r.error))));
 try{if(!host.connected)await new Promise<void>(r=>host.once('connect',()=>r()));const created=await action({type:'create'}),page=await context.newPage();await page.goto(`http://127.0.0.1:3101/?room=${created.session.code}`);await page.getByPlaceholder('오늘의 게임 닉네임').fill('입력 검증');await page.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();await expect(page.getByTestId('arcade')).toHaveAttribute('data-role','player');
 const {grant}=await action({type:'debug:unlock'});await action({type:'debug:enable',grant,enabled:true});await action({type:'debug:add',grant,count:6});await action({type:'debug:config',grant,auto:false});
 for(const path of ['/server/spy-questions.json','/server/spy-questions.json?raw','/@fs/D:/workspace/gapyeong-arcade/server/spy-questions.json']){const response=await page.request.get(`http://127.0.0.1:3101${path}`);expect(response.status()).toBe(403);}
 const seen=new Set<string>();for(let i=0;i<100&&seen.size<5;i++){
 await action({type:'start',mode:'spy'});await expect.poll(()=>state?.round?.phase).toBe('answer');const type=state.round.spyAnswer.type;
 if(!seen.has(type)){await expect(page.getByTestId('arcade')).toHaveAttribute('data-phase','answer');const form=page.locator('.submission');await expect(form).toHaveAttribute('data-answer-type',type);
 await expect(form.getByRole('button',{name:'비밀 제출 →'})).toBeDisabled();
 if(type==='player'){await expect(form.locator('select option')).toHaveCount(8);await form.locator('select').selectOption({index:1});}
 else if(type==='yes_no'||type==='balance'){await expect(form.locator('select option')).toHaveCount(3);await form.locator('select').selectOption({index:1});}
 else{await form.locator('input').fill(type==='number'?'12':'먼저 대화한다');if(type==='number')await expect(form.locator('input')).toHaveAttribute('inputmode','numeric');}
 await form.getByRole('button',{name:'비밀 제출 →'}).click();await expect(page.getByText('✓ 제출 완료! 친구들을 기다려 주세요.',{exact:true})).toBeVisible();await action({type:'debug:now',grant});await expect(page.getByTestId('arcade')).toHaveAttribute('data-phase','discuss');await action({type:'advance'});await action({type:'debug:now',grant});await page.locator('.vote-grid button').first().click();await expect(page.getByTestId('arcade')).toHaveAttribute('data-phase','result');await expect(page.locator('.results')).toContainText('스파이는');seen.add(type);
 }else{await action({type:'reveal'});}
 }expect([...seen].sort()).toEqual(['balance','number','player','text','yes_no']);expect(state.history.length).toBeGreaterThanOrEqual(5);
 }finally{host.disconnect();await context.close();}
});
