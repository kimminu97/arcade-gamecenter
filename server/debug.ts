import{randomInt,randomUUID}from'node:crypto';
import{join,token,view,type Room,type Player}from'./game';
import{playerAction,type PlayerAction}from'./player-action';
import{fixtureDrawing,recognizeDrawing}from'./bot-drawing';
import data from './questions.json';
type Bot={id:string;silent:boolean;due:number;key:string;attempted:string;reactionMs:number|null};
type Debug={enabled:boolean;grant:string;auto:boolean;delay:number;accuracy:number;bots:Bot[];logs:{at:number;event:string;detail:string}[]};
export function createDebugService(environment:string,notify:(r:Room,event?:string,payload?:unknown)=>void){
 if(environment!=='development')throw Error('개발 환경에서만 사용할 수 있습니다.');
 const states=new WeakMap<Room,Debug>();
 function state(r:Room){let d=states.get(r);if(!d){d={enabled:false,grant:'',auto:true,delay:700,accuracy:.7,bots:[],logs:[]};states.set(r,d);}return d;}
 function log(r:Room,event:string,detail=''){const d=state(r);d.logs.push({at:Date.now(),event,detail});if(d.logs.length>150)d.logs.shift();}
 function requireBot(r:Room,id:string){const bot=state(r).bots.find(b=>b.id===id),p=r.players.find(p=>p.id===id);if(!bot||!p)throw Error('Bot을 찾을 수 없습니다.');return{bot,p};}
 function perform(r:Room,id:string,a:PlayerAction){const before=r.round?.phase,out=playerAction(r,id,a);log(r,`bot:${a.type}`,`${r.players.find(p=>p.id===id)?.name}: ${out.message}`);notify(r,out.event,out.stroke);if(before!==r.round?.phase)log(r,'phase',`${before} → ${r.round?.phase}`);return out.message;}
 function act(r:Room,bot:Bot){const d=state(r),p=r.players.find(p=>p.id===bot.id),snapshot=view(r,bot.id),g=snapshot.round;if(!p?.online||p.excluded||bot.silent||!g||g.paused||g.phase==='result'||!g.ids.includes(bot.id))return;
 const key=`${g.id}:${g.phase}`;if(bot.attempted===key||g.phase!=='draw'&&g.submitted.includes(bot.id))return;
 let value:unknown;
 if(g.phase==='quiz'&&g.quiz)value=g.quiz.options[randomInt(g.quiz.options.length)].id;
 else if(g.phase==='explain'&&g.quiz){if(!g.quiz.canExplain)return;value='그때는 주파수가 잠깐 흔들렸습니다. 지금은 정상 수신 중입니다!';}
 else if(g.phase==='jury'&&g.quiz){if(g.quiz.isDefendant)return;value=randomInt(1,6);}
 else if(g.mode==='spy'&&g.phase==='discuss'){value=['상대의 입장을 먼저 듣고 내 기준을 설명하겠다','내가 같은 일을 당했을 때를 생각해 보고 판단하겠다','의도와 이후의 태도를 보고 결정하겠다'][randomInt(3)];}
 else if(g.phase==='answer'){value='먼저 서로의 생각을 들어 보겠다';}
 else if(g.phase==='vote'){const ids=g.ids.filter(id=>id!==bot.id||(g.mode==='court'&&r.selfVote));value=ids[randomInt(ids.length)];}
 else if(g.phase==='predict')value=randomInt(2)===1;
 else if(g.phase==='choose')value=randomInt(1,101);
 else if(g.phase==='draw'){if(g.drawer===bot.id){if(!g.word)return;for(const stroke of fixtureDrawing(g.word))perform(r,bot.id,{type:'stroke',stroke});bot.attempted=key;bot.reactionMs=Math.max(0,Date.now()-g.phaseStartedAt);return;}
 if(g.correct.includes(bot.id))return;const recognized=recognizeDrawing(g.strokes);if(!recognized&&g.strokes.length<11)return;value=recognized&&Math.random()<d.accuracy?recognized:data.words.filter(w=>w!==recognized)[randomInt(data.words.length-(recognized?1:0))];}
 else return;
 perform(r,bot.id,{type:'submit',value});bot.attempted=key;bot.reactionMs=Math.max(0,Date.now()-g.phaseStartedAt);
 }
 function command(r:Room,socketId:string,grant:string|undefined,a:any){const d=state(r);if(r.hostSocket!==socketId)throw Error('진행자만 개발자 권한을 요청할 수 있습니다.');if(a.type==='debug:unlock'){d.grant=token();log(r,'debug:unlock','개발자 권한 발급');return{grant:d.grant};}if(!grant||grant!==d.grant)throw Error('개발자 권한을 먼저 활성화하세요.');
 if(!d.enabled&&!['debug:enable','debug:reset'].includes(a.type))throw Error('개발자 테스트 모드를 켜세요.');
 switch(a.type){case'debug:enable':d.enabled=!!a.enabled;r.devTest=d.enabled;break;
 case'debug:inspect':if(a.botId)requireBot(r,a.botId);break;
 case'debug:add':{if(!d.enabled)throw Error('개발자 테스트 모드를 켜세요.');if(r.round)throw Error('대기실에서 Bot을 추가하세요.');const n=Number(a.count);if(!Number.isInteger(n)||n<1||n>6||r.players.length+n>7||d.bots.length+n>6)throw Error('Bot 1~6명, 전체 최대 7명입니다.');for(let i=0;i<n;i++){const suffix=randomUUID().slice(0,4),p=join(r,`봇-${suffix}`,['🤖','👾','🦊','🐼','🐸','🐻'][d.bots.length%6],`bot:${suffix}`);p.bot=true;d.bots.push({id:p.id,silent:false,due:0,key:'',attempted:'',reactionMs:null});}break;}
 case'debug:config':{if(typeof a.auto==='boolean')d.auto=a.auto;if(a.delay!==undefined){if(!Number.isInteger(a.delay)||a.delay<0||a.delay>10000)throw Error('지연은 0~10000ms입니다.');d.delay=a.delay;}if(a.accuracy!==undefined){if(typeof a.accuracy!=='number'||a.accuracy<0||a.accuracy>1)throw Error('정답률은 0~1입니다.');d.accuracy=a.accuracy;}for(const b of d.bots)b.key='';break;}
 case'debug:silent':{const{bot}=requireBot(r,a.id);bot.silent=!!a.silent;break;}
 case'debug:connection':{const{p,bot}=requireBot(r,a.id);p.online=!!a.online;bot.key='';break;}
 case'debug:manual':{if(d.auto)throw Error('자동 플레이를 먼저 끄세요.');const{bot}=requireBot(r,a.id);if(a.action?.type!=='submit'&&a.action?.type!=='stroke'&&a.action?.type!=='clear')throw Error('허용되지 않은 Bot 행동');perform(r,bot.id,a.action);break;}
 case'debug:respond':{if(d.auto)throw Error('자동 플레이를 먼저 끄세요.');const{bot}=requireBot(r,a.id);act(r,bot);break;}
 case'debug:now':if(!d.enabled)throw Error('개발자 테스트 모드를 켜세요.');for(const b of d.bots)act(r,b);break;
 case'debug:timer':{const ms=Number(a.ms);if(!Number.isInteger(ms)||ms<100||ms>10000)throw Error('100~10000ms로 입력하세요.');if(r.round&&r.round.phase!=='result'){if(r.round.paused)r.round.paused=ms;else r.round.deadline=Date.now()+ms;}break;}
 case'debug:score':{const p=r.players.find(p=>p.id===a.id);if(!p||!Number.isInteger(a.score)||Math.abs(a.score)>99999)throw Error('점수를 확인하세요.');if(r.final)throw Error('시상식 이후에는 초기화하세요.');p.score=a.score;break;}
 case'debug:reset':r.yangUsed={};r.yangLastTopic=undefined;r.questionDecks={};r.bankUsed={};r.spyUsed=[];r.chatUsed=[];r.round=null;r.final=false;r.roulette=null;r.turn=0;r.drawOrder=[];r.history=[];r.used={};r.players.forEach(p=>{p.score=0;p.excluded=false;if(p.bot)p.online=true;});d.bots.forEach(b=>{b.key='';b.attempted='';b.silent=false;b.reactionMs=null;});break;
 default:throw Error('알 수 없는 개발자 요청');}
 log(r,a.type);return{};
 }
 function tick(r:Room){const d=states.get(r);if(!d?.enabled||!d.auto)return;const g=r.round;if(!g||g.paused||g.phase==='result')return;for(const b of d.bots){const key=`${g.id}:${g.phase}`;if(b.key!==key){b.key=key;b.due=Date.now()+d.delay+randomInt(0,Math.max(1,Math.floor(d.delay*.25)));}if(Date.now()>=b.due){try{act(r,b);}catch(e){log(r,'bot:error',e instanceof Error?e.message:'실패');b.attempted=key;}}}}
 function snapshot(r:Room,grant?:string,botId?:string){const d=state(r);if(!grant||grant!==d.grant)return null;return{enabled:d.enabled,auto:d.auto,delay:d.delay,accuracy:d.accuracy,bots:d.bots.map(b=>({...b})),logs:d.logs,botView:r.round?.mode==='yang'?null:botId&&d.bots.some(b=>b.id===botId)?view(r,botId):null};}
 return{command,tick,snapshot,log};
}
