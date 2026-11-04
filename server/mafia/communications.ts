import {randomUUID} from 'node:crypto';
import type {MafiaState} from './engine';
import type {AnonymousReport} from './reports';
import {assertReportNight,validateReportText,persistThreat,persistListeningReservation,persistCopiedReport,persistMessageReads} from './reports';
export type CopiedReport={id:string;gameSessionId:string;ownerId:string;reportId:string;senderId:string;text:string;at:number;nightId?:string;requestId?:string};
export type PrivateMessage={id:string;gameSessionId:string;ownerId:string;copyId?:string;sourceRole?:string;sourceAbility?:string;recipientId:string;requestId:string;text:string;nightId:string;day:number;at:number;readAt?:number};
export type ListeningReservation={id:string;gameSessionId:string;ownerId:string;targetId:string;requestId:string;nightId:string;bookedDay:number;listenDay:number;at?:number;status:'pending'|'success'|'none';reportId?:string;text?:string;resolvedAt?:number};
export type CommunicationState={copies:CopiedReport[];messages:PrivateMessage[];listening:ListeningReservation[]};
export type ReceiptEffects={copy?:CopiedReport;captures:{id:string;reportId:string;text:string}[]};
export const emptyCommunications=():CommunicationState=>({copies:[],messages:[],listening:[]});
export function planReceiptEffects(m:MafiaState,r:AnonymousReport):ReceiptEffects{
 const effects:ReceiptEffects={captures:[]};if(r.sourceType==='hacker')return effects;
 for(const tap of m.communications.listening)if(tap.status==='pending'&&tap.listenDay===m.day&&tap.targetId===r.senderPlayerId&&!tap.reportId)effects.captures.push({id:tap.id,reportId:r.reportId,text:r.originalText});
 return effects;
}
export function applyReceiptEffects(m:MafiaState,e:ReceiptEffects){for(const capture of e.captures){const tap=m.communications.listening.find(t=>t.id===capture.id)!;tap.reportId=capture.reportId;tap.text=capture.text;}}
// Only finalize after the target night closes. A receipt can be intercepted or
// have no journalist; eavesdropping observes the submitted normal report itself.
export function listeningResults(m:MafiaState,now:number){return m.communications.listening.filter(t=>t.status==='pending'&&t.listenDay===m.day).map(t=>({...t,status:t.reportId?'success' as const:'none' as const,resolvedAt:now}));}
export function applyListeningResults(m:MafiaState,results:ListeningReservation[]){for(const result of results){const i=m.communications.listening.findIndex(t=>t.id===result.id);m.communications.listening[i]=result;}}
export function sendAnonymousThreat(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);if(m.roleById[id]!=='blackmailer')throw Error('협박범만 사용할 수 있습니다.');validateReportText(a.text);
 if(['recipientId','targetId','senderPlayerId','receiverId'].some(key=>Object.hasOwn(a,key)))throw Error('수신자는 서버에서 원 제보 발신자로 결정합니다.');
 const copy=m.communications.copies.find(x=>x.id===a.copyId&&x.ownerId===id);if(!copy)throw Error('본인이 복사한 제보를 확인하세요.');
 const previous=m.communications.messages.find(x=>x.ownerId===id);
 if(previous){if(previous.requestId===a.requestId&&previous.copyId===copy.id&&previous.text===a.text)return{duplicate:true};throw Error('익명 메시지를 이미 전송했습니다. 변경할 수 없습니다.');}
 const message:PrivateMessage={id:randomUUID(),gameSessionId:m.id,ownerId:id,copyId:copy.id,recipientId:copy.senderId,requestId:a.requestId,text:a.text,nightId:m.nightId,day:m.day,at:now};
 persistThreat(message);m.communications.messages.push(message);return{duplicate:false};
}
export function reserveListening(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);if(m.roleById[id]!=='eavesdropper')throw Error('도청범만 사용할 수 있습니다.');
 if(typeof a.targetId!=='string'||!m.alive.includes(a.targetId))throw Error('생존 참가자를 선택하세요.');
 const own=m.communications.listening.filter(x=>x.ownerId===id),previous=own.find(x=>x.nightId===m.nightId||x.requestId===a.requestId);
 if(previous){if(previous.nightId===m.nightId&&previous.requestId===a.requestId&&previous.targetId===a.targetId)return{duplicate:true};throw Error('이번 밤 예약을 이미 확정했습니다. 변경할 수 없습니다.');}
 if(own.length>=2)throw Error('도청 예약은 게임당 2회입니다.');
 const tap:ListeningReservation={id:randomUUID(),gameSessionId:m.id,ownerId:id,targetId:a.targetId,requestId:a.requestId,nightId:m.nightId,bookedDay:m.day,listenDay:m.day+1,at:now,status:'pending'};
 persistListeningReservation(tap);m.communications.listening.push(tap);return{duplicate:false};
}
export function communicationAbilityView(m:MafiaState,id:string){
 if(!m.ids.includes(id)||m.phase==='GAME_END')return undefined;
 const alive=m.alive.includes(id),canAct=alive&&m.phase==='NIGHT'&&Date.now()<m.nightEndsAt;
 if(m.roleById[id]==='blackmailer'){const copy=m.communications.copies.find(x=>x.ownerId===id),sent=m.communications.messages.find(x=>x.ownerId===id);return{kind:'blackmailer',alive,canSend:canAct,canAcquire:canAct&&!copy,copy:copy?{id:copy.id,text:copy.text,submitted:!!sent,sentText:sent?.text}:undefined};}
 if(m.roleById[id]==='eavesdropper'){const own=m.communications.listening.filter(x=>x.ownerId===id);return{kind:'eavesdropper',alive,canReserve:canAct&&!own.some(t=>t.nightId===m.nightId)&&own.length<2,remaining:Math.max(0,2-own.length),targets:canAct?[...m.alive]:[],items:own.map(t=>({id:t.id,targetId:t.targetId,bookedDay:t.bookedDay,listenDay:t.listenDay,status:t.status,text:t.status==='success'?t.text:undefined}))};}
 return undefined;
}
export function privateMessagesView(m:MafiaState,id:string){return m.ids.includes(id)?m.communications.messages.filter(x=>x.recipientId===id).map(x=>({id:x.id,label:'익명의 메시지',text:x.text,day:x.day,read:!!x.readAt})):undefined;}

export function acquireReport(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);if(m.roleById[id]!=='blackmailer')throw Error('협박범만 제보를 입수할 수 있습니다.');
 const previous=m.communications.copies.find(c=>c.ownerId===id);if(previous){if(previous.requestId===a.requestId)return{duplicate:true};throw Error('제보 입수 능력을 이미 사용했습니다.');}
 const eligible=m.anonymousReports.records.filter(r=>r.sourceType!=='hacker'&&r.deliveryStatus==='delivered'&&r.senderPlayerId!==id).sort((a,b)=>b.nightNumber-a.nightNumber||b.receptionOrder-a.receptionOrder||b.reportId.localeCompare(a.reportId));const source=eligible[0];if(!source)throw Error('현재 입수할 수 있는 제보가 없습니다.');
 const copy:CopiedReport={id:randomUUID(),gameSessionId:m.id,ownerId:id,reportId:source.reportId,senderId:source.senderPlayerId,text:source.originalText,at:now,nightId:m.nightId,requestId:a.requestId};persistCopiedReport(copy);m.communications.copies.push(copy);return{duplicate:false};
}
export function readPrivateMessages(m:MafiaState,id:string,a:any,now=Date.now()){
 if(a.roundId!==m.id||!m.ids.includes(id)||a.playerId!==undefined||a.recipientId!==undefined||!Array.isArray(a.messageIds)||a.messageIds.length>100)throw Error('본인 보관함만 확인할 수 있습니다.');
 const own=m.communications.messages.filter(x=>x.recipientId===id);if(a.messageIds.some((x:unknown)=>typeof x!=='string'||!own.some(m=>m.id===x)))throw Error('본인 메시지만 읽음 처리할 수 있습니다.');
 const unread=own.filter(x=>a.messageIds.includes(x.id)&&!x.readAt);persistMessageReads(m.id,id,unread.map(x=>x.id),now);for(const message of unread)message.readAt=now;
}
