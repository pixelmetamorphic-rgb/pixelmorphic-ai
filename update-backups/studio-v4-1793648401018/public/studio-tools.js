// Static website workspace: local versions, viewport controls and explicit paid revisions.
(() => {
  const el=id=>document.getElementById(id);
  const uid=()=>newId();
  let viewport='full',running=false;
  const benchmarks=[
    {id:'forma',name:'Benchmark 1 · Forma Architecture Studio',brief:'Build a polished, responsive single-page website for a fictional architecture studio called “Forma”. Clearly label it “Demo studio”.\n\nDesign: warm ivory background, charcoal text, muted terracotta accents, editorial typography and generous spacing. Create architectural illustrations using inline SVG inside responsive wrappers marked data-studio-art.\n\nInclude:\n1. Compact navigation linking to Projects, Approach and Contact.\n2. A distinctive two-column hero that stacks on mobile.\n3. Exactly three project cards with clearly labelled sample details.\n4. A short design approach section.\n5. Contact section with [Email] and [Location] placeholders.\n6. A simple footer.\n\nRequirements: self-contained HTML and CSS only. No JavaScript, forms or external resources. Do not invent awards, testimonials or client counts. All navigation and call-to-action links must point to existing sections. Support 320, 390, 768 and 1280px without overlaps or horizontal scrolling. Do not hide page overflow to conceal layout problems. Return the complete HTML document.'},
    {id:'ecommerce',name:'Benchmark 2 · Artisanal Ceramic Shop Landing',brief:'Build a responsive single-page website for a fictional ceramic tableware studio called “Kama Clay”. Clearly label it “Demo studio”.\n\nDesign: warm sand background, deep espresso text, forest-green solid CTA buttons with >=4.5:1 contrast, and inline SVG pottery illustrations inside responsive wrappers marked data-studio-art.\n\nInclude:\n1. Compact header linking to Collection, Craft and Contact.\n2. Two-column hero with a concise 6–10 word headline and SVG vessel illustration.\n3. Exactly three project cards (.project-card) showcasing sample ceramic pieces with explicit Sample project labels and [Price] placeholders.\n4. A short craft process section.\n5. Contact section with [Email] and [Location] placeholders.\n6. Simple footer.\n\nRequirements: self-contained HTML and CSS only. No JavaScript, forms or external resources. Support 320, 390, 768 and 1280px without horizontal scrolling or overflow-x:hidden.'},
    {id:'dashboard',name:'Benchmark 3 · Static Operations Dashboard Mockup',brief:'Build a responsive static HTML/CSS operations dashboard mockup for a fictional logistics platform called “PulseGrid”. Clearly label it “Demo studio”.\n\nDesign: crisp light-slate canvas, deep navy text, high-contrast emerald solid action links (>=4.5:1 contrast), and inline SVG chart illustrations inside responsive wrappers marked data-studio-art.\n\nInclude:\n1. Compact top bar linking to Overview, Shipments and Contact.\n2. Two-column hero summary with a concise headline and an inline SVG throughput chart.\n3. Exactly three project cards (.project-card) representing sample regional hubs with explicit Sample project labels and [Hub Metric] placeholders.\n4. A methodology/notes section.\n5. Contact/owner section with [Email] and [Location] placeholders.\n6. Simple footer.\n\nRequirements: self-contained HTML and CSS only. No JavaScript, forms or external resources. Support 320, 390, 768 and 1280px without horizontal scrolling or overflow-x:hidden.'}
  ];
  const versions=()=>state.studioVersions||(state.studioVersions=[]);
  function snapshot(label,html,jobId){
    if(!html.trim())return;
    const v={id:uid(),label:label.slice(0,100),html,jobId:jobId||null,date:new Date().toISOString()};
    versions().unshift(v);state.studioVersions=versions().slice(0,30);persist();return v;
  }
  function currentJob(html){return window.studioCurrentJob(html)||state.jobs.find(j=>j.id===state.activeStudioJobId)||null;}
  function setCode(html,jobId){state.code=html;state.activeStudioJobId=jobId===undefined?(state.jobs.find(j=>j.output===html)?.id||null):jobId;persist();const editor=el('code');if(!editor)return;editor.value=html;editor.dispatchEvent(new Event('input',{bubbles:true}));window.studioPaintReport(currentJob(html),html);if(el('studio-projects'))el('studio-projects').value=state.activeStudioJobId||'';if(el('code-state')){el('code-state').textContent=storageAvailable?'Saved locally':'Not saved';el('code-state').classList.toggle('unsaved',!storageAvailable);}preview();}
  function projectOptions(){const s=el('studio-projects');if(!s)return;s.replaceChildren(new Option('Choose a generated project…',''));for(const j of state.jobs.filter(j=>j.output))s.add(new Option(j.title,j.id));if(state.activeStudioJobId)s.value=state.activeStudioJobId;}
  function versionOptions(){const s=el('studio-versions');if(!s)return;s.replaceChildren(new Option('Choose a saved version…',''));for(const v of versions())s.add(new Option(v.label+' · '+new Date(v.date).toLocaleString(),v.id));}
  function setStatus(text){if(el('studio-status'))el('studio-status').textContent=text;}
  function lock(on){running=on;for(const id of ['studio-revise','studio-runchecks','studio-quickfix','studio-restore','studio-snapshot','studio-load','studio-instructions','studio-consent','studio-repair','studio-projects','studio-versions','studio-import','studio-benchmark','studio-run-benchmark'])if(el(id))el(id).disabled=on;if(el('code'))el('code').readOnly=on;}
  function renderLocalChecks(checks){const box=el('studio-check-results');if(!box)return;box.replaceChildren();const heading=document.createElement('strong');heading.textContent='Local checks · current draft';box.append(heading);const list=document.createElement('ul');for(const c of checks){const li=document.createElement('li');li.textContent=c.status.toUpperCase()+' · '+c.id+' — '+c.detail;list.append(li);}box.append(list);}
  async function runChecks(){
    if(running||generationRunning||chatRunning)return;
    const html=el('code').value;lock(true);setStatus('Checking four screen widths…');
    try{let p=currentJob(html);if(!p||p.output!==html){p={id:uid(),executionId:uid(),title:'Checked editor draft',brief:p?.brief||'',category:'code',preference:p?.preference||'Balanced',formats:p?.formats||'HTML + CSS',files:Array.isArray(p?.files)?[...p.files]:[],tools:Array.isArray(p?.tools)?[...p.tools]:[...(state.tools||[])],steps:Array.isArray(p?.steps)&&p.steps.length?p.steps:[['Check current draft','Run local browser checks on the current HTML/CSS draft.']],output:html,stages:[],created:new Date().toISOString()};state.jobs.unshift(p);state.activeStudioJobId=p.id;projectOptions();}const checks=await window.studioCheckProject(p);if(el('code')?.value===html){renderLocalChecks(checks);window.studioPaintReport(p,html);setStatus('Local checks complete. No model call made.');}}
    catch(e){setStatus(e.message);}finally{lock(false);}
  }
  async function quickFixDraft(){
    if(running||generationRunning||chatRunning)return;
    const original=el('code').value;if(!original.trim())return;
    const source=currentJob(original);
    let fixed=original;
    fixed=fixed.replace(/<span\s+id=["']year["']\s*><\/span>/gi,'2026');
    fixed=fixed.replace(/\s*<script\b[\s\S]*?<\/script>/gi,'');
    fixed=fixed.replace(/overflow-x\s*:\s*(?:hidden|clip)\s*;?/gi,'');
    fixed=fixed.replace(/href=["']mailto:[^"']*["']/gi,'href="#contact"');
    fixed=fixed.replace(/grid-template-columns\s*:\s*minmax\([^;]+\)\s+minmax\([^;]+\)\s+minmax\([^;]+\)\s*;/gi,'grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));');
    fixed=fixed.replace(/minmax\(\s*(?:280|300|320)px\s*,\s*1fr\s*\)/gi,'minmax(min(100%, 260px), 1fr)');
    if(!fixed.includes('id="studio-responsive-guard"')&&/<\/head>/i.test(fixed)){
      fixed=fixed.replace(/<\/head>/i,'  <style id="studio-responsive-guard">@media(max-width:768px){.projects-grid,.hero,.hero-inner,.hero-grid,.approach-grid,.craft-process,.contact-container{grid-template-columns:minmax(0,1fr)!important}.nav,.nav-inner,.header-inner,.nav-links,nav ul{flex-wrap:wrap!important;gap:8px!important;height:auto!important}.nav{padding:10px 0!important}.nav-links a{padding:6px 8px!important;font-size:0.9rem!important}}@media(max-width:480px){:root{--spacing-md:1rem!important}}</style>\n</head>');
    }
    if(fixed===original){setStatus('No common static/responsive defects found to quick-fix. Running free checks…');await runChecks();return;}
    snapshot('Before free quick-fix',original,source?.id);
    const p={id:uid(),executionId:uid(),title:(source?.title||'Draft')+' · quick-fixed',brief:source?.brief||'',category:'code',preference:source?.preference||'Balanced',formats:source?.formats||'HTML + CSS',files:Array.isArray(source?.files)?[...source.files]:[],tools:Array.isArray(source?.tools)?[...source.tools]:[...(state.tools||[])],steps:[['Free local quick-fix','Removed disallowed script/overflow-x masking and applied 320px/768px responsive grid guards.']],output:fixed,stages:source?.stages||[],created:new Date().toISOString()};
    state.jobs.unshift(p);setCode(fixed,p.id);projectOptions();versionOptions();
    await runChecks();
    setStatus('Applied free static & mobile CSS quick-fix and re-checked (0 API calls). Previous draft saved in Version history.');
  }
  async function revise(){
    if(running||generationRunning||chatRunning)return;
    if(connection?.studioVersion!==4){notify('Apply the matching server update, restart and refresh first.');return;}
    const html=el('code').value,change=el('studio-instructions').value.trim();
    if(!change){notify('Describe the change you want.');return;}
    if(!el('studio-consent').checked){notify('Accept the one-call provider usage before requesting an edit.');return;}
    const allowRepair=el('studio-repair').checked;
    const source=currentJob(html);
    const brief=source?.brief||'Revise the supplied static HTML/CSS website, preserving unrelated content and layout.';
    if(brief.length+change.length>5800){notify('Revision history is long. Export the current HTML and import it as a fresh draft before continuing.');return;}
    snapshot('Before edit · '+change.slice(0,60),html,source?.id);
    const p={id:uid(),title:'Edit · '+change.slice(0,65),brief:brief+'\nLATEST CHANGE: '+change,category:'code',preference:source?.preference||'Balanced',formats:source?.formats||'HTML + CSS',files:[],tools:[...(state.tools||[])],steps:[['Revise draft','Apply requested change to the current HTML/CSS draft.'],['Check layout','Validate responsive widths and static scope in the browser.']],modeId:'morphic-code-ultra',created:new Date().toISOString(),parentId:source?.id||null,workflowHistory:[],executionId:uid()};
    state.jobs.unshift(p);persist();lock(true);generationRunning=true;setStatus('Applying your change · one coding call. Your previous version is saved.');
    let alive=true,polling=false;
    const timer=setInterval(async()=>{if(polling||!alive)return;polling=true;try{const s=await backend('/api/ultra/status?id='+encodeURIComponent(p.executionId));if(alive&&s.phase==='revise')setStatus('Editing the supplied code…');}catch{}finally{polling=false}},1500);
    try{
      let j=await backend('/api/ultra',{action:'revise',requestId:p.executionId,brief,change,html,review:false,allowRepair});
      p.workflow=j;p.output=j.html;p.stages=j.stages;p.usage=j.usage;p.requirements=j.requirements;persist();
      setStatus('Edit received. Checking four widths and artwork bounds…');
      const checks=await window.studioBrowserChecks({...j,brief:p.brief});
      j=await backend('/api/ultra',{action:'record',requestId:p.executionId,version:j.version,artifactHash:j.artifactHash,checks});
      Object.assign(p,{workflow:j,output:j.html,stages:j.stages,usage:j.usage,requirements:j.requirements,executionStatus:j.phase});p.workflowHistory.push({version:j.version,artifactHash:j.artifactHash,report:j.report});persist();
      if(j.phase==='needs_attention'&&j.repairAllowed){
        snapshot('Before bounded repair',j.html,p.id);
        setStatus('Repairing measured layout failures · one extra call you allowed.');
        j=await backend('/api/ultra',{action:'repair',requestId:p.executionId,version:j.version,artifactHash:j.artifactHash});
        Object.assign(p,{workflow:j,output:j.html,stages:j.stages,usage:j.usage});persist();
        const repairedChecks=await window.studioBrowserChecks({...j,brief:p.brief});
        j=await backend('/api/ultra',{action:'record',requestId:p.executionId,version:j.version,artifactHash:j.artifactHash,checks:repairedChecks});
        Object.assign(p,{workflow:j,output:j.html,stages:j.stages,usage:j.usage,executionStatus:j.phase});
        p.workflowHistory.push({version:j.version,artifactHash:j.artifactHash,report:j.report});persist();
      }
      snapshot('AI edit · '+change.slice(0,65),j.html,p.id);if(current!=='code'||el('code')?.value!==html){notify('Your edited website is saved in Projects. Your current editor was preserved.');return;}setCode(j.html,p.id);window.studioPaintReport(p,j.html);versionOptions();el('studio-instructions').value='';
      setStatus(j.phase==='checks_passed'?'Edit saved. Review the visual result and original brief.':'Edit needs attention. Inspect the report or restore your saved version; no further call will run.');
    }catch(e){
      p.executionStatus='failed';p.workflowError=e.message;if(e.data?.job){p.workflow=e.data.job;p.stages=e.data.job.stages;p.usage=e.data.job.usage;}persist();
      setStatus(e.message+' No automatic retry. Original editor draft remains available.');
    }finally{alive=false;clearInterval(timer);generationRunning=false;lock(false);if(el('studio-consent'))el('studio-consent').checked=false;versionOptions();projectOptions();await checkConnection();}
  }
  function attach(){
    if(current!=='code'||!el('code')||el('studio-workbench'))return;
    const style=document.createElement('style');style.textContent=`.studio-workbench{margin:16px 0 24px;padding:22px;border:1px solid #cbd8cd;border-radius:16px;background:#f4f7f1}.studio-workbench h2{margin:0 0 8px}.studio-workbench p{font-size:13px;color:#5e7467}.studio-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:22px}.studio-workbench textarea,.studio-workbench select{width:100%;font:inherit;border:1px solid #b6cabc;border-radius:10px;background:#fff;color:#173d30;padding:11px}.studio-workbench textarea{min-height:90px;resize:vertical}.studio-workbench label{display:block;font-size:12px;margin:10px 0}.studio-workbench input[type=checkbox]{accent-color:#215a3f}.studio-workbench .actions{margin:12px 0;flex-wrap:wrap}.studio-screenbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.studio-screenbar button[aria-pressed=true]{background:#173f30;color:white}.studio-workbench details{font-size:12px}.preview-pane{overflow:auto}#code-preview{display:block;margin:0 auto}#studio-status{min-height:22px;font-size:13px;color:#244e38}#studio-check-results{max-height:250px;overflow:auto;font-size:12px}#studio-check-results:empty{display:none}@media(max-width:800px){.studio-grid{grid-template-columns:1fr}.studio-workbench{padding:15px}.studio-screenbar button{padding:8px}}`;
    const panel=document.createElement('section');panel.id='studio-workbench';panel.className='studio-workbench';
    panel.innerHTML='<div class="eyebrow">CODE STUDIO · QUALITY WORKFLOW 4</div><h2 style="margin-top:8px">Keep building on your best version.</h2><p>Static HTML/CSS workspace · scripts and network access stay disabled in preview.</p><div class="studio-grid"><div><label for="studio-instructions">What should change?</label><textarea id="studio-instructions" maxlength="2500" placeholder="Make the hero more editorial, keep the green palette, and preserve all three cards."></textarea><label><input type="checkbox" id="studio-consent"> Send this draft to the configured coding engine. One paid edit call; no automatic retry.</label><label><input type="checkbox" id="studio-repair"> Allow one extra paid repair only if automated checks fail (maximum 2 calls total).</label><div class="actions"><button class="primary" id="studio-revise">Apply AI edit ↗</button><button id="studio-runchecks">Run checks · free</button><button id="studio-quickfix">Quick-fix static &amp; 320px · free</button></div></div><div><label for="studio-projects">Generated projects</label><select id="studio-projects"><option value="">Choose a generated project…</option></select><div class="actions"><button id="studio-load">Open project</button><button id="studio-import">Import HTML</button><input type="file" id="studio-file" accept=".html,.htm,text/html" hidden></div><label for="studio-versions">Version history · latest 30 saved in this browser</label><select id="studio-versions"></select><div class="actions"><button id="studio-snapshot">Save version</button><button id="studio-restore">Restore version</button></div><label for="studio-benchmark">Repeatable benchmark suite</label><select id="studio-benchmark">'+benchmarks.map(b=>'<option value="'+b.id+'">'+b.name+'</option>').join('')+'</select><div class="actions"><button id="studio-run-benchmark">Load benchmark into planner ↗</button></div></div></div><div id="studio-status" role="status" aria-live="polite">Ready. Save a version before experimenting.</div><div id="studio-check-results"></div>';
    panel.prepend(style);document.querySelector('.studio').before(panel);
    const screens=document.createElement('div');screens.className='studio-screenbar';screens.innerHTML='<span class="tag">PREVIEW WIDTH</span>'+['full','320','390','768','1280'].map(w=>'<button data-width="'+w+'" aria-pressed="'+(viewport===w)+'">'+(w==='full'?'Fit pane':w+' px')+'</button>').join('');document.querySelector('.studio').before(screens);
    function size(){const frame=el('code-preview');frame.style.width=viewport==='full'?'100%':viewport+'px';frame.style.maxWidth=viewport==='full'?'100%':'none';frame.style.minWidth=viewport==='full'?'0':viewport+'px';}
    size();screens.onclick=e=>{const b=e.target.closest('[data-width]');if(!b)return;viewport=b.dataset.width;for(const x of screens.querySelectorAll('button'))x.setAttribute('aria-pressed',String(x===b));size();};
    el('code').addEventListener('input',()=>{el('studio-check-results')?.replaceChildren();setStatus('Draft changed. Run free checks for this version.');});
    projectOptions();
    versionOptions();el('studio-revise').onclick=revise;el('studio-runchecks').onclick=runChecks;el('studio-quickfix').onclick=quickFixDraft;
    el('studio-repair').onchange=()=>el('studio-consent').checked=false;
    el('studio-instructions').oninput=()=>el('studio-consent').checked=false;
    el('studio-snapshot').onclick=()=>{const html=el('code').value;snapshot('Manual snapshot',html,currentJob(html)?.id);versionOptions();if(el('code-state')){el('code-state').textContent=storageAvailable?'Version saved':'Not saved';}setStatus('Version saved locally. Download HTML for an external backup.');};
    el('studio-restore').onclick=()=>{const v=versions().find(v=>v.id===el('studio-versions').value);if(!v){notify('Choose a version first.');return;}snapshot('Before restore',el('code').value,currentJob(el('code').value)?.id);setCode(v.html,v.jobId);versionOptions();setStatus('Saved version restored. No model call made.');};
    el('studio-load').onclick=()=>{const p=state.jobs.find(p=>p.id===el('studio-projects').value&&p.output);if(!p){notify('Choose a generated project first.');return;}snapshot('Before project switch',el('code').value,currentJob(el('code').value)?.id);setCode(p.output,p.id);if(p.workflow)window.studioPaintReport(p,p.output);versionOptions();setStatus('Project opened. Current editor draft was saved as a version.');};
    el('studio-import').onclick=()=>el('studio-file').click();el('studio-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>120000)throw Error('Import supports HTML files up to 120 KB.');const html=await f.text();if(!/<html[\s>]/i.test(html)||!/<\/html>\s*$/i.test(html))throw Error('Choose a complete HTML document.');snapshot('Before import',el('code').value,currentJob(el('code').value)?.id);setCode(html,null);versionOptions();setStatus('HTML imported into the restricted preview. Run checks before editing.');}catch(e){notify(e.message);}finally{e.target.value='';}};
    el('studio-run-benchmark').onclick=()=>{const b=benchmarks.find(x=>x.id===el('studio-benchmark').value)||benchmarks[0];const p=createPlan(b.brief,'code','Balanced',[]);p.title=b.name;showPlan(p);};
    el('code').addEventListener('input',()=>{el('studio-check-results').replaceChildren();});
    el('save-code').addEventListener('click',()=>{snapshot('Saved editor draft',el('code').value,currentJob(el('code').value)?.id);versionOptions();});
  }
  const prev=window.refreshIntegration;window.refreshIntegration=function(){prev();attach();};attach();
})();
