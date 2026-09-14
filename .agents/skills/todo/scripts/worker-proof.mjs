import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
export function parseWorkerProof(finalOutput) {
 const result=[...finalOutput.matchAll(/^\s*RESULT:\s*(PASS|BLOCKED|FAILED)\s*$/gmi)];
 const passed=result.length===1&&result[0][1].toUpperCase()==='PASS';
 const line=finalOutput.split(/\r?\n/).find(s=>/^\s*(?:[-*]\s*)?(?:\*\*)?screenshot(?:\s+path)?(?:\*\*)?\s*:/i.test(s));
 let file=line?.replace(/^\s*(?:[-*]\s*)?(?:\*\*)?screenshot(?:\s+path)?(?:\*\*)?\s*:\s*/i,'').trim()||'';
 const link=file.match(/^\[[^\]]*\]\((.+)\)\.?$/);if(link)file=link[1];
 file=file.replace(/^[`"'<]+|[`"'>]+\.?$/g,'');
 return {passed,screenshotPath:path.isAbsolute(file)&&/\.png$/i.test(file)?file:null};
}
export async function verifyScreenshot(file,startedAt=0){
 if(!file)throw Error('The final report did not include an absolute PNG screenshot path.');
 let info,bytes;try{info=await stat(file);bytes=await readFile(file);}catch{throw Error(`Screenshot file is unreadable: ${file}`);}
 if(!info.isFile()||bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Screenshot is not a readable PNG image.');
 if(info.mtimeMs<startedAt-1000)throw Error('Screenshot predates this validation attempt; capture fresh proof.');
 return file;
}
