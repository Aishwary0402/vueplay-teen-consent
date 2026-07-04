/* ============================================================
   STATE
============================================================ */
const steps = [
  { id:'landing', label:'Sign up' },
  { id:'dob', label:'Age declaration' },
  { id:'minor', label:'Minor detected' },
  { id:'verify', label:'Parental verification' },
  { id:'consent', label:'Itemised consent notice' },
  { id:'confirm', label:'Consent confirmed' },
  { id:'feed', label:'Contextual home feed' },
  { id:'dashboard', label:'Privacy dashboard' },
];
let current = 0;
let dob = { day:12, month:4, year:2011 }; // defaults to a 15yo, editable
let consentState = { essential:true, personalization:false, marketing:false };
let feedMode = 'proposed'; // 'proposed' | 'today' — toggle for the before/after DPDP comparison
let googleUser = null;

/* ============================================================
   REAL GOOGLE SIGN-IN (Google Identity Services)
   Replace GOOGLE_CLIENT_ID below with your own OAuth client ID
   from Google Cloud Console. Until you do, sign-in falls back to
   a mock identity so the rest of the flow still demos cleanly.
============================================================ */
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

function initGoogleSignIn(){
  if(!window.google || !window.google.accounts || GOOGLE_CLIENT_ID.startsWith('YOUR_')) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false
  });
}

function handleGoogleCredential(response){
  try{
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    googleUser = { name: payload.name, email: payload.email, picture: payload.picture };
    log('Google sign-in', `Authenticated as ${payload.email} via real Google OAuth`, 'safe');
  }catch(e){
    googleUser = { name:'Aditi Sharma', email:'aditi.sharma@gmail.com', picture:'' };
    log('Google sign-in (demo)', 'Could not parse credential — using mock identity', 'brand');
  }
  goto(1);
}

function triggerGoogleSignIn(){
  if(!window.google || !window.google.accounts || GOOGLE_CLIENT_ID.startsWith('YOUR_')){
    googleUser = { name:'Aditi Sharma', email:'aditi.sharma@gmail.com', picture:'' };
    log('Google sign-in (demo)', 'No Google Client ID configured yet — using a mock identity', 'brand');
    goto(1);
    return;
  }
  google.accounts.id.prompt();
}

function age(){
  const today = new Date();
  let a = today.getFullYear() - dob.year;
  const m = today.getMonth() - (dob.month-1);
  if(m < 0 || (m===0 && today.getDate() < dob.day)) a--;
  return a;
}

function log(action, desc, tone='brand'){
  const list = document.getElementById('ledgerList');
  if(list.querySelector('.ledger-empty')) list.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'ledger-item ' + tone;
  const t = new Date().toLocaleTimeString();
  el.innerHTML = `<div class="t">${t}</div><div class="a">${action}</div><div class="d">${desc}</div>`;
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

/* ============================================================
   MOCK CONTENT-BASED (NON-BEHAVIORAL) RECOMMENDATION ENGINE
   -- tags describe the VIDEO's content only, never the viewer --
============================================================ */
const videos = [
  { id:1, title:'Build a Robot Arm From Scratch', chan:'MakerLab', icon:'🤖', tags:{tech:1,edu:1,diy:1} },
  { id:2, title:'GCSE Physics: Forces Explained', chan:'StudyBeam', icon:'📐', tags:{edu:1,science:1} },
  { id:3, title:'5-Min Guitar Warm Up', chan:'ChordCraft', icon:'🎸', tags:{music:1,tutorial:1} },
  { id:4, title:'Speedrun Any % World Record', chan:'PixelPace', icon:'🎮', tags:{gaming:1,esports:1} },
  { id:5, title:'Why the Sky Looks Blue', chan:'CuriousCo', icon:'🌌', tags:{science:1,edu:1} },
  { id:6, title:'Sketching Characters: Basics', chan:'InkWell', icon:'🎨', tags:{art:1,tutorial:1} },
  { id:7, title:'Top 10 Football Skills 2026', chan:'PitchSide', icon:'⚽', tags:{sports:1} },
  { id:8, title:'Intro to Python in 10 Minutes', chan:'CodeByte', icon:'💻', tags:{tech:1,edu:1,tutorial:1} },
  { id:9, title:'Chill Lo-Fi for Homework', chan:'SoftPlay', icon:'🎧', tags:{music:1} },
  { id:10, title:'How Volcanoes Actually Erupt', chan:'CuriousCo', icon:'🌋', tags:{science:1,edu:1} },
];
const allTags = ['tech','edu','diy','science','music','tutorial','gaming','esports','art','sports'];
function vec(tags){ return allTags.map(t => tags[t] ? 1 : 0); }
function cosine(a,b){
  let dot=0, na=0, nb=0;
  for(let i=0;i<a.length;i++){ dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  if(na===0 || nb===0) return 0;
  return dot / (Math.sqrt(na)*Math.sqrt(nb));
}
let anchorVideo = videos[7]; // "Intro to Python" as the seed the teen just watched
function contextualFeed(anchor){
  const av = vec(anchor.tags);
  return videos
    .filter(v => v.id !== anchor.id)
    .map(v => ({ ...v, sim: cosine(av, vec(v.tags)) }))
    .sort((a,b) => b.sim - a.sim);
}

/* ============================================================
   SCREEN RENDERERS
============================================================ */
function goto(i){ current = i; render(); }

function renderRail(){
  const rail = document.getElementById('rail');
  rail.innerHTML = steps.map((s,i) => `
    <div class="step ${i===current?'active':''} ${i<current?'done':''}" onclick="goto(${i})">
      <div class="num">${i<current ? '✓' : i+1}</div>
      <div class="label">${s.label}</div>
    </div>
  `).join('');
}

function screenShell(inner){
  return `<div class="scr-pad">${inner}</div>`;
}

function render(){
  renderRail();
  const s = document.getElementById('screen');
  const id = steps[current].id;
  s.classList.toggle('dark', id==='feed' || id==='dashboard');
  if(id==='landing') s.innerHTML = renderLanding();
  if(id==='dob') s.innerHTML = renderDob();
  if(id==='minor') s.innerHTML = renderMinor();
  if(id==='verify') s.innerHTML = renderVerify();
  if(id==='consent') s.innerHTML = renderConsent();
  if(id==='confirm') s.innerHTML = renderConfirm();
  if(id==='feed') s.innerHTML = renderFeed();
  if(id==='dashboard') s.innerHTML = renderDashboard();
  window.__wire && window.__wire();
}

function renderLanding(){
  return screenShell(`
    <div class="scr-center">
      <div class="icon-badge">▶</div>
      <div class="eyebrow">Welcome</div>
      <div class="h-lg">Create your VuePlay account</div>
      <div class="p-soft">A quick prototype of the sign-up → consent journey used in the accompanying case study.</div>
      <div style="width:100%; display:flex; flex-direction:column; gap:10px; margin-top:8px;">
        <button class="btn btn-primary" onclick="triggerGoogleSignIn()">Continue with Google</button>
        <button class="btn btn-ghost" onclick="triggerGoogleSignIn()">Continue with email</button>
      </div>
    </div>
  `);
}

function renderDob(){
  const greetName = googleUser ? googleUser.name.split(' ')[0] : 'there';
  return screenShell(`
    <div class="eyebrow">Step 1 of 3${googleUser ? ' · signed in as ' + googleUser.email : ''}</div>
    <div class="h-lg">Hey ${greetName}, when's your birthday?</div>
    <div class="p-soft">We ask this once, upfront — not buried in settings — because it decides what data experience you get next.</div>
    <div class="card" style="display:flex; gap:8px;">
      <div class="field" style="flex:1;"><label>Day</label><input id="d" type="number" value="${dob.day}" min="1" max="31"></div>
      <div class="field" style="flex:1;"><label>Month</label><input id="m" type="number" value="${dob.month}" min="1" max="12"></div>
      <div class="field" style="flex:1.3;"><label>Year</label><input id="y" type="number" value="${dob.year}"></div>
    </div>
    <div class="p-soft" style="font-size:11.5px;">Age at signup is re-checked, never self-reported only once — consistent with DPDP's expectation of ongoing, verifiable age assurance.</div>
    <div style="margin-top:auto; display:flex; flex-direction:column; gap:10px;">
      <button class="btn btn-primary" onclick="submitDob()">Continue</button>
    </div>
  `);
}
function submitDob(){
  dob.day = +document.getElementById('d').value;
  dob.month = +document.getElementById('m').value;
  dob.year = +document.getElementById('y').value;
  log('Age declared', `DOB submitted → calculated age ${age()}`, 'brand');
  goto(age() < 18 ? 2 : 6);
}

function renderMinor(){
  return screenShell(`
    <div class="scr-center">
      <div class="icon-badge" style="background:var(--alert-soft); color:var(--alert);">🛡️</div>
      <span class="badge badge-alert">Minor account detected · age ${age()}</span>
      <div class="h-lg">We need a parent to verify this account</div>
      <div class="p-soft">Under India's DPDP Act, we can't process personal data for anyone under 18 until a parent or guardian gives verifiable consent. This protects you — and it's the law.</div>
      <div class="card" style="text-align:left; width:100%;">
        <div class="h-md" style="margin-bottom:6px;">What changes for your account</div>
        <div class="p-soft">• No behavioural tracking or profiling<br>• No personalised or targeted ads<br>• Recommendations based only on video content, not your activity<br>• A parent can review or withdraw consent anytime</div>
      </div>
      <button class="btn btn-primary" onclick="goto(3)" style="margin-top:4px;">Send verification to a parent</button>
    </div>
  `);
}

function renderVerify(){
  return screenShell(`
    <div class="scr-center" id="verifyBox">
      <div class="icon-badge">🪪</div>
      <div class="eyebrow">Parental verification</div>
      <div class="h-lg">Verify via DigiLocker</div>
      <div class="p-soft">Your parent confirms their identity through DigiLocker so we can be sure consent is coming from a real parent or guardian — not just anyone tapping "agree.”</div>
      <button class="btn btn-primary" onclick="runVerify()">Verify with DigiLocker</button>
      <button class="btn btn-ghost" onclick="goto(4)">Skip (demo only)</button>
    </div>
  `);
}
function runVerify(){
  const box = document.getElementById('verifyBox');
  box.innerHTML = `<div class="spinner"></div><div class="p-soft">Confirming parent identity…</div>`;
  setTimeout(() => {
    log('Parent verified', 'Guardian identity confirmed via DigiLocker (mock)', 'safe');
    goto(4);
  }, 1100);
}

function renderConsent(){
  return screenShell(`
    <div class="eyebrow">For the parent / guardian</div>
    <div class="h-lg">Review & give consent</div>
    <div class="p-soft">Plain-language notice, itemised by purpose — not one bundled "I agree.” Each toggle is independent, and every choice here is logged.</div>
    <div class="card" style="display:flex; flex-direction:column; gap:14px;">
      <div class="row-between">
        <div>
          <div class="h-md" style="font-size:14px;">Core app functionality</div>
          <div class="p-soft">Account, playback, safety features. Required to use VuePlay.</div>
        </div>
        <span class="badge badge-locked">Required</span>
      </div>
      <div class="divider"></div>
      <div class="row-between">
        <div>
          <div class="h-md" style="font-size:14px;">Behavioural profiling & ad targeting</div>
          <div class="p-soft">Prohibited for minors under DPDP Section 9. Cannot be turned on.</div>
        </div>
        <label class="switch"><input type="checkbox" disabled><span class="slider"></span></label>
      </div>
      <div class="divider"></div>
      <div class="row-between">
        <div>
          <div class="h-md" style="font-size:14px;">Product update emails</div>
          <div class="p-soft">Occasional emails to the parent's address. Optional.</div>
        </div>
        <label class="switch"><input type="checkbox" id="mkt"><span class="slider"></span></label>
      </div>
    </div>
    <div style="margin-top:auto; display:flex; flex-direction:column; gap:10px;">
      <button class="btn btn-safe" onclick="giveConsent()">Give consent</button>
      <div class="p-soft" style="text-align:center; font-size:11px;">You can withdraw this anytime — it's as easy as giving it.</div>
    </div>
  `);
}
function giveConsent(){
  consentState.marketing = document.getElementById('mkt').checked;
  log('Consent granted', `Essential: on · Profiling/ads: off (locked) · Marketing: ${consentState.marketing?'on':'off'}`, 'safe');
  goto(5);
}

function renderConfirm(){
  return screenShell(`
    <div class="scr-center">
      <div class="icon-badge" style="background:var(--safe-soft); color:var(--safe);">✓</div>
      <div class="h-lg">Consent recorded</div>
      <div class="p-soft">Timestamped, itemised, and stored so it can be produced on request — for you, or for the Data Protection Board.</div>
      <div class="card" style="width:100%; text-align:left;">
        <div class="p-soft mono" style="font-size:11px;">consent_id: c_8841ae<br>guardian_verified: true<br>profiling: false<br>marketing: ${consentState.marketing}<br>issued: ${new Date().toISOString().slice(0,16).replace('T',' ')}</div>
      </div>
      <button class="btn btn-primary" onclick="goto(6)">Go to VuePlay</button>
    </div>
  `);
}

function sharedTags(a,b){ return Object.keys(a.tags).filter(t => b.tags[t]); }

function setFeedMode(m){
  feedMode = m;
  log('Feed mode switched', m==='today' ? 'Viewing status-quo (non-compliant) experience for comparison' : 'Viewing proposed DPDP-compliant experience', m==='today'?'alert':'safe');
  render();
}

function renderFeed(){
  const feed = contextualFeed(anchorVideo);
  const isToday = feedMode === 'today';
  return `
    <div class="app-header">
      <div class="logo"><span class="play">▶</span>VuePlay</div>
      <div class="tooltip-wrap">
        <div class="mode-pill ${isToday?'off':''}">${isToday? '🔴 Profiling: on' : '🛡️ Profiling: off — DPDP mode'}</div>
        <div class="tooltip-box">${isToday
          ? 'This is the status quo most video platforms ship today: watch history, session length, and time-of-day are used to build a behavioural profile and target ads — even for accounts flagged as under 18.'
          : 'Personalisation from watch history is disabled for accounts under 18, per DPDP Section 9. Recommendations are generated only from each video\'s content tags — never your activity.'}</div>
      </div>
    </div>
    <div class="toggle-tabs">
      <div class="toggle-tab ${isToday?'active':''}" onclick="setFeedMode('today')">Today · non-compliant</div>
      <div class="toggle-tab ${!isToday?'active':''}" onclick="setFeedMode('proposed')">Proposed · DPDP</div>
    </div>
    <div class="section-label">You watched</div>
    <div class="video-card" style="cursor:default;">
      <div class="thumb" style="background:var(--brand-soft);">${anchorVideo.icon}</div>
      <div>
        <div class="v-title">${anchorVideo.title}</div>
        <div class="v-meta">${anchorVideo.chan}</div>
      </div>
    </div>
    ${isToday ? `
      <div class="ad-card">
        <div class="thumb">AD</div>
        <div class="txt"><b>Sponsored</b> — targeted because you're flagged as 15 and active late at night. This is exactly what DPDP Section 9 prohibits.</div>
      </div>
      <div class="section-label">Recommended for you — based on your activity profile</div>
      ${[...videos].filter(v=>v.id!==anchorVideo.id).sort((a,b)=> (b.id%3)-(a.id%3)).slice(0,6).map(v => `
        <div class="video-card" style="cursor:default;">
          <div class="thumb" style="background:${['#3A2A2A','#2A2F3A','#2A3A32','#33302A'][v.id % 4]};">${v.icon}</div>
          <div style="flex:1;">
            <div class="v-title">${v.title}</div>
            <div class="v-meta">${v.chan}</div>
            <div class="why" style="color:var(--alert);">Ranked by predicted watch-time from behavioural profile</div>
          </div>
        </div>
      `).join('')}
    ` : `
      <div class="section-label">Because this video is about ${Object.keys(anchorVideo.tags).join(', ')} — not because of your activity</div>
      ${feed.slice(0,6).map(v => `
        <div class="video-card" onclick="watchVideo(${v.id})">
          <div class="thumb" style="background:${['#3A2A2A','#2A3A34','#3A2A38','#2A2E3A'][v.id % 4]};">${v.icon}</div>
          <div style="flex:1;">
            <div class="v-title">${v.title}</div>
            <div class="v-meta">${v.chan}</div>
            <div class="v-tags">${Object.keys(v.tags).map(t=>`<span class="v-tag">${t}</span>`).join('')}<span class="sim">sim ${v.sim.toFixed(2)}</span></div>
            <div class="why">Shown because it shares: ${sharedTags(anchorVideo,v).join(', ') || 'related content signals'}</div>
          </div>
        </div>
      `).join('')}
    `}
    <div style="padding:16px;"><button class="btn btn-ghost" onclick="goto(7)">Open privacy dashboard</button></div>
  `;
}
function watchVideo(id){
  const v = videos.find(x=>x.id===id);
  anchorVideo = v;
  log('Content-based recommendation refreshed', `Anchor video changed to "${v.title}" — feed re-ranked by tag similarity, not behaviour`, 'brand');
  render();
}

function renderDashboard(){
  return screenShell(`
    <div class="eyebrow">Privacy dashboard</div>
    <div class="h-lg">Manage this account's data</div>
    <div class="card">
      <div class="row-between"><div class="h-md" style="font-size:14px;">Consent status</div><span class="badge badge-safe">Active</span></div>
      <div class="p-soft" style="margin-top:6px;">Verified by parent on ${new Date().toLocaleDateString()}. Profiling & ad targeting: off (locked while under 18).</div>
    </div>
    <div class="card">
      <div class="h-md" style="font-size:14px; margin-bottom:6px;">What we collect</div>
      <div class="p-soft">Account info, watch history (for contextual recs only), device type. No location tracking, no ad profile.</div>
    </div>
    <div style="display:flex; flex-direction:column; gap:10px; margin-top:4px;">
      <button class="btn btn-ghost" onclick="downloadData()">Download my data</button>
      <button class="btn btn-ghost" onclick="withdrawConsent()">Withdraw consent</button>
    </div>
  `);
}
function downloadData(){ log('Data export requested', 'Data Principal right to access exercised (mock export generated)', 'brand'); }
function withdrawConsent(){ log('Consent withdrawn', 'All non-essential processing halted immediately; account reverts to essential-only', 'alert'); }

/* ============================================================
   ASK COMPLIANCE — RAG COPILOT
   Retrieval here is a lightweight keyword/overlap scorer for the
   demo (a static artifact can't run FAISS). In production this
   would be the same semantic-chunking + FAISS pipeline used in
   LexGraph, over the full text of the Act + Rules.
============================================================ */
const dpdpCorpus = [
  { id:'S9', title:'Section 9 — Children\'s data', text:'Before processing personal data of anyone under 18, a data fiduciary must obtain verifiable consent from a parent or lawful guardian. Processing must not cause any detrimental effect on the child\'s wellbeing.' },
  { id:'S9(3)', title:'Section 9(3) — Prohibited processing for children', text:'Data fiduciaries must not undertake tracking, behavioural monitoring of children, or targeted advertising directed at children.' },
  { id:'S6', title:'Section 6 — Standard for consent', text:'Consent must be free, specific, informed, unconditional, and given through clear affirmative action. It cannot be inferred from silence, inaction, or a pre-ticked box.' },
  { id:'S6(4)', title:'Section 6(4) — Withdrawal of consent', text:'A data principal may withdraw consent at any time, and the process for withdrawal must be as easy as the process for giving consent. Withdrawal does not affect the lawfulness of processing already carried out.' },
  { id:'R10', title:'Rule 10 — Verified parental consent & limited exemptions', text:'Verification of a parent or guardian may use approved methods including identity verification integrated with systems like DigiLocker. Certain narrow processing purposes for children (e.g. basic account/email creation, child-safety functions, subsidy or benefit issuance) are exempted from the full parental-consent requirement, subject to conditions.' },
  { id:'S8(6)', title:'Section 8(6) & Rule 7 — Breach notification', text:'On becoming aware of a personal data breach, a data fiduciary must notify the Data Protection Board and affected data principals without delay. A detailed report to the Board is required within 72 hours, describing what happened and the protective steps individuals can take.' },
  { id:'S8(7)', title:'Section 8(7) & Rule 8 — Retention and erasure', text:'Personal data must be erased once the purpose for which it was collected is no longer being served, or consent is withdrawn. Large platforms (e-commerce, social media, gaming with sizeable user bases) must erase data after three years of user inactivity, giving 48 hours\' notice before deletion. A one-year minimum retention floor applies for specified purposes such as investigations.' },
  { id:'Notice', title:'Notice requirements', text:'Fiduciaries must give an independently understandable, itemised, plain-language notice describing what personal data is collected, for what purpose, before or at the time consent is sought.' },
  { id:'Rights', title:'Data principal rights', text:'Individuals (or a parent/guardian for a child) have the right to access their personal data, request correction, request erasure, get a summary of processing, and nominate someone to exercise these rights on their behalf in case of death or incapacity.' },
  { id:'Penalties', title:'Schedule — Penalties', text:'Non-compliance with the special provisions for children\'s data (Section 9) can attract penalties up to ₹200 crore. Failure to implement reasonable security safeguards can attract penalties up to ₹250 crore. Failure to notify a breach can attract penalties up to ₹200 crore.' },
  { id:'ConsentMgr', title:'Consent Managers', text:'A Consent Manager is a registered, neutral intermediary, interoperable across services, through which an individual can give, review, manage, and withdraw consent in one place. Consent logs must be retained and auditable.' },
  { id:'SDF', title:'Significant Data Fiduciaries (SDF)', text:'Fiduciaries notified as Significant Data Fiduciaries, based on volume and sensitivity of data processed, have enhanced obligations: appointing a India-based Data Protection Officer, an independent data auditor, and conducting periodic Data Protection Impact Assessments (DPIAs).' },
];

function tokenize(str){
  return str.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2);
}
function retrieve(query, k=3){
  const qTokens = new Set(tokenize(query));
  const scored = dpdpCorpus.map(c => {
    const cTokens = tokenize(c.title + ' ' + c.text);
    let overlap = 0;
    cTokens.forEach(t => { if(qTokens.has(t)) overlap++; });
    // light TF normalisation so longer chunks don't win purely on length
    const score = overlap / Math.sqrt(cTokens.length);
    return { ...c, score };
  });
  return scored.sort((a,b) => b.score - a.score).slice(0,k).filter(c => c.score > 0);
}

const suggestedQs = [
  'Can we show personalised ads to a 16-year-old?',
  'How should we verify a parent is real?',
  'What if a user withdraws consent — what happens to their data?',
  'What happens if we miss the 72-hour breach window?'
];

function escapeHtml(s){
  const d = document.createElement('div'); d.innerText = s; return d.innerHTML;
}

function openAsk(){
  document.getElementById('askPanel').classList.remove('hidden');
  const chips = document.getElementById('askChips');
  chips.innerHTML = suggestedQs.map(q => `<div class="chip" onclick="askQuick('${q.replace(/'/g,"\\'")}')">${q}</div>`).join('');
}
function closeAsk(){ document.getElementById('askPanel').classList.add('hidden'); }
function askQuick(q){ document.getElementById('askInput').value = q; sendAsk(); }

function appendMsg(role, html){
  const body = document.getElementById('askBody');
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  el.innerHTML = `<div class="bubble">${html}</div>`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
  return el;
}
function appendRetrieved(chunks){
  const body = document.getElementById('askBody');
  const el = document.createElement('div');
  el.className = 'retrieved';
  el.innerHTML = `<div class="rt-title">Retrieved from DPDP corpus (${chunks.length})</div>` +
    chunks.map(c => `<div class="chunk"><b>[${c.id}]</b> ${c.title}</div>`).join('');
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

function synthesizeOffline(q, chunks){
  const lead = chunks.map(c => `[${c.id}] ${c.text}`).join(' ');
  const ql = q.toLowerCase();
  let rec = 'Recommendation: align this feature with the provisions above before shipping.';
  if(ql.includes('ad') || ql.includes('personalis') || ql.includes('personaliz') || ql.includes('profil')){
    rec = 'Recommendation: do not enable behavioural personalisation or ad targeting for accounts declared under 18 — use content-based signals only.';
  } else if(ql.includes('verify') || ql.includes('parent') || ql.includes('guardian')){
    rec = 'Recommendation: require a DigiLocker-backed (or equivalent government ID) verification step before activating a minor\'s account.';
  } else if(ql.includes('withdraw')){
    rec = 'Recommendation: make withdrawal a single tap, halt non-essential processing immediately, and log the event.';
  } else if(ql.includes('breach')){
    rec = 'Recommendation: build breach-detection and Board-notification tooling that can reliably hit the 72-hour window.';
  }
  return `${lead} ${rec}`;
}

async function sendAsk(){
  const input = document.getElementById('askInput');
  const q = input.value.trim();
  if(!q) return;
  const btn = document.getElementById('askSendBtn');
  input.value = ''; btn.disabled = true;
  document.getElementById('askChips').innerHTML = '';

  appendMsg('user', escapeHtml(q));
  log('Compliance query', `PM asked copilot: "${q.slice(0,60)}${q.length>60?'…':''}"`, 'brand');

  const chunks = retrieve(q, 3);
  const usedChunks = chunks.length ? chunks : dpdpCorpus.slice(0,2);
  appendRetrieved(usedChunks);

  const typingEl = appendMsg('bot', '<div class="typing"><span></span><span></span><span></span></div>');
  const contextText = usedChunks.map(c => `[${c.id}] ${c.title}: ${c.text}`).join('\n');
  const systemPrompt = `You are a compliance copilot embedded inside a PM's product prototype, helping them check feature decisions against India's DPDP Act, 2023. Answer ONLY using the retrieved provisions below — do not use outside legal knowledge. Be concise (3-5 sentences), practical, and end with a one-line recommendation. Cite provisions inline like [S9] using the exact bracket IDs given.\n\nRETRIEVED PROVISIONS:\n${contextText}`;

  let answer, source = 'live';
  try{
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [ { role: "user", content: q } ]
      })
    });
    if(!response.ok) throw new Error('non-200: ' + response.status);
    const data = await response.json();
    const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
    answer = textBlocks.join('\n').trim();
    if(!answer) throw new Error('empty response');
  }catch(err){
    source = 'offline';
    answer = synthesizeOffline(q, usedChunks);
    console.warn('Live Claude API unreachable, using offline synthesis fallback:', err);
  }

  answer = escapeHtml(answer).replace(/\[([A-Za-z0-9()]+)\]/g, '<span class="cite">$1</span>');
  if(source === 'offline'){
    answer += `<div style="margin-top:8px; font-size:10px; color:var(--ink-soft); font-style:italic;">⚡ Composed locally from the retrieved provisions — the live Claude API call couldn't be reached from this environment.</div>`;
  }
  typingEl.querySelector('.bubble').innerHTML = answer;
  log(source==='live' ? 'Compliance answer generated' : 'Compliance answer (offline fallback)', `Grounded on ${usedChunks.map(c=>c.id).join(', ')}`, 'safe');

  btn.disabled = false;
  document.getElementById('askBody').scrollTop = document.getElementById('askBody').scrollHeight;
}

render();
window.addEventListener('load', () => setTimeout(initGoogleSignIn, 300));