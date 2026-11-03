import {roles,type RoleId,teamAbilities} from './roles';
export type SharedAttack={selections:Record<string,string>;locked:boolean;targetId?:string};
export const emptyAttack=():SharedAttack=>({selections:{},locked:false});
export const attackMembers=(alive:string[],roleById:Record<string,RoleId>)=>alive.filter(id=>teamAbilities[roles[roleById[id]].team]?.abilityType==='sharedAttack');
export function selectAttack(attack:SharedAttack,actors:string[],id:string,targetId:string){
 if(attack.locked)throw Error('공동 공격이 이미 확정되어 변경할 수 없습니다.');
 if(!actors.includes(id))throw Error('마피아팀만 공동 공격에 참여할 수 있습니다.');
 if(attack.selections[id]===targetId)throw Error('이미 선택한 대상입니다.');
 attack.selections[id]=targetId;
 if(actors.length&&actors.every(actor=>attack.selections[actor]===targetId)){attack.locked=true;attack.targetId=targetId;}
}
