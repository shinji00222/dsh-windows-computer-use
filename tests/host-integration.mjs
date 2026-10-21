// Run with the installed DSH Electron runtime in Node mode. Does not mount or
// edit the user's profile and does not invoke a model or account credentials.
import assert from 'node:assert/strict';
import {createRequire,registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
const runtime=process.argv[2];
if(!runtime)throw Error('Pass DSH runtime package.json');
const deadline=setTimeout(()=>{console.error('HOST_INTEGRATION_TIMEOUT');process.exit(1);},60000);
const hostRequire=createRequire(runtime);
const localRequire=createRequire(import.meta.url);
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier.startsWith('@deepseek-ai/')&&!context.parentURL?.includes('app.asar'))return {url:pathToFileURL(hostRequire.resolve(specifier)).href,shortCircuit:true};
  return next(specifier,context);
}});
const {Context}=await import(pathToFileURL(hostRequire.resolve('@deepseek-ai/cordis')).href);
const packageRoot=path.resolve(process.env.DSH_TEST_PACKAGE_ROOT??'.');
const adapter=await import(pathToFileURL(path.join(packageRoot,'dist/plugin.js')).href);
const ctx=new Context();
const {LocalAttachmentStore}=await import(pathToFileURL(hostRequire.resolve('@deepseek-ai/dsh-attachment-local')).href);
await ctx.plugin(LocalAttachmentStore,LocalAttachmentStore.Config({dshHome:path.resolve('work/host-image-store')}));
let imageCapable=true;
// Only model-route metadata is a test seam. Admission, persistence and tool
// projection use the installed DSH implementation; no paid model is invoked.
ctx.provide('llm',{resolveModelInfo:async()=>({inputModalities:imageCapable?['text','image']:['text']})});
const tools=new Map();
ctx.provide('tools',{register(definition){assert.ok(definition.name.startsWith('mcp__shin_desktop__'));tools.set(definition.name,definition);return ()=>tools.delete(definition.name);}});
let fiber,fixture;
try{
  fiber=ctx.plugin(adapter,adapter.Config({indicatorEnabled:false,readOnly:false}));
  await fiber;
  assert.equal(tools.size,26,`Only ${tools.size} tools registered`);
  assert.ok(tools.has('mcp__shin_desktop__windows_computer_use_type_text'));
  const health=tools.get('mcp__shin_desktop__windows_computer_use_health');
  // Real Cordis hook publishes a user turn; the actual official MCP bridge
  // executes through Electron -> TypeScript -> C# -> back through ToolRuntime.
  const exec={name:health.name,signal:new AbortController().signal,agent:{session:{id:'isolated-fixture',requestHeader:()=>({config:{provider:'test-route',model:'fixture-vision'}})},phase:{kind:'running',turn:1}}};
  const response=await ctx.serial('tools/execute',exec,()=>health.execute({},exec));
  assert.match(JSON.stringify(response),/C#/);
  // Verify a real input round trip through the installed host bridge, not just health.
  fixture=spawn(path.join(packageRoot,'native/DesktopEngine.exe'),['--fixture'],{stdio:'pipe',windowsHide:true});
  const lines=createInterface({input:fixture.stdout});
  const [ready]=await once(lines,'line');
  const target={nativeWindowHandle:JSON.parse(ready).hwnd};
  const projectedImages=[];
  async function call(action,args={}){
    const tool=tools.get('mcp__shin_desktop__windows_computer_use_'+action);
    const execution={...exec,name:tool.name};
    const input=action==='operation_history'?args:{...target,...args};
    const result=await ctx.serial('tools/execute',execution,()=>tool.execute(input,execution));
    const projection=tool.projectContent(execution,{value:result,content:tool.output.render(args,result),isError:false});
    if(action==='screenshot'||action==='run_batch'){
      const image=projection?.find(p=>p.type==='image');assert.ok(image,JSON.stringify(projection));
      const store=ctx.get('attachments');assert.ok(existsSync(store.imageHostPath(image.attachment)));
      projectedImages.push(image);
    }
    // ToolRuntime may wrap MCP content; locate the JSON text without hiding errors.
    assert.ok(!JSON.stringify(result).includes('isError\":true'),JSON.stringify(result));
    function decode(value){
      if(value&&typeof value==='object'){
        if(value.type==='text'&&typeof value.text==='string'){
          try{return JSON.parse(value.text);}catch{}
        }
        for(const child of Object.values(value)){const decoded=decode(child);if(decoded)return decoded;}
      }
    }
    const decoded=decode(result);assert.ok(decoded,JSON.stringify(result));return decoded;
  }
  let tree=await call('accessibility_tree');
  const edit=tree.nodes.find(node=>node.automationId==='testInput');assert.ok(edit);
  await call('activate_window');
  await call('focus',{elementId:edit.id});
  await call('type_text',{text:'DSH 桥接中文验证 123',method:'sendinput'});
  tree=await call('accessibility_tree');
  assert.equal(tree.nodes.find(node=>node.automationId==='testInput').value,'DSH 桥接中文验证 123');
  const box=tree.nodes.find(node=>node.automationId==='testInput').boundingBox;
  const shot=await call('screenshot',{maxWidth:340});
  const actions=[
    {action:'click',x:Math.floor((box.centerX-shot.screenshot.bounds.x)*shot.screenshot.width/shot.screenshot.bounds.width),y:Math.floor((box.centerY-shot.screenshot.bounds.y)*shot.screenshot.height/shot.screenshot.bounds.height)},
    {action:'keypress',keys:['ctrl','a']},{action:'type_text',text:'DSH 看图批量输入成功'}
  ];
  imageCapable=false;
  await assert.rejects(()=>call('run_batch',{screenshotId:shot.screenshotId,actions}),/VISION_MODEL_REQUIRED/);
  imageCapable=true;
  const batch=await call('run_batch',{screenshotId:shot.screenshotId,actions});
  assert.equal(batch.status,'completed',JSON.stringify(batch));assert.equal(batch.completed,3);
  assert.equal(projectedImages.length,2,'Exactly initial and final images, no per-action screenshots');
  tree=await call('accessibility_tree');
  assert.equal(tree.nodes.find(node=>node.automationId==='testInput').value,'DSH 看图批量输入成功');
  exec.agent.phase.turn=2;
  const history=await call('operation_history');
  const recordedBatch=history.entries.find(entry=>entry.operationId===batch.operation.operationId);
  assert.ok(recordedBatch,'Batch evidence must survive into the next human turn');
  assert.equal(recordedBatch.turn,1);
  assert.equal(recordedBatch.evidence.completed,3);
  assert.equal(recordedBatch.evidence.imageReturned,true);
  assert.equal(recordedBatch.evidence.verification,'inspect_final_screenshot');
  assert.ok(!JSON.stringify(history).includes('DSH 看图批量输入成功'),'History must not duplicate typed values');
  await call('close_window');
  let client;
  vm.runInNewContext(readFileSync(path.join(packageRoot,'dist/client.js'),'utf8'),{window:{__ModuleLoader__:{load:entry=>{client=entry.factory(name=>name==='react'?localRequire(name):hostRequire(name));}}}});
  assert.equal(client.name,'dsh-windows-computer-use');
  const slots=[];
  const clientCtx=new Context();clientCtx.provide('slots',{inject:(_name,register)=>register(),register:(entry,component)=>{slots.push({entry,component});return ()=>{};}});
  try{await clientCtx.plugin(client);assert.equal(slots[0].entry.id,'dsh-windows-computer-use');}finally{await clientCtx.fiber.dispose();}
  const content=localRequire('react-dom/server').renderToStaticMarkup(localRequire('react').createElement(slots[0].component));
  assert.match(content,/C#/);assert.match(content,/Esc/);
  console.log(JSON.stringify({passed:true,officialBridge:true,nativeEngine:true,unicodeInputReadback:true,visualBatch:true,durableImageProjection:true,imageCount:projectedImages.length,textOnlyModelRejected:true,electron:process.versions.electron,tools:tools.size,clientSlot:true}));
}finally{if(fixture?.exitCode===null)fixture.kill();await ctx.fiber.dispose();hooks.deregister();clearTimeout(deadline);}
