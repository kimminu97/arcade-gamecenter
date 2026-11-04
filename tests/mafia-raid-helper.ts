import {advanceMafia,type MafiaState} from '../server/mafia/engine';
// Reach the first eligible raid by normal phase transitions, without changing day,
// roles, cooldown state, or bypassing the production engine's first-night gate.
export function ensureRaidNight(m:MafiaState){
 if(m.phase==='ROLE_REVEAL')advanceMafia(m,m.version);
 while(m.day===1){advanceMafia(m,m.version,m.phase==='EXECUTION_PENDING'?m.executionPending!.endsAt:Date.now());}
 if(m.phase!=='NIGHT')throw Error('둘째 밤 준비 실패');
}
