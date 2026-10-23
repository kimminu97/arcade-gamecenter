import {DatabaseSync} from 'node:sqlite';import {mkdirSync} from 'node:fs';import {dirname} from 'node:path';import type {ManagedGame,QuestionState} from './question-bank';
export function openQuestionState(path:string):QuestionState&{close:()=>void}{
 mkdirSync(dirname(path),{recursive:true});const db=new DatabaseSync(path);db.exec("PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;CREATE TABLE IF NOT EXISTS QuestionState(game TEXT NOT NULL,questionId TEXT NOT NULL,disabled INTEGER NOT NULL CHECK(disabled IN(0,1)),updatedAt TEXT NOT NULL,PRIMARY KEY(game,questionId));");
 const read=db.prepare('SELECT disabled FROM QuestionState WHERE game=? AND questionId=?');
 return {disabled:(mode,id)=>(read.get(mode,id) as any)?.disabled===1,set:(mode:ManagedGame,id:string,disabled:boolean)=>{
 if(!disabled&&!read.get(mode,id))return {changed:false};
 // A single conditional UPSERT serializes duplicate requests without changing timestamps.
 const result=db.prepare('INSERT INTO QuestionState(game,questionId,disabled,updatedAt) VALUES(?,?,?,?) ON CONFLICT(game,questionId) DO UPDATE SET disabled=excluded.disabled,updatedAt=excluded.updatedAt WHERE QuestionState.disabled<>excluded.disabled').run(mode,id,Number(disabled),new Date().toISOString());return {changed:result.changes>0};},close:()=>db.close()};
}
