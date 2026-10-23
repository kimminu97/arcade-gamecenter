import {all,get,transaction,type DB} from './db';
import {conversationRows} from './presentation';
import {engineConfig,evaluateWindow} from './context';
import {chatGames,gameSpecs} from './game-policy';
import {auditDuplicates} from './exclusivity';
export function reclassifyQuestion(db:DB,id:string,game:string){
 if(!chatGames[game])throw Error('실제 구현된 게임을 선택하세요.');const q=get(db,'SELECT * FROM ChatQuestion WHERE id=?',id);if(!q)throw Error('문제를 찾을 수 없습니다.');
 if(get(db,'SELECT 1 FROM ChatQuestionHistory WHERE questionId=? LIMIT 1',id))throw Error('이미 출제한 문제는 이력 보존을 위해 재분류할 수 없습니다.');
 const rows=conversationRows(db,q),target=rows.find(m=>m.id===q.targetMessageId)||rows[0];if(!target)throw Error('원본 대화가 없습니다.');
 const stats=JSON.parse(get(db,"SELECT data FROM ChatStatistics WHERE id='global'")?.data||'null');if(!stats)throw Error('통계 분석이 필요합니다.');const parts=evaluateWindow(rows,rows.indexOf(target),engineConfig(db));
 const spec=gameSpecs(target,rows,{...parts.parts,signals:parts.signals},stats,all(db,'SELECT id FROM ChatParticipant WHERE excluded=0').map(p=>p.id)).find(s=>s.game===game);if(!spec)throw Error('이 대화는 선택한 게임의 적합성 기준을 충족하지 않습니다.');
 return transaction(db,()=>{db.prepare('DELETE FROM ChatSourceAllocation WHERE questionId=?').run(id);db.prepare("UPDATE ChatQuestion SET gameMode=?,questionType=?,promptText=?,originalText=?,answer=?,options=?,suitabilityScore=?,selectionReason=?,reviewStatus='pending',availability='NEEDS_REVIEW',sourceKey=NULL,engineVersion=3,targetMessageId=?,correctParticipantId=? WHERE id=?").run(game,spec.type,spec.prompt,spec.rows.map(m=>m.originalText).join('\n'),spec.answer,JSON.stringify(spec.options),spec.score,spec.reason,target.id,target.participantId,id);db.prepare('DELETE FROM ChatQuestionSource WHERE questionId=?').run(id);spec.rows.forEach((m,i)=>db.prepare('INSERT INTO ChatQuestionSource(questionId,messageId,ordinal) VALUES(?,?,?)').run(id,m.id,i));db.prepare("INSERT INTO ChatQuestionReview(questionId,status,reason,at) VALUES(?,'pending',?,?)").run(id,'게임 재분류: '+game,new Date().toISOString());auditDuplicates(db);return{ok:true,gameMode:game,reviewStatus:'pending'};});
}
