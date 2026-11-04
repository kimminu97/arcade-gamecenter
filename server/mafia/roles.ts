export type Team='town'|'mafia'|'neutral';
export type PlayableRoleId='citizen'|'mafia'|'police'|'doctor'|'journalist'|'fakeReporter'|'hacker'|'blackmailer'|'eavesdropper'|'informant'|'wiretapper'|'archivist'|'judge'|'bodyguard'|'coroner'|'postman'|'mimic'|'jester'|'bountyHunter'|'agitator'|'prophet'|'swindler'|'parasite'|'gambler'|'bomber';
export type RoleId=PlayableRoleId|'judge'|'bodyguard'|'coroner'|'postman'|'jester'|'bountyHunter'|'swindler'|'agitator'|'parasite'|'prophet'|'bomber'|'gambler'|'revenant';
export type AbilityType='none'|'investigate'|'protect'|'fakeNews'|'interceptReport'|'threat'|'eavesdrop'|'publishNews'|'actionInvestigate'|'communicationInvestigate'|'cancelExecution'|'bodyguard'|'autopsy'|'privateMail'|'actionRecord'|'infiltrate'|'neutralObjective';
export type RoleDefinition={roleId:RoleId;name:string;roleName:string;team:Team;description:string;implementationStatus:'implemented'|'planned';maxCopies:number;minPlayers:number;abilityType:AbilityType;abilityUses:number|null;availablePhase:'NIGHT'|null;requires:string[];incompatibleWith:RoleId[];category:'basic'|'attack'|'investigation'|'protection'|'information'|'vote'|'neutral';enabled:boolean};
const role=(roleId:RoleId,name:string,team:Team,description:string,abilityType:AbilityType,abilityUses:number|null,category:RoleDefinition['category'],implemented=false,maxCopies=1,requires:string[]=[]):RoleDefinition=>({roleId,name,roleName:name,team,description,abilityType,abilityUses,category,implementationStatus:implemented?'implemented':'planned',maxCopies,minPlayers:5,availablePhase:implemented&&(['swindler','parasite','bomber'].includes(roleId)||['infiltrate','bodyguard','autopsy','privateMail','investigate','protect','publishNews','fakeNews','interceptReport','threat','eavesdrop','actionInvestigate','communicationInvestigate','actionRecord'].includes(abilityType))?'NIGHT':null,requires,incompatibleWith:[],enabled:true});
export const roles:Record<RoleId,RoleDefinition>={
 mimic:role('mimic','흉내쟁이','town','너넨 내가 마피아처럼 보이지? 밤에 게임당 2회 익명 마피아 채팅에 잠입합니다. 잠입 이후 대화만 읽고 쓸 수 있으며 습격 투표권은 없습니다.','infiltrate',2,'information',true,1,['system:privateChat']),
 citizen:role('citizen','일반 시민','town','특수 능력 없이 낮의 토론과 투표로 마피아를 찾습니다.','none',0,'basic',true,7),
 mafia:role('mafia','일반 마피아','mafia','매 밤 생존 마피아 전원이 같은 공격 대상을 선택하면 즉시 잠깁니다. 합의 전 변경 가능.','none',0,'attack',true,7,['system:sharedAttack']),
 police:role('police','경찰','town','매 밤 자신 이외 생존자 한 명의 정확한 직업을 조사합니다. 결과는 본인에게만 보입니다.','investigate',null,'investigation',true,1,['system:nightActions']),
 doctor:role('doctor','의사','town','매 밤 생존자 한 명을 보호합니다. 자신을 보호해도 됩니다.','protect',null,'protection',true,1,['system:nightActions']),
 fakeReporter:role('fakeReporter','가짜 기자','mafia','게임당 1회 직접 작성한 가짜 기사를 기자 명의로 공개합니다.','fakeNews',1,'information',true,1,['system:news']),
 hacker:role('hacker','해커','mafia','게임당 1회 불특정 제보를 자동 입수합니다. 보관한 원문은 원하는 밤에 수정해 새 익명 제보로 전송할 수 있습니다. 사망 후 수정·전송 불가.','interceptReport',1,'information',true,1,['system:reports']),
 blackmailer:role('blackmailer','협박범','mafia','밤에 제보 입수 버튼으로 가장 최근의 타인 일반 제보를 게임당 1회 복사하고 원 발신자에게 직접 쓴 익명 협박을 보냅니다. 원본 정상 전달, 행동 강제 없음.','threat',1,'information',true,1,['system:reports']),
 eavesdropper:role('eavesdropper','도청범','mafia','게임당 2회 참가자를 지정합니다. 그 참가자가 다음 밤에 제보하면 내용을 확인합니다. 제보하지 않으면 결과 없음.','eavesdrop',2,'information',true,1,['system:reports']),
 journalist:role('journalist','기자','town','익명 제보를 확인하고 게임당 기본 2회 기사를 발행합니다. 받은 원문을 수정할 수 없습니다.','publishNews',2,'information',true,1,['system:reports','system:news']),
 informant:role('informant','정보원','town','밤에 참가자의 행동 종류를 확인합니다.','actionInvestigate',null,'investigation',true),
 wiretapper:role('wiretapper','감청관','town','게임당 2회 특정 참가자의 비밀 통신 여부를 확인합니다.','communicationInvestigate',2,'information',true),
 judge:role('judge','판사','town','게임당 1회 낮 처형을 취소합니다.','cancelExecution',1,'vote',true),
 bodyguard:role('bodyguard','경호원','town','게임당 1회 습격을 보호하며 성공 시 공개 사건을 남깁니다. 자신은 보호할 수 없습니다.','bodyguard',1,'protection',true),
 coroner:role('coroner','검시관','town','사망자의 정확한 직업을 조사합니다.','autopsy',null,'investigation',true),
 postman:role('postman','우체부','town','게임당 2회 특정 참가자에게 비밀 메시지를 전달합니다.','privateMail',2,'information',true),
 archivist:role('archivist','기록관','town','게임당 2회 특정 참가자의 일반 익명 제보를 포함한 행동 종류를 확인합니다.','actionRecord',2,'investigation',true),
 jester:role('jester','광대','neutral','본인이 낮 투표로 실제 처형되면 단독 승리합니다.','neutralObjective',null,'neutral',true),
 bountyHunter:role('bountyHunter','현상금 사냥꾼','neutral','시작 시 고정된 표적이 낮에 처형되고 본인이 생존하면 단독 승리합니다. 표적 변경 없음.','neutralObjective',null,'neutral',true),
 swindler:role('swindler','사기꾼','neutral','게임당 총 3회 추측 안에 서로 다른 2명의 정확한 직업을 맞히면 단독 승리합니다.','neutralObjective',3,'neutral',true),
 agitator:role('agitator','여론 조작가','neutral','시작 시 고정 표적이 낮에 처형되고 본인 외 최소 2명이 표적에게 투표하면 단독 승리합니다.','neutralObjective',null,'neutral',true),
 parasite:role('parasite','기생충','neutral','표식을 남긴 서로 다른 2명이 모두 사망하고 본인이 생존하면 단독 승리합니다.','neutralObjective',null,'neutral',true),
 prophet:role('prophet','예언자','neutral','자기 이외 고정 표적의 낮 처형 때 생존하고, 그날 표적에게 투표하지 않았으면 단독 승리합니다.','neutralObjective',null,'neutral',true),
 bomber:role('bomber','폭탄마','neutral','매 밤 생존 대상의 표식을 설치·변경합니다. 표식 대상이 자신에게 투표하고 본인이 실제 낮 처형돼야 단독 승리합니다. 표식은 살해 효과 없음.','neutralObjective',null,'neutral',true),
 gambler:role('gambler','도박사','neutral','서로 다른 낮 2회 자신에게 투표하고 실제로 타인이 처형되면 단독 승리합니다.','neutralObjective',null,'neutral',true),
 revenant:role('revenant','복수귀','neutral','자신이 낮 처형된 직후 자신에게 투표한 실제 마피아를 정확히 지목하면 단독 승리합니다.','neutralObjective',1,'neutral')
};
export const roleSetups:Record<number,Record<Exclude<PlayableRoleId,'journalist'|'fakeReporter'|'hacker'|'blackmailer'|'eavesdropper'|'informant'|'wiretapper'|'archivist'|'judge'|'bodyguard'|'coroner'|'postman'|'mimic'|'jester'|'bountyHunter'|'agitator'|'prophet'|'swindler'|'parasite'|'gambler'|'bomber'>,number>>={5:{mafia:1,police:1,doctor:1,citizen:2},6:{mafia:2,police:1,doctor:1,citizen:2},7:{mafia:2,police:1,doctor:1,citizen:3}};
export const teamAbilities:Partial<Record<Team,{abilityType:'sharedAttack';availablePhase:'NIGHT'}>>={mafia:{abilityType:'sharedAttack',availablePhase:'NIGHT'}};
export type CompositionValidator=(assignment:RoleId[])=>string|undefined;
export const compositionValidators:CompositionValidator[]=[assignment=>assignment.filter(id=>roles[id].team==='neutral').length>1?'중립은 최대 1명입니다.':undefined];

export const getRole=(id:string):RoleDefinition|undefined=>Object.hasOwn(roles,id)?roles[id as RoleId]:undefined;
