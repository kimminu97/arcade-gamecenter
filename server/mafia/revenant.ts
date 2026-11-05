import type {MafiaState} from './engine';
import type {Execution,Revenge} from './civic';
// Only the frozen, valid final ballot may supply candidates. No role information
// is projected with this private list, and execution never revives its owner.
export function planRevenge(m:MafiaState,e:Execution,now:number):Readonly<Revenge>|undefined{
 const ownerId=e.executedPlayerId;
 if(e.wasCancelled||e.finalExecutionStatus!=='confirmed'||!ownerId||m.roleById[ownerId]!=='revenant'||!e.livingPlayersBeforeExecution?.includes(ownerId))return;
 const candidates=Object.freeze(Object.entries(e.voteRecords??{}).filter(([actor,target])=>actor!==ownerId&&target===ownerId&&e.livingPlayersBeforeExecution!.includes(actor)).map(([actor])=>actor));
 return Object.freeze({ownerId,candidates,endsAt:now+15000,status:candidates.length?'pending':'unavailable',...(candidates.length?{}:{correct:false,resolvedAt:now})});
}
export function revengeView(m:MafiaState,id:string){
 const e=m.revengePending??[...m.executions].reverse().find(e=>e.revenge?.ownerId===id),r=e?.revenge;
 if(!r||r.ownerId!==id)return undefined;
 return{executionId:e!.id,candidates:r.candidates,endsAt:r.endsAt,status:r.status,targetId:r.targetId,correct:r.correct,canSend:m.phase==='REVENGE_PENDING'&&r.status==='pending'&&Date.now()<r.endsAt};
}
