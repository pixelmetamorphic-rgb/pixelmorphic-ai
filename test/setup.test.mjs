import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv } from 'node:util';
import { validKey, validModel, updateEnvironment, fetchModelIds } from '../setup.mjs';

test('setup rejects newlines and unsafe configuration values',()=>{
  assert.equal(validKey('sk-example-key'),true);
  for(const key of ['short','sk-test\nPORT=8000','sk-test"value','sk-test#value'])assert.equal(validKey(key),false);
  assert.equal(validModel('anthropic/claude-model:variant'),true);
  assert.equal(validModel('model\nNEW=value'),false);
  assert.throws(()=>updateEnvironment('',{AI_API_KEY:'bad\nvalue'}));
});
test('environment updates preserve other settings and parse without disclosure',()=>{
  const original='# existing settings\nPORT=3001\nAI_API_KEY=old-value\nAI_MAX_OUTPUT_TOKENS=2048\n';
  const next=updateEnvironment(original,{AI_API_KEY:'sk-test-example',AI_MODEL:'model-1',AI_ENABLE_GENERATION:'false'});
  const parsed=parseEnv(next);
  assert.equal(parsed.PORT,'3001');assert.equal(parsed.AI_MAX_OUTPUT_TOKENS,'2048');
  assert.equal(parsed.AI_API_KEY,'sk-test-example');assert.equal(parsed.AI_MODEL,'model-1');
  assert.equal(parsed.AI_ENABLE_GENERATION,'false');
  assert.equal((next.match(/^AI_API_KEY=/gm)||[]).length,1);
});
test('model lookup only calls pinned metadata endpoint and filters unsafe IDs',async()=>{
  let calls=0;
  const r=await fetchModelIds('sk-test-example',async(url,opts)=>{
    calls++;assert.equal(url,'https://api.samuraiapi.io/v1/models');
    assert.equal(opts.headers.Authorization,'Bearer sk-test-example');assert.equal(opts.redirect,'error');
    assert.equal(opts.method,undefined);
    return Response.json({data:[{id:'model-a'},{id:'model-a'},{id:'bad\nvalue'},{id:'provider/model-b'}]});
  });
  assert.equal(calls,1);assert.deepEqual(r.models,['model-a','provider/model-b']);
});
test('provider auth failure does not expose raw errors',async()=>{
  const r=await fetchModelIds('sk-test-example',async()=>Response.json({error:'sk-test-example'},{status:401}));
  assert.deepEqual(r,{ok:false,status:401,models:[]});
});
