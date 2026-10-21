#!/usr/bin/env node
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {readFile} from 'node:fs/promises';
import {Backend} from './backend.js';
import {catalog} from './catalog.js';
import {createToolHandler,readActions} from './tool-handler.js';
const backend=new Backend({indicator:process.env.DSH_NATIVE_INDICATOR!=='0'});
const server=new Server({name:'dsh-windows-computer-use',version:'0.1.0-preview.3'},{
  capabilities:{tools:{}},
  instructions:'Prefer visual workflow: select a window, activate it, call screenshot, inspect its image, then run_batch with screenshotId and screenshot-pixel coordinates. Group up to 8 predictable actions on the same screen; final image is returned automatically. Checkpoint after navigation/submit/menu actions, and never replay completed actions after a partial stop. When layoutGuard is unavailable, only group known focus/typing steps and checkpoint uncertain actions. Images require an image-capable DSH model. UIA/OCR remain fallbacks. Use operation_history to review prior turns in this conversation; operation evidence does not replace fresh observation or authorize replay.',
});
const readOnly=process.env.DSH_NATIVE_READ_ONLY==='1';
const visibleCatalog=readOnly?catalog.filter(tool=>readActions.has(tool.name.replace('windows_computer_use_',''))):catalog;
const turnFile=process.env.DSH_NATIVE_TURN_FILE;
const handleTool=createToolHandler({backend,readOnly,getTurnId:turnFile?async()=>{
  const state=JSON.parse(await readFile(turnFile,'utf8')) as {turnId?:string};
  if(!state.turnId)throw new Error('NO_ACTIVE_USER_TURN');
  return state.turnId;
}:undefined});
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:visibleCatalog}));
server.setRequestHandler(CallToolRequestSchema,async(request,extra)=>handleTool(request.params.name,request.params.arguments,extra.signal));
let closing=false;
async function close(){if(closing)return;closing=true;await backend.close();await server.close();}
process.stdin.on('end',()=>{void close();});
process.on('SIGINT',()=>{void close();});process.on('SIGTERM',()=>{void close();});
await server.connect(new StdioServerTransport());
