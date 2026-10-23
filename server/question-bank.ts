import {randomInt} from 'node:crypto';
import data from './questions.json';import {spyQuestions} from './spy-bank';import type {Room} from './game';
export type ManagedGame='court'|'spy';
export const courtQuestions=data.court;
for(const [mode,rows] of Object.entries({court:courtQuestions,spy:spyQuestions}))if(rows.some(q=>!q.id)||new Set(rows.map(q=>q.id)).size!==rows.length)throw Error(`${mode} 질문 ID가 없거나 중복됩니다.`);
export const wordQuestions=data.words.map((text,i)=>({id:`word-${String(i+1).padStart(3,'0')}`,text}));
export interface QuestionState {disabled:(mode:string,id:string)=>boolean;set:(mode:ManagedGame,id:string,disabled:boolean)=>{changed:boolean};}
let state:QuestionState|undefined;
export function configureQuestionState(next?:QuestionState){state=next;}
export function isQuestionDisabled(mode:string,id:string){return state?.disabled(mode,id)??false;}
export function managedGame(value:unknown):ManagedGame{if(value!=='court'&&value!=='spy')throw Error('친구 재판 또는 스파이 찾기를 선택하세요.');return value;}
export function catalog(mode:ManagedGame){return mode==='court'?courtQuestions:spyQuestions;}
export function setQuestionDisabled(mode:ManagedGame,id:string,disabled:boolean){if(!catalog(mode).some(q=>q.id===id))throw Error('질문 ID를 찾을 수 없습니다.');if(!state)throw Error('질문 상태 저장소가 준비되지 않았습니다.');return state.set(mode,id,disabled);}
export function bankPage(mode:ManagedGame,query:any={}){
 const all=catalog(mode).map(q=>({...q,disabled:isQuestionDisabled(mode,q.id)})),term=String(query.search||'').trim().toLocaleLowerCase(),status=String(query.status||'');if(status&&!['active','excluded'].includes(status))throw Error('질문 상태를 확인하세요.');
 const filtered=all.filter(q=>(!status||(status==='excluded')===q.disabled)&&(!term||[q.id,...('text'in q?[q.text]:[q.normalQuestion,q.spyQuestion])].some(s=>String(s).toLocaleLowerCase().includes(term)))),total=filtered.length,offset=total?Math.min(Math.max(0,Math.floor((Number(query.offset)||0)/50))*50,Math.floor((total-1)/50)*50):0;
 return {items:filtered.slice(offset,offset+50),total,offset,limit:50,counts:{total:all.length,active:all.filter(q=>!q.disabled).length,excluded:all.filter(q=>q.disabled).length}};
}
export function purgeQuestionDecks(rooms:Iterable<Room>,mode:string,id:string){for(const room of rooms)if(room.questionDecks?.[mode])room.questionDecks[mode]=room.questionDecks[mode].filter(key=>key!==id);}
function shuffled<T>(values:T[]){const a=[...values];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function drawQuestion<T extends{id:string}>(room:Room,mode:string,rows:T[]):T{
 const used=new Set(mode==='spy'?room.spyUsed||[]:room.bankUsed?.[mode]||[]),active=rows.filter(q=>!isQuestionDisabled(mode,q.id)),free=active.filter(q=>!used.has(q.id));
 if(!free.length)throw Error(!active.length?'활성 질문이 없습니다. 관리자에서 질문을 복구하세요.':mode==='spy'?'스파이 질문 100세트를 모두 사용했습니다. 전체 초기화 후 새 세션을 시작하세요.':'이 게임의 질문을 모두 사용했습니다. 전체 초기화 후 새 세션을 시작하세요.');
 room.questionDecks??={};const eligible=new Set(free.map(q=>q.id)),prior=room.questionDecks[mode],remaining=(prior||[]).filter(id=>eligible.has(id));const queued=new Set(remaining),added=free.filter(q=>!queued.has(q.id)).map(q=>q.id);const deck=prior?[...remaining,...shuffled(added)]:shuffled(added),id=deck.shift()!;room.questionDecks[mode]=deck;
 if(mode==='spy')room.spyUsed=[...(room.spyUsed||[]),id];else{room.bankUsed??={};room.bankUsed[mode]=[...(room.bankUsed[mode]||[]),id];}
 return rows.find(q=>q.id===id)!;
}
