import {expect,type Page} from '@playwright/test';
export async function firstRaidNight(h:Page){for(const name of ['바로 낮으로','처형 투표 시작','투표 마감','다음 밤 시작'])await h.getByRole('button',{name,exact:true}).click();}
export async function openTeam(p:Page){const button=p.locator('.mafia-team-launch > button');await button.waitFor({state:'visible'});if(!await p.getByTestId('mafia-team-panel').isVisible())await button.click();await p.getByTestId('mafia-team-panel').waitFor({state:'visible'});}
export async function closeTeam(p:Page){if(await p.getByTestId('mafia-team-panel').isVisible())await p.getByTestId('mafia-team-panel').getByRole('button',{name:'닫기',exact:true}).click();}
export async function expectFinalRoles(p:Page,assigned:Record<string,{playerName:string;roleName:string;team:string}>){
 const section=p.getByTestId('mafia-final-roles');await expect(section.getByRole('heading',{name:'최종 직업 공개',exact:true})).toBeVisible();await expect(section.getByTestId('revealed-role')).toHaveCount(Object.keys(assigned).length);
 const labels:Record<string,string>={town:'시민',mafia:'마피아',neutral:'중립'},colors=new Map<string,string>();
 for(const[id,role]of Object.entries(assigned)){const row=section.locator(`[data-player-id="${id}"]`);await expect(row.locator('b')).toHaveText(role.playerName);await expect(row.locator('strong')).toHaveText(role.roleName);await expect(row.locator('.mafia-final-team')).toHaveText(labels[role.team]);await expect(row).toHaveAttribute('data-team',role.team);colors.set(role.team,await row.locator('.mafia-final-team').evaluate(el=>getComputedStyle(el).color));}
 expect(new Set(colors.values()).size).toBe(colors.size);
 if(p.viewportSize()!.width<=800){const left=await section.getByTestId('revealed-role').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().left));expect(Math.max(...left)-Math.min(...left)).toBeLessThan(1);expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
}
