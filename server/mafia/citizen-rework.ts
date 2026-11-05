import {randomUUID} from 'node:crypto';
import type {MafiaState} from './engine';
import {persistCitizen} from './reports';

export type CitizenRole='voteBlocker'|'voteAppraiser'|'shieldMaker';
export type CitizenAction={id:string;ownerId:string;roleId:CitizenRole;targetId:string;day:number;nightId:string;requestId:string;at:number};
export type Shield={actionId:string;ownerId:string;targetId:string;status:'active'|'consumed'|'expired'};
export type VoteAppraisal={actionId:string;ownerId:string;targetId:string;day:number;votedFor?:string};
export type CitizenState={gameSessionId:string;initialMafiaCount:number;actions:CitizenAction[];shields:Shield[];results:VoteAppraisal[]};
export const emptyCitizen=(gameSessionId:string,initialMafiaCount:number):CitizenState=>({gameSessionId,initialMafiaCount,actions:[],shields:[],results:[]});
const kinds:CitizenRole[]=['voteBlocker','voteAppraiser','shieldMaker'];
export const voteBlocked=(m:MafiaState,id:string)=>['DAY_DISCUSSION','DAY_VOTE'].includes(m.phase)&&m.citizen.actions.some(a=>a.roleId==='voteBlocker'&&a.day===m.day&&a.targetId===id);
export const eligibleVoters=(m:MafiaState)=>m.alive.filter(id=>!voteBlocked(m,id));
export function submitCitizenAction(m:MafiaState,id:string,a:any,now=Date.now()){
 if(!a||a.roundId!==m.id||a.day!==m.day||!m.ids.includes(id)||!m.alive.includes(id))throw Error('현재 게임의 생존 참가자만 이용할 수 있습니다.');
 if(['ownerId','playerId','senderId','roleId','remaining','result','status'].some(k=>Object.hasOwn(a,k)))throw Error('능력과 신원은 서버에서 확인합니다.');
 const role=m.roleById[id] as CitizenRole;
 if(!kinds.includes(role))throw Error('해당 시민 능력의 소유자만 사용할 수 있습니다.');
 if(role==='shieldMaker'?m.phase!=='NIGHT'||a.nightId!==m.nightId||now>=m.nightEndsAt:m.phase!=='DAY_DISCUSSION')throw Error('능력 사용 단계가 아닙니다.');
 if(typeof a.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(a.requestId)||typeof a.targetId!=='string'||a.targetId===id||!m.alive.includes(a.targetId))throw Error('자신 이외 생존 대상과 요청 ID를 확인하세요.');
 const previous=m.citizen.actions.find(x=>x.ownerId===id);
 if(previous){if(previous.requestId===a.requestId&&previous.targetId===a.targetId&&previous.day===m.day&&previous.nightId===m.nightId)return{duplicate:true};throw Error('능력을 이미 사용했습니다. 대상을 변경할 수 없습니다.');}
 const action:CitizenAction={id:randomUUID(),ownerId:id,roleId:role,targetId:a.targetId,day:m.day,nightId:m.nightId,requestId:a.requestId,at:now};
 const next:CitizenState={...m.citizen,actions:[...m.citizen.actions,action],shields:role==='shieldMaker'?[...m.citizen.shields,{actionId:action.id,ownerId:id,targetId:a.targetId,status:'active'}]:m.citizen.shields};
 persistCitizen(next);m.citizen=next;return{duplicate:false};
}
export function planAppraisals(m:MafiaState,votes:Readonly<Record<string,string>>):CitizenState{
 const results=m.citizen.actions.filter(a=>a.roleId==='voteAppraiser'&&a.day===m.day&&!m.citizen.results.some(r=>r.actionId===a.id)).map(a=>({actionId:a.id,ownerId:a.ownerId,targetId:a.targetId,day:m.day,votedFor:votes[a.targetId]}));
 return{...m.citizen,results:[...m.citizen.results,...results]};
}
export function planShields(m:MafiaState,deaths:readonly string[],consumed?:string):CitizenState{
 return{...m.citizen,shields:m.citizen.shields.map(s=>s.status!=='active'?s:deaths.includes(s.targetId)?{...s,status:'expired'}:s.targetId===consumed?{...s,status:'consumed'}:s)};
}
export function citizenView(m:MafiaState,id:string){
 const kind=m.roleById[id] as CitizenRole;if(!m.ids.includes(id)||!kinds.includes(kind))return undefined;
 const action=m.citizen.actions.find(a=>a.ownerId===id),canSend=!action&&m.alive.includes(id)&&(kind==='shieldMaker'?m.phase==='NIGHT'&&Date.now()<m.nightEndsAt:m.phase==='DAY_DISCUSSION');
 return{kind,remaining:action?0:1,canSend,selectedTargetId:action?.targetId,submitted:!!action,targets:canSend?m.alive.filter(t=>t!==id):[],results:m.citizen.results.filter(r=>r.ownerId===id).map(({ownerId,...r})=>r),shield:m.citizen.shields.filter(s=>s.ownerId===id).map(({ownerId,...s})=>s)};
}
