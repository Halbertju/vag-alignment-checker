
let DB;
let state = {};
const $ = id => document.getElementById(id);
const norm = s => (s||'').toString().trim().toLowerCase();

const YEAR_CODES = {
  "1":2001,"2":2002,"3":2003,"4":2004,"5":2005,"6":2006,"7":2007,"8":2008,"9":2009,
  "A":2010,"B":2011,"C":2012,"D":2013,"E":2014,"F":2015,"G":2016,"H":2017,"J":2018,"K":2019,
  "L":2020,"M":2021,"N":2022,"P":2023,"R":2024,"S":2025,"T":2026
};
const WMI = {"WVW":"Volkswagen","WVG":"Volkswagen","WAU":"Audi","VSS":"SEAT","TMB":"Škoda"};

async function init(){
  DB = await fetch("vag-data.json").then(r=>r.json());
  renderHistory();
}

function genericDecode(vin){
  const out = {vin};
  out.brand = WMI[vin.slice(0,3)] || "";
  out.year = YEAR_CODES[vin[9]] || "";
  // Helpful model-family hints from VAG VIN type sections seen in common European VINs.
  const type = vin.slice(6,8);
  out.typeHint = type;
  const hints = {
    "5N":"Tiguan","3C":"Passat","AU":"Golf-family","4G":"A6 C7 / A7 family",
    "F2":"A6 C8 / A7 C8 family","8P":"A3 8P","5F":"Leon 5F","7P":"Touareg 7P"
  };
  out.modelHint = hints[type] || "";
  return out;
}

function analyzeVin(){
  const vin = $("vin").value.replace(/\s/g,"").toUpperCase();
  $("vin").value = vin;
  if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)){
    $("vinHelp").textContent = "VIN ska bestå av 17 tecken (I, O och Q används normalt inte).";
    return;
  }
  $("vinHelp").textContent = "";
  const known = DB.known_vins?.[vin];
  state = known ? {...known, vin, known:true} : {...genericDecode(vin), known:false};
  showIdentified();
  decideNext();
}

function showIdentified(){
  const lines = [];
  if(state.brand) lines.push(`<strong>${state.brand}</strong>`);
  if(state.model) lines.push(state.model);
  if(state.year) lines.push(`MY${state.year}`);
  const title = lines.length ? lines.join(" · ") : "VIN avläst";
  const more = [
    state.generation ? `Typ/generation: <strong>${state.generation}</strong>` : "",
    state.note ? state.note : "",
    !state.known && state.modelHint ? `VIN ger modellfamilj-ledtråd: <strong>${state.modelHint}</strong>` : ""
  ].filter(Boolean).join("<br>");
  $("identified").innerHTML = `<h2>${title}</h2><div class="muted">${more || "Jag behöver kompletterande information för exakt chassival."}</div>`;
  $("identified").classList.remove("hidden");
}

function decideNext(){
  const missing = [];
  if(!state.model) missing.push("model");
  if(!state.drive) missing.push("drive");

  // Model-specific useful questions
  const m = norm(state.model || state.modelHint);
  if(m.includes("a6") && !state.variant) missing.push("variant");
  if(m.includes("tiguan") && state.dcc === undefined) missing.push("dcc");
  if((m.includes("passat") || m.includes("golf")) && !state.variant) missing.push("variant");
  if(m.includes("golf") && !state.rearAxle) missing.push("rearAxle");

  // Known records can often proceed directly
  const matches = findMatches(state);
  if(matches.length && matches[0].score >= 8 && missing.filter(x=>x!=="rearAxle").length===0){
    $("questions").classList.add("hidden");
    renderResult(matches);
    return;
  }
  showQuestions([...new Set(missing)]);
}

function showQuestions(fields){
  const q = $("questionFields");
  q.innerHTML = "";
  if(!fields.length){
    q.innerHTML = `<div class="info">Jag kan inte säkert skilja mellan möjliga chassin från VIN alone. PR-lappen är bästa nästa steg.</div>`;
  }
  const add = (html)=>q.insertAdjacentHTML("beforeend",html);
  if(fields.includes("model")) add(`<label>Modell<select id="qModel"><option value="">Välj</option><option>Golf</option><option>Golf Variant</option><option>Passat</option><option>Tiguan</option><option>Touareg</option><option>A3</option><option>A4</option><option>A6</option><option>Octavia</option><option>Superb</option><option>Leon</option></select></label>`);
  if(fields.includes("drive")) add(`<label>Drivning<select id="qDrive"><option value="">Välj</option><option value="fwd">FWD</option><option value="awd">AWD / quattro / 4Motion</option></select></label>`);
  if(fields.includes("variant")) add(`<label>Variant / chassi<select id="qVariant"><option value="">Vet inte</option><option>standard</option><option>S line sport</option><option>sport</option><option>Alltrack</option><option>Allroad</option><option>TGI CNG</option><option>BlueMotion</option></select></label>`);
  if(fields.includes("rearAxle")) add(`<label>Bakaxel<select id="qRear"><option value="">Vet inte</option><option value="torsion">Torsion beam</option><option value="multilink">Multi-link</option></select></label>`);
  if(fields.includes("dcc")) add(`<label>Har bilen DCC / adaptiva dämpare?<select id="qDcc"><option value="">Vet inte</option><option value="no">Nej</option><option value="yes">Ja</option></select></label>`);
  $("questions").classList.remove("hidden");
}

function continueQuestions(){
  if($("qModel")?.value) state.model=$("qModel").value;
  if($("qDrive")?.value) state.drive=$("qDrive").value;
  if($("qVariant")?.value) state.variant=$("qVariant").value;
  if($("qRear")?.value) state.rearAxle=$("qRear").value;
  if($("qDcc")?.value) state.dcc=$("qDcc").value==="yes";
  $("questions").classList.add("hidden");
  const matches = findMatches(state);
  renderResult(matches);
}

function hasAny(text, words=[]){const t=norm(text);return words.some(w=>t.includes(norm(w)));}

function scoreRule(rule,s){
  let score=0;
  if(rule.brand){ if(norm(rule.brand)!==norm(s.brand)) return null; score+=4; }
  if(rule.model){
    const sm=norm(s.model||s.modelHint);
    if(!sm || !(sm.includes(norm(rule.model)) || norm(rule.model).includes(sm))) return null;
    score+=4;
  }
  if(s.year && rule.years){ if(rule.years.includes(Number(s.year))) score+=3; else return null; }
  if(s.generation && rule.generation && norm(rule.generation).includes(norm(s.generation))) score+=3;
  if(rule.variant_keywords?.length){
    if(hasAny(s.variant,rule.variant_keywords)) score+=3;
    else if(s.variant) score-=1;
  }
  if(rule.requires){
    for(const [k,v] of Object.entries(rule.requires)){
      if(k==="awd" && s.drive){ if((s.drive==="awd")===v) score+=3; else return null; }
      if(k==="rear_axle" && s.rearAxle){ if(s.rearAxle===v) score+=3; else return null; }
      if(k==="dcc" && s.dcc!==undefined){ if(s.dcc===v) score+=2; else if(v) return null; }
      if(k==="air_suspension" && s.air!==undefined){ if(s.air===v) score+=2; else if(v) return null; }
      if(k==="adaptive_damping" && s.adaptive!==undefined){ if(s.adaptive===v) score+=2; else if(v) return null; }
    }
  }
  const manual = norm(s.manualPr||"");
  const codes=[...(rule.g_codes||[]),...(rule.pr_codes||[])];
  if(manual && codes.some(c=>manual.includes(norm(c)))) score+=6;
  return {rule,score};
}

function findMatches(s){
  return DB.rules.map(r=>scoreRule(r,s)).filter(Boolean).sort((a,b)=>b.score-a.score);
}

function renderResult(matches){
  const box=$("result"); box.classList.remove("hidden");
  if(!matches.length || matches[0].score<5){
    box.innerHTML=`<div class="result-head"><h2>Resultat</h2><span class="badge low">Kontroll krävs</span></div>
    <p>Jag kan inte välja en tillräckligt säker PR/G-grupp ännu.</p>
    <div class="info"><strong>Nästa steg:</strong> använd PR-lappen. Det är bättre än att gissa.</div>`;
    $("prPanel").classList.remove("hidden");
    return;
  }
  const best=matches[0].rule;
  const codes=[...(best.g_codes||[]),...(best.pr_codes||[])].join(" / ")||"Ej specificerat";
  const conf=best.confidence==="high"?"high":best.confidence==="medium"?"medium":"low";
  const confText=best.confidence==="high"?"Hög":best.confidence==="medium"?"Medel":"Kontroll krävs";
  const a=best.alignment;
  let ambiguity="";
  if(matches[1] && matches[1].score>=matches[0].score-1){
    const r=matches[1].rule;
    ambiguity=`<div class="warning"><strong>Flera möjliga chassin.</strong> Alternativ: ${(r.g_codes||r.pr_codes||[]).join(" / ")} – ${r.chassis||""}. Kontrollera PR-lapp om du inte kan skilja dem på bilen.</div>`;
  }
  box.innerHTML=`
    <div class="result-head"><h2>Föreslaget val</h2><span class="badge ${conf}">${confText}</span></div>
    <div class="kv">
      <div>Bil</div><div>${best.brand} ${best.model} ${best.generation||""}${state.year?` · MY${state.year}`:""}</div>
      <div>G-/PR-grupp</div><div><strong>${codes}</strong></div>
      <div>Chassityp</div><div>${best.chassis||"-"}</div>
      <div>Launch</div><div><strong>${best.launch_hint||"-"}</strong></div>
    </div>
    ${a?`<table><thead><tr><th></th><th>Total toe</th><th>Camber</th></tr></thead>
      <tbody><tr><td>Fram</td><td>${a.front_toe||"-"}</td><td>${a.front_camber||"-"}</td></tr>
      <tr><td>Bak</td><td>${a.rear_toe||"-"}</td><td>${a.rear_camber||"-"}</td></tr></tbody></table>`:
      `<div class="info">Alignmentvärden är ännu inte inlagda för denna regel. Använd PR/G-gruppen i Haynes/OE.</div>`}
    ${best.warning?`<div class="warning"><strong>Databasvarning:</strong> ${best.warning}</div>`:""}
    ${ambiguity}
    <div class="small" style="margin-top:12px">Om bilen har annan fjädring än antaget: kontrollera PR-lappen före hjulinställning.</div>`;
  saveHistory(best);
}

function saveHistory(rule){
  const arr=JSON.parse(localStorage.getItem("vagHistory")||"[]");
  arr.unshift({at:new Date().toISOString(),vin:state.vin,brand:state.brand,model:state.model||state.modelHint,year:state.year,launch:rule.launch_hint});
  localStorage.setItem("vagHistory",JSON.stringify(arr.slice(0,20))); renderHistory();
}
function renderHistory(){
  const arr=JSON.parse(localStorage.getItem("vagHistory")||"[]");
  $("history").innerHTML=arr.length?arr.map(x=>`<div class="history-item"><strong>${x.vin}</strong> — ${x.brand||""} ${x.model||""} ${x.year||""}<div class="small">${x.launch||""}</div></div>`).join(""):`<div class="small">Inga fordon ännu.</div>`;
}

$("analyzeVin").addEventListener("click",analyzeVin);
$("vin").addEventListener("keydown",e=>{if(e.key==="Enter")analyzeVin();});
$("continueBtn").addEventListener("click",continueQuestions);
$("showPrBtn").addEventListener("click",()=>$("prPanel").classList.remove("hidden"));
$("applyPr").addEventListener("click",()=>{
  state.manualPr=$("manualPr").value;
  $("questions").classList.add("hidden");
  renderResult(findMatches(state));
});
$("photo").addEventListener("change",e=>{
  const f=e.target.files?.[0]; if(!f)return;
  $("preview").src=URL.createObjectURL(f); $("preview").classList.remove("hidden");
});
$("clearHistory").addEventListener("click",()=>{localStorage.removeItem("vagHistory");renderHistory();});
init();
