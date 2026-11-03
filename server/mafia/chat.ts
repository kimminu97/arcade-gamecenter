import {randomUUID} from 'node:crypto';
import {roles} from './roles';
import type {MafiaState} from './engine';
export const CHAT_MAX_LENGTH=300,CHAT_MAX_MESSAGES=200,CHAT_RATE_LIMIT=5,CHAT_RATE_WINDOW=5000;
export type MafiaChatMessage={id:string;requestId:string;seq:number;roundId:string;nightId:string;day:number;senderId:string;text:string;at:number};
export type NightChat={messages:MafiaChatMessage[];requests:Map<string,MafiaChatMessage>;sentAt:Map<string,number[]>};
export const createNightChat=():NightChat=>({messages:[],requests:new Map(),sentAt:new Map()});
export function mayUseMafiaChat(m:MafiaState,id:string,now=Date.now()){return m.phase==='NIGHT'&&now<m.nightEndsAt&&m.alive.includes(id)&&roles[m.roleById[id]]?.team==='mafia';}
export function sendMafiaChat(m:MafiaState,id:string,payload:any,now=Date.now()){
 if(!mayUseMafiaChat(m,id,now))throw Error('밤의 생존 마피아팀만 비밀 채팅을 사용할 수 있습니다.');
 if(payload?.roundId!==m.id||payload?.nightId!==m.nightId)throw Error('현재 게임과 밤을 확인하세요.');
 if(typeof payload.messageId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(payload.messageId))throw Error('메시지 요청 ID를 확인하세요.');
 if(typeof payload.text!=='string')throw Error('메시지를 입력하세요.');const text=payload.text.trim();
 if(!text||!text.replace(/[\s\u200B-\u200D\uFEFF]/g,''))throw Error('빈 메시지는 보낼 수 없습니다.');
 if(Array.from(text).length>CHAT_MAX_LENGTH)throw Error('메시지는 최대 300자입니다.');
 if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text))throw Error('지원하지 않는 제어 문자가 포함되어 있습니다.');
 const chat=m.privateChats[m.nightId];if(!chat)throw Error('현재 밤 채팅을 찾을 수 없습니다.');const key=id+':'+payload.messageId,previous=chat.requests.get(key);
 if(previous){if(previous.text!==text)throw Error('같은 요청 ID의 내용을 변경할 수 없습니다.');return{message:previous,duplicate:true};}
 const times=(chat.sentAt.get(id)||[]).filter(at=>now-at<CHAT_RATE_WINDOW);
 if(times.length>=CHAT_RATE_LIMIT)throw Error('메시지는 5초에 5개까지 보낼 수 있습니다. 잠시 기다려 주세요.');
 if(chat.messages.length>=CHAT_MAX_MESSAGES)throw Error('이번 밤 채팅은 최대 200개입니다.');
 const message:MafiaChatMessage={id:randomUUID(),requestId:payload.messageId,seq:chat.messages.length+1,roundId:m.id,nightId:m.nightId,day:m.day,senderId:id,text,at:now};
 chat.messages.push(message);chat.requests.set(key,message);times.push(now);chat.sentAt.set(id,times);return{message,duplicate:false};
}
export function mafiaChatView(m:MafiaState,id:string){if(!mayUseMafiaChat(m,id))return undefined;return{nightId:m.nightId,day:m.day,messages:(m.privateChats[m.nightId]?.messages||[]).map(({requestId,...message})=>message)};}
