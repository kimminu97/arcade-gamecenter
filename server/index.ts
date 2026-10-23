import {configureQuestionState,bankPage,managedGame,setQuestionDisabled,purgeQuestionDecks} from './question-bank';
import {openQuestionState} from './question-state-store';
import {join as joinPath,resolve} from 'node:path';
import {loadQuizContext} from './chat/quiz';
import express from 'express';
import {installChat} from './chat/service';
import {playerAction} from './player-action';
const development=process.env.NODE_ENV==='development';
import {roll} from './show';
import {createServer} from 'node:http';
import {networkInterfaces} from 'node:os';
import {Server} from 'socket.io';
import {createRoom,join,rooms,start,advance,finish,view} from './game';
const app=express(),http=createServer(app),io=new Server(http,{maxHttpBufferSize:20000});
const port=Number(process.env.PORT||3000);
installChat(app);
const questionState=openQuestionState(joinPath(resolve(process.env.QUESTION_DATA_DIR||process.env.CHAT_DATA_DIR||'.chat-data'),'question-bank.sqlite'));configureQuestionState(questionState);
const addresses=Object.values(networkInterfaces()).flat().filter(a=>a?.family==='IPv4'&&!a.internal).map(a=>`http://${a!.address}:${port}`);
app.get('/api/network',(_req,res)=>res.json({addresses,publicUrl:process.env.PUBLIC_URL||null}));
app.get('/api/health',(_req,res)=>res.json({ok:true,development}));
const debug=development?(await import('./debug')).createDebugService('development',(r,event,payload)=>{if(event){for(const peer of io.sockets.sockets.values())if(peer.data.code===r.code)peer.emit(event,payload);}else broadcast(r.code);}):null;
function broadcast(code:string){const r=rooms.get(code);if(!r)return;for(const s of io.sockets.sockets.values())if(s.data.code===code)s.emit('state',{...view(r,s.data.playerId||'',s.data.role==='host'),...(development&&s.data.role==='host'?{developerAvailable:true,debug:debug?.snapshot(r,s.data.debugGrant,s.data.debugBot)}:{})});}
io.on('connection',s=>{
 let windowStart=Date.now(),calls=0;
 s.on('action',(a:any,ack:any)=>{try{if(typeof ack!=='function')return;if(Date.now()-windowStart>1000){calls=0;windowStart=Date.now();}if(++calls>100)throw Error('잠시 후 다시 시도하세요.');if(!a||typeof a!=='object')throw Error('잘못된 요청');if(String(a.type).startsWith('debug:')&&!debug)throw Error('운영 환경에서는 개발자 기능을 사용할 수 없습니다.');
 if(a.type==='create'){if(s.data.code)throw Error('이미 방에 연결되어 있습니다.');const r=createRoom(s.id);s.data={code:r.code,role:'host'};ack({ok:true,session:{code:r.code,token:r.hostToken,role:'host'}});broadcast(r.code);return;}
 if(a.type==='join'||a.type==='resume'){if(s.data.code)throw Error('이미 방에 연결되어 있습니다.');const code=String(a.code||'').toUpperCase(),r=rooms.get(code);if(!r)throw Error('방을 찾을 수 없습니다. 서버가 재시작되었을 수 있습니다.');let session:any;
 if(a.type==='resume'){if(a.token===r.hostToken){const old=io.sockets.sockets.get(r.hostSocket);if(old&&old.id!==s.id){old.emit('replaced');old.disconnect();}r.hostSocket=s.id;s.data={code,role:'host'};session={code,token:r.hostToken,role:'host'};}else{const p=r.players.find(p=>p.token===a.token);if(!p)throw Error('재접속 정보가 유효하지 않습니다.');const old=io.sockets.sockets.get(p.socket);if(old&&old.id!==s.id){old.emit('replaced');old.disconnect();}p.online=true;p.socket=s.id;s.data={code,role:'player',playerId:p.id};session={code,token:p.token,role:'player',id:p.id};}}
 else{const p=join(r,String(a.name||''),String(a.avatar||'🎮'),s.id);s.data={code,role:'player',playerId:p.id};session={code,token:p.token,role:'player',id:p.id};}debug?.log(r,a.type);ack({ok:true,session});broadcast(code);return;}
 const r=rooms.get(s.data.code);if(!r)throw Error('먼저 방에 입장하세요.');let message='완료';
 if(String(a.type).startsWith('debug:')){if(s.data.role!=='host'||r.hostSocket!==s.id||!debug)throw Error('개발자 관리자 권한이 필요합니다.');const out=debug.command(r,s.id,a.grant,a);if(out.grant)s.data.debugGrant=out.grant;if(a.botId!==undefined)s.data.debugBot=a.botId;ack({ok:true,...out});broadcast(r.code);return;}
 if(a.type==='chat:reveal-context'){ack({ok:true,messages:loadQuizContext(r,String(a.roundId))});return;}
 if(a.type==='submit'||a.type==='stroke'||a.type==='clear'){if(s.data.role!=='player')throw Error('참가자 전용 기능입니다.');const out=playerAction(r,s.data.playerId,a);message=out.message;if(out.event){for(const peer of io.sockets.sockets.values())if(peer.data.code===r.code)peer.emit(out.event,out.stroke);ack({ok:true});return;}}
 else{if(s.data.role!=='host'||r.hostSocket!==s.id)throw Error('진행자 전용 기능입니다.');switch(a.type){case 'bank:list':{const mode=managedGame(a.mode);if(mode==='spy'&&r.round?.mode==='spy'&&r.round.phase!=='result')throw Error('스파이 라운드 종료 후 질문 세트를 관리할 수 있습니다.');ack({ok:true,...bankPage(mode,a)});return;}
 case 'bank:set':case 'bank:exclude-current':{let mode,id,disabled;if(a.type==='bank:exclude-current'){const g=r.round;if(!g||g.phase!=='result'||g.id!==a.roundId||!g.questionId)throw Error('현재 라운드 결과 화면에서만 제외할 수 있습니다.');mode=managedGame(g.mode);id=g.questionId;disabled=true;}else{mode=managedGame(a.mode);id=String(a.id||'');if(typeof a.disabled!=='boolean')throw Error('제외 상태를 확인하세요.');disabled=a.disabled;}const change=setQuestionDisabled(mode,id,disabled);if(disabled)purgeQuestionDecks(rooms.values(),mode,id);ack({ok:true,...change,disabled});for(const code of rooms.keys())broadcast(code);io.emit('bank:changed',{mode});return;}
 case 'roulette':roll(r);break;case 'events':if(r.round&&r.round.phase!=='result')throw Error('이벤트 설정은 라운드 사이에 변경하세요.');r.eventsEnabled=!!a.enabled;break;case 'settings':r.test=!!a.test;r.selfVote=!!a.selfVote;r.category=a.category==='fun'?'fun':'mild';r.seconds=Math.max(10,Math.min(300,Number(a.seconds)||60));break;
 case 'start':start(r,a.mode);break;case 'advance':advance(r);break;case 'reveal':finish(r);break;
 case 'pause':if(r.round&&r.round.deadline){if(r.round.paused){r.round.deadline=Date.now()+r.round.paused;r.round.paused=0;}else r.round.paused=Math.max(1,r.round.deadline-Date.now());}break;
 case 'extend':if(r.round&&r.round.deadline){if(r.round.paused)r.round.paused+=15000;else r.round.deadline+=15000;}break;
 case 'exclude':{const p=r.players.find(p=>p.id===a.id);if(!p)throw Error('참가자가 없습니다.');p.excluded=!p.excluded;const g=r.round;if(p.excluded&&g&&g.phase!=='result'){g.ids=g.ids.filter(id=>id!==p.id);delete g.answers[p.id];delete g.votes[p.id];delete g.predictions[p.id];delete g.numbers[p.id];for(const id of Object.keys(g.votes))if(g.votes[id]===p.id)delete g.votes[id];g.correct=g.correct.filter(id=>id!==p.id);if(g.ids.length<2||g.spy===p.id||g.drawer===p.id){r.round=null;}}break;}
 case 'score':{if(r.final)throw Error('최종 결과 공개 후에는 점수를 수정할 수 없습니다.');const p=r.players.find(p=>p.id===a.id);if(!p||!Number.isInteger(a.score)||Math.abs(a.score)>99999)throw Error('점수를 확인하세요.');p.score=a.score;break;}
 case 'stop':r.round=null;r.roulette=null;break;case 'final':if(r.round&&r.round.phase!=='result')throw Error('라운드를 먼저 끝내세요.');if(!r.history.length)throw Error('한 라운드 이상 진행하세요.');if(r.roulette&&Date.now()<r.roulette.endsAt)throw Error('룰렛이 끝난 뒤 시상식을 여세요.');r.roulette=null;r.final=true;break;case 'reset':r.questionDecks={};r.bankUsed={};r.spyUsed=[];r.chatUsed=[];r.roulette=null;r.final=false;r.round=null;r.history=[];r.turn=0;r.drawOrder=[];r.players.forEach(p=>p.score=0);break;default:throw Error('알 수 없는 요청');}}
 debug?.log(r,a.type);ack({ok:true,message});broadcast(r.code);
 }catch(e){const failedRoom=rooms.get(s.data.code);if(failedRoom)debug?.log(failedRoom,'rejected',String(a?.type));if(typeof ack==='function')ack({ok:false,error:e instanceof Error?e.message:'요청 실패'});}});
 s.on('disconnect',()=>{const r=rooms.get(s.data.code);if(!r)return;const p=r.players.find(p=>p.socket===s.id);if(p)p.online=false;debug?.log(r,'disconnect',p?.name||'진행자');broadcast(r.code);});
});
setInterval(()=>{for(const r of rooms.values()){debug?.tick(r);if(r.round&&r.round.deadline&&!r.round.paused&&r.round.deadline<=Date.now()){advance(r);debug?.log(r,'timer:expired',r.round?.phase);broadcast(r.code);}if(Date.now()-r.created>24*3600000&&!r.players.some(p=>p.online)&&!io.sockets.sockets.has(r.hostSocket))rooms.delete(r.code);}},250).unref();
if(development){const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}else{app.use(express.static('dist'));app.get('/{*path}',(_req,res)=>res.sendFile('index.html',{root:'dist'}));}
http.listen(port,'0.0.0.0',()=>console.log(`GAPYEONG ARCADE http://localhost:${port}\n스마트폰 접속: ${process.env.PUBLIC_URL||addresses.join(' 또는 ')}\n동일한 Wi-Fi에 연결하세요.`));
