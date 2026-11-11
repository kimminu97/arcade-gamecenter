import {test,expect,type Page,type BrowserContext} from '@playwright/test';

test('5인 대기실 강퇴 확인, 안내 및 새 입장',async({browser})=>{
 const contexts:BrowserContext[]=[];
 const page=async(phone=false)=>{
  const context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1366,height:768}});
  contexts.push(context);
  return context.newPage();
 };
 const enter=async(p:Page,name:string)=>{
  await p.getByPlaceholder('오늘의 게임 닉네임').fill(name);
  await p.getByRole('button',{name:'게임 참가하기 →',exact:true}).click();
  await expect(p.getByTestId('arcade')).toHaveAttribute('data-role','player');
 };
 try{
  const url='http://127.0.0.1:3101';
  const host=await page();
  await host.goto(url);
  await expect(host.getByText('● 실시간 연결',{exact:true})).toBeVisible();
  await host.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();
  await expect(host.getByTestId('arcade')).toHaveAttribute('data-role','host');
  const code=await host.getByTestId('arcade').getAttribute('data-room-code');
  const phones:Page[]=[];
  for(let i=0;i<5;i++){
   const p=await page(true);
   phones.push(p);
   await p.goto(url+'/?room='+code);
   await enter(p,'대기친구'+i);
  }
  const [target,observer]=phones;
  const previousId=await target.getByTestId('arcade').getAttribute('data-player-id');
  const kick=host.getByRole('button',{name:'대기친구0 강퇴',exact:true});
  await expect(observer.getByRole('button',{name:/강퇴/})).toHaveCount(0);
  await kick.click();
  const dialog=host.getByRole('dialog');
  await expect(dialog).toContainText('대기친구0님을 방에서 내보낼까요?');
  await dialog.getByRole('button',{name:'취소',exact:true}).click();
  await expect(kick).toBeVisible();
  await kick.click();
  await dialog.getByRole('button',{name:'확인하고 진행',exact:true}).click();
  await expect(kick).toHaveCount(0);
  await expect(observer.locator('.players .player:not(.empty)')).toHaveCount(4);
  await expect(observer.getByRole('alert')).toHaveCount(0);
  await expect(target.getByRole('alert')).toContainText('Host에 의해 게임방에서 퇴장되었습니다.');
  await expect(target.getByTestId('arcade')).toHaveAttribute('data-role','guest');
  expect(await target.evaluate(()=>sessionStorage.getItem('arcade-session'))).toBeNull();
  await target.reload();
  await expect(target.getByTestId('arcade')).toHaveAttribute('data-role','guest');
  await enter(target,'대기친구0');
  await expect(target.getByTestId('arcade')).not.toHaveAttribute('data-player-id',previousId!);
  await expect(kick).toBeVisible();
  await host.locator('.game-select').getByRole('button',{name:'🌙 정보전 마피아',exact:true}).click();
  await host.locator('.host-controls > .yellow').click();
  await dialog.getByRole('button',{name:'확인하고 진행',exact:true}).click();
  await expect(host.getByTestId('arcade')).toHaveAttribute('data-phase','ROLE_REVEAL');
  await expect(host.getByRole('button',{name:/강퇴/})).toHaveCount(0);
 }finally{
  await Promise.all(contexts.map(context=>context.close()));
 }
});
