import {randomInt,randomUUID} from 'node:crypto';
import type {MafiaState} from './engine';import type {Execution} from './civic';import {roles,type Team} from './roles';
export type NeutralRole='jester'|'bountyHunter'|'agitator'|'prophet'|'swindler'|'parasite'|'gambler'|'bomber';
export type NeutralObjective=Readonly<{id:string;gameSessionId:string;ownerId:string;roleId:NeutralRole;targetId?:string;assignedAt:number}>;
export type WinResult=Readonly<{gameSessionId:string;team:Team;playerIds:readonly string[];reason:string;day:number;at:number;roleId?:NeutralRole;executionId?:string}>;
export const neutralQuotes:Record<NeutralRole,string>={bomber:'나를 처형하고 싶어? 좋아. 대신 내 표적도 나한테 투표해야 해.',swindler:'네가 누군지 다 알아. 두 명만 맞히면 이 게임은 내 거야.',parasite:'내가 직접 죽일 필요는 없어. 네가 죽기만 기다리면 되거든.',gambler:'난 나한테 투표할 거야. 근데 죽는 건 네가 될걸?',jester:'나 좀 죽여봐. 그럼 내가 이기는 거거든?',bountyHunter:'내가 원하는 건 딱 하나야. 네가 공개 처형되는 것.',agitator:'내가 직접 죽일 필요도 없어. 너희가 대신 투표해 주면 되거든.',prophet:'네가 죽을 운명인 건 알아. 하지만 내 표는 주지 않을 거야.'};
export const neutralWinMessages:Record<NeutralRole,string>={bomber:'폭탄 표적의 표로 실제 처형되어 혼자 승리했습니다.',swindler:'서로 다른 두 사람의 정확한 직업을 맞혀 혼자 승리했습니다.',parasite:'두 표적의 사망을 지켜보고 끝까지 살아남았습니다.',gambler:'서로 다른 두 낮의 도박을 성공시켰습니다.',jester:'모두가 속았습니다. 처형당하는 순간 혼자 승리했습니다.',bountyHunter:'표적의 공개 처형을 지켜보고 현상금을 독차지했습니다.',agitator:'다른 참가자들의 표로 운명을 바꾸고 혼자 승리했습니다.',prophet:'표적에게 표를 던지지 않고 예언을 완성했습니다.'};
export const isNeutralRole=(id:string):id is NeutralRole=>Object.hasOwn(neutralQuotes,id);
export function assignNeutralObjectives(m:Pick<MafiaState,'id'|'ids'|'roleById'>,now=Date.now()):readonly NeutralObjective[]{
 const owners=m.ids.filter(id=>roles[m.roleById[id]].team==='neutral');if(owners.length>1)throw Error('중립은 최대 1명입니다.');
 return Object.freeze(owners.map(ownerId=>{const roleId=m.roleById[ownerId];if(!isNeutralRole(roleId))throw Error('아직 구현되지 않은 중립 직업입니다.');const others=m.ids.filter(id=>id!==ownerId);return Object.freeze({id:randomUUID(),gameSessionId:m.id,ownerId,roleId,targetId:['bountyHunter','agitator','prophet'].includes(roleId)?others[randomInt(others.length)]:undefined,assignedAt:now});}));
}
// Future personal objectives register here. Input is the final, private execution
// record: never a provisional top-vote candidate or a mutable live vote map.
export const neutralExecutionRules:Partial<Record<NeutralRole,(goal:NeutralObjective,e:Readonly<Execution>)=>boolean>>={
 bomber:(g,e)=>e.executedPlayerId===g.ownerId&&!!g.targetId&&!!e.livingPlayersBeforeExecution?.includes(g.targetId)&&e.voteRecords?.[g.targetId]===g.ownerId,
 jester:(g,e)=>e.executedPlayerId===g.ownerId,
 bountyHunter:(g,e)=>e.executedPlayerId===g.targetId,
 agitator:(g,e)=>e.executedPlayerId===g.targetId&&Object.entries(e.voteRecords??{}).filter(([actor,target])=>actor!==g.ownerId&&target===g.targetId).length>=2,
 prophet:(g,e)=>e.executedPlayerId===g.targetId&&e.voteRecords?.[g.ownerId]!==g.targetId
};
export function evaluateNeutralExecution(m:MafiaState,e:Readonly<Execution>,now:number):WinResult|undefined{
 if(m.phase==='GAME_END'||e.gameSessionId!==m.id||e.day!==m.day||e.wasCancelled||e.finalExecutionStatus!=='confirmed'||!e.executedPlayerId||!e.livingPlayersBeforeExecution?.includes(e.executedPlayerId))return;
 for(const objective of m.neutralObjectives){const mark=objective.roleId==='bomber'?m.neutralProgress.marks.filter(g=>g.roleId==='bomber'&&g.ownerId===objective.ownerId&&g.day===e.day).at(-1):undefined;const goal=objective.roleId==='bomber'?{...objective,targetId:mark?.targetId}:objective;if(goal.gameSessionId!==m.id||m.roleById[goal.ownerId]!==goal.roleId||!e.livingPlayersBeforeExecution.includes(goal.ownerId)||!neutralExecutionRules[goal.roleId]?.(goal,e))continue;
 return Object.freeze({gameSessionId:m.id,team:'neutral',playerIds:Object.freeze([goal.ownerId]),reason:goal.roleId,roleId:goal.roleId,executionId:e.id,day:m.day,at:now});}
}
export function neutralView(m:MafiaState,id:string){const goal=m.neutralObjectives.find(g=>g.ownerId===id);if(!goal)return undefined;const won=m.winResult?.team==='neutral'&&m.winResult.playerIds.includes(id),targetAlive=goal.targetId?m.alive.includes(goal.targetId):undefined;
 return{roleId:goal.roleId,quote:neutralQuotes[goal.roleId],description:roles[goal.roleId].description,targetId:goal.targetId,targetAlive,alive:m.alive.includes(id),voteTargetId:m.votes[id],status:won?'won':m.phase==='GAME_END'?'failed':!m.alive.includes(id)||targetAlive===false?'unreachable':'pending'};
}
export function publicNeutralObjectives(m:MafiaState){return m.phase==='GAME_END'?m.neutralObjectives.map(g=>({ownerId:g.ownerId,roleId:g.roleId,targetId:g.targetId})):undefined;}
