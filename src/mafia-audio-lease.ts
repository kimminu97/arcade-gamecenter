// One output per origin/profile. Web Locks release automatically when a tab closes.
export async function acquireAudioOutput(onLost:()=>void):Promise<(()=>void)|null>{
 if(navigator.locks){
  return new Promise(resolve=>{
   navigator.locks.request('gapyeong-mafia-audio-output',{ifAvailable:true},async lock=>{
    if(!lock){resolve(null);return;}
    await new Promise<void>(release=>resolve(release));
   }).catch(()=>resolve(null));
  });
 }
 // Older browsers: expiring storage lease, verified after competing writes settle.
 const key='gapyeong.mafia.audio.output.v1',owner=crypto.randomUUID();let timer:ReturnType<typeof setInterval>|undefined,stopped=false;
 const read=()=>{try{return JSON.parse(localStorage.getItem(key)??'null');}catch{return null;}};
 const write=()=>localStorage.setItem(key,JSON.stringify({owner,expires:Date.now()+5000}));
 const release=()=>{if(stopped)return;stopped=true;clearInterval(timer);removeEventListener('storage',check);try{if(read()?.owner===owner)localStorage.removeItem(key);}catch{/* storage unavailable */}};
 const check=()=>{if(read()?.owner!==owner){release();onLost();}};
 try{
  const current=read();if(current&&current.expires>Date.now())return null;write();await new Promise(r=>setTimeout(r,80));if(read()?.owner!==owner)return null;
  addEventListener('storage',check);timer=setInterval(()=>{check();if(!stopped)try{write();}catch{release();onLost();}},1000);return release;
 }catch{release();return null;}
}
