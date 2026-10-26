/* NIGHTSHIFT // Pure Body Protocol — offline workout tracker.
   All data stays in this browser under localStorage "nightshift.v1". New fields are additive, so older saves load unchanged. */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const KEY='nightshift.v1';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>ymd(new Date());
const pd=s=>new Date(s+'T00:00:00');
const addDays=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ymd(d)};
const dayDiff=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const wd=s=>(pd(s).getDay()+6)%7;
const mondayOf=s=>addDays(s,-wd(s));
const fmt=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (h?h+':':'')+pad(m)+':'+pad(s%60)};
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const DN=['MON','TUE','WED','THU','FRI','SAT','SUN'];
const shortDate=s=>pd(s).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const r05=v=>Math.round(v*2)/2;

/* ---------- FORM GUIDES ---------- */
const yt=(q,form=true)=>'https://www.youtube.com/results?search_query='+encodeURIComponent(form?q+' proper form':q).replace(/%20/g,'+');
const ICON={
  play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>',
  flame:'<svg viewBox="0 0 24 24" aria-hidden="true"><path class="flame" d="M12 1.5c.6 3.6 4.2 5.6 5.4 9.2 1.3 4-1.2 9.8-5.4 11.8-4.2-2-6.7-6.4-5.7-10.2.5-2 1.8-3 2.4-4.8 1.3 1.2 1.8 2.6 1.9 4 1.3-2.6 1.9-6.3 1.4-10z"/></svg>',
  shield:(full)=>`<svg viewBox="0 0 24 24" aria-hidden="true" class="shield"><path d="M12 1.8 20.5 5v6.4c0 5.3-3.6 9.3-8.5 10.9-4.9-1.6-8.5-5.6-8.5-10.9V5z"/>${full?'<path class="fill" d="M12 4.2 18.3 6.6v4.8c0 4-2.6 7.1-6.3 8.5-3.7-1.4-6.3-4.5-6.3-8.5V6.6z"/>':''}</svg>`
};
const watch=(q,label='WATCH FORM',form=true,cls='')=>`<a class="watch ${cls}" href="${yt(q,form)}" target="_blank" rel="noopener noreferrer">${ICON.play}<span>${label}</span><span class="sr-only"> (opens YouTube search in a new tab)</span></a>`;

/* ---------- PLAN DATA — mapped 1:1 from compression_shirt_aesthetic_progression_plan.md ---------- */
// t: bb barbell | db dumbbell (per DB) | cb cable/machine | bw bodyweight reps | hold seconds
const EX={
 squat:{n:'Barbell Back Squat',t:'bb',tg:['40 kg – 50 kg total','60 kg – 70 kg total','80 kg+ total'],s:40,q:'barbell back squat'},
 incl:{n:'Incline Dumbbell Press',t:'db',tg:['12 kg – 14 kg per DB','18 kg – 20 kg per DB','24 kg+ per DB'],s:12,q:'incline dumbbell bench press 30 degree'},
 pull:{n:'Cable Lat Pulldown',t:'cb',tg:['35 kg – 40 kg','50 kg – 55 kg','65 kg+'],s:35,drop:1,q:'cable lat pulldown'},
 lat:{n:'Dumbbell Side Lateral Raises',t:'db',tg:['5 kg – 7 kg per DB','8 kg – 10 kg per DB','12 kg per DB'],s:5,drop:1,q:'dumbbell side lateral raise'},
 knee:{n:'Hanging Knee Raises',t:'bw',q:'hanging knee raise'},
 rdl:{n:'Romanian Deadlift (RDL)',t:'bb',tg:['40 kg – 50 kg total','60 kg – 70 kg total','80 kg+ total'],s:40,q:'romanian deadlift'},
 ohp:{n:'Seated Dumbbell Shoulder Press',t:'db',tg:['10 kg – 12 kg per DB','16 kg – 18 kg per DB','20 kg+ per DB'],s:10,q:'seated dumbbell shoulder press'},
 row:{n:'Seated Cable Row',t:'cb',q:'seated cable row'},
 press:{n:'Machine Leg Press',t:'cb',q:'machine leg press'},
 dead:{n:'Deadbugs or Hollow Body Hold',t:'hold',q:'deadbug and hollow body hold'},
 bench:{n:'Flat Dumbbell Bench Press',t:'db',tg:['14 kg – 16 kg per DB','20 kg – 22 kg per DB','26 kg+ per DB'],s:14,q:'flat dumbbell bench press'},
 squat2:{n:'Barbell Back Squat or Leg Press',t:'bb',q:'barbell back squat'},
 dbrow:{n:'Single-Arm Dumbbell Row',t:'db',q:'single arm dumbbell row'},
 fly:{n:'Incline Dumbbell Flyes',t:'db',drop:1,q:'incline dumbbell fly'},
 plank:{n:'Plank with Knee Tucks',t:'bw',q:'plank with knee tucks'},
 ext:{n:'Leg Extensions',t:'cb',q:'leg extension machine'},
 calf:{n:'Calf Raises',t:'cb',q:'calf raises'},
 curl:{n:'Dumbbell Bicep Curls',t:'db',q:'dumbbell bicep curl'},
 tri:{n:'Triceps Rope Pushdowns',t:'cb',q:'triceps rope pushdown'},
 legcurl:{n:'Lying or Seated Leg Curls',t:'cb',q:'lying leg curl and seated leg curl'},
 lunge:{n:'Walking Dumbbell Lunges',t:'db',q:'walking dumbbell lunges'},
 plank2:{n:'Plank',t:'hold',q:'plank'},
 dead2:{n:'Deadbugs or Hollow Holds',t:'hold',q:'deadbug and hollow hold'}
};
// rs (rest source): p = stated in plan · d = 4-day split lists no rest; taken from the same lift in the 3-day split · x = not in plan, 60s default
const X=(id,sets,lo,hi,rest,rs='p',label=null,per=null)=>({id,sets,lo,hi,rest,rs,label,per});
const W={
 A:{name:'LEG & CHEST PRIMARY',sub:'WORKOUT A',split:'3',ex:[X('squat',3,8,10,90),X('incl',3,8,10,90,'p','Incline Dumbbell Bench Press (30°)'),X('pull',3,10,12,60),X('lat',3,12,15,45),X('knee',3,12,15,60)]},
 B:{name:'POSTERIOR CHAIN & SHOULDER PRIMARY',sub:'WORKOUT B',split:'3',ex:[X('rdl',3,8,10,90,'p','Dumbbell or Barbell RDL'),X('ohp',3,8,10,90),X('row',3,10,12,60),X('press',3,10,12,60),X('dead',3,45,60,45)]},
 C:{name:'CHEST DENSITY & LAT WIDTH',sub:'WORKOUT C',split:'3',ex:[X('bench',3,8,10,90),X('squat2',3,10,12,90),X('dbrow',3,10,12,60,'p',null,'side'),X('fly',3,12,15,60),X('plank',3,12,15,45)]},
 U1:{name:'UPPER A — CHEST & BACK FOCUS',sub:'UPPER A',split:'4',ex:[X('incl',3,8,10,90,'d'),X('pull',3,10,12,60,'d'),X('bench',3,10,12,90,'d'),X('row',3,10,12,60,'d'),X('lat',4,12,15,45,'d')]},
 L1:{name:'LOWER A — QUADS & LOWER ABS',sub:'LOWER A',split:'4',ex:[X('squat',3,8,10,90,'d'),X('press',3,10,12,60,'d'),X('ext',3,12,15,60,'x'),X('knee',4,12,15,60,'d'),X('calf',3,15,15,60,'x')]},
 U2:{name:'UPPER B — SHOULDERS & ARMS FOCUS',sub:'UPPER B',split:'4',ex:[X('ohp',3,8,10,90,'d'),X('dbrow',3,10,12,60,'d',null,'side'),X('fly',3,12,15,60,'d'),X('curl',3,10,12,60,'x'),X('tri',3,10,12,60,'x')]},
 L2:{name:'LOWER B — HAMSTRINGS & CORE',sub:'LOWER B',split:'4',ex:[X('rdl',3,8,10,90,'d','Romanian Deadlift (RDL)'),X('legcurl',3,10,12,60,'x'),X('lunge',3,10,10,60,'x',null,'leg'),X('dead2',3,60,60,45,'d'),X('plank2',3,60,60,60,'x')]}
};
const SHORT={A:'A',B:'B',C:'C',U1:'UA',L1:'LA',U2:'UB',L2:'LB'};
const ROT3=['A','B','C'];
const DAYS4={0:'U1',1:'L1',3:'U2',4:'L2'};
const SPLITS={
 '3':{t:'3-DAY FULL-BODY SPLIT',s:'PRIMARY SCHEDULE',sch:'Monday / Wednesday / Friday (or any 3 non-consecutive days)',keys:['A','B','C']},
 '4':{t:'4-DAY UPPER / LOWER SPLIT',s:'FLEX WEEK SCHEDULE',sch:'Mon (Upper A) / Tue (Lower A) / Thu (Upper B) / Fri (Lower B)',keys:['U1','L1','U2','L2']}
};
const GOAL=[
 ['UPPER CHEST & SHOULDERS','Upper chest fullness (incline presses) and lateral shoulder breadth (side raises) to fill out the upper shirt.'],
 ['BACK (LATS)','Lat width (pulldowns and rows) to shrink the visual appearance of your waist relative to your upper body.'],
 ['LEGS','Consistent quad and hamstring overload to build proportional lower-body muscle.'],
 ['LOWER ABS / CORE','Target lower abs and deep abdominal wall (transverse abdominis) to keep the midsection flat under tight fabric.']
];
const WARM=[
 {n:'Light Cardio (Treadmill / Row / Bike)',d:'2 minutes',a:'Overall body temperature',q:'light cardio warm up before lifting treadmill rower bike'},
 {n:'Arm Circles & Hugs',d:'10 forward / 10 backward',a:'Shoulder joints & chest',q:'arm circles and arm hugs warm up'},
 {n:'Banded / Bodyweight Pass-Throughs',d:'10 reps',a:'Thoracic spine & shoulder mobility',q:'band shoulder pass throughs'},
 {n:'Bodyweight Air Squats',d:'12 reps',a:'Hips, knees & ankle mobility',q:'bodyweight air squat'},
 {n:"World's Greatest Stretch",d:'3 reps per side',a:'Hips, hamstrings & T-spine',q:"world's greatest stretch"}
];
const WARM_Q='5 minute full body warm up before weight training';
const TECH={
 neg:['3-SEC NEGATIVES','3 second eccentric negative tempo lifting'],
 dp:['DOUBLE PROGRESSION','double progression method weight training'],
 drop:['DROP SET','how to do a drop set'],
 rpe:['RPE / REPS IN RESERVE','RPE reps in reserve explained'],
 ramp:['WARM-UP SETS','how to do warm up sets before lifting']
};
const PHASES=[
 {k:1,from:1,to:2,n:'NEUROMUSCULAR REACTIVATION',full:'Neuromuscular Reactivation & Adaptation',w:'WEEKS 1–2',rpe:'RPE 7–8',
  rules:['Focus on movement control and speed on the lift.','Slow 3-second negatives.','Leave 2 reps in the tank (RPE 7–8).'],tech:['neg','rpe']},
 {k:2,from:3,to:5,n:'LINEAR HYPERTROPHY OVERLOAD',full:'Mechanical Tension & Hypertrophy Focus',w:'WEEKS 3–5',rpe:'RPE 8.5–9',
  rules:['Apply the Double Progression method aggressively.','Push sets close to technical failure (RPE 8.5–9).'],tech:['dp','rpe']},
 {k:3,from:6,to:8,n:'AESTHETIC PEAK',full:'Metabolic Stress & Aesthetic Peak (Compression Fit)',w:'WEEKS 6–8',rpe:'RPE NOT SPECIFIED',
  rules:['On the final set of lateral raises, lat pulldowns and incline flyes, execute a Drop Set.','Reduce weight by 30% upon failure and push for an extra 6–8 reps.'],tech:['drop']}
];
const TG=[['squat','Barbell Back Squat'],['bench','Flat DB Bench Press'],['incl','Incline DB Press'],['ohp','Seated DB OHP'],['rdl','Romanian Deadlift'],['pull','Cable Lat Pulldown'],['lat','DB Lateral Raise']];
const FUEL={kcal:[2000,2150],protein:[140,160],water:[3.5,4],steps:[8000,10000]};

/* ---------- STATE ---------- */
const TABS=['today','cal','plan','progress','fuel','system'];
const def=()=>({start:today(),split:'3',days3:[0,2,4],weeks:{},bwStart:78,onboarded:false,logs:[],bw:[],daily:{},draft:null,tab:'today',chartEx:null,calMode:'month',calM:null,calW:null,calSel:null});
const validDays=d=>Array.isArray(d)&&d.length===3&&new Set(d).size===3&&d.every(x=>Number.isInteger(x)&&x>=0&&x<7)&&!d.some(x=>d.includes((x+1)%7));
function clean(d,existing){
  const o=Object.assign(def(),d&&typeof d==='object'?d:{});
  if(!DATE_RE.test(o.start))o.start=today();
  if(o.split!=='3'&&o.split!=='4')o.split='3';
  if(!validDays(o.days3))o.days3=[0,2,4];
  o.bwStart=+o.bwStart>0?+o.bwStart:78;
  o.logs=(Array.isArray(o.logs)?o.logs:[]).filter(l=>l&&W[l.key]&&DATE_RE.test(l.date)&&l.sets&&typeof l.sets==='object').map(l=>({
    date:l.date,key:l.key,dur:+l.dur||0,
    sets:Object.fromEntries(Object.entries(l.sets).filter(([id,a])=>EX[id]&&Array.isArray(a)).map(([id,a])=>[id,a.map(s=>{const x={w:+s.w||0,r:+s.r||0};if(s.drop)x.drop=1;return x})]))
  }));
  o.bw=(Array.isArray(o.bw)?o.bw:[]).filter(x=>x&&DATE_RE.test(x.date)&&+x.kg>0).map(x=>({date:x.date,kg:+x.kg}));
  const dl={};if(o.daily&&typeof o.daily==='object')Object.entries(o.daily).forEach(([k,v])=>{if(DATE_RE.test(k)&&v)dl[k]={water:+v.water||0,steps:+v.steps||0,protein:+v.protein||0,kcal:+v.kcal||0}});o.daily=dl;
  const wk={};if(o.weeks&&typeof o.weeks==='object')Object.entries(o.weeks).forEach(([k,v])=>{if(+k>0&&v&&(v.split==='3'||v.split==='4'))wk[+k]={split:v.split,days:validDays(v.days)?v.days:o.days3}});o.weeks=wk;
  if(o.draft&&!(W[o.draft.key]&&o.draft.sets&&typeof o.draft.sets==='object'))o.draft=null;
  if(o.draft){o.draft.warm=Array.isArray(o.draft.warm)&&o.draft.warm.length===WARM.length?o.draft.warm:WARM.map(()=>false);o.draft.date=DATE_RE.test(o.draft.date)?o.draft.date:today();o.draft.t0=+o.draft.t0||Date.now()}
  if(!TABS.includes(o.tab))o.tab='today';
  if(typeof o.onboarded!=='boolean')o.onboarded=!!existing;
  return o;
}
let S=(()=>{try{const raw=localStorage.getItem(KEY);return clean(raw?JSON.parse(raw):null,!!raw)}catch(e){return def()}})();
let SCH=null;
const save=()=>{SCH=null;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};

/* ---------- SCHEDULE ENGINE ---------- */
const weekOf=s=>Math.floor(dayDiff(mondayOf(S.start),s)/7)+1;
const phaseOfWeek=w=>PHASES.find(p=>w>=p.from&&w<=p.to)||null;
const PH=k=>PHASES.find(p=>p.k===k)||null;
const targetIdx=w=>w<=2?0:w<=5?1:2;
const weekCfg=w=>S.weeks[w]||{split:S.split,days:S.days3};
function genWeek(start,w,cfg){
  const m0=addDays(mondayOf(start),(w-1)*7);
  let out=cfg.split==='4'
    ?Object.entries(DAYS4).map(([d,k])=>({date:addDays(m0,+d),key:k,w}))
    :[...cfg.days].sort((a,b)=>a-b).map(d=>({date:addDays(m0,d),key:'A',w}));
  out=out.filter(s=>s.date>=start);
  if(cfg.split!=='4')out.forEach((s,i)=>s.key=ROT3[i]);
  return out;
}
function sched(){
  const t=today();
  if(SCH&&SCH.t===t)return SCH;
  const cw=weekOf(t),lastW=Math.min(260,Math.max(8,cw+5));
  const slots=[];for(let w=1;w<=lastW;w++)slots.push(...genWeek(S.start,w,weekCfg(w)));
  const byW={},used=new Set();
  slots.forEach(s=>{s.log=null;s.makeup=false;(byW[s.w]=byW[s.w]||[]).push(s)});
  const logs=S.logs.map((l,i)=>({i,date:l.date,key:l.key,w:weekOf(l.date)})).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.i-b.i);
  Object.values(byW).forEach(sl=>{
    const ls=logs.filter(l=>l.w===sl[0].w);
    sl.forEach(s=>{const l=ls.find(l=>!used.has(l.i)&&l.date===s.date);if(l){s.log=l.i;used.add(l.i)}});
    ls.forEach(l=>{
      if(used.has(l.i))return;
      const s=sl.find(s=>s.log===null&&s.date<=l.date&&s.key===l.key)||sl.find(s=>s.log===null&&s.date<=l.date);
      if(s){s.log=l.i;s.makeup=true;used.add(l.i)}
    });
  });
  slots.forEach(s=>s.st=s.log!==null?'done':s.date<t?'missed':s.date===t?'today':'up');
  const byDate={},logsByDate={};
  slots.forEach(s=>byDate[s.date]=s);
  S.logs.forEach((l,i)=>(logsByDate[l.date]=logsByDate[l.date]||[]).push(i));
  const extras=new Set(logs.filter(l=>!used.has(l.i)).map(l=>l.i));
  return SCH={t,cw,slots,byW,byDate,logsByDate,extras};
}
function streaks(){
  const {slots,t}=sched();let cur=0,best=0,broken=false;
  for(const s of slots){if(s.date>t)break;if(s.st==='done'){cur++;best=Math.max(best,cur);broken=false}else if(s.st==='missed'){cur=0;broken=true}}
  return {cur,best,broken};
}
const weekStat=w=>{const sl=sched().byW[w]||[];return {done:sl.filter(s=>s.st==='done').length,total:sl.length,missed:sl.filter(s=>s.st==='missed').length}};
function focus(){
  const sc=sched(),t=sc.t;
  return {ts:sc.byDate[t]||null,missed:(sc.byW[sc.cw]||[]).filter(s=>s.st==='missed'),next:sc.slots.find(s=>s.date>t&&s.st!=='done')||null};
}
function freezePast(){const cw=weekOf(today());for(let w=1;w<cw;w++)if(!S.weeks[w])S.weeks[w]={split:S.split,days:[...S.days3]}}
function setWeekSplit(w,split){
  const cfg=weekCfg(w);
  if(split===S.split&&cfg.days.join()===S.days3.join())delete S.weeks[w];
  else S.weeks[w]={split,days:[...cfg.days]};
  save();
}

/* ---------- PROGRESSION ---------- */
const weighted=id=>['bb','db','cb'].includes(EX[id].t);
const inc=t=>t==='db'?2:2.5;
function lastSets(id){
  for(let i=S.logs.length-1;i>=0;i--){const a=S.logs[i].sets[id];if(a){const b=a.filter(s=>!s.drop);if(b.length)return b}}
  return null;
}
function prog(x){
  const e=EX[x.id];if(!weighted(x.id))return null;
  const last=lastSets(x.id);
  if(!last)return {state:'new',w:e.s||''};
  const top=Math.max(...last.map(s=>+s.w||0));
  const atTopHit=last.filter(s=>(+s.w||0)>=top&&(+s.r||0)>=x.hi).length;
  return atTopHit>=3?{state:'up',w:+(top+inc(e.t)).toFixed(1),from:top}:{state:'hold',w:top,hits:atTopHit};
}
function progTxt(x,p){
  const e=EX[x.id],u=e.t==='db'?' KG / DB':' KG';
  if(p.state==='new')return `NEW LIFT · PICK A WEIGHT YOU OWN FOR ${x.lo} STRICT REPS${e.s?` · START NEAR ${e.s}${u}`:''}`;
  if(p.state==='up')return `+ 3×${x.hi} @ ${p.from}${u} HIT · LOAD ${p.w}${u} (${e.t==='db'?'NEXT DUMBBELL':'+2.5–5 KG'}) · DROP BACK TO ${x.lo} REPS`;
  return `HOLD ${p.w}${u} UNTIL 3×${x.hi} · ${p.hits}/3 SETS AT TOP LAST TIME`;
}
const e1rm=(w,r)=>w*(1+r/30);
const bestE1=id=>{const a=S.logs.flatMap(l=>(l.sets[id]||[]).filter(s=>!s.drop&&s.w>0));return a.length?Math.max(...a.map(s=>e1rm(s.w,s.r))):null};
function dropW(id){const a=(S.draft.sets[id]||[]).filter(s=>!s.drop&&+s.w>0);return a.length?r05(+a[a.length-1].w*.7):''}
const repTxt=x=>`${x.sets} × ${x.lo===x.hi?x.lo:x.lo+'–'+x.hi}${EX[x.id].t==='hold'?' SEC HOLD':' REPS'}${x.per?' / '+x.per.toUpperCase():''}`;
const restTxt=x=>`${x.rest}s${x.rs==='d'?'†':x.rs==='x'?'*':''}`;
const REST_NOTE='† Rest not listed for the 4-day split — taken from the same lift in the 3-day split. * Rest not specified in the plan — 60s default.';

/* ---------- SESSION ---------- */
function startSession(key){
  const t=today(),ph=phaseOfWeek(weekOf(t)),sets={};
  W[key].ex.forEach(x=>{
    const sg=prog(x),w=sg&&sg.w!==''?String(sg.w):'';
    sets[x.id]=Array.from({length:x.sets},()=>({w,r:'',done:false}));
    if(ph&&ph.k===3&&EX[x.id].drop)sets[x.id].push({w:'',r:'',done:false,drop:true});
  });
  S.draft={key,t0:Date.now(),date:t,ph:ph?ph.k:0,warm:WARM.map(()=>false),sets};
  S.tab='today';save();render();window.scrollTo({top:0});
}
function finishSession(){
  const d=S.draft;if(!d)return;
  const out={},prs=[];let vol=0,n=0;
  W[d.key].ex.forEach(x=>{
    const done=(d.sets[x.id]||[]).filter(s=>s.done&&+s.r>0).map(s=>{const o={w:+s.w||0,r:+s.r};if(s.drop)o.drop=1;return o});
    if(!done.length)return;
    out[x.id]=done;n+=done.length;done.forEach(s=>vol+=s.w*s.r);
    if(weighted(x.id)){
      const prev=bestE1(x.id),main=done.filter(s=>!s.drop&&s.w>0);
      if(prev!==null&&main.length&&Math.max(...main.map(s=>e1rm(s.w,s.r)))>prev+0.01)prs.push(EX[x.id].n);
    }
  });
  if(!n){toast('LOG AT LEAST ONE SET',true);return}
  const dur=Math.round((Date.now()-d.t0)/1000);
  S.logs.push({date:d.date||today(),key:d.key,dur,sets:out});
  S.draft=null;stopRest();S.tab='cal';S.calSel=null;save();render();window.scrollTo({top:0});
  const st=streaks(),ws=weekStat(sched().cw),f=focus();
  showModal(`<div class="tape">${W[d.key].sub}</div>
    <h2 id="modal-title" class="big">SESSION COMPLETE.</h2>
    <p class="mono mute">${W[d.key].name} · ${fmt(dur)} · ${n} SETS · ${Math.round(vol).toLocaleString()} KG</p>
    ${prs.length?`<div class="card red"><div class="kick red-t">NEW RECORDS</div><ul class="rules">${prs.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>`:''}
    <div class="streak">${streakTile(st)}${weekTile(ws)}</div>
    ${f.missed.length?`<p class="note"><b>YOU MISSED ONE. CORRECT IT.</b> ${f.missed.length} session${f.missed.length>1?'s':''} still open this week.</p>`:''}
    ${f.next?`<p class="kick">NEXT · ${shortDate(f.next.date)} · ${W[f.next.key].sub}</p>`:''}
    <button class="btn block" style="margin-top:16px" data-act="close-modal">DISMISS</button>`);
  if(prs.length)prfx(false);
}

/* ---------- REST TIMER / AUDIO ---------- */
let restEnd=0,actx=null;
function beep(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=880;g.gain.value=.15;o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.25);navigator.vibrate&&navigator.vibrate([120,60,120])}catch(e){}}
function startRest(sec){restEnd=Date.now()+sec*1000;$('#rest').hidden=false;tickRest()}
function stopRest(){restEnd=0;$('#rest').hidden=true}
function tickRest(){
  if(!restEnd)return;
  const left=Math.ceil((restEnd-Date.now())/1000),r=$('#rest');
  if(left<=0){beep();stopRest();toast('REST OVER. BACK TO WORK.');return}
  $('#restT').textContent=fmt(left);r.classList.toggle('low',left<=5);
}
setInterval(()=>{tickRest();const t=$('#sessT');if(t&&S.draft)t.textContent=fmt((Date.now()-S.draft.t0)/1000)},500);

/* ---------- FX ---------- */
const RM=window.matchMedia('(prefers-reduced-motion: reduce)');
let tt;function toast(m,red){const t=$('#toast');t.textContent=m;t.classList.toggle('red',!!red);t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)}
function fxEl(cls,ms){const d=document.createElement('div');d.className=cls;d.setAttribute('aria-hidden','true');document.body.appendChild(d);setTimeout(()=>d.remove(),ms)}
function slash(){if(!RM.matches)fxEl('slash',360)}
function prfx(withToast=true,name=''){
  if(!RM.matches){fxEl('strobe',520);document.body.classList.remove('shake');void document.body.offsetWidth;document.body.classList.add('shake');setTimeout(()=>document.body.classList.remove('shake'),420)}
  navigator.vibrate&&navigator.vibrate([40,30,40,30,90]);
  if(withToast)toast('NEW PR — '+name.toUpperCase(),true);
}

/* ---------- MODAL ---------- */
let lastFocus=null;
function showModal(html){lastFocus=document.activeElement;$('#modalIn').innerHTML=html;$('#modal').hidden=false;const b=$('#modal button');b&&b.focus()}
function closeModal(){$('#modal').hidden=true;$('#modalIn').innerHTML='';lastFocus&&lastFocus.focus&&lastFocus.focus()}

/* ---------- SHARED PIECES ---------- */
function streakTile(st){
  const cls=st.cur>0?'':st.broken?'broken':'cold';
  const msg=st.broken&&st.cur===0?'YOU MISSED ONE. CORRECT IT.':st.cur>0?'STREAK INTACT.':'START THE CHAIN.';
  return `<div class="sk ${cls}">${ICON.flame}<div><b>${st.cur}</b><span>STREAK · BEST ${st.best}</span><em>${msg}</em></div></div>`;
}
function weekTile(ws){
  const full=ws.total>0&&ws.done>=ws.total;
  return `<div class="sk ${ws.missed?'broken':''}">${ICON.shield(full)}<div><b>${ws.done}/${ws.total}</b><span>THIS WEEK</span><em>${full?'SHIELD UP.':ws.missed?'GAP IN THE WALL.':'HOLD THE LINE.'}</em></div></div>`;
}
function phaseCard(ph,w,compact){
  const pct=Math.min(100,Math.max(0,(w-1)/8*100+ (w>=1&&w<=8?100/8*((wd(today())+1)/7):0)));
  if(!ph)return `<div class="card flat"><div class="phase"><div><div class="kick">${w<1?'PRE-PROTOCOL':'EIGHT WEEKS COMPLETE'}</div><h3>${w<1?'STAND BY':'MAINTAIN & ESCALATE'}</h3></div><span class="pill mute">${w<1?'PRE':'WK '+w}</span></div>
    <p class="mute" style="margin-top:6px">${w<1?'Protocol begins '+shortDate(S.start)+'.':'Protocol complete. Double progression keeps running. Reconfigure in SYSTEM for a new 8-week cycle.'}</p>${w>8?`<div class="bar"><i style="width:100%"></i></div>`:''}</div>`;
  return `<div class="card ${ph.k===3?'red':''}"><div class="phase"><div><div class="kick">PHASE ${ph.k} · ${ph.w} · ${ph.rpe}</div><h3>${ph.n}</h3></div><span class="pill ${ph.k===3?'red':''}">WK ${w}/8</span></div>
    ${compact?'':`<ul class="rules">${ph.rules.map(r=>`<li>${r}</li>`).join('')}</ul>`}
    <div class="row" style="margin-top:10px">${ph.tech.map(k=>watch(TECH[k][1],TECH[k][0],false,ph.k===3?'red':'')).join('')}</div>
    <div class="bar ${ph.k===3?'red':''}"><i style="width:${pct}%"></i></div></div>`;
}
function flexCtl(w,label){
  if(w<1)return '';
  const cfg=weekCfg(w),cw=weekOf(today()),locked=w<cw;
  return `<div class="row between" style="margin:10px 0"><span class="lbl">${label||'WEEK '+w+' SPLIT'}${S.weeks[w]&&!locked?' · FLEX':''}</span>
    ${locked?`<span class="pill mute">${cfg.split}-DAY · LOCKED</span>`:`<div class="seg" role="group" aria-label="Split for week ${w}">
      <button data-flex="${w}:3" aria-pressed="${cfg.split==='3'}">3-DAY</button><button data-flex="${w}:4" aria-pressed="${cfg.split==='4'}">4-DAY</button></div>`}</div>`;
}
function warmCard(d){
  return `<div class="card flat"><div class="row between"><h3>WARM-UP · 5 MIN${d?' · '+d.warm.filter(Boolean).length+'/5':''}</h3>${watch(WARM_Q,'WARM-UP ROUTINE',false,'big')}</div>
    <p class="mute" style="font-size:15px;margin:4px 0 6px">Before every session. Raises core temperature, lubricates joints, primes the nervous system — without fatigue.</p>
    ${WARM.map((x,i)=>`<div class="wu">${d?`<button class="chk" data-warm="${i}" aria-pressed="${!!d.warm[i]}"><span class="box"></span><span class="t"><span>${i+1}. ${esc(x.n)}</span><small>${x.d} · ${x.a}</small></span></button>`
      :`<div class="chk" style="cursor:default"><span class="t"><span>${i+1}. ${esc(x.n)}</span><small>${x.d} · ${x.a}</small></span></div>`}${watch(x.q,'FORM')}</div>`).join('')}
    <p class="note y"><b>ACCLIMATIZATION</b> First primary compound lift: 2 quick warm-up sets — 50% target × 8, then 75% target × 4 — before working sets. ${watch(TECH.ramp[1],TECH.ramp[0],false)}</p></div>`;
}

/* ---------- VIEWS ---------- */
function hud(){
  const w=weekOf(today()),st=streaks(),ws=weekStat(sched().cw);
  $('#hud').innerHTML=`<div>WEEK<b>${w<1?'—':w>8?'8+':w}</b></div><div class="${st.broken&&!st.cur?'bad':''}">STREAK<b>${ICON.flame}${st.cur}</b></div><div class="${ws.missed?'bad':''}">DONE<b>${ws.done}/${ws.total}</b></div>`;
}
function vToday(){
  if(S.draft)return vSession();
  const t=today(),w=weekOf(t),ph=phaseOfWeek(w),f=focus(),st=streaks(),ws=weekStat(sched().cw);
  let h=`<div class="kick">${pd(t).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}</div>`;
  h+=`<h2>${t<S.start?'PROTOCOL BEGINS IN '+dayDiff(t,S.start)+' DAY'+(dayDiff(t,S.start)>1?'S':''):'THE WORK DOESN&apos;T WAIT.'}</h2>`;
  h+=`<div class="streak">${streakTile(st)}${weekTile(ws)}</div>`;
  const hero=(slot,kick,cls,btn)=>{const wk=W[slot.key];return `<div class="card hero ${cls}"><div class="kick">${kick}</div><h3 style="font-size:34px;color:var(--ink);margin:4px 0">${wk.name}</h3>
    <div class="spec">${wk.sub} · ${shortDate(slot.date)} · ${wk.ex.length} LIFTS</div>
    <ul class="exl">${wk.ex.map(x=>`<li><span class="nm">${esc(x.label||EX[x.id].n)}<small>${repTxt(x)} · REST ${restTxt(x)}</small></span>${watch(EX[x.id].q,'FORM')}</li>`).join('')}</ul>
    <button class="btn xl block ${cls==='red'?'red':''}" style="margin-top:12px" data-start="${slot.key}">${btn}</button></div>`};
  if(f.ts&&f.ts.st==='today')h+=hero(f.ts,'TODAY · SCHEDULED','', 'ENGAGE »');
  else if(f.missed.length)h+=`<div class="hazard red"></div>`+hero(f.missed[0],'YOU MISSED ONE. CORRECT IT. · MAKE-UP','red','CORRECT IT »');
  else if(f.ts&&f.ts.st==='done')h+=`<div class="card hero"><div class="tape">SESSION COMPLETE.</div><p style="margin-top:10px">${W[f.ts.key].name} is logged. Recover. Eat. Sleep.</p>${f.next?`<p class="kick" style="margin-top:8px">NEXT · ${shortDate(f.next.date)} · ${W[f.next.key].sub}</p>`:''}</div>`;
  else if(t>=S.start||f.next)h+=`<div class="card hero flat"><div class="tape ghost">REST DAY</div><p style="margin-top:10px">No session scheduled. A rest day never breaks the streak.</p>${f.next?`<p class="kick" style="margin-top:8px">NEXT · ${shortDate(f.next.date)} · ${W[f.next.key].sub} — ${W[f.next.key].name}</p>`:''}</div>`;
  h+=phaseCard(ph,w);
  const cfg=weekCfg(Math.max(1,w));
  h+=`<div class="sect"><div class="kick">OFF-SCRIPT · PICK ANY SESSION · ${cfg.split}-DAY SPLIT</div>${flexCtl(Math.max(1,w),'FLEX THIS WEEK')}<div class="pick">`;
  const tk=f.ts&&f.ts.st==='today'?f.ts.key:null,nk=tk||(f.missed[0]&&f.missed[0].key)||(f.next&&f.next.key);
  SPLITS[cfg.split].keys.forEach(k=>{const nx=nk===k;h+=`<button data-start="${k}" class="${nx?'next':''}"><div><small>${W[k].sub}${nx?(k===tk?' · TODAY':' · UP NEXT'):''}</small><b>${W[k].name}</b></div><span class="go">ENGAGE »</span></button>`});
  h+=`</div></div><div class="hazard"></div>`+warmCard(null);
  const last=S.logs[S.logs.length-1];
  if(last)h+=`<div class="card flat"><div class="kick">LAST SESSION</div><div class="row between"><b style="font-family:var(--disp);font-size:24px;letter-spacing:.08em;font-weight:400">${W[last.key].name}</b><span class="mono mute">${last.date} · ${fmt(last.dur)}</span></div></div>`;
  return h;
}
function vSession(){
  const d=S.draft,wk=W[d.key],ph=PH(d.ph),w=weekOf(d.date),ti=targetIdx(w);
  let h=`<div class="kick">${wk.sub} · ${ph?'PHASE '+ph.k+' · '+ph.rpe:'OFF-PROTOCOL'}</div><h2>${wk.name}</h2>`;
  h+=`<div class="sess"><div><div class="kick">SESSION CLOCK</div><div class="timer" id="sessT">${fmt((Date.now()-d.t0)/1000)}</div></div><div class="row"><button class="btn ghost sm" data-act="abort">ABORT</button><button class="btn sm" data-act="finish">COMPLETE</button></div></div>`;
  if(ph)h+=`<div class="card ${ph.k===3?'red':''}"><div class="kick">PHASE ${ph.k} DIRECTIVES · ${ph.n}</div><ul class="rules">${ph.rules.map(r=>`<li>${r}</li>`).join('')}</ul><div class="row" style="margin-top:8px">${ph.tech.map(k=>watch(TECH[k][1],TECH[k][0],false,ph.k===3?'red':'')).join('')}</div></div>`;
  h+=warmCard(d);
  wk.ex.forEach((x,xi)=>{
    const e=EX[x.id],sets=d.sets[x.id]||[],last=lastSets(x.id),p=prog(x);
    h+=`<section class="card" aria-label="${esc(x.label||e.n)}"><div class="ex-h"><h3>${xi+1}. ${esc((x.label||e.n).toUpperCase())}</h3>${watch(e.q)}</div>
      <div class="spec">${repTxt(x)} · REST ${restTxt(x)}</div>`;
    if(e.tg&&w>=1)h+=`<div class="tgt">WEEK ${[1,4,8][ti]} TARGET · ${e.tg[ti].toUpperCase()}</div>`;
    if(p)h+=`<div class="prog ${p.state}">${d.ph===2?'AGGRESSIVE · ':''}${progTxt(x,p)}</div>`;
    if(xi===0&&weighted(x.id)){const b=+(sets[0]&&sets[0].w)||0;h+=`<div class="note y"><b>RAMP</b> ${b?`${r05(b*.5)} kg × 8 → ${r05(b*.75)} kg × 4`:'50% × 8 → 75% × 4'} before working sets.</div>`}
    if(d.ph===1&&e.t!=='hold')h+=`<div class="note y"><b>TEMPO</b> 3-second negative every rep. 2 reps in the tank. ${watch(TECH.neg[1],'TEMPO',false)}</div>`;
    if(d.ph===2)h+=`<div class="note y"><b>RPE 8.5–9</b> Close to technical failure.</div>`;
    if(d.ph===3&&e.drop)h+=`<div class="note"><b>DROP SET</b> Final set: at failure cut weight 30%, push 6–8 more reps. ${watch(TECH.drop[1],'DROP SET',false,'red')}</div>`;
    const wl=e.t==='db'?'KG / DB':e.t==='bw'||e.t==='hold'?'+KG':'KG';
    h+=`<div class="sets"><span class="hd">#</span><span class="hd">${wl}</span><span class="hd">${e.t==='hold'?'SEC':'REPS'}</span><span class="hd">DONE</span>`;
    sets.forEach((s,i)=>{
      const pv=!s.drop&&last&&last[i],lbl=s.drop?'Drop set':'Set '+(i+1);
      const wph=s.drop?(dropW(x.id)||'−30%'):(e.t==='bw'||e.t==='hold'?'0':'kg');
      h+=`<span class="n ${s.drop?'dr':''}" aria-hidden="true">${s.drop?'D':i+1}</span>
        <input class="${s.drop?'dr':''}" aria-label="${lbl} weight" inputmode="decimal" data-ex="${x.id}" data-i="${i}" data-f="w" value="${esc(s.w)}" placeholder="${wph}">
        <input class="${s.drop?'dr':''}" aria-label="${lbl} ${e.t==='hold'?'seconds':'reps'}" inputmode="numeric" data-ex="${x.id}" data-i="${i}" data-f="r" value="${esc(s.r)}" placeholder="${s.drop?'6–8':x.lo===x.hi?x.lo:x.lo+'–'+x.hi}">
        <button class="done ${s.drop?'dr':''} ${s.done?'on':''}" data-done="${x.id}:${i}" aria-pressed="${!!s.done}" aria-label="Mark ${lbl.toLowerCase()} done">${s.done?'✓':s.drop?'DROP':'SET'}</button>`;
      if(pv)h+=`<span class="prev">LAST: ${pv.w?pv.w+' kg × ':''}${pv.r}</span>`;
      if(s.drop)h+=`<span class="prev dr">DROP · −30% · 6–8 MORE REPS</span>`;
    });
    h+=`</div></section>`;
  });
  h+=`<p class="mono mute" style="font-size:11px">${REST_NOTE}</p><button class="btn xl block" style="margin-top:12px" data-act="finish">COMPLETE SESSION</button>`;
  return h;
}
function vCal(){
  const sc=sched(),t=sc.t,st=streaks(),ws=weekStat(sc.cw),f=focus();
  const nextD=f.next&&f.next.date;
  let h=`<h2>THE GRID</h2><div class="streak">${streakTile(st)}${weekTile(ws)}</div>`;
  h+=`<div class="calbar"><div class="seg" role="group" aria-label="Calendar view"><button data-calmode="month" aria-pressed="${S.calMode!=='week'}">MONTH</button><button data-calmode="week" aria-pressed="${S.calMode==='week'}">WEEK</button></div>`;
  const cell=(d,outside)=>{
    const s=sc.byDate[d],ex=(sc.logsByDate[d]||[]).some(i=>sc.extras.has(i)),sel=(S.calSel||t)===d;
    const lab=`${shortDate(d)}${s?': '+W[s.key].sub+' — '+({done:'complete',missed:'missed',today:'today',up:'scheduled'})[s.st]:': rest day'}${ex?', extra session logged':''}`;
    return `<button class="cd ${s?'st-'+s.st:''} ${d===t?'is-today':''} ${d===nextD?'is-next':''} ${outside?'out':''} ${sel?'sel':''}" data-day="${d}" aria-label="${lab}" aria-pressed="${sel}"><span class="dn">${+d.slice(8)}</span>${s?`<span class="ck">${SHORT[s.key]}</span>`:''}${ex?'<i class="xd"></i>':''}</button>`;
  };
  if(S.calMode==='week'){
    const m=S.calW||mondayOf(t),pw=weekOf(m),wst=weekStat(pw);
    h+=`<div class="nav"><button data-calnav="-1" aria-label="Previous week">‹</button><span>${pw>=1?'WEEK '+pw:'PRE'}</span><button data-calnav="1" aria-label="Next week">›</button></div></div>`;
    h+=`<div class="row between"><span class="kick">${shortDate(m)} – ${shortDate(addDays(m,6))}</span><span class="pill ${wst.missed?'red':''}">${wst.done}/${wst.total} COMPLETE</span></div>`;
    h+=flexCtl(pw);
    for(let i=0;i<7;i++){
      const d=addDays(m,i),s=sc.byDate[d],logs=sc.logsByDate[d]||[];
      const can=s&&s.st!=='done'&&(s.st==='today'||(s.st==='missed'&&s.w===sc.cw));
      h+=`<div class="wkrow ${s?'st-'+s.st:'rest'}"><div class="d">${DN[i]}<small>${+d.slice(8)} ${pd(d).toLocaleDateString('en-GB',{month:'short'}).toUpperCase()}</small></div>
        <div class="w"><b>${s?W[s.key].name:'REST'}</b><span class="kick">${s?({done:s.makeup?'COMPLETE · MADE UP':'COMPLETE',missed:'MISSED',today:'TODAY',up:d===nextD?'NEXT UP':'SCHEDULED'})[s.st]:'RECOVERY · STREAK SAFE'}${logs.filter(i=>sc.extras.has(i)).length?' · + EXTRA':''}</span></div>
        ${can?`<button class="btn sm ${s.st==='missed'?'red':''}" data-start="${s.key}">${s.st==='missed'?'CORRECT':'ENGAGE'}</button>`:s&&s.st==='done'?'<span class="pill">✓</span>':''}</div>`;
    }
  }else{
    const ym=S.calM||t.slice(0,7),first=ym+'-01',dim=new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate();
    const gs=mondayOf(first),ge=addDays(mondayOf(addDays(first,dim-1)),6);
    h+=`<div class="nav"><button data-calnav="-1" aria-label="Previous month">‹</button><span>${pd(first).toLocaleDateString('en-GB',{month:'short',year:'numeric'}).toUpperCase()}</span><button data-calnav="1" aria-label="Next month">›</button></div></div>`;
    h+=`<div class="cal">${DN.map(x=>`<div class="dh" aria-hidden="true">${x}</div>`).join('')}`;
    for(let d=gs;d<=ge;d=addDays(d,1))h+=cell(d,d.slice(0,7)!==ym);
    h+=`</div>`;
    h+=`<div class="legend"><span><i style="background:var(--amber);border-color:var(--amber)"></i>COMPLETE</span><span><i style="border-color:var(--blood);background:rgba(193,18,31,.3)"></i>MISSED</span><span><i style="border:2px solid var(--amber)"></i>TODAY</span><span><i style="border-color:rgba(245,197,24,.5)"></i>SCHEDULED</span><span><i style="background:var(--ink);transform:rotate(45deg) scale(.6)"></i>EXTRA</span></div>`;
    h+=dayDetail(S.calSel||t);
  }
  const cw=sc.cw,last=Math.max(8,cw);
  h+=`<div class="sect"><div class="kick">WEEKLY CONSISTENCY</div><div class="wks">`;
  for(let w=1;w<=last;w++){const s=weekStat(w),fut=w>cw;h+=`<div class="wk ${fut?'fut':s.total&&s.done>=s.total?'full':s.missed?'miss':''} ${w===cw?'cur':''}"><small>W${w}${w<=8?'':'+'}</small><b>${s.done}/${s.total}</b></div>`}
  h+=`</div></div>`;
  return h;
}
function dayDetail(d){
  const sc=sched(),s=sc.byDate[d],logs=sc.logsByDate[d]||[],w=weekOf(d),ph=phaseOfWeek(w);
  let h=`<div class="card ${s&&s.st==='missed'?'red':'flat'}"><div class="row between"><h3>${shortDate(d)}</h3><span class="pill mute">${w>=1?'WK '+w+(ph?' · P'+ph.k:''):'PRE'}</span></div>`;
  if(s){
    h+=`<p style="margin-top:6px"><b class="y">${W[s.key].sub}</b> — ${W[s.key].name}</p><p class="kick" style="margin-top:4px">${({done:s.makeup?'COMPLETE · MADE UP ON '+S.logs[s.log].date:'COMPLETE',missed:'MISSED — YOU MISSED ONE. CORRECT IT.',today:'TODAY',up:'SCHEDULED'})[s.st]}</p>`;
    if(s.st==='today'||(s.st==='missed'&&s.w===sc.cw))h+=`<button class="btn sm ${s.st==='missed'?'red':''}" style="margin-top:10px" data-start="${s.key}">${s.st==='missed'?'CORRECT IT »':'ENGAGE »'}</button>`;
  }else h+=`<p class="mute" style="margin-top:6px">Rest day. The streak holds.</p>`;
  logs.forEach(i=>{const l=S.logs[i];h+=`<div class="mono mute" style="font-size:12px;margin-top:10px;line-height:1.7"><span class="y">${W[l.key].sub}${sc.extras.has(i)?' · EXTRA':''} · ${fmt(l.dur)}</span><br>${Object.entries(l.sets).map(([id,a])=>esc(EX[id].n)+': '+a.map(x=>(x.drop?'D ':'')+(x.w?x.w+'×':'')+x.r).join(' / ')).join('<br>')}</div>`});
  return h+`</div>`;
}
function vPlan(){
  const w=weekOf(today()),ti=w>=1?targetIdx(w):-1;
  let h=`<h2>THE PROTOCOL</h2><p class="mute">NO GADGETS. NO SHORTCUTS. ONLY THE BODY.</p>`;
  h+=`<div class="card"><div class="kick">1 · GOAL &amp; AESTHETIC STRATEGY</div><h3 style="margin:4px 0 6px">THE V-TAPER</h3><p class="mute" style="font-size:16px">A strong, defined look in compression wear in the shortest time possible.</p><ul class="rules">${GOAL.map(([a,b])=>`<li><b class="y">${a}</b> — ${b}</li>`).join('')}</ul></div>`;
  h+=`<div class="kick sect">2 · STANDARDIZED 5-MINUTE UNIVERSAL WARM-UP</div>`+warmCard(null);
  h+=`<div class="hazard"></div><div class="kick">3 · ADAPTABLE TRAINING SPLITS · SUB-60 MINUTE SESSIONS</div>`;
  ['3','4'].forEach(sp=>{
    const s=SPLITS[sp];
    h+=`<div class="sect"><div class="row between"><h3>${s.t}</h3><span class="pill ${S.split===sp?'':'mute'}">${s.s}${S.split===sp?' · ACTIVE':''}</span></div><p class="mono mute" style="font-size:12px;margin-top:4px">${s.sch}</p>`;
    s.keys.forEach(k=>{const v=W[k];h+=`<div class="card flat"><div class="kick">${v.sub}</div><h3 style="color:var(--ink);margin:2px 0 6px">${v.name}</h3>
      <ul class="exl">${v.ex.map((x,i)=>`<li><span class="nm">${i+1}. ${esc(x.label||EX[x.id].n)}${EX[x.id].drop?' <span class="pill red" style="font-size:9px;padding:1px 4px">P3 DROP</span>':''}<small>${repTxt(x)} · REST ${restTxt(x)}</small></span>${watch(EX[x.id].q,'FORM')}</li>`).join('')}</ul></div>`});
    h+=`</div>`;
  });
  h+=`<p class="mono mute" style="font-size:11px">${REST_NOTE}</p>`;
  h+=`<div class="hazard"></div><div class="kick">4 · STARTING WEIGHT TARGETS &amp; PROGRESSION SCALE</div><p class="mute" style="font-size:16px;margin-top:4px">Calibrated for a return to training at ${S.bwStart} kg — kickstart muscle memory, spare the joints.</p>
    <div class="card flat tw"><table><tr><th>LIFT</th><th>ENTRY · WK1</th><th>MID · WK4</th><th>ADV · WK8</th><th><span class="sr-only">Form</span></th></tr>${TG.map(([id,n])=>`<tr><td>${n}</td>${EX[id].tg.map((x,i)=>`<td class="n ${i===ti?'cur':''}">${x}</td>`).join('')}<td>${watch(EX[id].q,'FORM')}</td></tr>`).join('')}</table></div>`;
  h+=`<div class="card"><div class="row between"><h3>THE DOUBLE-PROGRESSION METHOD</h3>${watch(TECH.dp[1],'WATCH',false)}</div><ul class="rules"><li>Pick a weight you can handle for <b class="y">8 reps</b> with strict form.</li><li>Stick with that weight until you can perform <b class="y">3 sets of 10 reps</b> comfortably.</li><li>Then increase by <b class="y">2.5 kg – 5 kg</b> (or the next available dumbbell) and drop back to <b class="y">8 reps</b>.</li></ul><p class="mute" style="font-size:15px;margin-top:8px">The tracker applies this to every weighted lift using that lift's rep range: 3 sets at the top of the range → next load is pre-filled.</p></div>`;
  h+=`<div class="hazard"></div><div class="kick">5 · PHASE BREAKDOWN &amp; TRAINING TYPES</div>`;
  PHASES.forEach(p=>{h+=`<div class="card ${p.k===3?'red':''}"><div class="phase"><div><div class="kick">PHASE ${p.k} · ${p.w} · ${p.rpe}</div><h3>${p.n}</h3><p class="mono mute" style="font-size:11px;margin-top:2px">${p.full.toUpperCase()}</p></div>${w>=p.from&&w<=p.to?'<span class="pill">ACTIVE</span>':''}</div>
    <ul class="rules">${p.rules.map(r=>`<li>${r}</li>`).join('')}</ul><div class="row" style="margin-top:8px">${p.tech.map(k=>watch(TECH[k][1],TECH[k][0],false,p.k===3?'red':'')).join('')}</div></div>`});
  h+=`<div class="hazard"></div><div class="kick">6 · NUTRITION &amp; FAT LOSS FRAMEWORK</div><div class="card flat"><ul class="rules">
    <li><b class="y">Daily caloric intake:</b> ~2,000 – 2,150 kcal — slight deficit to shed lower abdominal fat while leveraging muscle memory.</li>
    <li><b class="y">Protein:</b> 140 g – 160 g daily — supports muscle synthesis and keeps the upper body full.</li>
    <li><b class="y">Hydration:</b> 3.5 – 4 litres of water daily.</li>
    <li><b class="y">Daily steps:</b> 8,000 – 10,000 per day for consistent fat oxidation without taxing recovery.</li></ul></div>`;
  return h;
}
function vProgress(){
  const st=streaks();
  let h=`<h2>THE RECORD</h2>`;
  h+=`<div class="stats"><div class="stat"><b>${S.logs.length}</b><span>SESSIONS</span></div><div class="stat"><b>${st.cur} / ${st.best}</b><span>STREAK / BEST</span></div><div class="stat"><b>${weekVol().toLocaleString()}</b><span>KG VOLUME THIS WEEK</span></div><div class="stat"><b>${S.bw.length?S.bw[S.bw.length-1].kg:'—'}</b><span>BODYWEIGHT KG</span></div></div>`;
  const ids=[...new Set(S.logs.flatMap(l=>Object.keys(l.sets)))].filter(weighted);
  if(!ids.length)h+=`<div class="card flat" style="margin-top:14px"><p class="mute">No data. Complete a session and your strength curve shows up here.</p></div>`;
  else{
    if(!ids.includes(S.chartEx))S.chartEx=ids[0];
    h+=`<div class="kick" style="margin-top:18px">TOP SET LOAD OVER TIME</div><div class="tabsel">${ids.map(id=>`<button class="chip" aria-pressed="${id===S.chartEx}" data-chart="${id}">${esc(EX[id].n.toUpperCase())}</button>`).join('')}</div><canvas id="cv" role="img" aria-label="Top set load chart for ${esc(EX[S.chartEx].n)}"></canvas>`;
    const all=S.logs.flatMap(l=>(l.sets[S.chartEx]||[]).filter(s=>!s.drop));
    if(all.length){const best=all.reduce((a,b)=>e1rm(b.w,b.r)>e1rm(a.w,a.r)?b:a);h+=`<p class="mono mute" style="font-size:12px;margin-top:6px">BEST SET: ${best.w} kg × ${best.r} · EST 1RM ${e1rm(best.w,best.r).toFixed(1)} kg</p>`}
  }
  if(S.bw.length>1)h+=`<div class="kick" style="margin-top:18px">BODYWEIGHT</div><canvas id="cvb" role="img" aria-label="Bodyweight chart"></canvas>`;
  h+=`<div class="hazard"></div><h3>HISTORY</h3>`;
  if(!S.logs.length)h+=`<p class="mute">Empty.</p>`;
  [...S.logs].reverse().slice(0,40).forEach((l,ri)=>{
    const idx=S.logs.length-1-ri;
    h+=`<div class="card flat"><div class="row between"><b style="font-family:var(--disp);font-size:22px;letter-spacing:.08em;font-weight:400">${W[l.key].name}</b><span class="mono mute" style="font-size:12px">${l.date} · ${fmt(l.dur)}</span></div>
    <div class="mono mute" style="font-size:12px;margin-top:6px;line-height:1.7">${Object.entries(l.sets).map(([id,a])=>esc(EX[id].n)+': '+a.map(s=>(s.drop?'D ':'')+(s.w?s.w+'×':'')+s.r).join(' / ')).join('<br>')}</div>
    <button class="chip" style="margin-top:8px" data-del="${idx}">DELETE</button></div>`;
  });
  return h;
}
const weekVol=()=>{const from=mondayOf(today());let v=0;S.logs.filter(l=>l.date>=from).forEach(l=>Object.values(l.sets).forEach(a=>a.forEach(s=>v+=(s.w||0)*s.r)));return Math.round(v)};
function vFuel(){
  const t=today(),D=S.daily[t]||{water:0,steps:0,protein:0,kcal:0};
  const bar=(l,v,[lo,hi],u,over)=>{const ok=v>=lo&&v<=hi,bad=over&&v>hi;return `<div class="card flat"><div class="row between"><span class="kick">${l}</span><span class="mono ${bad?'red-t':'y'}">${(+v).toLocaleString()}${u} <span class="mute">/ ${lo.toLocaleString()}–${hi.toLocaleString()}${u}</span></span></div><div class="bar ${bad?'red':''}"><i style="width:${Math.min(100,v/hi*100)}%"></i><b style="left:${lo/hi*100}%"></b></div><div class="kick" style="margin-top:6px">${bad?'OVER. TIGHTEN IT.':ok?'IN RANGE.':v>hi?'ABOVE RANGE.':'BELOW TARGET.'}</div></div>`};
  let h=`<h2>FUEL</h2><p class="mute">Slight deficit to strip the lower abs. Protein to keep the upper body full.</p>`;
  h+=bar('WATER',+D.water.toFixed(2),FUEL.water,' L');
  h+=`<div class="row" style="margin:-4px 0 10px"><button class="btn ghost sm" data-fuel="water:0.25">+250 ML</button><button class="btn ghost sm" data-fuel="water:0.5">+500 ML</button><button class="btn ghost sm" data-fuel="water:-0.25" aria-label="Remove 250 ml">−250</button></div>`;
  h+=bar('STEPS',D.steps,FUEL.steps,'');
  h+=bar('PROTEIN',D.protein,FUEL.protein,' g');
  h+=bar('CALORIES',D.kcal,FUEL.kcal,' kcal',true);
  h+=`<div class="grid2"><div class="field"><label for="fs">STEPS TODAY</label><input inputmode="numeric" id="fs" value="${D.steps||''}"></div><div class="field"><label for="fp">PROTEIN G (ADD)</label><input inputmode="numeric" id="fp" placeholder="+g"></div><div class="field"><label for="fk">KCAL (ADD)</label><input inputmode="numeric" id="fk" placeholder="+kcal"></div><div class="field"><span class="lbl">&nbsp;</span><button class="btn" data-act="fuel-save">LOG</button></div></div>`;
  h+=`<div class="hazard"></div><h3>BODYWEIGHT</h3><div class="row" style="margin-top:8px"><div class="field" style="flex:1;margin:0"><label for="bwi" class="sr-only">Bodyweight in kg</label><input inputmode="decimal" id="bwi" placeholder="kg · start was ${S.bwStart}"></div><button class="btn" data-act="bw-save">LOG</button></div>`;
  if(S.bw.length){const f=S.bw[0].kg,l=S.bw[S.bw.length-1].kg;h+=`<p class="mono mute" style="margin-top:8px;font-size:12px">FIRST ${f} → NOW ${l} · Δ ${(l-f>0?'+':'')+(l-f).toFixed(1)} KG</p>`}
  h+=`<div class="card flat" style="margin-top:14px"><div class="kick">DAILY TARGETS</div><p>2,000–2,150 kcal · 140–160 g protein · 3.5–4 L water · 8,000–10,000 steps</p></div>`;
  return h;
}
function vSystem(){
  const cw=weekOf(today());
  return `<h2>SYSTEM</h2>
  <div class="card"><h3>PROTOCOL SETUP</h3><ul class="rules"><li>Default split: <b class="y">${SPLITS[S.split].t}</b></li>${S.split==='3'?`<li>Training days: <b class="y">${[...S.days3].sort().map(d=>DN[d]).join(' / ')}</b></li>`:'<li>Training days: <b class="y">MON / TUE / THU / FRI</b></li>'}<li>Start: <b class="y">${shortDate(S.start)}</b> · Week 1 begins ${shortDate(mondayOf(S.start))}</li><li>Starting bodyweight: <b class="y">${S.bwStart} kg</b></li></ul>
    <button class="btn sm" style="margin-top:10px" data-act="setup">RECONFIGURE</button><p class="mono mute" style="font-size:11px;margin-top:8px">Changing split or days keeps every past week and all logged sessions exactly as they were. Changing the start date regenerates the schedule.</p></div>
  <div class="card flat"><h3>FLEX WEEK</h3><p class="mute" style="font-size:15px">Swap a single week between the 3-day and 4-day split. History stays intact.</p>${flexCtl(Math.max(1,cw),'THIS WEEK')}${flexCtl(Math.max(1,cw)+1,'NEXT WEEK')}</div>
  <div class="card flat"><h3>DATA</h3><p class="mute">Everything lives in this browser only. Export a backup before clearing site data or switching devices.</p><div class="row" style="margin-top:10px"><button class="btn sm" data-act="export">EXPORT</button><label class="btn ghost sm" style="cursor:pointer">IMPORT<input type="file" id="imp" accept="application/json" hidden></label></div></div>
  <div class="card flat"><h3>OFFLINE</h3><p class="mute">Add to your home screen — the app works with no signal once loaded. Form videos need a connection.</p></div>
  <div class="card red"><h3 class="red-t">WIPE EVERYTHING</h3><button class="btn red sm" data-act="wipe" style="margin-top:8px">ERASE ALL DATA</button></div>
  <p class="mono mute" style="font-size:11px;text-align:center;margin-top:20px">NIGHTSHIFT · NO GADGETS. NO SHORTCUTS. ONLY THE BODY.</p>`;
}

/* ---------- ONBOARDING ---------- */
let OB=null;
function openSetup(first){
  OB=first?{split:'3',days:[0,2,4],start:today(),bw:78,first:true}:{split:S.split,days:[...S.days3],start:S.start,bw:S.bw.length?S.bw[S.bw.length-1].kg:S.bwStart,first:false};
  renderOB();
}
function renderOB(){
  const el=$('#ob');
  if(!OB){el.hidden=true;el.innerHTML='';document.body.style.overflow='';return}
  const okDays=OB.split==='4'||validDays(OB.days);
  let n=0,first=null;
  if(DATE_RE.test(OB.start)&&okDays)for(let w=1;w<=8;w++){const g=genWeek(OB.start,w,{split:OB.split,days:OB.days});n+=g.length;if(!first&&g.length)first=g}
  el.innerHTML=`<div class="ob-in">
    <div class="brand"><svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M3 28 L13 3 L18 3 L9 28Z"/><path d="M17 28 L29 3 L24 3 L14 24Z"/></svg><div><div class="tape">${OB.first?'INITIATION':'RECONFIGURE'}</div></div></div>
    <h2 id="ob-title" style="margin-top:18px">NO GADGETS. NO SHORTCUTS. ONLY THE BODY.</h2>
    <p class="mute">Eight weeks. Three phases. One V-taper. Configure the protocol.</p>
    <div class="hazard"></div>
    <div class="q"><span>01</span>HOW MANY DAYS PER WEEK DO YOU TRAIN?</div>
    <div role="radiogroup" aria-label="Training days per week">
      <button class="opt" role="radio" aria-checked="${OB.split==='3'}" data-obsplit="3"><b>3 DAYS</b><span>FULL-BODY A / B / C</span><small>MON / WED / FRI — OR ANY 3 NON-CONSECUTIVE DAYS</small></button>
      <button class="opt" role="radio" aria-checked="${OB.split==='4'}" data-obsplit="4"><b>4 DAYS</b><span>UPPER / LOWER</span><small>MON UPPER A · TUE LOWER A · THU UPPER B · FRI LOWER B</small></button>
    </div>
    ${OB.split==='3'?`<div class="lbl" style="margin:8px 0 6px">PICK 3 NON-CONSECUTIVE DAYS</div><div class="days" role="group" aria-label="Training days">${DN.map((d,i)=>`<button data-obday="${i}" aria-pressed="${OB.days.includes(i)}">${d}</button>`).join('')}</div>
      <p class="mono ${okDays?'mute':'red-t'}" style="font-size:11px;margin-top:6px">${okDays?'A / B / C IN ORDER: '+[...OB.days].sort().map((d,i)=>ROT3[i]+' '+DN[d]).join(' · '):'NEED EXACTLY 3 DAYS, NONE BACK-TO-BACK (SUN → MON COUNTS).'}</p>`:''}
    <div class="q"><span>02</span>START DATE</div>
    <div class="field"><label for="obstart">WEEK 1 = THE MON–SUN WEEK CONTAINING THIS DATE</label><input type="date" id="obstart" value="${esc(OB.start)}"></div>
    <div class="q"><span>03</span>CURRENT BODYWEIGHT</div>
    <div class="field"><label for="obbw">KG</label><input id="obbw" inputmode="decimal" value="${esc(OB.bw)}"></div>
    <div class="card flat"><div class="kick">GENERATED SCHEDULE</div><p class="mono" style="font-size:13px;margin-top:4px">${okDays&&first?`${n} SESSIONS · 8 WEEKS · 3 PHASES<br><span class="mute">FIRST: ${first.map(s=>shortDate(s.date)+' '+SHORT[s.key]).join(' · ')}</span>`:'—'}</p></div>
    <button class="btn xl block" data-act="ob-go" ${okDays?'':'disabled aria-disabled="true" style="opacity:.4"'}>${OB.first?'INITIATE PROTOCOL':'SAVE PROTOCOL'}</button>
    ${OB.first?'':'<button class="btn ghost block" style="margin-top:10px" data-act="ob-cancel">CANCEL</button>'}
  </div>`;
  el.hidden=false;document.body.style.overflow='hidden';
}
function applySetup(){
  const bw=parseFloat(OB.bw);
  if(!DATE_RE.test(OB.start)){toast('SET A START DATE',true);return}
  if(OB.split==='3'&&!validDays(OB.days)){toast('PICK 3 NON-CONSECUTIVE DAYS',true);return}
  if(!(bw>20&&bw<300)){toast('INVALID BODYWEIGHT',true);return}
  const first=!S.onboarded;
  if(!first&&OB.start!==S.start)S.weeks={};
  else if(!first)freezePast();
  S.start=OB.start;S.split=OB.split;if(OB.split==='3')S.days3=[...OB.days];
  const cw=weekOf(today());Object.keys(S.weeks).forEach(k=>{if(+k>=cw&&S.weeks[k].split===S.split)delete S.weeks[k]});
  if(first)S.bwStart=bw;
  const last=S.bw[S.bw.length-1];
  if(!last||last.kg!==bw){const t=today();S.bw=S.bw.filter(x=>x.date!==t);S.bw.push({date:t,kg:bw});S.bw.sort((a,b)=>a.date<b.date?-1:1)}
  S.onboarded=true;OB=null;S.tab='today';save();renderOB();render();window.scrollTo({top:0});
  toast(first?'PROTOCOL ARMED.':'PROTOCOL UPDATED.');
}

/* ---------- CHARTS ---------- */
function line(cv,pts){
  const dpr=window.devicePixelRatio||1,Wd=cv.clientWidth,H=cv.clientHeight;cv.width=Wd*dpr;cv.height=H*dpr;
  const c=cv.getContext('2d');c.scale(dpr,dpr);
  if(!pts.length)return;
  const ys=pts.map(p=>p.y);let lo=Math.min(...ys),hi=Math.max(...ys);if(lo===hi){lo-=1;hi+=1}const pr=(hi-lo)*.15;lo-=pr;hi+=pr;
  const L=40,R=14,T=14,B=24,Xp=i=>pts.length===1?(L+(Wd-L-R)/2):L+i*(Wd-L-R)/(pts.length-1),Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  c.strokeStyle='#262b35';c.fillStyle='#868c9a';c.font='10px JetBrains Mono,monospace';c.lineWidth=1;
  for(let i=0;i<=3;i++){const v=lo+(hi-lo)*i/3,y=Y(v);c.beginPath();c.moveTo(L,y);c.lineTo(Wd-R,y);c.stroke();c.fillText(v.toFixed(1),2,y+3)}
  const g=c.createLinearGradient(0,T,0,H-B);g.addColorStop(0,'rgba(245,197,24,.28)');g.addColorStop(1,'rgba(245,197,24,0)');
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(Xp(i),Y(p.y)):c.moveTo(Xp(i),Y(p.y)));
  c.lineTo(Xp(pts.length-1),H-B);c.lineTo(Xp(0),H-B);c.closePath();c.fillStyle=g;c.fill();
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(Xp(i),Y(p.y)):c.moveTo(Xp(i),Y(p.y)));
  c.strokeStyle='#f5c518';c.lineWidth=2.5;c.shadowColor='#f5c518';c.shadowBlur=8;c.stroke();c.shadowBlur=0;
  pts.forEach((p,i)=>{c.fillStyle='#07080a';c.strokeStyle='#f5c518';c.lineWidth=2;c.beginPath();c.arc(Xp(i),Y(p.y),4,0,7);c.fill();c.stroke()});
  c.fillStyle='#868c9a';c.textAlign='center';
  [0,pts.length-1].forEach(i=>c.fillText(pts[i].x.slice(5),Math.min(Math.max(Xp(i),L+12),Wd-R-12),H-6));
}
function drawCharts(){
  const cv=$('#cv');
  if(cv&&S.chartEx){
    const pts=S.logs.filter(l=>(l.sets[S.chartEx]||[]).some(s=>!s.drop)).map(l=>({x:l.date,y:Math.max(...l.sets[S.chartEx].filter(s=>!s.drop).map(s=>s.w))}));
    line(cv,pts);
  }
  const b=$('#cvb');if(b)line(b,S.bw.map(x=>({x:x.date,y:x.kg})));
}

/* ---------- RENDER ---------- */
const V={today:vToday,cal:vCal,plan:vPlan,progress:vProgress,fuel:vFuel,system:vSystem};
function render(){
  hud();
  document.querySelectorAll('#tabs button').forEach(b=>{const on=b.dataset.tab===S.tab;b.classList.toggle('on',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
  $('.sysbtn').classList.toggle('on',S.tab==='system');
  const v=$('#view');v.className='view';v.innerHTML=V[S.tab]();
  requestAnimationFrame(drawCharts);
}
const keepScroll=fn=>{const y=window.scrollY;fn();window.scrollTo(0,y)};

/* ---------- EVENTS ---------- */
document.addEventListener('click',e=>{
  if(e.target.closest('a'))return;
  if(e.target.id==='modal'){closeModal();return}
  const t=e.target.closest('button,label');if(!t)return;
  const ds=t.dataset;
  if(ds.obsplit){OB.split=ds.obsplit;renderOB();return}
  if(ds.obday!==undefined){const i=+ds.obday;OB.days=OB.days.includes(i)?OB.days.filter(x=>x!==i):[...OB.days,i].slice(-3);renderOB();return}
  if(ds.tab){S.tab=ds.tab;save();render();window.scrollTo(0,0);return}
  if(ds.start){
    if(S.draft&&!confirm('A session is in progress. Discard it and start '+W[ds.start].sub+'?'))return;
    startSession(ds.start);return}
  if(ds.warm!==undefined&&S.draft){const i=+ds.warm;S.draft.warm[i]=!S.draft.warm[i];save();keepScroll(render);return}
  if(ds.done){
    const [id,i]=ds.done.split(':'),s=S.draft.sets[id][+i],x=W[S.draft.key].ex.find(x=>x.id===id);
    if(!s.done){
      if(!(+s.r>0)){toast('ENTER REPS FIRST',true);return}
      if(s.drop&&s.w==='')s.w=String(dropW(id));
      s.done=true;slash();
      if(!s.drop&&weighted(id)&&+s.w>0){
        const prev=bestE1(id),v=e1rm(+s.w,+s.r);
        const others=S.draft.sets[id].filter(o=>o!==s&&o.done&&!o.drop&&+o.w>0).map(o=>e1rm(+o.w,+o.r));
        if(prev!==null&&v>prev+0.01&&(!others.length||v>Math.max(...others)+0.01))prfx(true,EX[id].n);
      }
      startRest(x.rest);
    }else s.done=false;
    save();keepScroll(render);return
  }
  if(ds.chart){S.chartEx=ds.chart;save();keepScroll(render);return}
  if(ds.del){if(confirm('Delete this session?')){S.logs.splice(+ds.del,1);save();keepScroll(render)}return}
  if(ds.flex){const [w,sp]=ds.flex.split(':');setWeekSplit(+w,sp);keepScroll(render);toast('WEEK '+w+' → '+sp+'-DAY SPLIT');return}
  if(ds.calmode){S.calMode=ds.calmode;save();render();return}
  if(ds.calnav){
    const n=+ds.calnav;
    if(S.calMode==='week')S.calW=addDays(S.calW||mondayOf(today()),7*n);
    else{const ym=S.calM||today().slice(0,7),d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1+n,1);S.calM=ymd(d).slice(0,7)}
    save();keepScroll(render);return
  }
  if(ds.day){S.calSel=ds.day;save();keepScroll(render);return}
  if(ds.fuel){
    const [k,v]=ds.fuel.split(':'),D=S.daily[today()]||(S.daily[today()]={water:0,steps:0,protein:0,kcal:0});
    D[k]=Math.max(0,+(D[k]+ +v).toFixed(2));save();keepScroll(render);return
  }
  switch(ds.act){
    case 'rest-add':restEnd+=15000;tickRest();break;
    case 'rest-skip':stopRest();break;
    case 'abort':if(confirm('Abort session? Progress is discarded.')){S.draft=null;stopRest();save();render()}break;
    case 'finish':finishSession();break;
    case 'close-modal':closeModal();break;
    case 'setup':openSetup(false);break;
    case 'ob-go':applySetup();break;
    case 'ob-cancel':OB=null;renderOB();break;
    case 'fuel-save':{
      const D=S.daily[today()]||(S.daily[today()]={water:0,steps:0,protein:0,kcal:0});
      const fs=$('#fs').value,p=+$('#fp').value,k=+$('#fk').value;
      if(fs!==''&&+fs>=0)D.steps=Math.round(+fs);
      if(p>0)D.protein+=p;if(k>0)D.kcal+=k;
      save();keepScroll(render);toast('LOGGED');break}
    case 'bw-save':{
      const v=parseFloat($('#bwi').value);if(!(v>20&&v<300)){toast('INVALID WEIGHT',true);break}
      const t0=today();S.bw=S.bw.filter(x=>x.date!==t0);S.bw.push({date:t0,kg:v});S.bw.sort((a,b)=>a.date<b.date?-1:1);save();keepScroll(render);toast('LOGGED');break}
    case 'export':{
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));
      a.download=`nightshift-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);break}
    case 'wipe':if(confirm('Erase ALL data? This cannot be undone.')){S=def();stopRest();save();render();openSetup(true)}break;
  }
});
document.addEventListener('input',e=>{
  const i=e.target;
  if(i.dataset.ex&&S.draft){S.draft.sets[i.dataset.ex][+i.dataset.i][i.dataset.f]=i.value;save();return}
  if(OB&&i.id==='obbw')OB.bw=i.value;
});
document.addEventListener('change',e=>{
  const i=e.target;
  if(OB&&i.id==='obstart'){OB.start=i.value;renderOB();return}
  if(i.id==='imp'&&i.files[0]){
    const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.logs))throw 0;S=clean(d,true);save();render();toast('IMPORTED')}catch(x){toast('BAD FILE',true)}};r.readAsText(i.files[0]);
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#modal').hidden)closeModal();else if(OB&&!OB.first){OB=null;renderOB()}}});
window.addEventListener('resize',()=>requestAnimationFrame(drawCharts));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!S.draft)render()});
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));

render();
if(!S.onboarded)openSetup(true);
})();
