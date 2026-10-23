import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
export async function snapshotDatabase(path:string){
 const directory=join(dirname(path),'backups');mkdirSync(directory,{recursive:true});
 const target=join(directory,`before-generation-${Date.now()}-${randomUUID()}.sqlite`),db=new DatabaseSync(path,{readOnly:true});
 try{await backup(db,target);return target;}finally{db.close();}
}
