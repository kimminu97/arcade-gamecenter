import {raidStatus} from './raid';
import {roles} from './roles';
import {randomUUID} from 'node:crypto';import type {MafiaState} from './engine';
import {assertReportNight,persistSurvey} from './reports';
export type SurveyRole='informant'|'wiretapper'|'archivist';
export type ActionCategory='investigation'|'protection'|'attack'|'report'|'communication';
export type ActionRecord={id:string;gameSessionId:string;nightId:string;nightNumber:number;actorPlayerId:string;actionCategory:ActionCategory;actionType:string;targetPlayerId?:string;actionStatus:'confirmed';occurredAt:number;finalizedAt:number};
export type Survey={id:string;gameSessionId:string;ownerId:string;roleId:SurveyRole;targetId:string;nightId:string;day:number;requestId:string;at:number};
export type SurveyResult={id:string;ownerId:string;targetId:string;day:number;sourceDay:number;kind:SurveyRole;categories:ActionCategory[];communicated:boolean};
export type NightAudit={citizen?:import('./citizen-rework').CitizenState;gameSessionId:string;nightId:string;day:number;finalizedAt:number;records:ActionRecord[];results:SurveyResult[]};
export type IntelligenceState={surveys:Survey[];snapshots:Record<number,NightAudit>};
export const emptyIntelligence=():IntelligenceState=>({surveys:[],snapshots:{}});
const isSurvey=(role:string):role is SurveyRole=>['informant','wiretapper','archivist'].includes(role);
export function submitSurvey(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);const role=m.roleById[id];if(!isSurvey(role))throw Error('정보 수집 직업만 사용할 수 있습니다.');
 if(!m.alive.includes(a.targetId)||role==='informant'&&a.targetId===id)throw Error('유효한 생존 대상을 선택하세요.');
 if(role==='archivist'&&m.day===1)throw Error('첫 밤에는 직전 밤의 기록이 없습니다.');
 const own=m.intelligence.surveys.filter(s=>s.ownerId===id),previous=own.find(s=>s.nightId===m.nightId||s.requestId===a.requestId);
 if(previous){if(previous.nightId===m.nightId&&previous.requestId===a.requestId&&previous.targetId===a.targetId)return{duplicate:true};throw Error('조사를 이미 확정했습니다. 변경할 수 없습니다.');}
 if(role!=='informant'&&own.length>=2)throw Error('조사는 게임당 2회입니다.');
 const survey:Survey={id:randomUUID(),gameSessionId:m.id,ownerId:id,roleId:role,targetId:a.targetId,nightId:m.nightId,day:m.day,requestId:a.requestId,at:now};persistSurvey(survey);m.intelligence.surveys.push(survey);return{duplicate:false};
}
const priority:ActionCategory[]=['investigation','protection','attack','communication','report'];
export const categoryLabels:Record<ActionCategory,string>={investigation:'조사·정보',protection:'보호',attack:'공격',report:'제보',communication:'통신'};
export function planNightAudit(m:MafiaState,now:number):NightAudit{
 const records:ActionRecord[]=[],add=(actor:string,category:ActionCategory,type:string,source:string,at:number,target?:string)=>{records.push({id:m.id+':'+m.nightId+':'+type+':'+actor+':'+source,gameSessionId:m.id,nightId:m.nightId,nightNumber:m.day,actorPlayerId:actor,actionCategory:category,actionType:type,targetPlayerId:target,actionStatus:'confirmed',occurredAt:at,finalizedAt:now});};
 if(raidStatus(m).available)for(const [actor,target] of Object.entries(m.attack.selections)){if(!m.alive.includes(actor)||roles[m.roleById[actor]]?.team!=='mafia'||!m.alive.includes(target))continue;const log=m.secretLog.filter(l=>l.kind==='attackChoice'&&l.nightId===m.nightId&&l.actorId===actor).at(-1);add(actor,'attack','teamAttackSelection',actor,log?.at??now,target);}
 for(const [actor,target] of Object.entries(m.actions)){if(!m.alive.includes(actor)||!m.alive.includes(target))continue;const role=m.roleById[actor];if(!['police','doctor'].includes(role)||role==='police'&&actor===target)continue;const log=m.secretLog.find(l=>l.kind===(role==='police'?'roleInvestigation':'nightProtection')&&l.actorId===actor&&l.nightId===m.nightId);add(actor,role==='doctor'?'protection':'investigation',role==='doctor'?'protect':'investigate',actor,log?.at??now,target);}
 for(const a of m.civic.actions)if(a.nightId===m.nightId&&a.roleId!=='judge')add(a.ownerId,a.roleId==='bodyguard'?'protection':'investigation',a.roleId,a.id,a.at,a.targetId);
 for(const x of [...m.neutralProgress.guesses,...m.neutralProgress.marks])if(x.nightId===m.nightId)add(x.ownerId,'investigation',x.roleId==='swindler'?'roleGuess':'mark',x.id,x.at,x.targetId);
 for(const x of m.infiltrations)if(x.nightId===m.nightId)add(x.ownerId,'investigation','infiltrate',x.id,x.at);
 for(const r of m.anonymousReports.records)if(r.nightId===m.nightId){add(r.senderPlayerId,r.sourceType==='hacker'?'communication':'report',r.sourceType==='hacker'?'forwardReport':'submitReport',r.reportId,r.receptionTime);if(r.interceptedBy)add(r.interceptedBy,'investigation','interceptReport',r.reportId,r.receptionTime);}
 for(const a of m.anonymousReports.articles)if(a.publicationNight===m.nightId)add(a.journalistId,'investigation',a.sourceType==='fake'?'fakeArticle':'reserveArticle',a.articleId,a.reservedAt);
 for(const c of m.communications.copies)if(c.nightId===m.nightId)add(c.ownerId,'investigation','acquireReport',c.id,c.at);
 for(const message of m.communications.messages)if(message.nightId===m.nightId)add(message.ownerId,'communication','privateMessage',message.id,message.at);
 for(const t of m.communications.listening)if(t.nightId===m.nightId)add(t.ownerId,'investigation','reserveListening',t.id,t.at??now,t.targetId);
 for(const s of m.intelligence.surveys)if(s.nightId===m.nightId)add(s.ownerId,'investigation','survey',s.id,s.at,s.targetId);
 const results=m.intelligence.surveys.filter(s=>s.nightId===m.nightId).map(s=>{const sourceDay=s.roleId==='archivist'?m.day-1:m.day,source=sourceDay===m.day?records:m.intelligence.snapshots[sourceDay]?.records??[],own=source.filter(r=>r.actorPlayerId===s.targetId);const categories=priority.filter(c=>own.some(r=>r.actionCategory===c));return{id:s.id,ownerId:s.ownerId,targetId:s.targetId,day:m.day,sourceDay,kind:s.roleId,categories,communicated:own.some(r=>r.actionCategory==='report'||r.actionType==='forwardReport'||r.actionType==='privateMessage')};});
 for(const r of records)Object.freeze(r);for(const r of results){Object.freeze(r.categories);Object.freeze(r);}Object.freeze(records);Object.freeze(results);return Object.freeze({gameSessionId:m.id,nightId:m.nightId,day:m.day,finalizedAt:now,records,results});
}
export function intelligenceView(m:MafiaState,id:string){
 const role=m.roleById[id];if(!m.ids.includes(id)||!isSurvey(role))return undefined;
 const own=m.intelligence.surveys.filter(s=>s.ownerId===id),submitted=own.some(s=>s.nightId===m.nightId),canSend=m.alive.includes(id)&&m.phase==='NIGHT'&&Date.now()<m.nightEndsAt&&!submitted&&(role==='informant'||own.length<2)&&(role!=='archivist'||m.day>1);
 return{kind:role,selectedTargetId:own.find(s=>s.nightId===m.nightId)?.targetId,remaining:role==='informant'?null:Math.max(0,2-own.length),sourceDay:role==='archivist'?m.day-1:m.day,submitted,canSend,targets:canSend?m.alive.filter(t=>role!=='informant'||t!==id):[],results:Object.values(m.intelligence.snapshots).flatMap(n=>n.results.filter(r=>r.ownerId===id).map(r=>({id:r.id,day:r.day,sourceDay:r.sourceDay,targetId:r.targetId,...(role==='wiretapper'?{communicated:r.communicated}:role==='informant'?{category:r.categories[0]==='report'?'통신·제보':r.categories[0]==='communication'?'통신·제보':r.categories.length?categoryLabels[r.categories[0]]:'특수 행동 없음'}:{categories:r.categories.map(c=>categoryLabels[c])})})))};
}
