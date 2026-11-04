import type {MafiaState} from './engine';
export type MafiaRules={raidCooldown:boolean;mafiaChat:boolean};
export const defaultMafiaRules:Readonly<MafiaRules>=Object.freeze({raidCooldown:true,mafiaChat:true});
export function normalizeMafiaRules(value:any):MafiaRules{
 if(value===undefined)return{...defaultMafiaRules};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['raidCooldown','mafiaChat'].includes(k))||Object.values(value).some(v=>typeof v!=='boolean'))throw Error('습격 재사용 대기·마피아 채팅 설정은 ON/OFF입니다.');
 return{...defaultMafiaRules,...value};
}
export function raidStatus(m:MafiaState){const reason=m.day===1?'firstNight':m.rules.raidCooldown&&m.raidBlockedDay===m.day?'cooldown':m.phase!=='NIGHT'?'notNight':undefined;return{available:!reason,reason};}
export type RaidRecord={gameSessionId:string;nightId:string;day:number;success:boolean;blockedNextDay:number};
