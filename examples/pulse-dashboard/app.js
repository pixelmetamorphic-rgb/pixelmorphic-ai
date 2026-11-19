const datasets={
  '7D':{revenue:'$12,640',customers:'386',conversion:'4.21%',average:'$118.20',values:[24,39,33,52,47,68,75],labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']},
  '30D':{revenue:'$48,290',customers:'1,284',conversion:'4.82%',average:'$126.40',values:[12,22,19,38,31,48,42,63,51,72,65,90],labels:['Jun 1','Jun 7','Jun 14','Jun 21','Jun 30']},
  '1Y':{revenue:'$582,120',customers:'8,436',conversion:'5.12%',average:'$132.70',values:[10,21,18,30,34,46,43,64,68,62,83,96],labels:['Jan','Mar','Jun','Sep','Dec']}
};
const customers=[
  {name:'Olivia Rhye',email:'olivia@example.com',plan:'Pro',status:'Active',spend:1240,joined:'Jun 12, 2026'},
  {name:'Phoenix Baker',email:'phoenix@example.com',plan:'Team',status:'Active',spend:2480,joined:'Jun 10, 2026'},
  {name:'Lana Steiner',email:'lana@example.com',plan:'Pro',status:'Trial',spend:49,joined:'Jun 8, 2026'},
  {name:'Demi Wilkinson',email:'demi@example.com',plan:'Pro',status:'Active',spend:892,joined:'Jun 6, 2026'},
  {name:'Drew Cano',email:'drew@example.com',plan:'Team',status:'Active',spend:1860,joined:'Jun 4, 2026'},
  {name:'Alex Morgan',email:'alex@example.com',plan:'Pro',status:'Trial',spend:49,joined:'Jun 2, 2026'}
];
const byId=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let period='30D',sortBy='name',sortDir=1,toastTimer;
try{document.documentElement.classList.toggle('dark',localStorage.getItem('pulse-theme')==='dark');period=localStorage.getItem('pulse-period')||'30D';}catch{}
function notify(message){byId('toast').textContent=message;byId('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>byId('toast').hidden=true,2400);}
function renderChart(next){
  period=datasets[next]?next:'30D';const d=datasets[period];
  byId('revenue').textContent=d.revenue;byId('customers-count').textContent=d.customers;byId('conversion').textContent=d.conversion;byId('average').textContent=d.average;byId('chart-total').textContent=d.revenue;
  const points=d.values.map((v,i)=>[38+i*(610/(d.values.length-1)),170-v*1.5]);
  const line=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  byId('chart-line').setAttribute('d',line);byId('chart-area').setAttribute('d',line+' L648 170 L38 170 Z');
  byId('chart-labels').innerHTML=d.labels.map((s,i)=>'<text x="'+(38+i*610/(d.labels.length-1))+'" y="205" text-anchor="'+(i===0?'start':i===d.labels.length-1?'end':'middle')+'">'+s+'</text>').join('');
  byId('chart').setAttribute('aria-label','Sample revenue trend for '+period+'; total '+d.revenue);
  document.querySelectorAll('[data-period]').forEach(b=>{const selected=b.dataset.period===period;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  try{localStorage.setItem('pulse-period',period);}catch{}
}
function visibleCustomers(){const q=byId('search').value.trim().toLowerCase();return customers.filter(c=>(c.name+' '+c.email+' '+c.plan+' '+c.status).toLowerCase().includes(q)).sort((a,b)=>(sortBy==='spend'?a.spend-b.spend:a.name.localeCompare(b.name))*sortDir);}
function renderTable(){const items=visibleCustomers();byId('rows').innerHTML=items.map(c=>'<tr><td><div class="person"><span>'+escapeHTML(c.name.split(' ').map(x=>x[0]).join(''))+'</span><div><strong>'+escapeHTML(c.name)+'</strong><small>'+escapeHTML(c.email)+'</small></div></div></td><td>'+c.plan+'</td><td><span class="badge '+(c.status==='Trial'?'trial':'')+'">'+c.status+'</span></td><td>$'+c.spend.toLocaleString('en-US')+'.00</td><td>'+c.joined+'</td></tr>').join('');byId('empty').hidden=items.length>0;byId('result-count').textContent=items.length;byId('table-count').textContent='Showing '+items.length+' of '+customers.length+' customers';}
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>renderChart(b.dataset.period)));
byId('search').addEventListener('input',renderTable);
for(const key of ['name','spend'])byId('sort-'+key).addEventListener('click',()=>{sortDir=sortBy===key?-sortDir:1;sortBy=key;renderTable();});
byId('theme').addEventListener('click',()=>{const dark=document.documentElement.classList.toggle('dark');try{localStorage.setItem('pulse-theme',dark?'dark':'light');}catch{}byId('theme').setAttribute('aria-pressed',String(dark));});
byId('export').addEventListener('click',()=>{const data=visibleCustomers(),quote=s=>'"'+String(s).replace(/"/g,'""')+'"',csv=['Name,Email,Plan,Status,Spend,Joined',...data.map(c=>[c.name,c.email,c.plan,c.status,c.spend,c.joined].map(quote).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='pulse-customers.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('CSV export requested. In a sandboxed preview, use the workspace ZIP export instead.');});
renderChart(period);renderTable();
