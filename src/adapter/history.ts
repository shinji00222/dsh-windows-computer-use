import {randomUUID} from 'node:crypto';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';

export interface TurnContext {session:string;turn:number|null}
export function parseTurn(turnId:string):TurnContext {
  const value:unknown=JSON.parse(turnId);
  if(!Array.isArray(value)||value.length!==2||typeof value[0]!=='string'||!value[0]||!Number.isSafeInteger(value[1]))throw new Error('INVALID_USER_TURN');
  return {session:value[0],turn:value[1]};
}
export const historyTool:Tool={
  name:'windows_computer_use_operation_history',
  description:'Read recent operation evidence across human turns in this conversation. Memory-only, bounded, reset on plugin restart. History is not a fresh observation and cannot authorize replay. Images remain in the original tool responses; history stores metadata only.',
  inputSchema:{type:'object',additionalProperties:false,properties:{
    limit:{type:'integer',minimum:1,maximum:100,default:20},
    beforeSequence:{type:'integer',minimum:1,description:'Exclusive cursor from the oldest entry in the previous page.'},
  }},
};
type Result=Record<string,unknown>;
interface Entry {
  operationId:string;sequence:number;turn:number|null;action:string;
  startedAt:string;finishedAt?:string;status:string;
  evidence:Record<string,unknown>;
}
const code=(value:unknown)=>typeof value==='string'?value.match(/^([A-Z][A-Z0-9_]{1,79})(?=:|$)/)?.[1]:undefined;
const token=(value:unknown)=>typeof value==='string'&&value.length<=256?value:undefined;
const count=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=0?value:undefined;

// Keep only an allowlist of evidence metadata: no arguments, titles, UI text,
// exception messages, image bytes or typed values are copied into the journal.
export class OperationHistory {
  private entries:{session:string;entry:Entry}[]=[];
  private sequence=0;
  constructor(private capacity=500){
    if(!Number.isSafeInteger(capacity)||capacity<1)throw new Error('INVALID_HISTORY_CAPACITY');
  }
  begin(context:TurnContext,action:string):Entry {
    const entry:Entry={operationId:randomUUID(),sequence:++this.sequence,turn:context.turn,action,
      startedAt:new Date().toISOString(),status:'pending',evidence:{verification:'unconfirmed'}};
    this.entries.push({session:context.session,entry});
    if(this.entries.length>this.capacity)this.entries.shift();
    return entry;
  }
  finish(entry:Entry,result?:Result,error?:unknown):Entry {
    entry.finishedAt=new Date().toISOString();
    if(error!==undefined){
      entry.status='failed';
      entry.evidence={verification:'unconfirmed',errorCode:code(error instanceof Error?error.message:String(error))??'OPERATION_FAILED',
        note:'An error may follow partial input. Observe before retrying; do not replay automatically.'};
    }else{
      const data=result??{};
      entry.status=['completed','checkpoint','stopped'].includes(String(data.status))?String(data.status):'returned';
      const shot=data.screenshot as Result|undefined;
      entry.evidence={
        verification:['sent','observed','unconfirmed','inspect_final_screenshot'].includes(String(data.verification))?data.verification:'unconfirmed',
        completed:count(data.completed),attempted:count(data.attempted),remaining:count(data.remaining),
        stopCode:code(data.reason),captureErrorCode:code(data.captureError),
        screenshotId:token(data.screenshotId),imageReturned:typeof shot?.base64==='string'&&shot.base64.length>0,
        imageSource:['screen','PrintWindow'].includes(String(shot?.source))?shot?.source:undefined,
        occludedPossible:typeof shot?.occludedPossible==='boolean'?shot.occludedPossible:undefined,
        steps:Array.isArray(data.steps)?data.steps.slice(0,16).map(step=>({
          index:count(step.index),
          action:['click','double_click','move','scroll','type_text','keypress','wait'].includes(step.action)?step.action:undefined,
          status:['sent','failed_or_partial','stopped'].includes(step.status)?step.status:undefined,
        })):undefined,
      };
    }
    return structuredClone(entry);
  }
  list(session:string,limit=20,beforeSequence=Number.MAX_SAFE_INTEGER){
    const retained=this.entries.filter(item=>item.session===session).map(item=>item.entry);
    const eligible=retained.filter(entry=>entry.sequence<beforeSequence).reverse();
    const entries=eligible.slice(0,limit);
    return structuredClone({entries,hasMore:eligible.length>limit,
      nextBeforeSequence:eligible.length>limit?entries.at(-1)?.sequence:null,
      retention:{storage:'memory',capacity:this.capacity,scope:'current conversation',retained:retained.length,
        note:'Old entries may be evicted across conversations. Restart clears history. Absence does not prove an action never ran.'},
      note:'Evidence describes the original response, not current desktop state or confirmed attachment storage. Inspect original images and obtain a fresh observation before acting.'});
  }
}
