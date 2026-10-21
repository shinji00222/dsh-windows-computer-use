import {Ajv} from 'ajv';
import {catalog} from './catalog.js';
import {OperationHistory,parseTurn} from './history.js';

export const readActions=new Set(['health','list_windows','snapshot','accessibility_tree','find','element_info','screenshot','ocr','wait','wait_for','operation_history']);
interface Options {
  backend:{call(action:string,args:Record<string,unknown>,turnId:string,signal?:AbortSignal):Promise<Record<string,unknown>>};
  readOnly?:boolean;
  getTurnId?:()=>Promise<string>;
}
export function createToolHandler(options:Options){
  const history=new OperationHistory();
  const ajv=new Ajv({useDefaults:true,strict:false,allErrors:true});
  const validators=new Map(catalog.map(tool=>[tool.name,ajv.compile(tool.inputSchema)]));
  return async(name:string,input:Record<string,unknown>={},signal?:AbortSignal)=>{
    try{
      const validate=validators.get(name);
      if(!validate)throw new Error('UNKNOWN_TOOL');
      const args=structuredClone(input);
      if(!validate(args))throw new Error('INVALID_ARGUMENTS: '+ajv.errorsText(validate.errors));
      const action=name.replace('windows_computer_use_','');
      if(options.readOnly&&!readActions.has(action))throw new Error('READ_ONLY: desktop input disabled by user.');
      if(['click','double_click','move','scroll','element_info'].includes(action)&&!args.elementId&&(args.x===undefined||args.y===undefined))throw new Error('POINT_REQUIRED: supply elementId or both x and y.');
      const turnId=options.getTurnId?await options.getTurnId():'standalone';
      if(!turnId)throw new Error('NO_ACTIVE_USER_TURN');
      const context=options.getTurnId?parseTurn(turnId):{session:'standalone',turn:null};
      if(options.getTurnId&&action==='resume')throw new Error('RESUME_DISABLED_IN_DSH: wait for a new human turn.');
      if(action==='operation_history')return {content:[{type:'text' as const,text:JSON.stringify(history.list(context.session,args.limit as number,args.beforeSequence as number|undefined))}]};
      const entry=history.begin(context,action);
      try{
        const result=await options.backend.call(action,args,turnId,signal);
        const operation=history.finish(entry,result);
        const image=result.screenshot as {base64?:string;mimeType?:string}|undefined;
        const safe=structuredClone(result);if(safe.screenshot)delete (safe.screenshot as Record<string,unknown>).base64;
        const content:({type:'text';text:string}|{type:'image';data:string;mimeType:string})[]=[{type:'text',text:JSON.stringify({...safe,operation})}];
        if(image?.base64)content.push({type:'image',data:image.base64,mimeType:image.mimeType??'image/png'});
        return {content};
      }catch(error){
        const operation=history.finish(entry,undefined,error);
        return {isError:true,content:[{type:'text' as const,text:error instanceof Error?error.message:String(error)},
          {type:'text' as const,text:JSON.stringify({operation})}]};
      }
    }catch(error){return {isError:true,content:[{type:'text' as const,text:error instanceof Error?error.message:String(error)}]};}
  };
}
