// Code Ultra vertical slice. Generated documents never receive allow-scripts.
// Browser observations are local-owner evidence, not server-attested customer billing records.
(() => {
  const baseIds=['title','lang','viewport-meta','main','h1','image-alt','internal-links','static-scope','viewport-320','viewport-390','viewport-768','viewport-1280'];
  const names={title:'Document title',lang:'Document language','viewport-meta':'Viewport metadata',main:'Main landmark',h1:'Primary heading','image-alt':'Image alt attributes','internal-links':'Internal link targets','static-scope':'Static HTML/CSS scope','viewport-320':'320 px horizontal overflow','viewport-768':'768 px horizontal overflow','viewport-390':'390 px horizontal overflow','viewport-1280':'1280 px horizontal overflow'};
  const label=id=>names[id]||id;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function message(text){const node=document.getElementById('execution-message');if(node)node.textContent=text;const animated=document.querySelector('#generation-thinking .thinking-copy p');if(animated)animated.textContent=text;}
  function entry(id,ok,detail){return {id,status:ok?'pass':'fail',detail:String(detail).slice(0,300)};}
  async function loadFrame(html,width){
    const frame=document.createElement('iframe');frame.title='Code Ultra '+width+' px static validation';frame.setAttribute('sandbox','allow-same-origin');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    frame.style.cssText='position:fixed;left:-100000px;top:0;width:'+width+'px;height:800px;border:0;pointer-events:none;opacity:0;';
    const ready=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{frame.remove();reject(new Error('Browser frame did not load within 6 seconds.'));},6000);
      frame.onload=()=>{try{if(frame.contentDocument?.URL!=='about:srcdoc')return;clearTimeout(timer);resolve();}catch{clearTimeout(timer);frame.remove();reject(new Error('Browser prevented validation access.'));}};
    });
    frame.srcdoc='<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; connect-src \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\';">'+html.replace(/^\s*<!doctype[^>]*>/i,'');
    document.body.append(frame);await ready;
    const style=frame.contentDocument.createElement('style');style.textContent='*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';frame.contentDocument.head.append(style);
    await wait(150);return frame;
  }
  async function browserChecks(job){
    const checks=[];let frame;
    try{
      frame=await loadFrame(job.html,1280);const doc=frame.contentDocument;
      const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&frame.contentWindow.getComputedStyle(el).display!=='none'&&frame.contentWindow.getComputedStyle(el).visibility==='visible';};
      checks.push(entry('title',!!doc.title.trim(),doc.title.trim()?'Title is present.':'Missing a descriptive title.'));
      checks.push(entry('lang',!!doc.documentElement.lang.trim(),'HTML lang: '+(doc.documentElement.lang||'missing')));
      checks.push(entry('viewport-meta',!!doc.querySelector('meta[name="viewport"]')?.content?.includes('width=device-width'),'Viewport must include width=device-width.'));
      checks.push(entry('main',Array.from(doc.querySelectorAll('main')).some(visible),'Visible main elements: '+Array.from(doc.querySelectorAll('main')).filter(visible).length));
      checks.push(entry('h1',Array.from(doc.querySelectorAll('h1')).filter(visible).length===1,'Visible h1 elements: '+Array.from(doc.querySelectorAll('h1')).filter(visible).length));
      const missingAlt=doc.querySelectorAll('img:not([alt])').length;checks.push(doc.querySelector('img')?entry('image-alt',missingAlt===0,'Images missing alt: '+missingAlt+'. Alt meaning requires human review.'):{id:'image-alt',status:'not_applicable',detail:'No image elements to inspect.'});
      const broken=Array.from(doc.querySelectorAll('a[href^="#"]')).filter(a=>{try{const id=decodeURIComponent(a.getAttribute('href').slice(1));return !id||!doc.getElementById(id);}catch{return true;}});
      checks.push(doc.querySelector('a[href^="#"]')?entry('internal-links',broken.length===0,'Missing or empty fragment targets: '+broken.length):{id:'internal-links',status:'not_applicable',detail:'No fragment links to inspect.'});
      const elements=Array.from(doc.querySelectorAll('*'));
      const active=doc.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv="refresh" i],link[href],form').length;
      const handlers=elements.some(el=>Array.from(el.attributes).some(a=>/^on/i.test(a.name)||/^javascript:/i.test(a.value.trim())));
      const resources=doc.querySelector('[srcset]')!==null||Array.from(doc.querySelectorAll('img[src],source[src],video[src],audio[src],image[href],video[poster],use[href]')).some(el=>{const ref=el.getAttribute('src')||el.getAttribute('href')||el.getAttribute('poster')||'';return !/^data:/i.test(ref)&&!(el.tagName.toLowerCase()==='use'&&ref.startsWith('#'));});
      const css=Array.from(doc.querySelectorAll('style')).map(el=>el.textContent).concat(elements.map(el=>el.getAttribute('style')||'')).join('\n');
      const externalCss=/@import\b|url\(\s*['"]?(?!data:)[^)'"\s]/i.test(css);
      checks.push(entry('static-scope',!active&&!handlers&&!resources&&!externalCss,'Disallowed active elements: '+active+'; event/script attributes: '+handlers+'; external resources: '+(resources||externalCss)+'. Scripts and requests were blocked during checks.'));
      for(const c of job.requirements.checks){
        const absence=c.exactCount===0||c.maxCount===0;
        const found=Array.from(doc.querySelectorAll(c.selector)).filter(el=>absence||visible(el));
        const matching=c.textIncludes?found.filter(el=>el.textContent.toLowerCase().includes(c.textIncludes.toLowerCase())):found;
        const ok=c.exactCount!==undefined?matching.length===c.exactCount:matching.length>=c.minCount&&(c.maxCount===undefined||matching.length<=c.maxCount);
        const expected=c.exactCount!==undefined?'exactly '+c.exactCount:'minimum '+c.minCount+(c.maxCount===undefined?'':', maximum '+c.maxCount);
        checks.push(entry(c.id,ok,c.label+': '+matching.length+' matching '+(absence?'DOM':'visible')+' elements; expected '+expected+'. Structural evidence only.'));
      }
      const overflow=()=>Math.max(doc.documentElement.scrollWidth,doc.body?.scrollWidth||0)>doc.documentElement.clientWidth+2;
      checks.push(entry('viewport-1280',!overflow(),'Client width '+doc.documentElement.clientWidth+' px; document scroll width '+Math.max(doc.documentElement.scrollWidth,doc.body?.scrollWidth||0)+' px.'));
      frame.remove();frame=null;
      for(const width of [320,390,768]){
        frame=await loadFrame(job.html,width);const mobile=frame.contentDocument;
        const scroll=Math.max(mobile.documentElement.scrollWidth,mobile.body?.scrollWidth||0),client=mobile.documentElement.clientWidth;
        checks.push(entry('viewport-'+width,scroll<=client+2,'Client width '+client+' px; document scroll width '+scroll+' px.'));
        frame.remove();frame=null;
      }
    }catch(e){for(const id of [...baseIds,...job.requirements.checks.map(c=>c.id)])if(!checks.some(c=>c.id===id))checks.push({id,status:'not_run',detail:String(e.message).slice(0,300)});}
    finally{frame?.remove();}
    return checks;
  }
  function addLine(parent,tag,text){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
  function saveJob(p,j){
    p.workflow=j;p.requirements=j.requirements;p.stages=j.stages;p.usage=j.usage;p.model=j.model;p.executionStatus=j.phase;
    if(j.html)p.output=j.html;persist();
  }
  function showNeedsInput(p,j){
    message(j.requirements?.clarification||'This job requires capabilities outside the static HTML/CSS workflow.');
    const area=document.getElementById('execution-controls');const details=document.createElement('div');
    addLine(details,'h3',j.phase==='scope_limit'?'Scope needs a different workflow':'One detail needed');
    for(const r of j.requirements?.requirements||[])addLine(details,'p',r);
    const edit=addLine(details,'button','Edit brief');edit.onclick=()=>{document.getElementById('plan-dialog').close();go('home');setTimeout(()=>{const input=document.getElementById('brief');if(input){input.value=p.brief;input.focus();}},30);};area.append(details);
  }
  window.runUltraJob=async(p,options)=>{
    if(generationRunning||chatRunning)return;
    if(connection?.studioVersion!==2){notify('Apply the matching server update and restart first.');return;}
    generationRunning=true;startRequestEffect('code');mountGenerationThinking();p.modeId='morphic-code-ultra';p.executionId=newId();p.workflowHistory=[];p.workflowError=null;p.workflowOptions=options;
    if(!state.jobs.some(j=>j.id===p.id))state.jobs.unshift(p);persist();
    for(const id of ['run-api','code-mode','code-review','code-repair','approve-api']){const el=document.getElementById(id);if(el)el.disabled=true;}
    const phases={understand:'Understanding your intent and requirements…',implement:'Building from your original brief and requirements…',review:'Independent model review…',repair:'Repairing failed browser checks…'};
    let polling=false,alive=true;
    const timer=setInterval(async()=>{if(polling||!alive)return;polling=true;try{const status=await backend('/api/ultra/status?id='+encodeURIComponent(p.executionId));if(alive&&phases[status.phase])message(phases[status.phase]);}catch{}finally{polling=false;}},1500);
    try{
      message('Understanding your brief, then building the website…');
      let j=await backend('/api/ultra',{action:'start',requestId:p.executionId,brief:p.brief,...options});saveJob(p,j);
      if(['needs_clarification','scope_limit'].includes(j.phase)){showNeedsInput(p,j);return;}
      async function checkAndRecord(){
        message('Checking layouts at 320, 390, 768 and 1280 px…');
        const checks=await browserChecks(j);
        j=await backend('/api/ultra',{action:'record',requestId:p.executionId,version:j.version,artifactHash:j.artifactHash,checks});
        p.workflowHistory.push({version:j.version,artifactHash:j.artifactHash,report:j.report});saveJob(p,j);
      }
      await checkAndRecord();
      if(j.phase==='needs_attention'&&j.repairAllowed){
        message('Repairing concrete browser-check failures — one attempt maximum…');
        j=await backend('/api/ultra',{action:'repair',requestId:p.executionId,version:j.version,artifactHash:j.artifactHash});saveJob(p,j);await checkAndRecord();
      }
      const dialog=document.getElementById('plan-dialog');if(dialog.open)dialog.close();openGenerated(p);
      notify(j.phase==='checks_passed'?'Browser checks passed. Review the brief and visual result.':'Draft saved with issues. Open the check report before using it.');
    }catch(e){
      if(e.data?.job)saveJob(p,e.data.job);p.executionStatus='failed';p.workflowError=e.message;persist();
      message(e.message+' No automatic provider retry was sent.');
      if(p.output){const b=addLine(document.getElementById('execution-controls'),'button','Open saved draft and report');b.onclick=()=>{document.getElementById('plan-dialog').close();openGenerated(p);};}
    }finally{
      alive=false;clearInterval(timer);generationRunning=false;endRequestEffect('code');
      for(const id of ['code-mode','code-review','code-repair','approve-api']){const el=document.getElementById(id);if(el)el.disabled=false;}
      const approval=document.getElementById('approve-api');if(approval)approval.checked=false;
      const run=document.getElementById('run-api');if(run)run.disabled=true;await checkConnection();
    }
  };
  function paintReport(p,html){
    document.getElementById('ultra-evidence')?.remove();if(!p?.workflow)return;
    const section=document.createElement('section');section.id='ultra-evidence';section.className='card';section.style.marginTop='20px';
    const report=p.workflow.report,currentDraft=p.output===html,checks=report?.checks||[];
    addLine(section,'h2',currentDraft?'Code Ultra · evidence':'Code Ultra · report for a previous draft');
    addLine(section,'p',currentDraft?(checks.length?checks.filter(c=>c.status==='pass').length+' passed; '+checks.filter(c=>c.status==='not_applicable').length+' not applicable. '+checks.filter(c=>c.status==='fail').length+' failed; '+checks.filter(c=>c.status==='not_run').length+' not run.':'Browser checks have not completed.'):'The editor has changed. These results do not apply to the current code.');
    if(p.workflowError)addLine(section,'p',p.workflowError);
    if(p.requirements){const d=document.createElement('details');addLine(d,'summary','Understood intent and requirements');addLine(d,'p',p.requirements.intent);const ul=document.createElement('ul');for(const r of p.requirements.requirements)addLine(ul,'li',r);d.append(ul);for(const a of p.requirements.assumptions)addLine(d,'p','Assumption: '+a);section.append(d);}
    const list=document.createElement('ul');for(const c of checks)addLine(list,'li',c.status.toUpperCase()+' · '+label(c.id)+' — '+c.detail);section.append(list);
    addLine(section,'p','Model calls: '+(p.stages||[]).map(x=>x.role+' ('+x.model+')').join(' → '));
    addLine(section,'p',usageText(p.usage));for(const limit of p.workflow.limitations||[])addLine(section,'small',limit+' ');
    const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='15px';
    const exportButton=addLine(actions,'button','Download check report');exportButton.onclick=()=>download('pixelmorphic-code-ultra-report.json',JSON.stringify({originalBrief:p.brief,requirements:p.requirements,workflow:p.workflow,history:p.workflowHistory,error:p.workflowError||null},null,2),'application/json');
    const draft=addLine(actions,'button','Download workflow draft');draft.onclick=()=>download('pixelmorphic-ultra-draft.html',p.output,'text/html');
    section.append(actions);document.getElementById('main').append(section);
  }
  window.studioBrowserChecks=browserChecks;
  window.studioPaintReport=paintReport;
  function attachEvidence(){if(current!=='code')return;const editor=document.getElementById('code');if(!editor)return;const p=state.jobs.find(j=>j.workflow&&j.output===editor.value)||state.jobs.find(j=>j.workflow&&j.output);paintReport(p,editor.value);editor.addEventListener('input',()=>paintReport(p,editor.value));}
  const previous=window.refreshIntegration;window.refreshIntegration=function(){previous();attachEvidence();};attachEvidence();
})();
