import {randomUUID} from 'node:crypto';import type {MafiaState} from './engine';import {assertReportNight,persistInfiltration} from './reports';
export type Infiltration={id:string;gameSessionId:string;ownerId:string;nightId:string;day:number;requestId:string;startSeq:number;at:number;endedAt?:number};
export function activeInfiltration(m:MafiaState,id:string,now=Date.now()){return m.rules.mafiaChat&&m.roleById[id]==='mimic'&&m.alive.includes(id)&&m.phase==='NIGHT'&&now<m.nightEndsAt?m.infiltrations.find(x=>x.ownerId===id&&x.nightId===m.nightId&&!x.endedAt):undefined;}
export function infiltrate(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);if(m.roleById[id]!=='mimic'||!m.rules.mafiaChat||['ownerId','playerId','roleId','startSeq','senderId'].some(k=>Object.hasOwn(a,k)))throw Error('흉내쟁이 본인만 채팅이 허용된 밤에 잠입할 수 있습니다.');
 const own=m.infiltrations.filter(x=>x.ownerId===id),previous=own.find(x=>x.nightId===m.nightId||x.requestId===a.requestId);
 if(previous){if(previous.nightId===m.nightId&&previous.requestId===a.requestId)return{duplicate:true};throw Error('이번 밤 잠입을 이미 사용했습니다.');}if(own.length>=2)throw Error('잠입은 게임당 2회입니다.');
 const x:Infiltration={id:randomUUID(),gameSessionId:m.id,ownerId:id,nightId:m.nightId,day:m.day,requestId:a.requestId,startSeq:m.teamChat.messages.length,at:now};persistInfiltration(x);m.infiltrations.push(x);return{duplicate:false};
}
export function infiltrationView(m:MafiaState,id:string){if(!m.ids.includes(id)||m.roleById[id]!=='mimic')return undefined;const own=m.infiltrations.filter(x=>x.ownerId===id),submitted=own.some(x=>x.nightId===m.nightId),active=!!activeInfiltration(m,id);return{remaining:2-own.length,active,submitted,canSend:m.alive.includes(id)&&m.phase==='NIGHT'&&Date.now()<m.nightEndsAt&&m.rules.mafiaChat&&!submitted&&own.length<2};}
