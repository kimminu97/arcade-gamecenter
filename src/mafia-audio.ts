// Public-only projection: never inspect roles, votes, targets, reports or abilities.
export type Music='waiting'|'night'|'day';
export type Cue='start'|'night'|'day'|'vote'|'close'|'death'|'end';
export type AudioFrame={room:string;round:string;phase:string;music:Music|null;cues:{key:string;cue:Cue}[]};
export function audioFrame(room:any):AudioFrame{
 const m=room?.round?.mafia,round=room?.round?.id??'',scope=`${round}:`,phase=m?.phase??'LOBBY',cues:AudioFrame['cues']=[];
 const add=(cue:Cue,key:string)=>cues.push({cue,key:scope+key});
 if(m){
  if(phase==='ROLE_REVEAL')add('start','start');
  if(phase==='NIGHT')add('night',`night:${m.nightId}`);
  if(phase==='DAY_ANNOUNCEMENT'||phase==='DAY_DISCUSSION')add('day',`day:${m.day}`);
  if(phase==='DAY_VOTE')add('vote',`vote:${m.day}`);
  if(['EXECUTION_PENDING','DAY_RESOLUTION','REVENGE_PENDING','GAME_END'].includes(phase)){
   if(m.executionPending||m.events?.some((e:any)=>e.kind==='vote'&&e.day===m.day))add('close',`close:${m.day}`);
  }
  for(const e of m.events??[])if(e.deaths?.length)add('death',`death:${e.kind}:${e.day}:${e.nightId??''}:${e.execution?.id??''}`);
  if(phase==='GAME_END')add('end','end');
 }
 return{room:room?.code??'',round,phase,music:phase==='GAME_END'?null:phase==='LOBBY'||phase==='ROLE_REVEAL'?'waiting':phase==='NIGHT'?'night':'day',cues};
}
export class AudioEvents{
 private room='';private round='';private seen=new Set<string>();private ready=false;
 observe(frame:AudioFrame,baseline=false):Cue[]{
  const changed=this.room!==frame.room,roundChanged=this.round!==frame.round;
  if(changed||roundChanged)this.seen.clear();
  // A live lobby -> role reveal is a new start; joining an existing game is silent.
  const silent=baseline||!this.ready||changed||roundChanged&&frame.phase!=='ROLE_REVEAL';
  this.ready=true;this.room=frame.room;this.round=frame.round;
  const out:Cue[]=[];
  for(const{key,cue}of frame.cues)if(!this.seen.has(key)){this.seen.add(key);if(!silent)out.push(cue);}
  return out;
 }
}
export const AUDIO_SETTINGS_KEY='gapyeong.mafia.audio.settings.v1';
export type AudioSettings={master:boolean;bgm:boolean;effects:boolean;volume:number};
export function audioSettings(raw:string|null):AudioSettings{
 const defaults:AudioSettings={master:false,bgm:true,effects:true,volume:.3};
 try{const p=JSON.parse(raw??'null');if(!p)return defaults;return{master:p.master===true,bgm:typeof p.bgm==='boolean'?p.bgm:true,effects:typeof p.effects==='boolean'?p.effects:true,volume:typeof p.volume==='number'&&Number.isFinite(p.volume)?Math.max(0,Math.min(1,p.volume)):.3};}catch{return defaults;}
}
