import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDb} from '../server/chat/db';
import {presentConversation} from '../server/chat/presentation';
test('conversation hint names are queried once per call, retaining mask order and reveal',()=>{
 const db=openDb(':memory:');
 try{
 db.exec("INSERT INTO ChatParticipant(id,name) VALUES('a','가상가'),('b','가상');INSERT INTO ChatSenderAlias(id,rawName,participantId) VALUES('alias','별칭','a');INSERT INTO ChatQuestion(id,questionType,promptText,originalText,options,difficulty,qualityScore,qualityDetail) VALUES('q','speaker','','','[]',1,1,'{}');");
 const insert=db.prepare("INSERT INTO ChatMessage(id,participantId,originalText,normalizedText,kind,flags,timestamp) VALUES(?,'a','별칭 가상가 가상 용어','','message','{}','2024-01-01 12:00')");
 for(let i=1;i<=30;i++){insert.run(i);db.prepare('INSERT INTO ChatQuestionSource VALUES(?,?,?)').run('q',i,i);}
 const original=db.prepare.bind(db);let queries=0;
 db.prepare=((sql:string)=>{queries++;return original(sql);}) as typeof db.prepare;
 const q={id:'q',correctParticipantId:'a',questionType:'speaker',engineVersion:1};
 const hidden=presentConversation(db,q,{hideHints:true,maskTerms:['용어']});assert.equal(queries,4);assert.equal(hidden.length,30);assert.equal(hidden[0].text,'??? ??? [힌트 숨김] [힌트 숨김]');
 queries=0;assert.equal(presentConversation(db,q,{hideHints:true},new Map(),true)[0].text,'별칭 가상가 가상 용어');assert.equal(queries,3);
 db.prepare=original;db.prepare("UPDATE ChatParticipant SET name='새이름' WHERE id='b'").run();db.prepare("UPDATE ChatMessage SET originalText='새이름'").run();assert.equal(presentConversation(db,q,{hideHints:true})[0].text,'[힌트 숨김]');
 }finally{db.close();}
});
import {DatabaseSync} from 'node:sqlite';
import {openMafiaReportStore} from '../server/mafia/report-store';
import {createRoom,join,start,syncMafia} from '../server/game';
test('readMessages reuses one statement and rolls back a failed batch before retry',()=>{
 const prototype=DatabaseSync.prototype,prepare=prototype.prepare;let connection:DatabaseSync|undefined;
 prototype.prepare=function(sql:string){connection=this;return prepare.call(this,sql);};
 const store=openMafiaReportStore(':memory:');prototype.prepare=prepare;const db=connection!;
 try{
 for(let i=0;i<3;i++)db.prepare("INSERT INTO MafiaPrivateMessage(id,gameSessionId,ownerId,recipientId,requestId,originalText,nightId,day,createdAt,sourceRole) VALUES(?,'g','owner','recipient',?,'synthetic',?,1,1,'postman')").run('m'+i,'req'+i,'night'+i);
 db.exec("CREATE TRIGGER FailRead BEFORE UPDATE ON MafiaPrivateMessage WHEN NEW.id='m1' BEGIN SELECT RAISE(ABORT,'synthetic failure');END");
 assert.throws(()=>store.readMessages!('g','recipient',['m0','m1','m2'],100));assert.equal((db.prepare('SELECT count(*) n FROM MafiaPrivateMessage WHERE readAt IS NOT NULL').get() as any).n,0);db.exec('DROP TRIGGER FailRead');
 let prepares=0;prototype.prepare=function(sql:string){if(sql.startsWith('UPDATE MafiaPrivateMessage SET readAt'))prepares++;return prepare.call(this,sql);};
 store.readMessages!('g','recipient',['m0','m1','m2'],100);assert.equal(prepares,1);store.readMessages!('g','recipient',[],200);assert.equal(prepares,1);
 assert.equal((db.prepare('SELECT count(*) n FROM MafiaPrivateMessage WHERE readAt=100').get() as any).n,3);
 }finally{prototype.prepare=prepare;store.close();}
});
test('syncMafia preserves public end projections and records each team result once',()=>{
 for(const team of ['town','mafia','neutral'] as const){const r=createRoom('host');for(let i=0;i<5;i++)join(r,'가상'+i,'🐱','s'+i);start(r,'mafia');const m=r.round!.mafia!;m.phase='GAME_END';m.winner=team;m.winnerPlayerIds=[m.ids[0]];const scores=r.players.map(p=>p.score);syncMafia(r);const result=structuredClone(r.round!.result);syncMafia(r);assert.deepEqual(r.round!.result,result);assert.equal(r.history.length,1);assert.equal(result.winner,team);assert.equal(Object.keys(result.roles).length,5);assert.deepEqual(r.players.map(p=>p.score),scores);}
});
