import {submit,type Room,type Stroke} from './game';
export type PlayerAction={type:'submit';value:unknown}|{type:'stroke';stroke:Stroke}|{type:'clear'};
export function playerAction(r:Room,id:string,a:PlayerAction){
 const p=r.players.find(p=>p.id===id);if(!p||!p.online||p.excluded)throw Error('접속 중인 활성 참가자만 행동할 수 있습니다.');
 if(a.type==='submit')return{message:submit(r,id,a.value)};
 const g=r.round;if(!g||g.mode!=='draw'||g.phase!=='draw'||g.drawer!==id||!g.ids.includes(id)||g.paused||g.deadline<=Date.now())throw Error('그림을 그릴 권한이 없습니다.');
 if(a.type==='clear'){g.strokes=[];return{message:'그림을 지웠습니다.',event:'clear' as const};}
 const d=a.stroke;if(!d||![d.x,d.y,d.px,d.py].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||!Number.isFinite(d.width)||d.width<1||d.width>30||!/^#[0-9a-f]{6}$/i.test(d.color))throw Error('잘못된 좌표');
 if(g.strokes.length>=12000)throw Error('획이 너무 많습니다. 전체 지우기를 사용하세요.');g.strokes.push({...d});return{message:'그림 전송',event:'stroke' as const,stroke:d};
}
