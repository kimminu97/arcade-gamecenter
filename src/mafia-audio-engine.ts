import type{AudioSettings,Cue,Music}from'./mafia-audio';

// Original 32-second arrangements, synthesized locally. No sampled/third-party audio.
const chords:Record<Music,number[][]>={waiting:[[146.83,174.61,220],[130.81,164.81,196],[123.47,146.83,185],[138.59,174.61,207.65]],night:[[110,130.81,164.81],[103.83,123.47,155.56],[98,123.47,146.83],[110,138.59,164.81]],day:[[146.83,174.61,220],[130.81,164.81,196],[164.81,196,246.94],[138.59,174.61,207.65]]};
const motifs:Record<Cue,number[]>={start:[293.66,349.23,440,587.33],night:[220,164.81,146.83],day:[293.66,369.99,440],vote:[329.63,329.63,493.88],close:[196,207.65,196,146.83],death:[174.61,146.83,110],end:[293.66,349.23,440,587.33,880]};
type Source=AudioScheduledSourceNode;
type Layer={gain:GainNode;sources:Set<Source>;nodes:Set<AudioNode>};
export class MafiaAudioEngine{
 private master:GainNode;private musicBus:GainNode;private fxBus:GainNode;
 private music:Layer|null=null;private fading:Layer|null=null;private fx:Layer;private track:Music|null=null;
 private repeat?:ReturnType<typeof setTimeout>;private transition?:ReturnType<typeof setTimeout>;
 private settings:AudioSettings;private disposed=false;private fxEnd=0;
 constructor(private ctx:AudioContext,settings:AudioSettings,private onError:()=>void=()=>{}){
  this.settings=settings;this.master=ctx.createGain();this.musicBus=ctx.createGain();this.fxBus=ctx.createGain();
  this.musicBus.connect(this.master);this.fxBus.connect(this.master);this.master.connect(ctx.destination);this.fx=this.layer(this.fxBus);this.configure(settings);
 }
 private safely(work:()=>void){try{work();}catch{this.dispose();this.onError();}}
 private layer(bus:AudioNode):Layer{const gain=this.ctx.createGain();gain.connect(bus);return{gain,sources:new Set(),nodes:new Set()};}
 private clear(layer:Layer){for(const source of layer.sources){source.onended=null;try{source.stop();}catch{/* already ended */}source.disconnect();}for(const node of layer.nodes)node.disconnect();layer.sources.clear();layer.nodes.clear();layer.gain.disconnect();}
 private tone(layer:Layer,hz:number,at:number,duration:number,level:number,type:OscillatorType='sine',detune=0){
  const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.value=hz;osc.detune.value=detune;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+Math.min(.3,duration/8));gain.gain.setValueAtTime(level,at+duration*.65);gain.gain.linearRampToValueAtTime(0,at+duration);
  osc.connect(gain);gain.connect(layer.gain);layer.sources.add(osc);layer.nodes.add(gain);
  osc.onended=()=>{osc.disconnect();gain.disconnect();layer.sources.delete(osc);layer.nodes.delete(gain);};osc.start(at);osc.stop(at+duration+.01);
 }
 private phrase(track:Music,layer:Layer,at:number){
  const score=chords[track];
  score.forEach((chord,bar)=>{
   const start=at+bar*8;
   chord.forEach((hz,i)=>{this.tone(layer,hz,start,9,.018,'sine',-4+i*4);this.tone(layer,hz/2,start,8,.012,'triangle',3);});
   const step=track==='day'?.5:track==='night'?1:2;
   for(let i=0;i<8/step;i++){const hz=chord[[0,2,1,2,0,1,2,1][i%8]]*(track==='waiting'?2:1);this.tone(layer,hz,start+i*step,.35,track==='day'?.024:.014,'triangle');}
   if(track==='day')for(let i=0;i<8;i++){this.tone(layer,55,start+i,.12,.055);this.tone(layer,1760,start+i+.5,.035,.008,'triangle');}
  });
 }
 private begin(track:Music){
  if(this.disposed||this.track!==track||!this.settings.bgm)return;
  const layer=this.layer(this.musicBus);this.music=layer;layer.gain.gain.setValueAtTime(0,this.ctx.currentTime);layer.gain.gain.linearRampToValueAtTime(1,this.ctx.currentTime+.35);
  // Continuous, quiet filtered texture bridges phrase boundaries without a loop click.
  const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate),data=buffer.getChannelData(0);
  let value=0;for(let i=0;i<data.length;i++){value=(value+(Math.random()*2-1)*.025)/1.025;data[i]=value*.12;}
  const noise=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=track==='night'?220:track==='day'?700:400;
  noise.connect(filter);filter.connect(layer.gain);layer.sources.add(noise);layer.nodes.add(filter);noise.start();
  let next=this.ctx.currentTime+.02;
  const schedule=()=>{if(this.music!==layer||this.disposed)return;if(next<this.ctx.currentTime)next=this.ctx.currentTime+.02;this.phrase(track,layer,next);next+=32;this.repeat=setTimeout(()=>this.safely(schedule),Math.max(100,(next-this.ctx.currentTime-1)*1000));};schedule();
 }
 setMusic(track:Music|null){
  track=this.settings.bgm?track:null;if(this.disposed||this.track===track)return;this.track=track;clearTimeout(this.repeat);clearTimeout(this.transition);
  if(this.fading){this.clear(this.fading);this.fading=null;}const old=this.music;this.music=null;
  if(old){this.fading=old;old.gain.gain.cancelScheduledValues(this.ctx.currentTime);old.gain.gain.setValueAtTime(old.gain.gain.value,this.ctx.currentTime);old.gain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+.12);this.transition=setTimeout(()=>this.safely(()=>{this.clear(old);this.fading=null;if(track)this.begin(track);}),150);}
  else if(track)this.begin(track);
 }
 configure(settings:AudioSettings){this.settings=settings;this.master.gain.setTargetAtTime(settings.volume,this.ctx.currentTime,.03);this.fxBus.gain.value=settings.effects?1:0;if(!settings.bgm)this.setMusic(null);if(!settings.effects){this.clear(this.fx);this.fx=this.layer(this.fxBus);this.fxEnd=0;}}
 play(cue:Cue){if(this.disposed||!this.settings.effects)return;const at=Math.max(this.ctx.currentTime,this.fxEnd);motifs[cue].forEach((hz,i)=>this.tone(this.fx,hz,at+i*.12,.24,.09,cue==='death'?'triangle':'sine'));this.fxEnd=at+motifs[cue].length*.12+.25;}
 dispose(){if(this.disposed)return;this.disposed=true;this.master.gain.value=0;clearTimeout(this.repeat);clearTimeout(this.transition);if(this.music)this.clear(this.music);if(this.fading)this.clear(this.fading);this.clear(this.fx);this.master.disconnect();this.musicBus.disconnect();this.fxBus.disconnect();}
}
