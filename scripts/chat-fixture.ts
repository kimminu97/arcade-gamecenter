import{createWriteStream}from'node:fs';import{once}from'node:events';
import{appendFileSync}from'node:fs';
// Fictional, distinct incidents for context-game tests; no real chat quotations.
export function appendContextFixture(path:string){const stories=[['펜션 예약은 내가 완벽하게 했으니까 여행 준비는 맡겨!','예약 확인서를 보니까 내년 같은 날짜잖아ㅋㅋ','여행 가기 전에 시간여행부터 하게 생겼네ㅋㅋ'],['이번 등산은 내가 앞장서서 정상까지 안내하겠다고 약속한다!','출발한 지 십 분인데 네가 매점 의자에 앉아 있잖아ㅋㅋ','등산 내기는 매점 정상 정복으로 바뀌었네ㅋㅋ'],['오늘 회식에서는 술 대신 물만 마시고 먼저 집에 가겠다고 선언한다!','네가 물컵을 들고 건배사를 십 분째 하고 있잖아ㅋㅋ','술자리 사회자 데뷔를 물 한 잔으로 해버렸네ㅋㅋ'],['게임 내기에서 내가 무조건 우승할 테니까 치킨 메뉴부터 골라!','우승 후보가 시작 버튼 찾다가 이미 탈락했잖아ㅋㅋ','치킨 주문 버튼은 아주 잘 찾는다는 점이 반전이네ㅋㅋ'],['이번 소개팅에서는 침착하게 취미 이야기만 하겠다고 결심했다!','취미 설명한다고 공유기 설정 화면을 보여줬다며ㅋㅋ','소개팅 상대를 네트워크 관리자로 채용하려고 했네ㅋㅋ'],['다이어트 계획은 완벽하고 오늘부터 야식을 절대로 안 먹겠다고 약속한다!','그런데 치킨 주문 알림이 네 휴대폰에서 울렸잖아ㅋㅋ','다이어트 내기가 아니라 배달 속도 내기였구나ㅋㅋ'],['이번 달에는 절약하려고 취미용 장비를 더 사지 않겠다고 선언한다!','방금 새 키보드를 샀다고 사진을 보내 놓고 그 말을 하네ㅋㅋ','절약 선언서보다 결제 영수증이 먼저 도착했네ㅋㅋ'],['아침 기차는 내가 모두 깨워서 여행 지각을 막겠다고 약속한다!','네 알람이 울리는 동안 기차가 이미 출발했잖아ㅋㅋ','지각 담당자가 모닝콜 담당까지 겸직한 게 문제였네ㅋㅋ'],['불판 요리는 내가 전문가니까 이번 여행 고기는 걱정하지 마!','전문가가 고기 대신 집게를 불판에 올려 놨잖아ㅋㅋ','여행 첫 요리가 집게 구이가 될 뻔해서 기억에 남겠다ㅋㅋ'],['이번 보드게임 규칙은 내가 완전히 이해했으니까 설명을 맡겨!','설명하던 규칙은 옆 상자에 있는 다른 게임이잖아ㅋㅋ','우리는 새로운 게임을 발명하는 내기를 하고 있었구나ㅋㅋ']];let text='';stories.forEach((story,i)=>{text+='--------------- 2026년 7월 12일 일요일 ---------------\r\n';[...story,'그때 옆에서 보던 친구들까지 전부 웃어서 이 사건은 평생 기억하겠다ㅋㅋ'].forEach((body,j)=>{text+=`[${fixtureNames[(i+j)%7]}] [오후 ${i+1}:0${j}] ${body}\r\n`;});});appendFileSync(path,text);}
export const fixtureNames=['민수','지훈','서연','수빈','도윤','유진','하늘'];
// Independent fictional scenes intentionally cover the seven existing game contracts.
export function appendGamePolicyFixture(path:string){let text='';const targets=[
 '비행선 조종석에서 들리는 기계음은 나만의 수수께끼 같은 자장가라고 생각한다',
 '졸업하고 복학하던 시절 마스크 챙기던 코로나 캠퍼스 카페 풍경이 기억난다',
 '소개팅에서 길을 잃어서 차였는데 엉뚱한 레스토랑에서 혼자 촛불을 불었다',
 '다음번 야외 공연에서 지휘봉을 들고 친구들 합창을 책임지겠다고 약속한다',
 '이번 보물찾기 암호는 무지개송아지라고 정했고 바닷가 등대 장소에 숨겼다',
 '우리 음악 감상 모임에서는 새로운 악기를 발견하면 소리를 기록하는 습관이 있다',
 '주말마다 천체 사진 촬영 장비를 정돈하며 은하수 관찰 노트를 쓰는 게 즐겁다'];
 for(let i=0;i<42;i++){const topic=targets[i%targets.length],author=fixtureNames[i%7];text+='--------------- 2027년 7월 12일 월요일 ---------------\r\n';const hour=Math.floor(i/4),minute=i%4*10;const rows=[[author,`${topic} · 가상 장면 ${i}`],[fixtureNames[(i+1)%7],`${topic.slice(0,15)} 이야기라니 왜 그런 선택을 했어? 가상 반응 ${i}`],[fixtureNames[(i+2)%7],`지난번 ${topic.slice(0,15)} 대화를 기억해! 가상 토론 ${i}`]];rows.forEach(([name,body],j)=>{text+=`[${name}] [${hour<12?'오전':'오후'} ${hour%12||12}:${String(minute+j).padStart(2,'0')}] ${body}\r\n`;});}
 appendFileSync(path,text);return 126;
}
export async function writeFixture(path:string,count:number,targetBytes?:number){const dates=Array.from({length:8},(_,i)=>`--------------- ${2018+i}년 7월 12일 목요일 ---------------\r\n`),header='카카오톡 대화 내용\r\n';
 const body=(i:number)=>['씨발 진짜 오늘 가평 여행은 내가 다 계획한다ㅋㅋ','ㄹㅇ 이번엔 내가 무조건 일찍 일어날게!','존나 레전드 내일 회식 안가고 펜션 갈까?','나 오늘부터 평생 야식 안 먹는다 진짜로!','아니 이 사진 뭐냐고ㅋㅋㅋㅋ 개웃기네','내 미래의 꿈은 회사 때려치고 고양이 집사야','이번 시험은 내가 통신 천재라는 걸 보여준다!'][Math.floor(i/3)%7]+` ${i%17}`;
 const compact=['씨발 웃긴다ㅋㅋ','ㄹㅇ 내일가자!','존나 레전드ㅋㅋ','평생 야식금지!','개웃기네ㅋㅋ','퇴사하고 집사!','통신 천재야!'];
 const line=(i:number)=>`[${fixtureNames[Math.floor(i/3)%7]}] [${Math.floor(i/60)%24<12?'오전':'오후'} ${String(Math.floor(i/60)%12||12).padStart(2,'0')}:${String(i%60).padStart(2,'0')}] ${targetBytes?compact[Math.floor(i/3)%7]+` ${i%17}`:body(i)}`;
 let base=Buffer.byteLength(header)+dates.reduce((s,d)=>s+Buffer.byteLength(d),0);for(let i=0;i<count;i++)base+=Buffer.byteLength(line(i)+'\r\n');if(targetBytes&&base>targetBytes)throw Error(`기본 픽스처 ${base}바이트가 목표보다 큽니다.`);const extra=targetBytes?targetBytes-base:0,pad=Math.floor(extra/count),remainder=extra%count;const out=createWriteStream(path);let bytes=0,buffer='';const write=async(s:string)=>{bytes+=Buffer.byteLength(s);if(!out.write(s))await once(out,'drain');};await write(header);let prev=-1;for(let i=0;i<count;i++){const year=Math.min(7,Math.floor(i*8/count));if(year!==prev){buffer+=dates[year];prev=year;}buffer+=line(i)+' '.repeat(pad+(i<remainder?1:0))+'\r\n';if(i%1000===999){await write(buffer);buffer='';}}if(buffer)await write(buffer);out.end();await once(out,'finish');return{count,bytes,names:fixtureNames};}
