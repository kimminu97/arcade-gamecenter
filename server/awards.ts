import {randomUUID} from 'node:crypto';
import type {Room,Round} from './game';
export type AwardGame='spy'|'court';
export const TRANSFER_SCALE=420; // LCM(1..7), exact equal shares for every supported player count.
export type AwardMember={id:string;name:string;avatar:string;bot:boolean};
type BaseRecord={roundId:string;gameSessionId:string;completedAt:number;ids:string[]};
export type AwardRecord=BaseRecord&({mode:'spy';spy:string;spyWon:boolean;votes:Record<string,string>}|{mode:'court';counts:Record<string,number>;tops:string[];predictions:Record<string,boolean>;success:string[];penalties:string[];invalid:boolean;validVoteCount:number});
export type GameSession={id:string;mode:AwardGame;startedAt:number;endedAt?:number;members:AwardMember[];records:AwardRecord[]};
export type PlayerStats=AwardMember&{spyRounds:number;spyWins:number;civilianRounds:number;validSpyVotes:number;correctSpyVotes:number;wrongSpyVotes:number;missingSpyVotes:number;wrongAccusations:number;maxWrongAccusations:number;courtRounds:number;receivedVotes:number;topRounds:number;challenges:number;failedChallenges:number;successRounds:number;penaltyRounds:number;wrongChallengePenalties:number;transferUnits:number};
export type Title={key:string;icon:string;name:string;description:string;winners:{id:string;name:string;avatar:string;metrics:string[]}[]};
export type Ceremony={id:string;gameSessionId:string;mode:AwardGame;version:number;index:number;status:'awards'|'summary';awards:Title[];statistics:PlayerStats[];omitted:{name:string;reason:string}[];completedRounds:number;countedRounds:number;invalidRounds:number;recordErrors:number};
export const supportsAwards=(mode:string):mode is AwardGame=>mode==='spy'||mode==='court';
const members=(r:Room,ids:string[])=>r.players.filter(p=>ids.includes(p.id)).map(p=>({id:p.id,name:p.name,avatar:p.avatar,bot:!!p.bot}));
export function beginAwardRound(r:Room,g:Round){
 if(!supportsAwards(g.mode)){r.gameSession=undefined;return;}
 let s=r.gameSession;if(!s||s.mode!==g.mode||s.endedAt){s={id:randomUUID(),mode:g.mode,startedAt:Date.now(),members:[],records:[]};r.gameSession=s;}
 for(const p of members(r,g.ids)){const i=s.members.findIndex(m=>m.id===p.id);if(i<0)s.members.push(p);else s.members[i]=p;}
 g.gameSessionId=s.id;
}
export function recordAwardRound(r:Room,g:Round){
 const s=r.gameSession;if(!s||s.endedAt||!g.awarded||g.phase!=='result'||g.gameSessionId!==s.id||s.mode!==g.mode||s.records.some(x=>x.roundId===g.id))return;
 const base={roundId:g.id,gameSessionId:s.id,completedAt:Date.now(),ids:[...g.ids]};
 if(g.mode==='spy')s.records.push({...base,mode:'spy',spy:g.spy,spyWon:g.result.spyWon,votes:{...g.votes}});
 else if(g.mode==='court')s.records.push({...base,mode:'court',counts:{...g.result.voteCounts},tops:[...g.result.topVotedPlayerIds],predictions:{...g.result.predictions},success:[...g.result.successfulPredictorIds],penalties:[...g.result.penaltyPlayerIds],invalid:g.result.isInvalidRound,validVoteCount:g.result.validVoteCount});
}
function empty(p:AwardMember):PlayerStats{return{...p,spyRounds:0,spyWins:0,civilianRounds:0,validSpyVotes:0,correctSpyVotes:0,wrongSpyVotes:0,missingSpyVotes:0,wrongAccusations:0,maxWrongAccusations:0,courtRounds:0,receivedVotes:0,topRounds:0,challenges:0,failedChallenges:0,successRounds:0,penaltyRounds:0,wrongChallengePenalties:0,transferUnits:0};}
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
export function contributionLabel(units:number){const d=gcd(units,TRANSFER_SCALE);return units%TRANSFER_SCALE===0?String(units/TRANSFER_SCALE):`${units/d}/${TRANSFER_SCALE/d}`;}
const rate=(n:number,d:number)=>`${n}/${d}회 · ${d?(n/d*100).toFixed(1):'0'}%`;
export function calculateAwards(s:GameSession){
 const statistics=s.members.map(empty),byId=new Map(statistics.map(p=>[p.id,p])),seen=new Set<string>();let countedRounds=0,invalidRounds=0,recordErrors=0;
 for(const row of s.records){
  if(!row||!Array.isArray(row.ids)||!row.roundId){recordErrors++;continue;}if(seen.has(row.roundId))continue;seen.add(row.roundId);
  const ids=new Set(row.ids),subset=(a:string[])=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(id=>ids.has(id));
  if(row.mode!==s.mode||row.gameSessionId!==s.id||!Number.isFinite(row.completedAt)||!row.roundId||ids.size!==row.ids.length||ids.size<1||ids.size>7||row.ids.some(id=>!byId.has(id))){recordErrors++;continue;}
  if(row.mode==='spy'){
   if(!row.votes||typeof row.votes!=='object'||Array.isArray(row.votes)||!ids.has(row.spy)||typeof row.spyWon!=='boolean'||Object.entries(row.votes).some(([v,t])=>!ids.has(v)||!ids.has(t)||v===t)){recordErrors++;continue;}
   const counts=row.ids.map(id=>Object.values(row.votes).filter(v=>v===id).length),max=Math.max(...counts),caught=max>0&&counts[row.ids.indexOf(row.spy)]===max;if(row.spyWon===caught){recordErrors++;continue;}
   for(const id of row.ids){const p=byId.get(id)!;if(id===row.spy){p.spyRounds++;if(row.spyWon)p.spyWins++;continue;}
    p.civilianRounds++;const target=row.votes[id];if(target===undefined)p.missingSpyVotes++;else{p.validSpyVotes++;if(target===row.spy)p.correctSpyVotes++;else p.wrongSpyVotes++;}
    const wrong=Object.values(row.votes).filter(target=>target===id).length;p.wrongAccusations+=wrong;p.maxWrongAccusations=Math.max(p.maxWrongAccusations,wrong);
   }
  }else{
   if(!row.counts||!row.predictions||!subset(row.tops)||!subset(row.success)||!subset(row.penalties)||row.ids.some(id=>!Number.isInteger(row.counts[id])||row.counts[id]<0||typeof row.predictions[id]!=='boolean')||row.success.some(id=>!row.tops.includes(id)||!row.predictions[id]||row.penalties.includes(id))||!Number.isInteger(row.validVoteCount)||row.validVoteCount>row.ids.length||Object.values(row.counts).reduce((a,b)=>a+b,0)!==row.validVoteCount||typeof row.invalid!=='boolean'||row.invalid!==(row.validVoteCount===0)){recordErrors++;continue;}
   if(row.invalid){invalidRounds++;continue;}
   const max=Math.max(...Object.values(row.counts));if(row.tops.length!==row.ids.filter(id=>row.counts[id]===max).length||row.tops.some(id=>row.counts[id]!==max)){recordErrors++;continue;}
   for(const id of row.ids){const p=byId.get(id)!,top=row.tops.includes(id),challenge=row.predictions[id],wrong=challenge&&!top,penalty=row.penalties.includes(id),success=row.success.includes(id);
    p.courtRounds++;p.receivedVotes+=row.counts[id];if(top)p.topRounds++;if(challenge)p.challenges++;if(wrong)p.failedChallenges++;if(penalty){p.penaltyRounds++;if(wrong)p.wrongChallengePenalties++;}if(success){p.successRounds++;p.transferUnits+=row.penalties.length*TRANSFER_SCALE/row.success.length;}
   }
  }countedRounds++;
 }
 const awards:Title[]=[],omitted:{name:string;reason:string}[]=[];
 const pick=(key:string,icon:string,name:string,description:string,primary:(p:PlayerStats)=>number,tie:(a:PlayerStats,b:PlayerStats)=>number,metrics:(p:PlayerStats)=>string[])=>{
  if(recordErrors){omitted.push({name,reason:'신뢰할 수 없는 라운드 기록이 있어 시상하지 않습니다.'});return;}
  const eligible=statistics.filter(p=>primary(p)>0);if(!eligible.length){omitted.push({name,reason:'해당 기록이 0회이거나 필요한 기록이 없습니다.'});return;}
  let best=eligible[0];for(const p of eligible)if(primary(p)>primary(best)||primary(p)===primary(best)&&tie(p,best)>0)best=p;
  awards.push({key,icon,name,description,winners:eligible.filter(p=>primary(p)===primary(best)&&tie(p,best)===0).map(p=>({id:p.id,name:p.name,avatar:p.avatar,metrics:metrics(p)}))});
 };
 if(s.mode==='spy'){
  pick('traitor','🕵️','배신왕','평범한 친구인 척, 우정 사이를 유유히 빠져나간 사람',p=>p.spyWins,(a,b)=>a.spyWins*b.spyRounds-b.spyWins*a.spyRounds,p=>[`스파이 승리 ${p.spyWins}회`,`스파이 승률 ${rate(p.spyWins,p.spyRounds)}`]);
  pick('detective','🎯','눈치왕','친구의 미세한 주파수 차이까지 잡아낸 사람',p=>p.correctSpyVotes,(a,b)=>a.correctSpyVotes*b.validSpyVotes-b.correctSpyVotes*a.validSpyVotes,p=>[`스파이 정답 지목 ${p.correctSpyVotes}회`,`투표 정답률 ${rate(p.correctSpyVotes,p.validSpyVotes)}`]);
  pick('unfair','😭','억울왕','시민인데도 친구들의 의심을 한 몸에 받은 사람',p=>p.wrongAccusations,(a,b)=>a.maxWrongAccusations-b.maxWrongAccusations,p=>[`일반 참가자일 때 받은 오인표 ${p.wrongAccusations}표`,`한 라운드 최대 ${p.maxWrongAccusations}표`]);
  pick('fooled','🤡','호구왕','확신에 찬 손끝이 자꾸 엉뚱한 친구를 향했던 사람',p=>p.wrongSpyVotes,(a,b)=>a.wrongSpyVotes*b.validSpyVotes-b.wrongSpyVotes*a.validSpyVotes,p=>[`잘못 지목 ${p.wrongSpyVotes}회`,`투표 오답률 ${rate(p.wrongSpyVotes,p.validSpyVotes)}`,`미투표 ${p.missingSpyVotes}회 (오답과 별도)`]);
 }else{
  pick('popular','👑','인기왕','좋은 표든 수상한 표든, 오늘의 관심을 독차지한 사람',p=>p.receivedVotes,(a,b)=>a.topRounds-b.topRounds,p=>[`누적 ${p.receivedVotes}표`,`공동 포함 최다 득표 ${p.topRounds}회`]);
  pick('delusion','🤡','착각왕','자기 확신만큼은 누구보다 강했던 사람',p=>p.failedChallenges,(a,b)=>a.failedChallenges*b.challenges-b.failedChallenges*a.challenges,p=>[`내가 1위다 ${p.challenges}회 도전`,`실제 1위가 아니었던 횟수 ${p.failedChallenges}회`,`도전 실패율 ${rate(p.failedChallenges,p.challenges)}`]);
  pick('penalty','😭','벌칙왕','오늘 벌칙 담당자 출석부에 가장 자주 이름을 올린 사람',p=>p.penaltyRounds,(a,b)=>a.wrongChallengePenalties-b.wrongChallengePenalties,p=>[`벌칙 대상 ${p.penaltyRounds}라운드`,`잘못된 도전으로 받은 벌칙 ${p.wrongChallengePenalties}회`]);
  pick('bomb','💣','폭탄왕','한 번의 자신감으로 친구들에게 벌칙 폭탄을 전달한 사람',p=>p.transferUnits,(a,b)=>a.successRounds-b.successRounds,p=>[`벌칙 전가 기여도 ${contributionLabel(p.transferUnits)}인회`,`최다 득표 예측 성공 ${p.successRounds}회`]);
 }
 return{awards,statistics,omitted,completedRounds:seen.size,countedRounds,invalidRounds,recordErrors};
}
export function endAwardGame(r:Room,sessionId:string){
 const s=r.gameSession;if(!s||s.id!==sessionId)throw Error('현재 게임 세션을 확인하세요.');if(s.endedAt)return;
 const result=calculateAwards(s);s.endedAt=Date.now();r.ceremony={...result,id:randomUUID(),gameSessionId:s.id,mode:s.mode,index:0,version:0,status:result.awards.length?'awards':'summary'};r.round=null;r.roulette=null;
}
export function ceremonyAction(r:Room,id:string,version:unknown,action:'next'|'previous'|'summary'|'close'){
 const c=r.ceremony;if(!c||c.id!==id||version!==c.version)throw Error('시상식 상태가 변경되었습니다. 현재 화면에서 다시 시도하세요.');
 if(action==='close'){if(c.status!=='summary')throw Error('전체 결과를 먼저 확인하세요.');r.ceremony=undefined;return;}
 if(action==='summary')c.status='summary';else if(action==='next'){if(c.status==='summary')throw Error('이미 전체 결과 화면입니다.');if(c.index+1>=c.awards.length)c.status='summary';else c.index++;}else{if(!c.awards.length)throw Error('공개할 칭호가 없습니다.');if(c.status==='summary'){c.status='awards';c.index=c.awards.length-1;}else if(c.index>0)c.index--;else throw Error('첫 번째 시상입니다.');}c.version++;
}
export function ceremonyView(r:Room){const c=r.ceremony;if(!c)return undefined;return{id:c.id,gameSessionId:c.gameSessionId,mode:c.mode,version:c.version,index:c.index,status:c.status,awardCount:c.awards.length,completedRounds:c.completedRounds,countedRounds:c.countedRounds,invalidRounds:c.invalidRounds,recordErrors:c.recordErrors,currentAward:c.status==='awards'?c.awards[c.index]:undefined,awards:c.status==='summary'?c.awards:undefined,statistics:c.status==='summary'?c.statistics:undefined,omitted:c.status==='summary'?c.omitted:undefined};}
