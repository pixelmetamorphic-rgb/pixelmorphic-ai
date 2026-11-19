#!/usr/bin/env node
// Targeted, transactional installer. Does not discover or modify other projects.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const arg=name=>{const i=args.indexOf(name);if(i>=0&&!args[i+1])throw new Error(`${name} needs a value.`);return i>=0?args[i+1]:null;};
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const UI_MARK='/* PM52_MOUNT_START */';
const API_MARK='/* PM52_API_START */';
const apiPatch=`\n  /* PM52_API_START */
  if (new URL(req.url || '/', 'http://localhost').searchParams.get('studio52') === '1') {
    try {
      const { handleStudioRequest } = await import('./pixelmorphic-code-studio-v52.mjs');
      await handleStudioRequest(req, res);
    } catch (error) {
      if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json' });
      if (!res.writableEnded) res.end(JSON.stringify({ ok: false, error: 'Code Studio v52 could not load. Re-run its installer or use rollback.mjs.' }));
    }
    return true;
  }
  /* PM52_API_END */\n`;
const uiPatch=`\n    /* PM52_MOUNT_START */
    if (window.PixelmorphicStudio52) {
      try { window.PixelmorphicStudio52.mount(targetEl); return; }
      catch (error) { console.error('Code Studio v52 could not mount; opening the previous editor.', error); }
    }
    /* PM52_MOUNT_END */\n`;
function replaceOnce(s,needle,replacement,label){if(s.split(needle).length!==2)throw new Error(`Compatibility check failed in ${label}. Expected one known v51 anchor. No files were changed.`);return s.replace(needle,replacement);}
function checked(root,rel){
  if(path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..'))throw new Error('Unsafe path in update.');
  const dest=path.resolve(root,rel);if(!dest.startsWith(root+path.sep))throw new Error('Path escaped project.');
  let cursor=dest;while(cursor!==root){if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw new Error(`Refusing symlink: ${rel}`);cursor=path.dirname(cursor);}
  return dest;
}
function syntaxCheck(file){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8',timeout:20000});if(r.status!==0)throw new Error(`JavaScript syntax check failed: ${path.basename(file)}\n${(r.stderr||r.error?.message||'Unknown error').slice(0,1800)}`);}
function atomicWrite(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.pm52-'+crypto.randomBytes(5).toString('hex')+'.tmp';try{fs.writeFileSync(temp,data);fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.rmSync(temp);}}
async function main(){
  if(Number(process.versions.node.split('.')[0])<20)throw new Error('Node.js 20 or newer is required.');
  const requested=path.resolve(arg('--project')||process.cwd());const root=fs.realpathSync(requested);
  if(!fs.existsSync(path.join(root,'server.mjs'))||!fs.existsSync(path.join(root,'public','index.html')))throw new Error('This is not a compatible Pixelmorphic project. Pass --project "C:\\...\\pixelmorphic-samurai".');
  const lock=checked(root,'.pixelmorphic-v52-install.lock');let lockFd;
  try{lockFd=fs.openSync(lock,'wx');}catch{throw new Error('An installation lock exists. Close any installer, then remove .pixelmorphic-v52-install.lock only if no installation is running.');}
  let stage,backupDir;const written=[];const originals=new Map();
  try{
    const manifest=JSON.parse(fs.readFileSync(path.join(here,'manifest.json'),'utf8'));
    if(manifest.version!=='52.0.0')throw new Error('Update manifest version mismatch.');
    const changes=new Map();
    for(const item of manifest.files){
      const source=checked(here,item.path),data=fs.readFileSync(source);
      if(hash(data)!==item.sha256)throw new Error(`Update checksum failed: ${item.path}. Download the ZIP again.`);
      const name=path.basename(item.path);
      const destinations=name.endsWith('.js')?['public/'+name]:[name,...(fs.existsSync(path.join(root,'src','general-chat-lab.mjs'))?['src/'+name]:[])];
      for(const dest of destinations)changes.set(dest,data);
    }
    const backendPaths=['general-chat-lab.mjs','src/general-chat-lab.mjs'].filter(p=>fs.existsSync(checked(root,p)));
    if(!backendPaths.includes('general-chat-lab.mjs'))throw new Error('The v51 general-chat-lab.mjs file is missing. No files were changed.');
    for(const rel of backendPaths){
      let source=fs.readFileSync(checked(root,rel),'utf8');
      if(!source.includes(API_MARK))source=replaceOnce(source,'export async function handleGeneralChatApi(req, res) {','export async function handleGeneralChatApi(req, res) {'+apiPatch,rel);
      const original="if (cleanPath !== '/general-chat-ui.js' && cleanPath !== '/verified-research-ui.js' && cleanPath !== '/studio-tools.js') return false;";
      const updated="if (cleanPath !== '/general-chat-ui.js' && cleanPath !== '/verified-research-ui.js' && cleanPath !== '/studio-tools.js' && cleanPath !== '/pixelmorphic-code-studio-v52.js') return false;";
      if(!source.includes(updated))source=replaceOnce(source,original,updated,rel+' asset route');
      const assetOriginal="const filePath = path.join(ROOT_DIR, 'public', cleanPath.slice(1));";
      const assetUpdated="const filePath = cleanPath === '/pixelmorphic-code-studio-v52.js' ? path.join(process.cwd(), 'public', cleanPath.slice(1)) : path.join(ROOT_DIR, 'public', cleanPath.slice(1));";
      if(!source.includes(assetUpdated))source=replaceOnce(source,assetOriginal,assetUpdated,rel+' asset file');
      changes.set(rel,Buffer.from(source));
    }
    let mounts=0;
    for(const rel of ['public/general-chat-ui.js','general-chat-ui.js','public/studio-tools.js']){
      const file=checked(root,rel);if(!fs.existsSync(file))continue;let source=fs.readFileSync(file,'utf8');
      const signature='function mountCodeStudioView(targetEl) {';
      if(source.includes(UI_MARK)){mounts++;continue;}
      if(!source.includes(signature)){if(rel==='public/studio-tools.js')continue;throw new Error(`Unrecognized Code Studio in ${rel}. No files were changed.`);}
      source=replaceOnce(source,signature,signature+uiPatch,rel);changes.set(rel,Buffer.from(source));mounts++;
    }
    if(!mounts)throw new Error('No compatible v51 UI was found. No files were changed.');
    let html=fs.readFileSync(checked(root,'public/index.html'),'utf8');
    const tag='<script src="/pixelmorphic-code-studio-v52.js?v=52.0.0"></script>';
    if(!html.includes('pixelmorphic-code-studio-v52.js')){
      // Place before the first script so both bundled and standalone v51 UIs see it.
      if(!/<script\b/i.test(html))throw new Error('The site shell has no script loading anchor.');
      html=html.replace(/<script\b/i,tag+'\n<script');
    }
    html=html.replace(/(studio-tools|general-chat-ui)\.js(?:\?v=[^"'\s>]*)?/g,'$1.js?v=52.0.0');
    changes.set('public/index.html',Buffer.from(html));
    // Idempotence: leave byte-identical files untouched and do not create empty backups.
    for(const [rel,data] of changes){const file=checked(root,rel);if(fs.existsSync(file)){const old=fs.readFileSync(file);if(old.equals(data)){changes.delete(rel);continue;}originals.set(rel,old);}else originals.set(rel,null);}
    stage=fs.mkdtempSync(path.join(os.tmpdir(),'pixelmorphic-v52-check-'));
    for(const [rel,data] of changes){const file=path.join(stage,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);if(/\.(mjs|js)$/.test(file))syntaxCheck(file);}
    syntaxCheck(path.join(root,'server.mjs'));
    // Ensure the shared v51 files are parsable even during a repeated installation.
    for(const rel of backendPaths)if(!changes.has(rel))syntaxCheck(checked(root,rel));
    if(args.includes('--check')){console.log(`Compatibility and syntax checks passed for ${root}. ${changes.size} file(s) would change. No project files were changed.`);return;}
    if(!changes.size){console.log('Code Studio v52 is already installed. No files changed.');return;}
    const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');
    backupDir=checked(root,'backups/code-studio-v52-'+stamp);fs.mkdirSync(backupDir,{recursive:true});
    const records=[];
    for(const [rel,data] of changes){const old=originals.get(rel);if(old!==null){const backup=path.join(backupDir,'files',rel);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,old);}records.push({path:rel,existed:old!==null,beforeHash:old===null?null:hash(old),installedHash:hash(data)});}
    fs.writeFileSync(path.join(backupDir,'backup.json'),JSON.stringify({version:'52.0.0',projectRoot:root,createdAt:new Date().toISOString(),state:'prepared',files:records},null,2));
    // Verify the project was not concurrently edited after staging.
    for(const [rel,old] of originals){const file=checked(root,rel);if(old===null?fs.existsSync(file):!fs.existsSync(file)||!fs.readFileSync(file).equals(old))throw new Error(`Project changed while preparing update: ${rel}. Try again after stopping the editor/server.`);}
    for(const [rel,data] of changes){atomicWrite(checked(root,rel),data);written.push(rel);}
    fs.writeFileSync(path.join(backupDir,'backup.json'),JSON.stringify({version:'52.0.0',projectRoot:root,createdAt:new Date().toISOString(),state:'installed',files:records},null,2));
    console.log(`SUCCESS: Code Studio v52 installed in ${root}\n${changes.size} files updated. Backup: ${backupDir}\nYour .env, server.mjs, package.json, research files and saved user data were not changed.\nRestart with npm.cmd start, open #code, then press Ctrl+Shift+R.\nTo undo: node "${path.join(here,'rollback.mjs')}" --project "${root}"`);
  }catch(error){
    if(written.length){let failed=false;for(const rel of [...written].reverse()){try{const old=originals.get(rel);if(old===null)fs.rmSync(checked(root,rel),{force:true});else atomicWrite(checked(root,rel),old);}catch{failed=true;}}
      error.message+=failed?`\nAutomatic recovery was incomplete. Restore files from ${backupDir}.`:'\nAll files changed by this attempt were restored.';}
    throw error;
  }finally{if(stage)fs.rmSync(stage,{recursive:true,force:true});if(lockFd!==undefined)fs.closeSync(lockFd);fs.rmSync(lock,{force:true});}
}
main().catch(e=>{console.error('INSTALLATION STOPPED: '+e.message);process.exitCode=1;});
