import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {catalog} from '../dist/catalog.js';
test('MCP protocol: discovery, input validation, real native health, read-only enforcement',{timeout:30000},async()=>{
  const transport=new StdioClientTransport({command:process.execPath,args:['dist/server.js'],env:{...process.env,DSH_NATIVE_READ_ONLY:'1',DSH_NATIVE_INDICATOR:'0'}});
  const client=new Client({name:'native-protocol-test',version:'1'});
  try{
    await client.connect(transport);
    const list=await client.listTools();assert.ok(list.tools.some(t=>t.name==='windows_computer_use_screenshot'));
    assert.ok(!list.tools.some(t=>t.name==='windows_computer_use_click'));
    assert.ok(!list.tools.some(t=>t.name==='windows_computer_use_run_batch'));
    const health=await client.callTool({name:'windows_computer_use_health',arguments:{}});assert.equal(health.isError,undefined);
    assert.equal(JSON.parse(health.content[0].text).engine,'C#');
    const invalid=await client.callTool({name:'windows_computer_use_wait',arguments:{milliseconds:'1'}});assert.equal(invalid.isError,true);
    const extra=await client.callTool({name:'windows_computer_use_health',arguments:{unknown:true}});assert.equal(extra.isError,true);
    const write=await client.callTool({name:'windows_computer_use_type_text',arguments:{text:'must not type'}});assert.equal(write.isError,true);assert.match(write.content[0].text,/READ_ONLY/);
    const batch=await client.callTool({name:'windows_computer_use_run_batch',arguments:{nativeWindowHandle:1,screenshotId:'not-real',actions:[{action:'type_text',text:'blocked'}]}});
    assert.equal(batch.isError,true);assert.match(batch.content[0].text,/READ_ONLY/);
    assert.equal(new Set(catalog.map(t=>t.name)).size,catalog.length);
    assert.ok(!JSON.stringify(catalog).includes('"background"'));
  }finally{await client.close();}
});
