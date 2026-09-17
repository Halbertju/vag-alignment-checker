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
  out.yearSource = out.year ? "VIN-kod (reservmetod)" : "";
  const type = vin.slice(6,8);
  out.typeHint = type;
  const hints = {
    "5N":{model:"Tiguan", generation:"5N"},
    "3C":{model:"Passat", generation:"3C"},
    "AU":{model:"Golf", generation:"VII / MQB"},
    "4G":{model:"A6", generation:"C7 / 4G"},
    "F2":{model:"A6", generation:"C8 / F2"},
    "8P":{model:"A3", generation:"8P"},
    "5F":{model:"Leon", generation:"5F"},
    "7P":{model:"Touareg", generation:"7P"},
    "GY":{model:"A3", generation:"8Y"}
  };
  const hint = hints[type];
  if(hint){
    out.modelHint = hint.model;
    out.generationHint = hint.generation;
  } else {
    out.modelHint = "";
    out.generationHint = "";
  }
  return out;
}

function cleanApiValue(v){
  if(v === null || v === undefined) return "";
  const s = String(v).trim();
  if(!s || /not applicable|not reported|n\/a|null/i.test(s)) return "";
  return s;
}

function mapDriveType(v){
  const s = norm(v);
  if(!s) return "";
  if(s.includes("all-wheel") || s.includes("4wd") || s.includes("4x4") || s.includes("awd")) return "awd";
  if(s.includes("front-wheel") || s.includes("fwd")) return "fwd";
  return "";
}


async function decodeWithBackend(vin){
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 9000);
  try{
    const r = await fetch(`/api/vin?vin=${encodeURIComponent(vin)}`, {signal:controller.signal});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if(!j?.ok || !j?.useful) return null;
    const v = j.vehicle || {};
    return {
      useful:true,
      brand: cleanApiValue(v.brand),
      model: cleanApiValue(v.model),
      year: v.year ? Number(v.year) : "",
      drive: cleanApiValue(v.drive),
      driveRaw: cleanApiValue(v.driveRaw),
      engine: cleanApiValue(v.engine),
      fuel: cleanApiValue(v.fuel),
      transmission: cleanApiValue(v.transmission),
      body: cleanApiValue(v.body),
      series: cleanApiValue(v.series),
      registrationCountry: cleanApiValue(v.registrationCountry),
      source: (v.sources || []).join(" + "),
      diagnostics: j.diagnostics || {}
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeVin(){
  const vin = $("vin").value.replace(/\s/g,"").toUpperCase();
  $("vin").value = vin;
  if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)){
    $("vinHelp").textContent = "VIN ska bestå av 17 tecken (I, O och Q används normalt inte).";
    return;
  }
  $("vinHelp").textContent = "Söker fordonsdata…";
  $("result").classList.add("hidden");
  $("questions").classList.add("hidden");
  $("prPanel").classList.add("hidden");

  const local = genericDecode(vin);
  const known = DB.known_vins?.[vin];
  let api = null;
  try{
    api = await decodeWithBackend(vin);
  }catch(e){
    api = null;
  }

  state = {...local, vin, known:false};
  if(api?.useful){
    state = {...state, ...api, vin, externalLookup:true};
    state.yearSource = api.source || "externa VIN-källor";
  }
  if(known){
    // Kända manuellt verifierade uppgifter väger tyngre än en ofullständig publik VIN-dekodning.
    state = {...state, ...known, vin, known:true};
    if(api?.useful) state.externalLookup = true;
  }

  // Om de externa källorna bara ger t.ex. "Audi + MY2024", använd en tydlig
  // VAG-typkod från VIN som modell/generationsledtråd istället för att fråga användaren igen.
  if(!state.model && local.modelHint) state.model = local.modelHint;
  if(!state.generation && local.generationHint) state.generation = local.generationHint;

  $("vinHelp").textContent = api?.useful ? `Fordonsdata hämtad från ${api.source || "gratis VIN-källor"}.` : "VIN-källorna gav begränsad information. Jag använder lokala VIN-ledtrådar och frågar bara efter det som saknas.";
  showIdentified();
  decideNext();
}

function showIdentified(){
  const titleBits = [];
  if(state.brand) titleBits.push(`<strong>${state.brand}</strong>`);
  if(state.model) titleBits.push(state.model);
  if(state.year) titleBits.push(`MY${state.year}`);
  const title = titleBits.length ? titleBits.join(" · ") : "VIN avläst";

  const details = [];
  if(state.series) details.push(`Serie/trim: <strong>${state.series}</strong>`);
  if(state.generation) details.push(`Typ/generation: <strong>${state.generation}</strong>`);
  if(state.engine) details.push(`Motor: ${state.engine}`);
  if(state.fuel && !state.engine?.toLowerCase().includes(String(state.fuel).toLowerCase())) details.push(`Bränsle: ${state.fuel}`);
  if(state.transmission) details.push(`Växellåda: ${state.transmission}`);
  if(state.driveRaw) details.push(`Drivning: ${state.driveRaw}`);
  else if(state.drive) details.push(`Drivning: ${state.drive.toUpperCase()}`);
  if(state.body) details.push(`Kaross: ${state.body}`);
  if(state.note) details.push(state.note);
  if(localStorage.getItem("debugNever")) details.push("");
  if(state.yearSource) details.push(`<span class="small">Årsmodellskälla: ${state.yearSource}</span>`);

  $("identified").innerHTML = `<h2>${title}</h2><div class="muted">${details.join("<br>") || "Jag behöver kompletterande information för exakt chassival."}</div>`;
  $("identified").classList.remove("hidden");
}

function decideNext(){
  const missing = [];
  if(!state.model) missing.push("model");
  if(!state.drive) missing.push("drive");

  const m = norm(state.model || state.modelHint);
  if(m.includes("a6") && !state.variant) missing.push("variant");
  if(m.includes("a3") && !state.variant) missing.push("variant");
  if(m.includes("tiguan") && state.dcc === undefined) missing.push("dcc");
  if((m.includes("passat") || m.includes("golf")) && !state.variant) missing.push("variant");
  if(m.includes("golf") && !state.rearAxle) missing.push("rearAxle");

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
    q.innerHTML = `<div class="info">VIN-sökningen identifierade bilen men inte exakt fjädringsvariant. PR-lappen är säkraste nästa steg.</div>`;
  }
  const add = html=>q.insertAdjacentHTML("beforeend",html);
  if(fields.includes("model")) add(`<label>Modell<input id="qModel" placeholder="t.ex. A3, Golf, Tiguan"></label>`);
  if(fields.includes("drive")) add(`<label>Drivning<select id="qDrive"><option value="">Välj</option><option value="fwd">FWD</option><option value="awd">AWD / quattro / 4Motion</option></select></label>`);
  if(fields.includes("variant")) add(`<label>Variant / chassi<select id="qVariant"><option value="">Vet inte</option><option>standard</option><option>S line sport</option><option>sport</option><option>Alltrack</option><option>Allroad</option><option>TGI CNG</option><option>BlueMotion</option></select></label>`);
  if(fields.includes("a3_8y_chassis")) add(`<label>Chassi på A3 8Y<select id="qA3Chassis">
      <option value="">Vet inte</option>
      <option value="standard">Standardchassi</option>
      <option value="sport">Sportchassi, max 18 tum</option>
      <option value="sport 19">Sportchassi, 19 tum</option>
      <option value="adaptive">Adaptivt chassi / dämparreglering</option>
    </select></label>`);
  if(fields.includes("rearAxle")) add(`<label>Bakaxel<select id="qRear"><option value="">Vet inte</option><option value="torsion">Torsion beam</option><option value="multilink">Multi-link</option></select></label>`);
  if(fields.includes("dcc")) add(`<label>Har bilen DCC / adaptiva dämpare?<select id="qDcc"><option value="">Vet inte</option><option value="no">Nej</option><option value="yes">Ja</option></select></label>`);
  $("questions").classList.remove("hidden");
}

function continueQuestions(){
  if($("qModel")?.value) state.model=$("qModel").value;
  if($("qDrive")?.value) state.drive=$("qDrive").value;
  if($("qVariant")?.value) state.variant=$("qVariant").value;
  if($("qA3Chassis")?.value) state.variant=$("qA3Chassis").value;
  if($("qRear")?.value) state.rearAxle=$("qRear").value;
  if($("qDcc")?.value) state.dcc=$("qDcc").value==="yes";

  const matches = findMatches(state);
  $("questions").classList.add("hidden");
  renderResult(matches);

  // Gör det tydligt att något faktiskt hände efter "Fortsätt".
  setTimeout(() => $("result").scrollIntoView({behavior:"smooth", block:"start"}), 50);
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
  if(rule.engine_keywords?.length && s.engine){
    if(hasAny(s.engine, rule.engine_keywords)) score+=2;
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
  const manual=norm(s.manualPr||"");
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
    const ident = [state.brand, state.model, state.generation, state.year ? `MY${state.year}` : ""].filter(Boolean).join(" · ");
    box.innerHTML=`<div class="result-head"><h2>Resultat</h2><span class="badge low">PR/G-grupp saknas</span></div>
      <p><strong>${ident || "Fordonet"}</strong> är identifierat, men vår regelbas innehåller ännu inte en tillräckligt säker hjulinställningsregel för just denna generation/variant.</p>
      <div class="info"><strong>Det är inte ett VIN-fel.</strong> Nästa steg är att fastställa PR/G-koden för bilen, helst via PR-lappen/Haynes/OE. Appen ska inte hitta på en kod.</div>`;
    $("prPanel").classList.remove("hidden");
    return;
  }
  const best=matches[0].rule;
  const codes=[...(best.g_codes||[]),...(best.pr_codes||[])].join(" / ")||"";
  const gCandidates=(best.g_code_candidates||[]).join(" / ");
  const rearAxle=(best.rear_axle_pr||[]).join(" / ");
  const suspensionPr=(best.suspension_pr_candidates||[]).join(" / ");
  const conf=best.confidence==="high"?"high":best.confidence==="medium"?"medium":"low";
  const confText=best.confidence==="high"?"Hög":best.confidence==="medium"?"Medel":"Kontroll krävs";
  const a=best.alignment;
  let ambiguity="";
  if(matches[1] && matches[1].score>=matches[0].score-1){
    const r=matches[1].rule;
    const altCodes=[...(r.g_code_candidates||[]),...(r.g_codes||[]),...(r.pr_codes||[])].join(" / ");
    ambiguity=`<div class="warning"><strong>Flera möjliga chassin.</strong> Alternativ: ${altCodes || "annan PR/G-grupp"} – ${r.chassis||""}. Kontrollera PR-lapp om du inte kan skilja dem på bilen.</div>`;
  }
  box.innerHTML=`
    <div class="result-head"><h2>Föreslaget val</h2><span class="badge ${conf}">${confText}</span></div>
    <div class="kv">
      <div>Bil</div><div>${best.brand} ${best.model} ${best.generation||""}${state.year?` · MY${state.year}`:""}</div>
      ${gCandidates?`<div>G-kod</div><div><strong>${gCandidates}</strong> <span class="small">(kandidater – exakt kod ej fastställd)</span></div>`:`<div>G-/PR-grupp</div><div><strong>${codes||"Ej fastställd"}</strong></div>`}
      ${rearAxle?`<div>Bakaxel-PR</div><div><strong>${rearAxle}</strong></div>`:""}
      ${suspensionPr?`<div>Fjädrings-PR</div><div><strong>${suspensionPr}</strong></div>`:""}
      <div>Chassityp</div><div>${best.chassis||"-"}</div>
      <div>Launch</div><div><strong>${best.launch_hint||"-"}</strong></div>
    </div>
    ${a?`<table><thead><tr><th></th><th>Total toe</th><th>Camber</th></tr></thead><tbody>
      <tr><td>Fram</td><td>${a.front_toe||"-"}</td><td>${a.front_camber||"-"}</td></tr>
      <tr><td>Bak</td><td>${a.rear_toe||"-"}</td><td>${a.rear_camber||"-"}</td></tr></tbody></table>`:
      `<div class="info">Alignmentvärden är ännu inte inlagda för denna regel. Använd PR/G-gruppen i Haynes/OE.</div>`}
    ${best.warning?`<div class="warning"><strong>Databasvarning:</strong> ${best.warning}</div>`:""}
    ${best.source_summary?`<div class="info"><strong>Tekniskt underlag:</strong> ${best.source_summary}</div>`:""}
    ${ambiguity}
    <div class="small" style="margin-top:12px">Fordonsidentitet kommer från gratis VIN-källor + VAG-typkod; PR/G-grupp kommer från vår egen regelbas.</div>`;
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
