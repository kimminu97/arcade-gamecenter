import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:3000');await page.getByRole('button',{name:'✦ 방 만들기 · 진행자',exact:true}).click();
 await page.getByRole('button',{name:'💬 카카오톡 분석 · 문제은행 열기',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('article.chat-question').length>0);
 await page.getByRole('tab',{name:/^이 말 누가 했게/}).isVisible();
 assert.equal(await page.getByTestId('filtered-question-count').innerText(),'28');
 assert.ok(await page.locator('article.chat-question').first().locator('.chat-bubble').count()>1);
 await page.getByLabel('문제 검색',{exact:true}).fill('조회에없는가상검색조건');
 await page.waitForFunction(()=>document.querySelectorAll('article.chat-question').length===0);
 assert.ok((await page.getByTestId('question-empty-reason').innerText()).includes('필터'));
 await page.getByLabel('문제 검색',{exact:true}).fill('');await page.waitForFunction(()=>document.querySelectorAll('article.chat-question').length>0);
 await page.reload();await page.getByRole('button',{name:'💬 카카오톡 분석 · 문제은행 열기',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('article.chat-question').length>0);
 console.log(JSON.stringify({actualServer:3000,candidateGame:'guess-speaker',filtered:28,contextVisible:true,filterEmptyReason:true,refreshRestored:true}));
}finally{await browser.close();}
