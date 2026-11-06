import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createMafia,advanceMafia,submitMafia,mafiaView,type MafiaState} from '../server/mafia/engine';
import {defaultMafiaConfig} from '../server/mafia/config';
import {submitCivic} from '../server/mafia/civic';
import {configureMafiaReports} from '../server/mafia/reports';
import {openMafiaReportStore} from '../server/mafia/report-store';
const fixture=()=>{const m=createMafia(['m','d','g','s','c'],300,{...defaultMafiaConfig(5),rules:{raidCooldown:false,mafiaChat:true},direct:{mafia:1,doctor:1,bodyguard:1,shieldMaker:1,citizen:1}});m.roleById={m:'mafia',d:'doctor',g:'bodyguard',s:'shieldMaker',c:'citizen'};advanceMafia(m,m.version);return m;};
const next=(m:MafiaState)=>advanceMafia(m,m.version);
const nextNight=(m:MafiaState)=>{next(m);assert.equal(m.phase,'DAY_ANNOUNCEMENT');for(let i=0;i<4;i++)next(m);assert.equal(m.phase,'NIGHT');};
const protect=(m:MafiaState,id:string,targetId:string,requestId='guard-request-'+m.day)=>id==='d'?submitMafia(m,id,{roundId:m.id,version:m.version,revision:m.revisions[id]||0,targetId}):submitCivic(m,id,{roundId:m.id,nightId:m.nightId,requestId,targetId});

for(const actor of ['d','g'])test(`${actor==='d'?'의사':'경호원'}: 4개 밤 반복·실제 보호 성공 뒤 재사용·동일 밤 제한·사망 차단`,()=>{
 const m=fixture();
 for(let night=1;night<=4;night++){
  assert.equal(m.day,night);
  if(actor==='g'){assert.equal(mafiaView(m,actor).civicAbility?.canSend,true);assert.equal(mafiaView(m,actor).civicAbility?.remaining,null);assert.throws(()=>protect(m,actor,actor));assert.equal(m.civic.actions.filter(x=>x.nightId===m.nightId).length,0);}
  else assert.ok(mafiaView(m,actor).targets.includes(actor));
  assert.throws(()=>protect(m,actor,'missing'));
  const target=actor==='d'&&night===3?'d':'c';protect(m,actor,target);
  const before=JSON.stringify(actor==='g'?m.civic.actions:m.actions);
  if(actor==='g')assert.equal(protect(m,actor,target)?.duplicate,true);
  assert.throws(()=>protect(m,actor,'s','changed-request-'+night));assert.equal(JSON.stringify(actor==='g'?m.civic.actions:m.actions),before);
  const fresh=mafiaView(m,actor);assert.equal(actor==='g'?fresh.civicAbility?.submitted:fresh.submitted,true);assert.equal(actor==='g'?fresh.civicAbility?.selectedTargetId:fresh.selectedTargetId,target);
  assert.equal(mafiaView(m,'').civicAbility,undefined);assert.equal(mafiaView(m,'s').civicAbility,undefined);
  if(night>1)submitMafia(m,'m',{roundId:m.id,version:m.version,revision:0,targetId:target});
  nextNight(m);assert.ok(m.alive.includes(target));assert.equal(m.winner,undefined);
 }
 m.alive=m.alive.filter(x=>x!==actor);assert.throws(()=>protect(m,actor,'c'));if(actor==='g')assert.equal(mafiaView(m,actor).civicAbility?.canSend,false);else assert.deepEqual(mafiaView(m,actor).targets,[]);
});

test('v9 경호원 인덱스 안전 이관·기존 행 보존·재오픈·밤별 유일성·저장 실패 후 재시도',()=>{
 const folder=mkdtempSync(join(tmpdir(),'mafia-usage-')),path=join(folder,'reports.sqlite');let store=openMafiaReportStore(path);configureMafiaReports(store);
 try{
  const m=fixture();protect(m,'g','c');const oldAction=JSON.stringify(m.civic.actions[0]);store.close();configureMafiaReports();
  let db=new DatabaseSync(path);db.exec("DROP INDEX IF EXISTS MafiaOneGuardPerNight;CREATE UNIQUE INDEX IF NOT EXISTS MafiaOneGuard ON MafiaCivicAction(gameSessionId,ownerId) WHERE roleId='bodyguard';UPDATE MafiaReportMeta SET value='9';CREATE TABLE Preserve(value TEXT);INSERT INTO Preserve VALUES('unchanged');");db.close();
  store=openMafiaReportStore(path);configureMafiaReports(store);nextNight(m);protect(m,'g','c');assert.equal(m.civic.actions.length,2);assert.equal(JSON.stringify(m.civic.actions[0]),oldAction);
  nextNight(m);db=new DatabaseSync(path);db.exec("CREATE TRIGGER fail_guard BEFORE INSERT ON MafiaCivicAction WHEN NEW.roleId='bodyguard' BEGIN SELECT RAISE(ABORT,'disk failure');END;");
  assert.throws(()=>protect(m,'g','c'),/disk failure/);assert.equal(m.civic.actions.length,2);assert.equal(mafiaView(m,'g').civicAbility?.canSend,true);db.exec('DROP TRIGGER fail_guard');protect(m,'g','c');
  const a=m.civic.actions.at(-1)!;assert.throws(()=>store.civic!({...a,id:'duplicate-night',requestId:'duplicate-night-request'}));
  assert.equal((db.prepare('SELECT count(*) n FROM MafiaCivicAction').get()as any).n,3);assert.equal((db.prepare('SELECT value FROM Preserve').get()as any).value,'unchanged');assert.equal((db.prepare('SELECT value FROM MafiaReportMeta').get()as any).value,'10');db.close();store.close();
  const backups=readdirSync(folder).filter(f=>f.includes('pre-v10'));assert.equal(backups.length,1);const backup=new DatabaseSync(join(folder,backups[0]),{readOnly:true});assert.equal((backup.prepare('SELECT count(*) n FROM MafiaCivicAction').get()as any).n,1);backup.close();store=openMafiaReportStore(path);assert.equal(readdirSync(folder).filter(f=>f.includes('pre-v10')).length,1);
 }finally{configureMafiaReports();store.close();}
});

test('v10 이관 실패는 구 인덱스·버전·기존 행 rollback 후 재시도 가능',()=>{
 const folder=mkdtempSync(join(tmpdir(),'mafia-usage-rollback-')),path=join(folder,'reports.sqlite');openMafiaReportStore(path).close();
 let db=new DatabaseSync(path);db.exec("DROP INDEX MafiaOneGuardPerNight;CREATE UNIQUE INDEX MafiaOneGuard ON MafiaCivicAction(gameSessionId,ownerId) WHERE roleId='bodyguard';UPDATE MafiaReportMeta SET value='9';INSERT INTO MafiaCivicAction VALUES('kept','game','owner','bodyguard','target','night',1,'request',1,NULL,NULL);CREATE TRIGGER fail_migration BEFORE UPDATE ON MafiaReportMeta BEGIN SELECT RAISE(ABORT,'migration failure');END;");db.close();
 assert.throws(()=>openMafiaReportStore(path),/migration failure/);db=new DatabaseSync(path);assert.equal((db.prepare('SELECT value FROM MafiaReportMeta').get()as any).value,'9');assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='MafiaOneGuard'").get());assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='MafiaOneGuardPerNight'").get(),undefined);assert.equal((db.prepare('SELECT count(*) n FROM MafiaCivicAction').get()as any).n,1);db.exec('DROP TRIGGER fail_migration');db.close();openMafiaReportStore(path).close();
 db=new DatabaseSync(path);assert.equal((db.prepare('SELECT value FROM MafiaReportMeta').get()as any).value,'10');assert.equal((db.prepare('SELECT count(*) n FROM MafiaCivicAction').get()as any).n,1);db.close();
});
