import {useRef,useState} from 'react';
export function MafiaRevenge({m,players,online,clock,call}:{m:any;players:any[];online:boolean;clock:number;call:(a:any)=>Promise<any>}){
 const x=m.revenge,[target,setTarget]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false),request=useRef<{target:string;id:string}|null>(null);
 if(!x||m.phase!=='REVENGE_PENDING')return null;
 const seconds=Math.max(0,Math.ceil((x.endsAt-clock)/1000)),name=(id:string)=>players.find(p=>p.id===id)?.name||'참가자';
 const submit=async()=>{
  if(lock.current||!online||!x.canSend||!seconds||!x.candidates.includes(target))return;
  if(!window.confirm(`${name(target)} 님이 마피아라고 최종 추측할까요? 제출 후 수정할 수 없습니다.`))return;
  lock.current=true;setBusy(true);setError('');
  if(request.current?.target!==target)request.current={target,id:globalThis.crypto?.randomUUID?.()||'revenge-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)};
  try{const out=await call({type:'mafia:revenge',roundId:m.id,executionId:x.executionId,requestId:request.current!.id,targetId:target});if(!out?.ok)setError(out?.error||'추측을 확정하지 못했습니다.');}catch{setError('연결을 확인한 뒤 다시 시도하세요.');}finally{lock.current=false;setBusy(false);}
 };
 return <section className="mafia-private" data-testid="mafia-revenge"><h3>복수귀 — 마지막 추측</h3><p>날 죽인 사람들 중 마피아가 누구지?</p><strong role="timer" data-testid="revenge-seconds">남은 시간: 00:{String(seconds).padStart(2,'0')}</strong><p>사망 상태입니다. 마지막 추측만 할 수 있습니다.</p>
 <label>나에게 투표한 참가자<select aria-label="마지막 추측 대상" value={target} disabled={!online||busy||!seconds||!x.canSend} onChange={e=>setTarget(e.target.value)}><option value="">참가자 선택</option>{x.candidates.map((id:string)=><option key={id} value={id}>{name(id)}</option>)}</select></label>
 {target&&<p>선택한 참가자: <strong>{name(target)}</strong></p>}<button className="yellow" disabled={!online||busy||!seconds||!x.canSend||!x.candidates.includes(target)} onClick={()=>void submit()}>최종 추측 확정</button>{!seconds&&<p>시간 종료 · 서버 판정 대기</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
