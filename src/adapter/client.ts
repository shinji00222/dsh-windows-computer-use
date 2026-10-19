// DSH client integration; React is provided by the host. Configuration itself
// uses the host's generated schema form, preserving its validation/save flow.
export {};
declare global {interface Window {__ModuleLoader__:{load(definition:unknown):void}}}
window.__ModuleLoader__.load({id:'dsh-windows-computer-use',factory:(require:(name:string)=>any)=>{
  const React=require('react');
  function NativeInfo(){return React.createElement('section',{style:{padding:'16px',lineHeight:1.8}},
    React.createElement('h3',null,'Desktop Native · 预览版'),
    React.createElement('p',null,'C# 桌面引擎。先观察目标窗口，再执行操作，最后读取界面确认结果。'),
    React.createElement('p',null,'Esc 停止当前轮操作。新的人类请求可以继续；模型不能在同一轮解除停止。'),
    React.createElement('p',null,'操作提示与只读模式可在插件配置中修改。设置变更会重载连接。'));}
  return {name:'dsh-windows-computer-use',inject:['slots'],apply(ctx:any){
    ctx.slots.inject('plugins.item',()=>ctx.slots.register({name:'plugins.item',id:'dsh-windows-computer-use',order:31,label:()=> 'Desktop Native'},NativeInfo));
  }};
}});
