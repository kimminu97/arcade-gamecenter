import type{MafiaConfig}from'../server/mafia/config';
import type{PlayableRoleId}from'../server/mafia/roles';
export type Recommendation={id:string;name:string;description:string;mafia:readonly PlayableRoleId[];town:readonly PlayableRoleId[];warning:string};
export const mafiaRecommendations:readonly Recommendation[]=[
 {id:'deduction',name:'기본 추리전',description:'처음 플레이할 때 추천하는 기본 추리 조합입니다.',mafia:['mafia','fakeReporter'],town:['police','doctor','citizen'],warning:'경찰 조사·의사 보호·가짜 기사를 활용합니다. 가짜 기사는 실제 기자 없이도 공개됩니다.'},
 {id:'information',name:'정보전 중심',description:'뉴스와 익명 제보, 투표 정보를 활용하는 심리전 조합입니다.',mafia:['hacker','fakeReporter'],town:['journalist','police','voteAppraiser'],warning:'해커는 각 밤의 다섯 번째 일반 익명 제보가 실제 접수돼야 자동 입수합니다. 제보가 적으면 발동하지 않을 수 있습니다.'},
 {id:'defense',name:'생존·방어 중심',description:'방어 능력을 활용해 생존과 습격 심리전을 경험하는 조합입니다.',mafia:['mafia','blackmailer'],town:['doctor','bodyguard','shieldMaker'],warning:'방어 능력 체험용 실험 조합입니다. 게임이 길어지거나 마피아에게 불리할 수 있으며 밸런스가 검증되지 않았습니다. 기자가 없어 협박범이 복사할 정상 전달 제보는 생기지 않습니다. 이 조합에서 협박 능력은 사용 불가하며 마피아 공동 습격에는 참여합니다.'}
];
const counts=(r:Recommendation)=>Object.fromEntries([...r.mafia,...r.town].map(id=>[id,1]));
export function recommendationConfig(current:MafiaConfig,r:Recommendation):MafiaConfig{
 return{...current,version:2,mode:'teamRandom',playerCount:5,direct:counts(r),teams:{mafia:2,citizen:3,neutral:0},required:{mafia:[...r.mafia],citizen:[...r.town],neutral:[]},candidates:{mafia:[],citizen:[],neutral:[]}};
}
const positive=(direct:Record<string,number>)=>Object.entries(direct).filter(([,n])=>n!==0).sort(([a],[b])=>a.localeCompare(b));
export function matchingRecommendation(cfg:MafiaConfig){
 if(cfg.playerCount!==5)return undefined;
 if(cfg.version===2&&cfg.mode==='teamRandom')return mafiaRecommendations.find(r=>cfg.teams.mafia===2&&cfg.teams.citizen===3&&cfg.teams.neutral===0&&Object.values(cfg.candidates).every(pool=>pool.length===0)&&JSON.stringify([...(cfg.required?.mafia??[])].sort())===JSON.stringify([...r.mafia].sort())&&JSON.stringify([...(cfg.required?.citizen??[])].sort())===JSON.stringify([...r.town].sort())&&cfg.required?.neutral.length===0);
 if(cfg.mode!=='direct')return undefined;
 return mafiaRecommendations.find(r=>JSON.stringify(positive(cfg.direct))===JSON.stringify(positive(counts(r))));
}
// Compare saved/current configurations without writing or depending on JSON key order.
export function sameMafiaConfiguration(a:MafiaConfig,b:MafiaConfig){
 const key=(c:MafiaConfig)=>JSON.stringify([c.version,c.mode,c.playerCount,positive(c.direct),...(['mafia','citizen','neutral']as const).map(t=>[c.teams[t],[...c.candidates[t]].sort(),c.required?[...c.required[t]].sort():null]),c.rules?.raidCooldown??true,c.rules?.mafiaChat??true]);
 return key(a)===key(b);
}
