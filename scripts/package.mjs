import {spawnSync} from 'node:child_process';
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
if(!existsSync('native/DesktopEngine.exe')||!existsSync('dist/server.js'))throw Error('Run npm run build first.');
mkdirSync('artifacts',{recursive:true});
// Calling npm's JS entry avoids cmd.exe quoting around paths with spaces.
const cli=process.env.npm_execpath;
if(!cli)throw Error('Run npm run package:local');
const result=spawnSync(process.execPath,[cli,'pack','--json','--pack-destination','artifacts'],{encoding:'utf8',windowsHide:true});
if(result.status!==0)throw Error(result.stderr||result.stdout);
const [pack]=JSON.parse(result.stdout);
if(pack.files.some(file=>/\.pdb$|\.env(?:\.|$)|\.log$|fixture\.png|upstream\//i.test(file.path)))throw Error('Unexpected private/debug file in plugin package');
const file='artifacts/'+pack.filename;
const sha=createHash('sha256').update(readFileSync(file)).digest('hex');
writeFileSync(file+'.sha256',`${sha}  ${pack.filename}\n`);
writeFileSync('artifacts/package-manifest.json',JSON.stringify({name:pack.name,version:pack.version,filename:pack.filename,sha256:sha,size:pack.size,files:pack.files.map(f=>f.path)},null,2)+'\n');
console.log(JSON.stringify({filename:pack.filename,size:pack.size,sha256:sha,bundled:pack.bundled},null,2));
