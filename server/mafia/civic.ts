import type {WinResult} from './neutral';
import {randomUUID} from 'node:crypto';
import type {MafiaState} from './engine';
import {roles,type RoleId} from './roles';
import {assertReportNight,validateReportText,persistCivic,persistPost,persistExecution} from './reports';
import type {PrivateMessage} from './communications';
export type CivicAction={id:string;gameSessionId:string;ownerId:string;roleId:'judge'|'bodyguard'|'coroner';targetId:string;nightId:string;day:number;requestId:string;at:number;executionId?:string;cancel?:boolean};
export type CivicResult={id:string;ownerId:string;targetId:string;day:number;roleId?:RoleId;roleName?:string;protected?:boolean};
export type Revenge={ownerId:string;candidates:readonly string[];endsAt:number;status:'pending'|'submitted'|'timedOut'|'unavailable';requestId?:string;targetId?:string;correct?:boolean;resolvedAt?:number};
export type Execution={blockedVoterIds?:readonly string[];id:string;gameSessionId:string;day:number;executionCandidate?:string;voteCounts:Record<string,number>;isTie:boolean;validVotes:number;endsAt:number;wasCancelled:boolean;executedPlayerId?:string;finalExecutionStatus:'pending'|'cancelled'|'confirmed'|'noCandidate';decision?:CivicAction;voteRecords?:Readonly<Record<string,string>>;livingPlayersBeforeExecution?:readonly string[];personalWinResult?:WinResult;revenge?:Readonly<Revenge>};
export const emptyCivic=()=>({actions:[] as CivicAction[],results:[] as CivicResult[]});
const rejectIdentity=(a:any)=>{if(['ownerId','senderId','senderPlayerId','recipientId','playerId','roleId'].some(k=>Object.hasOwn(a,k)))throw Error('참가자 신원은 서버에서 확인합니다.');};
export function submitCivic(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);rejectIdentity(a);const role=m.roleById[id];
 if(role!=='bodyguard'&&role!=='coroner')throw Error('이 능력을 사용할 수 없습니다.');
 const own=m.civic.actions.filter(x=>x.ownerId===id),previous=own.find(x=>x.nightId===m.nightId||x.requestId===a.requestId);
 if(previous){if(previous.nightId===m.nightId&&previous.requestId===a.requestId&&previous.targetId===a.targetId)return{duplicate:true};throw Error('이미 확정한 행동은 변경할 수 없습니다.');}
 if(role==='bodyguard'&&(own.length>=1||a.targetId===id||!m.alive.includes(a.targetId)))throw Error('남은 보호 횟수와 다른 생존 대상을 확인하세요.');
 if(role==='coroner'&&(!m.ids.includes(a.targetId)||m.alive.includes(a.targetId)))throw Error('이미 사망한 참가자만 검시할 수 있습니다.');
 const action:CivicAction={id:randomUUID(),gameSessionId:m.id,ownerId:id,roleId:role,targetId:a.targetId,nightId:m.nightId,day:m.day,requestId:a.requestId,at:now};
 persistCivic(action);m.civic.actions.push(action);return{duplicate:false};
}
export function submitJudgement(m:MafiaState,id:string,a:any,now=Date.now()){
 const e=m.executionPending;
 if(!a||a.roundId!==m.id||!e||a.executionId!==e.id||m.phase!=='EXECUTION_PENDING'||now>=e.endsAt)throw Error('처형 판정 시간이 끝났거나 단계가 변경되었습니다.');
 rejectIdentity(a);
 if(!m.alive.includes(id)||m.roleById[id]!=='judge'||typeof a.cancel!=='boolean'||typeof a.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(a.requestId))throw Error('살아 있는 판사만 결정할 수 있습니다.');
 if(e.decision){if(e.decision.ownerId===id&&e.decision.requestId===a.requestId&&e.decision.cancel===a.cancel)return{duplicate:true};throw Error('이미 결정했습니다.');}
 if(m.civic.actions.some(x=>x.ownerId===id&&x.cancel))throw Error('처형 취소는 게임당 1회입니다.');
 const action:CivicAction={id:randomUUID(),gameSessionId:m.id,ownerId:id,roleId:'judge',targetId:e.executionCandidate!,nightId:m.nightId,day:m.day,requestId:a.requestId,at:now,executionId:e.id,cancel:a.cancel};
 const next={...e,decision:action};persistExecution(next,action);e.decision=action;m.civic.actions.push(action);return{duplicate:false};
}
export function sendPost(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);rejectIdentity(a);
 if(m.roleById[id]!=='postman')throw Error('우체부만 보낼 수 있습니다.');validateReportText(a.text);
 if(a.targetId===id||!m.alive.includes(a.targetId))throw Error('다른 생존 수신자를 선택하세요.');
 const own=m.communications.messages.filter(x=>x.ownerId===id),previous=own.find(x=>x.nightId===m.nightId||x.requestId===a.requestId);
 if(previous){if(previous.nightId===m.nightId&&previous.requestId===a.requestId&&previous.recipientId===a.targetId&&previous.text===a.text)return{duplicate:true};throw Error('이번 밤 메시지를 이미 보냈습니다.');}
 if(own.length>=2)throw Error('우편 전송은 게임당 2회입니다.');
 const message:PrivateMessage={id:randomUUID(),gameSessionId:m.id,ownerId:id,recipientId:a.targetId,requestId:a.requestId,text:a.text,nightId:m.nightId,day:m.day,at:now,sourceRole:'postman',sourceAbility:'privateMail'};
 persistPost(message);m.communications.messages.push(message);return{duplicate:false};
}
export function civicNightResults(m:MafiaState,protectedTarget:string|undefined):CivicResult[]{
 return m.civic.actions.filter(x=>x.nightId===m.nightId&&x.roleId!=='judge').map(x=>({id:x.id,ownerId:x.ownerId,targetId:x.targetId,day:x.day,...(x.roleId==='coroner'?{roleId:m.roleById[x.targetId],roleName:roles[m.roleById[x.targetId]].roleName}:{protected:x.targetId===protectedTarget})}));
}
export function civicView(m:MafiaState,id:string){
 if(!m.ids.includes(id))return undefined;const role=m.roleById[id];if(!['judge','bodyguard','coroner','postman'].includes(role))return undefined;
 const own=m.civic.actions.filter(x=>x.ownerId===id),post=m.communications.messages.filter(x=>x.ownerId===id),e=m.executionPending;
 const remaining=role==='judge'?1-own.filter(x=>x.cancel).length:role==='bodyguard'?1-own.length:role==='postman'?2-post.length:null;
 const submitted=role==='judge'?!!e?.decision:role==='postman'?post.some(x=>x.nightId===m.nightId):own.some(x=>x.nightId===m.nightId&&x.roleId!=='judge');
 const targets=role==='coroner'?m.ids.filter(t=>!m.alive.includes(t)):m.alive.filter(t=>t!==id);
 const canSend=m.alive.includes(id)&&!submitted&&(remaining===null||remaining>0)&&(role==='judge'?m.phase==='EXECUTION_PENDING'&&!!e&&Date.now()<e.endsAt:m.phase==='NIGHT'&&Date.now()<m.nightEndsAt&&targets.length>0);
 return{kind:role,remaining,submitted,canSend,targets:role==='judge'?[]:targets,candidate:role==='judge'?e?.executionCandidate:undefined,decision:role==='judge'?e?.decision?.cancel:undefined,selectedTargetId:role==='postman'?post.find(x=>x.nightId===m.nightId)?.recipientId:own.find(x=>x.nightId===m.nightId&&x.roleId!=='judge')?.targetId,
 results:m.civic.results.filter(x=>x.ownerId===id).map(({ownerId,...x})=>x),history:role==='postman'?post.map(x=>({id:x.id,day:x.day,targetId:x.recipientId,text:x.text})):own.map(x=>({id:x.id,day:x.day,targetId:x.targetId,cancel:x.cancel})),
 deadDates:role==='coroner'?Object.fromEntries(targets.map(t=>{const event=m.events.find(e=>e.deaths.includes(t));return[t,event?`${event.day}일차 ${event.kind==='night'?'밤':'낮'}`:'사망'];})):undefined};
}

// Deliberately whitelist public fields: voter identities and objectives never ride on events.
export function publicExecution(e:Execution){return{id:e.id,gameSessionId:e.gameSessionId,day:e.day,executionCandidate:e.executionCandidate,voteCounts:e.voteCounts,isTie:e.isTie,validVotes:e.validVotes,endsAt:e.endsAt,wasCancelled:e.wasCancelled,executedPlayerId:e.executedPlayerId,finalExecutionStatus:e.finalExecutionStatus};}
