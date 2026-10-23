export const chatGames:Record<string,{name:string;types:string[]}>={
 'guess-speaker':{name:'이 말 누가 했게?',types:['speaker','sequence']},'chat-habit':{name:'말버릇 맞히기',types:['habit']},'chat-battle':{name:'카톡 통계 배틀',types:['battle']},'chat-year':{name:'연도 맞히기',types:['year']},'chat-blank':{name:'빈칸 채우기',types:['blank']},'chat-cringe':{name:'흑역사 퀴즈',types:['cringe']},'chat-defend':{name:'과거의 나를 변호하라',types:['defend']}
};
export const gameForType=(type:string)=>Object.keys(chatGames).find(g=>chatGames[g].types.includes(type))||'';
export type GameSpec={game:string;type:string;score:number;reason:string;prompt:string;answer:string;options:string[];key?:string;rows:any[]};
// Rule based suitability, not an objective fun score. No profanity count bonus.
export function gameSpecs(target:any,rows:any[],parts:any,stats:any,ids:string[]):GameSpec[]{
 const text=target.originalText,signals=parts.signals||{},linked=signals.linkedMessages>0,reply=signals.replyAuthors>0,substantial=[...text.replace(/\s/g,'')].length>=12;
 const result:GameSpec[]=[];const add=(game:string,score:number,reason:string,prompt:string,answer:string,options:string[],type=chatGames[game].types[0],key?:string,source=[target])=>{if(score>=54&&options.includes(answer))result.push({game,type,score:Math.min(100,Math.round(score)),reason,prompt,answer,options,key,rows:source});};
 if(!substantial||!(parts.context>=50)||!(linked||signals.reactorCount>=2||signals.recall||signals.twist))return result;
 const at=rows.findIndex(r=>r.id===target.id),run=[target];for(const r of rows.slice(at+1,at+3)){if(r.participantId!==target.participantId)break;run.push(r);}
 if(parts.distinctive>=50&&reply)add('guess-speaker',55+parts.distinctive*.25+parts.context*.1,'고유 어휘·말투와 후속 대화가 있으며 발언자 식별이 가능함','강조된 말을 한 친구는 누구일까요?',target.participantId,ids,run.length>1?'sequence':'speaker',undefined,run);
 const embarrassing=/허세|흑역사|망했|쪽팔|실수|취했|취해서|기억.*안|차였|꼴찌|졌|장담|무조건|내가.*최고|절대/.test(text);
 if((signals.twist||embarrassing)&&reply)add('chat-cringe',90+(signals.twist?5:0)+Math.min(5,signals.reactorCount*2),'민망한 실수·허세 또는 본인 발언의 반전과 친구 반응이 있음','이 상황의 흑역사 주인공은 누구일까요?',target.participantId,ids);
 if(/코로나|마스크|입대|전역|졸업|새내기|월드컵|올림픽|대선|총선|신입|취업|군대|휴학|복학/.test(rows.map(r=>r.originalText).join(' '))&&!rows.some(r=>r.originalText.includes(String(target.year))))add('chat-year',92+Math.min(8,signals.linkedMessages*2),'학교·군대·사회 사건 등 시기 추론 단서가 있고 정답 연도는 직접 노출되지 않음','이 대화가 오간 연도는?',String(target.year),stats.years.map((y:any)=>String(y.year)));
 const word=(text.match(/[\p{L}\p{N}]{3,20}/gu)||[]).filter((w:string)=>!/^[ㅋㅎㅠㅜ]+$/.test(w)&&!['씨발','시발','존나','그냥','진짜로'].includes(w)).sort((a:string,b:string)=>b.length-a.length)[0];
 if(word&&linked&&parts.distinctive>=60)add('chat-blank',55+parts.context*.1+parts.distinctive*.2+(/내기|벌칙|별명|코드명|암호|메뉴|정답|장소/.test(text)?15:0),'대화로 추론 가능한 핵심 어휘가 있고 원문 속 오타·표현을 보존함',text.split(word).join('[빈칸]'),word,[word,...['진짜로','가평에서','내일은','레전드'].filter(w=>w!==word)].slice(0,4));
 if(reply&&linked&&/절대|무조건|평생|장담|약속|최고|싫어|나는|내가|안.*한다/.test(text))add('chat-defend',90+(signals.twist?5:0)+Math.min(5,signals.replyAuthors*2),'입장·약속·단언을 본인이 해명하고 친구가 평가할 수 있는 발언','과거의 나를 변호하라! 본인 화면의 안내에 따라 해명해 주세요.',target.participantId,ids);
 const own=stats.participants.find((p:any)=>p.id===target.participantId);if(own)for(const [term,value]of Object.entries(own.expressions) as [string,any][]){if(value.messages<2)continue;const others=stats.participants.filter((p:any)=>p.id!==own.id&&ids.includes(p.id)),best=Math.max(0,...others.map((p:any)=>p.expressions[term]?.per1000||0));if(value.per1000>best)add('chat-habit',85+Math.min(15,value.per1000-best),'실제 저장 통계에서 메시지 수 대비 표현 사용률이 단독 1위',`발언량 보정 후 '${term}' 사용 비율이 가장 높은 친구는?`,own.id,ids,'habit',`habit:${term}`);const opponent=others.find((p:any)=>(p.expressions[term]?.per1000||0)<value.per1000);if(opponent)add('chat-battle',80+Math.min(15,value.per1000-(opponent.expressions[term]?.per1000||0)),'동률이 아닌 두 참가자의 실제 메시지 1,000개당 표현 사용률 비교',`누가 '${term}'를 더 많이 쓸까? (메시지 1,000개당 사용 메시지 비율)`,own.id,[own.id,opponent.id],'battle',`battle:${term}:${[own.id,opponent.id].sort().join(':')}`);}
 return result.sort((a,b)=>b.score-a.score||a.game.localeCompare(b.game));
}
