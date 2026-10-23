import questions from './spy-questions.json';
export type AnswerType='yes_no'|'player'|'number'|'text'|'balance';
export type SpyQuestion={id:string;category:string;answerType:AnswerType;normalQuestion:string;spyQuestion:string;unit?:string;min?:number;max?:number;options?:string[]};
export const spyQuestions=questions as SpyQuestion[];
// Shared answer contracts never contain question IDs, category, role or paired text.
export function answerContract(q:SpyQuestion){return{type:q.answerType,unit:q.unit,min:q.min,max:q.max,options:q.answerType==='yes_no'?['예','아니오']:q.options};}
export function quality(q:SpyQuestion){
 const a=q.normalQuestion,b=q.spyQuestion,words=(s:string)=>new Set(s.replace(/[?.,()]/g,'').split(/\s+/));
 const x=words(a),y=words(b),overlap=[...x].filter(w=>y.has(w)).length/Math.max(x.size,y.size);
 const unitIn=(s:string)=>!!q.unit&&(s.includes(q.unit)||(q.unit==='%'&&s.includes('퍼센트'))||(q.unit==='일'&&s.includes('며칠')));
 const checks={related:overlap>=.28,distinct:a!==b,readable:a.length>=20&&b.length>=20&&a.length<=110&&b.length<=110,contract:q.answerType==='number'?unitIn(a)&&unitIn(b):q.answerType==='balance'?q.options?.length===2:q.answerType==='player'?a.includes('여기서')&&b.includes('여기서'):true};
 return{score:Object.values(checks).filter(Boolean).length*25,checks};
}
export function selectSpy(used:string[]){const free=spyQuestions.filter(q=>!used.includes(q.id));if(!free.length)throw Error('스파이 질문 100세트를 모두 사용했습니다. 전체 초기화 후 새 세션을 시작하세요.');return free;}
export function validateSpyAnswer(contract:ReturnType<typeof answerContract>,value:unknown,players:{id:string;name:string}[]){
 if(contract.type==='player'){const p=players.find(p=>p.id===value);if(!p)throw Error('현재 라운드 참가자를 선택하세요.');return p.name;}
 if(contract.type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||!Number.isInteger(value)||value<(contract.min??0)||value>(contract.max??1000000))throw Error('표시된 범위의 정수를 입력하세요.');return `${value}${contract.unit}`;}
 const text=typeof value==='string'?value.trim():'';
 if(!text||text.length>80)throw Error('답변은 1~80자입니다.');
 if(contract.options&&!contract.options.includes(text))throw Error('표시된 답변 중 선택하세요.');return text;
}
