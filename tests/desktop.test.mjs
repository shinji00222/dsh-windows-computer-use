import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {Backend} from '../dist/backend.js';

const executable=path.resolve('native/DesktopEngine.exe');
test('C# engine: real owned Windows fixture', {timeout:120000},async t=>{
  const fixture=spawn(executable,['--fixture'],{stdio:'pipe',windowsHide:true});
  t.after(()=>{if(fixture.exitCode===null)fixture.kill();});
  let startupError='';fixture.stderr.on('data',chunk=>{startupError+=chunk.toString();});
  const lines=createInterface({input:fixture.stdout});
  const startup=await Promise.race([once(lines,'line').then(([line])=>JSON.parse(line)),new Promise((_,reject)=>setTimeout(()=>reject(Error('fixture startup timeout: '+startupError)),15000).unref())]);
  const backend=new Backend({indicator:true});
  const second=new Backend({indicator:false});
  let target={nativeWindowHandle:startup.hwnd},tree;
  const call=(action,args={},turn='fixture')=>backend.call(action,{...target,...args},turn);
  const refresh=async()=>{tree=await call('accessibility_tree',{maxDepth:6,maxNodes:200});return tree;};
  const node=id=>{const found=tree.nodes.find(n=>n.automationId===id);assert.ok(found,`missing ${id}`);return found;};
  try{
    await t.test('native readiness and native window discovery',async()=>{
      const health=await backend.call('health');assert.equal(health.engine,'C#');assert.equal(health.stopListener,true);
      const windows=await backend.call('list_windows',{maxWindows:200});assert.ok(windows.windows.some(w=>w.nativeWindowHandle===startup.hwnd),JSON.stringify({startup,fixtureExit:fixture.exitCode}));
    });
    await t.test('reject input without observation and contradictory target selectors',async()=>{
      await assert.rejects(()=>second.call('type_text',{...target,text:'must not type',method:'sendinput'}),/OBSERVATION_REQUIRED/);
      await assert.rejects(()=>call('screenshot',{processId:startup.processId+1}),/WINDOW_NOT_FOUND/);
    });
    await t.test('UIA control discovery and password redaction',async()=>{
      await refresh();assert.equal(tree.truncated,false);node('testInput');node('testButton');
      assert.equal(JSON.stringify(tree).includes('fixture-secret-value'),false);
      assert.equal(node('testPassword').value,null);
    });
    await t.test('activate, focus, Unicode input and readback',async()=>{
      await call('activate_window');await call('focus',{elementId:node('testInput').id});
      const value='你好，DSH Native！中文输入 123';
      const sent=await call('type_text',{text:value,method:'sendinput'});assert.equal(sent.verification,'sent');
      await refresh();assert.equal(node('testInput').value,value);
    });
    await t.test('keyboard chord and clipboard input with restoration path',async()=>{
      await call('focus',{elementId:node('testInput').id});await call('keypress',{keys:['ctrl','a']});
      await call('type_text',{text:'剪贴板输入 clipboard',method:'clipboard',restoreClipboard:true});
      await refresh();assert.equal(node('testInput').value,'剪贴板输入 clipboard');
      await call('invoke',{elementId:node('clipboardCheck').id});
      const restored=await call('wait_for',{condition:'element',query:'CLIPBOARD_RESTORED',timeoutMs:1500});assert.equal(restored.verification,'observed');
    });
    await t.test('UIA set_value verified by readback',async()=>{
      const result=await call('set_value',{elementId:node('testInput').id,value:'验证 VERIFIED'});assert.equal(result.verification,'observed');
      await refresh();assert.equal(node('testInput').value,'验证 VERIFIED');
    });
    await t.test('physical click on owned button and observe actual effect',async()=>{
      await call('click',{elementId:node('testButton').id,dispatch:'foreground'});
      const observed=await call('wait_for',{condition:'element',query:'已确认 VERIFIED',timeoutMs:2000});assert.equal(observed.verification,'observed');
    });
    await t.test('pointer move, double-click, drag and wheel reach the owned control',async()=>{
      await refresh();const edit=node('testInput'),box=edit.boundingBox;
      await call('move',{elementId:edit.id});const health=await backend.call('health');assert.equal(health.cursor.x,box.centerX);
      await call('double_click',{elementId:edit.id});
      let observed=await call('wait_for',{condition:'element',query:'DOUBLE_CLICKED',timeoutMs:1500});assert.equal(observed.verification,'observed');
      await call('drag',{path:[{x:box.x+30,y:box.y+25},{x:box.x+150,y:box.y+60}]});
      observed=await call('wait_for',{condition:'element',query:'DRAGGED',timeoutMs:1500});assert.equal(observed.verification,'observed');
      await call('scroll',{elementId:edit.id,deltaY:120});
      observed=await call('wait_for',{condition:'element',query:'SCROLLED',timeoutMs:1500});assert.equal(observed.verification,'observed');
    });
    await t.test('memory-only screenshot has coordinate transform',async()=>{
      const result=await call('screenshot',{maxWidth:480});assert.ok(result.screenshot.base64.length>100);
      assert.equal(result.screenshot.width,480);assert.ok(result.screenshot.imageScale<1);assert.equal(result.screenshot.path,undefined);
      await mkdir('artifacts',{recursive:true});await writeFile('artifacts/fixture.png',Buffer.from(result.screenshot.base64,'base64'));
    });
    await t.test('Windows OCR reads the owned fixture',async()=>{
      const result=await call('ocr',{query:'12345',maxWidth:1600});
      assert.match(result.ocr.text.replace(/\s/g,''),/12345/);assert.ok(result.ocr.matched.length>0);
    });
    await t.test('wait timeout never claims success; incomplete UIA absence is inconclusive',async()=>{
      const result=await call('wait_for',{condition:'element',query:'definitely-not-present',appear:false,maxDepth:0,timeoutMs:150});
      assert.equal(result.verification,'unconfirmed');assert.equal(result.conclusive,false);
    });
    await t.test('reject stale observation, out-of-window point and moved-window coordinates',async()=>{
      await refresh();await assert.rejects(()=>call('click',{x:0,y:0}),/POINT_OUTSIDE_TARGET/);
      await assert.rejects(()=>call('click',{elementId:node('testButton').id,observationId:'stale'}),/STALE_OBSERVATION/);
      const bounds=node('testButton').boundingBox;
      await call('move_window',{x:300,y:220});
      await assert.rejects(()=>call('click',{x:bounds.centerX,y:bounds.centerY}),/OBSERVATION_REQUIRED/);
      await refresh();await call('activate_window');
    });
    await t.test('process-wide desktop mutex excludes a second engine',async()=>{
      const waiting=backend.call('wait',{milliseconds:600},'mutex');
      await new Promise(r=>setTimeout(r,150));
      await assert.rejects(()=>second.call('wait',{milliseconds:1},'other'),/DESKTOP_BUSY/);await waiting;
    });
    await t.test('foreground and element IDs stay bound to the observed window',async()=>{
      const other=spawn(executable,['--fixture'],{stdio:'pipe',windowsHide:true});
      const otherLines=createInterface({input:other.stdout});
      const [line]=await once(otherLines,'line');const otherWindow=JSON.parse(line);
      try{
        const otherTarget={nativeWindowHandle:otherWindow.hwnd};
        const observed=await backend.call('accessibility_tree',otherTarget,'binding');
        const foreign=observed.nodes.find(n=>n.automationId==='testInput');assert.ok(foreign);
        await backend.call('activate_window',otherTarget,'binding');
        await assert.rejects(()=>call('type_text',{text:'must not send',method:'sendinput'},'binding'),/FOCUS_CHANGED/);
        await assert.rejects(()=>call('set_value',{elementId:foreign.id,value:'must not write'},'binding'),/STALE_ELEMENT/);
        // The activation nudge is asynchronous across input queues. A busy UI
        // must be allowed to process it before we report denial or send input.
        const stalled=once(lines,'line');fixture.stdin.write('stall\n');
        assert.equal(JSON.parse((await stalled)[0]).stalled,true);
        await call('activate_window',{},'binding');
        await backend.call('close_window',otherTarget,'binding');
        await backend.call('wait_for',{...otherTarget,condition:'window',appear:false,timeoutMs:3000},'binding');
        await refresh();await call('activate_window');
      }finally{otherLines.close();if(other.exitCode===null)other.kill();}
    });
    await t.test('cancellation stops queued/current work and persists for the turn',async()=>{
      const controller=new AbortController();const wait=backend.call('wait',{milliseconds:5000},'cancelled',controller.signal);
      setTimeout(()=>controller.abort(),100);
      await assert.rejects(()=>wait,/STOPPED_BY_USER|CANCELLED/);
      await assert.rejects(()=>backend.call('wait',{milliseconds:1},'cancelled'),/STOPPED_BY_USER/);
      await backend.call('wait',{milliseconds:1},'new-human-turn');
    });
    await t.test('one screenshot runs multiple actions in screenshot coordinates and returns a final image',async()=>{
      await refresh();await call('move_window',{x:20,y:20});await refresh();await call('activate_window');
      const box=node('testInput').boundingBox;
      const shot=await call('screenshot',{maxWidth:340});
      const x=Math.floor((box.centerX-shot.screenshot.bounds.x)*shot.screenshot.width/shot.screenshot.bounds.width);
      const y=Math.floor((box.centerY-shot.screenshot.bounds.y)*shot.screenshot.height/shot.screenshot.bounds.height);
      const result=await call('run_batch',{screenshotId:shot.screenshotId,actions:[
        {action:'click',x,y},{action:'keypress',keys:['ctrl','a']},{action:'type_text',text:'一次截图多步执行 BATCH 123'}
      ]},'batch');
      assert.equal(result.status,'completed',JSON.stringify({...result,screenshot:undefined}));assert.equal(result.completed,3);assert.equal(result.remaining,0);
      assert.ok(result.screenshot.base64.length>100);assert.notEqual(result.screenshotId,shot.screenshotId);
      await assert.rejects(()=>call('run_batch',{screenshotId:shot.screenshotId,actions:[{action:'type_text',text:'must not repeat'}]},'batch'),/STALE_SCREENSHOT/);
      await refresh();assert.equal(node('testInput').value,'一次截图多步执行 BATCH 123');
    });
    await t.test('batch validates all steps before input and checkpoints leave later steps untouched',async()=>{
      const shot=await call('screenshot');
      await assert.rejects(()=>call('run_batch',{screenshotId:shot.screenshotId,actions:[
        {action:'type_text',text:'MUST_NOT_TYPE'},{action:'click',x:999999,y:1}
      ]},'validate'),/POINT_OUTSIDE_SCREENSHOT/);
      const result=await call('run_batch',{screenshotId:shot.screenshotId,actions:[
        {action:'wait',milliseconds:1,checkpoint:true},{action:'type_text',text:'MUST_NOT_TYPE'}
      ]},'validate');
      assert.equal(result.status,'checkpoint');assert.equal(result.completed,1,JSON.stringify({...result,screenshot:undefined}));assert.equal(result.remaining,1);
      await refresh();assert.equal(node('testInput').value,'一次截图多步执行 BATCH 123');
    });
    await t.test('batch stops on page-title changes and popup focus before remaining input',async()=>{
      for(const id of ['batchPopup','batchLayout','batchChange']){
        await refresh();await call('activate_window');const box=node(id).boundingBox;
        const shot=await call('screenshot');
        const result=await call('run_batch',{screenshotId:shot.screenshotId,actions:[
          {action:'click',x:Math.floor((box.centerX-shot.screenshot.bounds.x)*shot.screenshot.width/shot.screenshot.bounds.width),y:Math.floor((box.centerY-shot.screenshot.bounds.y)*shot.screenshot.height/shot.screenshot.bounds.height)},
          {action:'type_text',text:'MUST_NOT_TYPE'}
        ]},'changed');
        assert.equal(result.status,'stopped',JSON.stringify({...result,screenshot:undefined}));assert.equal(result.completed,1,JSON.stringify({...result,screenshot:undefined}));assert.equal(result.remaining,1);
        assert.match(result.reason,/FOCUS_CHANGED|VIEW_CHANGED/);
        if(id==='batchPopup'){
          const windows=await backend.call('list_windows',{});
          const popup=windows.windows.find(w=>w.name==='DSH Batch Owned Popup'&&w.processId===startup.processId);assert.ok(popup);
          await backend.call('close_window',{nativeWindowHandle:popup.nativeWindowHandle});
          await backend.call('wait_for',{nativeWindowHandle:popup.nativeWindowHandle,condition:'window',appear:false,timeoutMs:2000});
        }
      }
      await refresh();assert.equal(node('testInput').value,'一次截图多步执行 BATCH 123');
    });
    await t.test('moved screenshots and cancellation never dispatch remaining batch input',async()=>{
      await refresh();await call('activate_window');const shot=await call('screenshot');
      await call('move_window',{x:350,y:240});
      await assert.rejects(()=>call('run_batch',{screenshotId:shot.screenshotId,actions:[{action:'type_text',text:'MUST_NOT_TYPE'}]},'moved'),/OBSERVATION_REQUIRED|WINDOW_MOVED/);
      await call('screenshot');await call('activate_window');const current=await call('screenshot');
      const controller=new AbortController();
      const pending=backend.call('run_batch',{...target,screenshotId:current.screenshotId,actions:[{action:'wait',milliseconds:1000},{action:'type_text',text:'MUST_NOT_TYPE'}]},'batch-cancel',controller.signal);
      setTimeout(()=>controller.abort(),150);
      await assert.rejects(()=>pending,/CANCELLED|STOPPED_BY_USER/);
      await assert.rejects(()=>backend.call('wait',{milliseconds:1},'batch-cancel'),/STOPPED_BY_USER/);
      await refresh();assert.equal(node('testInput').value,'一次截图多步执行 BATCH 123');
    });
    await t.test('Escape inside a batch stops remaining steps and preserves final evidence',async()=>{
      await refresh();await call('activate_window');const shot=await call('screenshot');
      const result=await call('run_batch',{screenshotId:shot.screenshotId,actions:[
        {action:'keypress',keys:['escape']},{action:'type_text',text:'MUST_NOT_TYPE'}
      ]},'batch-escape');
      assert.equal(result.status,'stopped');assert.match(result.reason,/STOPPED_BY_USER/);assert.ok(result.remaining>=1);
      assert.ok(result.screenshot.base64.length>100);
      await backend.close(); // Esc state must also survive native worker restart.
      await assert.rejects(()=>backend.call('wait',{milliseconds:1},'batch-escape'),/STOPPED_BY_USER/);
      await refresh();assert.equal(node('testInput').value,'一次截图多步执行 BATCH 123');
    });
    await t.test('native Escape hook stops this turn; new human turn may continue',async()=>{
      await refresh();await call('activate_window');
      const before=await backend.call('health');
      // Test button emits Escape through Win32. This exercises the actual global hook.
      try{await call('invoke',{elementId:node('testStop').id},'escape');}catch(error){assert.match(error.message,/STOPPED_BY_USER/);}
      const deadline=Date.now()+2500;
      let health;
      do{health=await backend.call('health');if(health.escapeEvents>before.escapeEvents)break;await new Promise(r=>setTimeout(r,20));}while(Date.now()<deadline);
      assert.ok(health.escapeEvents>before.escapeEvents,JSON.stringify({message:'No native Escape event observed',before,health}));
      await assert.rejects(()=>backend.call('wait',{milliseconds:1},'escape'),/STOPPED_BY_USER/);
      await backend.call('wait',{milliseconds:1},'after-escape');
    });
    await t.test('text batch reads back values, prevalidates refs, consumes observations and checkpoints',async()=>{
      await refresh();await call('move_window',{x:20,y:20});await refresh();await call('activate_window');
      let observed=await call('observe_text');
      assert.equal(observed.batchAvailable,true);assert.ok(!JSON.stringify(observed).includes('base64'));
      const edit=observed.nodes.find(n=>n.canFill);assert.ok(edit);
      await assert.rejects(()=>call('run_text_batch',{observationId:observed.observationId,actions:[
        {action:'fill',reference:edit.reference,text:'MUST_NOT_TYPE'},{action:'focus',reference:'missing'}]}),/UNKNOWN_REFERENCE/);
      const result=await call('run_text_batch',{observationId:observed.observationId,actions:[
        {action:'fill',reference:edit.reference,text:'文本批量 123'},{action:'focus',reference:edit.reference} ]});
      assert.equal(result.status,'completed',JSON.stringify(result));assert.equal(result.completed,2);
      assert.equal(result.steps[0].verification,'observed');assert.equal(result.steps[0].value,'文本批量 123');
      await assert.rejects(()=>call('run_text_batch',{observationId:observed.observationId,actions:[{action:'wait',milliseconds:0}]}),/STALE_OBSERVATION/);
      observed=result.observation;
      const checkpoint=await call('run_text_batch',{observationId:observed.observationId,actions:[{action:'keypress',keys:['tab']},{action:'wait',milliseconds:0}]});
      assert.equal(checkpoint.status,'checkpoint',JSON.stringify(checkpoint));assert.equal(checkpoint.completed,1);
      observed=await call('observe_text');const password=observed.nodes.find(n=>n.password);assert.ok(password);
      await assert.rejects(()=>call('run_text_batch',{observationId:observed.observationId,actions:[{action:'fill',reference:password.reference,text:'secret'}]}),/CONTROL_UNAVAILABLE/);
      await call('move_window',{x:30,y:30});
      await assert.rejects(()=>call('run_text_batch',{observationId:observed.observationId,actions:[{action:'wait',milliseconds:0}]}),/WINDOW_MOVED/);
    });
    await t.test('text observations invalidate older refs and changed controls before dispatch',async()=>{
      await refresh();await call('activate_window');
      const old=await call('observe_text');const current=await call('observe_text');
      await assert.rejects(()=>call('run_text_batch',{observationId:old.observationId,actions:[{action:'wait',milliseconds:0}]}),/STALE_OBSERVATION/);
      await refresh();await call('set_value',{elementId:node('testInput').id,value:'unchanged baseline'});
      const edit=current.nodes.find(n=>n.canFill);assert.ok(edit);
      await assert.rejects(()=>call('run_text_batch',{observationId:current.observationId,actions:[{action:'fill',reference:edit.reference,text:'bad\nvalue'}]}),/INVALID_FILL_TEXT/);
      await call('move_window',{x:40,y:40});
      await assert.rejects(()=>call('run_text_batch',{observationId:current.observationId,actions:[{action:'fill',reference:edit.reference,text:'MUST_NOT_TYPE'}]}),/WINDOW_MOVED/);
      await refresh();assert.equal(node('testInput').value,'unchanged baseline');
    });
    await t.test('text batch Escape returns partial evidence and blocks the same turn',async()=>{
      await refresh();await call('activate_window');const shot=await call('observe_text');
      const result=await call('run_text_batch',{observationId:shot.observationId,actions:[{action:'keypress',keys:['escape']},{action:'wait',milliseconds:0}]},'text-escape');
      assert.equal(result.status,'stopped');assert.match(result.reason,/STOPPED_BY_USER/);
      assert.ok(result.remaining>=1);assert.equal(result.attempted,1);await backend.close();
      await assert.rejects(()=>backend.call('wait',{milliseconds:1},'text-escape'),/STOPPED_BY_USER/);
    });
    await t.test('graceful close targets only owned fixture',async()=>{
      await refresh();await call('close_window');
      const exit=await call('wait_for',{condition:'window',appear:false,timeoutMs:3000});assert.equal(exit.verification,'observed');
    });
  }finally{
    await backend.close();await second.close();lines.close();if(fixture.exitCode===null)fixture.kill();
  }
});
