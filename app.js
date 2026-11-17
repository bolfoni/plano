"use strict";
const KEY="plano-estudos-app-v1",OLDKEY="plano-estudos-app-v0";
const DOW=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const IV0=[{d:1,rm:15,qm:15},{d:7,rm:15,qm:15},{d:15,rm:15,qm:15},{d:30,rm:15,qm:15}];
const HOURS0=[4,2,2,2,2,2,4];
const KIND={p:"PDF",r:"Revisão",q:"Questões",s:"Simulado"};

let L=null,S=null,proj={},moved=0;
const ui={tab:"hoje",wk:0,openSub:null,openG:{},edit:null,confirm:null,draft:null,exp:null,msg:""};
const app=document.getElementById("app");
const $=id=>document.getElementById(id);
const clone=o=>JSON.parse(JSON.stringify(o));
const pad=n=>String(n).padStart(2,"0");
const ds=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const pd=s=>{const a=s.split("-").map(Number);return new Date(a[0],a[1]-1,a[2])};
const today=()=>ds(new Date());
const addDays=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ds(d)};
const fmt=s=>{const d=pd(s);return DOW[d.getDay()]+", "+pad(d.getDate())+"/"+pad(d.getMonth()+1)};
const fmtY=s=>{const d=pd(s);return pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()};
const hm=m=>{m=Math.round(m);const h=Math.floor(m/60),r=m%60;return h?(h+"h"+(r?pad(r):"")):(r+"min")};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sum=a=>a.reduce((n,x)=>n+x.min,0);
const cap=d=>(S.off&&S.off.indexOf(d)>=0)?0:Math.round((S.hours[pd(d).getDay()]||0)*60);
const ivLabel=d=>d===1?"24 h":d+" dias";
const subOf=id=>S.subs.find(s=>s.id===id);
const dueOf=(t,r)=>addDays(t.pd,r.sd||r.d);
function mkRv(iv){
  const o=[];
  iv.forEach((v,i)=>{
    if(v.rm>0)o.push({i:i,d:v.d,k:"r",m:v.rm,plan:null,done:null});
    if(v.qm>0)o.push({i:i,d:v.d,k:"q",m:v.qm,plan:null,done:null});
  });
  return o;
}

/* ---------- cursos ---------- */
function emptyCourse(n){return {v:3,rev:0,n:n,seq:0,sq:0,na:4,rc:60,ad:1,al:60,ah:85,pf:25,ps:5,pl:15,rt:[],sm:[],off:[],log:{},tp:0,ta:0,tn:0,start:today(),hours:HOURS0.slice(),iv:clone(IV0),subs:[],topics:[]}}
function normCourse(s){
  if(!s||!Array.isArray(s.topics)||!Array.isArray(s.subs)||!Array.isArray(s.hours)||s.hours.length!==7)return null;
  if(!s.start)s.start=today();
  if(!(s.v>=2)){
    s.subs.forEach((x,i)=>{x.id="s"+i});
    s.topics.forEach(t=>{
      t.s="s"+t.s;t.rv=[];if(!(t.pm>0))t.pm=60;
      if(t.pd){t.rv=mkRv(IV0);if(t.qd)t.rv.forEach(r=>{if(r.i===0)r.done=t.qd})}
      delete t.qm;delete t.qd;delete t.qp;
    });
    s.sq=s.subs.length;s.na=4;s.iv=clone(IV0);s.v=3;
  }else if(s.v<3){
    const ds0=[1,7,15,30];
    s.iv=(Array.isArray(s.iv)&&s.iv.length===4?s.iv:[]).map(v=>{const h=Math.max(5,Math.round(v.m/2));return {d:v.d,rm:v.k==="q"?0:(v.k==="r"?v.m:h),qm:v.k==="r"?0:(v.k==="q"?v.m:h)}});
    s.topics.forEach(t=>{
      const o=[];
      (t.rv||[]).forEach(r=>{
        const i=Math.max(0,ds0.indexOf(r.d)),h=Math.max(5,Math.round(r.m/2));
        if(r.k!=="q")o.push({i:i,d:r.d,k:"r",m:r.k==="r"?r.m:h,plan:r.plan||null,done:r.done||null});
        if(r.k!=="r")o.push({i:i,d:r.d,k:"q",m:r.k==="q"?r.m:h,plan:r.plan||null,done:r.done||null});
      });
      t.rv=o;
    });
    s.v=3;
  }
  if(!Array.isArray(s.iv)||!s.iv.length||s.iv.length>8)s.iv=clone(IV0);
  if(!s.na)s.na=4;
  if(!s.rc){s.rc=60;if(s.ad==null)s.ad=1}
  if(!Array.isArray(s.off))s.off=[];
  if(!s.log||typeof s.log!=="object")s.log={};
  s.tp=s.tp||0;s.ta=s.ta||0;s.tn=s.tn||0;
  if(!Array.isArray(s.rt))s.rt=[];
  if(!Array.isArray(s.sm))s.sm=[];
  s.al=s.al||60;s.ah=s.ah||85;s.pf=s.pf||25;s.ps=s.ps||5;s.pl=s.pl||15;
  if(!s.n)s.n="Meu curso";
  if(!s.seq)s.seq=s.topics.length+1;
  if(!s.sq)s.sq=s.subs.length+1;
  s.subs.forEach((x,i)=>{if(!x.id)x.id="s"+i;if(x.c==null)x.c=x.b?x.b-1:i%6;delete x.b});
  s.topics.forEach(t=>{if(!Array.isArray(t.rv))t.rv=[]});
  return s;
}
function loadLocal(){
  try{
    const l=JSON.parse(localStorage.getItem(KEY));
    if(l&&l.courses&&l.cur&&l.courses[l.cur]){
      Object.keys(l.courses).forEach(k=>{l.courses[k]=normCourse(l.courses[k])||emptyCourse("Curso")});
      if(!l.sync)l.sync={};
      return l;
    }
  }catch(e){}
  let c=null;
  try{c=normCourse(JSON.parse(localStorage.getItem(OLDKEY)))}catch(e){}
  const fresh=!c;c=c||emptyCourse("Meu curso");
  return {v:3,cur:"c1",list:[{id:"c1",n:c.n}],stamp:fresh?0:Date.now(),base:0,sync:{},courses:{c1:c}};
}
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(L))}catch(e){}}

/* ---------- agendador ---------- */
// Ritmo real: tempo cronometrado dividido pelo planejado, depois de 5 tarefas cronometradas.
const pace=()=>S.tn>=5&&S.tp>0?clamp(S.ta/S.tp,0.5,2):1;
const eff=m=>{const p=pace();return p===1?m:Math.max(5,Math.round(m*p/5)*5)};
const rtMin=()=>(S.rt||[]).reduce((n,r)=>n+r.m,0);
function pendingBySub(){
  const by={};S.subs.forEach(s=>{by[s.id]=[]});
  S.topics.forEach(t=>{if(!t.pd&&!t.pr&&by[t.s])by[t.s].push(t)});
  return by;
}
function activeSubs(){
  const by=pendingBySub();
  return S.subs.filter(s=>by[s.id].length).slice(0,clamp(S.na||4,1,99)).map(s=>s.id);
}
// Só as N primeiras matérias da ordem de preferência entram; quando uma termina, a próxima assume.
function pdfQueue(){
  const by=pendingBySub(),line=S.subs.filter(s=>by[s.id].length);
  const active=line.splice(0,clamp(S.na||4,1,99));
  // aulas zeradas para reestudo passam na frente, mesmo que a matéria não esteja entre as ativas
  const out=S.topics.filter(t=>!t.pd&&t.pr&&subOf(t.s));
  while(active.length){
    for(let i=0;i<active.length;i++){
      const s=active[i],q=by[s.id];
      for(let j=0;j<Math.max(1,s.w||1)&&q.length;j++)out.push(q.shift());
      if(!q.length){if(line.length)active[i]=line.shift();else{active.splice(i,1);i--}}
    }
  }
  return out;
}
function allTasks(){
  const o=[];
  for(const t of S.topics){
    o.push({t:t,kind:"p",ri:"p",min:t.pd?(t.am||t.pm):eff(t.pm),done:t.pd,plan:t.pp,late:t.late,am:t.am});
    t.rv.forEach((r,i)=>o.push({t:t,kind:r.k,ri:i,r:r,min:r.done?(r.am||r.m):eff(r.m),done:r.done,plan:r.plan,late:r.late,am:r.am}));
  }
  (S.sm||[]).forEach(m=>o.push({t:{id:"sm_"+m.id,s:null,t:m.n,l:""},kind:"s",ri:"s",sm:m,min:m.m,done:m.done,plan:m.plan,late:m.late}));
  return o;
}
const isRev=x=>x.kind==="r"||x.kind==="q";
function markLate(){
  const t0=today();let n=0;
  for(const t of S.topics){
    if(!t.pd&&t.pp&&t.pp<t0){if(!t.late)n++;t.late=1}
    t.rv.forEach(r=>{if(!r.done&&r.plan&&r.plan<t0){if(!r.late)n++;r.late=1}});
    // tópico com tudo feito em dias anteriores: guarda só os totais
    if(t.pd&&t.rv.length&&t.rv.every(r=>r.done&&r.done<t0)){
      t.rv.forEach(r=>{if(r.qn){t.qn=(t.qn||0)+r.qn;t.qc=(t.qc||0)+(r.qc||0)}});
      t.fin=(t.fin||0)+t.rv.length;t.rv=[];
    }
  }
  (S.sm||[]).forEach(m=>{if(!m.done&&m.plan&&m.plan<t0){if(!m.late)n++;m.late=1}});
  if(S.off&&S.off.length){const lim=addDays(t0,-60);S.off=S.off.filter(d=>d>=lim)}
  return n;
}
// Redistribui a partir de hoje. Ordem de prioridade: rotinas diárias e simulados (fixos),
// revisões e questões nas datas devidas (até o teto do dia) e, no que sobra, as aulas.
function reorg(){
  proj={};
  const pend=S.topics.filter(t=>!t.pd);
  if(!S.hours.some(h=>h>0)){pend.forEach(t=>{t.pp=null});return}
  const t0=today(),used={},usedR={},cnt={},rc=clamp(S.rc||100,10,100)/100,rtm=rtMin();
  const dn=allTasks().filter(x=>x.done===t0);
  const rtd=(S.rt||[]).filter(r=>r.last===t0).reduce((n,r)=>n+r.m,0);
  used[t0]=sum(dn)+(cap(t0)>0?rtm:rtd);usedR[t0]=sum(dn.filter(isRev));cnt[t0]=dn.length;
  const U=d=>{if(used[d]==null)used[d]=rtm;return used[d]};
  let guard=0;
  const next=d=>{while(cap(d)<=0&&guard++<5000)d=addDays(d,1);return d};
  const put=(d,m)=>{used[d]=U(d)+m;cnt[d]=(cnt[d]||0)+1;return d};
  const fit=(d,m)=>{d=next(d);while((cnt[d]||0)>0&&U(d)+m>cap(d))d=next(addDays(d,1));return put(d,m)};
  const fitR=(d,m)=>{
    d=next(d);
    while(((cnt[d]||0)>0&&U(d)+m>cap(d))||((usedR[d]||0)>0&&(usedR[d]||0)+m>cap(d)*rc))d=next(addDays(d,1));
    usedR[d]=(usedR[d]||0)+m;return put(d,m);
  };
  (S.sm||[]).filter(m=>!m.done).sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0).forEach(m=>{m.plan=put(next(m.d<t0?t0:m.d),m.m)});
  const rs=[];
  S.topics.forEach(t=>t.rv.forEach(r=>{if(!r.done)rs.push({r:r,due:dueOf(t,r)})}));
  rs.sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0);
  rs.forEach(x=>{x.r.plan=fitR(x.due<t0?t0:x.due,eff(x.r.m))});
  let day=S.start>t0?S.start:t0;
  const q=pdfQueue(),inq=new Set(q);
  for(const t of q){
    day=fit(day,eff(t.pm));t.pp=day;
    S.iv.forEach(v=>[v.rm,v.qm].forEach(m=>{if(m>0){const e=eff(m),d=fitR(addDays(day,v.d),e);proj[d]=(proj[d]||0)+e}}));
  }
  pend.forEach(t=>{if(!inq.has(t))t.pp=null});
}
// Aplica regras novas às revisões que ainda não foram feitas. Mantém as feitas e os reforços.
function applyIv(){
  S.topics.forEach(t=>{
    if(!t.pd||t.fin)return;
    const o=t.rv.filter(r=>r.done||r.x);
    S.iv.forEach((v,i)=>[["r",v.rm],["q",v.qm]].forEach(p=>{
      if(p[1]<=0||o.some(r=>!r.x&&r.i===i&&r.k===p[0]))return;
      const old=t.rv.find(r=>!r.x&&!r.done&&r.i===i&&r.k===p[0]);
      o.push({i:i,d:v.d,k:p[0],m:p[1],plan:null,done:null,late:old?old.late:0});
    }));
    o.sort((a,b)=>a.i-b.i||(a.k<b.k?1:a.k>b.k?-1:0));
    t.rv=o;
  });
}

/* ---------- cronômetro pomodoro ---------- */
const FOCUS=()=>(S.pf||25)*60000,SHORT=()=>(S.ps||5)*60000,LONG=()=>(S.pl||15)*60000;
let timers={},pomo=null;
try{timers=JSON.parse(localStorage.getItem("plano-timer"))||{}}catch(e){timers={}}
try{pomo=JSON.parse(localStorage.getItem("plano-pomo"))||null}catch(e){pomo=null}
const saveTimers=()=>{try{localStorage.setItem("plano-timer",JSON.stringify(timers));localStorage.setItem("plano-pomo",JSON.stringify(pomo))}catch(e){}};
const tkey=(t,ri)=>L.cur+":"+t.id+":"+ri;
const clock=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return pad(Math.floor(s/60))+":"+pad(s%60)};
const blockOf=tm=>(tm.blk||0)+(tm.start?Date.now()-tm.start:0);
// Fecha o bloco de foco quando ele termina e abre a pausa. O tempo além do bloco não conta.
function settle(k){
  const tm=timers[k];
  if(!tm||!tm.start||blockOf(tm)<FOCUS())return false;
  const rest=Math.max(0,FOCUS()-(tm.blk||0)),at=tm.start+rest;
  tm.acc+=rest;tm.blk=0;tm.start=null;tm.cyc=(tm.cyc||0)+1;
  const lg=tm.cyc%4===0;
  pomo={key:k,end:at+(lg?LONG():SHORT()),long:lg?1:0,cyc:tm.cyc};
  saveTimers();return true;
}
const elapsed=tm=>tm.acc+(tm.start?Math.max(0,Math.min(Date.now()-tm.start,FOCUS()-(tm.blk||0))):0);
function pauseAll(){
  Object.keys(timers).forEach(x=>{const o=timers[x];if(o.start){const d=Math.max(0,Math.min(Date.now()-o.start,FOCUS()-(o.blk||0)));o.acc+=d;o.blk=(o.blk||0)+d;o.start=null}});
}
function toggleTimerKey(k){
  settle(k);
  const tm=timers[k]||(timers[k]={acc:0,blk:0,cyc:0,start:null});
  if(tm.start)pauseAll();
  else{pauseAll();pomo=null;tm.start=Date.now()}
  saveTimers();
}
const toggleTimer=(t,ri)=>toggleTimerKey(tkey(t,ri));
function renderPomo(){
  const el=$("pomo");
  if(!pomo){if(!el.hidden){el.hidden=true;el.innerHTML=""}return}
  const left=pomo.end-Date.now(),over=left<=0,st=over?"o":"b";
  if(el.dataset.st!==st||el.hidden){
    el.dataset.st=st;el.hidden=false;
    el.innerHTML=over?'<span>Pausa encerrada. Pronto para o próximo bloco de foco?</span><span class="row"><button type="button" class="btn sm" data-p="go">Retomar foco</button><button type="button" class="btn sm ghost" data-p="x">Dispensar</button></span>':
      '<span>'+(pomo.long?"Pausa longa":"Pausa")+' · <b id="pomo-t"></b> · bloco '+pomo.cyc+' concluído</span><span class="row"><button type="button" class="btn sm ghost" data-p="go">Pular pausa</button></span>';
  }
  if(!over)$("pomo-t").textContent=clock(left);
}
function tick(){
  let ended=false;
  Object.keys(timers).forEach(k=>{if(k.indexOf(L.cur+":")===0&&settle(k))ended=true});
  if(ended&&ui.tab==="hoje"&&!mq.length)render();
  document.querySelectorAll("[data-clock]").forEach(el=>{const tm=timers[el.dataset.clock];if(tm)el.textContent=(tm.start?"foco ":"pausado ")+clock(FOCUS()-blockOf(tm))});
  renderPomo();
}

/* ---------- marcar, acertos, reforço e histórico ---------- */
function setDone(t,ri,on){
  const t0=today(),o=ri==="p"?t:t.rv[ri];if(!o)return;
  const m=ri==="p"?t.pm:o.m;
  if(on){
    const k=tkey(t,ri);settle(k);
    const tm=timers[k];
    if(pomo&&pomo.key===k)pomo=null;
    if(tm){
      const am=Math.round(elapsed(tm)/60000);delete timers[k];saveTimers();
      if(am>=1){o.am=am;S.tp+=m;S.ta+=am;S.tn++}
    }
    if(ri==="p"){t.pd=t0;t.late=0;t.fin=0;delete t.pr;t.rv=mkRv(S.iv)}else{o.done=t0;o.late=0}
  }else{
    const un=(x,mm)=>{if(x.am){S.tp-=mm;S.ta-=x.am;S.tn--;delete x.am}};
    un(o,m);
    if(ri==="p"){t.rv.forEach(r=>un(r,r.m));t.pd=null;t.rv=[];t.fin=0;t.qn=0;t.qc=0}
    else{o.done=null;delete o.qn;delete o.qc}
  }
}
// Registra acertos e, com a revisão adaptativa ligada, ajusta os próximos intervalos da aula.
function setScore(t,ri,qn,qc){
  const r=t.rv[ri];if(!r)return;
  qn=clamp(qn||0,0,999);qc=clamp(qc||0,0,qn);
  if(qn>0){r.qn=qn;r.qc=qc}else{delete r.qn;delete r.qc}
  if(!S.ad||!qn||r.x)return;
  const acc=qc/qn*100,f=acc<(S.al||60)?0.5:acc>(S.ah||85)?1.5:1;
  t.rv.forEach(x=>{
    if(x.done||x.x||x.i<=r.i)return;
    if(f===1){delete x.sd;return}
    const prev=x.i>0&&S.iv[x.i-1]?S.iv[x.i-1].d:0;
    x.sd=Math.max(prev+1,Math.round(x.d*f));
  });
}
function topicAcc(t){
  let n=t.qn||0,c=t.qc||0;
  t.rv.forEach(r=>{if(r.qn){n+=r.qn;c+=r.qc||0}});
  return {n:n,c:c};
}
function subAcc(sid){
  let n=0,c=0;
  S.topics.forEach(t=>{if(t.s===sid){const a=topicAcc(t);n+=a.n;c+=a.c}});
  return {n:n,c:c};
}
// Zera uma aula só: ela volta a ficar pendente, e os acertos já registrados continuam na conta da matéria.
function resetTopic(t){
  const un=(x,mm)=>{if(x.am){S.tp-=mm;S.ta-=x.am;S.tn--;delete x.am}};
  un(t,t.pm);
  t.rv.forEach(r=>{un(r,r.m);if(r.qn){t.qn=(t.qn||0)+r.qn;t.qc=(t.qc||0)+(r.qc||0)}});
  t.pd=null;t.pp=null;t.rv=[];t.fin=0;t.late=0;t.pr=1;
}
// Reforço: uma revisão e uma rodada de questões extras, no primeiro dia com tempo livre.
function addExtra(t){
  if(!t.pd||t.rv.some(r=>r.x&&!r.done))return false;
  const d=Math.max(1,Math.round((pd(today())-pd(t.pd))/864e5)),v=S.iv[0]||{rm:15,qm:15};
  t.rv.push({i:99,x:1,d:d,k:"r",m:v.rm||15,plan:null,done:null},{i:99,x:1,d:d,k:"q",m:v.qm||15,plan:null,done:null});
  return true;
}
function logToday(){
  const t0=today(),all=allTasks();
  const rtd=(S.rt||[]).filter(r=>r.last===t0),m=sum(all.filter(x=>x.done===t0))+rtd.reduce((n,r)=>n+r.m,0);
  const left=all.some(x=>!x.done&&x.plan===t0)||(cap(t0)>0&&rtd.length<(S.rt||[]).length);
  if(!S.log)S.log={};
  if(m>0)S.log[t0]={m:m,ok:left?0:1};else delete S.log[t0];
  const ks=Object.keys(S.log);
  if(ks.length>500)ks.sort().slice(0,ks.length-500).forEach(k=>{delete S.log[k]});
}
function streak(){
  const lg=S.log||{},ks=Object.keys(lg).sort();
  if(!ks.length)return 0;
  let d=today(),n=0;
  if(!(lg[d]&&lg[d].ok))d=addDays(d,-1);
  while(d>=ks[0]){
    if(lg[d]&&lg[d].ok)n++;
    else if(cap(d)>0)break;
    d=addDays(d,-1);
  }
  return n;
}

/* ---------- persistência: este aparelho + arquivo no Google Drive ---------- */
const CID=String((window.PLANO_CONFIG||{}).clientId||"").trim();
const SCOPE="https://www.googleapis.com/auth/drive.file",FILE="plano-de-estudos.json";
let cloud=CID?"auth":"off",conflict=null,tok=null,tokExp=0,fileId=null,tokenClient=null,busy=false,again=false,upTimer=null;
let lastSaved=null,undoStack=[],undoTimer=null;
function clearUndo(){undoStack=[];$("undo").hidden=true}
function showUndo(){
  const n=undoStack.filter(u=>u.c===L.cur).length;
  if(!n){$("undo").hidden=true;return}
  $("undo-btn").textContent="Desfazer"+(n>1?" ("+n+")":"");
  $("undo").hidden=false;
  clearTimeout(undoTimer);undoTimer=setTimeout(()=>{$("undo").hidden=true},12000);
}
function commit(noUndo){
  reorg();logToday();S.rev=Date.now();
  const e=L.list.find(x=>x.id===L.cur);if(e&&e.n!==S.n)e.n=S.n;
  L.stamp=Date.now();saveLocal();syncSoon();
  if(!noUndo&&lastSaved){undoStack.push({c:L.cur,s:lastSaved});if(undoStack.length>10)undoStack.shift()}
  showUndo();render();
}
// Ajustes automáticos do dia (atrasos, redistribuição) ficam só neste aparelho até a próxima edição sua.
function dayCheck(){
  const n=markLate();reorg();
  if(n)moved=n;
  saveLocal();render();
}
function setCourse(id){
  L.cur=id;S=L.courses[id];ui.draft=null;ui.openSub=null;ui.openG={};ui.wk=0;ui.edit=null;ui.exp=null;moved=0;clearUndo();
  L.stamp=Date.now();saveLocal();syncSoon();dayCheck();
}
function normStore(o){
  if(!o||typeof o.courses!=="object"||!Array.isArray(o.list))return null;
  const courses={},list=[];
  o.list.forEach(e=>{const c=e&&o.courses[e.id]?normCourse(o.courses[e.id]):null;if(c){courses[e.id]=c;list.push({id:e.id,n:c.n})}});
  if(!list.length)return null;
  return {v:3,cur:courses[o.cur]?o.cur:list[0].id,list:list,courses:courses,stamp:+o.stamp||0,base:0,sync:{}};
}
function adoptStore(r){
  L=r;L.base=r.stamp||0;S=L.courses[L.cur];
  ui.draft=null;ui.openSub=null;ui.openG={};ui.edit=null;ui.exp=null;moved=0;clearUndo();
  saveLocal();dayCheck();
}

/* --- Google Drive --- */
async function api(url,opt){
  opt=opt||{};opt.headers=Object.assign({Authorization:"Bearer "+tok},opt.headers||{});
  const r=await fetch(url,opt);
  if(r.status===401||r.status===403){tok=null;throw new Error("auth")}
  if(!r.ok)throw new Error("http "+r.status);
  return r;
}
async function findFile(){
  const q=encodeURIComponent("name='"+FILE+"' and trashed=false");
  const r=await api("https://www.googleapis.com/drive/v3/files?q="+q+"&spaces=drive&orderBy=modifiedTime%20desc&pageSize=5&fields=files(id,appProperties)");
  const j=await r.json();
  return j.files&&j.files[0]?j.files[0]:null;
}
async function download(id){return (await api("https://www.googleapis.com/drive/v3/files/"+id+"?alt=media")).json()}
async function upload(){
  const st=L.stamp,data=JSON.stringify({v:3,cur:L.cur,list:L.list,courses:L.courses,stamp:st});
  const meta={name:FILE,mimeType:"application/json",appProperties:{stamp:String(st)}},bd="plano"+Date.now();
  const body="--"+bd+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify(meta)+"\r\n--"+bd+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+data+"\r\n--"+bd+"--";
  const r=await api("https://www.googleapis.com/upload/drive/v3/files"+(fileId?"/"+fileId:"")+"?uploadType=multipart&fields=id",{method:fileId?"PATCH":"POST",headers:{"Content-Type":"multipart/related; boundary="+bd},body:body});
  const j=await r.json();
  if(j.id)fileId=j.id;
  L.base=st;
}
// Compara este aparelho com o arquivo do Drive e fica com o mais atual.
// Se os dois mudaram desde a última sincronia, pede para você escolher.
async function sync(){
  if(!tok||Date.now()>tokExp){tok=null;cloud=CID?"auth":"off";renderSync();return}
  if(conflict)return;
  if(busy){again=true;return}
  busy=true;cloud="busy";renderSync();
  try{
    const f=await findFile(),ls=L.stamp||0,base=L.base||0;
    if(!f){fileId=null;await upload()}
    else{
      fileId=f.id;
      const rs=+((f.appProperties||{}).stamp)||0;
      if(rs===ls)L.base=rs;
      else if(ls===base){const r=normStore(await download(f.id));if(r)adoptStore(r);else await upload()}
      else if(rs===base)await upload();
      else{const r=normStore(await download(f.id));if(r){conflict={remote:r};render()}else await upload()}
    }
    saveLocal();cloud="ok";
  }catch(e){cloud=tok?"err":(CID?"auth":"off")}
  busy=false;renderSync();
  if(again||(cloud==="ok"&&!conflict&&(L.stamp||0)!==(L.base||0))){again=false;syncSoon()}
}
function syncSoon(){
  if(!tok){if(CID&&cloud!=="auth"){cloud="auth";renderSync()}return}
  clearTimeout(upTimer);upTimer=setTimeout(sync,2500);
}
function initAuth(){
  if(tokenClient)return true;
  if(!CID||!window.google||!window.google.accounts||!window.google.accounts.oauth2)return false;
  tokenClient=window.google.accounts.oauth2.initTokenClient({client_id:CID,scope:SCOPE,
    callback:resp=>{
      if(resp&&resp.access_token){
        tok=resp.access_token;tokExp=Date.now()+((+resp.expires_in||3600)-120)*1000;
        try{localStorage.setItem("plano-g","1")}catch(e){}
        sync();
      }else{cloud="auth";renderSync()}
    },
    error_callback:()=>{cloud="auth";renderSync()}});
  return true;
}
function signIn(){
  if(!CID){ui.tab="ajustes";render();return}
  if(!initAuth()){cloud="err";renderSync();return}
  let first=true;try{first=localStorage.getItem("plano-g")!=="1"}catch(e){}
  try{tokenClient.requestAccessToken({prompt:first?"consent":""})}catch(e){cloud="auth";renderSync()}
}
function startAuth(){
  renderSync();
  if(!CID)return;
  let n=0;
  const iv=setInterval(()=>{
    if(initAuth()){
      clearInterval(iv);
      let known=false;try{known=localStorage.getItem("plano-g")==="1"}catch(e){}
      // tenta renovar o acesso sem pedir nada; se o navegador bloquear, basta tocar no indicador
      if(known){try{tokenClient.requestAccessToken({prompt:""})}catch(e){}}
    }else if(++n>60)clearInterval(iv);
  },250);
}
function renderSync(){
  const m={off:["","Sincronização não configurada"],auth:["err","Entrar com Google para sincronizar"],busy:["","Sincronizando…"],ok:["ok","Sincronizado com o Google Drive"],err:["err","Falha ao sincronizar: toque para tentar de novo"]}[cloud];
  $("sync").innerHTML='<span class="dot '+m[0]+'"></span><span>'+m[1]+"</span>";
}

/* ---------- telas ---------- */
const pct100=(c,n)=>Math.round(c/n*100);
function row(x,o){
  o=o||{};
  const t=x.t,isS=x.kind==="s",s=isS?{n:"Simulado",c:3}:(subOf(t.s)||{n:"Sem matéria",c:0}),id="c-"+t.id+"-"+x.ri;
  const data=isS?'data-sm="'+x.sm.id+'"':'data-id="'+t.id+'" data-r="'+x.ri+'"';
  const link=t.l&&x.kind==="p"?'<a href="'+esc(t.l)+'" target="_blank" rel="noopener">abrir PDF</a>':"";
  const when=isS?" · marcado para "+fmt(x.sm.d):x.kind==="p"?"":x.r.x?" · reforço":" · "+ivLabel(x.r.sd||x.r.d)+" após o PDF"+(x.r.sd?" (ajustado pelos acertos)":"");
  let tmr="";
  if(o.timer&&!isS){
    if(!x.done){
      const tm=timers[tkey(t,x.ri)],run=tm&&tm.start;
      tmr=(tm?'<span class="min clock" data-clock="'+tkey(t,x.ri)+'">'+(run?"foco ":"pausado ")+clock(FOCUS()-blockOf(tm))+"</span>"+(tm.cyc?'<span class="min">'+tm.cyc+(tm.cyc===1?" bloco":" blocos")+"</span>":""):"")+
        '<button type="button" class="btn sm ghost" data-act="tm" data-id="'+t.id+'" data-r="'+x.ri+'" aria-label="'+(run?"Pausar":"Iniciar")+' cronômetro">'+(run?"⏸":"▶")+"</button>";
    }
    tmr+='<button type="button" class="btn sm ghost" data-act="note" data-id="'+t.id+'" aria-label="Anotação da aula">✎</button>';
  }
  let sc="";
  if(o.score&&x.done&&(x.kind==="q"||isS)){
    const r=isS?x.sm:x.r;
    sc+='<div class="score"><span class="muted">'+(r.qn?(r.qc||0)+" de "+r.qn+" questões · "+pct100(r.qc||0,r.qn)+"% de acerto":"Acertos não registrados")+'</span><button type="button" class="btn sm ghost" data-act="'+(isS?"smscore":"rescore")+'" '+(isS?'data-sm="'+x.sm.id+'"':'data-id="'+t.id+'" data-r="'+x.ri+'"')+">Editar acertos</button></div>";
  }
  if(o.timer&&!isS&&t.nt)sc+='<div class="score"><span class="muted">Anotação: '+esc(t.nt)+"</span></div>";
  return '<div class="task k'+s.c+(x.done?" done":"")+'"><input type="checkbox" id="'+id+'" '+data+(x.done?" checked":"")+'>'+
    '<label for="'+id+'"><span class="sub">'+esc(s.n)+when+'</span><span class="ti">'+esc(t.t)+"</span></label>"+
    '<span class="meta"><span class="chip '+x.kind+'">'+KIND[x.kind]+"</span>"+(x.late&&!x.done?'<span class="chip late">atrasada</span>':"")+'<span class="min">'+hm(x.min)+(x.done&&x.am?" reais":"")+"</span>"+link+tmr+"</span>"+sc+"</div>";
}
function rtRow(r){
  const on=r.last===today(),id="rt-"+r.id;
  return '<div class="task k4'+(on?" done":"")+'"><input type="checkbox" id="'+id+'" data-rt="'+r.id+'"'+(on?" checked":"")+'><label for="'+id+'"><span class="sub">Rotina diária</span><span class="ti">'+esc(r.n)+'</span></label><span class="meta"><span class="chip s">Rotina</span><span class="min">'+hm(r.m)+"</span></span></div>";
}
const ORD={s:0,r:1,q:2,p:3};
const byKind=(a,b)=>(a.kind==="p")-(b.kind==="p")||(b.kind==="s")-(a.kind==="s")||(a.t.id<b.t.id?-1:a.t.id>b.t.id?1:0)||ORD[a.kind]-ORD[b.kind];
// Revisão e questões da mesma aula no mesmo dia viram uma linha só, que abre ao tocar na seta.
function grouped(list,o){
  const cnt={},seen={};
  list.forEach(x=>{if(isRev(x))cnt[x.t.id]=(cnt[x.t.id]||0)+1});
  let h="";
  list.forEach(x=>{
    const t=x.t;
    if(!isRev(x)||cnt[t.id]<2){h+=row(x,o);return}
    if(seen[t.id])return;seen[t.id]=1;
    const ch=list.filter(y=>y.t===t&&isRev(y)),dn=ch.filter(y=>y.done).length,all=dn===ch.length;
    const s=subOf(t.s)||{n:"Sem matéria",c:0},open=!!ui.openG[t.id],id="g-"+t.id;
    h+='<div class="grp"><div class="task g k'+s.c+(all?" done":"")+'"><input type="checkbox" id="'+id+'" data-g="'+t.id+'"'+(all?" checked":"")+' aria-label="Marcar revisão e questões de '+esc(t.t)+'">'+
       '<label for="'+id+'"><span class="sub">'+esc(s.n)+" · "+dn+" de "+ch.length+' feitas</span><span class="ti">'+esc(t.t)+"</span></label>"+
       '<span class="meta"><span class="chip r">Revisão + questões</span>'+(ch.some(y=>y.late&&!y.done)?'<span class="chip late">atrasada</span>':"")+'<span class="min">'+hm(sum(ch))+"</span></span>"+
       '<button type="button" class="btn sm ghost" data-act="grp" data-id="'+t.id+'" aria-expanded="'+open+'" aria-label="'+(open?"Recolher":"Abrir")+' tarefas">'+(open?"▾":"▸")+"</button></div>"+
       (open?'<div class="kids">'+ch.map(y=>row(y,o)).join("")+"</div>":"")+"</div>";
  });
  return h;
}
function vHoje(){
  const t0=today(),all=allTasks(),pend=all.filter(x=>!x.done);
  if(!S.topics.length&&!(S.sm||[]).length&&!(S.rt||[]).length)return '<section class="card note"><h2>Bem-vindo ao curso '+esc(S.n)+"</h2><div>Três passos para montar o cronograma:</div>"+
    '<div class="topic"><span><b>1.</b> Traga as matérias e aulas do seu curso: copie a página do curso na plataforma e cole no app, que separa tudo para você conferir.</span><button type="button" class="btn sm" data-act="goimp">Importar do curso</button></div>'+
    '<div class="topic"><span><b>2.</b> Informe as horas disponíveis por dia e a data de início.</span><button type="button" class="btn sm ghost" data-act="goto" data-tab="ajustes">Abrir Ajustes</button></div>'+
    '<div class="topic"><span><b>3.</b> Volte aqui: as tarefas do dia aparecem nesta aba, e o cronograma se reorganiza sozinho quando algo atrasa.</span></div>'+
    '<div class="muted">Se alguém te passou um código de curso, cole em Ajustes, na seção Backup e compartilhamento.</div></section>';
  const list=all.filter(x=>x.done===t0||(!x.done&&x.plan===t0)).sort(byKind);
  const capM=cap(t0),rts=(S.rt||[]).filter(r=>capM>0||r.last===t0);
  const doneM=sum(all.filter(x=>x.done===t0))+rts.filter(r=>r.last===t0).reduce((n,r)=>n+r.m,0);
  const rvPend=pend.filter(isRev).length;
  const act=activeSubs().map(id=>subOf(id).n);
  const pct=capM?clamp(Math.round(doneM/capM*100),0,100):(doneM?100:0);
  const sk=streak();
  let h='<section class="card"><h2>'+fmt(t0)+'</h2><div class="big">'+hm(doneM)+" <small>de "+hm(capM)+' planejadas hoje</small></div><div class="bar ok"><i style="width:'+pct+'%"></i></div>'+
     '<div class="facts"><span>Revisões e questões liberadas <b>'+rvPend+"</b></span><span>Dias seguidos cumpridos <b>"+sk+"</b></span></div>"+
     (act.length?'<div class="muted">Em estudo agora: '+esc(act.join(", "))+".</div>":"")+"</section>";
  if(moved)h+='<section class="card crit"><h2>'+moved+(moved===1?" tarefa atrasada foi redistribuída":" tarefas atrasadas foram redistribuídas")+"</h2><div>O que ficou sem marcar em dias anteriores voltou para hoje, e o restante do cronograma foi empurrado conforme suas horas. Elas aparecem com a etiqueta atrasada.</div></section>";
  if(!S.hours.some(x=>x>0))h+='<section class="card crit"><h2>Nenhuma hora de estudo definida</h2><div>Informe em Ajustes quantas horas você tem em cada dia da semana.</div></section>';
  else if(S.off&&S.off.indexOf(t0)>=0)h+='<section class="card note"><h2>Hoje está marcado como dia sem estudo</h2><div>As tarefas foram empurradas para os próximos dias. Para desfazer, use o botão; os outros dias sem estudo ficam em Ajustes, na seção Dias sem estudo.</div><div class="row"><button type="button" class="btn" data-act="offdel" data-d="'+t0+'">Voltar a estudar hoje</button></div></section>';
  else if(!capM&&!list.length)h+='<section class="card note"><div>Hoje não tem horas de estudo no seu plano. As horas de cada dia da semana ficam em Ajustes, em Regras do cronograma.</div></section>';
  const o={timer:true,score:true};
  if(S.start>t0&&!list.length&&S.topics.length){
    const first=pend.reduce((m,x)=>x.plan&&(!m||x.plan<m)?x.plan:m,"");
    const n=Math.round((pd(S.start)-pd(t0))/864e5);
    h+='<section class="card note"><h2>Seu cronograma começa em '+fmtY(S.start)+"</h2><div>Faltam "+n+" dias. Abaixo está o primeiro dia previsto. A data de início pode ser mudada em Ajustes.</div></section>";
    if(first)h+='<section class="list"><div class="day"><h2>'+fmt(first)+"</h2><span>primeiro dia</span></div>"+grouped(pend.filter(x=>x.plan===first).sort(byKind),o)+"</section>";
  }else{
    h+='<section class="list"><div class="day"><h2>Tarefas de hoje</h2><span>'+hm(sum(list)+rts.reduce((n,r)=>n+r.m,0))+"</span></div>";
    h+=rts.map(rtRow).join("")+(list.length?grouped(list,o):(rts.length?"":'<div class="muted">Nada previsto para hoje.</div>'));
    h+="</section>";
    if(list.length&&!list.some(x=>!x.done)||(!list.length&&capM)){
      const nx=pend.filter(x=>x.kind==="p"&&x.plan&&x.plan>t0).sort((a,b)=>a.plan<b.plan?-1:a.plan>b.plan?1:0).slice(0,2);
      if(nx.length)h+='<section class="list"><div class="day"><h2>Quer adiantar?</h2><span>próximas aulas da fila</span></div>'+nx.map(x=>row(x,o)).join("")+"</section>";
    }
  }
  return h;
}
let cardOpen=true,histOpen=false;
try{cardOpen=localStorage.getItem("plano-card")!=="0";histOpen=localStorage.getItem("plano-hist")==="1"}catch(e){}
const tog=(act,title,open,extra)=>'<button type="button" class="tog" data-act="'+act+'"'+(extra||"")+' aria-expanded="'+open+'"><b>'+title+'</b><span aria-hidden="true">'+(open?"▾":"▸")+"</span></button>";
// Conclusão: aulas cadastradas + revisões e questões que já entraram no cronograma.
function courseCard(){
  const all=allTasks(),pend=all.filter(x=>!x.done);
  const pdfs=all.filter(x=>x.kind==="p"),pdfDone=pdfs.filter(x=>x.done).length;
  if(!pdfs.length)return "";
  let rvTot=0,rvDone=0;
  S.topics.forEach(t=>{if(t.pd){rvTot+=(t.fin||0)+t.rv.length;rvDone+=(t.fin||0)+t.rv.filter(r=>r.done).length}});
  const tot=pdfs.length+rvTot,dn=pdfDone+rvDone,cp=tot?Math.floor(dn/tot*100):0;
  const last=pdfs.reduce((m,x)=>!x.done&&x.plan&&x.plan>m?x.plan:m,"");
  let end=last;
  Object.keys(proj).forEach(d=>{if(d>end)end=d});
  pend.forEach(x=>{if(x.kind!=="s"&&x.plan&&x.plan>end)end=x.plan});
  const head=tog("card","Conclusão do curso"+(cardOpen?"":" · "+cp+"%"),cardOpen);
  if(!cardOpen)return '<section class="card">'+head+"</section>";
  const p=pace(),rit=S.tn>=5?"Seu ritmo cronometrado é de "+String(Math.round(p*100)/100).replace(".",",")+"× o tempo planejado ("+S.tn+" tarefas), e a previsão já usa esse ritmo.":"A previsão passa a usar seu ritmo real depois de 5 tarefas cronometradas ("+(S.tn||0)+" até agora).";
  return '<section class="card">'+head+'<div class="big">'+cp+"% <small>"+dn+" de "+tot+' tarefas concluídas</small></div><div class="bar"><i style="width:'+cp+'%"></i></div><div class="facts"><span>Aulas <b>'+pdfDone+" de "+pdfs.length+"</b></span><span>Revisões e questões liberadas <b>"+rvDone+" de "+rvTot+"</b></span>"+
     (last?"<span>Última aula prevista para <b>"+fmtY(last)+"</b></span>":"<span><b>Todas as aulas foram estudadas</b></span>")+
     (end&&end!==last?"<span>Últimas revisões e questões até <b>"+fmtY(end)+"</b></span>":"")+"</div>"+
     '<div class="muted">Revisões e questões só entram na conta quando são liberadas pelo estudo da aula. Simulados e rotinas não entram. '+rit+"</div></section>";
}
function histCard(){
  const lg=S.log||{},sk=streak();
  const head=tog("hist","Histórico"+(histOpen?"":" · "+sk+(sk===1?" dia seguido":" dias seguidos")),histOpen);
  if(!histOpen)return '<section class="card">'+head+"</section>";
  const t0=today(),mon=addDays(t0,-((pd(t0).getDay()+6)%7)),wk=[];
  for(let w=7;w>=0;w--){
    const st=addDays(mon,-7*w);let m=0;
    for(let i=0;i<7;i++){const e=lg[addDays(st,i)];if(e)m+=e.m}
    wk.push({st:st,m:m});
  }
  const mx=Math.max(60,Math.max.apply(null,wk.map(x=>x.m)));
  const sims=(S.sm||[]).filter(m=>m.done&&m.qn).sort((a,b)=>a.done<b.done?1:-1).slice(0,6);
  return '<section class="card">'+head+'<div class="big">'+sk+" <small>"+(sk===1?"dia seguido cumprido":"dias seguidos cumpridos")+'</small></div><div class="muted">Horas estudadas por semana (últimas 8, começando na segunda)</div><div class="bars">'+
    wk.map(x=>{const d=pd(x.st);return '<div class="bcol"><span>'+(x.m?hm(x.m):"–")+'</span><span class="b" style="height:'+Math.round(x.m/mx*72)+'px"></span><span>'+pad(d.getDate())+"/"+pad(d.getMonth()+1)+"</span></div>"}).join("")+"</div>"+
    (sims.length?'<div class="muted">Simulados</div>'+sims.map(m=>'<div class="topic"><span>'+esc(m.n)+' <span class="st">'+fmtY(m.done)+"</span></span><b>"+pct100(m.qc||0,m.qn)+"%</b></div>").join(""):"")+
    '<div class="muted">Um dia conta como cumprido quando você estudou e não sobrou tarefa nem rotina prevista para ele. Dias sem estudo não quebram a sequência.</div></section>';
}
function vCron(){
  const t0=today(),all=allTasks(),g={},load={},rtm=rtMin();
  all.forEach(x=>{
    if(!x.done&&x.plan){(g[x.plan]||(g[x.plan]=[])).push(x);load[x.plan]=(load[x.plan]||0)+x.min}
    else if(x.done===t0)load[t0]=(load[t0]||0)+x.min;
  });
  const first=addDays(t0,7*ui.wk),days=[];
  for(let i=0;i<7;i++)days.push(addDays(first,i));
  let h=courseCard()+histCard();
  const f=pd(days[0]),l=pd(days[6]);
  h+='<section class="card"><div class="day"><button type="button" class="btn sm ghost" data-act="wk" data-n="-1" aria-label="Semana anterior"'+(ui.wk<=0?" disabled":"")+'>‹</button><h2>'+pad(f.getDate())+"/"+pad(f.getMonth()+1)+" a "+pad(l.getDate())+"/"+pad(l.getMonth()+1)+'</h2><button type="button" class="btn sm ghost" data-act="wk" data-n="1" aria-label="Próxima semana">›</button></div><div class="week">'+
    days.map(d=>{
      const c=cap(d),tot=(load[d]||0)+(proj[d]||0)+(c?rtm:0),pct=c?clamp(Math.round(tot/c*100),0,100):0,x=pd(d);
      return '<div class="wd'+(d===t0?" now":"")+'"><span>'+DOW[x.getDay()]+"</span><b>"+pad(x.getDate())+'</b><span class="wb"><i style="height:'+pct+'%"></i></span><span>'+(c?hm(tot):"folga")+"</span></div>";
    }).join("")+'</div><div class="muted">A barra mostra quanto do dia já está ocupado, contando rotinas e o tempo reservado para revisões e questões que ainda vão ser liberadas.</div></section>';
  let any=false;
  days.forEach(k=>{
    if(!g[k])return;any=true;
    const lst=g[k].sort(byKind);
    h+='<section class="list"><div class="day"><h2>'+fmt(k)+(k===t0?" · hoje":"")+"</h2><span>"+hm(sum(lst))+(rtm&&cap(k)?" + "+hm(rtm)+" de rotinas":"")+(proj[k]?" + "+hm(proj[k])+" previstos":"")+" · limite "+hm(cap(k))+"</span></div>"+lst.map(x=>row(x)).join("")+"</section>";
  });
  if(!any)h+='<section class="card"><div class="muted">'+(S.topics.length?"Nenhuma tarefa prevista para estes 7 dias.":"Cadastre aulas em Matérias para montar o cronograma.")+"</div></section>";
  return h;
}
let drag=null,weakOpen=false,perfOpen=true;
try{perfOpen=localStorage.getItem("plano-perf")!=="0"}catch(e){}
// Desempenho nas questões por matéria: total acumulado e recorte das aulas ainda em revisão.
function perfCard(){
  const lo=S.al||60,hi=S.ah||85,rows=[];let tn=0,tc=0;
  S.subs.forEach(s=>{
    let n=0,c=0,rn=0,rc=0;
    S.topics.forEach(t=>{
      if(t.s!==s.id)return;
      n+=t.qn||0;c+=t.qc||0;
      t.rv.forEach(r=>{if(r.qn){n+=r.qn;c+=r.qc||0;rn+=r.qn;rc+=r.qc||0}});
    });
    if(n){rows.push({s:s,n:n,c:c,rn:rn,rc:rc});tn+=n;tc+=c}
  });
  if(!rows.length)return "";
  const all=pct100(tc,tn),head=tog("perf","Desempenho nas questões"+(perfOpen?"":" · "+all+"%"),perfOpen);
  if(!perfOpen)return '<section class="card">'+head+"</section>";
  rows.sort((a,b)=>a.c/a.n-b.c/b.n);
  return '<section class="card">'+head+'<div class="big">'+all+"% <small>de acerto em "+tn+' questões no curso</small></div>'+
    rows.map(x=>{
      const p=pct100(x.c,x.n),few=x.n<10,rp=x.rn?pct100(x.rc,x.rn):-1;
      const st=few?["","poucas questões"]:p<lo?["low","considere reiniciar"]:p>hi?["on","dominando"]:["","em evolução"];
      const tr=rp<0||x.rn===x.n||x.rn<5?"":" · recentes "+rp+"%"+(rp>=p+5?" ↑":rp<=p-5?" ↓":"");
      return '<div class="perf k'+x.s.c+'"><div class="subj-info"><span class="sw"></span><b>'+esc(x.s.n)+'</b><span class="badge '+st[0]+'">'+st[1]+'</span></div><div class="bar'+(p>hi?" ok":p<lo&&!few?" bad":"")+'"><i style="width:'+p+'%"></i></div><div class="count">'+p+"% · "+x.c+" de "+x.n+" questões"+tr+"</div></div>";
    }).join("")+
    '<div class="muted">Abaixo de '+lo+"% com pelo menos 10 questões, o sinal é de base teórica fraca: vale zerar a matéria, que fica dentro dela mais abaixo, e reestudar os PDFs. Acima de "+hi+"%, a matéria está dominada. O recorte recentes considera só as aulas que ainda têm revisões em andamento, e a seta mostra se elas estão melhores ou piores que o total. Simulados não entram aqui.</div></section>";
}
function weakCard(){
  const lim=S.al||60,ws=[];
  S.topics.forEach(t=>{const a=topicAcc(t);if(a.n>=5&&pct100(a.c,a.n)<lim)ws.push({t:t,p:pct100(a.c,a.n),n:a.n})});
  if(!ws.length)return "";
  ws.sort((a,b)=>a.p-b.p);
  const head=tog("weak","Pontos fracos · "+ws.length+(ws.length===1?" aula":" aulas"),weakOpen);
  if(!weakOpen)return '<section class="card">'+head+"</section>";
  return '<section class="card">'+head+'<div class="muted">Aulas com menos de '+lim+"% de acerto e pelo menos 5 questões feitas, da pior para a melhor. O reforço cria uma revisão e uma rodada de questões extras no primeiro dia com tempo livre, a partir de hoje.</div>"+
    ws.slice(0,10).map(w=>{
      const s=subOf(w.t.s)||{n:""},has=w.t.rv.some(r=>r.x&&!r.done);
      return '<div class="topic"><span>'+esc(w.t.t)+' <span class="st">'+esc(s.n)+" · "+w.p+"% em "+w.n+' questões</span></span><button type="button" class="btn sm ghost" data-act="again" data-id="'+w.t.id+'"'+(has?" disabled":"")+">"+(has?"Reforço agendado":"Agendar reforço")+"</button></div>";
    }).join("")+"</section>";
}
/* ---------- importar curso colando o conteúdo da página ---------- */
const fold=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const RX_DUR=/\(?\s*(\d{1,2}\s*h(oras?)?\s*\d{0,2}\s*(m(in(utos)?)?)?|\d{1,3}\s*min(utos)?|\d{1,2}:\d{2}(:\d{2})?)\s*\)?/gi;
const RX_LESSON=/^(aula|video\s?aula|pdf|livro digital|apostila|capitulo|cap\.|modulo|unidade|topico|meta|parte|bloco|encontro|semana|licao)\b\s*(n[ºo°.]?\s*)?[\divxlc]*\s*([-–—:.)|]|$|\s)/;
const RX_NUM=/^(\d{1,3}|[ivxlc]{1,6})\s*[-–—.):]\s*\S/;
const RX_NOISE=[
  /^(assistir|baixar|download|ver (mais|menos|tudo)|concluid[oa]s?|nao iniciad[oa]|em andamento|iniciar|continuar|retomar|marcar( como)?|favoritar|compartilhar|curtir|comentarios?|avaliar|progresso|anotacoes|duvidas?|forum|abrir|acessar|voltar|proxim[oa]|anterior|menu|inicio|home|sair|buscar|pesquisar|filtrar|ordenar)\b/,
  /^(pdf|video|videos|questoes?|resumo|mapa mental|mapas mentais|slides?|audio|audios|material( de apoio)?|materiais|arquivos?|anexos?|exercicios?|simulado|gabarito)s?$/,
  /^\d+\s*%$/,/^\d+\s*(de|\/)\s*\d+$/,
  /^\d+\s*(aulas?|videos?|videoaulas?|pdfs?|arquivos?|itens?|questoes|materiais|topicos)(\s+\S+)?$/,
  /^[\d\s:hm%().,/-]+$/,
  /^(professor|professora|prof\.|por)\b/,
  /^(atualizad[oa]|publicad[oa]|disponivel|lancamento|novo|nova)\b/
];
function cleanLine(s){
  s=s.replace(/[ \t]+/g," ").replace(/^[\s•●○◦▪▫■□✓✔☐☑✅▶►▸>*·-]+/,"").replace(RX_DUR," ").replace(/\s{2,}/g," ").trim();
  return s.replace(/[\s|·•–—-]+$/,"").trim();
}
const isNoise=s=>{const f=fold(s);return f.length<3||RX_NOISE.some(r=>r.test(f))};
const isLesson=s=>{const f=fold(s);return RX_LESSON.test(f)||RX_NUM.test(f)};
const bareLesson=s=>/^(aula|video\s?aula|pdf|livro digital|capitulo|modulo|unidade|meta|parte|bloco)\s*(n[ºo°.]?\s*)?[\divxlc]+\s*[-–—:.]?$/.test(fold(s));
const subjHint=s=>/^#/.test(s)||/:$/.test(s)||/^(materia|disciplina|curso|conteudo)\s*:/.test(fold(s))||(s.length>=4&&s===s.toUpperCase()&&/[A-ZÀ-Ý]{3}/.test(s));
const SMALL=new Set(["de","da","do","das","dos","e","a","o","em","na","no","nas","nos","para","por","com"]);
const titleCase=s=>s.toLowerCase().split(" ").map((w,i)=>i&&SMALL.has(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
const subjName=s=>{s=s.replace(/^#+\s*/,"").replace(/^(mat[eé]ria|disciplina|conte[uú]do)\s*:\s*/i,"").replace(/:$/,"").trim();return s===s.toUpperCase()&&/[A-ZÀ-Ý]{3}/.test(s)?titleCase(s):s};
// Lê o texto colado e devolve no formato de edição: "# Matéria" seguido das aulas, uma por linha.
function recognize(raw){
  const items=[];let prev="";
  raw.split(/\r?\n/).forEach(l=>{
    const c=cleanLine(l);
    if(!c||isNoise(c)||fold(c)===fold(prev))return;
    prev=c;items.push({t:c.slice(0,120),les:isLesson(c),hint:subjHint(c)});
  });
  const subs=[];let cur=null;
  const add=n=>{cur={n:subjName(n).slice(0,60)||"Matéria",ls:[]};subs.push(cur)};
  const anyLesson=items.some(x=>x.les);
  items.forEach((x,i)=>{
    const nx=items[i+1];
    if(anyLesson){
      if(x.les){
        if(!cur)add("Matéria 1");
        cur.ls.push(x.t);return;
      }
      const last=cur&&cur.ls.length?cur.ls[cur.ls.length-1]:"";
      if(last&&bareLesson(last)&&!x.hint){cur.ls[cur.ls.length-1]=(last.replace(/[-–—:.\s]+$/,"")+" - "+x.t).slice(0,120);return}
      if(x.hint||!cur||(nx&&nx.les)||!nx)add(x.t);
      else cur.ls.push(x.t);
    }else{
      if(x.hint||!cur)add(x.t);else cur.ls.push(x.t);
    }
  });
  return subs.filter(s=>s.ls.length||subs.length===1).map(s=>"# "+s.n+"\n"+s.ls.join("\n")).join("\n\n");
}
function parseNorm(txt){
  const subs=[];let cur=null;
  txt.split(/\r?\n/).forEach(l=>{
    const t=l.trim();if(!t)return;
    if(t.charAt(0)==="#"){cur={n:t.replace(/^#+\s*/,"").slice(0,60)||"Matéria",ls:[]};subs.push(cur)}
    else{if(!cur){cur={n:"Matéria 1",ls:[]};subs.push(cur)}cur.ls.push(t.slice(0,120))}
  });
  return subs;
}
function impCard(){
  const I=ui.imp;
  if(!I||I.step===0){
    return '<section class="card" id="imp">'+tog("imp","Importar do seu curso",!!I,"")+(I?'<div class="muted">Abra a página do curso na plataforma (Gran, Estratégia ou outra) com a lista de matérias e aulas, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui. Se o curso tiver uma página por matéria, cole uma de cada vez. O app tenta separar matérias e aulas, e você confere antes de adicionar.</div>'+
      '<label class="field">Conteúdo copiado da página do curso<textarea id="i-raw" style="min-height:160px" placeholder="Cole aqui o texto da página do curso">'+esc(I.raw||"")+'</textarea></label>'+
      '<div class="row"><button type="button" class="btn" data-act="imp-read">Reconhecer matérias e aulas</button>'+(I.msg?'<span class="muted">'+esc(I.msg)+"</span>":"")+"</div>":"")+"</section>";
  }
  const subs=parseNorm(I.norm),tot=subs.reduce((n,s)=>n+s.ls.length,0),empty=subs.filter(s=>!s.ls.length).length;
  const ex=new Set(S.subs.map(s=>fold(s.n)));
  return '<section class="card" id="imp">'+tog("imp","Importar do seu curso · conferir",true,"")+
    '<div class="big">'+subs.length+" <small>"+(subs.length===1?"matéria":"matérias")+" e "+tot+" "+(tot===1?"aula reconhecidas":"aulas reconhecidas")+"</small></div>"+
    '<div class="muted">Confira e corrija no texto abaixo: cada linha que começa com # é uma matéria, e as linhas seguintes são as aulas dela. Apague o que não for aula, junte ou separe matérias à vontade.</div>'+
    '<label class="field">Matérias e aulas<textarea id="i-norm" style="min-height:260px;font-family:ui-monospace,Consolas,monospace">'+esc(I.norm)+"</textarea></label>"+
    '<div class="row"><button type="button" class="btn sm ghost" data-act="imp-refresh">Atualizar a contagem</button></div>'+
    (subs.length?'<div class="facts">'+subs.map(s=>"<span>"+esc(s.n)+" <b>"+s.ls.length+"</b>"+(ex.has(fold(s.n))?" · já existe, as aulas serão somadas":"")+"</span>").join("")+"</div>":"")+
    (empty?'<div class="muted">'+empty+(empty===1?" matéria está":" matérias estão")+" sem aulas e "+(empty===1?"será ignorada":"serão ignoradas")+".</div>":"")+
    '<div class="form"><label class="field">Minutos por PDF<input type="number" id="i-pm" value="'+(I.pm||60)+'" min="5" max="600" inputmode="numeric"></label>'+
    '<label class="field">Adicionar em<select id="i-dest"><option value="cur"'+(I.dest!=="new"?" selected":"")+">Curso atual ("+esc(S.n)+')</option><option value="new"'+(I.dest==="new"?" selected":"")+">Um curso novo</option></select></label>"+
    '<label class="field full" id="i-new-w"'+(I.dest==="new"?"":" hidden")+'>Nome do curso novo<input type="text" id="i-new" value="'+esc(I.cn||"")+'" maxlength="60"></label></div>'+
    '<div class="row"><button type="button" class="btn" data-act="imp-go"'+(tot?"":" disabled")+'>Adicionar ao cronograma</button><button type="button" class="btn ghost" data-act="imp-back">Voltar e colar de novo</button><button type="button" class="btn ghost" data-act="imp-cancel">Cancelar</button></div>'+
    (I.msg?'<div class="muted">'+esc(I.msg)+"</div>":"")+"</section>";
}
function impApply(subs,pm,target){
  let n=0;
  subs.forEach(s=>{
    if(!s.ls.length)return;
    let sub=target.subs.find(x=>fold(x.n)===fold(s.n));
    if(!sub){sub={id:"s"+(target.sq++),n:s.n,c:target.subs.length%6,w:1};target.subs.push(sub)}
    s.ls.forEach(t=>{target.topics.push({id:"t"+(target.seq++),s:sub.id,t:t,pm:pm,l:"",pd:null,pp:null,rv:[]});n++});
  });
  return n;
}
function vMaterias(){
  const act=activeSubs(),by=pendingBySub();
  let h=perfCard()+weakCard()+'<section class="card"><h2>Ordem de preferência</h2><div class="muted">As '+S.na+" primeiras matérias com aula pendente ficam em estudo. Quando uma termina, a próxima da ordem entra sozinha. Arraste pelo ⠿ ou use as setas para mudar a ordem.</div>";
  if(S.subs.length){
    if(!ui.del)h+='<div class="row"><button type="button" class="btn sm ghost" data-act="delmode">Excluir várias matérias</button></div>';
    else{
      const sel=S.subs.filter(s=>ui.del[s.id]),nl=S.topics.filter(t=>ui.del[t.s]).length;
      h+='<div class="card note"><div>Marque as matérias que quer excluir. As aulas delas saem junto.</div><div class="row"><button type="button" class="btn sm ghost" data-act="delall">'+(sel.length===S.subs.length?"Desmarcar todas":"Marcar todas")+'</button>'+
        '<button type="button" class="btn sm danger" data-act="delsel"'+(sel.length?"":" disabled")+'>'+(ui.confirm==="delsel"?"Confirmar: excluir "+sel.length+(sel.length===1?" matéria":" matérias")+" e "+nl+(nl===1?" aula":" aulas"):"Excluir "+sel.length+(sel.length===1?" selecionada":" selecionadas"))+'</button><button type="button" class="btn sm ghost" data-act="delmode">Cancelar</button></div></div>';
    }
  }
  let pos=0;
  if(!S.subs.length)h+='<div class="muted">Nenhuma matéria cadastrada ainda.</div>';
  S.subs.forEach((s,i)=>{
    const ts=S.topics.filter(t=>t.s===s.id),dn=ts.filter(t=>t.pd).length,tot=ts.length;
    const pct=tot?Math.round(dn/tot*100):0,open=ui.openSub===s.id,ac=subAcc(s.id);
    const st=!tot?["","sem aulas"]:!by[s.id].length?(ts.some(t=>!t.pd)?["on","reestudo na fila"]:["","aulas concluídas"]):act.includes(s.id)?["on","em estudo"]:["",(++pos)+"ª da fila"];
    const ap=ac.n?pct100(ac.c,ac.n):-1;
    h+='<div class="subj k'+s.c+'" data-sid="'+s.id+'"><div class="subj-top">'+(ui.del?'<input type="checkbox" class="pick" data-pick="'+s.id+'" aria-label="Selecionar '+esc(s.n)+'"'+(ui.del[s.id]?" checked":"")+'>':'<span class="grip" data-grip="'+s.id+'" aria-hidden="true">⠿</span>')+'<button type="button" class="subj-h" data-act="open" data-s="'+s.id+'" aria-expanded="'+open+'"><span class="sw"></span><span class="subj-info"><b>'+esc(s.n)+'</b><span class="badge '+st[0]+'">'+st[1]+'</span><span class="count">'+dn+"/"+tot+" aulas</span>"+
       (ap>=0?'<span class="badge'+(ap<(S.al||60)?" low":"")+'">'+ap+"% de acerto em "+ac.n+" questões</span>":"")+"</span></button>"+
       '<span class="ord"><button type="button" class="btn sm ghost" data-act="up" data-s="'+s.id+'" aria-label="Subir '+esc(s.n)+'"'+(i===0?" disabled":"")+'>↑</button><button type="button" class="btn sm ghost" data-act="down" data-s="'+s.id+'" aria-label="Descer '+esc(s.n)+'"'+(i===S.subs.length-1?" disabled":"")+'>↓</button><button type="button" class="btn sm ghost" data-act="delsub" data-s="'+s.id+'" aria-label="Excluir '+esc(s.n)+'">✕</button></span></div><div class="bar"><i style="width:'+pct+'%"></i></div>';
    if(ui.confirm==="del"+s.id)h+='<div class="card crit"><div><b>Excluir '+esc(s.n)+'?</b> '+(tot?(tot===1?"Sai também a única aula":"Saem também as "+tot+" aulas")+(dn?", incluindo "+dn+(dn===1?" já estudada":" já estudadas")+", com revisões, questões e acertos":"")+".":"A matéria não tem aulas.")+' Se for engano, use Desfazer logo em seguida.</div><div class="row"><button type="button" class="btn danger" data-act="delsub-ok" data-s="'+s.id+'">Excluir</button><button type="button" class="btn ghost" data-act="delsub-no">Cancelar</button></div></div>';
    if(open){
      h+='<div class="form"><label class="field">Nome da matéria<input type="text" id="s-name" data-sn="'+s.id+'" value="'+esc(s.n)+'" maxlength="60"></label>'+
         '<label class="field">Aulas por rodada (peso)<select id="s-w" data-w="'+s.id+'">'+[1,2,3].map(w=>'<option value="'+w+'"'+((s.w||1)===w?" selected":"")+">"+w+"</option>").join("")+"</select></label></div>";
      ts.forEach(t=>{
        if(ui.edit===t.id){
          h+='<div class="form"><label class="field full">Título<input type="text" id="e-t" value="'+esc(t.t)+'" maxlength="120"></label>'+
             '<label class="field">Minutos do PDF<input type="number" id="e-pm" value="'+t.pm+'" min="5" max="600" inputmode="numeric"></label>'+
             '<label class="field">Link do PDF no curso (opcional)<input type="url" id="e-l" value="'+esc(t.l||"")+'" placeholder="https://"></label>'+
             '<label class="field full">Anotação (aparece nas revisões)<textarea id="e-nt" maxlength="500">'+esc(t.nt||"")+"</textarea></label>"+
             '<div class="full row"><button type="button" class="btn sm" data-act="save" data-id="'+t.id+'">Salvar</button><button type="button" class="btn sm ghost" data-act="cancel">Cancelar</button>'+(t.pd?'<button type="button" class="btn sm danger" data-act="zerot" data-id="'+t.id+'">'+(ui.confirm==="zt"+t.id?"Confirmar: zerar esta aula":"Zerar esta aula")+"</button>":"")+'<button type="button" class="btn sm danger" data-act="del" data-id="'+t.id+'">Excluir aula</button></div>'+(t.pd?'<div class="full muted">Zerar desmarca o PDF, as revisões e as questões só desta aula, e ela vai para a frente da fila para ser reestudada. As outras aulas da matéria não mudam, e os acertos já registrados continuam no percentual da matéria.</div>':"")+"</div>";
        }else{
          const a=topicAcc(t),nd=(t.fin||0)+t.rv.filter(r=>r.done).length,nt=(t.fin||0)+t.rv.length;
          const st2=(!t.pd?"PDF pendente":"PDF ✓ · revisões e questões "+nd+"/"+nt)+(a.n?" · "+pct100(a.c,a.n)+"% de acerto":"")+(t.nt?" · com anotação":"");
          h+='<div class="topic"><span>'+esc(t.t)+' <span class="st">'+st2+'</span></span><button type="button" class="btn sm ghost" data-act="edit" data-id="'+t.id+'">Editar</button></div>';
        }
      });
      const ck="clear"+s.id,zk="zero"+s.id;
      h+='<div class="row">'+(dn?'<button type="button" class="btn sm danger" data-act="zerosub" data-s="'+s.id+'">'+(ui.confirm===zk?"Confirmar: desmarcar tudo desta matéria":"Zerar progresso desta matéria")+"</button>":"")+(ts.length&&dn?'<button type="button" class="btn sm danger" data-act="clear" data-s="'+s.id+'">'+(ui.confirm===ck?"Confirmar: remover aulas não estudadas":"Remover aulas não estudadas desta matéria")+"</button>":"")+
         '<button type="button" class="btn sm danger" data-act="delsub" data-s="'+s.id+'">Excluir matéria</button>'+"</div>";
    }
    h+="</div>";
  });
  h+="</section>";
  h+=impCard();
  h+='<section class="card"><h2>Cadastrar matéria e aulas</h2><div class="muted">Cole os títulos das aulas do curso, um por linha, ou deixe a lista vazia e informe só a quantidade.</div><div class="form">'+
    '<label class="field full">Matéria<select id="a-sub">'+S.subs.map(s=>'<option value="'+s.id+'">'+esc(s.n)+"</option>").join("")+'<option value="new"'+(S.subs.length?"":" selected")+'>Nova matéria…</option></select></label>'+
    '<label class="field full" id="a-new-w"'+(S.subs.length?" hidden":"")+'>Nome da nova matéria<input type="text" id="a-new" maxlength="60"></label>'+
    '<label class="field full">Títulos das aulas, um por linha (opcional)<textarea id="a-list" placeholder="Aula 00 - Introdução&#10;Aula 01 - ..."></textarea></label>'+
    '<label class="field">Nome base, se não colar títulos<input type="text" id="a-pre" value="PDF" maxlength="40"></label>'+
    '<label class="field">Quantidade, se não colar títulos<input type="number" id="a-n" value="10" min="1" max="80" inputmode="numeric"></label>'+
    '<label class="field">Minutos por PDF<input type="number" id="a-pm" value="60" min="5" max="600" inputmode="numeric"></label>'+
    '<div class="full row"><button type="button" class="btn" data-act="add">Adicionar ao cronograma</button></div></div></section>';
  return h;
}
const rulesOf=s=>({hours:s.hours.slice(),na:s.na,start:s.start,rc:s.rc||100,ad:s.ad?1:0,al:s.al||60,ah:s.ah||85,pf:s.pf||25,ps:s.ps||5,pl:s.pl||15,iv:clone(s.iv)});
const ival=(id,d,a,b)=>{const e=$(id),v=e?parseInt(e.value,10):NaN;return clamp(isNaN(v)?d:v,a,b)};
function readDraft(){
  const D=ui.draft||rulesOf(S);
  const d={hours:[],na:ival("f-na",D.na,1,99),start:($("f-start")&&$("f-start").value)||D.start,rc:ival("f-rc",D.rc,10,100),ad:$("f-ad")?($("f-ad").value==="0"?0:1):D.ad,
    al:ival("f-al",D.al,1,99),ah:ival("f-ah",D.ah,2,100),pf:ival("f-pf",D.pf,5,120),ps:ival("f-ps",D.ps,1,60),pl:ival("f-pl",D.pl,1,90),iv:[]};
  if(d.ah<=d.al)d.ah=Math.min(100,d.al+1);
  for(let i=0;i<7;i++){const e=$("h-"+i),v=e?parseFloat(e.value):NaN;d.hours.push(clamp(isNaN(v)?(e?0:D.hours[i]):v,0,16))}
  for(let i=0;i<D.iv.length;i++)d.iv.push({d:ival("iv-d"+i,D.iv[i].d,1,365),rm:ival("iv-r"+i,D.iv[i].rm,0,240),qm:ival("iv-q"+i,D.iv[i].qm,0,240)});
  return d;
}
ui.sec={conta:1,curso:1};
function vAjustes(){
  const D=ui.draft||rulesOf(S),changed=!!ui.draft&&JSON.stringify(ui.draft)!==JSON.stringify(rulesOf(S));
  const tot=D.hours.reduce((a,b)=>a+b,0),t0=today();
  const sec=(k,title,body)=>'<section class="card">'+tog("sec",title,!!ui.sec[k],' data-k="'+k+'"')+(ui.sec[k]?body:"")+"</section>";
  const acc=!CID?'<div class="muted">A sincronização ainda não foi configurada: falta colocar o ID do cliente Google no arquivo config.js. Sem isso, o plano funciona normalmente, mas fica salvo só neste aparelho.</div>':
    '<div class="muted">'+(tok?"Você está conectado. O plano é salvo no arquivo "+FILE+" do seu Google Drive e conferido toda vez que o aplicativo abre.":"Entre com sua conta Google para salvar o plano no seu Drive e usar em outros aparelhos. Sem entrar, ele fica salvo só neste aparelho.")+'</div><div class="row"><button type="button" class="btn" data-act="gsync">'+(tok?"Sincronizar agora":"Entrar com Google")+"</button></div>";
  let h=sec("conta","Conta e sincronização",acc)+sec("curso","Curso",'<label class="field">Curso em uso<select id="c-cur">'+L.list.map(e=>'<option value="'+e.id+'"'+(e.id===L.cur?" selected":"")+">"+esc(e.n)+"</option>").join("")+"</select></label>"+
    '<label class="field">Nome deste curso<input type="text" id="c-name" value="'+esc(S.n)+'" maxlength="60"></label>'+
    '<div class="form"><label class="field">Criar curso vazio<input type="text" id="c-new" placeholder="Nome do novo curso" maxlength="60"></label><div class="field"><span>&nbsp;</span><button type="button" class="btn ghost" data-act="newcourse">Criar e abrir</button></div></div>'+
    '<div class="muted">Cada curso tem matérias, aulas, regras e progresso próprios. Trocar de curso não apaga o outro.</div>'+
    (L.list.length>1?'<div class="row"><button type="button" class="btn sm danger" data-act="delcourse">'+(ui.confirm==="delcourse"?"Confirmar: excluir este curso e todo o progresso dele":"Excluir este curso")+"</button></div>":""));
  let rb='<div class="muted">Nada aqui é aplicado até você confirmar no fim desta seção.</div>'+
    '<div class="muted">Horas disponíveis por dia (total de '+String(tot).replace(".",",")+' por semana)</div><div class="hours">'+D.hours.map((v,i)=>'<label class="field">'+DOW[i]+'<input type="number" id="h-'+i+'" data-rule="1" value="'+v+'" min="0" max="16" step="0.5" inputmode="decimal"></label>').join("")+"</div>"+
    '<div class="form"><label class="field">Matérias em estudo por vez<input type="number" id="f-na" data-rule="1" value="'+D.na+'" min="1" max="99" inputmode="numeric"></label>'+
    '<label class="field">Data de início<input type="date" id="f-start" data-rule="1" value="'+esc(D.start)+'"></label>'+
    '<label class="field">Teto do dia para revisões e questões (%)<input type="number" id="f-rc" data-rule="1" value="'+D.rc+'" min="10" max="100" step="5" inputmode="numeric"></label>'+
    '<label class="field">Revisão adaptativa pelos acertos<select id="f-ad" data-rule="1"><option value="1"'+(D.ad?" selected":"")+'>Ligada</option><option value="0"'+(D.ad?"":" selected")+">Desligada</option></select></label>"+
    '<label class="field">Acerto baixo: abaixo de (%)<input type="number" id="f-al" data-rule="1" value="'+D.al+'" min="1" max="99" inputmode="numeric"></label>'+
    '<label class="field">Acerto alto: acima de (%)<input type="number" id="f-ah" data-rule="1" value="'+D.ah+'" min="2" max="100" inputmode="numeric"></label></div>'+
    '<div class="muted">Com a adaptativa ligada, acerto baixo encurta pela metade os próximos intervalos daquela aula, e acerto alto os alonga em 50%. O acerto baixo também define a lista de pontos fracos.</div>'+
    '<div class="muted">Pomodoro (minutos)</div><div class="iv"><label class="field">Foco<input type="number" id="f-pf" data-rule="1" value="'+D.pf+'" min="5" max="120" inputmode="numeric"></label>'+
    '<label class="field">Pausa curta<input type="number" id="f-ps" data-rule="1" value="'+D.ps+'" min="1" max="60" inputmode="numeric"></label>'+
    '<label class="field">Pausa longa<input type="number" id="f-pl" data-rule="1" value="'+D.pl+'" min="1" max="90" inputmode="numeric"></label></div>'+
    '<div class="muted">Intervalos de revisão e questões após cada PDF estudado. Use 0 minutos para não gerar a tarefa.</div>'+
    D.iv.map((v,i)=>'<div class="iv iv4"><label class="field">Dias após o PDF<input type="number" id="iv-d'+i+'" data-rule="1" value="'+v.d+'" min="1" max="365" inputmode="numeric"></label>'+
      '<label class="field">Revisão (min)<input type="number" id="iv-r'+i+'" data-rule="1" value="'+v.rm+'" min="0" max="240" inputmode="numeric"></label>'+
      '<label class="field">Questões (min)<input type="number" id="iv-q'+i+'" data-rule="1" value="'+v.qm+'" min="0" max="240" inputmode="numeric"></label>'+
      '<button type="button" class="btn sm ghost" data-act="iv-del" data-i="'+i+'" aria-label="Remover intervalo de '+v.d+' dias"'+(D.iv.length<2?" disabled":"")+">✕</button></div>").join("")+
    '<div class="row"><button type="button" class="btn sm ghost" data-act="iv-add"'+(D.iv.length>=8?" disabled":"")+">Adicionar intervalo</button></div>";
  if(ui.confirm==="rules")rb+='<div class="card crit"><h2>Tem certeza?</h2><div>O cronograma inteiro será reorganizado com as novas regras, e as revisões e questões ainda não feitas serão recalculadas. O que já foi marcado como feito não muda.</div><div class="row"><button type="button" class="btn" data-act="rules-apply">Sim, aplicar</button><button type="button" class="btn ghost" data-act="rules-back">Voltar</button></div></div>';
  else if(changed)rb+='<div class="card note"><div>Você tem mudanças ainda não aplicadas.</div><div class="row"><button type="button" class="btn" data-act="rules-ask">Confirmar mudanças</button><button type="button" class="btn ghost" data-act="rules-drop">Descartar</button></div></div>';
  else rb+='<div class="row"><button type="button" class="btn" disabled>Confirmar mudanças</button><span class="muted">Nenhuma mudança pendente.</span></div>';
  h+=sec("regras","Regras do cronograma"+(changed?" · mudanças não aplicadas":""),rb);
  h+=sec("rotinas","Rotinas diárias · "+(S.rt||[]).length,'<div class="muted">Tarefas fixas de todo dia de estudo, como lei seca ou informativos. Elas reservam tempo do dia antes das aulas e valem assim que você adiciona.</div>'+
    '<div class="form"><label class="field">Nome<input type="text" id="r-n" placeholder="Lei seca" maxlength="60"></label><label class="field">Minutos por dia<input type="number" id="r-m" value="30" min="5" max="240" inputmode="numeric"></label><div class="full row"><button type="button" class="btn ghost" data-act="rtadd">Adicionar rotina</button></div></div>'+
    (S.rt||[]).map(r=>'<div class="topic"><span>'+esc(r.n)+' <span class="st">'+hm(r.m)+' por dia</span></span><button type="button" class="btn sm ghost" data-act="rtdel" data-id="'+r.id+'">Remover</button></div>').join(""));
  const sms=(S.sm||[]).slice().sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  h+=sec("simulados","Simulados · "+sms.filter(m=>!m.done).length+" agendados",'<div class="muted">Entram na data marcada e reservam o tempo antes das aulas. Ao concluir, você registra questões feitas e acertos; o resultado fica no Histórico.</div>'+
    '<div class="form"><label class="field">Nome<input type="text" id="m-n" value="Simulado" maxlength="60"></label><label class="field">Data do primeiro<input type="date" id="m-d" min="'+t0+'"></label>'+
    '<label class="field">Duração (minutos)<input type="number" id="m-m" value="240" min="15" max="600" inputmode="numeric"></label><label class="field">Quantos<input type="number" id="m-k" value="1" min="1" max="24" inputmode="numeric"></label>'+
    '<label class="field">Repetir a cada (dias)<input type="number" id="m-e" value="30" min="1" max="365" inputmode="numeric"></label><div class="field"><span>&nbsp;</span><button type="button" class="btn ghost" data-act="smadd">Agendar</button></div></div>'+
    sms.map(m=>'<div class="topic"><span>'+esc(m.n)+' <span class="st">'+(m.done?"feito em "+fmtY(m.done)+(m.qn?" · "+pct100(m.qc||0,m.qn)+"%":""):fmtY(m.d)+" · "+hm(m.m))+'</span></span><button type="button" class="btn sm ghost" data-act="smdel" data-id="'+m.id+'">Remover</button></div>').join(""));
  const offs=(S.off||[]).filter(d=>d>=t0).sort();
  h+=sec("folgas","Dias sem estudo · "+offs.length,'<div class="muted">Para serviço, viagem ou imprevisto. O que estava previsto para a data é empurrado para os dias seguintes. Vale assim que você adiciona.</div>'+
    '<div class="form"><label class="field">Data<input type="date" id="o-date" min="'+t0+'"></label><div class="field"><span>&nbsp;</span><button type="button" class="btn ghost" data-act="offadd">Adicionar dia sem estudo</button></div></div>'+
    offs.map(d=>'<div class="topic"><span>'+fmt(d)+"/"+pd(d).getFullYear()+'</span><button type="button" class="btn sm ghost" data-act="offdel" data-d="'+d+'">Remover</button></div>').join(""));
  h+=sec("backup","Backup e compartilhamento",'<div class="muted">O código do curso leva matérias, aulas e regras, sem progresso: serve para passar o curso a outra pessoa. O backup completo leva tudo, incluindo progresso, acertos e histórico: guarde em um lugar seguro.</div>'+
    '<div class="row"><button type="button" class="btn ghost" data-act="export">Gerar código do curso</button><button type="button" class="btn ghost" data-act="backup">Gerar backup completo</button>'+(ui.exp?'<button type="button" class="btn" data-act="copy">Copiar</button><button type="button" class="btn ghost" data-act="dl">Baixar arquivo</button>':"")+"</div>"+
    (ui.exp?'<label class="field">Texto gerado ('+Math.ceil(ui.exp.length/1024)+' KB)<textarea id="x-out" readonly>'+esc(ui.exp)+"</textarea></label>":"")+
    '<label class="field">Colar código ou backup recebido<textarea id="x-in" placeholder="Cole aqui o texto inteiro"></textarea></label>'+
    '<div class="row"><button type="button" class="btn ghost" data-act="import">Importar como novo curso</button>'+(ui.msg?'<span class="muted">'+esc(ui.msg)+"</span>":"")+"</div>");
  h+=sec("zerar","Zerar progresso",'<div class="muted">Mantém matérias e aulas deste curso e desmarca tudo o que foi estudado, incluindo acertos, simulados feitos e histórico.</div><div class="row"><button type="button" class="btn danger" data-act="reset">'+(ui.confirm==="reset"?"Confirmar: desmarcar tudo deste curso":"Zerar progresso deste curso")+"</button></div>");
  return h;
}
function render(){
  document.querySelectorAll("#nav button").forEach(b=>{if(b.dataset.tab===ui.tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  $("course").textContent=S.n;
  const cf=conflict?'<section class="card crit"><h2>Seus dados foram alterados em outro aparelho</h2><div>Você também fez mudanças aqui antes de sincronizar, e as duas versões não podem ser juntadas. Escolha qual vale; a outra será descartada. Enquanto não escolher, o que fizer aqui fica só neste aparelho.</div><div class="row"><button type="button" class="btn" data-act="cf-local">Manter a deste aparelho</button><button type="button" class="btn ghost" data-act="cf-remote">Usar a do outro aparelho</button></div></section>':"";
  app.innerHTML=cf+(ui.tab==="cronograma"?vCron():ui.tab==="materias"?vMaterias():ui.tab==="ajustes"?vAjustes():vHoje());
  lastSaved=JSON.stringify(S);
}
setInterval(tick,1000);

/* ---------- janela de acertos e anotações ---------- */
let mq=[];
const topicOf=id=>S.topics.find(t=>t.id===id);
const simOf=id=>(S.sm||[]).find(m=>m.id===id);
function askScore(list){mq=list.slice();renderModal()}
function scoreForm(title,sub,r,edit){
  return '<h2 id="m-h">'+title+'</h2><div class="muted">'+sub+'</div>'+
    '<div class="form"><label class="field">Questões feitas<input type="number" id="m-qn" value="'+(r.qn||"")+'" min="1" max="999" inputmode="numeric"></label>'+
    '<label class="field">Acertos<input type="number" id="m-qc" value="'+(r.qn?(r.qc||0):"")+'" min="0" max="999" inputmode="numeric"></label></div>'+
    '<div class="muted" id="m-err">'+(edit?"":"A tarefa só é marcada como concluída depois de confirmar.")+'</div>'+
    '<div class="row"><button type="button" class="btn" data-m="ok">'+(edit?"Salvar":"Confirmar e concluir")+'</button><button type="button" class="btn ghost" data-m="no">Cancelar</button></div>';
}
function renderModal(){
  const box=$("modal");let h="",foc="m-qn";
  for(;;){
    const m=mq[0];
    if(!m){box.hidden=true;box.innerHTML="";return}
    if(m.type==="note"){
      const t=topicOf(m.id);
      if(t){h='<h2 id="m-h">Anotação da aula</h2><div class="muted">'+esc((subOf(t.s)||{n:""}).n)+" · "+esc(t.t)+'</div><label class="field">Dúvidas e pontos a rever<textarea id="m-nt" maxlength="500">'+esc(t.nt||"")+'</textarea></label><div class="muted" id="m-err">Aparece junto das revisões e questões desta aula.</div><div class="row"><button type="button" class="btn" data-m="ok">Salvar</button><button type="button" class="btn ghost" data-m="no">Cancelar</button></div>';foc="m-nt";break}
    }else if(m.type==="sim"){
      const s=simOf(m.sid);
      if(s&&(m.edit?!!s.done:!s.done)){h=scoreForm(m.edit?"Editar acertos":"Registrar simulado",esc(s.n)+" · "+hm(s.m),s,m.edit);break}
    }else{
      const t=topicOf(m.id),r=t?t.rv[m.ri]:null;
      if(r&&r.k==="q"&&(m.edit?!!r.done:!r.done)){h=scoreForm(m.edit?"Editar acertos":"Registrar questões",esc((subOf(t.s)||{n:""}).n)+" · "+esc(t.t)+" · "+(r.x?"reforço":ivLabel(r.sd||r.d)+" após o PDF"),r,m.edit);break}
    }
    mq.shift();
  }
  box.hidden=false;
  box.innerHTML='<div class="card" role="dialog" aria-modal="true" aria-labelledby="m-h">'+h+"</div>";
  try{$(foc).focus()}catch(e){}
}
function modalOk(){
  const m=mq[0];if(!m)return;
  if(m.type==="note"){
    const t=topicOf(m.id);
    if(t){const v=$("m-nt").value.trim().slice(0,500);if(v)t.nt=v;else delete t.nt}
    mq.shift();commit();renderModal();return;
  }
  const qn=parseInt($("m-qn").value,10),qc=parseInt($("m-qc").value,10),er=$("m-err");
  if(isNaN(qn)||qn<1){er.textContent="Informe quantas questões você fez (pelo menos 1).";return}
  if(isNaN(qc)||qc<0||qc>qn){er.textContent="Os acertos devem ficar entre 0 e "+qn+".";return}
  if(m.type==="sim"){
    const s=simOf(m.sid);
    if(s){if(!m.edit){s.done=today();s.late=0}s.qn=clamp(qn,1,999);s.qc=qc}
  }else{
    const t=topicOf(m.id);
    if(t){if(!m.edit)setDone(t,m.ri,true);setScore(t,m.ri,qn,qc)}
  }
  mq.shift();commit();renderModal();
}
$("modal").addEventListener("click",e=>{
  const b=e.target.closest("[data-m]");if(!b)return;
  if(b.dataset.m==="ok")modalOk();else{mq.shift();renderModal()}
});
$("modal").addEventListener("keydown",e=>{
  if(e.key==="Enter"&&e.target.tagName!=="TEXTAREA"){e.preventDefault();modalOk()}
  else if(e.key==="Escape"){mq.shift();renderModal()}
});
$("pomo").addEventListener("click",e=>{
  const b=e.target.closest("[data-p]");if(!b||!pomo)return;
  const k=pomo.key;pomo=null;
  if(b.dataset.p==="go"&&timers[k]&&k.indexOf(L.cur+":")===0)toggleTimerKey(k);else saveTimers();
  renderPomo();if(ui.tab==="hoje")render();
});

/* ---------- ações ---------- */
const num=(id,d)=>{const v=parseInt($(id).value,10);return isNaN(v)?d:v};
const cleanLink=v=>/^https?:\/\//i.test(v.trim())?v.trim():"";
const newId=()=>"c"+Date.now().toString(36);
function addCourse(c){
  const id=newId();c.rev=Date.now();
  L.courses[id]=c;L.list.push({id:id,n:c.n});
  setCourse(id);
}
function exportCode(){
  return JSON.stringify({plano:1,n:S.n,hours:S.hours,na:S.na,rc:S.rc,ad:S.ad?1:0,al:S.al,ah:S.ah,pf:S.pf,ps:S.ps,pl:S.pl,iv:S.iv,rt:(S.rt||[]).map(r=>[r.n,r.m]),subs:S.subs.map(s=>({n:s.n,w:s.w||1,t:S.topics.filter(t=>t.s===s.id).map(t=>[t.t,t.pm,t.l||""])}))});
}
function importCode(txt){
  let o;try{o=JSON.parse(txt)}catch(e){return null}
  if(o&&o.plano===2&&o.course){ // backup completo
    const c=normCourse(o.course);
    if(!c)return null;
    c.n=String(c.n||"Curso").slice(0,50)+" (backup)";
    return c;
  }
  if(!o||o.plano!==1||!Array.isArray(o.subs))return null;
  const c=emptyCourse(String(o.n||"Curso importado").slice(0,60));
  if(Array.isArray(o.hours)&&o.hours.length===7)c.hours=o.hours.map(v=>clamp(parseFloat(v)||0,0,16));
  c.na=clamp(parseInt(o.na,10)||4,1,99);
  if(o.rc)c.rc=clamp(parseInt(o.rc,10)||60,10,100);
  if(o.ad===0)c.ad=0;
  [["al",60,1,99],["ah",85,2,100],["pf",25,5,120],["ps",5,1,60],["pl",15,1,90]].forEach(k=>{c[k[0]]=clamp(parseInt(o[k[0]],10)||k[1],k[2],k[3])});
  if(Array.isArray(o.iv)&&o.iv.length&&o.iv.length<=8)c.iv=o.iv.map(v=>({d:clamp(parseInt(v.d,10)||1,1,365),rm:clamp(parseInt(v.rm,10)||0,0,240),qm:clamp(parseInt(v.qm,10)||0,0,240)}));
  if(Array.isArray(o.rt))o.rt.slice(0,10).forEach((r,i)=>{if(Array.isArray(r))c.rt.push({id:"r"+i,n:String(r[0]||"Rotina").slice(0,60),m:clamp(parseInt(r[1],10)||30,5,240),last:null})});
  o.subs.slice(0,200).forEach((s,i)=>{
    const id="s"+(c.sq++);
    c.subs.push({id:id,n:String(s.n||"Matéria").slice(0,60),c:i%6,w:clamp(parseInt(s.w,10)||1,1,3)});
    (Array.isArray(s.t)?s.t:[]).slice(0,400).forEach(t=>{
      if(Array.isArray(t))c.topics.push({id:"t"+(c.seq++),s:id,t:String(t[0]||"PDF").slice(0,120),pm:clamp(parseInt(t[1],10)||60,5,600),l:cleanLink(String(t[2]||"")),pd:null,pp:null,rv:[]});
    });
  });
  return c;
}
app.addEventListener("change",e=>{
  const el=e.target;
  if(el.matches("input[type=checkbox][data-id]")){
    const t=topicOf(el.dataset.id);if(!t)return;
    const ri=el.dataset.r==="p"?"p":+el.dataset.r;
    if(ri!=="p"&&el.checked&&t.rv[ri]&&t.rv[ri].k==="q"){el.checked=false;askScore([{id:t.id,ri:ri}]);return}
    setDone(t,ri,el.checked);
    commit();
  }else if(el.matches("input[type=checkbox][data-g]")){
    const t=topicOf(el.dataset.g),t0=today();if(!t)return;
    const qs=[];let ch=false;
    t.rv.forEach((r,i)=>{
      if(el.checked&&!r.done&&r.plan===t0){if(r.k==="q")qs.push({id:t.id,ri:i});else{setDone(t,i,true);ch=true}}
      else if(!el.checked&&r.done===t0){setDone(t,i,false);ch=true}
    });
    if(ch)commit();else render();
    if(qs.length)askScore(qs);
  }else if(el.matches("input[type=checkbox][data-rt]")){
    const r=(S.rt||[]).find(x=>x.id===el.dataset.rt);
    if(r){r.last=el.checked?today():null;commit()}
  }else if(el.matches("input[type=checkbox][data-sm]")){
    const m=simOf(el.dataset.sm);if(!m)return;
    if(el.checked){el.checked=false;askScore([{type:"sim",sid:m.id}])}
    else{m.done=null;delete m.qn;delete m.qc;commit()}
  }else if(el.dataset.rule){
    ui.draft=readDraft();ui.confirm=null;render();
  }else if(el.id==="c-cur"){
    if(L.courses[el.value])setCourse(el.value);
  }else if(el.id==="c-name"){
    const v=el.value.trim();if(v){S.n=v;commit()}
  }else if(el.dataset.sn!=null){
    const s=subOf(el.dataset.sn),v=el.value.trim();if(s&&v){s.n=v;commit()}
  }else if(el.dataset.w!=null){
    const s=subOf(el.dataset.w);if(s){s.w=clamp(parseInt(el.value,10)||1,1,3);commit()}
  }else if(el.dataset.pick){
    if(ui.del){if(el.checked)ui.del[el.dataset.pick]=1;else delete ui.del[el.dataset.pick];ui.confirm=null;render()}
  }else if(el.id==="i-dest"){
    if(ui.imp){ui.imp.dest=el.value;$("i-new-w").hidden=el.value!=="new"}
  }else if(el.id==="a-sub"){
    $("a-new-w").hidden=el.value!=="new";
  }
});
app.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b||b.disabled)return;
  const a=b.dataset.act,sid=b.dataset.s;
  if(["clear","zerosub","zerot","reset","delcourse","rules-ask","rules-apply","delsub","delsel"].indexOf(a)<0)ui.confirm=null;
  ui.msg="";
  if(a==="wk"){ui.wk=Math.max(0,ui.wk+(+b.dataset.n));render()}
  else if(a==="gsync"){if(tok&&Date.now()<tokExp)sync();else signIn()}
  else if(a==="goto"){ui.tab=b.dataset.tab;try{location.hash=ui.tab}catch(err){}render();window.scrollTo(0,0)}
  else if(a==="sec"){const k=b.dataset.k;if(k==="regras"&&ui.sec[k]&&$("f-na"))ui.draft=readDraft();ui.sec[k]=ui.sec[k]?0:1;render()}
  else if(a==="card"){cardOpen=!cardOpen;try{localStorage.setItem("plano-card",cardOpen?"1":"0")}catch(err){}render()}
  else if(a==="hist"){histOpen=!histOpen;try{localStorage.setItem("plano-hist",histOpen?"1":"0")}catch(err){}render()}
  else if(a==="weak"){weakOpen=!weakOpen;render()}
  else if(a==="perf"){perfOpen=!perfOpen;try{localStorage.setItem("plano-perf",perfOpen?"1":"0")}catch(err){}render()}
  else if(a==="again"){const t=topicOf(b.dataset.id);if(t&&addExtra(t))commit()}
  else if(a==="grp"){const id=b.dataset.id;if(ui.openG[id])delete ui.openG[id];else ui.openG[id]=1;render()}
  else if(a==="rescore"){askScore([{id:b.dataset.id,ri:+b.dataset.r,edit:true}])}
  else if(a==="smscore"){askScore([{type:"sim",sid:b.dataset.sm,edit:true}])}
  else if(a==="note"){askScore([{type:"note",id:b.dataset.id}])}
  else if(a==="tm"){const t=topicOf(b.dataset.id);if(t){toggleTimer(t,b.dataset.r==="p"?"p":+b.dataset.r);render()}}
  else if(a==="open"){ui.openSub=ui.openSub===sid?null:sid;ui.edit=null;render()}
  else if(a==="up"||a==="down"){
    const i=S.subs.findIndex(s=>s.id===sid),j=i+(a==="up"?-1:1);
    if(i>=0&&j>=0&&j<S.subs.length){const x=S.subs[i];S.subs[i]=S.subs[j];S.subs[j]=x;commit()}
  }
  else if(a==="edit"){ui.edit=b.dataset.id;render()}
  else if(a==="cancel"){ui.edit=null;render()}
  else if(a==="save"){
    const t=topicOf(b.dataset.id);
    if(t){
      t.t=$("e-t").value.trim()||t.t;t.pm=clamp(num("e-pm",t.pm),5,600);t.l=cleanLink($("e-l").value);
      const nt=$("e-nt").value.trim().slice(0,500);if(nt)t.nt=nt;else delete t.nt;
      ui.edit=null;commit();
    }
  }
  else if(a==="del"){S.topics=S.topics.filter(t=>t.id!==b.dataset.id);ui.edit=null;commit()}
  else if(a==="clear"){
    const ck="clear"+sid;
    if(ui.confirm!==ck){ui.confirm=ck;render()}
    else{ui.confirm=null;S.topics=S.topics.filter(t=>t.s!==sid||t.pd);commit()}
  }
  else if(a==="zerosub"){
    const zk="zero"+sid;
    if(ui.confirm!==zk){ui.confirm=zk;render()}
    else{ui.confirm=null;S.topics.forEach(t=>{if(t.s===sid){t.pd=null;t.pp=null;t.rv=[];t.late=0;t.fin=0;t.qn=0;t.qc=0;delete t.am}});commit()}
  }
  else if(a==="zerot"){
    const t=topicOf(b.dataset.id),zk="zt"+b.dataset.id;
    if(!t)return;
    if(ui.confirm!==zk){ui.confirm=zk;render()}
    else{ui.confirm=null;ui.edit=null;resetTopic(t);commit()}
  }
  else if(a==="delsub"){ui.confirm=ui.confirm==="del"+sid?null:"del"+sid;render()}
  else if(a==="delsub-no"){render()}
  else if(a==="delsub-ok"){
    S.subs=S.subs.filter(s=>s.id!==sid);S.topics=S.topics.filter(t=>t.s!==sid);
    if(ui.openSub===sid)ui.openSub=null;commit();
  }
  else if(a==="delmode"){ui.del=ui.del?null:{};render()}
  else if(a==="delall"){const all=S.subs.every(s=>ui.del&&ui.del[s.id]);ui.del={};if(!all)S.subs.forEach(s=>{ui.del[s.id]=1});render()}
  else if(a==="delsel"){
    if(!ui.del)return;
    if(ui.confirm!=="delsel"){ui.confirm="delsel";render();return}
    const d=ui.del;ui.confirm=null;ui.del=null;
    S.subs=S.subs.filter(s=>!d[s.id]);S.topics=S.topics.filter(t=>!d[t.s]);
    if(ui.openSub&&d[ui.openSub])ui.openSub=null;commit();
  }
  else if(a==="goimp"){
    ui.tab="materias";ui.imp={step:0};try{location.hash="materias"}catch(err){}render();
    try{$("imp").scrollIntoView({block:"start"})}catch(err){}
  }
  else if(a==="imp"){ui.imp=ui.imp?null:{step:0};render()}
  else if(a==="imp-read"){
    const raw=$("i-raw").value,norm=recognize(raw);
    if(!norm.trim())ui.imp={step:0,raw:raw,msg:"Não encontrei matérias nem aulas nesse texto. Confira se copiou a página com a lista do curso."};
    else ui.imp={step:1,raw:raw,norm:norm,pm:60,dest:"cur"};
    render();try{$("imp").scrollIntoView({block:"start"})}catch(err){}
  }
  else if(a==="imp-refresh"||a==="imp-go"){
    const I=ui.imp;if(!I)return;
    I.norm=$("i-norm").value;I.pm=clamp(num("i-pm",60),5,600);I.dest=$("i-dest").value;I.cn=$("i-new").value.trim();I.msg="";
    if(a==="imp-refresh"){render();return}
    const subs=parseNorm(I.norm);
    if(!subs.some(s=>s.ls.length)){I.msg="Não há aulas para adicionar.";render();return}
    if(I.dest==="new"){
      if(!I.cn){I.msg="Dê um nome ao curso novo.";render();try{$("i-new").focus()}catch(err){}return}
      const c=emptyCourse(I.cn);impApply(subs,I.pm,c);ui.imp=null;addCourse(c);
    }else{impApply(subs,I.pm,S);ui.imp=null;commit()}
    ui.tab="materias";try{location.hash="materias"}catch(err){}render();window.scrollTo(0,0);
  }
  else if(a==="imp-back"){ui.imp={step:0,raw:ui.imp?ui.imp.raw:""};render()}
  else if(a==="imp-cancel"){ui.imp=null;render()}
  else if(a==="add"){
    let si=$("a-sub").value;
    if(si==="new"){
      const nm=$("a-new").value.trim();
      if(!nm){$("a-new").focus();return}
      si="s"+(S.sq++);
      S.subs.push({id:si,n:nm,c:S.subs.length%6,w:1});
    }
    const pm=clamp(num("a-pm",60),5,600),pre=$("a-pre").value.trim()||"PDF";
    let names=$("a-list").value.split("\n").map(x=>x.trim().slice(0,120)).filter(Boolean).slice(0,200);
    if(!names.length){
      const n=clamp(num("a-n",1),1,80),base=S.topics.filter(t=>t.s===si&&t.t.indexOf(pre+" ")===0).length;
      for(let k=1;k<=n;k++)names.push(pre+" "+pad(base+k));
    }
    names.forEach(nm=>S.topics.push({id:"t"+(S.seq++),s:si,t:nm,pm:pm,l:"",pd:null,pp:null,rv:[]}));
    ui.openSub=si;commit();
  }
  else if(a==="iv-add"){
    const d=readDraft();
    if(d.iv.length<8){const l=d.iv[d.iv.length-1];d.iv.push({d:clamp(l.d*2,1,365),rm:l.rm,qm:l.qm});ui.draft=d}
    render();
  }
  else if(a==="iv-del"){
    const d=readDraft(),i=+b.dataset.i;
    if(d.iv.length>1){d.iv.splice(i,1);ui.draft=d}
    render();
  }
  else if(a==="rules-ask"){ui.draft=readDraft();ui.confirm="rules";render()}
  else if(a==="rules-back"){render()}
  else if(a==="rules-drop"){ui.draft=null;render()}
  else if(a==="rules-apply"){
    const d=ui.draft;ui.confirm=null;ui.draft=null;
    if(d){["hours","na","start","rc","ad","al","ah","pf","ps","pl","iv"].forEach(k=>{S[k]=d[k]});applyIv();commit()}else render();
  }
  else if(a==="rtadd"){
    const nm=$("r-n").value.trim();
    if(!nm){$("r-n").focus();return}
    if(!S.rt)S.rt=[];
    if(S.rt.length<10){S.rt.push({id:"r"+Date.now().toString(36),n:nm.slice(0,60),m:clamp(num("r-m",30),5,240),last:null});commit()}
  }
  else if(a==="rtdel"){S.rt=(S.rt||[]).filter(r=>r.id!==b.dataset.id);commit()}
  else if(a==="smadd"){
    const d=$("m-d").value,nm=$("m-n").value.trim()||"Simulado";
    if(!d||d<today()){$("m-d").focus();return}
    const k=clamp(num("m-k",1),1,24),ev=clamp(num("m-e",30),1,365),mm=clamp(num("m-m",240),15,600);
    if(!S.sm)S.sm=[];
    for(let i=0;i<k&&S.sm.length<60;i++)S.sm.push({id:"m"+Date.now().toString(36)+i,n:(nm+(k>1?" "+pad(i+1):"")).slice(0,60),d:addDays(d,i*ev),m:mm,done:null,plan:null});
    commit();
  }
  else if(a==="smdel"){S.sm=(S.sm||[]).filter(m=>m.id!==b.dataset.id);commit()}
  else if(a==="offadd"){
    const d=$("o-date").value;
    if(d&&d>=today()){if(!S.off)S.off=[];if(S.off.indexOf(d)<0)S.off.push(d);commit()}
  }
  else if(a==="offdel"){S.off=(S.off||[]).filter(d=>d!==b.dataset.d);commit()}
  else if(a==="newcourse"){
    const nm=$("c-new").value.trim();
    if(!nm){$("c-new").focus();return}
    addCourse(emptyCourse(nm));ui.tab="hoje";try{location.hash="hoje"}catch(err){}render();
  }
  else if(a==="delcourse"){
    if(ui.confirm!=="delcourse"){ui.confirm="delcourse";render()}
    else if(L.list.length>1){
      ui.confirm=null;const id=L.cur;
      L.list=L.list.filter(x=>x.id!==id);delete L.courses[id];
      setCourse(L.list[0].id);
    }
  }
  else if(a==="export"){ui.exp=exportCode();render()}
  else if(a==="backup"){ui.exp=JSON.stringify({plano:2,course:S});render()}
  else if(a==="copy"){
    const done=ok=>{ui.msg=ok?"Texto copiado.":"Não consegui copiar: selecione o texto da caixa e copie manualmente.";render()};
    try{navigator.clipboard.writeText(ui.exp).then(()=>done(true),()=>done(false))}catch(err){done(false)}
  }
  else if(a==="dl"){
    try{
      const u=URL.createObjectURL(new Blob([ui.exp],{type:"application/json"})),l=document.createElement("a");
      l.href=u;l.download="plano-de-estudos-"+today()+".json";document.body.appendChild(l);l.click();l.remove();
      setTimeout(()=>URL.revokeObjectURL(u),5000);
    }catch(err){ui.msg="Não consegui baixar: use Copiar.";render()}
  }
  else if(a==="import"){
    const c=importCode($("x-in").value.trim());
    if(!c){ui.msg="Texto inválido. Confira se colou tudo, do início ao fim.";render()}
    else addCourse(c);
  }
  else if(a==="cf-local"){
    if(conflict){L.base=conflict.remote.stamp||0;conflict=null;commit(true)}
  }
  else if(a==="cf-remote"){
    if(conflict){const c=conflict;conflict=null;adoptStore(c.remote);renderSync()}
  }
  else if(a==="reset"){
    if(ui.confirm!=="reset"){ui.confirm="reset";render()}
    else{
      ui.confirm=null;moved=0;
      S.topics.forEach(t=>{t.pd=null;t.pp=null;t.rv=[];t.late=0;t.fin=0;t.qn=0;t.qc=0;delete t.am});
      (S.sm||[]).forEach(m=>{m.done=null;delete m.qn;delete m.qc});(S.rt||[]).forEach(r=>{r.last=null});
      S.log={};S.tp=0;S.ta=0;S.tn=0;commit();
    }
  }
});
$("undo-btn").addEventListener("click",()=>{
  let u=undoStack.pop();
  while(u&&u.c!==L.cur)u=undoStack.pop();
  if(!u){clearUndo();return}
  S=JSON.parse(u.s);L.courses[L.cur]=S;commit(true);
});
// Arrastar matérias pelo ⠿ para mudar a ordem de preferência.
app.addEventListener("pointerdown",e=>{
  const g=e.target.closest("[data-grip]");if(!g)return;
  const el=g.closest("[data-sid]");if(!el)return;
  drag={id:g.dataset.grip,el:el,moved:false};el.classList.add("dragging");e.preventDefault();
});
window.addEventListener("pointermove",e=>{
  if(!drag)return;
  const el=document.elementFromPoint(e.clientX,e.clientY),box=el&&el.closest?el.closest("[data-sid]"):null;
  if(!box||box===drag.el)return;
  const i=S.subs.findIndex(s=>s.id===drag.id),j=S.subs.findIndex(s=>s.id===box.dataset.sid);
  if(i<0||j<0)return;
  S.subs.splice(j,0,S.subs.splice(i,1)[0]);drag.moved=true;
  box.parentNode.insertBefore(drag.el,j>i?box.nextSibling:box);
});
const endDrag=()=>{if(!drag)return;const m=drag.moved;drag=null;if(m)commit();else render()};
window.addEventListener("pointerup",endDrag);
window.addEventListener("pointercancel",endDrag);
const TABS=["hoje","cronograma","materias","ajustes"];
const hashTab=()=>{const h=location.hash.replace("#","");return TABS.includes(h)?h:"hoje"};
$("nav").addEventListener("click",e=>{
  const b=e.target.closest("button[data-tab]");if(!b)return;
  if(ui.tab==="ajustes"&&ui.sec.regras&&$("f-na"))ui.draft=readDraft();
  ui.tab=b.dataset.tab;ui.confirm=null;ui.msg="";ui.del=null;
  try{location.hash=ui.tab}catch(err){}
  render();window.scrollTo(0,0);
});
window.addEventListener("hashchange",()=>{ui.tab=hashTab();ui.confirm=null;render()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!drag&&!mq.length){const d=ui.draft;dayCheck();ui.draft=d;if(tok)sync()}});
$("sync").addEventListener("click",()=>{if(tok&&Date.now()<tokExp)sync();else signIn()});

L=loadLocal();S=L.courses[L.cur];
ui.tab=hashTab();
dayCheck();
startAuth();
if("serviceWorker" in navigator){try{navigator.serviceWorker.register("sw.js")}catch(e){}}
