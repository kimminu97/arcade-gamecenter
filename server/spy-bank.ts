import questions from './spy-questions.json';
export type AnswerType='yes_no'|'player'|'number'|'text'|'balance';
export type SpyQuestion={id:string;category:string;commonTopic:string;answerType:AnswerType;normalQuestion:string;spyQuestion:string;unit?:string;min?:number;max?:number;options?:string[]};
export const spyQuestions=questions as SpyQuestion[];
// Every player gets the same optional opinion contract, without role-dependent choices.
export function answerContract(_q:SpyQuestion){return{type:'text' as const,optional:true,maxLength:200,unit:undefined as string|undefined,min:undefined as number|undefined,max:undefined as number|undefined,options:undefined as string[]|undefined};}
export function quality(q:SpyQuestion){const checks={topic:!!q.commonTopic&&q.commonTopic.length>=10,distinct:q.normalQuestion!==q.spyQuestion,readable:[q.normalQuestion,q.spyQuestion].every(s=>s.length>=15&&s.length<=130),discussion:q.answerType==='text'&&!q.options&&!q.unit};return{score:Object.values(checks).filter(Boolean).length*25,checks};}
export function selectSpy(used:string[]){const free=spyQuestions.filter(q=>!used.includes(q.id));if(!free.length)throw Error('스파이 질문 100세트를 모두 사용했습니다. 전체 초기화 후 새 세션을 시작하세요.');return free;}
export function validateSpyAnswer(_contract:ReturnType<typeof answerContract>,value:unknown,_players:{id:string;name:string}[]){const text=typeof value==='string'?value.trim():'';if(!text||text.length>200)throw Error('선택 의견은 1~200자로 입력하세요.');return text;}
