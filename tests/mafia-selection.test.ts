import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {defaultMafiaConfig,normalizeMafiaConfig,validateMafiaConfig,drawMafiaSlots,roleCatalog,type MafiaConfig} from '../server/mafia/config';
import {createMafia,mafiaView} from '../server/mafia/engine';
import {openMafiaPresets} from '../server/mafia/presets';
import {roles} from '../server/mafia/roles';
import {mafiaConfigAdvice} from '../src/mafia-config-advice';
const config=():MafiaConfig=>({...defaultMafiaConfig(5),version:2,mode:'teamRandom',teams:{mafia:2,citizen:3,neutral:0},required:{mafia:['mafia','fakeReporter'],citizen:['journalist'],neutral:[]},candidates:{mafia:[],citizen:['police','doctor','bodyguard','shieldMaker','voteAppraiser'],neutral:[]}});
for(const mandatory of [0,1,2,3])test(`5인 필수${mandatory}명·남은 자리 랜덤·중복 및 제외 방지`,()=>{
 const c=config(),town=['journalist','police','doctor','bodyguard','shieldMaker'];c.required!.citizen=town.slice(0,mandatory);c.candidates.citizen=town.slice(mandatory);
 for(let i=0;i<40;i++){const slots=drawMafiaSlots(c,5);assert.equal(slots.length,5);assert.equal(new Set(slots).size,5);assert.equal(slots.filter(r=>roles[r].team==='mafia').length,2);assert.ok(c.required!.citizen.every(r=>slots.includes(r as any)));assert.ok(!slots.includes('mimic'));}
});
test('기자 필수100회·실제 참가자 배정 무작위·Host 비밀 보호',()=>{
 const c=config(),seen=new Set<string>();for(let i=0;i<100;i++){const m=createMafia(['a','b','c','d','e'],60,c);const journalist=m.ids.find(id=>m.roleById[id]==='journalist');assert.ok(journalist);seen.add(journalist);assert.equal(mafiaView(m,'').ownRole,undefined);assert.equal(mafiaView(m,'').revealedRoles,undefined);assert.equal((mafiaView(m,'')as any).selectedSlots,undefined);}assert.ok(seen.size>1);
});
test('필수 초과·랜덤 부족·ID/진영 위조·중복·불가능한 구성 서버 거부',()=>{
 const cases=[(c:MafiaConfig)=>c.required!.citizen.push('police','doctor','bodyguard'),(c:MafiaConfig)=>c.candidates.citizen=['police'],(c:MafiaConfig)=>c.required!.citizen=['missing'],(c:MafiaConfig)=>c.required!.citizen=['hacker'],(c:MafiaConfig)=>c.required!.citizen=['journalist','journalist'],(c:MafiaConfig)=>c.candidates.citizen.push('journalist'),(c:MafiaConfig)=>c.candidates.citizen.push('police'),(c:MafiaConfig)=>c.teams.mafia=0];
 for(const mutate of cases){const c=config();mutate(c);assert.equal(validateMafiaConfig(c,5).valid,false);assert.throws(()=>drawMafiaSlots(c,5));}
 const c=config();assert.throws(()=>normalizeMafiaConfig({...c,required:{...c.required,citizen:'journalist'}}));assert.throws(()=>normalizeMafiaConfig({...c,required:undefined}));
});
test('중립0/1명·최대1명 유지',()=>{
 const c=config();c.teams.citizen=2;c.teams.neutral=1;c.required!.neutral=['bomber'];assert.equal(drawMafiaSlots(c,5).filter(r=>roles[r].team==='neutral').length,1);c.teams.neutral=2;c.teams.citizen=1;c.required!.neutral=['bomber','jester'];assert.equal(validateMafiaConfig(c,5).valid,false);
});
test('기존 v1 체크 후보 범위·기본 직업 중복 및 프리셋 원문 유지',()=>{
 const old={...defaultMafiaConfig(5),mode:'teamRandom' as const,candidates:{mafia:['mafia'],citizen:['citizen'],neutral:[]}};const normalized=normalizeMafiaConfig(old);assert.equal(normalized.version,1);assert.equal(normalized.required,undefined);assert.deepEqual(drawMafiaSlots(normalized,5).sort(),['mafia','citizen','citizen','citizen','citizen'].sort());
 const path=join(mkdtempSync(join(tmpdir(),'selection-')),'presets.sqlite');let store=openMafiaPresets(path);const saved=store.save({name:'legacy',config:old});store.close();const db=new DatabaseSync(path);const original=(db.prepare('SELECT configJson FROM MafiaPreset WHERE id=?').get(saved.id)as any).configJson;db.close();store=openMafiaPresets(path);assert.equal(store.get(saved.id).config.required,undefined);const fresh=store.save({name:'three states',config:config()});store.close();store=openMafiaPresets(path);assert.deepEqual(store.get(fresh.id).config.required,config().required);assert.equal(store.get(fresh.id).version,2);store.close();const read=new DatabaseSync(path);assert.equal((read.prepare('SELECT configJson FROM MafiaPreset WHERE id=?').get(saved.id)as any).configJson,original);assert.equal((read.prepare("SELECT value FROM MafiaPresetMeta WHERE key='schemaVersion'").get()as any).value,'1');read.close();
});
test('필수/랜덤/제외와 실제 남은 자리를 반영한 조합 경고',()=>{
 const c=config(),advice=()=>mafiaConfigAdvice(c,roleCatalog());assert.equal(advice().some(x=>x.id.includes('journalist')),false);c.required!.citizen=[];c.candidates.citizen.push('journalist');assert.ok(advice().some(x=>x.id==='optional-journalist'));c.candidates.citizen=c.candidates.citizen.filter(r=>r!=='journalist');assert.ok(advice().some(x=>x.id==='no-journalist'));
 c.required!.mafia=['blackmailer','mafia'];assert.equal(advice().find(x=>x.id==='blackmailer-journalist')?.level,'주의');c.required!.mafia=['mafia'];c.candidates.mafia=['hacker','fakeReporter'];assert.match(advice().find(x=>x.id==='hacker-fifth')!.text,/선정/);
});
