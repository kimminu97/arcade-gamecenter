import {createReportState,publishReservedNews,anonymousReportView,journalistInboxView,publicNewsView,type ReportState} from './reports';
import {drawMafiaSlots,defaultMafiaConfig,type MafiaConfig} from './config';
import {createNightChat,mafiaChatView,type NightChat} from './chat';
import {captureNight,canAutoResolveNight,type NightReceipt} from './night-flow';
import {randomInt,randomUUID} from 'node:crypto';
import {roles,compositionValidators,type RoleId,type Team} from './roles';
import {validAbilityTarget,type Investigation} from './abilities';
import {emptyAttack,selectAttack,attackMembers,type SharedAttack} from './team-attack';
export type MafiaPhase='ROLE_REVEAL'|'NIGHT'|'NIGHT_RESOLUTION'|'DAY_ANNOUNCEMENT'|'DAY_DISCUSSION'|'DAY_VOTE'|'DAY_RESOLUTION'|'GAME_END';
export type MafiaEvent={day:number;nightId?:string;kind:'night'|'vote';deaths:string[];voteCounts?:Record<string,number>;isTie?:boolean;validVotes?:number};
export type SecretActionLog={day:number;at:number;actorId?:string;kind:'attackChoice'|'attackLocked'|'specialAction'|'roleInvestigation'|'nightProtection'|'nightResolved';nightId?:string;visibility?:'team'|'actor'|'server';targetId?:string};
export type MafiaState={id:string;nightId:string;anonymousReports:ReportState;privateChats:Record<string,NightChat>;nightResolutions:Record<string,NightReceipt>;phase:MafiaPhase;version:number;day:number;ids:string[];roleById:Record<string,RoleId>;alive:string[];actions:Record<string,string>;attack:SharedAttack;revisions:Record<string,number>;abilityUsed:Record<string,number>;secretLog:SecretActionLog[];nightSeconds:number;nightEndsAt:number;votes:Record<string,string>;reports:Record<string,Investigation[]>;events:MafiaEvent[];winner?:Team;winnerPlayerIds?:string[]};
export function createMafia(ids:string[],nightSeconds=60,config:MafiaConfig=defaultMafiaConfig(ids.length)):MafiaState{
 if(ids.length<5||ids.length>7||new Set(ids).size!==ids.length)throw Error('마피아 게임은 5~7명의 서로 다른 참가자가 필요합니다.');
 const deck=drawMafiaSlots(config,ids.length);for(const check of compositionValidators){const error=check(deck);if(error)throw Error(error);}for(let i=deck.length-1;i>0;i--){const j=randomInt(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}
 return{id:randomUUID(),nightId:'',anonymousReports:createReportState(),privateChats:{},nightResolutions:{},phase:'ROLE_REVEAL',version:0,day:1,ids:[...ids],roleById:Object.fromEntries(ids.map((id,i)=>[id,deck[i]])),alive:[...ids],actions:{},attack:emptyAttack(),revisions:{},abilityUsed:{},secretLog:[],nightSeconds:Math.max(10,Math.min(300,Math.floor(nightSeconds)||60)),nightEndsAt:0,votes:{},reports:{},events:[]};
}
// Future neutral/personal evaluators run before team victories; no neutral job is active in phase 1.
export type Victory={team:Team;playerIds?:string[]};
export const personalVictoryRules:((m:MafiaState)=>Victory|undefined)[]=[];
export const victoryRules:((m:MafiaState)=>Victory|undefined)[]=[m=>{const mafia=m.alive.filter(id=>roles[m.roleById[id]].team==='mafia').length,others=m.alive.length-mafia;return mafia===0?{team:'town'}:mafia>=others?{team:'mafia'}:undefined;}];
function checkVictory(m:MafiaState){const result=[...personalVictoryRules,...victoryRules].map(rule=>rule(m)).find(Boolean);if(result){m.winner=result.team;m.winnerPlayerIds=result.playerIds??m.ids.filter(id=>roles[m.roleById[id]].team===result.team);m.phase='GAME_END';}}
export function mafiaTargets(m:MafiaState,id:string){
 if(!m.alive.includes(id))return[];
 if(m.phase==='DAY_VOTE')return [...m.alive];
 if(m.phase!=='NIGHT')return[];const role=roles[m.roleById[id]];
 if(attackMembers(m.alive,m.roleById).includes(id))return m.alive.filter(t=>roles[m.roleById[t]].team!=='mafia');
 if(role.abilityType==='none'||role.abilityUses!==null&&(m.abilityUsed[id]||0)>=role.abilityUses)return[];
 return m.alive.filter(t=>validAbilityTarget(role.abilityType,id,t,m.alive));
}
export function assertMafiaVersion(m:MafiaState,version:unknown){if(m.version!==version)throw Error('단계가 변경되었습니다. 현재 화면에서 다시 시도하세요.');}
function beginNight(m:MafiaState,now:number){m.phase='NIGHT';m.nightId=randomUUID();m.privateChats[m.nightId]=createNightChat();m.actions={};m.attack=emptyAttack();m.revisions={};m.votes={};m.nightEndsAt=now+m.nightSeconds*1000;}
export function extendMafiaNight(m:MafiaState,version:unknown,now=Date.now()){
 assertMafiaVersion(m,version);if(m.phase!=='NIGHT'||now>=m.nightEndsAt)throw Error('진행 중인 밤에만 연장할 수 있습니다.');m.nightEndsAt+=30000;m.version++;
}
export function advanceMafia(m:MafiaState,version:unknown,now=Date.now()){
 assertMafiaVersion(m,version);
 switch(m.phase){
 case 'ROLE_REVEAL':beginNight(m,now);break;
 case 'NIGHT':{if(m.nightResolutions[m.nightId])throw Error('이미 판정한 밤입니다.');publishReservedNews(m,now);m.phase='NIGHT_RESOLUTION';const receipt=captureNight(m,now),outcome=receipt.outcome;m.nightResolutions[m.nightId]=receipt;for(const {id,report} of outcome.investigations)(m.reports[id]??=[]).push(report);m.alive=m.alive.filter(id=>!outcome.deaths.includes(id));m.secretLog.push({day:m.day,at:now,kind:'nightResolved',nightId:m.nightId,visibility:'server'});m.events.push({day:m.day,nightId:m.nightId,kind:'night',deaths:outcome.deaths});m.nightEndsAt=0;m.phase='DAY_ANNOUNCEMENT';checkVictory(m);break;}
 case 'DAY_ANNOUNCEMENT':m.phase='DAY_DISCUSSION';break;
 case 'DAY_DISCUSSION':m.phase='DAY_VOTE';m.votes={};m.revisions={};break;
 case 'DAY_VOTE':{const voteCounts:Record<string,number>=Object.fromEntries(m.alive.map(id=>[id,0]));Object.values(m.votes).forEach(id=>voteCounts[id]++);const max=Math.max(0,...Object.values(voteCounts)),tops=max?m.alive.filter(id=>voteCounts[id]===max):[],deaths=tops.length===1?tops:[];m.events.push({day:m.day,kind:'vote',deaths,voteCounts,isTie:tops.length>1,validVotes:Object.keys(m.votes).length});m.alive=m.alive.filter(id=>!deaths.includes(id));m.phase='DAY_RESOLUTION';checkVictory(m);break;}
 case 'DAY_RESOLUTION':m.day++;beginNight(m,now);break;
 default:throw Error('지금은 단계를 진행할 수 없습니다.');
 }m.version++;
}
export function submitMafia(m:MafiaState,id:string,value:any,now=Date.now()){
 if(!value||value.roundId!==m.id)throw Error('현재 마피아 게임을 확인하세요.');assertMafiaVersion(m,value.version);if(value.nightId!==undefined&&value.nightId!==m.nightId)throw Error('현재 밤을 확인하세요.');
 if(!m.ids.includes(id)||!m.alive.includes(id))throw Error('생존 참가자만 행동할 수 있습니다.');
 if(m.phase==='NIGHT'&&now>=m.nightEndsAt)throw Error('밤 행동 시간이 끝났습니다.');
 if(value.revision!==(m.revisions[id]||0))throw Error('행동 상태가 변경되었습니다. 현재 화면에서 다시 시도하세요.');
 const target=value.targetId;if(typeof target!=='string'||!mafiaTargets(m,id).includes(target))throw Error('행동 단계와 대상을 확인하세요.');
 if(m.phase==='NIGHT'){
  if(attackMembers(m.alive,m.roleById).includes(id)){selectAttack(m.attack,attackMembers(m.alive,m.roleById),id,target);m.secretLog.push({day:m.day,at:now,kind:'attackChoice',nightId:m.nightId,visibility:'team',actorId:id,targetId:target});if(m.attack.locked)m.secretLog.push({day:m.day,at:now,kind:'attackLocked',nightId:m.nightId,visibility:'team',targetId:target});}
  else{if(m.actions[id]!==undefined)throw Error('이미 제출했습니다.');m.actions[id]=target;m.abilityUsed[id]=(m.abilityUsed[id]||0)+1;m.secretLog.push({day:m.day,at:now,kind:roles[m.roleById[id]].abilityType==='protect'?'nightProtection':'roleInvestigation',nightId:m.nightId,visibility:'actor',actorId:id,targetId:target});}
  m.revisions[id]=(m.revisions[id]||0)+1;
  if(canAutoResolveNight(m))advanceMafia(m,m.version,now);
 }else{if(m.votes[id]!==undefined)throw Error('이미 제출했습니다.');m.votes[id]=target;m.revisions[id]=(m.revisions[id]||0)+1;if(m.alive.every(actor=>m.votes[actor]!==undefined))advanceMafia(m,m.version,now);}
}
export function expireMafiaNight(m:MafiaState,now=Date.now()){if(m.phase!=='NIGHT'||now<m.nightEndsAt)return false;advanceMafia(m,m.version,now);return true;}
export function mafiaView(m:MafiaState,id:string){
 const member=m.ids.includes(id),ended=m.phase==='GAME_END',mine=member?roles[m.roleById[id]]:undefined,isMafia=mine?.team==='mafia',alive=m.alive.includes(id),attackActor=attackMembers(m.alive,m.roleById).includes(id);
 return{id:m.id,nightId:m.nightId,anonymousReport:anonymousReportView(m,id),journalistInbox:journalistInboxView(m,id),news:publicNewsView(m),chat:mafiaChatView(m,id),phase:m.phase,version:m.version,day:m.day,ids:m.ids,alive:m.alive,dead:m.ids.filter(id=>!m.alive.includes(id)),events:m.events,winner:m.winner,winnerPlayerIds:m.winnerPlayerIds,serverNow:Date.now(),nightEndsAt:m.nightEndsAt,nightSeconds:m.nightSeconds,
 nightProgress:m.phase==='NIGHT'?{submitted:Object.keys(m.actions).length+Object.keys(m.attack.selections).length,total:m.alive.length}:undefined,
 voteProgress:m.phase==='DAY_VOTE'?{submitted:Object.keys(m.votes).length,total:m.alive.length}:undefined,
 ownRole:mine,teammateIds:isMafia?m.alive.filter(p=>p!==id&&roles[m.roleById[p]].team==='mafia'):undefined,
 reports:member?m.reports[id]||[]:undefined,revision:member?m.revisions[id]||0:undefined,
 attack:isMafia&&alive&&m.phase==='NIGHT'?{locked:m.attack.locked,targetId:m.attack.locked?m.attack.targetId:undefined,selections:m.attack.selections,counts:Object.fromEntries(m.alive.filter(target=>roles[m.roleById[target]].team!=='mafia').map(target=>[target,Object.values(m.attack.selections).filter(id=>id===target).length])),unselectedCount:attackMembers(m.alive,m.roleById).filter(actor=>!m.attack.selections[actor]).length}:undefined,
 selectedTargetId:member?(m.phase==='NIGHT'?(attackActor?m.attack.selections[id]:m.actions[id]):m.phase==='DAY_VOTE'?m.votes[id]:undefined):undefined,
 targets:member?mafiaTargets(m,id):[],submitted:member?(m.phase==='NIGHT'?(attackActor?m.attack.locked:m.actions[id]!==undefined):m.phase==='DAY_VOTE'?m.votes[id]!==undefined:false):false,
 revealedRoles:ended?Object.fromEntries(m.ids.map(p=>[p,roles[m.roleById[p]]])):undefined};
}
