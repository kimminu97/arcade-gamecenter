import {useRef,useState} from 'react';
export function MafiaNeutralAbility({m,players,online,call}:{m:any;players:any[];online:boolean;call:(a:any)=>Promise<any>}){
 const x=m.neutralAbility,[target,setTarget]=useState(''),[role,setRole]=useState(''),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false),request=useRef<{key:string;id:string}|null>(null);
 if(!x)return null;
 const name=(id:string)=>players.find(p=>p.id===id)?.name||'참가자',roleName=(id:string)=>x.roleOptions?.find((r:any)=>r.roleId===id)?.roleName||id;
 const submit=async()=>{
  if(lock.current||!online||!x.canSend)return;
  if(!window.confirm(x.roleId==='swindler'?`${name(target)} → ${roleName(role)}\n추측을 확정할까요? 수정할 수 없습니다.`:`${name(target)} 님에게 표식을 남길까요? 이번 밤에는 변경하거나 취소할 수 없습니다.`))return;
  lock.current=true;setBusy(true);setError('');
  const key=[m.id,m.nightId,target,role].join(':');if(request.current?.key!==key)request.current={key,id:globalThis.crypto?.randomUUID?.()||'neutral-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)};
  try{const out=await call({type:'mafia:neutral:action',roundId:m.id,nightId:m.nightId,requestId:request.current!.id,targetId:target,...(x.roleId==='swindler'?{guessedRoleId:role}:{})});if(!out?.ok)setError(out?.error||'확정에 실패했습니다.');}catch{setError('연결을 확인한 뒤 다시 시도하세요.');}finally{lock.current=false;setBusy(false);}
 };
 return <section className="mafia-private" data-testid="mafia-neutral-ability"><h3>{x.roleId==='swindler'?'🎭 직업 추측':x.roleId==='parasite'?'🦠 기생충의 표식':x.roleId==='bomber'?'💣 폭탄 표식':'🎲 도박사'}</h3>
 {x.roleId==='bomber'?<p data-testid="bomb-mark">현재 표식: {x.bombMark?name(x.bombMark.targetId)+(x.bombMark.alive?' · 생존':' · 사망 · 무효'):'없음'} · {x.canSend?'오늘 밤 지정 가능':x.remaining===0?'이번 밤 지정 확정':'현재 지정 불가'}</p>:<strong data-testid="neutral-progress">{x.roleId==='swindler'?'현재 정답':x.roleId==='parasite'?'표적 사망':'성공'}: {x.successes} / 2</strong>}{x.remaining!==null&&<p>남은 {x.roleId==='swindler'?'추측':'표식'}: {x.remaining} / {x.roleId==='bomber'?1:x.roleId==='swindler'?3:2}회</p>}
 {x.guesses?.map((g:any)=><p key={g.targetId}>{g.day}일차 · {name(g.targetId)} → {roleName(g.guessedRoleId)} · {g.resolved?(g.correct?'정답':'오답'):'확정 제출 · 밤 판정 대기'}</p>)}
 {x.marks?.map((g:any)=><p key={g.targetId}>{g.day}일차 표식 · {name(g.targetId)} — {g.alive?'생존':'사망'}</p>)}
 {x.ballots?.map((b:any)=><p key={b.id}>{b.day}일차 낮 — {b.success?'성공':'실패'} · {b.selfVote?'자기 투표':'자기 투표 아님'} · {b.wasCancelled?'처형 취소':b.executedPlayerId?name(b.executedPlayerId)+' 처형':'처형 없음'}</p>)}
 {x.roleId==='gambler'?<p>자신에게 투표하고 다른 사람이 실제 처형되는 낮을 두 번 만드세요. 기존 낮 투표 버튼을 사용합니다.</p>:x.canSend?<>
 <label>대상 선택<select aria-label="중립 능력 대상" value={target} onChange={e=>setTarget(e.target.value)} disabled={busy||!online}><option value="">다른 생존 참가자 선택</option>{x.targets.map((id:string)=><option key={id} value={id}>{name(id)}</option>)}</select></label>
 {target&&<p>선택한 참가자: <strong>{name(target)}</strong></p>}
 {target&&x.roleId==='swindler'&&<><label>직업 검색<input aria-label="추측 직업 검색" value={search} onChange={e=>setSearch(e.target.value)} placeholder="직업 이름 검색"/></label><label>정확한 직업<select aria-label="추측 직업" value={role} onChange={e=>setRole(e.target.value)} disabled={busy||!online}><option value="">정확한 직업 선택</option>{[['mafia','마피아팀'],['town','시민팀'],['neutral','중립팀']].map(([team,label])=><optgroup label={label} key={team}>{x.roleOptions.filter((r:any)=>r.team===team&&r.roleName.includes(search)).map((r:any)=><option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}</optgroup>)}</select></label><small>실제 배정과 무관한 전체 활성 직업 목록입니다.</small></>}
 <button className="yellow" disabled={!online||busy||!x.targets.includes(target)||x.roleId==='swindler'&&!role} onClick={()=>void submit()}>{x.roleId==='swindler'?'추측 확정':'표식 확정'}</button>
 </>:<p>현재 밤의 제출을 마쳤거나 다음 행동 가능한 밤을 기다리는 중입니다.</p>}
 {error&&<p role="alert">{error}</p>}
 </section>;
}
