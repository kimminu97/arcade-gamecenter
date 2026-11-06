import type{PlayableRoleId,Team}from'../server/mafia/roles';
export type RoleGuide={name:string;team:Team;summary:string;goal:string;timing?:string;usage?:string;limits:string[]};
const town='마피아팀이 모두 탈락하면 시민팀이 승리합니다.';
const mafia='시작 마피아가 1명이면 생존 마피아 수가 시민·중립 수 이상일 때, 2명 이상이면 더 많을 때 마피아팀이 승리합니다.';
const raid='마피아팀 공통 습격에도 참여합니다. 첫째 밤·재사용 대기에는 습격할 수 없습니다. 동료의 실제 신원은 보이지 않습니다.';
export const roleGuides:Record<PlayableRoleId,RoleGuide>={
 citizen:{name:'일반 시민',team:'town',summary:'특수 능력 없이 토론과 투표로 마피아를 찾습니다.',goal:town,limits:['밤에도 살아 있다면 익명 제보를 보낼 수 있습니다.']},
 mafia:{name:'일반 마피아',team:'mafia',summary:'생존 마피아 전원이 같은 대상을 선택하면 습격이 확정됩니다.',goal:mafia,timing:'둘째 밤부터 · 재사용 대기 제외',usage:'습격 가능한 밤마다 1회',limits:['자신과 다른 마피아도 대상으로 선택할 수 있습니다. 합의 전에는 변경할 수 있지만 확정 후에는 바꿀 수 없습니다.',raid,'채팅 OFF여도 습격 투표는 유지됩니다.']},
 police:{name:'경찰',team:'town',summary:'다른 생존자 한 명의 정확한 직업을 조사합니다.',goal:town,timing:'밤 · 결과는 밤 마감 후',usage:'매 밤 1회',limits:['자신은 조사할 수 없습니다. 결과는 본인만 확인합니다.']},
 doctor:{name:'의사',team:'town',summary:'생존자 한 명을 이번 밤의 마피아 습격으로부터 보호합니다.',goal:town,timing:'밤',usage:'매일 밤 사용 가능 · 한 밤에 1회',limits:['자신도 보호할 수 있습니다. 낮 처형은 막지 못합니다.','보호 성공 여부와 무관하게 다음 밤에 다시 사용합니다. 같은 밤 확정 후에는 변경할 수 없습니다.']},
 journalist:{name:'기자',team:'town',summary:'받은 익명 제보를 골라 다음 낮의 기사로 공개합니다.',goal:town,timing:'밤에 발행 예약 · 다음 낮 공개',usage:'게임당 2회',limits:['받아둔 제보의 원문만 기사화할 수 있습니다. 작성자와 진위는 알 수 없습니다.','같은 밤에 여러 기사를 예약할 수 있습니다. 예약 후 수정·취소할 수 없으며 같은 제보는 다시 기사화할 수 없습니다.']},
 fakeReporter:{name:'가짜 기자',team:'mafia',summary:'직접 쓴 가짜 기사를 기자 속보처럼 공개합니다.',goal:mafia,timing:'밤에 발행 예약 · 다음 낮 공개',usage:'게임당 1회',limits:['기사 내용은 150자 이내입니다. 예약 후 수정·취소할 수 없습니다. 실제 기자가 없어도 사용할 수 있습니다.',raid]},
 hacker:{name:'해커',team:'mafia',summary:'일반 제보를 자동으로 가로채고, 수정본을 익명 제보로 보냅니다.',goal:mafia,timing:'입수는 밤에 자동 · 수정본은 원하는 밤에 전송',usage:'자동 입수 1회 · 수정본 전송 1회',limits:['살아 있는 해커가 아직 입수하지 않았다면, 각 밤의 다섯 번째 일반 제보를 자동으로 가로챕니다. 별도 입수 버튼은 없습니다.','가로챈 원문은 기자에게 전달되지 않습니다. 수정본의 전달·기사화는 보장되지 않으며 사망 후에는 전송할 수 없습니다.',raid]},
 blackmailer:{name:'협박범',team:'mafia',summary:'제보를 복사하고 그 작성자에게 익명의 협박 메시지를 보냅니다.',goal:mafia,timing:'밤 · 제보 입수 후 메시지 전송',usage:'제보 입수 1회 · 메시지 전송 1회',limits:['가장 최근에 기자에게 정상 전달된 타인의 일반 제보를 복사합니다. 원본 전달은 막지 않습니다.','작성자의 신원은 보이지 않고 수신자는 자동 지정됩니다. 협박은 행동을 강제하거나 투표권을 막지 않습니다.',raid]},
 eavesdropper:{name:'도청범',team:'mafia',summary:'한 명을 예약해 그 사람의 다음 밤 일반 제보를 확인합니다.',goal:mafia,timing:'밤에 예약 · 다음 밤 마감 후 결과',usage:'게임당 2회 · 한 밤에 예약 1회',limits:['자신을 포함한 생존자를 선택할 수 있습니다. 대상이 다음 밤에 제보하지 않으면 결과가 없습니다.','예약은 변경할 수 없고 제보가 없어도 횟수가 소모됩니다. 해커의 수정본은 도청하지 않습니다.',raid]},
 voteBlocker:{name:'투표 봉쇄관',team:'town',summary:'다른 생존자 한 명의 이번 낮 투표권을 봉쇄합니다.',goal:town,timing:'낮 토론',usage:'게임당 1회',limits:['자신은 선택할 수 없습니다. 확정 후 대상을 바꿀 수 없으며 다음 낮에는 투표권이 돌아옵니다.','사용자·대상은 공개되지 않고 봉쇄 여부는 대상 본인에게만 안내됩니다.']},
 voteAppraiser:{name:'투표 감정사',team:'town',summary:'지정한 한 명의 최종 실제 투표 대상을 혼자 확인합니다.',goal:town,timing:'낮 토론에 지정 · 투표 마감 후 결과',usage:'게임당 1회',limits:['자신 이외의 생존자만 지정하며 확정 후 변경할 수 없습니다.','유효한 투표가 없으면 기권으로 표시됩니다. 기권 원인·직업·진영은 알 수 없으며 판사가 처형을 취소해도 감정 결과는 유지됩니다.']},
 shieldMaker:{name:'방패 제작자',team:'town',summary:'다른 생존자에게 마피아 습격을 한 번 막는 방패를 줍니다.',goal:town,timing:'밤',usage:'게임당 1회',limits:['자신은 선택할 수 없습니다. 방패는 습격을 막을 때까지 유지되며 제작자가 사망해도 남습니다.','의사·경호원의 보호가 우선합니다. 그 보호가 성공하면 방패를 소모하지 않습니다.','낮 처형은 막지 못하고 보유자가 사망하면 소멸합니다. 방패 상태는 제작자만 확인합니다.']},
 judge:{name:'판사',team:'town',summary:'처형 대기 중 이번 낮의 처형을 취소할 수 있습니다.',goal:town,timing:'처형 후보 확정 후 15초 대기 중',usage:'처형 취소 게임당 1회',limits:['살아 있을 때만 결정할 수 있습니다. 후보가 자신이어도 취소할 수 있습니다.','그대로 진행은 취소 횟수를 소모하지 않습니다. 해당 대기에서 한 번 내린 결정은 바꿀 수 없습니다.','결정해도 공통 15초가 끝난 뒤 결과를 공개합니다.']},
 bodyguard:{name:'경호원',team:'town',summary:'다른 생존자 한 명을 이번 밤의 습격으로부터 보호합니다.',goal:town,timing:'밤',usage:'매일 밤 사용 가능 · 한 밤에 1회',limits:['자신은 보호할 수 없습니다. 대신 사망하는 능력은 아닙니다. 같은 밤 확정 후에는 변경할 수 없습니다.','보호 성공 여부와 무관하게 다음 밤에 다시 사용합니다.','의사 보호 없이 경호가 습격을 막으면 공개 사건으로 알리지만 보호 대상·경호원의 신원은 공개하지 않습니다.']},
 coroner:{name:'검시관',team:'town',summary:'이미 사망한 한 명의 정확한 직업을 조사합니다.',goal:town,timing:'밤 · 결과는 밤 마감 후',usage:'매 밤 1회',limits:['생존자는 선택할 수 없습니다. 결과는 본인만 확인합니다.']},
 postman:{name:'우체부',team:'town',summary:'다른 생존자 한 명에게 익명 비밀 메시지를 보냅니다.',goal:town,timing:'밤',usage:'게임당 2회 · 한 밤에 1회',limits:['자신에게는 보낼 수 없습니다. 메시지는 150자 이내이며 전송 후 바꿀 수 없습니다.','수신자는 메시지를 보관함에서 확인하지만 발신자의 신원은 알 수 없습니다.']},
 mimic:{name:'흉내쟁이',team:'town',summary:'익명 마피아 채팅에 잠입해 읽고 쓸 수 있습니다.',goal:town,timing:'채팅이 ON인 밤 · 그 밤 동안 유지',usage:'게임당 2회 · 한 밤에 1회',limits:['잠입을 시작한 이후 대화만 볼 수 있습니다. 마피아 실제 신원이나 습격 투표권은 얻지 못합니다.','시민팀을 유지하며 채팅 작성자는 마피아로 표시됩니다.']},
 jester:{name:'광대',team:'neutral',summary:'자신이 낮 투표로 처형되도록 유도합니다.',goal:'자신이 낮에 실제 처형되면 혼자 승리합니다.',timing:'낮 처형 확정 때 자동 판정',limits:['자기 투표는 가능합니다. 밤 사망·동률·판사 취소·후보 선정만으로는 승리하지 않습니다.']},
 bountyHunter:{name:'현상금 사냥꾼',team:'neutral',summary:'시작할 때 받은 고정 표적의 낮 처형을 노립니다.',goal:'표적이 낮에 실제 처형될 때 자신이 살아 있으면 혼자 승리합니다.',timing:'낮 처형 확정 때 자동 판정',limits:['표적은 본인에게만 보이고 바꿀 수 없습니다. 표적에게 직접 투표할 필요는 없습니다.','표적의 밤 사망이나 자신의 선사망으로는 승리하지 않습니다.']},
 agitator:{name:'여론 조작가',team:'neutral',summary:'다른 사람들의 표로 고정 표적의 낮 처형을 이끕니다.',goal:'자신이 살아 있고, 자신 외 최소 2명이 표적에게 유효하게 투표하여 표적이 실제 처형되면 혼자 승리합니다.',timing:'낮 처형 확정 때 자동 판정',limits:['자신의 표는 필요한 2명에 포함되지 않습니다. 고정 표적은 변경할 수 없습니다.','별도 선동 메시지나 투표 조작 버튼은 없습니다.']},
 prophet:{name:'예언자',team:'neutral',summary:'고정 표적에게 투표하지 않고 그 표적의 낮 처형을 기다립니다.',goal:'자신이 살아 있고, 해당 낮 표적에게 유효표를 주지 않은 채 표적이 실제 처형되면 혼자 승리합니다.',timing:'낮 처형 확정 때 자동 판정',limits:['다른 사람에게 투표하거나 기권해도 됩니다. 고정 표적은 바꿀 수 없습니다.','표적의 밤 사망이나 자신의 선사망으로는 승리하지 않습니다.']},
 swindler:{name:'사기꾼',team:'neutral',summary:'서로 다른 두 사람의 정확한 직업을 맞힙니다.',goal:'총 3번의 추측 안에 서로 다른 2명을 맞히고 밤 판정 때 살아 있으면 혼자 승리합니다.',timing:'밤에 추측 · 밤 마감 후 정답 확인',usage:'게임당 3회 · 한 밤에 1회',limits:['자신 이외의 생존자만 선택합니다. 오답이어도 같은 사람을 다시 선택할 수 없습니다.','확정 후 변경할 수 없으며 선택 목록은 현재 배정과 무관한 전체 활성 직업입니다.']},
 parasite:{name:'기생충',team:'neutral',summary:'두 사람에게 표식을 남기고 그들의 사망을 기다립니다.',goal:'표식을 남긴 서로 다른 2명이 사망하고 자신은 살아 있으면 혼자 승리합니다.',timing:'밤에 표식 · 실제 사망 후 자동 판정',usage:'게임당 2회 · 한 밤에 1회',limits:['자신 이외의 생존자를 선택하며 표적을 변경하거나 다시 지정할 수 없습니다.','표식 자체는 피해를 주지 않습니다. 표적의 밤 사망·낮 처형은 모두 인정됩니다.']},
 gambler:{name:'도박사',team:'neutral',summary:'자신에게 투표하되 다른 사람이 처형되도록 만듭니다.',goal:'자기 유효표를 주고 다른 사람이 실제 처형되는 낮을 서로 다른 2일에 성공하면 혼자 승리합니다.',timing:'낮 투표 · 처형 확정 때 자동 판정',limits:['밤 능력 버튼은 없습니다. 기존 낮 투표에서 자신을 선택합니다.','자기 처형·동률·기권·봉쇄·판사 취소는 성공이 아닙니다. 승리 판정 때 자신이 살아 있어야 합니다.']},
 bomber:{name:'폭탄마',team:'neutral',summary:'표식 대상의 표를 받아 자신이 낮에 처형되도록 유도합니다.',goal:'해당 낮 유효한 표식 대상이 자신에게 실제 투표하고, 자신이 실제 처형되면 혼자 승리합니다.',timing:'밤에 표식 · 다음 낮 처형 확정 때 판정',usage:'매 밤 1회',limits:['다른 생존자만 지정합니다. 한 밤에는 변경할 수 없고 다음 밤에는 같은 대상도 다시 지정할 수 있습니다.','그 밤부터 다음 낮까지만 유효하며 표적이 사망하면 무효입니다. 표식은 피해를 주지 않습니다.','표적 외의 표나 자기 표만으로는 승리할 수 없으며 판사 취소·밤 사망·동률도 실패입니다.']},
 revenant:{name:'복수귀',team:'neutral',summary:'낮 처형 직후 자신에게 투표한 마피아를 마지막으로 지목합니다.',goal:'자신에게 유효표를 준 후보 중 실제 마피아팀 한 명을 맞히면 혼자 승리합니다.',timing:'실제 낮 처형 직후 별도의 15초',usage:'마지막 추측 1회',limits:['처형 후에도 사망 상태입니다. 자신을 제외한 실제 투표자만 후보이며 직업·진영은 보이지 않습니다.','일반·특수 마피아팀 모두 정답입니다. 오답·시간초과면 승리하지 못합니다.','밤 사망·판사 취소·동률·자기 표만 있는 처형에는 추측 기회가 없습니다. 마지막 선택 중에는 아직 최종 종료가 아닙니다.']}
};
export const guideTeams:Record<Team,string>={town:'시민팀',mafia:'마피아팀',neutral:'중립'};

// Uses only this authenticated player's server projection; never predicts eligibility.
export function currentActionHints(m:any,online:boolean,remaining:number,playerId?:string):string[]{
 if(!online)return['연결이 끊겼습니다. 재접속 후 현재 행동 상태를 확인하세요.'];
 if(m.phase==='GAME_END')return[];
 if(m.phase==='REVENGE_PENDING'&&m.revenge?.canSend)return['처형이 확정되었습니다. 마지막 15초 안에 아래 후보 중 실제 마피아를 한 번 지목하세요.'];
 if(!m.alive.includes(playerId))return['사망했습니다. 남은 게임을 조용히 지켜봐 주세요.'];
 if(m.phase==='ROLE_REVEAL')return['나의 직업과 목표를 확인하세요. Host가 첫 번째 밤을 시작합니다.'];
 if(m.phase==='DAY_VOTE')return[m.voteBlocked?'이번 낮에는 투표권이 봉쇄되었습니다.':m.submitted?'투표 완료 — 마감까지 기다려 주세요.':'아래에서 처형할 한 명을 선택하세요. 자신에게도 투표할 수 있습니다.'];
 if(m.phase==='DAY_DISCUSSION')return[m.citizenAbility?.canSend?'현재는 낮 토론 시간입니다. 아래 개인 능력에서 대상을 지정할 수 있습니다.':'현재는 낮 토론 시간입니다. 잠시 후 처형 투표가 시작됩니다.'];
 if(m.phase==='EXECUTION_PENDING')return[m.civicAbility?.canSend?'처형 전 15초입니다. 아래에서 판사의 결정을 확정할 수 있습니다.':'처형 결과 확인 중입니다. 15초 대기 후 최종 처형 여부가 공개됩니다.'];
 if(m.phase!=='NIGHT')return['공개 결과를 확인하고 다음 단계를 기다려 주세요.'];
 if(remaining<=0)return['밤 행동 접수가 마감되었습니다. 결과를 기다려 주세요.'];
 const out:string[]=[],a=m.attack;
 if(a){out.push(a.reason==='firstNight'?'현재는 첫째 밤이므로 습격할 수 없습니다.':a.reason==='cooldown'?'습격 쿨다운 중입니다. 이번 밤에는 습격할 수 없습니다.':a.locked?'마피아 습격 투표가 확정되었습니다.':a.available?'마피아 습격 투표에서 대상을 선택하세요. 전원 합의 전에는 바꿀 수 있습니다.':'현재 습격할 수 없습니다.');}
 const info=m.informationAbility,comm=m.communicationAbility,c=m.civicAbility,n=m.neutralAbility;
 if(comm?.canAcquire)out.push('아래에서 제보 입수를 요청할 수 있습니다. 입수할 제보가 없으면 횟수는 소모되지 않습니다.');
 const ready=m.citizenAbility?.canSend||c?.canSend||m.infiltration?.canSend||n?.canSend||comm?.canReserve||comm?.canSend&&comm.copy&&!comm.copy.submitted||info?.canSend&&(info.kind==='fakeReporter'?!info.submitted:info.vault&&!info.vault.submitted)||m.journalistInbox?.remaining>0&&m.journalistInbox.items.some((x:any)=>!x.selected)||!a&&m.targets?.length>0&&!m.submitted;
 if(ready)out.push('현재는 밤입니다. 아래 개인 능력에서 행동을 확정할 수 있습니다.');
 else if(!a&&!comm?.canAcquire){const done=m.submitted||c?.submitted||m.infiltration?.submitted||n?.remaining===0||n?.guesses?.some((g:any)=>g.day===m.day)||n?.marks?.some((g:any)=>g.day===m.day)||m.citizenAbility?.submitted||info?.submitted||info?.vault?.submitted||comm?.copy?.submitted||comm?.items?.some((x:any)=>x.bookedDay===m.day);out.push(done?'능력 사용 완료 — 공개 결과나 다음 사용 가능한 단계를 기다려 주세요.':'이번 밤에는 지금 확정할 수 있는 직업 능력이 없습니다.');}
 if(m.anonymousReport?.canSend&&!m.anonymousReport.submitted)out.push('익명 제보는 직업 능력과 별도로 아래에서 보낼 수 있습니다.');
 return out;
}
