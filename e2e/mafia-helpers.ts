import type {Page} from '@playwright/test';
export async function firstRaidNight(h:Page){for(const name of ['바로 낮으로','낮 토론 시작','처형 투표 시작','투표 마감','다음 밤 시작'])await h.getByRole('button',{name,exact:true}).click();}
export async function openTeam(p:Page){const button=p.getByRole('button',{name:/마피아 채팅 열기/});await button.waitFor({state:'visible'});if(!await p.getByTestId('mafia-team-panel').isVisible())await button.click();await p.getByTestId('mafia-team-panel').waitFor({state:'visible'});}
export async function closeTeam(p:Page){if(await p.getByTestId('mafia-team-panel').isVisible())await p.getByRole('button',{name:'마피아 채팅 닫기',exact:true}).click();}
