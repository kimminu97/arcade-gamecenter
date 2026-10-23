import {motion,useReducedMotion} from 'motion/react';
export function CourtResult({result:r,players}:{result:any;players:any[]}){
 const reduced=useReducedMotion(),label=(id:string)=>{const p=players.find(p=>p.id===id);return p?`${p.avatar} ${p.name}`:'참가자';},names=(ids:string[])=>ids.map(label).join(', ')||'없음';
 const animation=(step:number)=>({initial:{opacity:0,y:8},animate:{opacity:1,y:0},transition:{delay:reduced?0:step*.22,duration:reduced?0:.2}});
 return <section className="court-results" data-testid="court-results">
 <h3>⚖️ 친구 재판 · 투표 결과</h3><div>{Object.entries(r.voteCounts).map(([id,n]:[string,any])=><div className="result-row" data-testid="court-vote-row" data-player-id={id} key={id}><div><b>{label(id)}</b><span>{n}표</span></div><motion.div className="bar" initial={{width:0}} animate={{width:`${Math.max(0,n/Math.max(1,r.validVoteCount)*100)}%`}} transition={{duration:reduced?0:.35}}/><small>예측: {r.predictions[id]?'😎 내가 1위다':'🙅 나는 아니다'}{r.missingPredictionPlayerIds.includes(id)?' (미제출 기본값)':''}</small></div>)}</div>
 {r.isInvalidRound?<p role="status" data-testid="court-invalid">유효 투표 0개 · 무효 라운드입니다. 벌칙과 점수는 없습니다.</p>:<>
 <motion.div {...animation(1)}><h4>최다 득표자 · {r.highestVoteCount}표</h4><p data-testid="court-top">{names(r.topVotedPlayerIds)}</p>{r.isTie&&<strong>공동 최다 득표입니다!</strong>}</motion.div>
 <motion.div {...animation(2)}><h4>최다 득표 예측 성공자</h4><p data-testid="court-success">{names(r.successfulPredictorIds)}</p></motion.div>
 <motion.h3 {...animation(3)} data-testid="court-verdict">{r.successfulPredictorIds.length?'재판 결과 뒤집기 성공!':'예측 실패! 벌칙 대상 확정!'}</motion.h3>
 <motion.div {...animation(4)}><h4>벌칙 대상</h4><div data-testid="court-penalties">{r.penaltyPlayerIds.length?r.penaltyPlayerIds.map((id:string)=><p className="notice" data-player-id={id} key={id}>{label(id)}</p>):'없음'}</div><p>벌칙과 종합 점수는 별도로 판정합니다.</p></motion.div>
 </>}
 </section>;
}
