// Real rendered text with no corresponding accessible text controls.
// Read-only on host/CI. --input is reserved for the task-owned VM.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import electron from 'electron';
import {McpTestClient} from './mcp-test-client.mjs';
const artifacts=process.argv[2]?path.resolve(process.argv[2]):await mkdtemp(path.join(os.tmpdir(),'wcu-sparse-canvas-'));
await mkdir(artifacts,{recursive:true});
const env={...process.env,WCU_INDICATOR:'0'};delete env.ELECTRON_RUN_AS_NODE;
const fixture=spawn(electron,[path.join(import.meta.dirname,'uia-chromium-fixture.cjs'),path.join(artifacts,'profile'),'sparse'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let ready,buffer='',stderr='';fixture.stderr.on('data',b=>stderr+=b);
fixture.stdout.on('data',b=>{buffer+=b;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const r=JSON.parse(line);if(r.ready)ready=r}catch{}}});
const client=new McpTestClient(process.execPath,[path.join(import.meta.dirname,'../mcp/server.mjs')],{env});
const data=r=>{assert.ok(!r.isError,JSON.stringify(r));return JSON.parse(r.content.find(c=>c.type==='text').text)};
try{
  await client.init();for(let i=0;i<300&&!ready;i++){assert.equal(fixture.exitCode,null,stderr);await delay(100)}assert.ok(ready,'Sparse fixture did not start');
  const target={nativeWindowHandle:ready.hwnd};
  const tree=data(await client.call('windows_computer_use_accessibility_tree',{...target,maxDepth:8,maxNodes:100}));
  assert.ok(tree.nodeCount<=20,`Fixture must really be sparse, got ${tree.nodeCount}`);
  assert.equal(JSON.stringify(tree.tree).includes('SEARCH HERE'),false);
  const shot=await client.call('windows_computer_use_screenshot',target);assert.equal(shot.content[1].type,'image');assert.equal(data(shot).source,'win32');
  // WinRT OCR on PS7 is not supported by this bridge; the PS5 lane tests it.
  if(!/pwsh/i.test(process.env.WINDOWS_CU_POWERSHELL||'')){
    const found=data(await client.call('windows_computer_use_find',{...target,query:'SEARCH HERE'}));
    assert.equal(found.source,'uia+ocr');assert.ok(found.results.length);assert.equal(found.results[0].source,'ocr');assert.equal(found.results[0].id,undefined);
    const box=found.results[0].boundingBox;assert.ok(box.width>50&&box.height>10);
    const observed=data(await client.call('windows_computer_use_wait_for',{...target,condition:'text',query:'VISIBLE CANVAS',timeoutMs:5000}));assert.equal(observed.verification,'observed');
    if(process.argv.includes('--input')){
      const hit=found.results[0];data(await client.call('windows_computer_use_click',{...target,activate:true,dispatch:'foreground',x:hit.x,y:hit.y}));
      data(await client.call('windows_computer_use_type_text',{...target,text:'NEEDLE42'}));
      assert.equal(data(await client.call('windows_computer_use_wait_for',{...target,condition:'text',query:'NEEDLE42',timeoutMs:5000})).verification,'observed');
    }
    console.log(`PASS sparse canvas (${tree.nodeCount} UIA nodes): native screenshot, automatic OCR coordinates and literal-text wait${process.argv.includes('--input')?', actual click/paste/reobserve':''}`);
  }else console.log(`PASS sparse canvas (${tree.nodeCount} UIA nodes): native screenshot; real WinRT OCR exercised in PS5 lane`);
}finally{
  await writeFile(path.join(artifacts,'results.json'),JSON.stringify({ready,transcript:client.transcript,stderr,backendStderr:client.stderr},null,2));
  client.child.stdin.end();await writeFile(path.join(artifacts,'command.json'),JSON.stringify({action:'quit',id:100}));
  for(let i=0;i<50&&(fixture.exitCode===null||client.child.exitCode===null);i++)await delay(100);
  if(fixture.exitCode===null)fixture.kill();if(client.child.exitCode===null)client.child.kill();
}
