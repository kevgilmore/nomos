import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./listener.mjs',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('async function prepareRetry('),source.indexOf('\nasync function runTask('));
test('archives before cleanup, posts concise replacement, retains context and resumes without duplicate summary',async()=>{
 let state={taskId:null};const events=[];let posts=0;
 const prepare=new Function('readState','paged','writeFile','path','stateDirectory','redact','runSummary','repoRoot','writeState','addComment','api',fn+';return prepareRetry;')(
 async()=>state,async()=>[{id:'old',content:'fix: preserve keyboard navigation'}],async()=>events.push('archive'),{join:(...s)=>s.join('/')},'.nomos',s=>s,async()=> 'Retrying the keyboard fix and rechecking the page.','.',async s=>{state=s;},async()=>{posts++;events.push('post');return{id:'new'};},async(p)=>{assert.equal(p,'/comments/old');events.push('delete');});
 assert.match(await prepare({id:'task',content:'A task',description:''}),/keyboard navigation/);
 assert.deepEqual(events,['archive','post','delete']);
 await prepare({id:'task',content:'A task'});assert.equal(posts,1);
});
