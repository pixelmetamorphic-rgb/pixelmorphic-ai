import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import http from 'node:http';
import { configuration, createApp } from '../server.mjs';

const secret = 'test-key-never-expose';
const cfg = (extra={}) => configuration({ AI_API_KEY:secret, AI_MODEL:'provider-exact-model', AI_ENABLE_GENERATION:'true', ...extra });
const body = (requestId='test-request-00000001') => ({ requestId, category:'code', brief:'Create a simple landing page for a bakery.' });
const result = (extra={}) => ({ choices:[{message:{content:'<!doctype html><html><body>Hello</body></html>'},finish_reason:'stop'}], usage:{prompt_tokens:100,completion_tokens:30,total_tokens:130,secret}, ...extra });
const headers = {'Content-Type':'application/json','X-Pixelmorphic-Client':'workspace'};
async function app(t, config, impl) {
  const records=[];
  const server=createApp(config,{fetchImpl:impl,audit:async x=>records.push(x)});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const url=`http://127.0.0.1:${server.address().port}`;
  return {records,url,post:(path,data=body(),opts={})=>fetch(url+path,{method:'POST',headers,...opts,body:JSON.stringify(data)})};
}
test('configuration pins provider and validates limits',()=>{
  assert.equal(cfg().baseUrl,'https://api.samuraiapi.io/v1');
  assert.throws(()=>cfg({AI_BASE_URL:'https://other.example/v1'}));
  assert.throws(()=>cfg({AI_MAX_OUTPUT_TOKENS:'0'}));
  assert.throws(()=>cfg({AI_OUTPUT_LIMIT_FIELD:'anything'}));
});
test('status is secret-free; secrets/files are never served; foreign origin blocked',async t=>{
  let calls=0;const a=await app(t,cfg(),async()=>{calls++;});
  const status=await (await fetch(a.url+'/api/status')).text();assert.ok(!status.includes(secret));
  assert.equal((await fetch(a.url+'/.env')).status,404);
  assert.equal((await fetch(a.url+'/server.mjs')).status,404);
  assert.equal((await a.post('/api/generate',body(),{headers:{...headers,Origin:'https://foreign.example'}})).status,403);
  assert.equal((await a.post('/api/generate',body(),{headers:{'Content-Type':'application/json'}})).status,403);
  const foreignHostStatus=await new Promise((resolve,reject)=>{
    http.get(a.url+'/api/status',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);
  });
  assert.equal(foreignHostStatus,403);
  assert.equal(calls,0);
});
test('missing key or disabled generation produces no upstream request',async t=>{
  let calls=0;
  for(const c of [cfg({AI_API_KEY:''}),cfg({AI_ENABLE_GENERATION:'false'}),cfg({AI_MODEL:''})]){
    const a=await app(t,c,async()=>{calls++;});assert.equal((await a.post('/api/generate')).status,503);
  }assert.equal(calls,0);
});
test('generation forwards fixed model and capped output, sanitizes usage and deduplicates',async t=>{
  const calls=[];const a=await app(t,cfg(),async(url,init)=>{calls.push({url,init});return Response.json(result());});
  const r=await (await a.post('/api/generate')).json();assert.ok(r.html.includes('<html>'));
  assert.deepEqual(r.usage,{prompt_tokens:100,completion_tokens:30,total_tokens:130});assert.equal(r.cost,null);
  assert.equal(calls[0].url,'https://api.samuraiapi.io/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization,'Bearer '+secret);
  const sent=JSON.parse(calls[0].init.body);assert.equal(sent.model,'provider-exact-model');assert.equal(sent.max_tokens,4096);assert.equal(sent.stream,false);
  assert.equal((await a.post('/api/generate')).status,200);assert.equal(calls.length,1);
  assert.equal((await a.post('/api/generate',{...body(),brief:'A completely different valid website brief'})).status,409);
  assert.ok(!JSON.stringify(a.records).includes(secret));assert.ok(!JSON.stringify(a.records).includes(body().brief));
});
test('model listing makes only metadata call and returns IDs',async t=>{
  const calls=[];const a=await app(t,cfg(),async url=>{calls.push(url);return Response.json({data:[{id:'model-a',secret},{invalid:true}]});});
  const res=await a.post('/api/models',{});assert.deepEqual(await res.json(),{models:['model-a']});assert.deepEqual(calls,['https://api.samuraiapi.io/v1/models']);
});
test('invalid category or large brief rejected without inference',async t=>{
  let calls=0;const a=await app(t,cfg(),async()=>calls++);
  assert.equal((await a.post('/api/generate',{...body(),category:'business'})).status,400);
  assert.equal((await a.post('/api/generate',{...body(),brief:'x'.repeat(6001)})).status,400);
  assert.equal(calls,0);
});
test('provider errors are sanitized and not retried even with same request ID',async t=>{
  let calls=0;const a=await app(t,cfg(),async()=>{calls++;return Response.json({error:{message:secret}}, {status:401});});
  const res=await a.post('/api/generate');assert.equal(res.status,502);const text=await res.text();assert.ok(!text.includes(secret));assert.ok(text.includes('PROVIDER_AUTH'));
  assert.equal((await a.post('/api/generate')).status,502);assert.equal(calls,1);
});
test('truncated output is not success; usage survives',async t=>{
  const a=await app(t,cfg(),async()=>Response.json(result({choices:[{message:{content:'<html>unfinished'},finish_reason:'length'}]})));
  const res=await a.post('/api/generate');assert.equal(res.status,502);const data=await res.json();assert.equal(data.error,'INCOMPLETE_OUTPUT');assert.equal(data.usage.total_tokens,130);
});
test('timeout gives unknown billing status, no automatic retries',async t=>{
  let calls=0;const a=await app(t,cfg(),async()=>{calls++;const e=new Error('secret');e.name='TimeoutError';throw e;});
  const res=await a.post('/api/generate');assert.equal(res.status,504);assert.equal((await res.json()).error,'PROVIDER_TIMEOUT');assert.equal(calls,1);assert.equal(a.records[0].billingStatus,'unknown');
});
test('concurrency and session caps stop extra calls',async t=>{
  let done,signal;const started=new Promise(r=>signal=r);
  const a=await app(t,cfg({AI_MAX_REQUESTS_PER_SESSION:'1'}),async()=>{signal();await new Promise(r=>done=r);return Response.json(result());});
  const first=a.post('/api/generate');await started;
  assert.equal((await a.post('/api/generate')).status,409);
  assert.equal((await a.post('/api/generate',body('test-request-00000002'))).status,429);
  done();assert.equal((await first).status,200);
  assert.equal((await a.post('/api/generate',body('test-request-00000002'))).status,429);
});
test('UI scripts parse; no direct provider requests or active iframe scripts',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  for(const s of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
  const js=await readFile(new URL('../public/integration.js',import.meta.url),'utf8');new vm.Script(js);
  assert.ok(html.includes('sandbox=""'));assert.ok(!html.includes('allow-scripts'));
  assert.ok(html.includes('window.refreshIntegration?.()'));assert.ok(html.includes('window.extendPlan?.(p)'));
  assert.ok(!/fetch\(['"]https:/.test(js));assert.ok(!js.includes(secret));
});
