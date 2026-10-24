// Owned browser profile + local page, never user's tabs or browsing data.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,mkdtempSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Backend} from '../dist/backend.js';
const base=path.resolve('work/browser-text');
mkdirSync(base,{recursive:true});
const root=mkdtempSync(path.join(base,'run-'));
const html=readFileSync('tests/browser-form.html');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=spawn(process.env.DSH_TEST_BROWSER??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  [`--user-data-dir=${root}`,`--app=http://127.0.0.1:${server.address().port}/`,'--guest','--no-first-run','--no-default-browser-check','--force-renderer-accessibility','--window-position=20,20','--window-size=900,700'],{stdio:'ignore',windowsHide:false});
const backend=new Backend({indicator:false});
let hwnd;
try{
  for(let i=0;i<30;i++){
    const windows=await backend.call('list_windows',{maxWindows:100});
    const win=windows.windows.find(w=>w.processId===browser.pid&&w.name.includes('DSH Text Batch Browser Fixture'));
    if(win){hwnd=win.nativeWindowHandle;break;}
    await new Promise(resolve=>setTimeout(resolve,300));
  }
  assert.ok(hwnd,'Browser fixture window must exist');
  const call=async(action,args={})=>{try{return await backend.call(action,{nativeWindowHandle:hwnd,...args},'browser-test');}catch(error){throw new Error(action+': '+error.message,{cause:error});}};
  await call('activate_window');
  let view;
  for(let i=0;i<20;i++){
    view=await call('observe_text');
    if(view.batchAvailable&&['测试姓名','测试城市'].every(name=>view.nodes.some(n=>n.name===name&&n.canFill)))break;
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  const person=view.nodes.find(n=>n.name==='测试姓名'&&n.canFill);
  const city=view.nodes.find(n=>n.name==='测试城市'&&n.canFill);
  assert.ok(person&&city,JSON.stringify(view));
  const result=await call('run_text_batch',{observationId:view.observationId,actions:[
    {action:'fill',reference:person.reference,text:'测试用户'},
    {action:'fill',reference:city.reference,text:'广州'},
  ]});
  assert.equal(result.status,'completed',JSON.stringify(result));
  assert.equal(result.completed,2);
  assert.deepEqual(result.steps.map(s=>s.verification),['observed','observed']);
  view=result.observation;
  const submit=view.nodes.find(n=>n.name==='提交测试'&&n.type==='Button');assert.ok(submit);
  const submitted=await call('run_text_batch',{observationId:view.observationId,actions:[{action:'click',reference:submit.reference}]});
  assert.equal(submitted.completed,1,JSON.stringify(submitted));
  const final=await call('observe_text');
  assert.ok(final.nodes.some(n=>n.name.includes('提交成功：测试用户 / 广州')),JSON.stringify(final));
  assert.ok(!JSON.stringify(result).includes('base64'));
  console.log(JSON.stringify({passed:true,browser:'Edge',textOnly:true,fieldsFilled:2,valuesReadBack:true,submissionObserved:true,realModel:false}));
}finally{
  if(hwnd)try{await backend.call('close_window',{nativeWindowHandle:hwnd},'browser-test');}catch{}
  await backend.close();server.closeAllConnections();server.close();
  // Browser may hand off to its own child; close_window targets only our HWND.
  browser.unref();
}
