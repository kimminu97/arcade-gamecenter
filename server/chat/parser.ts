import{createHash}from'node:crypto';
export type Parsed={sender:string|null;timestamp:string|null;year:number|null;month:string|null;hour:number|null;originalText:string;lineStart:number;lineEnd:number;kind:string;error?:string};
const dateRe=/(\d{4})\s*(?:년|[.\/-])\s*(\d{1,2})\s*(?:월|[.\/-])\s*(\d{1,2})\s*(?:일|\.)?/;
function dateParts(text:string){const m=text.match(dateRe);if(!m)return null;const y=+m[1],mo=+m[2],d=+m[3];const dt=new Date(Date.UTC(y,mo-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d?[y,mo,d]:null;}
function timeParts(text:string){const m=text.match(/(?:(오전|오후|AM|PM)\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?/i);if(!m)return null;let h=+m[2];if(m[1]){if(h<1||h>12)return null;h%=12;if(/오후|pm/i.test(m[1]))h+=12;}return h<=23&&+m[3]<=59&&+(m[4]||0)<=59?[h,+m[3],+(m[4]||0)]:null;}
export function normalize(text:string){return text.normalize('NFKC').replace(/\s+/gu,' ').trim();}
export function flags(text:string){return{emoticon:text.trim()==='이모티콘',attachmentKind:/^사진/.test(text)?'photo':/^동영상/.test(text)?'video':/^파일:/.test(text)?'file':text.trim()==='이모티콘'?'emoticon':null,urls:text.match(/https?:\/\/\S+/gu)||[],reactions:{k:(text.match(/ㅋ/gu)||[]).length,h:(text.match(/ㅎ/gu)||[]).length,cry:(text.match(/[ㅠㅜ]/gu)||[]).length},attachment:/^(사진(?: \d+장)?|동영상|파일:.*|음성메시지|이모티콘|삭제된 메시지입니다\.?|메시지가 삭제되었습니다\.?)$/u.test(text.trim()),newlines:(text.match(/\n/g)||[]).length,spaces:(text.match(/\s/g)||[]).length,pii:/(?:01[016789][ -]?\d{3,4}[ -]?\d{4}|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\d{6}-[1-4]\d{6})/u.test(text)};}
export const hashText=(s:string)=>createHash('sha256').update(s).digest('hex');
export type LineKind='message-header'|'message-body'|'date-separator'|'system'|'blank'|'structure'|'unknown';
export type LineAudit={line:number;kind:LineKind;reason?:string};
export class KakaoParser{
 date:number[]|null=null;pending:Parsed|null=null;line=0;recognized=0;format='unknown';errors=0;delimiter='\n';
 lineCounts:Record<LineKind,number>={'message-header':0,'message-body':0,'date-separator':0,system:0,blank:0,structure:0,unknown:0};warnings:Record<string,number>={};private title:{text:string;line:number}|null=null;
 constructor(private emit:(m:Parsed)=>void,private audit:(a:LineAudit)=>void=()=>{}){}
 record(kind:LineKind,reason?:string,line=this.line){this.lineCounts[kind]++;this.audit({line,kind,reason});}
 orphan(text:string,line=this.line){this.record('unknown','unrecognized-header',line);this.errors++;this.emit({sender:null,timestamp:null,year:null,month:null,hour:null,originalText:text,lineStart:line,lineEnd:line,kind:'malformed',error:'메시지 헤더를 인식하지 못했습니다.'});}
 flush(){if(this.pending){this.emit(this.pending);this.pending=null;}}
 push(raw:string,eol='\n'){const previous=this.delimiter;this.delimiter=eol;this.line++;const line=this.line===1?raw.replace(/^\uFEFF/,''):raw;
 if(this.title){if(/^(?:저장한\s*날짜|저장\s*날짜|저장\s*일시)\s*[:：]/.test(line))this.record('structure','title-confirmed-by-save-header',this.title.line);else this.orphan(this.title.text,this.title.line);this.title=null;}
 if(/^[-=]{2,}.*\d{4}.*[-=]{2,}\s*$/.test(line)||/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일.*요일\s*$/.test(line)){const d=dateParts(line);this.flush();this.date=d;this.record(d?'date-separator':'unknown',d?undefined:'invalid-date');if(!d){this.errors++;this.emit({sender:null,timestamp:null,year:null,month:null,hour:null,originalText:line,lineStart:this.line,lineEnd:this.line,kind:'malformed',error:'올바르지 않은 날짜 구분선입니다.'});}return;}
 const pc=this.format==='mobile'?null:line.match(/^\[(.+?)\]\s*\[((?:오전|오후|AM|PM)?\s*\d{1,2}:\d{2}(?::\d{2})?)\]\s?(.*)$/i);
 const mobile=this.format==='desktop'?null:line.match(/^(\d{4}(?:년|[.\/-]).*?\d{1,2}:\d{2}(?::\d{2})?)\s*,\s*(.*?)\s+:\s?(.*)$/);
 if(pc||mobile){this.flush();const d=pc?this.date:dateParts(mobile![1]),t=timeParts(pc?pc[2]:mobile![1]);const sender=pc?pc[1]:mobile![2],text=pc?pc[3]:mobile![3];const valid=!!d&&!!t;if(!valid)this.errors++;else this.recognized++;if(valid)this.format=pc?'desktop':'mobile';this.record(valid?'message-header':'unknown',valid?undefined:'invalid-timestamp');const pad=(n:number)=>String(n).padStart(2,'0');this.pending={sender,timestamp:valid?`${d![0]}-${pad(d![1])}-${pad(d![2])}T${pad(t![0])}:${pad(t![1])}:${pad(t![2])}+09:00`:null,year:valid?d![0]:null,month:valid?`${d![0]}-${pad(d![1])}`:null,hour:valid?t![0]:null,originalText:text,lineStart:this.line,lineEnd:this.line,kind:valid?'message':'malformed',...(!valid?{error:'날짜 또는 시간 정보가 없거나 올바르지 않습니다.'}:{})};return;}
 if(/^(?:(?:\d{4}.*?\d{1,2}:\d{2})\s*,\s*)?.+님이 (?:들어왔습니다|나갔습니다|.+초대했습니다)[.!]?\s*$/.test(line)||/^(?:채팅방을 나갔습니다|대화 상대가 없습니다)[.!]?\s*$/.test(line)){this.flush();this.record('system');this.emit({sender:null,timestamp:null,year:null,month:null,hour:null,originalText:line,lineStart:this.line,lineEnd:this.line,kind:'system'});return;}
 if(!this.pending&&/카카오톡 대화|^저장한 날짜|^저장 날짜|^대화 내용|^채팅방.*대화|^[-=]+$/.test(line)){this.record('structure');return;}
 if(this.format==='mobile'&&/^\d{4}.*?\d{1,2}:\d{2}.*?,/.test(line)&&!/님이 /.test(line)){this.flush();this.orphan(line);return;}
 if(!line.trim()){this.record('blank');if(this.pending){this.pending.originalText+=previous+line;this.pending.lineEnd=this.line;}return;}
 if(this.pending){const foreign=this.format==='mobile'&&/^\[.+?\]\s*\[(?:오전|오후|AM|PM)?\s*\d{1,2}:\d{2}/i.test(line);this.record('message-body',foreign?'foreign-header-in-body':undefined);if(foreign)this.warnings['foreign-header-in-body']=(this.warnings['foreign-header-in-body']||0)+1;this.pending.originalText+=previous+line;this.pending.lineEnd=this.line;return;}
 if(this.line===1&&line.length<=300){this.title={text:line,line:this.line};return;}this.orphan(line);
 }
 end(){if(this.title){this.orphan(this.title.text,this.title.line);this.title=null;}this.flush();if(Object.values(this.lineCounts).reduce((a,b)=>a+b,0)!==this.line)throw Error('줄 분류 합계가 일치하지 않습니다.');if(!this.recognized)throw Error('지원되는 카카오톡 메시지를 찾지 못했습니다. 인코딩과 내보내기 형식을 확인하세요.');}
}
export function detectEncoding(bytes:Uint8Array){const bom=bytes[0]===239&&bytes[1]===187&&bytes[2]===191;const candidates:string[]=[];for(const e of ['utf-8','euc-kr'])try{new TextDecoder(e,{fatal:true}).decode(bytes,{stream:true});candidates.push(e);}catch{}if(bom)return{suggested:'utf-8',candidates:['utf-8'],confirmation:false};if(!candidates.length)throw Error('UTF-8 또는 CP949로 해석할 수 없습니다.');return{suggested:candidates.includes('utf-8')?'utf-8':candidates[0],candidates,confirmation:candidates.length>1};}
