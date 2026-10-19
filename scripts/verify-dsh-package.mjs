// Optional local integration with an installed DSH Desktop runtime. Everything
// created by the CLI is confined to work/isolated-dsh, never the real profile.
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const application=process.env.DSH_DESKTOP_EXE;
if(!application)throw Error('Set DSH_DESKTOP_EXE to the installed DeepSeek Harness.exe');
const root=process.cwd();const isolated=path.resolve('work/isolated-dsh');
assert.ok(isolated.startsWith(path.resolve('work')+path.sep));mkdirSync(isolated,{recursive:true});
const runtime=path.join(path.dirname(application),'resources/app.asar/dsh');
const launcher=path.join(runtime,'node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const tarball=path.resolve('artifacts',`${pkg.name}-${pkg.version}.tgz`);
const env={...process.env,ELECTRON_RUN_AS_NODE:'1',DSH_HOME:isolated};
function run(args,extra={}){
  const result=spawnSync(application,['--expose-internals',...args],{env:{...env,...extra},cwd:root,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:5_000_000});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(result.stderr||result.stdout||`DSH exited ${result.status}`);
  return result.stdout;
}
run([launcher,'plugin','--profile','native-smoke','add',tarball]);
const profile=path.join(isolated,'profiles/native-smoke');
const manifest=JSON.parse(readFileSync(path.join(profile,'package.json'),'utf8'));
assert.ok(manifest.dsh.profile.bundles.includes(pkg.name),'Bundle not activated in isolated profile');
const composed=run([launcher,'--profile','native-smoke','--dump-config']);
assert.ok(composed.includes('shin-desktop-native'));
const output=run(['tests/host-integration.mjs',path.join(runtime,'package.json')],{DSH_TEST_PACKAGE_ROOT:path.join(profile,'node_modules',pkg.name)});
assert.match(output,/"passed":true/);
console.log(output.trim());
console.log(JSON.stringify({passed:true,isolatedProfile:true,tarballInstalled:true,bundleActivated:true,composed:true}));
