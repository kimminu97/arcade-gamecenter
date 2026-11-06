import {existsSync} from 'node:fs';
import {join} from 'node:path';

export function startProblem(root){
 if(!['tsx','express','socket.io'].every(name=>existsSync(join(root,'node_modules',name,'package.json'))))return 'Dependencies missing. Run npm ci in the project folder (internet required).';
 if(!existsSync(join(root,'dist','index.html')))return 'Production build missing. Run npm run build first.';
 return null;
}
