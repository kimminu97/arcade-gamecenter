import{useRef,useState}from'react';
export function MafiaCitizenAbility({m,players,online,call}:{m:any;players:any[];online:boolean;call:(a:any)=>Promise<any>}){
 const [target,setTarget]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false),request=useRef('');
 const s=m.citizenAbility;if(!s)return null;
 const name=(id:string)=>players.find(p=>p.id===id)?.name||'참가자';
 const label=s.kind==='voteBlocker'?'투표 봉쇄':s.kind==='voteAppraiser'?'투표 감정':'방패 지급';
 const send=async()=>{if(lock.current||!online||!s.canSend||!s.targets.includes(target)||!window.confirm(`${name(target)}님에게 ${label}을 확정할까요? 게임당 1회이며 변경할 수 없습니다.`))return;lock.current=true;setBusy(true);setError('');request.current ||= globalThis.crypto?.randomUUID?.()||'citizen-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);try{const out=await call({type:'mafia:citizen:action',roundId:m.id,day:m.day,nightId:m.nightId,requestId:request.current,targetId:target});if(!out?.ok)setError(out?.error||'능력 접수 결과를 확인하세요.');}catch{setError('연결을 확인한 뒤 다시 시도하세요.');}finally{lock.current=false;setBusy(false);}};
 return <section className="mafia-inbox" data-testid="citizen-ability"><h3>{label}</h3><p>게임 전체 남은 사용 {s.remaining} / 1회</p>
  {s.submitted?<p role="status">사용 완료 · {name(s.selectedTargetId)}{s.kind==='voteAppraiser'?' · 해당 낮 투표 마감 후 결과 확인':''}</p>:s.canSend?<><label>{label} 대상 선택<select aria-label={label+' 대상 선택'} value={target} disabled={!online||busy} onChange={e=>{setTarget(e.target.value);request.current='';}}><option value="">생존 참가자 선택</option>{s.targets.map((id:string)=><option key={id} value={id}>{name(id)}</option>)}</select></label><button disabled={!online||busy||!s.targets.includes(target)} onClick={()=>void send()}>{label} 확정</button></>:<p>{s.kind==='shieldMaker'?'밤에 다른 생존자에게 방패를 지급할 수 있습니다.':'낮 토론 중 다른 생존자를 지정할 수 있습니다.'}</p>}
  {s.results.map((r:any)=><article key={r.actionId} data-testid="vote-appraisal"><p>{r.day}일차 · {r.votedFor?`${name(r.targetId)}님의 실제 투표 대상은 ${name(r.votedFor)}님입니다.`:'기권'}</p></article>)}
  {s.shield.map((x:any)=><p key={x.actionId} data-testid="own-shield">{name(x.targetId)} · {x.status==='active'?'방패 유지':x.status==='consumed'?'방패 사용 완료':'방패 소멸'}</p>)}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
