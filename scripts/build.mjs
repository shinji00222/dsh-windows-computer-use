import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,rmSync,cpSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const localSdk=path.join(process.env.LOCALAPPDATA??'', 'Microsoft/dotnet-sdk-10/dotnet.exe');
const dotnet=process.env.DOTNET_EXE??(existsSync(localSdk)?localSdk:'dotnet');
const env={...process.env,DOTNET_CLI_HOME:path.resolve('.dotnet-home'),NUGET_PACKAGES:path.resolve('.nuget'),DOTNET_NOLOGO:'1',DOTNET_CLI_TELEMETRY_OPTOUT:'1'};
const staging=path.resolve('work/native-publish');
if(!staging.startsWith(path.resolve('work')+path.sep))throw Error('Unsafe staging path');
rmSync(staging,{recursive:true,force:true});mkdirSync(staging,{recursive:true});
for(const [command,args] of [[process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.json']],[dotnet,['publish','src/Engine/DesktopEngine.csproj','-c','Release','-r','win-x64','--self-contained','true','-p:PublishSingleFile=false','-p:DebugType=None','-p:DebugSymbols=false','-o',staging,'--nologo']]]){
  const result=spawnSync(command,args,{env,stdio:'inherit',windowsHide:true});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
// The DSH browser loader consumes a classic registration script, not an ESM
// export. TypeScript still checks the source as a module.
const clientPath=path.resolve('dist/client.js');
writeFileSync(clientPath,readFileSync(clientPath,'utf8').replace(/export\s*\{\s*\};?/g,''));
const destination=path.resolve('native');
if(path.dirname(destination)!==process.cwd())throw Error('Unsafe output path');
rmSync(destination,{recursive:true,force:true});cpSync(staging,destination,{recursive:true});
// Include the actual licenses from the .NET runtime packs in binary distributions.
const licenseDir=path.join(destination,'licenses');mkdirSync(licenseDir,{recursive:true});
for(const pack of ['microsoft.netcore.app.runtime.win-x64','microsoft.windowsdesktop.app.runtime.win-x64']){
  const base=path.resolve('.nuget',pack);
  const versions=readdirSync(base).filter(x=>existsSync(path.join(base,x,'LICENSE.TXT'))||existsSync(path.join(base,x,'LICENSE')));
  const version=versions.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).at(-1);
  if(!version)throw Error('Missing runtime license: '+pack);
  for(const file of ['LICENSE','LICENSE.TXT','THIRD-PARTY-NOTICES.TXT'])if(existsSync(path.join(base,version,file)))cpSync(path.join(base,version,file),path.join(licenseDir,pack+'-'+file));
}
