import {randomUUID} from 'node:crypto';
import type {MafiaState} from './engine';
import {assertReportNight,validateReportText,normalDelivery,type AnonymousReport,type NewsArticle} from './reports';
import {persistForwardedReport,persistFakeArticle} from './reports';

export function reserveFakeNews(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);if(m.roleById[id]!=='fakeReporter')throw Error('가짜 기자만 사용할 수 있습니다.');validateReportText(a.text);
 const previous=m.anonymousReports.articles.find(x=>x.sourceType==='fake'&&x.journalistId===id);
 if(previous){if(previous.requestId===a.requestId&&previous.originalText===a.text)return{duplicate:true};throw Error('가짜 기사 능력을 이미 사용했습니다. 수정할 수 없습니다.');}
 const article:NewsArticle={articleId:randomUUID(),gameSessionId:m.id,reportId:'',journalistId:id,sourceType:'fake',requestId:a.requestId,originalText:a.text,publicationNight:m.nightId,publicationDay:m.day,publicationOrder:m.anonymousReports.articles.length+1,publicationStatus:'reserved',reservedAt:now,publishedAt:null};
 persistFakeArticle(article);m.anonymousReports.articles.push(article);return{duplicate:false};
}
export function forwardHackedReport(m:MafiaState,id:string,a:any,now=Date.now()){
 assertReportNight(m,id,a,now);if(m.roleById[id]!=='hacker')throw Error('해커만 사용할 수 있습니다.');validateReportText(a.text);
 const source=m.anonymousReports.records.find(r=>r.reportId===a.reportId&&r.interceptedBy===id&&r.deliveryStatus==='intercepted');
 if(!source)throw Error('본인이 보관한 제보만 전송할 수 있습니다.');
 const previous=m.anonymousReports.records.find(r=>r.sourceType==='hacker'&&r.sourceReportId===source.reportId);
 if(previous){if(previous.requestId===a.requestId&&previous.originalText===a.text)return{duplicate:true};throw Error('이 제보의 수정본을 이미 전송했습니다. 변경할 수 없습니다.');}
 const delivery=normalDelivery(m),report:AnonymousReport={reportId:randomUUID(),gameSessionId:m.id,nightId:m.nightId,nightNumber:m.day,senderPlayerId:id,requestId:a.requestId,originalText:a.text,receptionOrder:0,receptionTime:now,...delivery,deliveredToJournalistAt:delivery.recipientId?now:null,selectedForPublication:false,sourceType:'hacker',sourceReportId:source.reportId};
 persistForwardedReport(report);m.anonymousReports.records.push(report);return{duplicate:false};
}
export function informationAbilityView(m:MafiaState,id:string){
 if(!m.ids.includes(id)||m.phase==='GAME_END')return undefined;
 const canSend=m.alive.includes(id)&&m.phase==='NIGHT'&&Date.now()<m.nightEndsAt;
 if(m.roleById[id]==='fakeReporter'){
  const own=m.anonymousReports.articles.find(a=>a.sourceType==='fake'&&a.journalistId===id);
  return{kind:'fakeReporter',alive:m.alive.includes(id),remaining:own?0:1,canSend,submitted:!!own,text:own?.originalText,status:own?.publicationStatus};
 }
 if(m.roleById[id]==='hacker'){
  const source=m.anonymousReports.records.find(r=>r.interceptedBy===id&&r.deliveryStatus==='intercepted'),forward=source&&m.anonymousReports.records.find(r=>r.sourceType==='hacker'&&r.sourceReportId===source.reportId);
  return{kind:'hacker',alive:m.alive.includes(id),used:!!source,canSend,vault:source?{id:source.reportId,text:source.originalText,submitted:!!forward,sentText:forward?.originalText}:undefined};
 }
 return undefined;
}
