/* NIGHTSHIFT // Pure Body Protocol — workout tracker. All data stays in localStorage. */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const KEY='nightshift.v1';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>ymd(new Date());
const dayDiff=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5);
const fmt=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (h?h+':':'')+pad(m)+':'+pad(s%60)};

/* ---------- PLAN DATA (from the blueprint) ---------- */
// type: bb barbell | db dumbbell(per DB) | cb cable/machine | bw bodyweight | hold seconds
const EX={
 squat:{n:'Barbell Back Squat',t:'bb',tg:['40–50 kg','60–70 kg','80+ kg'],s:45},
 incl:{n:'Incline DB Press (30°)',t:'db',tg:['12–14 kg/DB','18–20 kg/DB','24+ kg/DB'],s:12},
 pull:{n:'Cable Lat Pulldown',t:'cb',tg:['35–40 kg','50–55 kg','65+ kg'],s:35,drop:1},
 lat:{n:'DB Side Lateral Raise',t:'db',tg:['5–7 kg/DB','8–10 kg/DB','12 kg/DB'],s:5,drop:1},
 knee:{n:'Hanging Knee Raise',t:'bw'},
 rdl:{n:'Romanian Deadlift',t:'bb',tg:['40–50 kg','60–70 kg','80+ kg'],s:40},
 ohp:{n:'Seated DB Shoulder Press',t:'db',tg:['10–12 kg/DB','16–18 kg/DB','20+ kg/DB'],s:10},
 row:{n:'Seated Cable Row',t:'cb'},
 press:{n:'Machine Leg Press',t:'cb'},
 dead:{n:'Deadbug / Hollow Hold',t:'hold'},
 bench:{n:'Flat DB Bench Press',t:'db',tg:['14–16 kg/DB','20–22 kg/DB','26+ kg/DB'],s:14},
 squat2:{n:'Back Squat / Leg Press',t:'bb'},
 dbrow:{n:'Single-Arm DB Row (per side)',t:'db'},
 fly:{n:'Incline DB Flyes',t:'db',drop:1},
 plank:{n:'Plank with Knee Tucks',t:'bw'},
 ext:{n:'Leg Extensions',t:'cb'},
 calf:{n:'Calf Raises',t:'cb'},
 curl:{n:'DB Bicep Curls',t:'db'},
 tri:{n:'Triceps Rope Pushdown',t:'cb'},
 legcurl:{n:'Lying / Seated Leg Curl',t:'cb'},
 lunge:{n:'Walking DB Lunges (per leg)',t:'db'},
 plank2:{n:'Plank',t:'hold'},
 dead2:{n:'Deadbugs / Hollow Hold',t:'hold'}
};
// [id, sets, repLo, repHi, restSec]
const W={
 A:{name:'LEG & CHEST',sub:'Workout A',split:'3',ex:[['squat',3,8,10,90],['incl',3,8,10,90],['pull',3,10,12,60],['lat',3,12,15,45],['knee',3,12,15,60]]},
 B:{name:'POSTERIOR & SHOULDER',sub:'Workout B',split:'3',ex:[['rdl',3,8,10,90],['ohp',3,8,10,90],['row',3,10,12,60],['press',3,10,12,60],['dead',3,45,60,45]]},
 C:{name:'CHEST DENSITY & LAT WIDTH',sub:'Workout C',split:'3',ex:[['bench',3,8,10,90],['squat2',3,10,12,90],['dbrow',3,10,12,60],['fly',3,12,15,60],['plank',3,12,15,45]]},
 U1:{name:'UPPER A — CHEST & BACK',sub:'Upper A',split:'4',ex:[['incl',3,8,10,90],['pull',3,10,12,60],['bench',3,10,12,90],['row',3,10,12,60],['lat',4,12,15,45]]},
 L1:{name:'LOWER A — QUADS & LOWER ABS',sub:'Lower A',split:'4',ex:[['squat',3,8,10,90],['press',3,10,12,60],['ext',3,12,15,60],['knee',4,12,15,60],['calf',3,15,15,45]]},
 U2:{name:'UPPER B — SHOULDERS & ARMS',sub:'Upper B',split:'4',ex:[['ohp',3,8,10,90],['dbrow',3,10,12,60],['fly',3,12,15,60],['curl',3,10,12,60],['tri',3,10,12,60]]},
 L2:{name:'LOWER B — HAMSTRINGS & CORE',sub:'Lower B',split:'4',ex:[['rdl',3,8,10,90],['legcurl',3,10,12,60],['lunge',3,10,10,60],['dead2',3,60,60,45],['plank2',3,60,60,45]]}
};
const ROT={'3':['A','B','C'],'4':['U1','L1','U2','L2']};
const WARM=[['Light cardio','2 min'],['Arm circles & hugs','10 fwd / 10 back'],['Pass-throughs (band / bodyweight)','10 reps'],['Bodyweight air squats','12 reps'],["World's greatest stretch",'3 per side']];
const PHASES=[
 {k:1,n:'NEUROMUSCULAR REACTIVATION',w:'WEEKS 1–2',rpe:'RPE 7–8',tip:'Control the movement. Slow 3-second negatives. Leave 2 reps in the tank.'},
 {k:2,n:'LINEAR HYPERTROPHY OVERLOAD',w:'WEEKS 3–5',rpe:'RPE 8.5–9',tip:'Double progression, aggressive. Push sets close to technical failure.'},
 {k:3,n:'AESTHETIC PEAK',w:'WEEKS 6–8',rpe:'RPE 9',tip:'Final set of lateral raises, pulldowns and incline flies: drop set. Cut weight 30% at failure, grind 6–8 more reps.'}
];
const FUEL={kcal:[2000,2150],protein:150,pmin:140,water:3.75,steps:9000,smin:8000};

/* ---------- STATE ---------- */
const def=()=>({start:today(),split:'3',logs:[],bw:[],daily:{},draft:null,tab:'today',chartEx:null});
let S=(()=>{try{return Object.assign(def(),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return def()}})();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};

/* ---------- LOGIC ---------- */
const week=()=>Math.floor(dayDiff(S.start,today())/7)+1;
const phase=()=>{const w=week();return w<=0?null:w<=2?PHASES[0]:w<=5?PHASES[1]:w<=8?PHASES[2]:null};
const wbefore=()=>S.logs.filter(l=>W[l.key]&&W[l.key].split===S.split).length;
const nextKey=()=>ROT[S.split][wbefore()%ROT[S.split].length];
const inc=t=>t==='db'?2:2.5;
function lastSets(id,before){
  for(let i=S.logs.length-1;i>=0;i--){const l=S.logs[i];if(l.sets&&l.sets[id]&&l.sets[id].length)return l.sets[id];}
  return null;
}
function suggest(id,lo,hi){
  const e=EX[id],last=lastSets(id);
  if(e.t==='bw'||e.t==='hold')return '';
  if(last){
    const top=Math.max(...last.map(s=>+s.w||0));
    const hit=last.length>=3&&last.every(s=>(+s.r||0)>=hi&&(+s.w||0)>=top);
    return hit?top+inc(e.t):top;
  }
  return e.s||'';
}
const targetIdx=()=>{const w=week();return w<=2?0:w<=5?1:2};
const e1rm=(w,r)=>w*(1+r/30);

function startSession(key){
  const sets={};
  W[key].ex.forEach(([id,n,lo])=>{const sg=suggest(id,lo,0);sets[id]=Array.from({length:n},()=>({w:sg===''?'':String(sg),r:'',done:false}))});
  S.draft={key,t0:Date.now(),warm:WARM.map(()=>false),sets};
  save();render();window.scrollTo({top:0,behavior:'smooth'});
}
function finishSession(){
  const d=S.draft;if(!d)return;
  const out={},prs=[];
  W[d.key].ex.forEach(([id])=>{
    const done=d.sets[id].filter(s=>s.done&&(+s.r>0)).map(s=>({w:+s.w||0,r:+s.r}));
    if(!done.length)return;
    out[id]=done;
    const e=EX[id];
    if(e.t==='bb'||e.t==='db'||e.t==='cb'){
      const prev=S.logs.flatMap(l=>(l.sets&&l.sets[id])||[]).map(s=>e1rm(s.w,s.r));
      const now=Math.max(...done.map(s=>e1rm(s.w,s.r)));
      if(prev.length&&now>Math.max(...prev)+0.01)prs.push(e.n);
    }
  });
  if(!Object.keys(out).length){toast('LOG AT LEAST ONE SET');return}
  S.logs.push({date:today(),key:d.key,dur:Math.round((Date.now()-d.t0)/1000),sets:out});
  S.draft=null;stopRest();save();
  S.tab='progress';render();
  toast(prs.length?'NEW PR — '+prs[0].toUpperCase():'SESSION LOGGED');
}
const streakWeeks=()=>{ // consecutive weeks (Mon-start) with >=3 sessions (or >=1 current week counted if in progress)
  const wk=d=>{const x=new Date(d+'T00:00:00');const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return ymd(x)};
  const c={};S.logs.forEach(l=>{const k=wk(l.date);c[k]=(c[k]||0)+1});
  let n=0,cur=new Date(wk(today())+'T00:00:00');
  if((c[ymd(cur)]||0)<3)cur.setDate(cur.getDate()-7);
  while((c[ymd(cur)]||0)>=3){n++;cur.setDate(cur.getDate()-7)}
  return n;
};
const weekVol=()=>{
  const x=new Date();const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);const from=ymd(x);
  let v=0;S.logs.filter(l=>l.date>=from).forEach(l=>Object.values(l.sets).forEach(a=>a.forEach(s=>v+=(s.w||0)*s.r)));return Math.round(v);
};

/* ---------- REST TIMER / AUDIO ---------- */
let restEnd=0,restTimer=null,actx=null;
function beep(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=880;g.gain.value=.15;o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.25);navigator.vibrate&&navigator.vibrate([120,60,120])}catch(e){}}
function startRest(sec){restEnd=Date.now()+sec*1000;$('#rest').hidden=false;tickRest()}
function stopRest(){restEnd=0;$('#rest').hidden=true}
function tickRest(){
  if(!restEnd)return;
  const left=Math.ceil((restEnd-Date.now())/1000),r=$('#rest');
  if(left<=0){beep();stopRest();return}
  $('#restT').textContent=fmt(left);r.classList.toggle('low',left<=5);
}
setInterval(()=>{tickRest();const t=$('#sessT');if(t&&S.draft)t.textContent=fmt((Date.now()-S.draft.t0)/1000)},500);

/* ---------- UI HELPERS ---------- */
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)}
const repLabel=id=>EX[id].t==='hold'?'SEC':'REPS';
const wLabel=id=>({bb:'KG',db:'KG / DB',cb:'KG',bw:'+KG',hold:'+KG'})[EX[id].t];

/* ---------- VIEWS ---------- */
function hud(){
  const w=week(),p=phase();
  $('#hud').innerHTML=`<div>WEEK<b>${w<1?'—':w>8?'8+':w}</b></div><div>SESSIONS<b>${S.logs.length}</b></div><div>STREAK<b>${streakWeeks()}W</b></div>`;
}
function vToday(){
  const w=week(),p=phase(),d=S.draft;
  let h='';
  const pct=Math.min(100,Math.max(0,(dayDiff(S.start,today())/56)*100));
  h+=`<div class="kick">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}</div>`;
  if(!d){
    h+=`<h2>${w<1?'PROTOCOL BEGINS '+S.start:'THE WORK DOESN\'T WAIT'}</h2>`;
    h+=`<div class="card"><div class="phase"><div><div class="kick">${p?p.w+' · '+p.rpe:'EIGHT WEEKS COMPLETE'}</div><h3>${p?p.n:'MAINTAIN & ESCALATE'}</h3></div><span class="pill">${w<1?'PRE':w>8?'WK '+w:'WK '+w+'/8'}</span></div>
      <p class="mute" style="margin-top:6px">${p?p.tip:'Protocol finished. Keep double progression running and bump targets, or reset the start date in SYSTEM for a new cycle.'}</p>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`;
    const nk=nextKey();
    h+=`<div class="kick" style="margin-top:18px">SELECT SESSION · ${S.split}-DAY SPLIT</div><div class="pick">`;
    ROT[S.split].forEach(k=>{h+=`<button data-start="${k}" class="${k===nk?'next':''}"><div><small>${W[k].sub.toUpperCase()}${k===nk?' · UP NEXT':''}</small><b>${W[k].name}</b></div><span class="go">ENGAGE ▸</span></button>`});
    h+=`</div><div class="hazard"></div>`;
    h+=`<div class="card flat"><h3>WARM-UP · 5 MIN</h3>${WARM.map(x=>`<div class="chk" style="cursor:default"><span>${x[0]}</span><small>${x[1]}</small></div>`).join('')}
      <p class="note" style="margin-top:8px">First compound lift: 2 ramp sets — <b>50% × 8</b>, then <b>75% × 4</b> — before working sets.</p></div>`;
    const last=S.logs[S.logs.length-1];
    if(last)h+=`<div class="card flat"><div class="kick">LAST SESSION</div><div class="row" style="justify-content:space-between"><b style="font-family:var(--disp);font-size:24px;letter-spacing:.08em;font-weight:400">${W[last.key].name}</b><span class="mono mute">${last.date} · ${fmt(last.dur)}</span></div></div>`;
    return h;
  }
  const wk=W[d.key];
  h+=`<h2>${wk.name}</h2>`;
  h+=`<div class="sess"><div><div class="kick">SESSION CLOCK</div><div class="timer" id="sessT">${fmt((Date.now()-d.t0)/1000)}</div></div><div class="row"><button class="btn ghost sm" data-act="abort">ABORT</button><button class="btn sm" data-act="finish">COMPLETE</button></div></div>`;
  h+=`<div class="card flat"><h3>WARM-UP · ${d.warm.filter(Boolean).length}/5</h3>${WARM.map((x,i)=>`<div class="chk ${d.warm[i]?'on':''}" data-warm="${i}"><div class="box"></div><span>${x[0]}</span><small>${x[1]}</small></div>`).join('')}</div>`;
  const ti=targetIdx();
  wk.ex.forEach(([id,n,lo,hi,rest],xi)=>{
    const e=EX[id],last=lastSets(id);
    const tg=e.tg&&w>=1?`WK${ti===0?1:ti===1?4:8} TARGET · ${e.tg[ti]}`:'';
    h+=`<div class="card"><div class="ex-h"><h3>${xi+1}. ${e.n.toUpperCase()}</h3><span class="mono mute" style="font-size:12px">${n}×${lo===hi?lo:lo+'–'+hi}${e.t==='hold'?'s':''} · ${rest}s</span></div>`;
    if(tg)h+=`<div class="tgt">${tg}</div>`;
    if(xi===0&&['squat','bench','rdl','incl','ohp','squat2'].includes(id))h+=`<div class="note"><b>RAMP:</b> 2 warm-up sets first — 50% × 8, 75% × 4.</div>`;
    if(e.drop&&phase()&&phase().k===3)h+=`<div class="note"><b>DROP SET:</b> final set — at failure cut weight 30%, push 6–8 more reps.</div>`;
    h+=`<div class="sets"><span class="hd">#</span><span class="hd">${wLabel(id)}</span><span class="hd">${repLabel(id)}</span><span class="hd">DONE</span>`;
    d.sets[id].forEach((s,i)=>{
      const pv=last&&last[i];
      h+=`<span class="n">${i+1}</span><input inputmode="decimal" data-ex="${id}" data-i="${i}" data-f="w" value="${s.w}" placeholder="${e.t==='bw'||e.t==='hold'?'0':'kg'}"><input inputmode="numeric" data-ex="${id}" data-i="${i}" data-f="r" value="${s.r}" placeholder="${lo===hi?lo:lo+'–'+hi}"><button class="done ${s.done?'on':''}" data-done="${id}:${i}:${rest}">${s.done?'✓':'SET'}</button>`;
      if(pv)h+=`<span class="prev">LAST: ${pv.w?pv.w+' kg × ':''}${pv.r}</span>`;
    });
    h+=`</div></div>`;
  });
  h+=`<button class="btn block" data-act="finish">COMPLETE SESSION</button>`;
  return h;
}
function vPlan(){
  let h=`<h2>THE PROTOCOL</h2><p class="mute">V-taper. Upper chest and delts for the shirt, lats to shrink the waist, legs for balance, lower abs for a flat midsection.</p><div class="hazard"></div>`;
  h+=`<h3>PHASES</h3>`+PHASES.map(p=>`<div class="card ${p.k===3?'red':''}"><div class="phase"><h3 style="color:var(--ink)">${p.n}</h3><span class="pill">${p.w}</span></div><div class="mono mute" style="font-size:12px;margin:4px 0">${p.rpe}</div><p>${p.tip}</p></div>`).join('');
  h+=`<h3 style="margin-top:20px">SESSIONS</h3>`;
  [['3','3-DAY FULL BODY · MON / WED / FRI'],['4','4-DAY UPPER / LOWER · MON TUE THU FRI']].forEach(([sp,t])=>{
    h+=`<div class="kick" style="margin-top:12px">${t}</div>`;
    Object.entries(W).filter(([k,v])=>v.split===sp).forEach(([k,v])=>{
      h+=`<div class="card flat"><h3>${v.name}</h3><table>${v.ex.map(x=>`<tr><td>${EX[x[0]].n}</td><td class="n">${x[1]}×${x[2]===x[3]?x[2]:x[2]+'–'+x[3]}</td><td class="n">${x[4]}s</td></tr>`).join('')}</table></div>`;
    });
  });
  h+=`<h3 style="margin-top:20px">WEIGHT TARGETS</h3><div class="card flat"><table><tr><th>LIFT</th><th>WK1</th><th>WK4</th><th>WK8</th></tr>${Object.values(EX).filter(e=>e.tg).map(e=>`<tr><td>${e.n}</td>${e.tg.map(x=>`<td class="n">${x}</td>`).join('')}</tr>`).join('')}</table></div>`;
  h+=`<div class="card"><h3>DOUBLE PROGRESSION</h3><p>1. Pick a weight you own for 8 strict reps.<br>2. Hold it until you hit 3×10 clean.<br>3. Add 2.5–5 kg (or next dumbbell), drop back to 8.</p><p class="mute" style="margin-top:6px">The tracker auto-suggests the next load when every set hits the top of the rep range.</p></div>`;
  return h;
}
function vProgress(){
  let h=`<h2>THE RECORD</h2>`;
  h+=`<div class="stats"><div class="stat"><b>${S.logs.length}</b><span>SESSIONS</span></div><div class="stat"><b>${streakWeeks()}W</b><span>3+ SESSIONS / WEEK STREAK</span></div><div class="stat"><b>${weekVol().toLocaleString()}</b><span>KG VOLUME THIS WEEK</span></div><div class="stat"><b>${S.bw.length?S.bw[S.bw.length-1].kg:'—'}</b><span>BODYWEIGHT KG</span></div></div>`;
  const ids=[...new Set(S.logs.flatMap(l=>Object.keys(l.sets)))].filter(id=>EX[id].t!=='hold'&&EX[id].t!=='bw');
  if(!ids.length)h+=`<div class="card flat" style="margin-top:14px"><p class="mute">No data. Complete a session and your strength curve shows up here.</p></div>`;
  else{
    if(!ids.includes(S.chartEx))S.chartEx=ids[0];
    h+=`<div class="kick" style="margin-top:18px">TOP SET LOAD OVER TIME</div><div class="tabsel">${ids.map(id=>`<button class="chip ${id===S.chartEx?'on':''}" data-chart="${id}">${EX[id].n.toUpperCase()}</button>`).join('')}</div><canvas id="cv"></canvas>`;
    const all=S.logs.flatMap(l=>(l.sets[S.chartEx]||[]));
    if(all.length){const best=all.reduce((a,b)=>e1rm(b.w,b.r)>e1rm(a.w,a.r)?b:a);h+=`<p class="mono mute" style="font-size:12px;margin-top:6px">BEST SET: ${best.w} kg × ${best.r} · EST 1RM ${e1rm(best.w,best.r).toFixed(1)} kg</p>`}
  }
  if(S.bw.length>1)h+=`<div class="kick" style="margin-top:18px">BODYWEIGHT</div><canvas id="cvb"></canvas>`;
  h+=`<div class="hazard"></div><h3>HISTORY</h3>`;
  if(!S.logs.length)h+=`<p class="mute">Empty.</p>`;
  [...S.logs].reverse().slice(0,30).forEach((l,ri)=>{
    const idx=S.logs.length-1-ri;
    h+=`<div class="card flat"><div class="row" style="justify-content:space-between"><b style="font-family:var(--disp);font-size:22px;letter-spacing:.08em;font-weight:400">${W[l.key].name}</b><span class="mono mute" style="font-size:12px">${l.date} · ${fmt(l.dur)}</span></div>
    <div class="mono mute" style="font-size:12px;margin-top:6px;line-height:1.7">${Object.entries(l.sets).map(([id,a])=>EX[id].n+': '+a.map(s=>(s.w?s.w+'×':'')+s.r).join(' / ')).join('<br>')}</div>
    <button class="chip" style="margin-top:8px" data-del="${idx}">DELETE</button></div>`;
  });
  return h;
}
function vFuel(){
  const t=today(),D=S.daily[t]||{water:0,steps:0,protein:0,kcal:0};
  const bar=(l,v,max,u,min,red)=>`<div class="card flat"><div class="row" style="justify-content:space-between"><span class="kick">${l}</span><span class="mono" style="color:var(--amber)">${v}${u} <span class="mute">/ ${max}${u}</span></span></div><div class="bar ${red?'red':''}"><i style="width:${Math.min(100,v/max*100)}%"></i></div></div>`;
  let h=`<h2>FUEL</h2><p class="mute">Deficit enough to strip the midsection, protein enough to keep the upper body full.</p>`;
  h+=bar('WATER',D.water.toFixed?+D.water.toFixed(2):D.water,FUEL.water,' L');
  h+=`<div class="row" style="margin:-4px 0 10px"><button class="btn ghost sm" data-fuel="water:0.25">+250 ML</button><button class="btn ghost sm" data-fuel="water:0.5">+500 ML</button><button class="btn ghost sm" data-fuel="water:-0.25">−</button></div>`;
  h+=bar('STEPS',D.steps,FUEL.steps,'');
  h+=bar('PROTEIN',D.protein,FUEL.protein,' g');
  h+=bar('CALORIES',D.kcal,FUEL.kcal[1],' kcal',0,D.kcal>FUEL.kcal[1]);
  h+=`<div class="grid2"><div class="field"><label>STEPS TODAY</label><input inputmode="numeric" id="fs" value="${D.steps||''}"></div><div class="field"><label>PROTEIN G (ADD)</label><input inputmode="numeric" id="fp" placeholder="+g"></div><div class="field"><label>KCAL (ADD)</label><input inputmode="numeric" id="fk" placeholder="+kcal"></div><div class="field"><label>&nbsp;</label><button class="btn" data-act="fuel-save">LOG</button></div></div>`;
  h+=`<div class="hazard"></div><h3>BODYWEIGHT</h3><div class="row"><div class="field" style="flex:1;margin:0"><input inputmode="decimal" id="bwi" placeholder="kg · start was 78"></div><button class="btn" data-act="bw-save">LOG</button></div>`;
  if(S.bw.length){const f=S.bw[0].kg,l=S.bw[S.bw.length-1].kg;h+=`<p class="mono mute" style="margin-top:8px;font-size:12px">FIRST ${f} → NOW ${l} · Δ ${(l-f>0?'+':'')+(l-f).toFixed(1)} KG</p>`}
  h+=`<div class="card flat" style="margin-top:14px"><div class="kick">DAILY TARGETS</div><p>${FUEL.kcal[0]}–${FUEL.kcal[1]} kcal · ${FUEL.pmin}–${FUEL.protein+10} g protein · 3.5–4 L water · ${FUEL.smin.toLocaleString()}–10,000 steps</p></div>`;
  return h;
}
function vSystem(){
  return `<h2>SYSTEM</h2>
  <div class="card flat"><div class="field"><label>PROTOCOL START DATE</label><input type="date" id="sd" value="${S.start}"></div>
  <div class="field"><label>ACTIVE SPLIT</label><select id="sp"><option value="3" ${S.split==='3'?'selected':''}>3-day full body (A / B / C)</option><option value="4" ${S.split==='4'?'selected':''}>4-day upper / lower</option></select></div></div>
  <div class="card flat"><h3>DATA</h3><p class="mute">Everything lives in this browser only. Export a backup before clearing site data or switching devices.</p><div class="row" style="margin-top:10px"><button class="btn sm" data-act="export">EXPORT</button><label class="btn ghost sm" style="cursor:pointer">IMPORT<input type="file" id="imp" accept="application/json" hidden></label></div></div>
  <div class="card red"><h3 style="color:var(--blood)">WIPE EVERYTHING</h3><button class="btn red sm" data-act="wipe" style="margin-top:8px">ERASE ALL DATA</button></div>
  <p class="mono mute" style="font-size:11px;text-align:center;margin-top:20px">NIGHTSHIFT · NO GADGETS. NO SHORTCUTS. ONLY THE BODY.</p>`;
}

/* ---------- CHARTS ---------- */
function line(cv,pts,unit){
  const dpr=window.devicePixelRatio||1,W_=cv.clientWidth,H=cv.clientHeight;cv.width=W_*dpr;cv.height=H*dpr;
  const c=cv.getContext('2d');c.scale(dpr,dpr);
  if(!pts.length)return;
  const ys=pts.map(p=>p.y);let lo=Math.min(...ys),hi=Math.max(...ys);if(lo===hi){lo-=1;hi+=1}const pr=(hi-lo)*.15;lo-=pr;hi+=pr;
  const L=40,R=14,T=14,B=24,X=i=>pts.length===1?(L+(W_-L-R)/2):L+i*(W_-L-R)/(pts.length-1),Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  c.strokeStyle='#262b35';c.fillStyle='#7b8190';c.font='10px JetBrains Mono,monospace';c.lineWidth=1;
  for(let i=0;i<=3;i++){const v=lo+(hi-lo)*i/3,y=Y(v);c.beginPath();c.moveTo(L,y);c.lineTo(W_-R,y);c.stroke();c.fillText(v.toFixed(1),2,y+3)}
  const g=c.createLinearGradient(0,T,0,H-B);g.addColorStop(0,'rgba(245,197,24,.28)');g.addColorStop(1,'rgba(245,197,24,0)');
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(i),Y(p.y)):c.moveTo(X(i),Y(p.y)));
  c.lineTo(X(pts.length-1),H-B);c.lineTo(X(0),H-B);c.closePath();c.fillStyle=g;c.fill();
  c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(i),Y(p.y)):c.moveTo(X(i),Y(p.y)));
  c.strokeStyle='#f5c518';c.lineWidth=2.5;c.shadowColor='#f5c518';c.shadowBlur=8;c.stroke();c.shadowBlur=0;
  pts.forEach((p,i)=>{c.fillStyle='#07080a';c.strokeStyle='#f5c518';c.lineWidth=2;c.beginPath();c.arc(X(i),Y(p.y),4,0,7);c.fill();c.stroke()});
  c.fillStyle='#7b8190';c.textAlign='center';
  [0,pts.length-1].forEach(i=>c.fillText(pts[i].x.slice(5),Math.min(Math.max(X(i),L+12),W_-R-12),H-6));
}
function drawCharts(){
  const cv=$('#cv');
  if(cv&&S.chartEx){
    const pts=S.logs.filter(l=>l.sets[S.chartEx]).map(l=>({x:l.date,y:Math.max(...l.sets[S.chartEx].map(s=>s.w))}));
    line(cv,pts);
  }
  const b=$('#cvb');if(b)line(b,S.bw.map(x=>({x:x.date,y:x.kg})));
}

/* ---------- RENDER ---------- */
const V={today:vToday,plan:vPlan,progress:vProgress,fuel:vFuel,system:vSystem};
function render(){
  hud();
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.tab));
  const v=$('#view');v.className='view';v.innerHTML=V[S.tab]();
  requestAnimationFrame(drawCharts);
}

/* ---------- EVENTS ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button,.chk,label');if(!t)return;
  if(t.dataset.tab){S.tab=t.dataset.tab;save();render();window.scrollTo(0,0);return}
  if(t.dataset.start){startSession(t.dataset.start);return}
  if(t.dataset.warm!==undefined&&S.draft){const i=+t.dataset.warm;S.draft.warm[i]=!S.draft.warm[i];save();render();return}
  if(t.dataset.done){
    const [id,i,rest]=t.dataset.done.split(':'),s=S.draft.sets[id][+i];
    if(!s.done&&!(+s.r>0)){toast('ENTER REPS FIRST');return}
    s.done=!s.done;save();
    if(s.done)startRest(+rest);
    const y=window.scrollY;render();window.scrollTo(0,y);return
  }
  if(t.dataset.chart){S.chartEx=t.dataset.chart;save();render();return}
  if(t.dataset.del){if(confirm('Delete this session?')){S.logs.splice(+t.dataset.del,1);save();render()}return}
  if(t.dataset.fuel){
    const [k,v]=t.dataset.fuel.split(':'),D=S.daily[today()]||(S.daily[today()]={water:0,steps:0,protein:0,kcal:0});
    D[k]=Math.max(0,+(D[k]+ +v).toFixed(2));save();render();return
  }
  switch(t.dataset.act){
    case 'rest-add':restEnd+=15000;tickRest();break;
    case 'rest-skip':stopRest();break;
    case 'abort':if(confirm('Abort session? Progress is discarded.')){S.draft=null;stopRest();save();render()}break;
    case 'finish':finishSession();break;
    case 'fuel-save':{
      const D=S.daily[today()]||(S.daily[today()]={water:0,steps:0,protein:0,kcal:0});
      const st=+$('#fs').value,p=+$('#fp').value,k=+$('#fk').value;
      if(!isNaN(st)&&$('#fs').value!=='')D.steps=st;
      if(p>0)D.protein+=p;if(k>0)D.kcal+=k;
      save();render();toast('LOGGED');break}
    case 'bw-save':{
      const v=parseFloat($('#bwi').value);if(!(v>20&&v<300)){toast('INVALID WEIGHT');break}
      const t0=today();S.bw=S.bw.filter(x=>x.date!==t0);S.bw.push({date:t0,kg:v});S.bw.sort((a,b)=>a.date<b.date?-1:1);save();render();toast('LOGGED');break}
    case 'export':{
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));
      a.download=`nightshift-backup-${today()}.json`;a.click();break}
    case 'wipe':if(confirm('Erase ALL data? This cannot be undone.')){S=def();save();render()}break;
  }
});
document.addEventListener('input',e=>{
  const i=e.target;
  if(i.dataset.ex&&S.draft){S.draft.sets[i.dataset.ex][+i.dataset.i][i.dataset.f]=i.value;save()}
});
document.addEventListener('change',e=>{
  const i=e.target;
  if(i.id==='sd'&&i.value){S.start=i.value;save();render()}
  if(i.id==='sp'){S.split=i.value;save();render()}
  if(i.id==='imp'&&i.files[0]){
    const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.logs))throw 0;S=Object.assign(def(),d);save();render();toast('IMPORTED')}catch(x){toast('BAD FILE')}};r.readAsText(i.files[0]);
  }
});
window.addEventListener('resize',()=>requestAnimationFrame(drawCharts));
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){/* offline support intentionally omitted: keep deploy simple */}
render();
})();
