// Code Ultra vertical slice. Generated documents never receive allow-scripts.
// Browser observations are local-owner evidence, not server-attested customer billing records.
(() => {
  const baseIds=['title','lang','viewport-meta','main','h1','image-alt','internal-links','static-scope','viewport-320','viewport-390','viewport-768','viewport-1280','art-layout-320','art-layout-390','art-layout-768','art-layout-1280','brief-placeholders','brief-demo','brief-samples','brief-project-count','page-overflow-mask','button-contrast'];
  const names={title:'Document title',lang:'Document language','viewport-meta':'Viewport metadata',main:'Main landmark',h1:'Primary heading','image-alt':'Image alt attributes','internal-links':'Internal link targets','static-scope':'Static HTML/CSS scope','viewport-320':'320 px horizontal overflow','viewport-768':'768 px horizontal overflow','viewport-390':'390 px horizontal overflow','viewport-1280':'1280 px horizontal overflow'};
  const label=id=>names[id]||(id.startsWith('art-layout-')?id.slice(11)+' px artwork bounds':id);
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
  // Bounded artwork checks are geometric heuristics, not a universal visual judge.
  function artworkCheck(doc,width){
    const roots=[...doc.querySelectorAll('[data-studio-art],.hero-visual,[role="img"]')].filter(e=>!e.parentElement?.closest('[data-studio-art],.hero-visual,[role="img"]'));
    const issues=[];let inspected=0;
    for(const root of roots){
      const box=root.getBoundingClientRect();if(!box.width||!box.height)continue;inspected++;
      for(const child of root.querySelectorAll('*')){
        if(child instanceof doc.defaultView.SVGElement)continue;
        const r=child.getBoundingClientRect(),cs=doc.defaultView.getComputedStyle(child);
        if(!r.width||!r.height||cs.display==='none'||cs.visibility==='hidden')continue;
        if(r.left<box.left-2||r.right>box.right+2||r.top<box.top-2||r.bottom>box.bottom+2){
          issues.push((root.id?'#'+root.id:root.className||root.tagName)+' artwork escapes reserved bounds ('+Math.round(r.top-box.top)+'px top).');break;
        }
      }
    }
    return inspected?entry('art-layout-'+width,!issues.length,issues.length?issues.join(' ').slice(0,300):'Marked artwork fits its reserved space. Visual review still required.'):{id:'art-layout-'+width,status:'not_applicable',detail:'No marked artwork found. Visual overlap has not been assessed.'};
  }
  async function browserChecks(job){
    const checks=[];let frame;
    try{
      frame=await loadFrame(job.html,1280);const doc=frame.contentDocument;
      const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&frame.contentWindow.getComputedStyle(el).display!=='none'&&frame.contentWindow.getComputedStyle(el).visibility==='visible';};
      checks.push(entry('title',!!doc.title.trim(),doc.title.trim()?'Title is present.':'Missing a descriptive title.'));
      checks.push(entry('lang',!!doc.documentElement.lang.trim(),'HTML lang: '+(doc.documentElement.lang||'missing')));
      checks.push(entry('viewport-meta',!!doc.querySelector('meta[name="viewport"]')?.content?.includes('width=device-width'),'Viewport must include width=device-width.'));
      checks.push(entry('main',Array.from(doc.querySelectorAll('main')).filter(visible).length===1,'Visible main elements: '+Array.from(doc.querySelectorAll('main')).filter(visible).length));
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
      const brief=job.brief||'', bodyText=doc.body?.innerText||'';
      const optional=(id,applies,ok,detail)=>checks.push(applies?entry(id,ok,detail):{id,status:'not_applicable',detail:'This explicit requirement was not found in the available brief.'});
      const placeholders=[...new Set(brief.match(/\[[A-Za-z][A-Za-z ]{0,50}\]/g)||[])];
      const missing=placeholders.filter(t=>!bodyText.includes(t));
      optional('brief-placeholders',placeholders.length>0,!missing.length,missing.length?'Missing visible placeholders: '+missing.join(', '):'Requested placeholders are visible.');
      optional('brief-demo',/fictional|demo studio/i.test(brief),/demo studio|demo content/i.test(bodyText),'Fictional studio must visibly identify demo content.');
      const cards=[...doc.querySelectorAll('.project-card')];
      optional('brief-samples',/sample.*(?:project|detail)|project.*sample/i.test(brief),cards.length>0&&cards.every(c=>/sample|demo|fictional/i.test(c.innerText)),'Each .project-card must identify sample/demo content.');
      const countMatch=brief.match(/exactly\s+(three|[0-9]+)\s+project cards/i);
      optional('brief-project-count',!!countMatch,cards.length===(countMatch?.[1]==='three'?3:Number(countMatch?.[1])),'Visible project cards: '+cards.filter(visible).length+'; requested '+(countMatch?.[1]||'not specified')+'.');
      const masked=[doc.body,doc.documentElement].some(e=>['hidden','clip'].includes(doc.defaultView.getComputedStyle(e).overflowX));
      checks.push(entry('page-overflow-mask',!masked,'Page-level horizontal overflow masking: '+masked+'.'));
      function luminance(c){const a=c.match(/[\d.]+/g)?.slice(0,3).map(Number);if(!a||a.length<3)return null;return a.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);}
      const lowContrast=[];
      for(const e of doc.querySelectorAll('a,button')){const cs=doc.defaultView.getComputedStyle(e);if(!visible(e)||!e.textContent.trim()||cs.backgroundImage!=='none'||/rgba\([^)]*,\s*(?:0|0?\.\d+)\)$/.test(cs.backgroundColor))continue;const fg=luminance(cs.color),bg=luminance(cs.backgroundColor);if(fg===null||bg===null)continue;const ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);const large=parseFloat(cs.fontSize)>=24||(parseFloat(cs.fontSize)>=18.66&&parseInt(cs.fontWeight)>=700);if(ratio<(large?3:4.5))lowContrast.push(e.textContent.trim().slice(0,40)+' '+ratio.toFixed(2)+':1');}
      checks.push(entry('button-contrast',!lowContrast.length,lowContrast.length?'Low contrast solid-background controls: '+lowContrast.join(', '):'No low contrast found on inspected solid-background controls; gradients/transparency require visual review.'));
      for(const c of (job.requirements?.checks||[])){
        const absence=c.exactCount===0||c.maxCount===0;
        const found=Array.from(doc.querySelectorAll(c.selector)).filter(el=>absence||visible(el));
        const matching=c.textIncludes?found.filter(el=>el.textContent.toLowerCase().includes(c.textIncludes.toLowerCase())):found;
        const ok=c.exactCount!==undefined?matching.length===c.exactCount:matching.length>=c.minCount&&(c.maxCount===undefined||matching.length<=c.maxCount);
        const expected=c.exactCount!==undefined?'exactly '+c.exactCount:'minimum '+c.minCount+(c.maxCount===undefined?'':', maximum '+c.maxCount);
        checks.push(entry(c.id,ok,c.label+': '+matching.length+' matching '+(absence?'DOM':'visible')+' elements; expected '+expected+'. Structural evidence only.'));
      }
      const overflow=()=>Math.max(doc.documentElement.scrollWidth,doc.body?.scrollWidth||0)>doc.documentElement.clientWidth+2;
      checks.push(entry('viewport-1280',!overflow(),'Client width '+doc.documentElement.clientWidth+' px; document scroll width '+Math.max(doc.documentElement.scrollWidth,doc.body?.scrollWidth||0)+' px.'));
      checks.push(artworkCheck(doc,1280));
      frame.remove();frame=null;
      for(const width of [320,390,768]){
        frame=await loadFrame(job.html,width);const mobile=frame.contentDocument;
        const scroll=Math.max(mobile.documentElement.scrollWidth,mobile.body?.scrollWidth||0),client=mobile.documentElement.clientWidth;
        checks.push(entry('viewport-'+width,scroll<=client+2,'Client width '+client+' px; document scroll width '+scroll+' px.'));
        checks.push(artworkCheck(mobile,width));
        frame.remove();frame=null;
      }
    }catch(e){for(const id of [...baseIds,...(job.requirements?.checks||[]).map(c=>c.id)])if(!checks.some(c=>c.id===id))checks.push({id,status:'not_run',detail:String(e.message).slice(0,300)});}
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
    if(connection?.studioVersion!==4){notify('Apply the matching server update and restart first.');return;}
    window.studioBeginAttempt(p);generationRunning=true;startRequestEffect('code');mountGenerationThinking();p.modeId='morphic-code-ultra';p.executionId=newId();p.workflowHistory=[];p.workflowError=null;p.workflowOptions=options;
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
      if(p.workflow){const b=addLine(document.getElementById('execution-controls'),'button','Download failure diagnostic');b.onclick=()=>download('pixelmorphic-failure-diagnostic.json',JSON.stringify({brief:p.brief,workflow:p.workflow,error:p.workflowError},null,2),'application/json');}
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
    const report=p.workflow.report,currentDraft=p.workflow.html===html&&p.output===html&&(!report||report.artifactHash===p.workflow.artifactHash)&&p.workflow.requestId===p.executionId,checks=report?.checks||[];
    addLine(section,'h2',currentDraft?'Code Studio · quality report':'Code Studio · report for a previous draft');
    addLine(section,'p',currentDraft?(checks.length?checks.filter(c=>c.status==='pass').length+' passed; '+checks.filter(c=>c.status==='not_applicable').length+' not applicable. '+checks.filter(c=>c.status==='fail').length+' failed; '+checks.filter(c=>c.status==='not_run').length+' not run.':'Browser checks have not completed.'):'The editor has changed. These results do not apply to the current code.');
    if(currentDraft){
      const approved=p.workflow.visualApproval?.approved===true&&p.workflow.visualApproval?.artifactHash===p.workflow.artifactHash;
      const statusLine=addLine(section,'p',p.workflow.phase==='checks_passed'?(approved?'AUTOMATED CHECKS PASSED · visual review approved for this draft':'AUTOMATED CHECKS PASSED · visual approval still required'):'NEEDS ATTENTION · inspect failures before delivery');
      const approveLabel=document.createElement('label');approveLabel.style.cssText='display:block;font-size:12px;margin:8px 0';
      const approveBox=document.createElement('input');approveBox.type='checkbox';approveBox.id='ultra-visual-approval';approveBox.checked=approved;
      approveBox.onchange=()=>{
        p.workflow.visualApproval=approveBox.checked?{approved:true,artifactHash:p.workflow.artifactHash,approvedAt:new Date().toISOString()}:null;
        statusLine.textContent=p.workflow.phase==='checks_passed'?(approveBox.checked?'AUTOMATED CHECKS PASSED · visual review approved for this draft':'AUTOMATED CHECKS PASSED · visual approval still required'):'NEEDS ATTENTION · inspect failures before delivery';
        persist();
      };
      approveLabel.append(approveBox,' Visual review approved for this draft (stored separately from automated checks)');
      section.append(approveLabel);
    }
    if(p.workflowError)addLine(section,'p',p.workflowError);
    if(p.requirements){const d=document.createElement('details');addLine(d,'summary','Understood intent and requirements');addLine(d,'p',p.requirements.intent);const ul=document.createElement('ul');for(const r of p.requirements.requirements)addLine(ul,'li',r);d.append(ul);for(const a of p.requirements.assumptions)addLine(d,'p','Assumption: '+a);section.append(d);}
    const list=document.createElement('ul');for(const c of checks)addLine(list,'li',c.status.toUpperCase()+' · '+label(c.id)+' — '+c.detail);section.append(list);
    addLine(section,'p','Model calls: '+(p.stages||[]).map(x=>x.role+' ('+x.model+')').join(' → '));
    addLine(section,'p',usageText(p.usage));for(const limit of p.workflow.limitations||[])addLine(section,'small',limit+' ');
    const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='15px';
    const exportButton=addLine(actions,'button','Download check report');exportButton.disabled=!currentDraft;exportButton.onclick=()=>{if(!currentDraft||document.getElementById('code')?.value!==p.workflow.html)return;download('pixelmorphic-code-ultra-report.json',JSON.stringify({originalBrief:p.brief,requirements:p.requirements,workflow:p.workflow,visualApproval:p.workflow.visualApproval||null,history:p.workflowHistory,error:p.workflowError||null},null,2),'application/json');};
    const draft=addLine(actions,'button','Download checked draft');draft.disabled=!currentDraft;draft.onclick=()=>{if(!currentDraft||document.getElementById('code')?.value!==p.workflow.html)return;download('pixelmorphic-checked-draft.html',p.workflow.html,'text/html');};
    if(p.workflow.plannerDiagnostic){const d=document.createElement('details');addLine(d,'summary','Planner format diagnostic · no retry');addLine(d,'pre',JSON.stringify(p.workflow.plannerDiagnostic,null,2));section.append(d);}
    section.append(actions);document.getElementById('main').append(section);
  }
  window.studioBrowserChecks=browserChecks;
  window.studioPaintReport=paintReport;
  window.studioCurrentJob=html=>state.jobs.find(j=>j.id===state.activeStudioJobId&&j.output===html)||state.jobs.find(j=>j.output===html)||null;
  // SHA-256 fallback for local HTTP previews where Web Crypto is not exposed.
  window.studioHashHTML=async html=>{
    const bytes=new TextEncoder().encode(html);
    if(globalThis.crypto?.subtle)return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
    const primes=[];for(let n=2;primes.length<64;n++){if(primes.every(p=>n%p))primes.push(n);}
    const frac=n=>((n-Math.floor(n))*4294967296)>>>0;
    const k=primes.map(n=>frac(Math.cbrt(n))),h=primes.slice(0,8).map(n=>frac(Math.sqrt(n)));
    const padded=new Uint8Array(Math.ceil((bytes.length+9)/64)*64);padded.set(bytes);padded[bytes.length]=128;
    const dv=new DataView(padded.buffer);dv.setUint32(padded.length-8,Math.floor(bytes.length/536870912));dv.setUint32(padded.length-4,(bytes.length*8)>>>0);
    const rr=(x,n)=>(x>>>n)|(x<<(32-n)),w=new Uint32Array(64);
    for(let offset=0;offset<padded.length;offset+=64){
      for(let i=0;i<16;i++)w[i]=dv.getUint32(offset+i*4);
      for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rr(x,7)^rr(x,18)^(x>>>3))+w[i-7]+(rr(y,17)^rr(y,19)^(y>>>10)))>>>0;}
      let [a,b,c,d,e,f,g,v]=h;
      for(let i=0;i<64;i++){const t1=(v+(rr(e,6)^rr(e,11)^rr(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((rr(a,2)^rr(a,13)^rr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;v=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
      [a,b,c,d,e,f,g,v].forEach((n,i)=>h[i]=(h[i]+n)>>>0);
    }
    return h.map(x=>x.toString(16).padStart(8,'0')).join('');
  };
  window.studioCheckProject=async p=>{
    const checkedHTML=p.output,requestId=p.executionId;
    const artifactHash=await window.studioHashHTML(checkedHTML);
    const checks=await browserChecks({html:checkedHTML,brief:p.brief,requirements:p.requirements||{checks:[]}});
    if(p.output!==checkedHTML||p.executionId!==requestId)return;
    const report={source:'local_browser',checkedAt:new Date().toISOString(),artifactHash,version:1,checks};
    const prevApproval=p.workflow?.visualApproval?.artifactHash===artifactHash?p.workflow.visualApproval:null;
    p.workflow={...p.workflow,requestId,html:checkedHTML,artifactHash,version:1,report,visualApproval:prevApproval,phase:checks.some(c=>c.status==='not_run')?'checks_incomplete':checks.some(c=>c.status==='fail')?'needs_attention':p.requirements?.validationNotes?.some(n=>n.startsWith('UNASSESSED:'))?'manual_review_required':'checks_passed',stages:p.stages,limitations:['Automated checks are partial. Visual design, brief compliance and accessibility need review. No application runtime was tested.']};
    p.executionStatus=p.workflow.phase;persist();return checks;
  };
  function attachEvidence(){if(current!=='code')return;const editor=document.getElementById('code');if(!editor)return;const refresh=()=>paintReport(window.studioCurrentJob(editor.value),editor.value);refresh();editor.addEventListener('input',refresh);}

  const previous=window.refreshIntegration;window.refreshIntegration=function(){previous();attachEvidence();};attachEvidence();
})();
