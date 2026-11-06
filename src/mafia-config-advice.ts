import type {MafiaConfig,ConfigTeam} from '../server/mafia/config';
type CatalogRole={roleId:string;team:string;enabled:boolean;implementationStatus:string;maxCopies:number;minPlayers:number};
export type ConfigAdvice={id:string;level:'주의'|'참고';text:string};

// Composition hints only. Never inspect assignments or change server validity.
export function mafiaConfigAdvice(config:MafiaConfig,catalog:readonly CatalogRole[]):ConfigAdvice[]{
 const presence=(id:string):'absent'|'possible'|'present'=>{
  if(config.mode==='direct')return config.direct[id]>0?'present':'absent';
  const role=catalog.find(r=>r.roleId===id);if(!role)return'absent';const team=role.team as ConfigTeam,required=config.version===2?(config.required?.[team]??[]):[];if(required.includes(id))return'present';const count=config.teams[team]-required.length;
  const pool=catalog.filter(r=>r.team===team&&r.enabled&&r.implementationStatus==='implemented'&&r.minPlayers<=config.playerCount&&config.candidates[team]?.includes(r.roleId));
  if(count<=0||!pool.some(r=>r.roleId===id))return'absent';
  return count>pool.filter(r=>r.roleId!==id).reduce((n,r)=>n+(config.version===2?1:r.maxCopies),0)?'present':'possible';
 };
 const out:ConfigAdvice[]=[],journalist=presence('journalist'),blackmailer=presence('blackmailer'),fake=presence('fakeReporter'),hacker=presence('hacker');
 const add=(id:string,level:ConfigAdvice['level'],text:string)=>out.push({id,level,text});
 if(journalist==='absent')add('no-journalist','주의','기자가 없어 기사 발행을 중심으로 한 정보전이 제한됩니다.');
 else if(journalist==='possible')add('optional-journalist','참고','기자는 랜덤 후보입니다. 기자가 뽑히지 않으면 제보의 정상 전달과 기자의 기사 발행이 제한됩니다.');
 if(blackmailer!=='absent'&&journalist!=='present')add('blackmailer-journalist',journalist==='absent'&&blackmailer==='present'?'주의':'참고',journalist==='absent'?(blackmailer==='present'?'협박범이 있지만 기자가 없어 고유 능력을 사용할 수 없습니다. 공동 습격에는 참여합니다.':'협박범이 뽑혀도 기자가 없어 고유 능력을 사용할 수 없습니다. 공동 습격에는 참여합니다.'):'협박범은 기자에게 정상 전달된 타인의 일반 제보가 필요합니다. 기자가 뽑히지 않으면 고유 능력을 사용할 수 없습니다.');
 if(fake!=='absent'&&journalist!=='present')add('fake-without-journalist','참고','가짜 기자는 실제 기자가 없어도 가짜 기사를 발행할 수 있습니다. 기사 외관은 진짜 기사와 같습니다.');
 if(hacker!=='absent')add('hacker-fifth','참고',(hacker==='possible'?'해커가 랜덤으로 선정되면, ':'해커는 ')+'각 밤의 다섯 번째 일반 익명 제보에서 게임당 한 번 자동 발동합니다. 누적 다섯 번째가 아니며, 생존자가 5명 미만인 밤에는 발동할 수 없습니다.');
 if(presence('mimic')!=='absent'&&config.rules?.mafiaChat===false)add('mimic-chat','주의','마피아 비밀 채팅이 OFF여서 흉내쟁이는 잠입할 수 없습니다. 기존 서버 구성 검증에 따라 채팅을 ON으로 바꿔야 합니다.');
 return out;
}
