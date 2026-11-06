import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {lanAddresses} from '../server/network-addresses';
// @ts-expect-error JavaScript startup helper has no declaration file.
import {startProblem} from '../scripts/start-check.mjs';

test('LAN candidates exclude loopback, IPv6 and disconnected link-local; preserve adapter choices and port',()=>{
 const entry=(address:string,family='IPv4',internal=false)=>({address,family,internal}) as any;
 assert.deepEqual(lanAddresses({Ethernet:[entry('192.168.1.8'),entry('fe80::1','IPv6')],WiFi:[entry('192.168.1.9')],duplicate:[entry('192.168.1.8')],offline:[entry('169.254.1.1')],loopback:[entry('127.0.0.1','IPv4',true)],absent:undefined},4567),['http://192.168.1.8:4567','http://192.168.1.9:4567']);
 assert.deepEqual(lanAddresses({},3000),[]);
});
test('startup gives actionable dependency/build errors without modifying files',()=>{
 const root=mkdtempSync(join(tmpdir(),'arcade-start-'));
 try{
  assert.match(startProblem(root),/npm ci/);
  for(const name of ['tsx','express','socket.io']){const dir=join(root,'node_modules',name);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'package.json'),'{}');}
  assert.match(startProblem(root),/npm run build/);
  mkdirSync(join(root,'dist'));writeFileSync(join(root,'dist','index.html'),'ready');
  assert.equal(startProblem(root),null);
 }finally{rmSync(root,{recursive:true,force:true});}
});
