import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
export interface BackendOptions {executable?:string; indicator?:boolean}
interface Pending {resolve:(v:Record<string,unknown>)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout;removeAbort:()=>void}
export class Backend {
  private child?:ChildProcessWithoutNullStreams;
  private pending=new Map<number,Pending>();
  private nextId=0;
  private tail:Promise<unknown>=Promise.resolve();
  private blockedTurns=new Set<string>();
  constructor(private options:BackendOptions={}){}
  private start():ChildProcessWithoutNullStreams {
    if(this.child)return this.child;
    const executable=this.options.executable??fileURLToPath(new URL('../native/DesktopEngine.exe',import.meta.url));
    const child=this.child=spawn(executable,[],{stdio:'pipe',windowsHide:true});
    const lines=createInterface({input:child.stdout});
    lines.on('line',line=>{
      let response:{id?:number;ok?:boolean;result?:Record<string,unknown>;error?:string};
      try{response=JSON.parse(line);}catch{this.fail(child,new Error('NATIVE_PROTOCOL_ERROR'));return;}
      const p=response.id===undefined?undefined:this.pending.get(response.id);
      if(!p)return;
      this.pending.delete(response.id!);clearTimeout(p.timer);p.removeAbort();
      response.ok?p.resolve(response.result??{}):p.reject(new Error(response.error??'Native engine failed'));
    });
    child.stderr.on('data',chunk=>process.stderr.write(`[native] ${chunk}`));
    child.stdin.on('error',()=>{});
    child.on('error',error=>this.fail(child,error));
    child.on('exit',()=>this.fail(child,new Error('NATIVE_ENGINE_EXITED')));
    return child;
  }
  private fail(child:ChildProcessWithoutNullStreams,error:Error):void {
    if(this.child!==child)return;
    this.child=undefined;
    for(const p of this.pending.values()){clearTimeout(p.timer);p.removeAbort();p.reject(error);}
    this.pending.clear(); child.kill();
  }
  call(action:string,args:Record<string,unknown>={},turnId='standalone',signal?:AbortSignal):Promise<Record<string,unknown>> {
    const task=this.tail.catch(()=>{}).then(()=>{
      if(signal?.aborted)throw new Error('CANCELLED_BEFORE_DISPATCH');
      if(this.blockedTurns.has(turnId)&&action!=='health'&&action!=='resume')throw new Error('STOPPED_BY_USER: wait for a new human turn.');
      if(action==='resume')this.blockedTurns.delete(turnId);
      return this.dispatch(action,args,turnId,signal);
    });
    this.tail=task;return task;
  }
  private dispatch(action:string,args:Record<string,unknown>,turnId:string,signal?:AbortSignal):Promise<Record<string,unknown>> {
    const child=this.start(),id=++this.nextId;
    return new Promise((resolve,reject)=>{
      let expired=false,grace:NodeJS.Timeout|undefined;
      const abort=()=>{this.blockedTurns.add(turnId);child.stdin.write(JSON.stringify({id:++this.nextId,action:'cancel'})+'\n');};
      const timeout=action==='wait_for'?Number(args.timeoutMs??5000)+15000:Math.max(35000,Number(args.treeTimeoutMs??0)+10000);
      const timer=setTimeout(()=>{
        // Ask native input routines to release held keys before terminating a wedged worker.
        expired=true;abort();
        grace=setTimeout(()=>{this.fail(child,new Error('NATIVE_TIMEOUT: no automatic replay; observe target before any retry.'));},1500);grace.unref();
      },timeout);
      const removeAbort=()=>{signal?.removeEventListener('abort',abort);if(grace)clearTimeout(grace);};
      const rejectResult=(error:Error)=>{if(/STOPPED_BY_USER/.test(error.message))this.blockedTurns.add(turnId);reject(error);};
      this.pending.set(id,{resolve:v=>expired?rejectResult(new Error('NATIVE_TIMEOUT')):signal?.aborted?rejectResult(new Error('CANCELLED_AFTER_CURRENT_ACTION')):resolve(v),reject:rejectResult,timer,removeAbort});
      signal?.addEventListener('abort',abort,{once:true});
      child.stdin.write(JSON.stringify({id,action,args,turnId,indicator:this.options.indicator??true})+'\n',error=>{if(error)this.fail(child,error);});
    });
  }
  async close():Promise<void>{
    const child=this.child;if(!child)return;
    const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));
    child.stdin.end();const force=setTimeout(()=>child.kill(),2500);force.unref();
    await exited;clearTimeout(force);
  }
}
