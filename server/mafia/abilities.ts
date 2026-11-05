import {roles,type RoleId,type Team,type AbilityType} from './roles';
export type NightContext={ids:string[];roleById:Record<string,RoleId>;actions:Record<string,string>;guardTargets?:string[];shieldTargets?:string[];attackTarget?:string};
export type Investigation={day:number;targetId:string;team:Team;roleId:RoleId;roleName:string};
// Special ability handlers operate on the night-start roster. Team attacks are resolved separately.
export const abilityHandlers:Partial<Record<Exclude<AbilityType,'none'>,(c:NightContext)=>string[]>> = {
 protect:c=>c.ids.filter(id=>roles[c.roleById[id]].abilityType==='protect').map(id=>c.actions[id]).filter(Boolean),
 investigate:c=>c.ids.filter(id=>roles[c.roleById[id]].abilityType==='investigate'&&!!c.actions[id])
};
export function resolveNight(c:NightContext,day:number){
 const doctorIds=new Set(abilityHandlers.protect!(c)),guardIds=new Set(c.guardTargets??[]),protectedIds=new Set([...doctorIds,...guardIds]);
 const investigations=abilityHandlers.investigate!(c).map(id=>{const role=roles[c.roleById[c.actions[id]]];return{id,report:{day,targetId:c.actions[id],team:role.team,roleId:role.roleId,roleName:role.roleName} satisfies Investigation};});
 const shieldConsumed=c.attackTarget&&!protectedIds.has(c.attackTarget)&&c.shieldTargets?.includes(c.attackTarget)?c.attackTarget:undefined;
 return{shieldConsumed,guardStoppedAttack:!!c.attackTarget&&guardIds.has(c.attackTarget)&&!doctorIds.has(c.attackTarget),deaths:c.attackTarget&&!protectedIds.has(c.attackTarget)&&!shieldConsumed?[c.attackTarget]:[],investigations};
}

export const abilityTargetRules:Partial<Record<Exclude<AbilityType,'none'>,(actorId:string,targetId:string)=>boolean>>={protect:()=>true,investigate:(actor,target)=>actor!==target};
export function validAbilityTarget(type:AbilityType,actorId:string,targetId:string,alive:string[]){return alive.includes(targetId)&&((abilityTargetRules as Partial<Record<AbilityType,(a:string,t:string)=>boolean>>)[type]?.(actorId,targetId)??false);}
