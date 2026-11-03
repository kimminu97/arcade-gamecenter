import {randomUUID} from 'node:crypto';
import type {MafiaState} from './engine';

// All identifiers and receipt metadata in these records are SERVER PRIVATE.
export type AnonymousReport={reportId:string;gameSessionId:string;nightId:string;nightNumber:number;senderPlayerId:string;requestId:string;originalText:string;receptionOrder:number;receptionTime:number;deliveryStatus:'received'|'delivered'|'noRecipient'|'held'|'intercepted';recipientId:string|null;deliveredToJournalistAt:number|null;selectedForPublication:boolean};
export type NewsArticle={articleId:string;gameSessionId:string;reportId:string;journalistId:string;requestId:string;originalText:string;publicationNight:string;publicationDay:number;publicationOrder:number;publicationStatus:'reserved'|'published';reservedAt:number;publishedAt:number|null};
export type ReportState={records:AnonymousReport[];articles:NewsArticle[]};
export interface ReportStore {receive:(report:AnonymousReport,decideDelivery:()=>void)=>void;reserve:(article:NewsArticle)=>void;publish:(articles:NewsArticle[],now:number)=>void;}
let store:ReportStore|undefined;
export function configureMafiaReports(value?:ReportStore){store=value;}
export const createReportState=():ReportState=>({records:[],articles:[]});

function assertNight(m:MafiaState,id:string,a:any,now:number){
 if(!a||a.roundId!==m.id||a.nightId!==m.nightId)throw Error('현재 게임과 밤을 확인하세요.');
 if(!m.ids.includes(id)||!m.alive.includes(id))throw Error('생존 참가자만 이용할 수 있습니다.');
 if(m.phase!=='NIGHT'||now>=m.nightEndsAt)throw Error('밤 접수가 마감되었습니다.');
 if(typeof a.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(a.requestId))throw Error('요청 ID를 확인하세요.');
}
// Receipt -> decision -> delivery is synchronous. Future interception belongs HERE,
// before the inbox projection or any socket emission, never in a client filter.
export function decideReportDelivery(m:MafiaState,_received:Readonly<AnonymousReport>):Pick<AnonymousReport,'deliveryStatus'|'recipientId'>{
 const recipientId=m.alive.find(id=>m.roleById[id]==='journalist')??null;
 return{recipientId,deliveryStatus:recipientId?'delivered':'noRecipient'};
}
export function receiveAnonymousReport(m:MafiaState,id:string,a:any,now=Date.now()){
 assertNight(m,id,a,now);
 const text=a.text;
 if(typeof text!=='string'||!text.replace(/[\s\u200b-\u200d\ufeff]/g,'')||Array.from(text).length>150||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))throw Error('제보는 공백을 제외한 내용이 있는 1~150자 일반 텍스트여야 합니다.');
 const previous=m.anonymousReports.records.find(r=>r.nightId===m.nightId&&r.senderPlayerId===id);
 if(previous){if(previous.requestId===a.requestId&&previous.originalText===text)return{duplicate:true};throw Error('이번 밤 제보를 이미 제출했습니다. 수정할 수 없습니다.');}
 const report:AnonymousReport={reportId:randomUUID(),gameSessionId:m.id,nightId:m.nightId,nightNumber:m.day,senderPlayerId:id,requestId:a.requestId,originalText:text,receptionOrder:m.anonymousReports.records.filter(r=>r.nightId===m.nightId).length+1,receptionTime:now,deliveryStatus:'received',recipientId:null,deliveredToJournalistAt:null,selectedForPublication:false};
 // Durable receipt + delivery decision commit before the in-memory inbox changes.
 const deliver=()=>{const decision=decideReportDelivery(m,report);Object.assign(report,decision,{deliveredToJournalistAt:decision.recipientId?now:null});};
 if(store)store.receive(report,deliver);else deliver();m.anonymousReports.records.push(report);
 return{duplicate:false};
}
export function reserveNewsArticle(m:MafiaState,id:string,a:any,now=Date.now()){
 assertNight(m,id,a,now);
 if(m.roleById[id]!=='journalist')throw Error('기자만 기사 발행을 예약할 수 있습니다.');
 if(['text','body','title','originalText'].some(key=>Object.hasOwn(a,key)))throw Error('제보 원문을 수정할 수 없습니다.');
 const previous=m.anonymousReports.articles.find(x=>x.journalistId===id&&x.requestId===a.requestId);
 if(previous){if(previous.reportId===a.reportId)return{duplicate:true};throw Error('동일 요청의 제보를 변경할 수 없습니다.');}
 const report=m.anonymousReports.records.find(r=>r.reportId===a.reportId&&r.recipientId===id&&r.deliveryStatus==='delivered');
 if(!report)throw Error('기자에게 전달된 제보만 선택할 수 있습니다.');
 if(report.selectedForPublication)throw Error('이미 기사화한 제보입니다.');
 if(m.anonymousReports.articles.filter(x=>x.journalistId===id).length>=2)throw Error('기사 발행은 게임당 2회입니다.');
 const article:NewsArticle={articleId:randomUUID(),gameSessionId:m.id,reportId:report.reportId,journalistId:id,requestId:a.requestId,originalText:report.originalText,publicationNight:m.nightId,publicationDay:m.day,publicationOrder:m.anonymousReports.articles.length+1,publicationStatus:'reserved',reservedAt:now,publishedAt:null};
 store?.reserve(article);m.anonymousReports.articles.push(article);report.selectedForPublication=true;
 return{duplicate:false};
}
export function publishReservedNews(m:MafiaState,now:number){
 const pending=m.anonymousReports.articles.filter(x=>x.publicationNight===m.nightId&&x.publicationStatus==='reserved');
 if(!pending.length)return;store?.publish(pending,now);
 for(const article of pending){article.publicationStatus='published';article.publishedAt=now;}
}
export function anonymousReportView(m:MafiaState,id:string){
 if(!m.ids.includes(id))return undefined;
 const own=m.anonymousReports.records.find(r=>r.senderPlayerId===id&&r.nightId===m.nightId);
 return{submitted:!!own,text:own?.originalText,canSend:m.alive.includes(id)&&m.phase==='NIGHT'&&Date.now()<m.nightEndsAt};
}
export function journalistInboxView(m:MafiaState,id:string){
 if(m.roleById[id]!=='journalist'||!m.alive.includes(id)||m.phase==='GAME_END')return undefined;
 return{remaining:Math.max(0,2-m.anonymousReports.articles.filter(x=>x.journalistId===id).length),items:m.anonymousReports.records.filter(r=>r.recipientId===id&&r.deliveryStatus==='delivered').map(r=>({id:r.reportId,text:r.originalText,night:r.nightNumber,selected:r.selectedForPublication,status:r.selectedForPublication?(m.anonymousReports.articles.find(a=>a.reportId===r.reportId)?.publicationStatus):'delivered'}))};
}
export function publicNewsView(m:MafiaState){return m.anonymousReports.articles.filter(x=>x.publicationStatus==='published').map(x=>({id:x.articleId,label:'기자 속보',text:x.originalText,day:x.publicationDay,order:x.publicationOrder}));}
