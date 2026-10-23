// Local aggregate diagnostics only: never print speakers or message text.
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
for(const file of process.argv.slice(2)){
 const path=resolve(file),db=new DatabaseSync(path,{readOnly:true});
 try{const tables=new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(t=>t.name));const columns=tables.has('ChatQuestion')?(db.prepare('PRAGMA table_info(ChatQuestion)').all() as any[]).map(c=>c.name):[];const one=(sql:string)=>db.prepare(sql).get() as any;
 console.log(JSON.stringify({path,columns,messages:tables.has('ChatMessage')?one("SELECT count(*) total,sum(kind='message') normal FROM ChatMessage"):null,speakers:tables.has('ChatParticipant')?one('SELECT count(*) total FROM ChatParticipant'):null,mapping:tables.has('ChatGameMapping')?one('SELECT count(*) total,count(DISTINCT participantId) speakers,count(DISTINCT roomCode) rooms FROM ChatGameMapping'):null,questions:tables.has('ChatQuestion')?one('SELECT count(*) total,max(createdAt) latestCreatedAt FROM ChatQuestion'):null,states:columns.includes('availability')?db.prepare('SELECT engineVersion,availability,reviewStatus,count(*) n,sum(conversationId IS NOT NULL) withContext FROM ChatQuestion GROUP BY engineVersion,availability,reviewStatus').all():[],generation:tables.has('ChatStatistics')?one("SELECT createdAt,json_extract(data,'$.engineVersion') engineVersion,json_extract(data,'$.questions') questions FROM ChatStatistics WHERE id='generation'"):null}));
 }finally{db.close();}
}
