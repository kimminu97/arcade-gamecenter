import {chatGames} from './game-policy';
import {all,get,type DB} from './db';
import {playableQuestions} from './repository';
import type {Room} from '../game';
export const questionTypes=['speaker','sequence','cringe','defend','year','blank','habit','battle'];
export function bankDiagnostics(db:DB,room:Room,path?:string){
 const counts=get(db,"SELECT count(*) total,coalesce(sum(availability='AUTO_READY' AND reviewStatus<>'excluded'),0) autoReady,coalesce(sum(reviewStatus='approved' AND availability<>'EXCLUDED'),0) approved,coalesce(sum(availability='EXCLUDED' OR reviewStatus='excluded'),0) excluded,coalesce(sum(engineVersion>=2 AND conversationId IS NOT NULL AND (SELECT count(*) FROM ChatConversationMessage c WHERE c.conversationId=q.conversationId)>=2),0) withContext FROM ChatQuestion q");
 const generation=get(db,"SELECT createdAt,data FROM ChatStatistics WHERE id='generation'");
 const batch=get(db,"SELECT id,status,engineVersion,startedAt,completedAt,backupPath,questionCount FROM ChatGenerationBatch WHERE status='completed' ORDER BY completedAt DESC LIMIT 1");
 const latestBatch=get(db,'SELECT id,status,engineVersion,startedAt,completedAt,error FROM ChatGenerationBatch ORDER BY startedAt DESC LIMIT 1');
 const mapped=all(db,'SELECT participantId,playerId FROM ChatGameMapping WHERE roomCode=?',room.code).filter(m=>room.players.some(p=>p.id===m.playerId&&!p.excluded));
 const available=playableQuestions(db,room,questionTypes).available;
 const speaker=get(db,"SELECT data,createdAt FROM ChatStatistics WHERE id='speaker-generation'");return{speaker:speaker?{...JSON.parse(speaker.data),createdAt:speaker.createdAt}:null,databasePath:path,messages:get(db,"SELECT count(*) n FROM ChatMessage WHERE kind='message'").n,speakers:get(db,'SELECT count(*) n FROM ChatParticipant').n,mappedSpeakers:mapped.length,totalMappings:get(db,'SELECT count(*) n FROM ChatGameMapping').n,...counts,withoutContext:counts.total-counts.withContext,playable:available.length,playableTypes:Object.fromEntries(questionTypes.map(t=>[t,available.filter(q=>q.questionType===t).length])),states:all(db,'SELECT availability,reviewStatus,engineVersion,count(*) count FROM ChatQuestion GROUP BY availability,reviewStatus,engineVersion'),lastGeneratedAt:generation?.createdAt??null,generatedEngineVersion:generation?JSON.parse(generation.data).engineVersion??1:null,runningEngineVersion:3,games:Object.entries(chatGames).map(([id,g])=>({id,name:g.name,types:g.types,...questionCounts(db,{game:id}),duplicates:get(db,'SELECT count(*) n FROM ChatQuestion WHERE gameMode=? AND duplicateGroup IS NOT NULL',id).n})),batch:batch??null,latestBatch:latestBatch??null};
}

// Review and readiness are independent dimensions; excluded takes precedence.
export function questionWhere(query:any){
 const type=String(query.type||''),status=String(query.status||''),game=String(query.game||''),term=String(query.search||''),year=Number(query.year)||0,version=Number(query.version)||0;
 const states:Record<string,string>={pending:"reviewStatus='pending' AND availability<>'EXCLUDED'",approved:"reviewStatus='approved' AND availability<>'EXCLUDED'",excluded:"(reviewStatus='excluded' OR availability='EXCLUDED')",EXCLUDED:"(reviewStatus='excluded' OR availability='EXCLUDED')",AUTO_READY:"availability='AUTO_READY' AND reviewStatus<>'excluded'",NEEDS_REVIEW:"availability='NEEDS_REVIEW' AND reviewStatus='pending'"};
 if(status&&!states[status])throw Error('지원하지 않는 문제 상태입니다.');
 return {where:"(?=0 OR engineVersion=?) AND (?='' OR gameMode=?) AND (?='' OR questionType=?) AND (?='' OR instr(originalText,?)>0 OR instr(promptText,?)>0 OR q.id=?) AND (?=0 OR year=?)"+(status?' AND ('+states[status]+')':''),args:[version,version,game,game,type,type,term,term,term,term,year,year]};
}
export function questionCounts(db:DB,query:any={}){
 const scope={...query,status:'',search:'',offset:0};const {where,args}=questionWhere(scope);
 const count=(status:string)=>{const w=questionWhere({...scope,status});return get(db,'SELECT count(*) n FROM ChatQuestion q WHERE '+w.where,...w.args).n;};
 return {total:get(db,'SELECT count(*) n FROM ChatQuestion q WHERE '+where,...args).n,pending:count('pending'),approved:count('approved'),autoReady:count('AUTO_READY'),needsReview:count('NEEDS_REVIEW'),rejected:count('excluded')};
}
export function questionPage(db:DB,query:any){
 const {where,args}=questionWhere(query),total=get(db,'SELECT count(*) n FROM ChatQuestion q WHERE '+where,...args).n,limit=50;
 const requested=Math.max(0,Math.floor(Number(query.offset)||0));const offset=total?Math.min(Math.floor(requested/limit)*limit,Math.floor((total-1)/limit)*limit):0;
 const rows=all(db,'SELECT q.*,p.name FROM ChatQuestion q LEFT JOIN ChatParticipant p ON p.id=q.correctParticipantId WHERE '+where+' ORDER BY qualityScore DESC,q.id LIMIT ? OFFSET ?',...args,limit,offset);
 return{rows,total,offset,limit,counts:questionCounts(db,query)};
}
