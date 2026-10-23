import {createHash} from 'node:crypto';
import {transaction,type DB} from '../server/chat/db';
// Synthetic sources only. Never copy real chat text into this fixture.
export function seedReviewBank(db:DB,count=500){transaction(db,()=>{
 db.prepare("INSERT OR IGNORE INTO ChatParticipant(id,name) VALUES('review-person','가상 검수자')").run();
 for(let i=0;i<count+4;i++){
 const id='review-'+i,text='가상 검수 '+createHash('sha256').update(String(i)).digest('hex');
 const mid=Number(db.prepare("INSERT INTO ChatMessage(participantId,originalText,normalizedText,kind,flags,year) VALUES('review-person',?,?,'message','{}',2024)").run(text,text).lastInsertRowid);
 const status=i===count?'approved':i===count+1?'excluded':'pending',availability=status==='approved'?'AUTO_READY':status==='excluded'?'EXCLUDED':i===count+2?'AUTO_READY':'NEEDS_REVIEW';
 db.prepare('INSERT INTO ChatQuestion(id,questionType,correctParticipantId,promptText,originalText,answer,options,difficulty,qualityScore,qualityDetail,reviewStatus,availability,engineVersion,gameMode,suitabilityScore,targetMessageId,year) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,i===count+3?'year':'speaker','review-person','가상 검수 문제',text,'review-person','["review-person"]',3,80,'{}',status,availability,i%4+1,i===count+3?'chat-year':'guess-speaker',80,mid,2024);
 db.prepare('INSERT INTO ChatQuestionSource(questionId,messageId,ordinal) VALUES(?,?,0)').run(id,mid);
 }
});}
