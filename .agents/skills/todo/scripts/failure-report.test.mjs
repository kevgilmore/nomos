import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFailure,redact,summarizeFailure} from './failure-report.mjs';
test('recognises the actual quota failure',()=>assert.equal(classifyFailure("ERROR: You've hit your usage limit."),'quota'));
test('uses a concise model summary',async()=>assert.equal(await summarizeFailure({output:'tsc failed',repoRoot:'.',run:async()=> 'A type mismatch prevented validation. Fix the reported type and retry.'}),'A type mismatch prevented validation. Fix the reported type and retry.'));
test('quota exhaustion still produces actionable feedback when the model fails',async()=>assert.match(await summarizeFailure({output:"You've hit your usage limit",repoRoot:'.',run:async()=>{throw Error();}}),/one-hour pause/));
test('redacts credentials before passing diagnostics to the summariser',async()=>{await summarizeFailure({output:'API_KEY=private-value Bearer secret-value sk-secret123',repoRoot:'.',run:async prompt=>{assert.ok(!prompt.includes('private-value'));assert.ok(!prompt.includes('secret-value'));assert.ok(!prompt.includes('sk-secret123'));return 'Could not authenticate. Restore the login and retry.';}});});
test('rejects oversized model output',async()=>assert.match(await summarizeFailure({output:'failure',repoRoot:'.',run:async()=> 'x'.repeat(1000)}),/automatic explanation was unavailable/));
