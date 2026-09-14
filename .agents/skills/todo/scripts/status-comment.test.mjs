import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('./listener.mjs',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('async function reportStatus('),source.indexOf('async function acknowledgeFix('));
test('pickup, success and failure reuse one comment; attachment travels with success',async()=>{
 let state={};let created=0;const updates=[];
 const report=new Function('readState','api','addComment','writeState',fn+'return reportStatus;')(async()=>state,async(p,opts)=>{updates.push({p,body:opts.body ? JSON.parse(opts.body) : null});},async()=>({id:`comment-${++created}`}),async s=>{state=s;});
 await report('task','Picked up');await report('task','Success',{file_name:'proof.png',file_url:'https://example.test/proof.png',file_type:'image/png'});await report('task','Failed');
 assert.equal(created,1);assert.equal(updates.length,2);assert.equal(updates[0].p,'/comments/comment-1');assert.equal(updates[0].body.attachment.file_name,'proof.png');
});
test('deleted comment is recreated',async()=>{let state={statusComments:{task:'deleted'}};let created=0;const report=new Function('readState','api','addComment','writeState',fn+'return reportStatus;')(async()=>state,async()=>{throw Error('Todoist API 404');},async()=>{created++;return{id:'new'};},async s=>{state=s;});await report('task','Picked up');assert.equal(created,1);assert.equal(state.statusComments.task,'new');});
