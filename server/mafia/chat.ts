import {activeInfiltration} from './infiltration';
import {persistTeamChat,persistChatRead} from './reports';
import {randomUUID} from 'node:crypto';
import {roles} from './roles';
import type {MafiaState} from './engine';
export const CHAT_MAX_LENGTH=300,CHAT_MAX_MESSAGES=2000,CHAT_RATE_LIMIT=5,CHAT_RATE_WINDOW=5000;
export type MafiaChatMessage={id:string;requestId:string;seq:number;roundId:string;nightId:string;day:number;senderId:string;text:string;at:number;phase?:string};
export type NightChat={messages:MafiaChatMessage[];requests:Map<string,MafiaChatMessage>;sentAt:Map<string,number[]>};
export const createNightChat=():NightChat=>({messages:[],requests:new Map(),sentAt:new Map()});
export function mayUseMafiaChat(m:MafiaState,id:string,_now=Date.now()){return m.rules.mafiaChat&&m.phase!=='GAME_END'&&m.alive.includes(id)&&(roles[m.roleById[id]]?.team==='mafia'||!!activeInfiltration(m,id,_now));}
export function sendMafiaChat(m:MafiaState,id:string,payload:any,now=Date.now()){
 if(!mayUseMafiaChat(m,id,now))throw Error('생존 마피아팀만 비밀 채팅을 사용할 수 있습니다.');
 if(payload?.roundId!==m.id||payload?.nightId!==undefined&&payload.nightId!==m.nightId||payload?.chatId!==undefined&&payload.chatId!==m.id)throw Error('현재 게임과 밤을 확인하세요.');
 if(typeof payload.messageId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(payload.messageId))throw Error('메시지 요청 ID를 확인하세요.');
 if(typeof payload.text!=='string')throw Error('메시지를 입력하세요.');const text=payload.text.trim();
 if(!text||!text.replace(/[\s\u200B-\u200D\uFEFF]/g,''))throw Error('빈 메시지는 보낼 수 없습니다.');
 if(Array.from(text).length>CHAT_MAX_LENGTH)throw Error('메시지는 최대 300자입니다.');
 if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text))throw Error('지원하지 않는 제어 문자가 포함되어 있습니다.');
 const chat=m.teamChat;if(!chat)throw Error('현재 밤 채팅을 찾을 수 없습니다.');const key=id+':'+payload.messageId,previous=chat.requests.get(key);
 if(previous){if(previous.text!==text)throw Error('같은 요청 ID의 내용을 변경할 수 없습니다.');return{message:previous,duplicate:true};}
 const times=(chat.sentAt.get(id)||[]).filter(at=>now-at<CHAT_RATE_WINDOW);
 if(times.length>=CHAT_RATE_LIMIT)throw Error('메시지는 5초에 5개까지 보낼 수 있습니다. 잠시 기다려 주세요.');
 if(chat.messages.length>=CHAT_MAX_MESSAGES)throw Error('게임 채팅은 최대 2000개입니다.');
 const message:MafiaChatMessage={id:randomUUID(),requestId:payload.messageId,seq:chat.messages.length+1,roundId:m.id,nightId:m.nightId,day:m.day,senderId:id,text,at:now,phase:m.phase};
 persistTeamChat(message);chat.messages.push(message);if(m.phase==='NIGHT')m.privateChats[m.nightId]?.messages.push(message);chat.requests.set(key,message);times.push(now);chat.sentAt.set(id,times);return{message,duplicate:false};
}
export function mafiaChatView(m:MafiaState,id:string){if(!mayUseMafiaChat(m,id))return undefined;const cursor=activeInfiltration(m,id)?.startSeq??0,readSeq=Math.max(cursor,m.teamChat.readBy[id]||0),messages=m.teamChat.messages.filter(x=>x.seq>cursor);return{id:m.id,nightId:m.nightId,day:m.day,readSeq,unreadCount:messages.filter(x=>x.seq>readSeq&&x.senderId!==id).length,messages:messages.map(x=>({id:x.id,seq:x.seq,day:x.day,phase:x.phase,text:x.text,label:'마피아',mine:x.senderId===id}))};}
export function readMafiaChat(m:MafiaState,id:string,a:any){
 if(!mayUseMafiaChat(m,id)||a.roundId!==m.id||a.playerId!==undefined||!Number.isInteger(a.seq)||a.seq<0||a.seq>m.teamChat.messages.length)throw Error('본인 채팅의 읽음 위치를 확인하세요.');
 const seq=Math.max(m.teamChat.readBy[id]||0,a.seq);persistChatRead(m.id,id,seq);m.teamChat.readBy[id]=seq;
}
