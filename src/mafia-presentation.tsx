import{memo,useEffect,useRef,useState}from'react';
import{motion}from'motion/react';
import{PresentationEvents,sceneFor,type Presentation}from'./mafia-presentation-state';

// Kept in App so lobby -> ROLE_REVEAL is a live transition, not a fresh mount.
export function useMafiaPresentation(room:any,host:boolean,online:boolean){
 const[cue,setCue]=useState<Presentation|null>(null),[visible,setVisible]=useState(!document.hidden),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const tracker=useRef(new PresentationEvents()),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),recover=useRef<{room:any}|null>(null),phase=useRef('');
 useEffect(()=>{if(!host)return;const changed=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed);},[host]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>setReduced(media.matches);media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{
  const m=room?.round?.mafia,key=`${room?.code}:${room?.round?.id}:${m?.phase}`,inactive=!host||!online||!visible;
  if(host&&(!online||!visible))recover.current={room};
  const baseline=inactive||!!recover.current;
  const next=tracker.current.observe(room,baseline);
  if(recover.current&&online&&visible&&room!==recover.current.room)recover.current=null;
  if(inactive||!m||phase.current!==key){clearTimeout(timer.current);setCue(null);}phase.current=key;
  if(next&&!inactive){clearTimeout(timer.current);setCue(next);timer.current=setTimeout(()=>setCue(current=>current?.key===next.key?null:current),reduced?650:1600);}
 },[room,host,online,visible,reduced]);
 return{cue:host&&online&&visible?cue:null,reduced:!!reduced,scene:sceneFor(room?.round?.mafia?.phase)};
}
export const MafiaPresentation=memo(function MafiaPresentation({view}:{view:ReturnType<typeof useMafiaPresentation>}){
 const c=view.cue;
 return <><div className={'mafia-atmosphere mafia-atmosphere-'+view.scene} aria-hidden="true"/>{c&&<motion.div key={c.key} className={'mafia-transition mafia-transition-'+c.kind+(c.team?' mafia-transition-'+c.team:'')+(view.reduced?' mafia-transition-reduced':'')} data-testid="mafia-transition" data-cue={c.kind} role="status" aria-live="polite" initial={view.reduced?false:{opacity:0}} animate={view.reduced?{opacity:1}:{opacity:[0,1,1,0]}} transition={{duration:1.55,times:[0,.16,.75,1]}}><div className="mafia-transition-scrim" aria-hidden="true"/><motion.div className="mafia-transition-card" initial={view.reduced?false:{y:14,scale:.98}} animate={{y:0,scale:1}} transition={{duration:.35}}><span className="mafia-transition-orbit" aria-hidden="true"/><span className="eyebrow">GAPYEONG ARCADE · {c.day}일차</span><h2>{c.title}</h2><p>{c.detail}</p>{c.deaths.length>0&&<p className="mafia-transition-deaths">공개 사망자 · {c.deaths.join(' · ')}</p>}</motion.div></motion.div>}</>;
},(a,b)=>a.view.cue===b.view.cue&&a.view.reduced===b.view.reduced&&a.view.scene===b.view.scene);
