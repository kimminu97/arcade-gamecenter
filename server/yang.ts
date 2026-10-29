import {randomInt,randomUUID} from 'node:crypto';import topics from './yang-words.json';import type{Room} from './game';
import {assertYangBank,type YangTopic} from './yang-bank';
assertYangBank(topics);
export const yangTopics:YangTopic[]=topics;
export function yangCatalog(){return yangTopics.map(t=>({id:t.id,topic:t.topic,group:t.group??'기타',wordCount:t.words.length,easyCount:t.easyCount??0,normalCount:t.normalCount??0}));}
export type YangMember={id:string;name:string;avatar:string};
export type YangRound={choosing:boolean;number:number;topicId:string;topic:string;members:YangMember[];assignments:Record<string,string>;revealed:Record<string,boolean>};
function shuffle<T>(rows:T[]){const a=[...rows];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function setYangRoster(room:Room,names:unknown){
 if(room.round&&room.round.phase!=='result')throw Error('게임을 종료한 뒤 참가자를 변경하세요.');
 if(!Array.isArray(names)||names.length<5||names.length>7||names.some(n=>typeof n!=='string'||!n.trim()||n.trim().length>12))throw Error('참가자 이름을 5~7명, 각각 1~12자로 입력하세요.');
 const clean=names.map(n=>n.trim());if(new Set(clean.map(n=>n.normalize('NFKC').toLowerCase())).size!==clean.length)throw Error('서로 다른 참가자 이름을 입력하세요.');
 room.yangRoster=clean.map((name,i)=>({id:randomUUID(),name,avatar:['🐱','🐶','🐸','🐼','🦊','🐻','🐰'][i]}));
}
export function yangMembers(room:Room){const connected=room.players.filter(p=>p.online&&!p.excluded).map(p=>({id:p.id,name:p.name,avatar:p.avatar}));return connected.length>=5?connected:room.yangRoster??connected;}
function current(room:Room,roundId:string){const g=room.round;if(!g||g.mode!=='yang'||g.id!==roundId||!g.yang)throw Error('현재 양세찬 라운드를 확인하세요.');return g.yang;}
export function setYangReveal(room:Room,roundId:string,playerId:string,revealed:unknown){const y=current(room,roundId);if(y.choosing)throw Error('주제를 먼저 선택하세요.');if(typeof revealed!=='boolean'||!y.members.some(p=>p.id===playerId))throw Error('카드와 공개 상태를 확인하세요.');y.revealed[playerId]=revealed;}
export function hideYang(room:Room,roundId:string){const y=current(room,roundId);if(y.choosing)throw Error('주제를 먼저 선택하세요.');y.revealed={};}
export function setYangChoosing(room:Room,roundId:string,choosing:unknown){const y=current(room,roundId);if(typeof choosing!=='boolean'||(!choosing&&!y.topicId))throw Error('먼저 주제를 선택하세요.');y.choosing=choosing;}
export function prepareYang(members:YangMember[]):YangRound{return{choosing:true,number:0,topicId:'',topic:'',members,assignments:{},revealed:{}};}
export function makeYangRound(room:Room,members:YangMember[],number:number,topicId:string):YangRound{
 const topic=yangTopics.find(t=>t.id===topicId);if(!topic)throw Error('등록된 주제를 선택하세요.');if(topic.words.length<members.length)throw Error('이 주제의 제시어가 참가자 수보다 부족합니다.');
 room.yangUsed??={};const used=(room.yangUsed[topic.id]??[]).filter(w=>topic.words.includes(w)),previous=new Set(Object.values(room.round?.yang?.assignments??{}));
 const available=topic.words.filter(w=>!used.includes(w)),fresh=[...shuffle(available.filter(w=>!previous.has(w))),...shuffle(available.filter(w=>previous.has(w)))];
 let words:string[],cycleUsed:string[];
 if(fresh.length>=members.length){words=fresh.slice(0,members.length);cycleUsed=[...used,...words];}
 else{
  // Finish the old cycle first, then shuffle a new cycle. Never repeat within this deal.
  const rest=topic.words.filter(w=>!fresh.includes(w)),pool=[...shuffle(rest.filter(w=>!previous.has(w))),...shuffle(rest.filter(w=>previous.has(w)))];
  const renewed=pool.slice(0,members.length-fresh.length);words=[...fresh,...renewed];cycleUsed=renewed;
 }
 room.yangUsed[topic.id]=cycleUsed;return{choosing:false,number,topicId:topic.id,topic:topic.topic,members,assignments:Object.fromEntries(members.map((p,i)=>[p.id,words[i]])),revealed:{}};
}
export function yangView(room:Room,viewer:string,host=false){const g=room.round,y=g?.yang;if(!y)return undefined;
 const participant=!!g?.ids.includes(viewer)&&y.members.some(p=>p.id===viewer)&&room.players.some(p=>p.id===viewer&&!p.excluded);
 return{number:y.number,topicId:y.topicId,topic:y.topic,choosing:y.choosing,tvOnly:host,participating:host||participant,topics:host&&y.choosing?yangCatalog().map(t=>({...t,enabled:t.wordCount>=y.members.length})):undefined,members:host?y.members.map(p=>({...p,revealed:!y.choosing&&!!y.revealed[p.id],word:!y.choosing&&y.revealed[p.id]?y.assignments[p.id]:null})):participant?y.members.map(p=>({...p,revealed:undefined,isSelf:p.id===viewer,word:p.id===viewer?null:y.assignments[p.id]??null})):[]};
}
