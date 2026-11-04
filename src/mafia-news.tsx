import {MafiaIntelligence} from './mafia-intelligence';
import {MafiaCommunications} from './mafia-communications';
import {MafiaInformation} from './mafia-information';
import {useRef,useState} from 'react';
const requestId=()=>globalThis.crypto?.randomUUID?.()||'report-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function MafiaReports({m,players,online,remaining,call}:{m:any;players:any[];online:boolean;remaining:number;call:(a:any)=>Promise<any>}){
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false),pending=useRef<{text:string;id:string}|null>(null),reservations=useRef<Record<string,string>>({});
 const own=m.anonymousReport,inbox=m.journalistInbox,open=m.phase==='NIGHT'&&remaining>0&&online;
 const send=async(a:any)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await call({...a,roundId:m.id,nightId:m.nightId});if(!result?.ok)setError(result?.error||'접수 결과를 확인하지 못했습니다. 다시 시도하세요.');}catch{setError('연결을 확인한 뒤 다시 시도하세요. 동일 요청은 중복 접수되지 않습니다.');}finally{lock.current=false;setBusy(false);}};
 return <div className="mafia-report-tools">
 {own&&<section className="mafia-report-compose" data-testid="anonymous-report"><h3>✉️ 익명 제보</h3><p>사실·추측·거짓말 모두 가능 · 전달과 기사화는 보장되지 않습니다.</p>{own.submitted?<><strong role="status">제보 제출 완료 · 수정 불가</strong><blockquote data-testid="own-report-text">{own.text}</blockquote></>:m.phase==='NIGHT'?<><label>익명 제보 내용<textarea aria-label="익명 제보 내용" placeholder="기자에게 전할 이야기 (최대 150자)" value={text} disabled={!open||!own.canSend||busy} onChange={e=>setText(e.target.value)}/></label><div className="mafia-report-footer"><small>{Array.from(text).length} / 150자</small><button disabled={!open||!own.canSend||busy||!text.trim()||Array.from(text).length>150} onClick={()=>{if(!pending.current||pending.current.text!==text)pending.current={text,id:requestId()};void send({type:'mafia:report',text,requestId:pending.current.id});}}>익명 제보 전송</button></div></>:<p>다음 밤에 제보를 작성할 수 있습니다.</p>}</section>}
 <MafiaIntelligence m={m} players={players} online={online} remaining={remaining} call={call}/>
 <MafiaCommunications m={m} players={players} online={online} remaining={remaining} call={call}/>
 <MafiaInformation m={m} online={online} remaining={remaining} call={call}/>
 {inbox&&<section className="mafia-inbox" data-testid="journalist-inbox"><h3>🗞️ 기자 전용 제보함</h3><p data-testid="news-remaining">게임 전체 남은 기사 {inbox.remaining} / 2회</p><p>원문 그대로 다음 낮 공개 · 예약 후 취소 불가</p><div className="mafia-inbox-items">{inbox.items.length?inbox.items.map((r:any)=><article key={r.id} data-testid="journalist-report"><small>{r.night}번째 밤 · 수신 완료</small><blockquote>{r.text}</blockquote>{r.selected?<strong role="status">{r.status==='published'?'기사 공개 완료':'기사 발행 예약 완료'}</strong>:<button disabled={!open||busy||inbox.remaining===0} onClick={()=>{if(!window.confirm('이 제보 원문을 다음 낮 기사로 공개할까요? 예약 후 수정·취소할 수 없습니다.'))return;reservations.current[r.id]??=requestId();void send({type:'mafia:news:reserve',reportId:r.id,requestId:reservations.current[r.id]});}}>기사 발행 예약</button>}</article>):<p>아직 전달된 제보가 없습니다.</p>}</div></section>}
 {error&&<p role="alert">{error}</p>}
 </div>;
}
export function MafiaNews({news}:{news:any[]}){return news?.length>0?<section className="mafia-news" data-testid="public-news"><h2>📰 공개 뉴스 기록</h2>{news.map(a=><article key={a.id} data-testid="public-article"><h3>{a.day}일차 · {a.label}</h3><blockquote>{a.text}</blockquote><p>익명의 제보를 바탕으로 한 기사이며 사실 여부는 확인되지 않았습니다.</p></article>)}</section>:null;}
