import type{ChatBubble}from'./presentation';
import{randomUUID,randomInt}from'node:crypto';import type{Room}from'../game';
export const chatModes:Record<string,string[]>={'guess-speaker':['speaker','sequence'],'chat-cringe':['cringe'],'chat-defend':['defend'],'chat-battle':['battle'],'chat-year':['year'],'chat-blank':['blank'],'chat-habit':['habit']};
export type Quiz={compact?:boolean;displayMessages?:ChatBubble[];revealMessages?:ChatBubble[];date?:string;questionId:string;type:string;prompt:string;original:string;options:{id:string;label:string}[];correct:string;authorId:string|null;authorName:string;sources:number[];explanation:string;votes:Record<string,number>};
let picker:((r:Room,types:string[],roundId:string)=>Quiz)|undefined;
let reveal:((r:Room,id:string)=>ChatBubble[])|undefined;
export function configureQuiz(fn:typeof picker,context?:typeof reveal){picker=fn;reveal=context;}
export function loadQuizContext(r:Room,roundId:string){if(!r.round||r.round.id!==roundId||r.round.phase!=='result'||!r.round.quiz||!reveal)throw Error('정답 공개 후 현재 문제의 대화만 볼 수 있습니다.');return reveal(r,r.round.quiz.questionId);}
export function pickQuiz(r:Room,mode:string,roundId:string){if(!picker)throw Error('카카오톡 문제은행을 먼저 준비하세요.');return picker(r,chatModes[mode],roundId);}
export function shuffle<T>(items:T[]){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function quizChoice(label:string){return{id:randomUUID(),label};}
