import {normalize} from './parser';
export const speakerPolicy={version:4,maxMessages:2,maxCharacters:160,maxCoreCharacters:200,maxQuestions:100,minScore:72};
const ambiguousNames=new Set(['하늘','수영','사랑','민주','진주','우주','미소','나라','미래','정상','희망']);
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function nameVariants(names:string[]){const result=new Set<string>();for(const raw of names){const name=raw.normalize('NFKC').trim();if(name.length>=2)result.add(name);const human=name.replace(/^\d{1,4}\s*/,'').replace(/(?:오빠|누나|언니|선배|형|씨|님)$/,'');if(/^[가-힣]{2,4}$/.test(human)){result.add(human);if(human.length===3)result.add(human.slice(1));}}return [...result].filter(s=>s.length>=2);}
export function identityLeak(text:string,names:string[]){return nameVariants(names).some(name=>{const suffix=ambiguousNames.has(name)?'(?:아|야|형|님|씨)(?:은|는|이|가|을|를|도|만)?(?=$|[^\\p{L}\\p{N}_])':'(?=$|[^\\p{L}\\p{N}_]|(?:(?:형|오빠|누나|언니|님|씨))?(?:은|는|이|가|을|를|아|야|의|도|만|랑|과|와|한테|에게|이가|이는|이랑|형|님|씨)(?=$|[^\\p{L}\\p{N}_]))';return new RegExp('(^|[^\\p{L}\\p{N}_])'+escape(name)+suffix,'iu').test(text.normalize('NFKC'));});}
export function informationReason(text:string,flags:any={}){
 if(flags.attachment||/^(?:사진|동영상|파일|음성메시지|이모티콘|삭제된 메시지)(?:\s*\d+장)?[.!]?$/.test(text.trim())||/^(?:파일|사진|동영상)\s*:/.test(text))return 'attachment';
 if(/https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|kr|net|org|io|me|gg|co|ai|app|be|tv|ly|xyz|shop|info|dev)(?:\b|\/)|(?:\d{1,3}\.){3}\d{1,3}/i.test(text))return 'url';
 if(/0\d{1,2}[- .]?\d{3,4}[- .]?\d{4}|(?:계좌|입금|은행|주민번호).{0,20}\d{3,}|\b\d{10,16}\b/.test(text))return 'contact_or_account';
 if(/(?:[가-힣]+(?:대로|로|길)\s*\d+(?:-\d+)?|[가-힣]{2,}(?:동|읍|면|리)\s+\d+(?:-\d+)?|\d+동\s*\d+호)/.test(text)||/^\s*(?:주소|위치|장소)\s*[:：]/.test(text))return 'address';
 if(/광고|무료체험|구매링크|상담문의|오픈채팅.*입장|쿠폰코드|이벤트.*참여|배송안내|인증번호|접속코드/.test(text))return 'advertisement_or_notice';
 if([...text].length>speakerPolicy.maxCharacters)return 'too_long';
 if(normalize(text).replace(/[\sㅋㅎㅠㅜ!?.,ㅇㄴ]+/g,'').length<12)return 'short_reply';
 return null;
}
export function assessSpeaker(text:string,following:any[]=[],names:string[]=[],flags:any={}){
 const rejected=informationReason(text,flags);if(rejected)return{accepted:false,reason:rejected,score:0,features:[] as string[],reactors:0};
 if(identityLeak(text,names))return{accepted:false,reason:'identity_leak',score:0,features:[],reactors:0};
 const features:string[]=[];
 if(/(?:나는|내가|난|우리|나만).{0,35}(?:천재|전문가|세계\s*최초|우승|최고|완벽|절대|무조건|평생|신이다|프로다|1등)/.test(text))features.push('boast');
 const contrast=text.split(/그런데|근데|했는데|하지만|벌써|결국|면서/);const opposites:[RegExp,RegExp][]=[[/다이어트|(?:안|못).{0,8}(?:먹|마시)/,/먹었|주문|시켰|치킨|야식|소주|맥주/],[/절약|아끼|안.{0,8}(?:사|산)/,/샀|결제|질렀|구매|주문|썼다|키보드/],[/무조건.{0,12}(?:우승|이긴|승리)|절대.{0,12}(?:안|않)/,/졌|패배|꼴찌|탈락/],[/안.{0,5}가|못.{0,5}가|안.{0,5}참석/,/간다|도착|참석|왔다/]];if(contrast.length>1&&opposites.some(([a,b])=>a.test(contrast[0])&&b.test(contrast.slice(1).join(' '))))features.push('self_contradiction');
 if(/실수|잘못|차였|지각|망했|쪽팔|흑역사|잠들|놓쳤|까먹/.test(text)&&/소개팅|술|회식|출근|기차|택시|여행|연애|집|예약|번호|시험|면접|결혼/.test(text))features.push('embarrassing_incident');
 const domains=[/연애|애인|소개팅|고백|키스/,/서버|통신|와이파이|공유기|주파수|코딩|알고리즘|패킷/,/치킨|야식|라면|술|소주|맥주|삼겹살/,/출근|퇴사|연봉|면접|회사/,/우주|인류|대통령|노벨상|국가대표|세계최초/].filter(re=>re.test(text)).length;
 if(domains>=2&&/보다|같|아니라|때문|인데|라고|수준|결국|인생|차라리|이론상|전문가|천재/.test(text))features.push('incongruous_claim');
 if(/(?:인생은|이게\s*바로|사실상|이론상|결론은|내\s*철학은).{3,60}(?:이다|이다|임|아니|라고|보다|같|뿐|거다|없다|된다)/.test(text))features.push('personal_punchline');
 const dependent=/^(?:이거|그거|저거|그게|이게|그건|그걸|저건|ㅇㅇ|응\s|그래서\s|그러니까\s)/.test(text.trim());
 const scheduled=/몇\s*시|언제.*(?:만나|모[여임])|(?:오늘|내일|주말|토요일).{0,20}(?:만나|출발|가능|모이)|\d{1,2}시\s*(?:출발|도착|만나|모[여임])/.test(text);
 const tokens=text.split(/\s+/).filter(w=>/[가-힣a-zA-Z]/.test(w)&&! /^[ㅋㅎㅠㅜ]+$/.test(w));
 const standalone=!dependent&&tokens.length>=2&&(/나는|내가|난|우리|나만|인생|소개팅|술|회식|출근|기차|택시|여행|연애|다이어트|절약|서버|통신|와이파이|회사/.test(text)||features.includes('self_contradiction')||features.includes('personal_punchline'));
 if(!standalone)return{accepted:false,reason:'context_dependent',score:0,features,reactors:0};
 if(scheduled&&!features.length)return{accepted:false,reason:'schedule',score:0,features,reactors:0};
 if(!features.length)return{accepted:false,reason:'ordinary',score:0,features,reactors:0};
 const reactors=new Set(following.filter(r=>/[ㅋㅎ]{2,}|뭐야|레전드|설마|한다며|했잖|왜.*그|웃겨|미쳤/.test(r.originalText)).map(r=>r.participantId)).size;
 // Neither length, lexical rarity, profanity nor laughter quantity contributes points.
 const score=Math.min(100,60+Math.min(3,features.length-1)*10+Math.min(2,reactors)*5+(features.includes('self_contradiction')?15:0));
 return{accepted:score>=speakerPolicy.minScore,reason:score>=speakerPolicy.minScore?'selected':'weak_punchline',score,features,reactors};
}
