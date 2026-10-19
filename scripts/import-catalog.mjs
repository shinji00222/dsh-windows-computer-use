// One-time migration of upstream tool contracts; not a build/runtime dependency.
// Copyright (c) 2026 Yu-tao-Li; Copyright (c) 2026 cgissing; MIT.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile('upstream/mcp/server.mjs','utf8');
const start = source.indexOf('const windowTargetProperties =');
const end = source.indexOf('// Keep execution/validation schemas');
const tools = vm.runInNewContext(source.slice(start,end) + ';tools');
for (const tool of tools) {
  const p=tool.inputSchema.properties;
  if (p.windowTitle) {
    p.observationId={type:'string',description:'Optional token from latest observation; stale tokens reject actions.'};
    p.windowTitle.minLength=1;
  }
  if(p.dispatch){p.dispatch.enum=p.dispatch.enum.filter(v=>v!=='background');tool.description=tool.description.replace(/background[^.]*\./gi,'');}
  if(p.dispatch?.enum.includes('auto')){p.dispatch.enum=['foreground'];p.dispatch.default='foreground';}
  if(p.method){p.method.enum=p.method.enum.filter(v=>v!=='background');p.method.default='sendinput';}
  if(p.fallbackClick)p.fallbackClick.default=false;
  if(p.fallbackType)p.fallbackType.default=false;
  if(p.fallbackClick)delete p.fallbackClick;
  if(p.fallbackType)delete p.fallbackType;
  if(p.path)p.path.maxItems=1000;
  if(p.text)p.text.maxLength=100000;
  if(tool.name.endsWith('_type_text')) tool.description='Type into foreground target. sendinput supports Unicode without clipboard; clipboard optionally pastes/restores. Requires prior observation. verifyValue is readback, not a task-success claim.';
  if(tool.name.endsWith('_invoke'))tool.description='Invoke/toggle/select/expand a known UIA element. No blind click fallback.';
  if(tool.name.endsWith('_click'))tool.description='Click/double-click element center or physical SCREEN x/y in the observed foreground window. Reject stale/moved/occluded targets. Read UI again to verify effect.';
  if(tool.name.endsWith('_set_value'))tool.description='Set a UIA ValuePattern and read it back; unsupported controls return an error. No typing fallback.';
  if(tool.name.endsWith('_screenshot'))tool.description='Capture window/desktop to an in-memory image. SCREEN = bounds origin + image/imageScale. Screen crops may be occluded; inspect source and occludedPossible.';
  if(p.captureWindow)delete p.captureWindow;
  if(p.resolveControl)delete p.resolveControl;
  if(tool.name.endsWith('_element_info'))p.elementId.description='ID returned by this engine observation.';
}
tools.push({name:'windows_computer_use_resume',description:'Standalone MCP only: resume after an explicit new human request. DSH turns resume automatically on a new turn; never resume a stopped DSH turn.',inputSchema:{type:'object',properties:{},additionalProperties:false}});
await mkdir('src/adapter',{recursive:true});
await writeFile('src/adapter/catalog.ts','// Derived from upstream tool contracts; see NOTICE.md. MIT.\nimport type {Tool} from "@modelcontextprotocol/sdk/types.js";\nexport const catalog: Tool[] = '+JSON.stringify(tools,null,2)+';\n');
const pkg=JSON.parse((await readFile('package.json','utf8')).replace(/^\uFEFF/,''));
await writeFile('package.json',JSON.stringify(pkg,null,2)+'\n');
