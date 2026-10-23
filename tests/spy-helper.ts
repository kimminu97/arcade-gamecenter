import type {Room} from '../server/game';
export function spyValue(r:Room){const c=r.round!.spyAnswer!;return c.type==='player'?r.round!.ids[0]:c.type==='number'?1:c.options?.[0]??'먼저 이야기한다';}
