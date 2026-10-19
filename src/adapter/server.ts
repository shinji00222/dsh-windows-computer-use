#!/usr/bin/env node
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {Ajv} from 'ajv';
import {readFile} from 'node:fs/promises';
import {Backend} from './backend.js';
import {catalog} from './catalog.js';
const backend=new Backend({indicator:process.env.DSH_NATIVE_INDICATOR!=='0'});
const server=new Server({name:'dsh-windows-computer-use',version:'0.1.0-preview.2'},{capabilities:{tools:{}}});
const ajv=new Ajv({useDefaults:true,strict:false,allErrors:true});
const readActions=new Set(['health','list_windows','snapshot','accessibility_tree','find','element_info','screenshot','ocr','wait','wait_for']);
const visibleCatalog=process.env.DSH_NATIVE_READ_ONLY==='1'?catalog.filter(tool=>readActions.has(tool.name.replace('windows_computer_use_',''))):catalog;
const validators=new Map(catalog.map(tool=>[tool.name,ajv.compile(tool.inputSchema)]));
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:visibleCatalog}));
server.setRequestHandler(CallToolRequestSchema,async(request,extra)=>{
  try{
    const validate=validators.get(request.params.name);
    if(!validate)throw new Error('UNKNOWN_TOOL');
    const args=structuredClone(request.params.arguments??{});
    if(!validate(args))throw new Error('INVALID_ARGUMENTS: '+ajv.errorsText(validate.errors));
    const action=request.params.name.replace('windows_computer_use_','');
    if(process.env.DSH_NATIVE_READ_ONLY==='1'&&!readActions.has(action))throw new Error('READ_ONLY: desktop input disabled by user.');
    if(['click','double_click','move','scroll','element_info'].includes(action)&&!args.elementId&&(args.x===undefined||args.y===undefined))throw new Error('POINT_REQUIRED: supply elementId or both x and y.');
    let turnId='standalone';
    if(process.env.DSH_NATIVE_TURN_FILE){
      const state=JSON.parse(await readFile(process.env.DSH_NATIVE_TURN_FILE,'utf8')) as {turnId?:string};
      if(!state.turnId)throw new Error('NO_ACTIVE_USER_TURN');turnId=state.turnId;
      if(action==='resume')throw new Error('RESUME_DISABLED_IN_DSH: wait for a new human turn.');
    }
    const result=await backend.call(action,args,turnId,extra.signal);
    const image=result.screenshot as {base64?:string;mimeType?:string}|undefined;
    const safe=structuredClone(result);if(safe.screenshot)delete (safe.screenshot as Record<string,unknown>).base64;
    const content:({type:'text';text:string}|{type:'image';data:string;mimeType:string})[]=[{type:'text',text:JSON.stringify(safe)}];
    if(image?.base64)content.push({type:'image',data:image.base64,mimeType:image.mimeType??'image/png'});
    return {content};
  }catch(error){return {isError:true,content:[{type:'text',text:error instanceof Error?error.message:String(error)}]};}
});
let closing=false;
async function close(){if(closing)return;closing=true;await backend.close();await server.close();}
process.stdin.on('end',()=>{void close();});
process.on('SIGINT',()=>{void close();});process.on('SIGTERM',()=>{void close();});
await server.connect(new StdioServerTransport());
