// DSH client integration; React is provided by the host. Configuration itself
// uses the host's generated schema form, preserving its validation/save flow.
export {};
declare global {interface Window {__ModuleLoader__:{load(definition:unknown):void}}}
window.__ModuleLoader__.load({id:'dsh-windows-computer-use',factory:(require:(name:string)=>any)=>{
  const React=require('react');
  function NativeInfo(){return React.createElement('section',{style:{padding:'16px',lineHeight:1.8}},
    React.createElement('h3',null,'DSH Windows 电脑控制 · 预览版'),
    React.createElement('p',null,'看一张截图，连续执行一小组动作，再看结果。C# 引擎执行鼠标键盘操作，每组最多 8 步。'),
    React.createElement('p',null,'看图批量操作需要支持图片的模型。跳转、提交或结果不确定时设置检查点；失败后只继续未完成步骤。'),
    React.createElement('p',null,'Esc 停止当前轮操作。新的人类请求可以继续；模型不能在同一轮解除停止。'),
    React.createElement('p',null,'操作提示与只读模式可在插件配置中修改。设置变更会重载连接。'));}
  return {name:'dsh-windows-computer-use',inject:['slots'],apply(ctx:any){
    ctx.slots.inject('plugins.item',()=>ctx.slots.register({name:'plugins.item',id:'dsh-windows-computer-use',order:31,label:()=> 'Windows 电脑控制'},NativeInfo));
  }};
}});
