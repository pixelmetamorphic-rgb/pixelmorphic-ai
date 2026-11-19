import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {handleStudioRequest} from '../payload/pixelmorphic-code-studio-v52.mjs';
const html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>Test</body></html>';
const plan={title:'Dashboard',goal:'Help the user inspect sample revenue',requirements:['A working period filter'],design:'Accessible responsive layout',questions:[],assumptions:[],limitations:[]};
let mode='success',calls=[],provider,url,app;
test.before(async()=>{
  provider=http.createServer(async(req,res)=>{
    const data=await new Promise(resolve=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>resolve(JSON.parse(s)));});calls.push(data);
    if(mode==='rate'){res.writeHead(429);res.end('{}');return;}
    if(mode==='auth'){res.writeHead(401);res.end('{}');return;}
    if(mode==='slow'){const timer=setTimeout(()=>{if(!res.destroyed)res.end('{}');},12000);res.on('close',()=>clearTimeout(timer));return;}
    const value=data.messages[0].content.includes('product planner')?plan:{summary:'Built dashboard',files:[{path:'index.html',content:html}],notes:[]};
    const content=mode==='malformed'?'{"files":[':JSON.stringify(value);
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{finish_reason:mode==='truncated'?'length':'stop',message:{content}}],usage:{total_tokens:100}}));
  });
  await new Promise(r=>provider.listen(0,'127.0.0.1',r));
  process.env.CODE_STUDIO_BASE_URL='http://127.0.0.1:'+provider.address().port+'/v1';process.env.CODE_STUDIO_API_KEY='test-not-a-real-key';process.env.CODE_STUDIO_MODEL='mock-coder';
  app=http.createServer(handleStudioRequest);await new Promise(r=>app.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+app.address().port;
});
test.after(async()=>{app?.closeAllConnections();provider?.closeAllConnections();await Promise.all([new Promise(r=>app.close(r)),new Promise(r=>provider.close(r))]);});
const post=(body,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({requestId:randomUUID(),action:'build',tier:'fast',prompt:'Build a dashboard',files:[],...body})});
const events=async r=>(await r.text()).trim().split('\n').map(JSON.parse);
test('status exposes the actual configured model without key',async()=>{const r=await fetch(url),s=await r.text();assert.match(s,/mock-coder/);assert.doesNotMatch(s,/test-not-a-real-key/);});
test('reject cross-origin and null-origin requests before provider access',async()=>{const n=calls.length;assert.equal((await post({}, {Origin:'https://evil.example'})).status,403);assert.equal((await post({}, {Origin:'null'})).status,403);assert.equal(calls.length,n);});
test('Pro uses two calls and emits genuine plan/build/check phases',async()=>{mode='success';const n=calls.length;const list=await events(await post({tier:'pro'}));assert.equal(calls.length-n,2);assert.deepEqual(list.filter(e=>e.type==='stage').map(e=>e.stage),['plan','build','check']);assert.equal(list.at(-1).kind,'build');});
test('approved plan uses one call; full existing file beyond old limit is included',async()=>{const n=calls.length;const source=html.replace('Test','x'.repeat(28000)+'END_MARKER');const list=await events(await post({tier:'pro',plan,files:[{path:'index.html',content:source},{path:'styles.css',content:'body { color: red }'}]}));assert.equal(calls.length-n,1);assert.ok(calls.at(-1).messages[1].content.includes('END_MARKER'));assert.ok(list.at(-1).files.some(f=>f.path==='styles.css'));});
test('duplicate request ID never produces a duplicate paid request',async()=>{const requestId=randomUUID();await events(await post({requestId}));const n=calls.length;assert.equal((await post({requestId})).status,409);assert.equal(calls.length,n);});
test('rate-limit and credentials errors make exactly one provider call',async()=>{for(const failure of ['rate','auth']){mode=failure;const n=calls.length;const list=await events(await post({}));assert.equal(calls.length-n,1);assert.equal(list.at(-1).type,'error');}mode='success';});
test('reject truncated and malformed provider responses without a candidate',async()=>{for(const failure of ['truncated','malformed']){mode=failure;const list=await events(await post({}));assert.equal(list.at(-1).type,'error');assert.ok(!list.some(e=>e.type==='result'));}mode='success';});
test('validation consumes no model call',async()=>{const n=calls.length;const r=await post({action:'validate',files:[{path:'index.html',content:html},{path:'app.js',content:'const =;'}]});const data=await r.json();assert.ok(data.checks.some(c=>c.level==='error'));assert.equal(calls.length,n);});
test('bad JSON and oversized bodies are rejected',async()=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(r.status,400);const big=await post({prompt:'x'.repeat(430000)});assert.equal(big.status,413);});
test('cancellation releases the build slot; no hidden retry',async()=>{mode='slow';const ctrl=new AbortController();const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl.signal,body:JSON.stringify({requestId:randomUUID(),action:'build',prompt:'cancel test',files:[],tier:'fast'})});const reader=r.body.getReader();await reader.read();ctrl.abort();await new Promise(r=>setTimeout(r,100));mode='success';assert.equal((await events(await post({}))).at(-1).kind,'build');});
