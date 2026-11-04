import {raidStatus} from './raid';
import {roles} from './roles';
import {attackMembers} from './team-attack';
import {resolveNight,validAbilityTarget,type NightContext} from './abilities';
import type {MafiaState} from './engine';
export type NightReceipt={nightId:string;day:number;resolvedAt:number;captured:NightContext;outcome:ReturnType<typeof resolveNight>;rejectedActions:number};
// Future reports/news/private communications can register additional readiness gates.
// Chat messages never count as submitted abilities and do not make a night ready.
export const nightReadinessChecks:{key:string;ready:(m:Readonly<MafiaState>)=>boolean}[]=[
 {key:'fixedNightWindow',ready:()=>false},
 {key:'teamAttack',ready:m=>m.attack.locked},
 {key:'specialAbilities',ready:m=>m.alive.every(id=>{const role=roles[m.roleById[id]];return role.availablePhase!=='NIGHT'||role.abilityType==='none'||m.actions[id]!==undefined||role.abilityUses!==null&&(m.abilityUsed[id]||0)>=role.abilityUses;})}
];
export function canAutoResolveNight(m:MafiaState){return m.phase==='NIGHT'&&nightReadinessChecks.every(check=>check.ready(m));}
export function captureNight(m:MafiaState,now:number):NightReceipt{
 const ids=[...m.alive],actions:Record<string,string>={};let rejectedActions=0;
 for(const [actor,target] of Object.entries(m.actions)){const role=ids.includes(actor)?roles[m.roleById[actor]]:undefined;if(!role||role.availablePhase!=='NIGHT'||!validAbilityTarget(role.abilityType,actor,target,ids)){rejectedActions++;continue;}actions[actor]=target;}
 const actors=attackMembers(ids,m.roleById),target=m.attack.targetId;
 const validAttack=raidStatus(m).available&&m.attack.locked&&!!target&&ids.includes(target)&&actors.length>0&&actors.every(id=>m.attack.selections[id]===target);
 const captured:NightContext={ids,roleById:{...m.roleById},actions,guardTargets:m.civic.actions.filter(a=>a.roleId==='bodyguard'&&a.nightId===m.nightId&&ids.includes(a.ownerId)&&ids.includes(a.targetId)&&a.ownerId!==a.targetId).map(a=>a.targetId),attackTarget:validAttack?target:undefined};
 const outcome=resolveNight(captured,m.day);for(const entry of outcome.investigations){Object.freeze(entry.report);Object.freeze(entry);}Object.freeze(outcome.deaths);Object.freeze(outcome.investigations);Object.freeze(outcome);
 // Keep the receipt independent of later submissions, reconnects, or mutable round maps.
 Object.freeze(captured.guardTargets);Object.freeze(captured.ids);Object.freeze(captured.roleById);Object.freeze(captured.actions);Object.freeze(captured);
 return{nightId:m.nightId,day:m.day,resolvedAt:now,captured,outcome,rejectedActions};
}
