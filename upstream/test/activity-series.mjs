import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {installActivity,ACTIVITY_IDLE_MS} from '../mcp/activity.mjs';
import {TakeoverControl} from '../mcp/takeover.mjs';
import {DEFAULT_SETTINGS} from '../mcp/settings.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'wcu-activity-series-'));
const activityFile=path.join(root,'activity.json'),configFile=path.join(root,'settings.json');
const handlers={},disposers=[];
const ctx={on:(name,fn)=>{handlers[name]=fn;},effect:fn=>disposers.push(fn()),logger:{error:error=>{throw error;}}};
installActivity(ctx,activityFile);
const session={id:'a'},agent={session,phase:{kind:'running',turn:4}};
const call=who=>handlers['tools/execute']({name:'mcp__wincu__windows_computer_use_screenshot',agent:who,signal:new AbortController().signal},async()=>true);
await call(agent);
assert.equal(JSON.parse(await readFile(activityFile,'utf8')).active,true);
await assert.rejects(call({session:{id:'b'},phase:{kind:'running',turn:4}}),/COMPUTER_USE_BUSY/);
handlers['session/event'](session,{type:'turn/end',data:{turn:3}});
assert.equal(JSON.parse(await readFile(activityFile,'utf8')).active,true,'An older turn must not release the current owner');
await writeFile(configFile,JSON.stringify({...DEFAULT_SETTINGS,indicatorIdleMs:200}));
const control=new TakeoverControl({activityFile,configFile,stateFile:path.join(root,'state.json'),testMode:true});
control.disabledForTest=false;
try{
 await control.command('test_pointer_source',{x:200,y:200});
 await control.begin();await control.end();
 await new Promise(r=>setTimeout(r,900));
 assert.equal((await control.command('status')).armed,true,'Indicator must remain armed through a reasoning gap longer than the per-action hide delay');
 assert.equal(control.active,0);assert.equal(control.seriesHeld,true);
 const stopped=await control.command('test_key',{vk:0x1b,down:true});assert.equal(stopped.paused,true);
 await control.sync();assert.equal(control.paused,true,'An active host lease cannot silently resume after Esc');
 await assert.rejects(control.begin(),/COMPUTER_USE_STOPPED_BY_USER/);
 const replacement=new TakeoverControl({activityFile,configFile,stateFile:path.join(root,'state.json')});
 await assert.rejects(replacement.begin(),/COMPUTER_USE_STOPPED_BY_USER/);await replacement.close();
 await control.command('test_key',{vk:0x1b,down:false});
 handlers['session/event'](session,{type:'turn/end',data:{turn:4}});
 await control.sync();assert.equal(control.seriesHeld,false);assert.equal(control.paused,true);
 const other={session:{id:'b'},phase:{kind:'running',turn:1}};
 await call(other);await control.sync();assert.equal(control.paused,false);
 handlers['session/event'](other.session,{type:'turn/end',data:{turn:1}});await control.sync();
 await call(agent);await assert.rejects(control.begin(),/COMPUTER_USE_STOPPED_BY_USER/);
 handlers['session/event'](session,{type:'turn/end',data:{turn:4}});await control.sync();
 await call({...agent,phase:{kind:'running',turn:5}});await control.sync();
 assert.equal(control.paused,false,'The next user turn must automatically resume without settings');
 assert.equal((await control.command('status')).armed,true);
 // Model a host that stopped heartbeating before its final lease expires.
 // A live owner would correctly renew the lease while this assertion runs.
 for(const dispose of disposers.splice(0))dispose?.();
 await writeFile(activityFile,JSON.stringify({active:true,expiresAt:Date.now()-1}));await control.sync();
 const deadline=Date.now()+3000;
 let status;
 do{await new Promise(r=>setTimeout(r,50));status=await control.command('status');}while(status.armed&&Date.now()<deadline);
 assert.equal(status.armed,false,'A stale host lease must not leave a stuck indicator');
 console.log(JSON.stringify({passed:true,reasoningGapKeptVisible:true,physicalEscDuringGap:true,sameTurnCannotResume:true,nextUserTurnAutoResumes:true,stoppedScopeSurvivesWorkerReload:true,otherConversationDoesNotUnblockStoppedTurn:true,turnOwnership:true,concurrentSessionsRejected:true,expiredLeaseReleases:true,physicalInputSent:false,root}));
}finally{await control.close();for(const dispose of disposers)dispose?.();}

// A long tool stays visible; an idle completed call releases ownership even
// when its conversation continues doing unrelated work without turn/end.
assert.equal(ACTIVITY_IDLE_MS,30000);
const idleHandlers={},idleDisposers=[],idleFile=path.join(root,'idle-activity.json');
installActivity({on:(name,fn)=>{idleHandlers[name]=fn;},effect:fn=>idleDisposers.push(fn()),logger:{error:error=>{throw error;}}},idleFile,{idleMs:100});
try{
 let finish;
 const pending=idleHandlers['tools/execute']({name:'windows_computer_use_wait',agent,signal:new AbortController().signal},()=>new Promise(resolve=>{finish=resolve;}));
 await new Promise(r=>setTimeout(r,1200));
 assert.equal(JSON.parse(await readFile(idleFile,'utf8')).active,true,'An executing tool must not time out as idle');
 finish(true);await pending;
 assert.equal(JSON.parse(await readFile(idleFile,'utf8')).active,true,'Completion must start a fresh idle interval');
 const deadline=Date.now()+2500;
 while(JSON.parse(readFileSync(idleFile,'utf8')).active&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
 assert.equal(JSON.parse(readFileSync(idleFile,'utf8')).active,false,'No further desktop calls must release the indicator and ownership');
 await idleHandlers['tools/execute']({name:'windows_computer_use_screenshot',agent:{session:{id:'after-idle'},phase:{kind:'running',turn:1}}},async()=>true);
 assert.equal(JSON.parse(await readFile(idleFile,'utf8')).sessionId,'after-idle','A new desktop series may start after idle release');
 console.log(JSON.stringify({idleTimeout:true,defaultIdleMs:ACTIVITY_IDLE_MS,longActionStaysActive:true,nextSeriesReacquires:true}));
}finally{for(const dispose of idleDisposers)dispose?.();}
