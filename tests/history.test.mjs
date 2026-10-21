import test from 'node:test';
import assert from 'node:assert/strict';
import {OperationHistory,parseTurn} from '../dist/history.js';
import {createToolHandler} from '../dist/tool-handler.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

const name=action=>'windows_computer_use_'+action;
const data=response=>JSON.parse(response.content[0].text);
const batchArgs={nativeWindowHandle:1,screenshotId:'initial-frame',actions:[{action:'type_text',text:'private input'}]};

test('history spans turns, isolates conversations, and never dispatches a history read',async()=>{
  let turn='["a",1]',calls=0;
  const handle=createToolHandler({getTurnId:async()=>turn,backend:{async call(){calls++;return {verification:'sent'};}}});
  const first=data(await handle(name('type_text'),{text:'private input'}));
  turn='["a",2]';
  const second=data(await handle(name('health')));
  const history=data(await handle(name('operation_history')));
  assert.deepEqual(history.entries.map(entry=>entry.turn),[2,1]);
  assert.equal(history.entries[1].operationId,first.operation.operationId);
  assert.notEqual(first.operation.operationId,second.operation.operationId);
  assert.equal(calls,2);
  turn='["b",1]';
  assert.deepEqual(data(await handle(name('operation_history'))).entries,[]);
});

test('partial batches preserve images and expose progress without claiming verification',async()=>{
  const handle=createToolHandler({backend:{async call(){return {
    status:'stopped',completed:1,attempted:2,remaining:2,reason:'STOPPED_BY_USER: private detail',
    verification:'inspect_final_screenshot',screenshotId:'final-frame',
    screenshot:{base64:'image-bytes',mimeType:'image/png',source:'screen',occludedPossible:true},
    steps:[{index:0,action:'type_text',status:'sent',result:{verifyValue:'private text'}},
      {index:1,action:'click',status:'failed_or_partial',error:'private error'}],
  };}}});
  const response=await handle(name('run_batch'),batchArgs);
  assert.equal(response.isError,undefined);
  assert.equal(response.content[1].data,'image-bytes');
  assert.equal(data(response).screenshot.base64,undefined);
  const evidence=data(response).operation.evidence;
  assert.equal(evidence.verification,'inspect_final_screenshot');
  assert.equal(evidence.completed,1);assert.equal(evidence.attempted,2);
  assert.equal(evidence.imageReturned,true);assert.equal(evidence.occludedPossible,true);
  assert.equal(evidence.stopCode,'STOPPED_BY_USER');
  const saved=data(await handle(name('operation_history')));
  assert.doesNotMatch(JSON.stringify(saved),/private|image-bytes/);
  assert.equal(saved.entries[0].evidence.steps[1].status,'failed_or_partial');
});

test('native errors remain errors and have uncertain evidence across later turns',async()=>{
  let turn='["a",1]';
  const handle=createToolHandler({getTurnId:async()=>turn,backend:{async call(){throw Error('NATIVE_TIMEOUT: private text');}}});
  const result=await handle(name('type_text'),{text:'private input'});
  assert.equal(result.isError,true);assert.match(result.content[0].text,/NATIVE_TIMEOUT/);
  const operation=JSON.parse(result.content[1].text).operation;
  assert.equal(operation.status,'failed');assert.equal(operation.evidence.verification,'unconfirmed');
  turn='["a",2]';
  const saved=data(await handle(name('operation_history')));
  assert.equal(saved.entries[0].operationId,operation.operationId);
  assert.doesNotMatch(JSON.stringify(saved),/private/);
});

test('read-only history works without native process; input and model-supplied session are rejected',async()=>{
  const handle=createToolHandler({readOnly:true,getTurnId:async()=>'["a",1]',backend:{async call(){assert.fail('must not dispatch');}}});
  assert.deepEqual(data(await handle(name('operation_history'))).entries,[]);
  assert.match((await handle(name('click'),{x:1,y:1})).content[0].text,/READ_ONLY/);
  assert.match((await handle(name('operation_history'),{session:'b'})).content[0].text,/INVALID_ARGUMENTS/);
  assert.match((await handle(name('operation_history'),{limit:101})).content[0].text,/INVALID_ARGUMENTS/);
});

test('history requires active trusted turn and cannot resume stopped DSH input',async()=>{
  let turn='';
  const handle=createToolHandler({getTurnId:async()=>turn,backend:{async call(){assert.fail('must not dispatch');}}});
  assert.match((await handle(name('operation_history'))).content[0].text,/NO_ACTIVE_USER_TURN/);
  turn='["a",1]';
  assert.match((await handle(name('resume'))).content[0].text,/RESUME_DISABLED_IN_DSH/);
  for(const value of ['null','{}','["a"]','["",1]','["a","1"]','["a",1,2]'])assert.throws(()=>parseTurn(value),/INVALID_USER_TURN/);
});

test('bounded history pages only the current session and returns independent snapshots',()=>{
  const history=new OperationHistory(3);
  for(let i=1;i<=5;i++)history.finish(history.begin({session:i===4?'b':'a',turn:i},'health'),{});
  const first=history.list('a',1);
  assert.equal(first.entries[0].turn,5);assert.equal(first.hasMore,true);
  const second=history.list('a',1,first.nextBeforeSequence);
  assert.equal(second.entries[0].turn,3);assert.equal(second.hasMore,false);
  first.entries[0].status='forged';
  assert.equal(history.list('a').entries[0].status,'returned');
  assert.equal(history.list('b').entries[0].turn,4);
  assert.deepEqual(new OperationHistory().list('a').entries,[]);
});

test('pending operations are visible and retain the captured turn after host advances',async()=>{
  let complete,turn='["a",1]';
  const handle=createToolHandler({getTurnId:async()=>turn,backend:{call(){return new Promise(resolve=>{complete=resolve;});}}});
  const pending=handle(name('health'));
  await new Promise(resolve=>setImmediate(resolve));
  turn='["a",2]';
  const running=data(await handle(name('operation_history'))).entries[0];
  assert.equal(running.status,'pending');assert.equal(running.turn,1);
  complete({engine:'C#'});await pending;
  const finished=data(await handle(name('operation_history'))).entries[0];
  assert.equal(finished.status,'returned');assert.equal(finished.turn,1);
});

test('only explicit native observed evidence is reported as observed',async()=>{
  for(const verification of ['sent','observed','unconfirmed',undefined]){
    const handle=createToolHandler({backend:{async call(){return {verification};}}});
    const result=data(await handle(name('health')));
    assert.equal(result.operation.evidence.verification,verification??'unconfirmed');
  }
});

test('real MCP transport discovers and reads history in read-only mode without Windows',async()=>{
  const env={...process.env,DSH_NATIVE_READ_ONLY:'1'};delete env.DSH_NATIVE_TURN_FILE;
  const client=new Client({name:'history-test',version:'1'});
  const transport=new StdioClientTransport({command:process.execPath,args:['dist/server.js'],env});
  try{
    await client.connect(transport);
    const tools=await client.listTools();
    assert.ok(tools.tools.some(tool=>tool.name===name('operation_history')));
    assert.ok(!tools.tools.some(tool=>tool.name===name('run_batch')));
    const response=await client.callTool({name:name('operation_history'),arguments:{}});
    assert.equal(response.isError,undefined);assert.deepEqual(data(response).entries,[]);
    assert.equal((await client.callTool({name:name('operation_history'),arguments:{turnId:'forged'}})).isError,true);
  }finally{await client.close();}
});
