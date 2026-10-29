export type YangTopic={id:string;topic:string;words:string[];group?:string;easyCount?:number;normalCount?:number};
export const normalizeYangWord=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const aliases:Record<string,string>={롤:'리그오브레전드',lol:'리그오브레전드',모여봐요동물의숲:'동물의숲',킹오파:'더킹오브파이터즈',트라이애슬론:'철인3종',pc방:'피시방',피씨방:'피시방',라떼:'카페라테',카페라떼:'카페라테'};
export function inspectYangBank(input:unknown){
 const errors:string[]=[],ids=new Set<string>(),names=new Set<string>(),owners=new Map<string,string>();let wordCount=0;
 if(!Array.isArray(input))return{errors:['주제 데이터는 배열이어야 합니다.'],topicCount:0,wordCount:0};
 for(const [index,value]of input.entries()){
  if(!value||typeof value!=='object'){errors.push(`${index}: 주제 형식 오류`);continue;}
  const t=value as YangTopic&{hardCount?:number},label=t.id||String(index);
  if(typeof t.id!=='string'||!/^yang-topic-\d{2,}$/.test(t.id)||ids.has(t.id))errors.push(`${label}: ID 누락/중복/형식 오류`);ids.add(t.id);
  if(typeof t.topic!=='string'||!t.topic.trim()||names.has(normalizeYangWord(t.topic)))errors.push(`${label}: 주제명 누락/중복`);else names.add(normalizeYangWord(t.topic));
  if(typeof t.group!=='string'||!t.group.trim())errors.push(`${label}: 분류 누락`);
  if(t.easyCount!==45||t.normalCount!==15||(t.hardCount!==undefined&&t.hardCount!==0))errors.push(`${label}: 쉬움45/보통15만 허용`);
  if(!Array.isArray(t.words)||t.words.length!==60){errors.push(`${label}: 제시어는 정확히60개`);if(!Array.isArray(t.words))continue;}
  for(const word of t.words){wordCount++;if(typeof word!=='string'||!word.trim()||word!==word.trim()||word.length>40){errors.push(`${label}: 빈값/공백/길이 오류`);continue;}
   const key=normalizeYangWord(word),canonical=aliases[key]??key;
   if(!key||/대신|가상 제시어|테스트용/.test(word))errors.push(`${label}: 검수되지 않은 임시 문구`);
   if(owners.has(canonical))errors.push(`${label}: 중복 제시어 ${word} (${owners.get(canonical)})`);else owners.set(canonical,label);
  }
 }
 return{errors,topicCount:input.length,wordCount};
}
export function assertYangBank(input:unknown){const report=inspectYangBank(input);if(report.errors.length)throw Error('양세찬 주제 검증 실패: '+report.errors.join('; '));return report;}
