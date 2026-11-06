import{useEffect,useRef,useState}from'react';
import{activateAudioContext}from'./show';
import{AUDIO_SETTINGS_KEY,AudioEvents,audioFrame,audioSettings,type AudioSettings,type Music}from'./mafia-audio';
import{MafiaAudioEngine}from'./mafia-audio-engine';
import{acquireAudioOutput}from'./mafia-audio-lease';

const musicLabels:Record<Music,string>={waiting:'미스터리 · 대기',night:'서스펜스 · 밤',day:'추리 · 낮'};
export function useMafiaSound(room:any,host:boolean,online:boolean,selected:boolean){
 const active=host&&!!room&&!room.ceremony&&!room.final&&(!!room.round?.mafia||selected&&(!room.round||room.round.phase==='result'));
 const[prefs,setPrefs]=useState(()=>{try{return audioSettings(localStorage.getItem(AUDIO_SETTINGS_KEY));}catch{return audioSettings(null);}}),[armed,setArmed]=useState(false),[message,setMessage]=useState(''),[visible,setVisible]=useState(!document.hidden);
 const engine=useRef<MafiaAudioEngine|null>(null),release=useRef<(()=>void)|null>(null),generation=useRef(0),tracker=useRef(new AudioEvents()),previewTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),contextCleanup=useRef<(()=>void)|null>(null);
 const current=useRef({active,online,visible,prefs,room});current.current={active,online,visible,prefs,room};
 const reconnect=useRef<{room:any;waiting:boolean}>({room:null,waiting:false});
 const phaseKey=useRef('');
 const outputRoom=useRef(room?.code);
 const stop=()=>{generation.current++;clearTimeout(previewTimer.current);previewTimer.current=undefined;engine.current?.dispose();engine.current=null;release.current?.();release.current=null;contextCleanup.current?.();contextCleanup.current=null;setArmed(false);};
 useEffect(()=>{const change=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
 useEffect(()=>()=>{generation.current++;clearTimeout(previewTimer.current);engine.current?.dispose();release.current?.();contextCleanup.current?.();},[]);
 useEffect(()=>{try{localStorage.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(prefs));}catch{setMessage('설정을 저장할 수 없습니다. 현재 창에서만 적용됩니다.');}try{engine.current?.configure(prefs);if(!previewTimer.current)engine.current?.setMusic(audioFrame(current.current.room).music);}catch{stop();setMessage('사운드를 재생할 수 없습니다. 사운드 켜기를 눌러 주세요.');}},[prefs]);
 useEffect(()=>{const changed=outputRoom.current!==room?.code;outputRoom.current=room?.code;if(changed||!active||!online||!visible){stop();if(active&&prefs.master)setMessage(!online?'재접속 후 사운드 켜기를 눌러 주세요.':!visible?'탭으로 돌아오면 사운드 켜기를 눌러 주세요.':'');}},[active,online,visible,room?.code]);
 useEffect(()=>{
  if(!online){reconnect.current={room,waiting:true};}
  const rebasing=reconnect.current.waiting;
  const cues=tracker.current.observe(audioFrame(room),!active||!online||!visible||rebasing);
  if(rebasing&&online&&room!==reconnect.current.room)reconnect.current.waiting=false;
  const e=engine.current;if(!e)return;
  const frame=audioFrame(room),key=`${frame.room}:${frame.round}:${frame.phase}`;
  if(phaseKey.current!==key){clearTimeout(previewTimer.current);previewTimer.current=undefined;phaseKey.current=key;}
  try{if(!previewTimer.current)e.setMusic(frame.music);if(active&&online&&visible&&!rebasing)for(const cue of cues)e.play(cue);}catch{stop();setMessage('사운드를 재생할 수 없습니다. 사운드 켜기를 눌러 다시 시도하세요.');}
 },[room,active,online,visible]);
 const update=(part:Partial<AudioSettings>)=>setPrefs(p=>({...p,...part}));
 const enable=async()=>{
  if(armed){stop();update({master:false});setMessage('');return;}
  stop();const attempt=generation.current;setMessage('');
  try{
   const ctx=await activateAudioContext();
   if(attempt!==generation.current||!current.current.active)return;
   const unlock=await acquireAudioOutput(()=>{stop();setMessage('다른 Host 탭에서 사운드를 재생하고 있습니다.');});
   if(attempt!==generation.current||!current.current.active||!current.current.online||!current.current.visible){unlock?.();return;}
   if(!unlock){setMessage('다른 Host 탭에서 사운드를 재생 중이거나 출력 잠금을 사용할 수 없습니다.');return;}
   release.current=unlock;
   const e=new MafiaAudioEngine(ctx,{...current.current.prefs,master:true},()=>{stop();setMessage('사운드를 재생할 수 없습니다. 사운드 켜기를 눌러 주세요.');});engine.current=e;
   tracker.current.observe(audioFrame(current.current.room),true);e.setMusic(audioFrame(current.current.room).music);
   const stateChange=()=>{if(ctx.state!=='running'){stop();setMessage('브라우저가 사운드를 일시 중지했습니다. 사운드 켜기를 눌러 주세요.');}};
   ctx.addEventListener('statechange',stateChange);contextCleanup.current=()=>ctx.removeEventListener('statechange',stateChange);
   update({master:true});setArmed(true);
  }catch{stop();setMessage('사운드를 켤 수 없습니다. 브라우저 오디오 권한을 확인하고 다시 눌러 주세요.');}
 };
 const preview=(track:Music)=>{const e=engine.current;if(!e)return;clearTimeout(previewTimer.current);const fail=()=>{stop();setMessage('미리 듣기를 재생할 수 없습니다. 사운드 켜기를 눌러 주세요.');};try{e.setMusic(track);e.play('start');previewTimer.current=setTimeout(()=>{previewTimer.current=undefined;try{e.setMusic(audioFrame(current.current.room).music);}catch{fail();}},4000);}catch{fail();}};
 return{active,prefs,armed,message,enable,update,preview,music:audioFrame(room).music};
}
export function MafiaSoundControls({audio}:{audio:ReturnType<typeof useMafiaSound>}){
 const[track,setTrack]=useState<Music>('waiting');if(!audio.active)return null;
 return <div className="mafia-audio" data-testid="mafia-audio"><button type="button" className="quiet" aria-pressed={audio.armed} onClick={audio.enable}>{audio.armed?'🔊 사운드 끄기':'🔇 사운드 켜기'}</button><span>{audio.armed?(audio.music?musicLabels[audio.music]:'결과 발표'):'Host / TV 전용'}</span><details><summary>사운드 설정</summary><div className="mafia-audio-settings"><label><input type="checkbox" checked={audio.prefs.bgm} onChange={e=>audio.update({bgm:e.target.checked})}/> BGM</label><label><input type="checkbox" checked={audio.prefs.effects} onChange={e=>audio.update({effects:e.target.checked})}/> 효과음</label><label>전체 볼륨 {Math.round(audio.prefs.volume*100)}%<input aria-label="전체 볼륨" type="range" min="0" max="100" value={Math.round(audio.prefs.volume*100)} onChange={e=>audio.update({volume:Number(e.target.value)/100})}/></label><label>미리 듣기 음악<select value={track} onChange={e=>setTrack(e.target.value as Music)}>{Object.entries(musicLabels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label><button type="button" disabled={!audio.armed} onClick={()=>audio.preview(track)}>4초 미리 듣기</button><small>새로고침·재접속·탭 복귀 후 켜기 버튼을 눌러 주세요.</small></div></details>{audio.message&&<small role="status">{audio.message}</small>}</div>;
}
