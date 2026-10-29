import {readFileSync} from 'node:fs';
import {assertYangBank} from '../server/yang-bank';
const rows=JSON.parse(readFileSync(new URL('../server/yang-words.json',import.meta.url),'utf8'));
const report=assertYangBank(rows);
console.log(JSON.stringify({...report,topics:rows.map((t:any)=>({id:t.id,topic:t.topic,words:t.words.length,easy:t.easyCount,normal:t.normalCount}))},null,2));
