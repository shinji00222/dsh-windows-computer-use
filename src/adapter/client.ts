// DSH client integration; React is provided by the host. Configuration itself
// uses the host's generated schema form, preserving its validation/save flow.
export {};
declare global {interface Window {__ModuleLoader__:{load(definition:unknown):void}}}
window.__ModuleLoader__.load({id:'dsh-windows-computer-use',factory:(require:(name:string)=>any)=>{
  const React=require('react');
  function NativeInfo(){return React.createElement('section',{style:{padding:'16px',lineHeight:1.8}},
    React.createElement('h3',null,'DSH Windows 电脑控制 · 预览版'),
    React.createElement('p',null,'纯文本 DS 可读取控件编号，批量填写最多 8 步并回读结果，无需图片模型。'),
    React.createElement('p',null,'文字批次中的点击和按键会停组，提交后重新读取结果。看图批量操作仍需图片模型；失败后不整组重放。'),
    React.createElement('p',null,'Esc 停止当前轮操作。新的人类请求可以继续；模型不能在同一轮解除停止。'),
    React.createElement('p',null,'操作提示与只读模式可在插件配置中修改。设置变更会重载连接。'));}
  return {name:'dsh-windows-computer-use',inject:['slots'],apply(ctx:any){
    ctx.slots.inject('plugins.item',()=>ctx.slots.register({name:'plugins.item',id:'dsh-windows-computer-use',order:31,label:()=> 'Windows 电脑控制'},NativeInfo));
  }};
}});
