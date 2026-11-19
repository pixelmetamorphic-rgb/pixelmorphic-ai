// Same-origin client only. The provider key never reaches this file or the browser.
let connection = null;
let generationRunning = false;
async function backend(path, body) {
  const res = await fetch(path, body === undefined ? { cache: 'no-store' } : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Pixelmorphic-Client': 'workspace' },
    body: JSON.stringify(body)
  });
  let data;
  try { data = await res.json(); } catch { throw new Error('Start the Node server and open http://127.0.0.1:3000.'); }
  if (!res.ok) { const e = new Error(data.message || data.error || 'Request failed.'); e.data = data; throw e; }
  return data;
}
function connectionLabel() {
  if (!connection) return 'API setup';
  if (connection.ready) return 'API configured';
  if (!connection.keyConfigured) return 'API key needed';
  if (!connection.model) return 'Model ID needed';
  return 'Generation disabled';
}
async function checkConnection() {
  try { connection = await backend('/api/status'); }
  catch { connection = null; }
  const badge = document.getElementById('connection-button');
  if (badge) badge.textContent = connectionLabel();
  if (current === 'account') paintConnection();
  if (current === 'chat' && typeof setupChat === 'function') setupChat();
}
function usageText(usage) {
  if (!usage) return 'Provider did not report token usage.';
  return Object.entries(usage).map(([k,v]) => k.replaceAll('_',' ') + ': ' + v).join(' · ');
}
function paintConnection() {
  const panel = document.getElementById('api-connection'); if (!panel) return;
  panel.innerHTML = '<div class="eyebrow">LOCAL OWNER SETTINGS</div><h2 style="margin-top:12px">AI provider</h2>' +
    '<p>Endpoint: <code>Configured on your server</code></p>' +
    '<p><strong>'+esc(connectionLabel())+'</strong><br>Key: '+(connection?.keyConfigured?'Present on server':'Not configured')+
    '<br>Model: '+esc(connection?.model || 'Not selected')+'<br>Generation: '+(connection?.enabled?'Enabled':'Disabled')+
    '<br>Attempts left this server session: '+esc(connection?.remainingAttempts ?? '—')+'</p>'+
    '<p class="muted">Configure AI_API_KEY and AI_MODEL in the server .env file, then restart. Set AI_ENABLE_GENERATION=true only when ready for provider charges. Keys are never entered on this page.</p>'+
    '<div class="info-bar">The server reports configuration readiness. A successful response verifies a request; customer wallet billing and cost estimates are not active.</div>'+
    '<div class="actions"><button id="refresh-api">Refresh status</button><button id="list-models" '+(!connection?.keyConfigured?'disabled':'')+'>Fetch model IDs</button><button id="show-logs">Show request logs</button></div>'+
    '<p class="subnote">Model lookup calls /models only; it does not request generation.</p><pre id="api-detail" style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:300px;overflow:auto;font-size:12px"></pre>';
  document.getElementById('refresh-api').onclick=checkConnection;
  document.getElementById('list-models').onclick=async e=>{
    e.target.disabled=true; const target=document.getElementById('api-detail'); target.textContent='Fetching model IDs…';
    try { const data=await backend('/api/models',{}); target.textContent=data.models.join('\n') || 'No model IDs returned. Ask the provider for an exact model ID.'; }
    catch(err){target.textContent=err.message;} finally {e.target.disabled=false;}
  };
  document.getElementById('show-logs').onclick=async()=>{
    const target=document.getElementById('api-detail');
    try { const data=await backend('/api/logs'); target.textContent=data.events.length?JSON.stringify(data.events,null,2):'No generation requests recorded in this server session. Disk logs are in logs/api.jsonl.'; }
    catch(err){target.textContent=err.message;}
  };
}
window.refreshIntegration=function(){
  if(current==='account'){
    const panel=document.createElement('section'); panel.id='api-connection';panel.className='card';panel.style.marginTop='20px';
    document.getElementById('main').append(panel);paintConnection();
  }
};
function openGenerated(p){
  if(!p.output)return;
  const existing=document.getElementById('code');if(existing)existing.value=p.output;
  state.code=p.output;persist();go('code');
}
window.extendPlan=function(p){
  const area=document.getElementById('execution-controls'); if(!area)return;
  if(p.category!=='code') {area.innerHTML='<p class="subnote">Live execution is currently wired for Code Studio only.</p>';return;}
  area.innerHTML='<div class="info-bar">Generates one HTML/CSS website using the configured server model. Brief text is sent to your configured AI provider; attachments are not sent. Preview blocks scripts and network access. Provider charges may apply. Budget preferences do not change model selection yet.</div>'+
    '<p class="subnote">Model: '+esc(connection?.model||'Set AI_MODEL in .env')+' · Output limit: '+esc(connection?.maxOutputTokens??'—')+' tokens · Cost estimate unavailable</p>'+
    (p.output?'<div class="actions"><button id="open-generated">Open generated website</button><button id="download-generated">Download generated HTML</button></div><p class="subnote">'+esc(usageText(p.usage))+'</p>':'')+
    '<label style="display:block;font-size:12px;margin:14px 0"><input type="checkbox" id="approve-api"> Send this brief to your configured AI provider and accept provider usage charges.</label>'+
    '<button class="primary" id="run-api" disabled>'+(p.executionId?'Run a new generation':'Generate website')+'</button> <button id="setup-api">API settings</button>'+
    '<p id="execution-message" role="status" class="subnote"></p>';
  const button=document.getElementById('run-api');
  document.getElementById('approve-api').onchange=e=>button.disabled=!e.target.checked||!connection?.ready||generationRunning;
  if(!connection?.ready)document.getElementById('execution-message').textContent='Configure the API key, model ID and generation switch in .env first.';
  document.getElementById('setup-api').onclick=()=>{document.getElementById('plan-dialog').close();go('account');};
  document.getElementById('open-generated')?.addEventListener('click',()=>{document.getElementById('plan-dialog').close();openGenerated(p);});
  document.getElementById('download-generated')?.addEventListener('click',()=>download('pixelmorphic-website.html',p.output,'text/html'));
  button.onclick=async()=>{
    if(generationRunning||chatRunning){notify('Wait for the current AI request to finish.');return;}
    if(p.executionId&&!confirm('A previous attempt may already have been billed. Create a NEW paid generation?'))return;
    generationRunning=true;startRequestEffect('code');button.disabled=true;
    const target=document.getElementById('execution-message');target.textContent='Generating… Do not refresh. A timeout may still incur provider charges.';mountGenerationThinking();
    p.executionId=newId();
    if(!state.jobs.some(j=>j.id===p.id))state.jobs.unshift(p);persist();
    try {
      const result=await backend('/api/generate',{brief:p.brief,category:'code',requestId:p.executionId});
      p.output=result.html;p.usage=result.usage;p.model=result.model;p.executionStatus='completed';persist();
      const dialog=document.getElementById('plan-dialog');if(dialog.open)dialog.close();openGenerated(p);
      notify('Website generated. Review it in Code Studio before using it.');
    }catch(err){
      p.executionStatus='failed';persist();target.textContent=err.message+(err.data?.requestId?' Reference: '+err.data.requestId:'');
if (err.data?.error === 'INCOMPLETE_OUTPUT') {
  p.executionStatus = 'incomplete';
  p.partialOutput = err.data.partialOutput || '';
  p.finishReason = err.data.finishReason || 'not reported';
  p.usage = err.data.usage;
  persist();

  document.getElementById('partial-response-box')?.remove();

  const box = document.createElement('div');
  box.id = 'partial-response-box';

  const heading = document.createElement('p');
  heading.textContent =
    'Incomplete draft — finish reason: ' + p.finishReason;

  const code = document.createElement('textarea');
  code.readOnly = true;
  code.setAttribute('aria-label', 'Partial model response');
  code.style.cssText = 'width:100%;height:240px;font-family:monospace;';
  code.value = p.partialOutput || 'No visible text returned.';

  const save = document.createElement('button');
  save.textContent = 'Download partial response (.txt)';
  save.disabled = !p.partialOutput;
  save.onclick = () => download(
    'partial-response.txt', p.partialOutput, 'text/plain'
  );

  box.append(heading, code, save);
  target.after(box);
}
      notify('Job did not finish. Check API logs and provider billing before retrying.');
    }finally{generationRunning=false;endRequestEffect('code');button.disabled=true;await checkConnection();}
  };
};
const connectionButton=document.createElement('button');connectionButton.id='connection-button';connectionButton.textContent='API setup';
connectionButton.onclick=()=>go('account');document.querySelector('.top-actions').prepend(connectionButton);
refreshIntegration();checkConnection();

// Show the actual configured provider.
const previousPaintConnection = paintConnection;

paintConnection = function () {
  previousPaintConnection();

  const panel = document.getElementById('api-connection');
  if (!panel || !connection) return;

  panel.querySelector('h2').textContent =
    connection.provider || 'API provider';

  panel.querySelector('code').textContent =
    connection.baseUrl || 'Not configured';

  panel.querySelector('.info-bar').textContent =
    'Using the configured provider. Model access is verified only by a successful request. Cost estimates are not active.';
};

checkConnection();
// General Chat: same server, same configured model. No sample responses or automatic retries.
const chatStorageKey = 'pixelmorphic-general-chat-v1';
let chats = [], activeChatId = null, chatRunning = false;
const newId = () => globalThis.crypto?.randomUUID?.() || 'pm-'+Date.now()+'-'+Math.random().toString(36).slice(2);
try {
  const saved = JSON.parse(localStorage.getItem(chatStorageKey) || '[]');
  if (Array.isArray(saved)) chats = saved.filter(c => c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages)).slice(0,30);
  for (const c of chats) {
    c.messages = c.messages.filter(m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string');
    for (const m of c.messages) if (m.pending) {m.pending=false;m.failed=true;c.recovery='A request was interrupted by closing or reloading this page. Its billing/result is unknown; inspect API logs before sending another request.';}
  }
} catch { chats=[]; }
activeChatId=chats[0]?.id||null;
function saveChats(){try{localStorage.setItem(chatStorageKey,JSON.stringify(chats.slice(0,30)));}catch{notify('Chat storage is unavailable or full. Export the conversation before closing.');}}
function activeChat(){return chats.find(c=>c.id===activeChatId);}
function createChat(){const c={id:newId(),title:'New conversation',language:'English',messages:[]};chats.unshift(c);chats=chats.slice(0,30);activeChatId=c.id;saveChats();return c;}
function drawChat(){
  const target=document.getElementById('chat-messages');if(!target)return;
  if(!activeChat())createChat();const c=activeChat();
  document.getElementById('chat-model-name').textContent=connection?.model||'Not configured — open API settings';
  const history=document.getElementById('chat-history');history.replaceChildren();
  for(const h of chats){const b=document.createElement('button');b.textContent=h.title;b.title=h.title;b.className=h.id===c.id?'active':'';b.disabled=chatRunning;b.onclick=()=>{activeChatId=h.id;drawChat();};history.append(b);}
  target.replaceChildren();
  if(!c.messages.length){const e=document.createElement('div');e.className='chat-empty';const h=document.createElement('h2');h.textContent='What are you working on?';const p=document.createElement('p');p.textContent='Start with a question. Your conversations stay in this browser.';e.append(h,p);target.append(e);}
  for(const m of c.messages){const a=document.createElement('article');a.className='chat-message '+m.role+(m.error?' error':'');const label=document.createElement('small');label.textContent=m.role==='user'?'You'+(m.failed?' · not completed':''):m.error?'Request not completed':m.model||'Pixelmorphic AI';const p=document.createElement('p');p.textContent=m.content;a.append(label,p);if(m.truncated){const note=document.createElement('small');note.textContent='Output reached the response limit. Ask a focused follow-up to continue.';a.append(document.createElement('br'),note);}if(m.usage){const note=document.createElement('small');note.textContent=usageText(m.usage);a.append(document.createElement('br'),note);}if(m.role==='assistant'&&!m.error){const copy=document.createElement('button');copy.textContent='Copy answer';copy.onclick=async()=>{try{await navigator.clipboard.writeText(m.content);notify('Answer copied.');}catch{notify('Select the answer text and copy it manually.');}};a.append(copy);}target.append(a);}
  if(chatRunning)target.append(createThinkingPanel('chat'));
  if(c.recovery){const e=document.createElement('p');e.className='error';e.textContent=c.recovery;target.append(e);}
  document.getElementById('chat-language').value=c.language||'English';
  document.getElementById('chat-language').disabled=chatRunning;
  document.getElementById('chat-send').disabled=chatRunning;
  document.getElementById('chat-new').disabled=chatRunning;
  document.getElementById('chat-input').disabled=chatRunning;
  target.scrollTop=target.scrollHeight;
}
function chatContext(c,text){let context=c.messages.filter(m=>!m.error&&!m.failed&&!m.pending).map(m=>({role:m.role,content:m.content.slice(0,6000)}));context=context.slice(-22);context.push({role:'user',content:text});while(context.length>1&&context.reduce((n,m)=>n+m.content.length,0)>18000)context.splice(0,2);return context;}
async function sendChat(event){
  event.preventDefault();if(chatRunning||generationRunning){notify('Wait for the current AI request to finish.');return;}
  const input=document.getElementById('chat-input'),text=input.value.trim();if(!text)return;
  if(!connection?.ready){await checkConnection();if(!connection?.ready){document.getElementById('chat-status').textContent='Server or generation is not ready. Open API settings and check your existing .env configuration.';return;}}
  if(connection.chatEnabled!==true){document.getElementById('chat-status').textContent='This server does not support General Chat yet. Apply the matching server.mjs update and restart it.';return;}
  const c=activeChat()||createChat();c.language=document.getElementById('chat-language').value;
  const body={requestId:newId(),language:c.language,messages:chatContext(c,text)};
  const user={role:'user',content:text,pending:true};c.messages.push(user);c.recovery='';if(c.title==='New conversation')c.title=text.slice(0,44);
  saveChats();chatRunning=true;startRequestEffect('chat');input.value='';drawChat();document.getElementById('chat-status').textContent='Generating one response. Provider charges apply. No automatic retry.';
  try{const data=await backend('/api/chat',body);if(typeof data.text!=='string'||!data.text.trim())throw new Error('The server returned no visible answer.');user.pending=false;c.messages.push({role:'assistant',content:data.text,model:data.model,usage:data.usage,truncated:data.truncated});if(current==='chat')document.getElementById('chat-status').textContent=(data.truncated?'Response reached its output limit. ':'Response received. ')+usageText(data.usage)+' · Cost: check provider dashboard.';}
  catch(err){user.pending=false;user.failed=true;c.messages.push({role:'assistant',error:true,content:err.message+'\nNo automatic retry was sent. Check API logs/provider billing before a new paid attempt.'});if(current==='chat')document.getElementById('chat-status').textContent='Request failed. Your message and error are saved; a new Send creates a new request.';}
  finally{chatRunning=false;endRequestEffect('chat');saveChats();if(current==='chat')drawChat();await checkConnection();}
}
function setupChat(){if(current!=='chat')return;drawChat();document.getElementById('chat-export').onclick=()=>download('pixelmorphic-chat.json',JSON.stringify(activeChat(),null,2),'application/json');document.getElementById('chat-form').onsubmit=sendChat;document.getElementById('chat-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('chat-form').requestSubmit();}};document.getElementById('chat-new').onclick=()=>{if(chatRunning)return;createChat();drawChat();document.getElementById('chat-input').value='';document.getElementById('chat-input').focus();};document.getElementById('chat-language').onchange=e=>{activeChat().language=e.target.value;saveChats();};}
const previousRefreshIntegration=window.refreshIntegration;
window.refreshIntegration=function(){previousRefreshIntegration();setupChat();};
setupChat();


// Silver workspace effects: waiting state reflects actual network activity only.
let activeRequestEffect = null;
let effectTimer = null;
function createThinkingPanel(kind){
  const panel=document.createElement('div');panel.className='thinking-panel';panel.setAttribute('role','status');
  const orbit=document.createElement('span');orbit.className='thinking-orbit';orbit.setAttribute('aria-hidden','true');
  const copy=document.createElement('div');copy.className='thinking-copy';
  const title=document.createElement('strong');title.textContent=kind==='code'?'Creating your website':'Thinking';
  const dots=document.createElement('span');dots.className='thinking-dots';dots.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)dots.append(document.createElement('i'));title.append(dots);
  const note=document.createElement('p');note.textContent=kind==='code'?'Waiting for your configured model. No automatic retries.':'Waiting for your configured model.';
  const elapsed=document.createElement('span');elapsed.className='thinking-elapsed';elapsed.setAttribute('aria-hidden','true');elapsed.textContent=elapsedTime();
  copy.append(title,note);panel.append(orbit,copy,elapsed);return panel;
}
function elapsedTime(){return activeRequestEffect?Math.floor((Date.now()-activeRequestEffect.started)/1000)+'s elapsed':'0s elapsed';}
function startRequestEffect(kind){
  activeRequestEffect={kind,started:Date.now()};clearInterval(effectTimer);
  effectTimer=setInterval(()=>{document.querySelectorAll('.thinking-elapsed').forEach(el=>el.textContent=elapsedTime());},1000);
  updateStudioActivity();
}
function endRequestEffect(kind){
  if(activeRequestEffect?.kind!==kind)return;
  activeRequestEffect=null;clearInterval(effectTimer);effectTimer=null;
  document.querySelectorAll('.generation-thinking').forEach(el=>el.remove());updateStudioActivity();
}
function mountGenerationThinking(){
  const target=document.getElementById('execution-message');if(!target||document.getElementById('generation-thinking'))return;
  const box=document.createElement('div');box.id='generation-thinking';box.className='generation-thinking';box.append(createThinkingPanel('code'));target.before(box);
}
function updateStudioActivity(){document.querySelector('.studio')?.classList.toggle('is-generating',activeRequestEffect?.kind==='code');}
function setupStudioEffects(){
  if(current!=='code')return;const editor=document.getElementById('code');if(!editor)return;
  const gutter=document.getElementById('line-gutter'),stats=document.getElementById('code-stats'),cursor=document.getElementById('code-cursor'),saveState=document.getElementById('code-state');
  function position(){const before=editor.value.slice(0,editor.selectionStart);const lines=before.split('\n');cursor.textContent='Ln '+lines.length+', Col '+(lines.at(-1).length+1);}
  function metrics(){const count=editor.value.split('\n').length;gutter.textContent=Array.from({length:count},(_,i)=>i+1).join('\n');stats.textContent=count+(count===1?' line · ':' lines · ')+editor.value.length.toLocaleString()+' characters';position();}
  editor.addEventListener('input',()=>{metrics();saveState.textContent='Unsaved';saveState.classList.add('unsaved');});
  editor.addEventListener('scroll',()=>{gutter.scrollTop=editor.scrollTop;});
  editor.addEventListener('click',position);editor.addEventListener('keyup',position);
  editor.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();preview();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();document.getElementById('save-code').click();}});
  document.getElementById('save-code').addEventListener('click',()=>{queueMicrotask(()=>{saveState.textContent=storageAvailable?'Saved locally':'Not saved';saveState.classList.toggle('unsaved',!storageAvailable);});});
  metrics();updateStudioActivity();
}
const refreshWithChat=window.refreshIntegration;
window.refreshIntegration=function(){refreshWithChat();setupStudioEffects();};
document.getElementById('open-pricing').onclick=()=>document.getElementById('pricing-dialog').showModal();
document.getElementById('pricing-account').onclick=()=>{document.getElementById('pricing-dialog').close();go('account');};
setupStudioEffects();
