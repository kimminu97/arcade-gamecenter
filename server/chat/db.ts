import{DatabaseSync}from'node:sqlite';
import{mkdirSync}from'node:fs';import{dirname}from'node:path';
export function openDb(path:string){mkdirSync(dirname(path),{recursive:true});const db=new DatabaseSync(path);db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS ChatImport(id TEXT PRIMARY KEY,hash TEXT NOT NULL UNIQUE,filename TEXT,encoding TEXT,format TEXT,path TEXT,bytes INTEGER,messages INTEGER,errors INTEGER,createdAt TEXT);
CREATE TABLE IF NOT EXISTS ChatParticipant(id TEXT PRIMARY KEY,name TEXT NOT NULL,excluded INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS ChatSenderAlias(id TEXT PRIMARY KEY,importId TEXT REFERENCES ChatImport(id) ON DELETE CASCADE,rawName TEXT,participantId TEXT REFERENCES ChatParticipant(id),UNIQUE(importId,rawName));
CREATE TABLE IF NOT EXISTS ChatMessage(id INTEGER PRIMARY KEY,importId TEXT REFERENCES ChatImport(id) ON DELETE CASCADE,participantId TEXT REFERENCES ChatParticipant(id),aliasId TEXT REFERENCES ChatSenderAlias(id),timestamp TEXT,year INTEGER,month TEXT,hour INTEGER,originalText TEXT NOT NULL,normalizedText TEXT NOT NULL,lineStart INTEGER,lineEnd INTEGER,kind TEXT NOT NULL,flags TEXT NOT NULL,hash TEXT,excluded INTEGER NOT NULL DEFAULT 0,exclusionReason TEXT);
CREATE TABLE IF NOT EXISTS ChatStatistics(id TEXT PRIMARY KEY,importId TEXT REFERENCES ChatImport(id) ON DELETE CASCADE,participantId TEXT,data TEXT NOT NULL,createdAt TEXT);
CREATE TABLE IF NOT EXISTS ChatQuestion(id TEXT PRIMARY KEY,questionType TEXT NOT NULL,correctParticipantId TEXT REFERENCES ChatParticipant(id),promptText TEXT NOT NULL,originalText TEXT NOT NULL,answer TEXT,options TEXT NOT NULL,difficulty INTEGER NOT NULL,qualityScore REAL NOT NULL,qualityDetail TEXT NOT NULL,reviewStatus TEXT NOT NULL DEFAULT 'pending',exclusionReason TEXT,year INTEGER,sourceKey TEXT UNIQUE,createdAt TEXT);
CREATE TABLE IF NOT EXISTS ChatQuestionSource(questionId TEXT REFERENCES ChatQuestion(id) ON DELETE CASCADE,messageId INTEGER REFERENCES ChatMessage(id) ON DELETE CASCADE,PRIMARY KEY(questionId,messageId));
CREATE TABLE IF NOT EXISTS ChatQuestionReview(id INTEGER PRIMARY KEY,questionId TEXT REFERENCES ChatQuestion(id) ON DELETE CASCADE,status TEXT,reason TEXT,at TEXT);
CREATE TABLE IF NOT EXISTS ChatQuestionHistory(id INTEGER PRIMARY KEY,questionId TEXT REFERENCES ChatQuestion(id) ON DELETE CASCADE,roomCode TEXT,roundId TEXT,at TEXT,UNIQUE(roomCode,roundId));
CREATE TABLE IF NOT EXISTS ChatGameMapping(roomCode TEXT,participantId TEXT REFERENCES ChatParticipant(id) ON DELETE CASCADE,playerId TEXT,PRIMARY KEY(roomCode,participantId));
CREATE TABLE IF NOT EXISTS ChatSettings(roomCode TEXT PRIMARY KEY,data TEXT);
CREATE INDEX IF NOT EXISTS message_import ON ChatMessage(importId,id);CREATE INDEX IF NOT EXISTS message_author ON ChatMessage(participantId,id);CREATE INDEX IF NOT EXISTS message_time ON ChatMessage(year,month,hour);CREATE INDEX IF NOT EXISTS message_hash ON ChatMessage(hash);
CREATE INDEX IF NOT EXISTS question_status ON ChatQuestion(reviewStatus,questionType,year);CREATE INDEX IF NOT EXISTS source_message ON ChatQuestionSource(messageId);CREATE INDEX IF NOT EXISTS history_question ON ChatQuestionHistory(roomCode,questionId);
`);return db;}
export type DB=ReturnType<typeof openDb>;
export const all=(db:DB,sql:string,...args:any[])=>db.prepare(sql).all(...args) as any[];
export const get=(db:DB,sql:string,...args:any[])=>db.prepare(sql).get(...args) as any;
export function transaction<T>(db:DB,fn:()=>T){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
