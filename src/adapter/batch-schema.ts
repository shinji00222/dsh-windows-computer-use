import type {Tool} from '@modelcontextprotocol/sdk/types.js';
const coordinate = {type:'integer',minimum:0};
const checkpoint = {type:'boolean',description:'Stop after this action and inspect the final screenshot. Required for submit/navigation/open-menu actions whose result changes the next step.'};
const step = (action:string,properties:Record<string,unknown>,required:string[]) => ({
  type:'object',additionalProperties:false,
  properties:{action:{const:action},checkpoint,...properties},required:['action',...required],
});
const point={x:coordinate,y:coordinate};
const button={type:'string',enum:['left','right','middle']};
export const batchTool:Tool={
  name:'windows_computer_use_run_batch',
  description:'Visual fast path: inspect windows_computer_use_screenshot first, then execute 1-8 known actions on that same window in ONE call. Use screenshot pixel coordinates (not desktop coordinates). Target must already be foreground. Returns ONE final screenshot, new screenshotId, completed count and partial failures. Do not replay completed steps. Use checkpoint:true for clicks that navigate, submit, open menus/dialogs, or require judging a result; scroll and Enter always checkpoint. Window/focus/title/UIA-layout changes stop the batch. UIA cannot detect every canvas/SPA change: do not batch uncertain actions. DSH requires an image-capable model.',
  inputSchema:{
    type:'object',additionalProperties:false,required:['nativeWindowHandle','screenshotId','actions'],
    properties:{
      nativeWindowHandle:{type:'integer',minimum:1},
      screenshotId:{type:'string',minLength:1,description:'Single-use ID from the latest window screenshot or previous batch final image. Expires in 60 seconds.'},
      actions:{type:'array',minItems:1,maxItems:8,items:{oneOf:[
        step('click',{...point,button},['x','y']),
        step('double_click',{...point,button},['x','y']),
        step('move',point,['x','y']),
        step('scroll',{...point,deltaY:{type:'integer',minimum:-3000,maximum:3000},deltaX:{type:'integer',minimum:-3000,maximum:3000}},['x','y']),
        step('type_text',{text:{type:'string',maxLength:5000}},['text']),
        step('keypress',{keys:{type:'array',minItems:1,maxItems:4,items:{type:'string',minLength:1}}},['keys']),
        step('wait',{milliseconds:{type:'integer',minimum:0,maximum:1000}},['milliseconds']),
      ]}},
    },
  },
};
