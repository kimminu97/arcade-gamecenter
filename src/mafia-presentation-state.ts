import{AudioEvents,audioFrame,type Cue}from'./mafia-audio';
export type Presentation={key:string;kind:'start'|'night'|'day'|'vote'|'close'|'death'|'result'|'end';title:string;detail:string;day:number;deaths:string[];team?:'town'|'mafia'|'neutral'};
export const sceneFor=(phase?:string)=>phase==='NIGHT'||phase==='ROLE_REVEAL'?'night':phase==='GAME_END'?'end':'day';
// Reuse the sound system's public event IDs, without calling any audio API.
export class PresentationEvents{
 private events=new AudioEvents();private phase='';private scope='';
 observe(room:any,baseline=false):Presentation|null{
  const frame=audioFrame(room),m=room?.round?.mafia,scope=`${frame.room}:${frame.round}`;
  const changed=this.scope===scope&&this.phase!==frame.phase,previous=this.phase;
  this.scope=scope;this.phase=frame.phase;
  const cues=this.events.observe(frame,baseline);if(baseline||!m)return null;
  const last=m.events?.at(-1),result=changed&&previous==='EXECUTION_PENDING'&&frame.phase==='DAY_RESOLUTION'&&last?.kind==='vote';
  if(!cues.length&&!result)return null;
  const has=(cue:Cue)=>cues.includes(cue);
  const kind:Presentation['kind']=has('end')?'end':has('start')?'start':has('night')?'night':has('day')?'day':has('vote')?'vote':has('death')?'death':has('close')?'close':'result';
  const names=has('death')?(last?.deaths??[]).map((id:string)=>room.players.find((p:any)=>p.id===id)?.name??'참가자'):[];
  const title=kind==='end'?(m.winner==='town'?'시민팀 승리':m.winner==='mafia'?'마피아팀 승리':'중립 단독 승리'):kind==='start'?'정보전 마피아':kind==='night'?'밤이 되었습니다':kind==='day'?'낮이 되었습니다':kind==='vote'?'처형 투표 시작':kind==='close'?'투표가 마감되었습니다':kind==='death'?'공개 사망 발표':last?.wasCancelled?'이번 처형은 취소되었습니다':last?.isTie?'동률 · 처형하지 않습니다':'처형 결과 발표';
  const detail=kind==='start'?'게임이 시작됩니다 · 각자의 휴대폰에서 직업을 확인하세요':kind==='night'?`${m.day}번째 밤 · 각자의 휴대폰으로 조용히 행동하세요`:kind==='day'?`${m.day}일차 · 공개 뉴스와 결과를 확인하세요`:kind==='vote'?'제한 시간 없음 · 전원 투표 또는 Host 마감':kind==='close'&&m.phase==='EXECUTION_PENDING'?'처형 전 15초 · 서버 마감 시각에 결과 확정':m.phase==='REVENGE_PENDING'?'마지막 선택 진행 중 · 아직 최종 종료가 아닙니다':kind==='end'?'최종 결과 확정 · 모든 참가자의 직업을 공개합니다':'서버에서 확정한 공개 결과입니다';
  return{key:`${scope}:${m.phase}:${m.day}:${m.nightId??''}:${last?.execution?.id??''}`,kind,title,detail,day:m.day,deaths:names,team:kind==='end'?m.winner:undefined};
 }
}
