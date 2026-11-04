import {randomUUID} from 'node:crypto';
import type {MafiaState} from './engine';
import type {Execution} from './civic';
import type {WinResult} from './neutral';
import {roles,getRole,type PlayableRoleId} from './roles';
import {assertReportNight,persistNeutralAction} from './reports';

export type NeutralAction={id:string;gameSessionId:string;ownerId:string;roleId:'swindler'|'parasite'|'bomber';targetId:string;guessedRoleId?:PlayableRoleId;nightId:string;day:number;requestId:string;at:number};
export type Guess=NeutralAction&{correct?:boolean;resolvedAt?:number};
export type DeathRecord={id:string;gameSessionId:string;playerId:string;day:number;at:number};
export type BallotRecord={id:string;day:number;selfVote:boolean;executedPlayerId?:string;wasCancelled:boolean;success:boolean};
export type NeutralProgress={gameSessionId:string;guesses:Guess[];marks:NeutralAction[];ballots:BallotRecord[];deaths:DeathRecord[]};
export const emptyNeutralProgress=(gameSessionId:string):NeutralProgress=>({gameSessionId,guesses:[],marks:[],ballots:[],deaths:[]});
const actions=(m:MafiaState,id:string)=>m.roleById[id]==='swindler'?m.neutralProgress.guesses:m.neutralProgress.marks;
// Only server-authenticated actor IDs enter this function. No correctness or counter
// field from the wire is copied into the action or response.
export function submitNeutralAction(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);
 const roleId=m.roleById[id];if(roleId!=='swindler'&&roleId!=='parasite'&&roleId!=='bomber')throw Error('이 직업은 추측이나 표식을 사용할 수 없습니다.');
 const list=actions(m,id),old=list.find(x=>x.ownerId===id&&x.requestId===a.requestId);
 if(old){if(old.nightId===m.nightId&&old.targetId===a.targetId&&old.guessedRoleId===a.guessedRoleId)return{duplicate:true};throw Error('이미 사용한 요청 ID입니다.');}
 if(list.some(x=>x.ownerId===id&&x.nightId===m.nightId))throw Error('한 밤에 한 번만 확정할 수 있습니다.');
 if(roleId!=='bomber'&&list.filter(x=>x.ownerId===id).length>=(roleId==='swindler'?3:2))throw Error('남은 사용 횟수가 없습니다.');
 if(typeof a.targetId!=='string'||a.targetId===id||!m.alive.includes(a.targetId))throw Error('다른 생존 참가자를 선택하세요.');
 if(roleId!=='bomber'&&list.some(x=>x.ownerId===id&&x.targetId===a.targetId))throw Error('이미 선택한 대상입니다. 변경하거나 다시 선택할 수 없습니다.');
 const role=roleId==='swindler'?getRole(a.guessedRoleId):undefined;
 if(roleId==='swindler'&&(typeof a.guessedRoleId!=='string'||role?.implementationStatus!=='implemented'))throw Error('활성 직업의 정확한 이름을 선택하세요.');
 const action:NeutralAction=Object.freeze({id:randomUUID(),gameSessionId:m.id,ownerId:id,roleId,targetId:a.targetId,guessedRoleId:roleId==='swindler'?role!.roleId as PlayableRoleId:undefined,nightId:m.nightId,day:m.day,requestId:a.requestId,at:now});
 const progress={...m.neutralProgress,[roleId==='swindler'?'guesses':'marks']:[...list,action]};
 persistNeutralAction(action,progress);m.neutralProgress=progress;return{duplicate:false};
}
export type NeutralFinalization={progress:NeutralProgress;win?:WinResult};
// Pure projection shared by night and final execution. Each receipt/day/death has
// a stable key. Commit this projection with the existing result transaction before
// applying it to memory; a storage failure leaves the running game untouched.
export function planNeutralFinalization(m:MafiaState,event:{id:string;deaths:readonly string[];night?:boolean;execution?:Readonly<Execution>},now:number):NeutralFinalization{
 const p=m.neutralProgress,progress:NeutralProgress={...p,guesses:[...p.guesses],marks:[...p.marks],ballots:[...p.ballots],deaths:[...p.deaths]};
 if(m.phase==='GAME_END')return{progress};
 for(const id of new Set(event.deaths))if(m.alive.includes(id)&&!progress.deaths.some(d=>d.playerId===id))progress.deaths.push(Object.freeze({id:event.id+':'+id,gameSessionId:m.id,playerId:id,day:m.day,at:now}));
 if(event.night)progress.guesses=progress.guesses.map(g=>g.nightId===m.nightId&&g.resolvedAt===undefined?Object.freeze({...g,correct:m.roleById[g.targetId]===g.guessedRoleId,resolvedAt:now}):g);
 const goal=m.neutralObjectives[0],e=event.execution;
 if(goal?.roleId==='gambler'&&e&&e.gameSessionId===m.id&&e.day===m.day&&e.finalExecutionStatus!=='pending'&&!progress.ballots.some(b=>b.day===e.day)){
  const selfVote=e.voteRecords?.[goal.ownerId]===goal.ownerId;
  const success=selfVote&&m.alive.includes(goal.ownerId)&&!e.wasCancelled&&e.finalExecutionStatus==='confirmed'&&!!e.executedPlayerId&&e.executedPlayerId!==goal.ownerId;
  progress.ballots.push(Object.freeze({id:e.id,day:e.day,selfVote,executedPlayerId:e.executedPlayerId,wasCancelled:e.wasCancelled,success}));
 }
 if(!goal||!m.alive.includes(goal.ownerId)||event.deaths.includes(goal.ownerId))return{progress};
 const met=goal.roleId==='swindler'?progress.guesses.filter(g=>g.ownerId===goal.ownerId&&g.correct).length>=2:
 goal.roleId==='parasite'?progress.marks.filter(g=>g.ownerId===goal.ownerId&&progress.deaths.some(d=>d.playerId===g.targetId&&d.at>=g.at)).length===2:
 goal.roleId==='gambler'?progress.ballots.filter(b=>b.success).length>=2:false;
 return{progress,win:met?Object.freeze({gameSessionId:m.id,team:'neutral',playerIds:Object.freeze([goal.ownerId]),reason:goal.roleId,roleId:goal.roleId,day:m.day,at:now,executionId:e?.id}):undefined};
}
export function neutralAbilityView(m:MafiaState,id:string){
 const roleId=m.roleById[id];if(!m.ids.includes(id)||!['swindler','parasite','gambler','bomber'].includes(roleId))return undefined;
 const p=m.neutralProgress,list=roleId==='swindler'?p.guesses:p.marks,used=list.filter(x=>x.ownerId===id),limit=roleId==='bomber'?Infinity:roleId==='swindler'?3:2;
 const canSend=m.alive.includes(id)&&m.phase==='NIGHT'&&Date.now()<m.nightEndsAt&&used.length<limit&&!used.some(x=>x.nightId===m.nightId)&&roleId!=='gambler';
 return{roleId,canSend,bombMark:roleId==='bomber'?used.filter(g=>g.day===m.day).map(g=>({targetId:g.targetId,alive:m.alive.includes(g.targetId)})).at(-1):undefined,remaining:roleId==='gambler'?null:roleId==='bomber'?(used.some(g=>g.nightId===m.nightId)?0:1):limit-used.length,successes:roleId==='swindler'?p.guesses.filter(g=>g.ownerId===id&&g.correct).length:roleId==='gambler'?p.ballots.filter(b=>b.success).length:used.filter(g=>!m.alive.includes(g.targetId)).length,
 targets:canSend?m.alive.filter(t=>t!==id&&(roleId==='bomber'||!used.some(g=>g.targetId===t))):[],
 roleOptions:roleId==='swindler'?Object.values(roles).filter(r=>r.implementationStatus==='implemented').map(r=>({roleId:r.roleId,roleName:r.roleName,team:r.team})):undefined,
 guesses:roleId==='swindler'?p.guesses.filter(g=>g.ownerId===id).map(g=>({targetId:g.targetId,guessedRoleId:g.guessedRoleId,day:g.day,correct:g.correct,resolved:g.resolvedAt!==undefined})):undefined,
 marks:roleId==='parasite'?used.map(g=>({targetId:g.targetId,day:g.day,alive:m.alive.includes(g.targetId)})):undefined,
 ballots:roleId==='gambler'?p.ballots.map(b=>({...b})):undefined};
}
