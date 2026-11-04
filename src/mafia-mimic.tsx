import {useRef,useState} from 'react';
export function MafiaMimic({m,online,call}:{m:any;online:boolean;call:(a:any)=>Promise<any>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef<{night:string;id:string}|null>(null),x=m.infiltration;
 if(!x)return null;
 const enter=async()=>{if(busy)return;setBusy(true);setError('');if(request.current?.night!==m.nightId)request.current={night:m.nightId,id:globalThis.crypto?.randomUUID?.()||'infiltrate-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)};try{const out=await call({type:'mafia:infiltrate',roundId:m.id,nightId:m.nightId,requestId:request.current!.id});if(!out?.ok)setError(out?.error||'잠입에 실패했습니다.');}catch{setError('연결을 확인하고 다시 시도하세요.');}finally{setBusy(false);}};
 return <section className="mafia-private" data-testid="mafia-mimic"><h3>흉내쟁이 · 남은 잠입 {x.remaining} / 2회</h3>{x.active?<p>잠입 중 · 잠입 이후 메시지만 보입니다. 습격 투표권은 없습니다.</p>:x.canSend?<button disabled={!online||busy} onClick={()=>void enter()}>마피아 채팅 잠입</button>:<p>잠입 종료 또는 대기 중 · 다음 밤에 남은 횟수로 다시 잠입할 수 있습니다.</p>}{error&&<p role="alert">{error}</p>}</section>;
}
