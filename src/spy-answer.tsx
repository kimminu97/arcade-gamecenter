import {useState} from 'react';
type Contract={type:string;options?:string[];unit?:string;min?:number;max?:number};
export function SpyAnswer({contract:c,players,online,submit}:{contract:Contract;players:{id:string;name:string;avatar:string}[];online:boolean;submit:(value:string|number)=>unknown}){
 const[value,setValue]=useState('');
 return <form className="submission" data-answer-type={c.type} onSubmit={e=>{e.preventDefault();submit(c.type==='number'?Number(value):value);}}>
 <p>다른 사람에게 질문을 보여주지 마세요. 이유는 제출 후 토론해 주세요.</p>
 {c.type==='player'?<label>현재 참가자 선택<select required aria-label="답변 참가자" value={value} onChange={e=>setValue(e.target.value)}><option value="">선택하세요</option>{players.map(p=><option key={p.id} value={p.id}>{p.avatar} {p.name}</option>)}</select></label>:c.options?<label>비밀 답변<select required aria-label="비밀 답변" value={value} onChange={e=>setValue(e.target.value)}><option value="">선택하세요</option>{c.options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>:<label>{c.type==='number'?`숫자 입력 · ${c.unit} (${c.min}~${c.max})`:'짧은 답변 (최대 80자)'}<input required aria-label="비밀 답변" autoComplete="off" type={c.type==='number'?'number':'text'} inputMode={c.type==='number'?'numeric':'text'} min={c.min} max={c.max} step={c.type==='number'?1:undefined} maxLength={80} value={value} onChange={e=>setValue(e.target.value)}/></label>}
 <button className="yellow" disabled={!online||!value}>비밀 제출 →</button></form>;
}
