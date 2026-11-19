#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const args=process.argv.slice(2),arg=n=>{const i=args.indexOf(n);if(i>=0&&!args[i+1])throw new Error(n+' needs a value.');return i>=0?args[i+1]:null;};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function safe(root,rel){if(path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..'))throw new Error('Unsafe backup path.');const dest=path.resolve(root,rel);if(!dest.startsWith(root+path.sep))throw new Error('Path escaped project.');let p=dest;while(p!==root){if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw new Error('Symlink not allowed: '+rel);p=path.dirname(p);}return dest;}
function atomic(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.pm52-rollback.tmp';fs.writeFileSync(temp,data);fs.renameSync(temp,file);}
try{
  const root=fs.realpathSync(path.resolve(arg('--project')||process.cwd())),dir=safe(root,'backups');
  const candidates=fs.readdirSync(dir).filter(n=>n.startsWith('code-studio-v52-')).sort().reverse();
  let manifest,backup;
  for(const name of candidates){const folder=safe(root,'backups/'+name),file=path.join(folder,'backup.json');if(!fs.existsSync(file))continue;const m=JSON.parse(fs.readFileSync(file,'utf8'));if(['installed','prepared'].includes(m.state)){manifest=m;backup=folder;break;}}
  if(!manifest)throw new Error('No active v52 backup was found.');
  if(manifest.projectRoot!==root)throw new Error('The backup belongs to a different project path.');
  const restore=[];
  for(const f of manifest.files){const target=safe(root,f.path),current=fs.existsSync(target)?fs.readFileSync(target):null,currentHash=current?hash(current):null;
    if(currentHash!==f.installedHash&&currentHash!==f.beforeHash)throw new Error(`The file ${f.path} changed after installation. Rollback stopped to preserve your edits. Restore manually from ${backup}.`);
    let data=null;if(f.existed){const original=safe(backup,'files/'+f.path);data=fs.readFileSync(original);if(hash(data)!==f.beforeHash)throw new Error('Backup checksum failed: '+f.path);}restore.push({target,data,current});}
  const lock=safe(root,'.pixelmorphic-v52-install.lock'),fd=fs.openSync(lock,'wx'),written=[];
  try{for(const f of restore){if(f.data===null)fs.rmSync(f.target,{force:true});else atomic(f.target,f.data);written.push(f);}manifest.state='rolled-back';fs.writeFileSync(path.join(backup,'backup.json'),JSON.stringify(manifest,null,2));}
  catch(e){for(const f of written.reverse()){if(f.current===null)fs.rmSync(f.target,{force:true});else atomic(f.target,f.current);}throw e;}
  finally{fs.closeSync(fd);fs.rmSync(lock,{force:true});}
  console.log('Rolled back Code Studio v52. Restart npm.cmd start and hard-refresh the browser. Browser project data was preserved.');
}catch(e){console.error('ROLLBACK STOPPED: '+e.message);process.exitCode=1;}
