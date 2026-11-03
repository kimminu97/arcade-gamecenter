import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';import {dirname} from 'node:path';
import type {ReportStore,AnonymousReport,NewsArticle} from './reports';
// Audit storage only: restarting the process does not restore running rooms.
export function openMafiaReportStore(path:string):ReportStore&{close:()=>void}{
 mkdirSync(dirname(path),{recursive:true});const db=new DatabaseSync(path);
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;PRAGMA foreign_keys=ON;
 BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS MafiaReportMeta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 INSERT OR IGNORE INTO MafiaReportMeta VALUES('schemaVersion','1');
 CREATE TABLE IF NOT EXISTS MafiaAnonymousReport(
 reportId TEXT PRIMARY KEY,gameSessionId TEXT NOT NULL,nightId TEXT NOT NULL,nightNumber INTEGER NOT NULL,
 senderPlayerId TEXT NOT NULL,requestId TEXT NOT NULL,originalText TEXT NOT NULL,receptionOrder INTEGER NOT NULL,receptionTime INTEGER NOT NULL,
 deliveryStatus TEXT NOT NULL,recipientId TEXT,deliveredToJournalistAt INTEGER,selectedForPublication INTEGER NOT NULL DEFAULT 0,
 UNIQUE(gameSessionId,nightId,senderPlayerId),UNIQUE(gameSessionId,nightId,receptionOrder));
 CREATE TABLE IF NOT EXISTS MafiaNewsArticle(
 articleId TEXT PRIMARY KEY,gameSessionId TEXT NOT NULL,reportId TEXT NOT NULL UNIQUE REFERENCES MafiaAnonymousReport(reportId),journalistId TEXT NOT NULL,
 requestId TEXT NOT NULL,originalText TEXT NOT NULL,publicationNight TEXT NOT NULL,publicationDay INTEGER NOT NULL,publicationOrder INTEGER NOT NULL,
 publicationStatus TEXT NOT NULL,reservedAt INTEGER NOT NULL,publishedAt INTEGER,
 UNIQUE(gameSessionId,journalistId,requestId),UNIQUE(gameSessionId,publicationOrder));
 CREATE INDEX IF NOT EXISTS MafiaReportInbox ON MafiaAnonymousReport(gameSessionId,recipientId,deliveryStatus);
 COMMIT;`);
 if((db.prepare('SELECT value FROM MafiaReportMeta WHERE key=?').get('schemaVersion') as any)?.value!=='1'){db.close();throw Error('지원하지 않는 마피아 제보 DB 버전입니다.');}
 const transaction=(fn:()=>void)=>{db.exec('BEGIN IMMEDIATE');try{fn();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}};
 return{
 receive(r:AnonymousReport,decideDelivery:()=>void){transaction(()=>{db.prepare('INSERT INTO MafiaAnonymousReport VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)').run(r.reportId,r.gameSessionId,r.nightId,r.nightNumber,r.senderPlayerId,r.requestId,r.originalText,r.receptionOrder,r.receptionTime,'received',null,null);decideDelivery();db.prepare('UPDATE MafiaAnonymousReport SET deliveryStatus=?,recipientId=?,deliveredToJournalistAt=? WHERE reportId=?').run(r.deliveryStatus,r.recipientId,r.deliveredToJournalistAt,r.reportId);});},
 reserve(a:NewsArticle){transaction(()=>{const used=db.prepare('SELECT COUNT(*) AS n FROM MafiaNewsArticle WHERE gameSessionId=? AND journalistId=?').get(a.gameSessionId,a.journalistId) as any;if(used.n>=2)throw Error('기사 발행은 게임당 2회입니다.');const changed=db.prepare("UPDATE MafiaAnonymousReport SET selectedForPublication=1 WHERE reportId=? AND recipientId=? AND deliveryStatus='delivered' AND selectedForPublication=0").run(a.reportId,a.journalistId);if(!changed.changes)throw Error('이미 선택했거나 전달되지 않은 제보입니다.');db.prepare('INSERT INTO MafiaNewsArticle VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(a.articleId,a.gameSessionId,a.reportId,a.journalistId,a.requestId,a.originalText,a.publicationNight,a.publicationDay,a.publicationOrder,a.publicationStatus,a.reservedAt,a.publishedAt);});},
 publish(articles:NewsArticle[],now:number){transaction(()=>{for(const a of articles)db.prepare("UPDATE MafiaNewsArticle SET publicationStatus='published',publishedAt=? WHERE articleId=? AND publicationStatus='reserved'").run(now,a.articleId);});},close:()=>db.close()
 };
}
