import z from '@deepseek-ai/schemastery';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const name='dsh-windows-computer-use';
export const inject=['tools'];
export const Config=z.object({
  indicatorEnabled:z.boolean().default(true).description('显示操作提示，Esc 急停始终启用 / Show indicator (Esc always enabled)'),
  readOnly:z.boolean().default(false).description('仅观察，不发送输入 / Observe only'),
});
export interface ConfigValue{indicatorEnabled:boolean;readOnly:boolean}
interface Execution{ name:string; signal?:AbortSignal; agent?:{session?:{id:string};phase?:{kind:string;turn:number}} }
interface HostContext{
  on(event:string,handler:(...args:any[])=>unknown,options?:{global:boolean}):unknown;
  effect(effect:()=>()=>void):unknown;
  plugin(plugin:unknown,config:Record<string,unknown>):PromiseLike<unknown>;
}
export function bridgeConfig(config:ConfigValue,turnFile:string){
  return {serverName:'shin_desktop',transport:'stdio',command:process.execPath,
    args:[fileURLToPath(new URL('./server.js',import.meta.url))],
    env:{ELECTRON_RUN_AS_NODE:'1',DSH_NATIVE_INDICATOR:config.indicatorEnabled?'1':'0',DSH_NATIVE_READ_ONLY:config.readOnly?'1':'0',DSH_NATIVE_TURN_FILE:turnFile},
    toolCallTimeoutMs:90000,failOnStartupError:true};
}
export async function apply(ctx:HostContext,config:ConfigValue):Promise<void>{
  const bridge=await import('@deepseek-ai/dsh-mcp-client');
  const root=mkdtempSync(path.join(os.tmpdir(),'dsh-native-'));
  const turnFile=path.join(root,'turn.json');
  let owner:{session:string;turn:number;pending:number}|undefined;
  const publish=(turnId:string|null)=>{
    const temp=turnFile+'.tmp';writeFileSync(temp,JSON.stringify({turnId}),'utf8');renameSync(temp,turnFile);
  };
  publish(null);
  ctx.on('tools/execute',async(exec:Execution,next:()=>Promise<unknown>)=>{
    if(!exec.name.startsWith('mcp__shin_desktop__windows_computer_use_'))return next();
    const session=exec.agent?.session,phase=exec.agent?.phase;
    if(!session||phase?.kind!=='running')throw new Error('NO_ACTIVE_USER_TURN');
    if(owner&&owner.session!==session.id)throw new Error('DESKTOP_BUSY: another DSH conversation owns this turn.');
    const current=owner??={session:session.id,turn:phase.turn,pending:0};
    current.turn=phase.turn;current.pending++;publish(JSON.stringify([current.session,current.turn]));
    try{return await next();}finally{current.pending--;}
  },{global:true});
  ctx.on('session/event',(session:{id:string},event:{type:string;data:{turn:number}})=>{
    if(event.type==='turn/end'&&owner?.session===session.id&&owner.turn===event.data.turn){owner=undefined;publish(null);}
  },{global:true});
  ctx.effect(()=>()=>{rmSync(root,{recursive:true,force:true});});
  await ctx.plugin(bridge,bridgeConfig(config,turnFile));
}
