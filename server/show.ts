import {randomInt,randomUUID} from 'node:crypto';
import type {Room} from './game';
export type Roulette={id:string;mode:string;endsAt:number};
export type HiddenEvent={kind:'double'|'mission';title:string;description:string;multiplier:number};
export function roll(r:Room){if(r.final||r.round&&r.round.phase!=='result')throw Error('라운드가 끝난 뒤 룰렛을 돌려 주세요.');if(r.roulette&&Date.now()<r.roulette.endsAt)throw Error('룰렛이 돌아가고 있습니다.');r.roulette={id:randomUUID(),mode:['spy','court','draw','number'][randomInt(4)],endsAt:Date.now()+3600};return r.roulette;}
export function eventFor(turn:number,enabled:boolean):HiddenEvent|null{
 if(!enabled||turn%3)return null;
 if(turn%6)return{kind:'double',title:'더블 찬스 ×2',description:'이번 라운드에서 획득하는 모든 게임 점수가 2배! 기본 판정 규칙은 그대로입니다.',multiplier:2};
 const missions=['결과 공개 후 전원 5초 동안 우승 세리머니!','라운드가 끝나면 서로에게 게임 실력 칭찬 한마디!','결과 공개 후 가장 인상적인 플레이를 한 명씩 뽑아 주세요.'];
 return{kind:'mission',title:'돌발 미션',description:missions[randomInt(missions.length)]+' 참여는 자유, 추가 점수는 없습니다.',multiplier:1};
}
export function ranks(players:{id:string;score:number}[]){return Object.fromEntries(players.map(p=>[p.id,1+players.filter(q=>q.score>p.score).length]));}
export function overtakes(r:Room,before:Record<string,number>){const after=ranks(r.players);return r.players.filter(p=>before[p.id]>after[p.id]).map(p=>({id:p.id,name:p.name,from:before[p.id],to:after[p.id]}));}
export function roast(r:Room,points:Record<string,number>,duplicates:string[]){
 const leaders=r.players.filter(p=>points[p.id]===Math.max(...Object.values(points))&&points[p.id]>0);
 if(!leaders.length)return '이번 판은 두뇌도 잠시 와이파이 재연결 중. 다음 판에서 복구 갑니다!';
 const name=leaders.map(p=>p.name).join(', ');
 if(duplicates.length)return `${name} 님, 혼잡한 주파수 사이로 단독 수신 성공! 중복 채널 친구들은 다음 판에 재접속~`;
 return [`${name} 님, 두뇌 클럭 혼자 오버클럭하셨나요? 친구들 CPU에도 기회를 주세요!`,`${name} 님 신호만 너무 선명한데요? 나머지 친구들, 안테나 방향 조정 갑니다!`,`${name} 님 이번 판 대역폭 독점! 다음 라운드엔 친구들에게도 조금 나눠 주세요.`][randomInt(3)];
}
