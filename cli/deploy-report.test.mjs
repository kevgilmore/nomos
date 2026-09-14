import test from 'node:test';import assert from 'node:assert/strict';import {deploymentMessage,deploymentReporter} from './deploy-report.mjs';
test('brief success',async()=>assert.equal(await deploymentMessage(null,'','.'),'🤖 Deployed to production successfully.'));
test('failure uses model summary',async()=>assert.equal(await deploymentMessage(Error('failed'),'log','.',async()=> 'Hosting upload failed. Restore connectivity and retry.'),'🤖 Hosting upload failed. Restore connectivity and retry.'));
test('summary outage has honest fallback',async()=>assert.match(await deploymentMessage(Error('failed'),'','.',async()=>{throw Error();}),/Some changes may be live/));
test('only snapshotted Deploy tasks in Nomos receive comments', async () => {
  const writes = [];
  const fetcher = async (url, opts) => {
    if (opts.method === 'POST') {
      writes.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({ id: 'comment' }) };
    }
    return {
      ok: true, status: 200,
      json: async () => url.includes('/projects')
        ? { results: [{ id: 'p', name: 'Nomos' }] }
        : { results: [{ id: 'approved', labels: ['Deploy'] }, { id: 'review', labels: ['In review'] }] },
    };
  };
  const report = await deploymentReporter({ fetcher, token: 'test' });
  await report.finish('Deployed');
  assert.deepEqual(writes, [{ task_id: 'approved', content: 'Deployed' }]);
});
test('no credentials skips reporting without a network call', async () => {
  const report = await deploymentReporter({ token: '', fetcher: async () => { throw Error('Unexpected network call'); } });
  assert.equal(report.enabled, false);
  await report.finish('Deployed');
});
test('notification errors still allow remaining tickets to be notified', async () => {
  const writes = [];
  const fetcher = async (url, opts) => {
    if (opts.method === 'POST') {
      const body = JSON.parse(opts.body); writes.push(body.task_id);
      return { ok: body.task_id !== 'first', status: body.task_id === 'first' ? 503 : 200, json: async () => ({ id: 'comment' }) };
    }
    return { ok: true, status: 200, json: async () => url.includes('/projects')
      ? { results: [{ id: 'p', name: 'Nomos' }] }
      : { results: [{ id: 'first', labels: ['Deploy'] }, { id: 'second', labels: ['Deploy'] }] } };
  };
  const report = await deploymentReporter({ fetcher, token: 'test' });
  await assert.rejects(report.finish('Deployed'), /503/);
  assert.deepEqual(writes, ['first', 'second']);
});
