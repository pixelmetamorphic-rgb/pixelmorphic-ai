import test from 'node:test';
import assert from 'node:assert/strict';
import {safePath,normalizeFiles,validateProject,guardJS,mergeOutput} from '../payload/pixelmorphic-code-core-v52.mjs';
const doc='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><p>Hello</p></body></html>';
test('reject traversal, duplicate filenames and unsupported executable files',()=>{
  for(const p of ['../evil.js','/evil.js','a/../../evil.js','C:\\evil.js','a//b.js','server.exe','NUL.txt'])assert.throws(()=>safePath(p));
  assert.throws(()=>normalizeFiles([{path:'app.js',content:''},{path:'App.js',content:''}]));
});
test('preserve the full input and reject oversize without truncation',()=>{
  const content='// '+ 'x'.repeat(30000)+'\nconst marker="BEYOND_24000";';
  assert.equal(normalizeFiles([{path:'app.js',content}])[0].content,content);
  assert.throws(()=>normalizeFiles([{path:'app.js',content:'x'.repeat(170000)}]),/160 KB/);
});
test('reject incomplete HTML and detect missing local file references',()=>{
  assert.ok(validateProject([{path:'index.html',content:'<html><body>truncated'}]).some(c=>c.level==='error'));
  assert.ok(validateProject([{path:'index.html',content:doc.replace('</body>','<script src="app.js"></script></body>')}]).some(c=>c.message.includes('Missing local asset')));
});
test('detect invalid JavaScript and JSON without executing them',()=>{
  const checks=validateProject([{path:'index.html',content:doc},{path:'app.js',content:'while(true){}\nconst = ;'},{path:'data.json',content:'{bad'}]);
  assert.ok(checks.filter(c=>c.level==='error').length>=2);
});
test('merge changes preserves unchanged files and ignores model deletions',()=>{
  const current=[{path:'index.html',content:doc},{path:'styles.css',content:'body{color:red}'}];
  const next=mergeOutput(current,{files:[{path:'styles.css',content:'body{color:blue}'}],deleted:['index.html']});
  assert.equal(next.find(f=>f.path==='index.html').content,doc);assert.equal(next[1].content,'body{color:blue}');
});
test('instrument loops and functions while preserving valid syntax',()=>{
  for(const source of ['while(true){}','for(let i=0;i<2;i++) for(let j=0;j<2;j++) console.log(j);','do console.log(1);while(false);','const f=x=>y=>({n:x+y});','function f(){"use strict"; return 1;}','async function f(){for await (const x of []){}}'])assert.match(guardJS(source,'guard'),/guard\(\)/);
  assert.throws(()=>guardJS('import x from "external"','guard','module'),/bundler/);
  assert.throws(()=>guardJS('import("x")','guard'),/imports/);
});
test('complete local app passes static checks with an honest runtime caveat',()=>{
  const checks=validateProject([{path:'index.html',content:doc},{path:'app.js',content:'document.body.dataset.ready="yes";'}]);
  assert.equal(checks.filter(c=>c.level==='error').length,0);assert.ok(checks.some(c=>c.message.includes('static checks')));
});
