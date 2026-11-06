import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultMafiaConfig,roleCatalog,validateMafiaConfig} from '../server/mafia/config';
import {mafiaConfigAdvice} from '../src/mafia-config-advice';
import {mafiaRecommendations,recommendationConfig} from '../src/mafia-recommendations';
const catalog=roleCatalog(),advice=(cfg:ReturnType<typeof defaultMafiaConfig>)=>mafiaConfigAdvice(cfg,catalog),text=(cfg:ReturnType<typeof defaultMafiaConfig>)=>advice(cfg).map(a=>a.text).join(' ');
test('three recommendations: actual absence/dependency vs conditional hacker; validity and inputs unchanged',()=>{
 for(const rec of mafiaRecommendations){const cfg=recommendationConfig(defaultMafiaConfig(5),rec),before=JSON.stringify(cfg),valid=validateMafiaConfig(cfg,5);const ids=advice(cfg).map(a=>a.id);
  assert.deepEqual(ids,rec.id==='deduction'?['no-journalist','fake-without-journalist']:rec.id==='information'?['hacker-fifth']:['no-journalist','blackmailer-journalist']);assert.equal(valid.valid,true);assert.equal(JSON.stringify(cfg),before);assert.deepEqual(validateMafiaConfig(cfg,5),valid);
 }
});
test('manual/preset config changes derive fresh hints; unrelated roles never warn',()=>{
 const cfg={...defaultMafiaConfig(5),direct:{mafia:1,blackmailer:1,doctor:1,citizen:2}};assert.match(text(cfg),/고유 능력을 사용할 수 없습니다/);
 cfg.direct={...cfg.direct,citizen:1,journalist:1} as any;assert.equal(advice(cfg).length,0);
 const plain={...defaultMafiaConfig(5),direct:{mafia:1,journalist:1,citizen:3}};assert.deepEqual(advice(plain),[]);
});
test('random pools distinguish guaranteed, possible, absent and zero-slot teams',()=>{
 const cfg={...defaultMafiaConfig(5),mode:'teamRandom' as const,teams:{mafia:2,citizen:3,neutral:0},candidates:{mafia:['mafia','blackmailer'],citizen:['journalist','doctor','citizen'],neutral:['bomber']}};
 assert.ok(advice(cfg).some(a=>a.id==='optional-journalist'));assert.equal(advice(cfg).find(a=>a.id==='blackmailer-journalist')?.level,'참고');assert.doesNotMatch(text(cfg),/협박범이 있지만/);
 cfg.candidates.citizen=['journalist','doctor','police'];assert.deepEqual(advice(cfg),[]);
 cfg.candidates.citizen=['doctor','citizen'];assert.ok(advice(cfg).some(a=>a.id==='no-journalist'));
 cfg.teams.mafia=0;assert.equal(advice(cfg).some(a=>a.id==='blackmailer-journalist'),false);
});
test('chat OFF identifies mimic constraint without changing existing validation rules',()=>{
 const cfg={...defaultMafiaConfig(5),direct:{mafia:1,mimic:1,citizen:3},rules:{mafiaChat:false,raidCooldown:true}};assert.ok(advice(cfg).some(a=>a.id==='mimic-chat'));assert.equal(validateMafiaConfig(cfg,5).valid,false);cfg.rules.mafiaChat=true;assert.equal(advice(cfg).some(a=>a.id==='mimic-chat'),false);
});
