export const mafiaPhaseLabels:Record<string,string>={ROLE_REVEAL:'직업 확인',NIGHT:'밤 · 비밀 행동',DAY_ANNOUNCEMENT:'밤 사건 결과',DAY_DISCUSSION:'낮 · 자유 토론',DAY_VOTE:'낮 · 처형 투표',EXECUTION_PENDING:'처형 결과 확인 중',REVENGE_PENDING:'복수귀의 마지막 선택 진행 중',DAY_RESOLUTION:'투표 결과',GAME_END:'게임 종료'};
export function publicTvClock(m:any,deadline:number,now:number){
 const end=m.phase==='NIGHT'?m.nightEndsAt:m.phase==='EXECUTION_PENDING'?m.executionPending?.endsAt:m.phase==='REVENGE_PENDING'?deadline:0;
 const seconds=end?Math.max(0,Math.ceil((end-now)/1000)):null;
 const label=m.phase==='NIGHT'?'밤 행동 남은 시간':m.phase==='EXECUTION_PENDING'?'처형 확정까지 남은 시간':m.phase==='REVENGE_PENDING'?'마지막 선택 남은 시간':'현재 진행';
 const value=seconds===null?(m.phase==='DAY_VOTE'?'시간 제한 없음':m.phase==='DAY_DISCUSSION'?'자유 토론':m.phase==='GAME_END'?'최종 확정':'Host 진행'):String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 return{label,value,seconds};
}
export function MafiaTvHeader({m,deadline,now}:{m:any;deadline:number;now:number}){
 const time=publicTvClock(m,deadline,now),night=m.phase==='NIGHT',prefix=night?'NIGHT':'DAY';
 return <header className="mafia-tv-status" data-testid="mafia-tv-status"><div className="mafia-tv-phase"><span className="eyebrow">정보전 마피아 · 작전 상황실</span><h1><span>{prefix} {String(m.day).padStart(2,'0')} · {m.day}일차</span><strong data-testid="mafia-phase">{mafiaPhaseLabels[m.phase]}</strong></h1></div><div className={'mafia-tv-timer'+(time.seconds===null?' is-untimed':'')+(time.seconds!==null&&time.seconds<=15?' is-urgent':'')} data-testid={m.phase==='EXECUTION_PENDING'?'execution-pending':'mafia-tv-clock'}><span>{time.label}{time.seconds!==null?' (분:초)':''}</span><strong data-testid={night?'mafia-night-seconds':undefined}>{time.value}</strong>{night&&time.seconds!==null&&time.seconds>0&&time.seconds<=15&&<small data-testid="mafia-countdown">{time.seconds}초</small>}</div><div className="mafia-tv-survivors"><span>생존 / 전체 참가자</span><strong>{m.alive.length}<small> / {m.ids.length}명</small></strong><p>{night?`밤 행동 제출 ${m.nightProgress.submitted}명 · 제보 별도`:m.phase==='DAY_VOTE'?`${m.voteProgress.submitted} / ${m.voteProgress.total}명 투표 완료`:m.phase==='GAME_END'?'직업·진영 공개 · 개인 기록 비공개':'직업·개인 선택은 비공개'}</p></div></header>;
}
