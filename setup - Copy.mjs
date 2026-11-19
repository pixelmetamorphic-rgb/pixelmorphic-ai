import { readFile, writeFile, chmod } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { configuration, createApp } from './server.mjs';

const folder=dirname(fileURLToPath(import.meta.url));
const envPath=join(folder,'.env');
const base='https://api.samuraiapi.io/v1';

export function validKey(value) {
  return typeof value==='string' && /^[\x21-\x7e]{8,512}$/.test(value) && !/["'`\\#]/.test(value);
}
export function validModel(value) {
  return typeof value==='string' && /^[A-Za-z0-9_./:+-]{1,200}$/.test(value);
}
export function updateEnvironment(text, changes) {
  let output=text;
  for(const [name,value] of Object.entries(changes)) {
    if(!/^AI_[A-Z_]+$/.test(name)||/[\r\n"\\]/.test(value)) throw new Error('Invalid configuration value.');
    const line=`${name}="${value}"`;
    const pattern=new RegExp('^'+name+'=.*$','gm');
    output=pattern.test(output)?output.replace(pattern,()=>line):output.replace(/\s*$/,'')+'\n'+line+'\n';
  }
  return output;
}
export async function fetchModelIds(key, fetchImpl=fetch) {
  const res=await fetchImpl(base+'/models', {headers:{Authorization:`Bearer ${key}`},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!res.ok) {await res.body?.cancel();return {ok:false,status:res.status,models:[]};}
  let size=0;const chunks=[];
  for await(const chunk of res.body){size+=chunk.length;if(size>2_000_000)throw new Error('Model list too large.');chunks.push(Buffer.from(chunk));}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return {ok:false,status:200,models:[]};}
  if(!Array.isArray(body.data))return {ok:false,status:200,models:[]};
  return {ok:true,status:200,models:[...new Set(body.data.map(x=>x?.id).filter(validModel))].slice(0,2000)};
}
let prompts=null;
function ask(question,{hidden=false}={}) {
  if(!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Open this setup in an interactive terminal.');
  if(!prompts){
    const state={mute:false};
    const sink=new Writable({write(chunk,encoding,next){if(!state.mute)process.stdout.write(chunk,encoding);next();}});
    const rl=createInterface({input:process.stdin,output:sink,terminal:true,historySize:0});
    prompts={state,rl};
  }
  const {state,rl}=prompts;
  state.mute=false;
  rl.resume();
  return new Promise((resolve,reject)=>{
    const cancel=()=>{state.mute=false;rl.close();prompts=null;process.stdout.write('\n');reject(new Error('Setup cancelled.'));};
    rl.once('SIGINT',cancel);
    rl.question(question,answer=>{
      state.mute=false;
      rl.removeListener('SIGINT',cancel);
      if(hidden)process.stdout.write('\nKey entry received ('+answer.trim().length+' characters). Key value is hidden; not verified yet.\n');
      resolve(answer.trim());
    });
    state.mute=hidden;
  });
}
async function configure(){
  try { await configureSteps(); }
  finally {if(prompts){prompts.state.mute=false;prompts.rl.close();prompts=null;}}
}
async function configureSteps() {
  let text;
  try{text=await readFile(envPath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;text=await readFile(join(folder,'.env.example'),'utf8');}
  const old=parseEnv(text);
  console.log('\nPIXELMORPHIC AI — Samurai local setup');
  console.log('Your key stays in this folder\'s private .env file. Do not share that file.');
  console.log('Typing/pasting the key will be invisible. Press Enter after pasting.');
  let key=await ask(old.AI_API_KEY?'API key (blank keeps your existing key): ':'Samurai API key: ',{hidden:true});
  if(!key)key=old.AI_API_KEY||'';
  if(!validKey(key))throw new Error('Key is missing or contains unsupported characters. No key was saved.');
  const lookup=await ask('Fetch model IDs from Samurai now? No generation request. [Y/n]: ');
  let models=[];
  if(lookup.toLowerCase()!=='n'){
    try{
      const r=await fetchModelIds(key);models=r.models;
      if([401,403].includes(r.status))console.log('Provider returned HTTP '+r.status+': key/access was rejected. Check the provider dashboard.');
      if(!r.ok)console.log('Model listing unavailable (HTTP '+r.status+'). This does not verify the key. Enter the exact model ID from the provider dashboard.');
    }catch{console.log('Could not verify model access. Check the key/provider, or continue with an exact model ID.');}
  }
  if(models.length){
    const filter=await ask('Filter model names (e.g. claude, gpt, gemini; blank shows all): ');
    const matches=models.filter(x=>x.toLowerCase().includes(filter.toLowerCase()));
    console.log('\n'+matches.slice(0,80).map((m,i)=>`${i+1}. ${m}`).join('\n'));
    const choice=await ask('Enter a number from this list OR paste an exact model ID: ');
    const model=/^\d+$/.test(choice)?matches[Number(choice)-1]:choice;
    if(!validModel(model)||!models.includes(model))throw new Error('Model selection is not in the provider list. Run setup again.');
    old.AI_MODEL=model;
  }else{
    const model=await ask('Exact model ID'+(old.AI_MODEL?' (blank keeps existing)':'')+': ');
    old.AI_MODEL=model||old.AI_MODEL||'';
    if(!validModel(old.AI_MODEL))throw new Error('A valid exact model ID is required.');
  }
  console.log('\nNo paid generation has run. Model listing does not verify generation compatibility.');
  console.log('Enabling generation permits paid requests from your local workspace.');
  console.log('Default limits: 10 attempts per server session, 4096 output tokens/request. These are not a rupee budget.');
  const enable=await ask('Type ENABLE to enable generation, or Enter to leave it disabled: ');
  const output=updateEnvironment(text,{AI_BASE_URL:base,AI_API_KEY:key,AI_MODEL:old.AI_MODEL,AI_ENABLE_GENERATION:enable==='ENABLE'?'true':'false'});
  configuration(parseEnv(output));
  await writeFile(envPath,output,{mode:0o600});
  if(process.platform!=='win32')await chmod(envPath,0o600);
  console.log('Setup saved. Key was not printed. You can change setup using CONFIGURE_API.cmd.');
}
async function main(){
  const major=Number(process.versions.node.split('.')[0]);
  if(major<22)throw new Error('Install Node.js 22.13+ or a newer supported LTS release.');
  let saved=null;try{saved=parseEnv(await readFile(envPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(process.argv.includes('--configure')||!saved?.AI_API_KEY||!saved?.AI_MODEL)await configure();
  if(!process.argv.includes('--start'))return;
  const cfg=configuration(parseEnv(await readFile(envPath,'utf8')));
  const app=createApp(cfg);
  app.on('error',()=>{console.error('Could not start: the port may already be in use. Close the other server or change PORT.');process.exitCode=1;});
  app.listen(cfg.port,'127.0.0.1',()=>{
    const url=`http://127.0.0.1:${cfg.port}`;
    console.log(`\nWorkspace running: ${url}\nGeneration ${cfg.enabled?'enabled (provider charges apply)':'disabled'}. Keep this window open. Ctrl+C stops the server.`);
    if(process.platform==='win32'){
      const browser=spawn('cmd.exe',['/c','start','',url],{stdio:'ignore',windowsHide:true});
      browser.on('error',()=>console.log('Open the workspace URL in your browser.'));
    }
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(()=>{console.error('Setup did not complete. Check the key/model selection and file permissions, then run CONFIGURE_API.cmd again. No secret values are printed.');process.exitCode=1;});
}
