import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, updateDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXvZylIYNZjhN4wqWF6r6ZVWXLUUZprbI",
  authDomain: "jazal-audio.firebaseapp.com",
  projectId: "jazal-audio",
  storageBucket: "jazal-audio.firebasestorage.app",
  messagingSenderId: "124084003288",
  appId: "1:124084003288:web:c3aa47fe30d7dfcee152ad",
  measurementId: "G-B36438FY9N"
};

const APP_VERSION = 'jazal-launch-v1';
const FIRESTORE_RULES_TEXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    function validSubmission() {
      return request.resource.data.keys().hasAll(['title', 'genre', 'body'])
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.title.size() <= 200
        && request.resource.data.genre is string
        && request.resource.data.body is string
        && request.resource.data.body.size() >= 10
        && request.resource.data.body.size() <= 10000;
    }
    match /jazal/content {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /submissions/{id} {
      allow create: if validSubmission();
      allow read, update, delete: if isAdmin();
    }
  }
}`;
const STORAGE_RULES_TEXT = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    match /audio/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin()
        && request.resource.size < 100 * 1024 * 1024
        && request.resource.contentType.matches('audio/.*');
    }
    match /covers/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin()
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}`;

let fbApp = null;
let db = null;
let auth = null;
let storage = null;
let contentRef = null;
let submissionsCol = null;
let editModal = null;
let firebaseUser = null;
let unsubContent = null;
let unsubSubmissions = null;
let cloudPushTimer = null;
let applyingCloud = false;

const STORAGE_KEY = 'jazal-final-ui-font-audio-complete-state';
const DEMO_AUDIO_SRC = 'assets/jazal-demo.mp3';
let audioEl = null;
let playerTimer = null;
let deferredInstallPrompt = null;

const baseStories = [
  {
    id:'old-door', title:'الباب القديم', genre:'رعب', emoji:'🚪', tag:'حكاية من بغداد القديمة', mood:'غموض', age:'+13', featured:true, published:true,
    desc:'بيت قديم في الكرخ محد ينام بيه. كل ليلة ينفتح باب مسدود وصوت يهمس باسم شخص من أهل البيت.',
    color:'linear-gradient(145deg,#10180d,#2f4a17 48%,#d4b14d)', rating:'4.9', episodes:6, free:2, listens:'18.6K', duration:'1س 12د',
    episodeList:[
      {id:'old-door-1', title:'الليلة الأولى', duration:'12:35', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'old-door-2', title:'الصوت من السطح', duration:'10:20', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'old-door-3', title:'المفتاح الأسود', duration:'13:05', free:false, audioSrc:DEMO_AUDIO_SRC},
      {id:'old-door-4', title:'الضيف اللي ما ينشاف', duration:'11:48', free:false, audioSrc:DEMO_AUDIO_SRC}
    ]
  },
  {
    id:'river-secret', title:'سر دجلة', genre:'جريمة', emoji:'🌊', tag:'تحقيق صوتي', mood:'تشويق', age:'+16', featured:false,
    desc:'رسالة تطلع من دجلة تفتح قضية اختفت من ملفات الشرطة. كل شاهد يحچي نص الحقيقة، والنص الثاني مدفون.',
    color:'linear-gradient(145deg,#081a16,#14584b 54%,#d8af45)', rating:'4.8', episodes:8, free:2, listens:'14.2K', duration:'1س 55د',
    episodeList:[
      {id:'river-secret-1', title:'الرسالة', duration:'11:10', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'river-secret-2', title:'شاهد ما يحچي', duration:'14:00', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'river-secret-3', title:'الملف الناقص', duration:'12:45', free:false, audioSrc:DEMO_AUDIO_SRC},
      {id:'river-secret-4', title:'علامة على الجسر', duration:'13:33', free:false, audioSrc:DEMO_AUDIO_SRC}
    ]
  },
  {
    id:'last-call', title:'آخر مكالمة', genre:'واقعي', emoji:'☎️', tag:'من قصص الجمهور', mood:'حزن', age:'عام', featured:false,
    desc:'مكالمة قصيرة بنص الليل تغيّر حياة عائلة كاملة. قصة واقعية معاد صياغتها بصوت درامي هادئ.',
    color:'linear-gradient(145deg,#171b10,#5d5124 55%,#f0d478)', rating:'4.7', episodes:4, free:2, listens:'11.9K', duration:'49د',
    episodeList:[
      {id:'last-call-1', title:'رنّة بنص الليل', duration:'09:40', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'last-call-2', title:'الرقم الغريب', duration:'11:20', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'last-call-3', title:'الصوت الراجع', duration:'10:55', free:false, audioSrc:DEMO_AUDIO_SRC}
    ]
  },
  {
    id:'love-alley', title:'دربونة حب', genre:'حب', emoji:'💛', tag:'دراما صوتية', mood:'دافي', age:'عام', featured:false,
    desc:'قصة حب تبدأ من دربونة صغيرة، بين مطر بغداد ورسالة ما وصلت للعنوان الصحيح.',
    color:'linear-gradient(145deg,#171d10,#493816 56%,#cfa23f)', rating:'4.6', episodes:7, free:2, listens:'10.4K', duration:'1س 30د',
    episodeList:[
      {id:'love-alley-1', title:'أول رسالة', duration:'10:05', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'love-alley-2', title:'موعد بالمطر', duration:'12:18', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'love-alley-3', title:'البيت المقابل', duration:'11:10', free:false, audioSrc:DEMO_AUDIO_SRC}
    ]
  },
  {
    id:'hotel-17', title:'غرفة 17', genre:'رعب', emoji:'🛎️', tag:'رعب حضري', mood:'توتر', age:'+16', featured:false,
    desc:'فندق قديم يم النهر عنده غرفة ما تنحجز إلا بالغلط. كل واحد يدخلها يسمع تسجيل من مستقبله.',
    color:'linear-gradient(145deg,#0d1210,#273f18 50%,#b2ff2e)', rating:'4.9', episodes:6, free:2, listens:'13.7K', duration:'1س 18د',
    episodeList:[
      {id:'hotel-17-1', title:'الحجز الغلط', duration:'10:32', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'hotel-17-2', title:'التسجيل', duration:'12:01', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'hotel-17-3', title:'الضيف القديم', duration:'13:44', free:false, audioSrc:DEMO_AUDIO_SRC}
    ]
  },
  {
    id:'case-qasr', title:'قضية القصر', genre:'جريمة', emoji:'🕯️', tag:'ملف تحقيق', mood:'غموض', age:'+16', featured:false,
    desc:'اختفاء تاجر معروف داخل قصر مهجور. كل دليل يقود إلى شخص قريب منه، وكل قريب عنده سر.',
    color:'linear-gradient(145deg,#12150f,#3c4b1b 55%,#d2ab46)', rating:'4.8', episodes:9, free:2, listens:'12.1K', duration:'2س 05د',
    episodeList:[
      {id:'case-qasr-1', title:'آخر ظهور', duration:'12:22', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'case-qasr-2', title:'الشمعة المطفيّة', duration:'11:49', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'case-qasr-3', title:'باب الحديقة', duration:'12:58', free:false, audioSrc:DEMO_AUDIO_SRC}
    ]
  },
  {
    id:'jazal-talk', title:'جزل يحچي', genre:'بودكاست', emoji:'🎙️', tag:'بودكاست عراقي', mood:'حوار', age:'عام', featured:false,
    desc:'حوار أسبوعي عن القصص، الصوت، والناس اللي ورا الحكايات. خفيف، قريب، وبلهجة مفهومة.',
    color:'linear-gradient(145deg,#0f1e12,#384c1a 58%,#ccff2c)', rating:'جديد', episodes:5, free:5, listens:'6.8K', duration:'1س 05د',
    episodeList:[
      {id:'jazal-talk-1', title:'ليش نسمع القصص؟', duration:'18:00', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'jazal-talk-2', title:'صوت بغداد', duration:'15:30', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'jazal-talk-3', title:'الحكاية قبل الصورة', duration:'14:25', free:true, audioSrc:DEMO_AUDIO_SRC}
    ]
  },
  {
    id:'maqam-night', title:'ليل المقام', genre:'بودكاست', emoji:'🎧', tag:'سوالف صوتية', mood:'راقي', age:'عام', featured:false,
    desc:'جلسة صوتية عن المقام العراقي والذاكرة والمدينة، بدون محاضرة ثقيلة؛ سوالف تسمعها للآخر.',
    color:'linear-gradient(145deg,#07130d,#203d22 58%,#d7b14a)', rating:'4.6', episodes:4, free:2, listens:'5.1K', duration:'52د',
    episodeList:[
      {id:'maqam-night-1', title:'الصوت والمدينة', duration:'13:10', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'maqam-night-2', title:'من الراديو للستوديو', duration:'12:20', free:true, audioSrc:DEMO_AUDIO_SRC}
    ]
  },
  {
    id:'kids-night', title:'حچي قبل النوم', genre:'أطفال', emoji:'🌙', tag:'قصص هادئة', mood:'ناعم', age:'أطفال', featured:false,
    desc:'قصص قصيرة آمنة للأطفال بصوت هادئ قبل النوم، بدون رعب وبدون ضوضاء.',
    color:'linear-gradient(145deg,#132016,#314b1f 58%,#f5d06b)', rating:'4.5', episodes:6, free:3, listens:'7.6K', duration:'45د',
    episodeList:[
      {id:'kids-night-1', title:'القنديل الصغير', duration:'07:00', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'kids-night-2', title:'النخلة الطيبة', duration:'06:45', free:true, audioSrc:DEMO_AUDIO_SRC},
      {id:'kids-night-3', title:'رحلة عصفور', duration:'06:20', free:true, audioSrc:DEMO_AUDIO_SRC}
    ]
  }
];

const defaultState = {
  contentVersion:'jazal-final-ui-font-audio-complete',
  currentView:'home', filter:'الكل', query:'', favorites:['old-door'], recent:['old-door','river-secret'],
  player:{playing:false, kind:'episode', title:'الليلة الأولى', subtitle:'الباب القديم · صوت تجريبي شغال', storyId:'old-door', episodeId:'old-door-1', audioSrc:DEMO_AUDIO_SRC, progress:0, duration:755, speed:'1x'},
  fm:{live:true, title:'ليالي جزل', host:'ستوديو جزل', note:'بث تجريبي مباشر للحكايات والحوارات الصوتية', listeners:128, streamUrl:DEMO_AUDIO_SRC},
  user:{name:'مستمع جزل', logged:true},
  submissions:[], mySubmissions:[], stories:baseStories,
  firebase:{mode:'firebase', projectId:'jazal-audio', authDomain:firebaseConfig.authDomain, firestoreReady:true, live:false, signedIn:false, isAdmin:false, authEmail:'', lastSync:'', error:'', cloudStatus:'جاهز'},
  admin:{tab:'overview'},
  schedule:[
    {time:'08:00 مساءً', title:'ليالي جزل', host:'ستوديو جزل', desc:'قصص قصيرة مختارة من جمهور جزل'},
    {time:'09:30 مساءً', title:'قصة للآخر', host:'ضيف الأسبوع', desc:'حلقة حوارية عن قصة حقيقية'},
    {time:'11:00 مساءً', title:'رعب بعد النص', host:'جزل Originals', desc:'رعب خفيف قبل النوم'}
  ]
};

function structured(obj){ return JSON.parse(JSON.stringify(obj)); }
function merge(base, saved){
  if(Array.isArray(base)) return Array.isArray(saved) && saved.length ? saved : base;
  if(typeof base !== 'object' || base === null) return saved ?? base;
  const out = {...base};
  Object.keys(saved || {}).forEach(k => { out[k] = merge(base[k], saved[k]); });
  return out;
}
function loadState(){ try{return merge(structured(defaultState), JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch(e){return structured(defaultState);} }
let state = loadState();
function upgradeContentPack(){
  state.stories=normalizeStories(state.stories);
  if(state.contentVersion !== 'jazal-final-ui-font-audio-complete' && state.contentVersion !== APP_VERSION){
    state.stories = normalizeStories(structured(baseStories));
    state.contentVersion = APP_VERSION;
    state.recent = ['old-door','hotel-17','river-secret'];
    state.player = structured(defaultState.player);
    state.favorites = ['old-door'];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  state.contentVersion = APP_VERSION;
}
upgradeContentPack();
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return [...document.querySelectorAll(sel)]; }
function app(){ return qs('#app'); }
function esc(str=''){ return String(str).replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }
function sanitizeText(str='', max=5000){ return String(str||'').trim().slice(0, max); }
function isAdmin(){ return state.firebase.isAdmin === true; }
function requireAdmin(action='هذه العملية'){
  if(isAdmin()) return true;
  toast(`${action} تحتاج صلاحية أدمن`);
  return false;
}
function isSafeAudioUrl(url=''){
  const value=String(url||'').trim();
  if(!value) return false;
  if(value.startsWith('assets/') || value.startsWith('./assets/')) return true;
  try{
    const parsed=new URL(value, location.origin);
    return parsed.protocol==='https:' || parsed.protocol==='blob:';
  }catch(e){ return false; }
}
function toast(msg){ const old=qs('.toast'); if(old) old.remove(); const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2400); }
function nav(view){ state.currentView=view; syncHash(view); save(); render(); closeDrawer(); }
function setAdminTab(tab){ if(tab!=='firebase' && !isAdmin()) tab='firebase'; state.admin.tab=tab; save(); render(); }
function isFav(id){ return state.favorites.includes(id); }
function updateRecent(id){ state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,8); }
function logoIcon(){ return `<img class="jazal-mark" src="assets/jazal-mark.svg?v=jazal-launch-v1" alt="شعار جزل" />`; }
function getStory(id){ return state.stories.find(s=>s.id===id); }
function getPublicStories(){ return state.stories.filter(s=>s.published!==false); }
function normalizeStories(list){
  return (list||[]).map(s=>({published:true, ...s, published:s.published!==false}));
}
function getEpisode(story, id){ return story?.episodeList?.find(e=>e.id===id) || story?.episodeList?.[0]; }
function getEpisodeIndex(story, epId){ return (story?.episodeList||[]).findIndex(e=>e.id===epId); }
function getNextEpisode(storyId, epId){
  const story=getStory(storyId); if(!story) return null;
  const list=story.episodeList||[]; const idx=getEpisodeIndex(story, epId);
  if(idx<0||idx>=list.length-1) return null;
  return {story, episode:list[idx+1]};
}
function getPrevEpisode(storyId, epId){
  const story=getStory(storyId); if(!story) return null;
  const list=story.episodeList||[]; const idx=getEpisodeIndex(story, epId);
  if(idx<=0) return null;
  return {story, episode:list[idx-1]};
}
function playNextEpisode(auto=false){
  if(state.player.kind!=='episode') return;
  const next=getNextEpisode(state.player.storyId, state.player.episodeId);
  if(!next?.episode) { if(!auto) toast('هذه آخر حلقة'); return; }
  if(!next.episode.free){ toast('الحلقة التالية تفتح قريباً'); return; }
  playEpisode(next.story.id, next.episode.id, auto);
}
function playPrevEpisode(){
  if(state.player.kind!=='episode') return;
  const prev=getPrevEpisode(state.player.storyId, state.player.episodeId);
  if(!prev?.episode){ toast('هذه أول حلقة'); return; }
  playEpisode(prev.story.id, prev.episode.id);
}
function parseHashRoute(){
  const hash=(location.hash||'').replace(/^#\/?/,'').trim();
  if(!hash) return null;
  if(hash.startsWith('detail/')) return `detail:${hash.slice(7)}`;
  if(hash.startsWith('story/')) return `detail:${hash.slice(6)}`;
  const allowed=['home','library','player','fm','submit','plans','account','admin','about','privacy','terms','support'];
  return allowed.includes(hash)?hash:null;
}
function syncHash(view){
  const map={home:'', library:'library', player:'player', fm:'fm', submit:'submit', plans:'plans', account:'account', admin:'admin', about:'about', privacy:'privacy', terms:'terms', support:'support'};
  if(view.startsWith('detail:')) location.hash=`detail/${view.split(':')[1]}`;
  else location.hash=map[view]||'';
}
function slugify(text=''){
  return String(text).trim().toLowerCase().replace(/[^\w\u0600-\u06FF]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||('story-'+Date.now());
}
function storyEpisodeCount(story){ return story.episodeList?.length || story.episodes || 0; }
function coverSrc(story){ return `assets/covers/${story.id}.svg?v=jazal-launch-v1`; }
function availableAudio(src){ return src && String(src).trim() ? String(src).trim() : DEMO_AUDIO_SRC; }
function isDemoAudio(src){ const value=availableAudio(src); return value===DEMO_AUDIO_SRC || /jazal-demo\.mp3(?:\?|$)/.test(value); }
function storyUsesDemoAudio(story){ return (story?.episodeList||[]).every(ep=>isDemoAudio(ep.audioSrc)); }
function hasProductionAudio(){ return state.stories.some(s=>(s.episodeList||[]).some(ep=>!isDemoAudio(ep.audioSrc))); }
function storyGradient(story){
  const map={
    'رعب':'linear-gradient(145deg,#23104b,#6d3df1 54%,#ec4899)',
    'جريمة':'linear-gradient(145deg,#071b34,#2563eb 54%,#22d3ee)',
    'حب':'linear-gradient(145deg,#351428,#ec4899 54%,#fb7185)',
    'واقعي':'linear-gradient(145deg,#231633,#8b5cf6 54%,#f472b6)',
    'بودكاست':'linear-gradient(145deg,#101b39,#2563eb 48%,#a855f7)',
    'أطفال':'linear-gradient(145deg,#17213d,#6366f1 50%,#22d3ee)'
  };
  return map[story?.genre] || 'linear-gradient(145deg,#1b1640,#7c3aed 54%,#ec4899)';
}
function safeCover(story, cls=''){
  if(!story) return `<img class="${cls}" src="assets/jazal-mark.svg?v=jazal-launch-v1" alt="شعار جزل" />`;
  return `<span class="cover-symbol" aria-hidden="true">${esc(story.emoji||'ج')}</span><img class="${cls}" src="${coverSrc(story)}" alt="غلاف ${esc(story.title)}" loading="lazy" onerror="this.style.display='none'" />`;
}
function formatSeconds(total){
  const value=Math.max(0,Math.round(Number(total)||0));
  const minutes=Math.floor(value/60); const seconds=String(value%60).padStart(2,'0');
  return `${minutes}:${seconds}`;
}
function currentAudioTime(){ return audioEl && Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : ((state.player.duration||0)*(state.player.progress||0)/100); }
function currentAudioDuration(){ return audioEl && Number.isFinite(audioEl.duration) && audioEl.duration>0 ? audioEl.duration : (state.player.duration||0); }

function storyCard(story, wide=false){
  const fav=isFav(story.id);
  return `<button class="library-card ${wide?'wide-library-card':''}" data-story="${story.id}">
    <div class="library-cover" style="background:${storyGradient(story)}">
      ${safeCover(story,'library-cover-img')}
      <span class="library-badge genre">${esc(story.genre)}</span>
      <span class="library-badge age">${esc(story.age)}</span>
    </div>
    <div class="library-info">
      <div class="library-title-row">
        <h3>${esc(story.title)}</h3>
        <span class="library-fav ${fav?'active':''}" data-fav="${story.id}" aria-label="حفظ">${fav?'♥':'♡'}</span>
      </div>
      <p>${esc(story.tag)} · ${storyEpisodeCount(story)} حلقة</p>
      <div class="library-meta">
        <span>★ ${esc(story.rating)}</span>
        <span>${esc(story.listens)}</span>
        <span>${story.free||0} مجاني</span>
      </div>
    </div>
  </button>`;
}

function chipsHTML(){ return `<div class="chips">${['الكل','رعب','جريمة','حب','واقعي','بودكاست','أطفال'].map(c=>`<button class="chip ${state.filter===c?'active':''}" data-filter="${c}">${c}</button>`).join('')}</div>`; }
function heroWave(){ return `<div class="wave-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>`; }

function homeView(){
  const stories=getPublicStories();
  const featured=stories.find(s=>s.featured)||stories[0];
  const firstEpisode=featured?.episodeList?.[0];
  const recentStories=state.recent.map(getStory).filter(s=>s&&s.published!==false).slice(0,4);
  return `<section class="home-hero premium-hero">
    <div class="orbit o1"></div><div class="orbit o2"></div><div class="halo"></div>
    <div class="hero-topline"><span class="live-chip"><span class="pulse"></span>اختيار اليوم</span><span>بودكاست وقصص صوتية</span></div>
    <div class="hero-card glass-card">
      <div class="hero-featured">
        <div class="hero-copy">
          <span class="hero-kicker">جَزَل ORIGINALS · ${esc(featured?.genre||'قصة صوتية')}</span>
          <h1>${esc(featured?.title||'جَزَل')}</h1>
          <p>${esc(featured?.desc||'اسمع القصة للآخر')}</p>
          <div class="hero-actions">
            <button class="primary" data-play-episode="${featured?.id||''}|${firstEpisode?.id||''}">▶ ابدأ الاستماع</button>
            <button class="secondary" data-story="${featured?.id||''}">التفاصيل</button>
          </div>
        </div>
        <div class="hero-art" style="background:${storyGradient(featured)}">
          ${safeCover(featured,'')}
          <button class="hero-play" data-play-episode="${featured?.id||''}|${firstEpisode?.id||''}" aria-label="تشغيل">${state.player.playing&&state.player.storyId===featured?.id?'Ⅱ':'▶'}</button>
        </div>
      </div>
    </div>
  </section>
  ${!hasProductionAudio() && !state.firebase.live?`<div class="panel-card preview-banner"><b>معاينة المحتوى</b><p class="muted" style="margin:6px 0 0">الحلقات الحالية تستخدم صوتاً تجريبياً للعرض. ارفع MP3 حقيقي من استوديو الإدارة بعد تفعيل حساب الأدمن.</p></div>`:''}
  <section class="section"><div class="section-head"><h2>اكتشف جَزَل</h2><button data-view="library">عرض الكل</button></div><div class="feature-strip">
    <button class="feature" data-view="fm"><span>◉</span><b>جَزَل FM</b><small>بث مباشر</small></button>
    <button class="feature" data-filter="رعب"><span>☾</span><b>رعب</b><small>قصص ليلية</small></button>
    <button class="feature" data-filter="جريمة"><span>⌁</span><b>جريمة</b><small>تحقيق وتشويق</small></button>
    <button class="feature" data-view="submit"><span>✎</span><b>قصتك</b><small>احچيها إلنا</small></button>
  </div></section>
  <section class="section"><div class="section-head"><h2>تابع الاستماع</h2><button data-view="player">فتح المشغل</button></div><div class="continue-card panel-card"><button class="play-orb small" data-mini-toggle aria-label="تشغيل أو إيقاف">${state.player.playing?'Ⅱ':'▶'}</button><div class="continue-body"><span class="soon">آخر تشغيل</span><h3>${esc(state.player.title)}</h3><p>${esc(state.player.subtitle)}</p><div class="progress"><span style="width:${state.player.progress}%"></span></div></div></div></section>
  <section class="section"><div class="section-head"><h2>الأكثر استماعاً</h2><button data-view="library">المكتبة</button></div><div class="grid">${stories.slice(0,4).map(s=>storyCard(s)).join('')}</div></section>
  <section class="section"><div class="section-head"><h2>نكمل من وين وقفت</h2><span class="soon">محفوظ</span></div><div class="horizontal-list">${recentStories.map(s=>storyCard(s,true)).join('') || `<div class="empty">بعدك ما شغلت قصص.</div>`}</div></section>`;
}

function libraryView(){
  const q=state.query.trim();
  const stories=getPublicStories();
  const filtered=stories.filter(s=>(state.filter==='الكل'||s.genre===state.filter)&&(!q||(s.title+s.genre+s.desc+s.tag).includes(q)));
  return `<h1 class="page-title">المكتبة</h1><p class="page-subtitle">كل القصص والحلقات من لوحة الإدارة. أول الحلقات مجانية والباقات قريباً.</p>
  <div class="search-box"><span>⌕</span><input id="searchInput" value="${esc(state.query)}" placeholder="ابحث عن قصة، رعب، جريمة، بودكاست" /></div>${chipsHTML()}
  <div class="library-count">${filtered.length} عمل متاح</div><section class="section"><div class="grid">${filtered.map(storyCard).join('') || `<div class="empty">ماكو نتائج، جرّب كلمة ثانية.</div>`}</div></section>`;
}

function detailView(storyId){
  const story=getStory(storyId);
  if(!story || (story.published===false && !isAdmin())){
    return `<h1 class="page-title">غير متاح</h1><p class="page-subtitle">هذه القصة مخفية أو غير موجودة.</p><div class="cta-row"><button class="primary" data-view="library">عودة للمكتبة</button></div>`;
  }
  updateRecent(story.id);
  const episodes=story.episodeList||[];
  return `<section class="detail-hero"><div class="cover cover-art" style="background:${storyGradient(story)}">${safeCover(story,'cover-img')}</div><div class="detail-content"><span class="live-chip">${esc(story.genre)} · ★ ${esc(story.rating)} · ${esc(story.age)}</span><h1>${esc(story.title)}</h1><p>${esc(story.desc)}</p></div></section>
  <div class="detail-meta panel-card"><div><strong>${episodes.length}</strong><small>حلقة</small></div><div><strong>${esc(story.duration)}</strong><small>مدة كلية</small></div><div><strong>${esc(story.listens)}</strong><small>استماع</small></div></div>
  <div class="cta-row"><button class="primary" data-play-episode="${story.id}|${episodes[0]?.id||''}">▶ تشغيل من البداية</button><button class="secondary" data-fav="${story.id}">${isFav(story.id)?'♥ محفوظ':'♡ حفظ'}</button><button class="secondary" data-share-story="${story.id}">مشاركة</button></div>
  <section class="section"><div class="section-head"><h2>الحلقات</h2><span class="soon">${story.free||0} مجانية</span></div><div class="panel-card episodes-card">
  ${episodes.map((ep,i)=>{ const active=state.player.storyId===story.id&&state.player.episodeId===ep.id; return `<div class="episode ${active?'episode-active':''}"><button class="episode-index" data-play-episode="${story.id}|${ep.id}">${i+1}</button><div><h4>${esc(ep.title)}${active?' · الآن':''}</h4><p>${esc(ep.duration)} · ${ep.free?'مجانية':'تفتح عند تفعيل الباقات'}${isDemoAudio(ep.audioSrc)?' · معاينة صوتية':' · صوت خاص'}</p></div>${ep.free?`<button class="tiny-btn" data-play-episode="${story.id}|${ep.id}">${active?'مشغّل':'تشغيل'}</button>`:`<span class="lock">قريباً</span>`}</div>`; }).join('') || `<div class="empty">ماكو حلقات بعد.</div>`}
  </div></section><section class="section"><div class="section-head"><h2>قد يعجبك أيضاً</h2></div><div class="grid">${getPublicStories().filter(s=>s.id!==story.id).slice(0,2).map(storyCard).join('')}</div></section>`;
}

function playerView(){
  const story=getStory(state.player.storyId);
  const artwork=story?coverSrc(story):'assets/jazal-mark.svg?v=jazal-launch-v1';
  const backView=story?`detail:${story.id}`:'home';
  const duration=currentAudioDuration();
  const elapsed=currentAudioTime();
  const hasPrev=state.player.kind==='episode'&&!!getPrevEpisode(state.player.storyId,state.player.episodeId);
  const hasNext=state.player.kind==='episode'&&!!getNextEpisode(state.player.storyId,state.player.episodeId);
  return `<section class="player-page"><div class="player-stage ${state.player.playing?'':'paused'}">
    <div class="player-top"><button class="tiny-btn" data-view="${backView}">رجوع</button><span>${state.player.kind==='fm'?'بث مباشر':'قيد التشغيل'}</span><button class="tiny-btn" ${story?`data-share-story="${story.id}"`:'data-share-app'}>مشاركة</button></div>
    <div class="player-art"><div class="player-art-ring" style="background:${storyGradient(story)}"><img src="${artwork}" alt="غلاف التشغيل" onerror="this.src='assets/jazal-mark.svg?v=jazal-launch-v1'" /></div></div>
    <div class="player-info"><small>${state.player.kind==='fm'?'جَزَل FM مباشر':isDemoAudio(state.player.audioSrc)?'معاينة صوتية · '+esc(story?.genre||'جَزَل'):esc(story?.genre||'جَزَل')}</small><h1>${esc(state.player.title||'جَزَل')}</h1><p>${esc(state.player.subtitle||'اسمع القصة للآخر')}</p></div>
    <div class="player-progress"><div class="progress"><span style="width:${state.player.progress||0}%"></span></div><div class="player-time"><span data-player-elapsed>${state.player.kind==='fm'?'LIVE':formatSeconds(elapsed)}</span><span data-player-duration>${state.player.kind==='fm'?'جَزَل FM':formatSeconds(duration)}</span></div></div>
    <div class="player-controls"><button class="player-control" data-play-prev ${hasPrev?'':'disabled'}>⏮</button><button class="player-control" data-seek="-10">-10</button><button class="player-main" data-mini-toggle>${state.player.playing?'Ⅱ':'▶'}</button><button class="player-control" data-seek="10">+10</button><button class="player-control" data-play-next ${hasNext?'':'disabled'}>⏭</button></div>
    <div class="player-secondary-row"><button data-speed>${state.player.speed||'1x'} سرعة</button>${story?`<button data-fav="${story.id}">${isFav(story.id)?'♥ محفوظ':'♡ حفظ'}</button>`:'<button data-view="fm">جدول البث</button>'}</div>
  </div></section>`;
}

function fmView(){
  return `<h1 class="page-title">جَزَل FM</h1><p class="page-subtitle">بث صوتي مباشر للحلقات والبرامج اليومية. يمكن تغيير رابط البث من لوحة الإدارة.</p>
  <section class="live-card"><span class="live-chip"><span class="pulse"></span>${state.fm.live?'مباشر الآن':'متوقف حالياً'}</span><h2>${esc(state.fm.title)}</h2><p>${esc(state.fm.note)}<br>المقدم: ${esc(state.fm.host)}</p><div class="listener-pill">● ${state.fm.listeners} مستمع الآن</div><div class="player-dial"><button class="playbig" data-play-fm>${state.player.playing&&state.player.kind==='fm'?'Ⅱ':'▶'}</button></div><div class="progress"><span style="width:${state.player.kind==='fm'?state.player.progress:42}%"></span></div></section>
  <section class="section"><div class="section-head"><h2>جدول اليوم</h2><span class="soon">تجريبي</span></div><div class="panel-card">${state.schedule.map(item=>`<div class="episode schedule-row"><div class="episode-index">${item.time.slice(0,2)}</div><div><h4>${esc(item.title)}</h4><p>${esc(item.time)} · ${esc(item.host)}<br>${esc(item.desc)}</p></div><button class="tiny-btn" data-remind="${esc(item.title)}">ذكّرني</button></div>`).join('')}</div></section>`;
}

function submitView(){
  return `<h1 class="page-title">احچي قصتك</h1><p class="page-subtitle">دز قصتك، وإذا كانت مناسبة نحولها لحلقة صوتية على جزل. الاسم والرقم اختياري.</p>
  <form class="form-card" id="storyForm"><div class="field"><label>عنوان القصة</label><input name="title" required placeholder="مثال: آخر مكالمة" /></div><div class="field"><label>نوع القصة</label><select name="genre"><option>واقعي</option><option>رعب</option><option>جريمة</option><option>حب</option><option>بودكاست</option></select></div><div class="field"><label>قصتك</label><textarea name="body" required placeholder="اكتب القصة هنا..."></textarea></div><div class="field"><label>اسمك أو لقبك اختياري</label><input name="name" placeholder="مستمع جزل" /></div><div class="field"><label>واتساب اختياري</label><input name="phone" placeholder="07xx xxx xxxx" /></div><button class="primary" type="submit" style="width:100%">إرسال القصة</button></form>
  <section class="section"><div class="section-head"><h2>قصصك المرسلة</h2><span>${state.mySubmissions.length}</span></div>${state.mySubmissions.length?`<div class="admin-list">${state.mySubmissions.slice().reverse().map((s)=>`<div class="admin-item"><strong>${esc(s.title)}</strong><small>${esc(s.genre)} · ${esc(s.status||'قيد المراجعة')} · ${esc(s.name||'بدون اسم')}</small></div>`).join('')}</div>`:`<div class="empty">بعدك ما مرسل قصة.</div>`}</section>`;
}

function plansView(){ return `<h1 class="page-title">الباقات</h1><p class="page-subtitle">الاشتراكات حالياً <b class="gold">قريباً</b>. نخلي الصفحة جاهزة حتى من نفعّل الدفع تنضاف بدون تغيير كبير.</p><div class="plan active-plan"><div class="row"><h3>مجاني</h3><span class="soon">مفعل</span></div><ul><li>تشغيل الحلقات المجانية</li><li>جزل FM مباشر</li><li>إرسال قصتك</li></ul></div><div class="plan"><div class="row"><h3>شهري</h3><span class="soon">قريباً</span></div><ul><li>كل الحلقات</li><li>بدون إعلانات</li><li>مسلسلات جزل Originals</li></ul></div><div class="plan"><div class="row"><h3>VIP</h3><span class="soon">قريباً</span></div><ul><li>حلقات قبل الجميع</li><li>بث خاص</li><li>محتوى حصري</li></ul></div>`; }

function aboutView(){ return `<h1 class="page-title">عن جزل</h1><p class="page-subtitle">جزل منصة بودكاست وقصص صوتية عراقية، تجمع الحكايات، المسلسلات، البث المباشر، وقصص الجمهور بصوت واحد.</p><div class="legal-card"><h2>الفكرة</h2><p>نحوّل القصص إلى تجربة صوتية سهلة، سريعة، وتبقى وياك حتى بعد قفل شاشة الموبايل.</p><ul><li>بودكاست وقصص صوتية</li><li>جزل FM مباشر</li><li>قصص جمهور قابلة للتحويل لحلقات</li><li>باقات قريباً</li></ul></div><div class="cta-row"><button class="primary" data-view="library">ابدأ الاستماع</button><button class="secondary" data-view="support">تواصل ويانا</button></div>`; }
function privacyView(){ return `<h1 class="page-title">سياسة الخصوصية</h1><p class="page-subtitle">نسخة أولية لمرحلة الإطلاق التجريبي.</p><div class="legal-card"><h2>البيانات</h2><p>قد نحفظ بيانات بسيطة مثل القصص المرسلة من المستخدم، حالة المفضلة، وسجل التشغيل على الجهاز أو Firebase عند استخدام الإدارة.</p><h2>قصص الجمهور</h2><p>أي قصة ترسلها عبر “احچي قصتك” تُستخدم للمراجعة وقد تُحوّل إلى محتوى بعد الموافقة والتحرير.</p><h2>الحسابات</h2><p>حسابات الإدارة تستخدم Firebase Authentication ولا نطلب مفاتيح خاصة من المستخدمين.</p><h2>التواصل</h2><p>لأي حذف أو تعديل محتوى، راسلنا من صفحة الدعم.</p></div>`; }
function termsView(){ return `<h1 class="page-title">شروط الاستخدام</h1><p class="page-subtitle">استخدام جزل يعني قبول هذه الشروط الأولية.</p><div class="legal-card"><h2>المحتوى</h2><p>المحتوى التجريبي داخل التطبيق للعرض والتطوير، ولا يمثل إطلاقاً تجارياً نهائياً.</p><h2>الإرسال</h2><p>عند إرسال قصة، تؤكد أنها تخصك أو لديك حق مشاركتها، وأنها لا تحتوي إساءة أو معلومات حساسة عن أشخاص بدون إذن.</p><h2>الباقات</h2><p>الباقات والاشتراكات حالياً “قريباً” ولا يوجد دفع فعلي داخل النسخة الحالية.</p><h2>الإدارة</h2><p>لوحة الإدارة مخصصة لفريق جزل فقط.</p></div>`; }
function supportView(){ return `<h1 class="page-title">تواصل ودعم</h1><p class="page-subtitle">للشكاوى، الدعم، التعاون، أو اقتراح قصة.</p><div class="support-card"><b>دعم جَزَل</b><p class="muted">فريق جَزَل جاهز يساعدك بالمحتوى، التقنية، أو التعاون.</p><div class="support-links"><a class="support-link" href="mailto:support@jazal.app"><div><b>البريد الإلكتروني</b><small>support@jazal.app</small></div><span>‹</span></a><button class="support-link" data-share-app><div><b>مشاركة التطبيق</b><small>أرسل رابط جَزَل لصديق</small></div><span>‹</span></button><button class="support-link" data-view="submit"><div><b>اقترح قصة</b><small>احچي قصتك من داخل التطبيق</small></div><span>‹</span></button></div></div><div class="legal-links"><button data-view="about">عن جَزَل</button><button data-view="privacy">الخصوصية</button><button data-view="terms">الشروط</button></div>`; }

function accountView(){
  const favStories=state.favorites.map(getStory).filter(Boolean);
  return `<div class="logo-lockup">${logoIcon()}<h2>جَزَل</h2><p>بودكاست وقصص صوتية</p></div><div class="panel-card profile-card"><div class="row"><div><h2 style="margin:0">${esc(state.user.name)}</h2><p class="muted" style="margin:6px 0 0">استمع القصة للآخر · حساب مجاني</p></div><span class="soon">مجاني</span></div><div class="stats" style="margin-top:16px"><div class="stat"><strong>${getPublicStories().length}</strong><small>أعمال متاحة</small></div><div class="stat"><strong>${state.favorites.length}</strong><small>محفوظات</small></div><div class="stat"><strong>${state.mySubmissions.length}</strong><small>قصص مرسلة</small></div></div></div>
  <div class="panel-card background-audio-card"><div class="row"><div><b>تشغيل بالخلفية</b><p class="muted" style="margin:6px 0 0">بعد ما تضغط تشغيل، الصوت يبقى شغال إذا قفلت شاشة الموبايل وتظهر أزرار التشغيل بالقفل.</p></div><span class="soon">مفعّل</span></div></div>
  <div class="panel-card"><div class="row"><div><b>المزامنة السحابية</b><p class="muted" style="margin:6px 0 0">المحتوى محفوظ ومحدّث عبر لوحة الإدارة.</p></div><span class="soon">مفعّلة</span></div></div>
  <div class="cta-row"><button class="secondary" data-install>تثبيت التطبيق</button><button class="secondary" data-share-app>مشاركة</button><button class="secondary" data-view="support">الدعم</button></div><div class="install-guide panel-card"><b>ثبّت جزل على الآيفون</b><p class="muted">افتح الرابط من Safari ثم اضغط مشاركة → إضافة إلى الشاشة الرئيسية حتى يصير مثل تطبيق.</p></div><div class="admin-gate panel-card"><div class="row"><div><b>استوديو الإدارة</b><p class="muted" style="margin:6px 0 0">الدخول مخصص لفريق جزل فقط.</p></div><button class="tiny-btn" data-view="admin">فتح</button></div></div>
  <section class="section"><div class="section-head"><h2>المحفوظات</h2><span>${favStories.length}</span></div><div class="grid">${favStories.length?favStories.slice(0,4).map(storyCard).join(''):`<div class="empty">احفظ أعمالك المفضلة من المكتبة.</div>`}</div></section>`;
}

function adminTabs(){ const tabs=[['overview','نظرة'],['content','المحتوى'],['episodes','الحلقات'],['fm','FM'],['schedule','الجدول'],['submissions','الجمهور'],['firebase','Firebase'],['backup','نسخ']]; return `<div class="tabs admin-tabs">${tabs.map(([id,label])=>`<button class="tab ${state.admin.tab===id?'active':''}" data-admin-tab="${id}">${label}</button>`).join('')}</div>`; }
function adminView(){
  const tab=state.admin.tab||'overview';
  if(!isAdmin() && tab !== 'firebase'){
    const signedInNoAdmin = state.firebase.signedIn && !state.firebase.isAdmin;
    return `<h1 class="page-title">استوديو جزل</h1><p class="page-subtitle">لوحة الإدارة محمية بصلاحية Firebase Admin Custom Claim.</p><div class="admin-lock panel-card"><b>دخول الإدارة</b><p class="muted">${signedInNoAdmin?'تم تسجيل الدخول لكن هذا الحساب ليس أدمن. اطلب تفعيل claim admin من Firebase Console.':'المحتوى يبقى للقراءة العامة، أما التعديل والحذف والرفع إلى Firebase فيحتاج حساب أدمن مع صلاحية admin.'}</p></div>${adminTabs()}${adminTabView('firebase')}`;
  }
  return `<h1 class="page-title">استوديو جزل</h1><p class="page-subtitle">استوديو إدارة محمي — المحتوى، الحلقات، FM، والجمهور مرتب للانطلاق.</p>${adminTabs()}${adminTabView(tab)}`;
}
function adminTabView(tab){
if(tab==='overview') return `<div class="stats"><div class="stat"><strong>${state.stories.length}</strong><small>أعمال</small></div><div class="stat"><strong>${state.stories.reduce((a,s)=>a+(s.episodeList?.length||0),0)}</strong><small>حلقات</small></div><div class="stat"><strong>${state.submissions.length}</strong><small>قصص جمهور</small></div></div><div class="panel-card sync-card"><div class="row"><div><b>Firebase Live</b><p class="muted" style="margin:6px 0 0">${state.firebase.live?'متصل بـ Firestore — التغييرات تنتشر لكل المستخدمين':'جاهز للمزامنة — ارفع المحتوى من Firebase بعد الدخول كأدمن'}${state.firebase.error?' · '+esc(state.firebase.error):''}</p></div><span class="soon">${isAdmin()?'أدمن':'قراءة عامة'}</span></div></div><div class="cta-row"><button class="primary" data-admin-tab="content">إضافة قصة</button><button class="secondary" data-admin-tab="firebase">Firebase</button></div>`;
  if(tab==='content') return `<div class="panel-card"><b>رفع المحتوى الحقيقي</b><p class="muted" style="margin:6px 0 0">ارفع MP3 لكل حلقة من هنا أو من تبويب الحلقات. الملف <code>jazal-demo.mp3</code> للاختبار فقط ولا يُعرض كمحتوى نهائي للمستخدمين بعد رفع الصوت الحقيقي.</p></div><div class="form-card"><h2 style="margin-top:0">إضافة قصة / مسلسل</h2><form id="addStoryForm"><div class="field"><label>العنوان</label><input name="title" required placeholder="اسم القصة" /></div><div class="field"><label>التصنيف</label><select name="genre"><option>رعب</option><option>جريمة</option><option>حب</option><option>واقعي</option><option>بودكاست</option><option>أطفال</option></select></div><div class="field"><label>إيموجي الغلاف</label><input name="emoji" value="🎧" /></div><div class="field"><label>وسم قصير</label><input name="tag" value="جزل Originals" /></div><div class="field"><label>الوصف</label><textarea name="desc" required placeholder="اكتب وصف مختصر وجذاب"></textarea></div><div class="field"><label>عنوان أول حلقة</label><input name="episodeTitle" value="الحلقة الأولى" /></div><div class="field"><label>رابط MP3 لأول حلقة اختياري</label><input name="audioSrc" placeholder="https://.../episode.mp3" /></div><div class="field"><label>أو ارفع ملف MP3</label><input name="audioFile" type="file" accept="audio/*" /></div><label class="switch-row"><input type="checkbox" name="published" checked /> منشور للجمهور</label><button class="primary" type="submit" style="width:100%">إضافة للمكتبة</button></form></div><section class="section"><div class="section-head"><h2>المحتوى الحالي</h2><span>${state.stories.length}</span></div><div class="admin-list">${state.stories.map(s=>`<div class="admin-item"><strong>${esc(s.title)}</strong><small>${esc(s.genre)} · ${storyEpisodeCount(s)} حلقة · ${s.featured?'اختيار اليوم · ':''}${s.published===false?'مخفي':'منشور'}</small><div class="admin-actions"><button class="tiny-btn" data-edit-story="${s.id}">تعديل</button><button class="tiny-btn" data-featured-story="${s.id}">اختيار اليوم</button><button class="tiny-btn" data-toggle-publish="${s.id}">${s.published===false?'نشر':'إخفاء'}</button><button class="tiny-btn" data-delete-story="${s.id}">حذف</button></div></div>`).join('')}</div></section>`;
  if(tab==='episodes') return `<div class="form-card"><h2 style="margin-top:0">إضافة حلقة لقصة موجودة</h2><form id="addEpisodeForm"><div class="field"><label>اختر القصة</label><select name="storyId">${state.stories.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join('')}</select></div><div class="field"><label>عنوان الحلقة</label><input name="title" required placeholder="اسم الحلقة" /></div><div class="field"><label>مدة الحلقة</label><input name="duration" value="10:00" /></div><div class="field"><label>رابط MP3 اختياري</label><input name="audioSrc" placeholder="اتركه فارغ للصوت التجريبي" /></div><div class="field"><label>أو ارفع ملف MP3</label><input name="audioFile" type="file" accept="audio/*" /></div><label class="switch-row"><input type="checkbox" name="free" checked /> مجانية حالياً</label><button class="primary" type="submit" style="width:100%">إضافة الحلقة</button></form></div><section class="section"><div class="section-head"><h2>إدارة الحلقات</h2></div><div class="admin-list">${state.stories.map(s=>`<div class="admin-item"><strong>${esc(s.title)}</strong><small>${storyEpisodeCount(s)} حلقة</small>${(s.episodeList||[]).map((ep,i)=>`<div class="episode admin-episode"><div class="episode-index">${i+1}</div><div><h4>${esc(ep.title)}</h4><p>${esc(ep.duration)} · ${ep.free?'مجانية':'مقفلة'}${ep.audioSrc&&ep.audioSrc!==DEMO_AUDIO_SRC?' · MP3':' · Demo'}</p></div><div class="admin-actions"><button class="tiny-btn" data-move-episode="${s.id}|${ep.id}|up" ${i===0?'disabled':''}>↑</button><button class="tiny-btn" data-move-episode="${s.id}|${ep.id}|down" ${i===(s.episodeList.length-1)?'disabled':''}>↓</button><button class="tiny-btn" data-edit-episode="${s.id}|${ep.id}">تعديل</button><button class="tiny-btn" data-delete-episode="${s.id}|${ep.id}">حذف</button></div></div>`).join('')}</div>`).join('')}</div></section>`;
  if(tab==='fm') return `<div class="form-card"><h2 style="margin-top:0">تحديث جزل FM</h2><form id="fmForm"><div class="field"><label>اسم البرنامج الحالي</label><input name="title" value="${esc(state.fm.title)}" /></div><div class="field"><label>المقدم</label><input name="host" value="${esc(state.fm.host)}" /></div><div class="field"><label>ملاحظة البث</label><textarea name="note">${esc(state.fm.note)}</textarea></div><div class="field"><label>رابط البث / MP3 اختياري</label><input name="streamUrl" value="${esc(state.fm.streamUrl||'')}" placeholder="https://.../stream.mp3" /></div><label class="switch-row"><input type="checkbox" name="live" ${state.fm.live?'checked':''}/> مباشر الآن</label><button class="primary" type="submit" style="width:100%">حفظ FM</button></form></div>`;
  if(tab==='schedule') return `<div class="form-card"><h2 style="margin-top:0">إضافة موعد إلى جدول FM</h2><form id="scheduleForm"><div class="field"><label>الوقت</label><input name="time" value="08:00 مساءً" required /></div><div class="field"><label>عنوان البرنامج</label><input name="title" placeholder="ليالي جزل" required /></div><div class="field"><label>المقدم</label><input name="host" value="ستوديو جزل" /></div><div class="field"><label>الوصف</label><textarea name="desc" placeholder="وصف مختصر للموعد"></textarea></div><button class="primary" type="submit" style="width:100%">إضافة للجدول</button></form></div><section class="section"><div class="section-head"><h2>جدول اليوم</h2><span>${state.schedule.length}</span></div><div class="admin-list">${state.schedule.map((item,i)=>`<div class="admin-item"><strong>${esc(item.title)}</strong><small>${esc(item.time)} · ${esc(item.host)}<br>${esc(item.desc)}</small><button class="tiny-btn" data-delete-schedule="${i}">حذف الموعد</button></div>`).join('')}</div></section>`;
  if(tab==='submissions') return `<section class="section"><div class="section-head"><h2>قصص الجمهور</h2><span>${state.submissions.length}</span></div>${state.submissions.length?`<div class="admin-list">${state.submissions.slice().reverse().map((s,i)=>`<div class="admin-item"><strong>${esc(s.title)}</strong><small>${esc(s.genre)} · ${esc(s.status||'قيد المراجعة')}<br>${esc(s.body).slice(0,110)}...</small><div class="admin-actions"><button class="tiny-btn" data-convert-submission="${state.submissions.length-1-i}">تحويل لقصة</button><button class="tiny-btn" data-mark-submission="${state.submissions.length-1-i}|مقبولة">قبول</button><button class="tiny-btn" data-mark-submission="${state.submissions.length-1-i}|مرفوضة">رفض</button></div></div>`).join('')}</div>`:`<div class="empty">ماكو قصص مرسلة بعد.</div>`}</section>`;
  if(tab==='firebase') return `<div class="panel-card firebase-status-card"><div class="row"><div><b>حالة Firebase</b><p class="muted" style="margin:6px 0 0">Project: ${esc(state.firebase.projectId)}<br>الحالة: ${state.firebase.live?'متصل مباشر':'جاهز للمزامنة'}<br>${isAdmin()?'أدمن: '+esc(state.firebase.authEmail):state.firebase.signedIn?'مسجل بدون claim admin':'غير داخل'}${state.firebase.error?'<br>تنبيه: '+esc(state.firebase.error):''}</p></div><span class="soon">Live</span></div><div class="cta-row cloud-quick-actions"><button class="primary" data-cloud-seed ${isAdmin()?'':'disabled'}>رفع البيانات الحالية إلى Firebase</button><button class="secondary" data-cloud-refresh>سحب آخر بيانات</button></div><p class="muted tiny-note">الكتابة على Firestore/Storage تحتاج Custom Claim <code>admin: true</code>. استخدم <code>firebase/set-admin-claim.js</code> مرة واحدة من Firebase Console.</p></div>
  <div class="form-card"><h2 style="margin-top:0">دخول الإدارة</h2>${isAdmin()?`<p class="muted">أنت داخل حالياً كأدمن. أي تعديل على القصص أو FM ينحفظ في Firestore.</p><button class="secondary" type="button" data-signout style="width:100%">تسجيل خروج</button>`:`<form id="loginForm"><div class="field"><label>إيميل الأدمن</label><input name="email" type="email" placeholder="admin@jazal.app" required autocomplete="username" /></div><div class="field"><label>كلمة السر</label><input name="password" type="password" placeholder="••••••••" required autocomplete="current-password" /></div><button class="primary" type="submit" style="width:100%">دخول الأدمن</button></form><p class="muted tiny-note">إنشاء حسابات الأدمن يتم من Firebase Authentication Console فقط، ثم تفعيل claim admin عبر السكربت.</p>`}</div>
  <div class="panel-card"><b>مزامنة المحتوى</b><p class="muted">من بعد الدخول كأدمن، اضغط رفع البيانات حتى ننشئ مستند Firestore الأول إذا كان فارغ.</p><div class="cta-row"><button class="primary" data-cloud-seed ${isAdmin()?'':'disabled'}>رفع البيانات الحالية إلى Firebase</button><button class="secondary" data-cloud-refresh>سحب آخر بيانات</button></div></div>
  <div class="form-card"><h2 style="margin-top:0">Firestore Rules</h2><p class="muted">انسخها في Firestore Database → Rules. ملف جاهز: <code>firebase/firestore.rules</code></p><textarea id="rulesBox" class="backup-box" readonly>${esc(FIRESTORE_RULES_TEXT)}</textarea><button class="secondary" type="button" data-copy-rules style="width:100%;margin-top:10px">نسخ القواعد</button></div>
  <div class="form-card"><h2 style="margin-top:0">Storage Rules</h2><p class="muted">انسخها في Firebase Storage → Rules. ملف جاهز: <code>firebase/storage.rules</code></p><textarea id="storageRulesBox" class="backup-box" readonly>${esc(STORAGE_RULES_TEXT)}</textarea><button class="secondary" type="button" data-copy-storage-rules style="width:100%;margin-top:10px">نسخ Storage Rules</button></div>`;
  if(tab==='backup') return `<div class="form-card"><h2 style="margin-top:0">نسخ احتياطي</h2><div class="cta-row"><button class="primary" data-export>تصدير JSON</button><button class="secondary" data-import>استيراد من الصندوق</button></div><div class="field"><label>صندوق JSON</label><textarea id="backupBox" class="backup-box" placeholder="الصق النسخة الاحتياطية هنا للاستيراد"></textarea></div></div><button class="danger" data-reset style="width:100%;margin-top:10px">تصفير البيانات التجريبية</button>`;
  return '';
}


function cloudContentPayload(){
  return {
    stories: normalizeStories(structured(state.stories)),
    contentVersion: APP_VERSION,
    fm: structured(state.fm),
    schedule: structured(state.schedule),
    version: APP_VERSION,
    updatedAt: new Date().toISOString()
  };
}
function prettyFireError(err){
  const msg = err?.message || String(err || '');
  if(msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) return 'صلاحيات Firestore تحتاج Rules أو دخول أدمن';
  if(msg.includes('auth/')) return msg.replace('Firebase: ','');
  return msg.slice(0,140);
}
function applyCloudContent(data){
  if(!data) return;
  applyingCloud = true;
  const isV14 = [APP_VERSION,'jazal-v14-final-content-sync','jazal-v15-admin-sync-fix','jazal-v16-public-polish-covers','jazal-final-master','jazal-final-ui-font-audio-complete','jazal-final-master-clean-cards-v1'].includes(data.version) || [APP_VERSION,'jazal-v14-final-content-sync','jazal-v15-admin-sync-fix','jazal-v16-public-polish-covers','jazal-final-master','jazal-final-ui-font-audio-complete','jazal-final-master-clean-cards-v1'].includes(data.contentVersion);
  if(isV14 && Array.isArray(data.stories) && data.stories.length) state.stories = normalizeStories(data.stories);
  if(!isV14){
    state.stories = structured(baseStories);
    state.contentVersion = 'jazal-final-ui-font-audio-complete';
    state.firebase.cloudStatus = 'Firebase متصل — محتوى جزل النهائي محلي، ارفعه من الإدارة';
  }
  if(data.fm) state.fm = merge(structured(defaultState.fm), data.fm);
  if(Array.isArray(data.schedule) && data.schedule.length) state.schedule = data.schedule;
  state.firebase.live = true;
  state.firebase.mode = 'firebase';
  if(isV14) state.firebase.cloudStatus = 'متصل';
  state.firebase.error = '';
  state.firebase.lastSync = new Date().toISOString();
  save();
  applyingCloud = false;
  render();
}
function initFirebaseLive(){
  try{
    fbApp = initializeApp(firebaseConfig);
    db = getFirestore(fbApp);
    auth = getAuth(fbApp);
    storage = getStorage(fbApp);
    contentRef = doc(db, 'jazal', 'content');
    submissionsCol = collection(db, 'submissions');
    state.firebase.mode = 'firebase';
    state.firebase.projectId = firebaseConfig.projectId;
    state.firebase.authDomain = firebaseConfig.authDomain;
    save();
    onAuthStateChanged(auth, async user => {
      firebaseUser = user;
      state.firebase.signedIn = !!user;
      state.firebase.authEmail = user?.email || '';
      await syncAdminClaim(user);
      bindSubmissionsListener();
      save();
      render();
    });
    unsubContent = onSnapshot(contentRef, snap => {
      if(snap.exists()) applyCloudContent(snap.data());
      else { state.firebase.live = false; state.firebase.cloudStatus = 'Firestore فارغ — ارفع البيانات من لوحة الإدارة'; save(); render(); }
    }, err => { state.firebase.error = prettyFireError(err); save(); render(); });
  }catch(err){ state.firebase.error = prettyFireError(err); save(); }
}
async function syncAdminClaim(user){
  if(!user){ state.firebase.isAdmin = false; return; }
  try{
    const token = await user.getIdTokenResult(true);
    state.firebase.isAdmin = token.claims.admin === true;
  }catch(err){
    state.firebase.isAdmin = false;
    state.firebase.error = prettyFireError(err);
  }
}
function bindSubmissionsListener(){
  if(unsubSubmissions){ unsubSubmissions(); unsubSubmissions = null; }
  if(!isAdmin() || !submissionsCol) return;
  unsubSubmissions = onSnapshot(submissionsCol, snap => {
    const remote = snap.docs.map(d => ({docId:d.id, ...d.data()})).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    state.submissions = remote;
    state.firebase.live = true;
    state.firebase.error = '';
    save();
    render();
  }, err => { state.firebase.error = prettyFireError(err); save(); render(); });
}
async function pushCloud(showToast=false){
  if(applyingCloud || !contentRef) return;
  if(!requireAdmin('رفع البيانات')) return;
  try{
    await setDoc(contentRef, {...cloudContentPayload(), updatedAtServer: serverTimestamp()}, {merge:true});
    state.firebase.live = true;
    state.firebase.error = '';
    state.firebase.lastSync = new Date().toISOString();
    save();
    if(showToast) toast('تم رفع بيانات جزل إلى Firebase');
  }catch(err){ state.firebase.error = prettyFireError(err); save(); if(showToast) toast(state.firebase.error); else console.warn(err); }
}
function cloudSaveSoon(reason='update'){
  if(!contentRef || applyingCloud || !isAdmin()) return;
  clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(()=>pushCloud(false), 650);
}
async function pullCloudOnce(){
  if(!contentRef) return toast('Firebase غير مهيأ');
  try{ const snap=await getDoc(contentRef); if(snap.exists()) { applyCloudContent(snap.data()); toast('تم سحب آخر بيانات من Firebase'); } else toast('Firestore فارغ، اضغط رفع البيانات'); }
  catch(err){ toast(prettyFireError(err)); }
}
async function loginAdmin(e){
  e.preventDefault();
  const f = new FormData(e.target);
  try{
    await signInWithEmailAndPassword(auth, f.get('email'), f.get('password'));
    await syncAdminClaim(auth.currentUser);
    if(!isAdmin()){
      await signOut(auth);
      toast('هذا الحساب ليس أدمن. فعّل claim admin من Firebase Console.');
      return;
    }
    bindSubmissionsListener();
    toast('تم دخول الأدمن');
  }
  catch(err){ toast(prettyFireError(err)); }
}
async function logoutAdmin(){
  try{
    await signOut(auth);
    state.firebase.isAdmin = false;
    bindSubmissionsListener();
    toast('تم تسجيل الخروج');
  }catch(err){ toast(prettyFireError(err)); }
}
function copyRules(){ const box=qs('#rulesBox'); if(box){ box.select(); navigator.clipboard?.writeText(box.value); toast('تم نسخ Firestore Rules'); } }
function copyStorageRules(){ const box=qs('#storageRulesBox'); if(box){ box.select(); navigator.clipboard?.writeText(box.value); toast('تم نسخ Storage Rules'); } }
async function uploadAudioFile(file, prefix='episode'){
  if(!file || !storage) throw new Error('Firebase Storage غير مهيأ');
  if(!requireAdmin('رفع الصوت')) throw new Error('صلاحيات أدمن مطلوبة');
  const safeName = `${prefix}-${Date.now()}-${String(file.name||'audio').replace(/[^\w.\-]+/g,'_')}`;
  const storageRef = ref(storage, `audio/${safeName}`);
  toast('جاري رفع الصوت...');
  const url = await new Promise((resolve, reject)=>{
    const task = uploadBytesResumable(storageRef, file, {contentType: file.type || 'audio/mpeg'});
    task.on('state_changed', null, reject, async ()=>{
      try{ resolve(await getDownloadURL(task.snapshot.ref)); }catch(e){ reject(e); }
    });
  });
  toast('تم رفع الملف الصوتي');
  return url;
}
async function resolveAudioFromForm(formData){
  const file = formData.get('audioFile');
  const url = String(formData.get('audioSrc')||'').trim();
  if(file && file.size) return uploadAudioFile(file);
  if(url && !isSafeAudioUrl(url)) throw new Error('رابط الصوت يجب أن يكون HTTPS أو ملف assets');
  return url;
}
function closeEditModal(){ if(editModal){ editModal.remove(); editModal=null; } }
function openEditModal(title, fields, onSave){
  closeEditModal();
  editModal = document.createElement('div');
  editModal.className = 'modal-overlay';
  const fieldsHtml = fields.map(f=>{
    if(f.type==='textarea') return `<div class="field"><label>${esc(f.label)}</label><textarea name="${f.name}" ${f.required?'required':''}>${esc(f.value||'')}</textarea></div>`;
    if(f.type==='checkbox') return `<label class="switch-row"><input type="checkbox" name="${f.name}" ${f.checked?'checked':''}/> ${esc(f.label)}</label>`;
    if(f.type==='file') return `<div class="field"><label>${esc(f.label)}</label><input name="${f.name}" type="file" accept="${f.accept||'*/*'}" /></div>`;
    return `<div class="field"><label>${esc(f.label)}</label><input name="${f.name}" type="${f.type||'text'}" value="${esc(f.value||'')}" ${f.required?'required':''} ${f.placeholder?`placeholder="${esc(f.placeholder)}"`:''}/></div>`;
  }).join('');
  editModal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><div class="modal-head"><h3>${esc(title)}</h3><button class="round-btn ghost modal-close" aria-label="إغلاق">×</button></div><form class="modal-form">${fieldsHtml}<div class="cta-row"><button class="primary" type="submit">حفظ</button><button class="secondary modal-close" type="button">إلغاء</button></div></form></div>`;
  document.body.appendChild(editModal);
  editModal.querySelectorAll('.modal-close').forEach(btn=>btn.onclick=closeEditModal);
  editModal.onclick=e=>{ if(e.target===editModal) closeEditModal(); };
  editModal.querySelector('form').onsubmit=async e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    await onSave(fd);
    closeEditModal();
  };
}
async function initCapacitor(){
  try{
    const cap = window.Capacitor;
    if(!cap?.isNativePlatform?.()) return;
    const [{App},{StatusBar,Style},{SplashScreen}] = await Promise.all([
      import('https://esm.sh/@capacitor/app@6.0.2'),
      import('https://esm.sh/@capacitor/status-bar@6.0.2'),
      import('https://esm.sh/@capacitor/splash-screen@6.0.3')
    ]);
    await SplashScreen.hide().catch(()=>{});
    await StatusBar.setStyle({style:Style.Style.Dark}).catch(()=>{});
    App.addListener('appStateChange', ({isActive})=>{
      if(isActive && state.player.playing && audioEl?.paused) playRealAudio(false);
    });
    App.addListener('backButton', ()=>{
      if(!qs('#drawer')?.classList.contains('hidden')) closeDrawer();
      else if(state.currentView!=='home') nav('home');
      else App.exitApp();
    });
  }catch(e){ console.warn('Capacitor init skipped', e); }
}
async function cloudSubmissionCreate(payload){
  if(!submissionsCol) return false;
  try{ await addDoc(submissionsCol, payload); return true; }
  catch(err){ state.firebase.error = prettyFireError(err); save(); return false; }
}
async function cloudSubmissionUpdate(item, patch){
  if(!db || !item?.docId) return false;
  try{ await updateDoc(doc(db, 'submissions', item.docId), patch); return true; }
  catch(err){ toast(prettyFireError(err)); return false; }
}

function render(){
  let html=''; const view=state.currentView;
  if(view.startsWith('detail:')) html=detailView(view.split(':')[1]); else if(view==='player') html=playerView(); else if(view==='home') html=homeView(); else if(view==='library') html=libraryView(); else if(view==='fm') html=fmView(); else if(view==='submit') html=submitView(); else if(view==='plans') html=plansView(); else if(view==='account') html=accountView(); else if(view==='admin') html=adminView(); else if(view==='about') html=aboutView(); else if(view==='privacy') html=privacyView(); else if(view==='terms') html=termsView(); else if(view==='support') html=supportView(); else html=homeView();
  const root=app();
  root.className='app page-fade'+(state.player.title?' has-mini-player':'');
  root.innerHTML=html; root.scrollTop=0; renderMiniPlayer(); updateNav(); bindEvents(); renderPlayerProgress(); save();
}

function renderMiniPlayer(){
  const el=qs('#miniPlayer');
  if(!state.player.title){el.classList.add('hidden');return;}
  const story=getStory(state.player.storyId);
  const artwork=story?coverSrc(story):'assets/jazal-mark.svg?v=jazal-launch-v1';
  el.classList.remove('hidden');
  el.innerHTML=`<div class="mini-inner"><button class="mini-cover" data-open-player aria-label="فتح المشغل"><img src="${artwork}" alt="" onerror="this.src='assets/jazal-mark.svg?v=jazal-launch-v1'" /></button><button class="mini-title" data-open-player><strong>${esc(state.player.title)}</strong><small>${esc(state.player.subtitle)}</small><div class="progress"><span style="width:${state.player.progress}%"></span></div></button><button class="speed-btn" data-speed>${state.player.speed||'1x'}</button><button class="mini-play-main" data-mini-toggle aria-label="تشغيل أو إيقاف">${state.player.playing?'Ⅱ':'▶'}</button></div>`;
  const play=el.querySelector('[data-mini-toggle]'); if(play) play.onclick=e=>{e.stopPropagation();togglePlay();};
  const speed=el.querySelector('[data-speed]'); if(speed) speed.onclick=e=>{e.stopPropagation();cycleSpeed();};
  el.querySelectorAll('[data-open-player]').forEach(x=>x.onclick=e=>{e.stopPropagation();nav('player');});
}

function updateNav(){ qsa('.bottom-nav button').forEach(btn=>{ const view=btn.dataset.view; btn.classList.toggle('active', state.currentView===view || ((state.currentView.startsWith('detail')||state.currentView==='player')&&view==='library')); }); }

function bindEvents(){
  qsa('[data-view]').forEach(el=>el.onclick=()=>nav(el.dataset.view));
  qsa('[data-story]').forEach(el=>el.onclick=()=>nav('detail:'+el.dataset.story));
  qsa('[data-filter]').forEach(el=>el.onclick=()=>{state.filter=el.dataset.filter; state.currentView='library'; render();});
  qsa('[data-play-episode]').forEach(el=>el.onclick=e=>{e.stopPropagation(); const [sid,eid]=el.dataset.playEpisode.split('|'); playEpisode(sid,eid);});
  qsa('[data-play-fm]').forEach(el=>el.onclick=()=>playFM());
  qsa('[data-mini-toggle]').forEach(el=>el.onclick=e=>{e.stopPropagation(); togglePlay();});
  qsa('[data-speed]').forEach(el=>el.onclick=e=>{e.stopPropagation(); cycleSpeed();});
  qsa('[data-fav]').forEach(el=>el.onclick=e=>{e.stopPropagation(); toggleFav(el.dataset.fav);});
  qsa('[data-remind]').forEach(el=>el.onclick=()=>toast('تم ضبط تذكير تجريبي لـ '+el.dataset.remind));
  qsa('[data-install]').forEach(el=>el.onclick=installApp);
  qsa('[data-admin-tab]').forEach(el=>el.onclick=()=>setAdminTab(el.dataset.adminTab));
  qsa('[data-toggle-publish]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); togglePublish(el.dataset.togglePublish); });
  qsa('[data-move-episode]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); moveEpisode(el.dataset.moveEpisode); });
  qsa('[data-play-next]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); playNextEpisode(); });
  qsa('[data-play-prev]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); playPrevEpisode(); });
  qsa('[data-delete-story]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); deleteStory(el.dataset.deleteStory); });
  qsa('[data-edit-story]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); editStory(el.dataset.editStory); });
  qsa('[data-featured-story]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); setFeaturedStory(el.dataset.featuredStory); });
  qsa('[data-delete-episode]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); deleteEpisode(el.dataset.deleteEpisode); });
  qsa('[data-edit-episode]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); editEpisode(el.dataset.editEpisode); });
  qsa('[data-delete-schedule]').forEach(el=>el.onclick=()=>deleteSchedule(+el.dataset.deleteSchedule));
  qsa('[data-share-app]').forEach(el=>el.onclick=shareApp);
  qsa('[data-share-story]').forEach(el=>el.onclick=e=>{ e.stopPropagation(); shareStory(el.dataset.shareStory); });
  qsa('[data-mark-submission]').forEach(el=>el.onclick=()=>{ const [i,status]=el.dataset.markSubmission.split('|'); markSubmission(+i,status); });
  qsa('[data-convert-submission]').forEach(el=>el.onclick=()=>convertSubmission(+el.dataset.convertSubmission));
  qsa('[data-export]').forEach(el=>el.onclick=exportBackup);
  qsa('[data-import]').forEach(el=>el.onclick=importBackup);
  qsa('[data-reset]').forEach(el=>el.onclick=resetDemo);
  const search=qs('#searchInput'); if(search) search.oninput=e=>{state.query=e.target.value; save(); setTimeout(()=>render(),120);};
  const storyForm=qs('#storyForm'); if(storyForm) storyForm.onsubmit=submitStory;
  const fmForm=qs('#fmForm'); if(fmForm) fmForm.onsubmit=saveFM;
  const addStoryForm=qs('#addStoryForm'); if(addStoryForm) addStoryForm.onsubmit=addStory;
  const addEpisodeForm=qs('#addEpisodeForm'); if(addEpisodeForm) addEpisodeForm.onsubmit=addEpisode;
  const scheduleForm=qs('#scheduleForm'); if(scheduleForm) scheduleForm.onsubmit=addScheduleItem;
  const firebaseForm=qs('#firebaseForm'); if(firebaseForm) firebaseForm.onsubmit=saveFirebase;
  const loginForm=qs('#loginForm'); if(loginForm) loginForm.onsubmit=loginAdmin;
  qsa('[data-signout]').forEach(el=>el.onclick=logoutAdmin);
  qsa('[data-cloud-seed]').forEach(el=>el.onclick=()=>pushCloud(true));
  qsa('[data-cloud-refresh]').forEach(el=>el.onclick=pullCloudOnce);
  qsa('[data-copy-rules]').forEach(el=>el.onclick=copyRules);
  qsa('[data-copy-storage-rules]').forEach(el=>el.onclick=copyStorageRules);
  qsa('[data-open-player]').forEach(el=>el.onclick=e=>{e.stopPropagation();nav('player');});
  qsa('[data-seek]').forEach(el=>el.onclick=e=>{e.stopPropagation();seekAudio(Number(el.dataset.seek)||0);renderPlayerProgress();});
}

function ensureAudio(){
  if(audioEl) return audioEl;
  audioEl=new Audio(); audioEl.preload='auto'; audioEl.loop=false; audioEl.setAttribute('playsinline','');
  audioEl.addEventListener('timeupdate', syncProgressFromAudio);
  audioEl.addEventListener('pause',()=>{ if(state.player.playing && !audioEl.ended){ state.player.playing=false; stopTimer(); renderMiniPlayer(); save(); }});
  audioEl.addEventListener('play',()=>{ state.player.playing=true; startTimer(); updateMediaSession(); renderMiniPlayer(); save(); });
  audioEl.addEventListener('ended',()=>{ if(state.player.kind==='fm'){ audioEl.currentTime=0; playRealAudio(false); } else { state.player.playing=false; state.player.progress=100; stopTimer(); renderMiniPlayer(); save(); playNextEpisode(true); }});
  return audioEl;
}
function setAudioSource(src){ const el=ensureAudio(); const clean=availableAudio(src); if(!el.src || !el.src.endsWith(clean.replace('./',''))){ el.src=clean; } return el; }
function updateMediaSession(){ if(!('mediaSession' in navigator)) return; try{ navigator.mediaSession.metadata=new MediaMetadata({title:state.player.title||'جزل', artist:state.player.subtitle||'بودكاست وقصص صوتية', album:'اسمع القصة للآخر', artwork:[{src:'assets/icon.svg', sizes:'512x512', type:'image/svg+xml'}]}); navigator.mediaSession.setActionHandler('play',()=>{state.player.playing=true; playRealAudio(false);}); navigator.mediaSession.setActionHandler('pause',()=>{state.player.playing=false; pauseRealAudio(); renderMiniPlayer(); save();}); navigator.mediaSession.setActionHandler('seekbackward',()=>seekAudio(-10)); navigator.mediaSession.setActionHandler('seekforward',()=>seekAudio(10)); navigator.mediaSession.setActionHandler('previoustrack',()=>playPrevEpisode()); navigator.mediaSession.setActionHandler('nexttrack',()=>playNextEpisode()); }catch(e){} }
function syncProgressFromAudio(){
  if(!audioEl || !isFinite(audioEl.duration) || !audioEl.duration) return;
  state.player.progress=state.player.kind==='fm'?((audioEl.currentTime/audioEl.duration)*100)%100:Math.min(100,(audioEl.currentTime/audioEl.duration)*100);
  renderMiniPlayer(); renderPlayerProgress();
}

function renderPlayerProgress(){
  if(state.currentView!=='player') return;
  const bar=qs('.player-page .progress span'); if(bar) bar.style.width=`${state.player.progress||0}%`;
  const elapsed=qs('[data-player-elapsed]'); const duration=qs('[data-player-duration]');
  if(elapsed) elapsed.textContent=state.player.kind==='fm'?'LIVE':formatSeconds(currentAudioTime());
  if(duration) duration.textContent=state.player.kind==='fm'?'جَزَل FM':formatSeconds(currentAudioDuration());
  const stage=qs('.player-stage'); if(stage) stage.classList.toggle('paused',!state.player.playing);
  const main=qs('.player-main'); if(main) main.textContent=state.player.playing?'Ⅱ':'▶';
}

function seekAudio(seconds){ if(!audioEl) return; audioEl.currentTime=Math.max(0,Math.min(audioEl.duration||0,audioEl.currentTime+seconds)); syncProgressFromAudio(); }
async function playRealAudio(reset=false){ const el=setAudioSource(state.player.audioSrc || DEMO_AUDIO_SRC); if(reset) el.currentTime=0; el.loop=state.player.kind==='fm'; el.playbackRate=state.player.speed==='1.5x'?1.5:state.player.speed==='1.25x'?1.25:1; updateMediaSession(); try{ await el.play(); state.player.playing=true; startTimer(); save(); }catch(err){ state.player.playing=false; stopTimer(); toast('اضغط تشغيل مرة ثانية حتى يسمح المتصفح بالصوت بالخلفية'); renderMiniPlayer(); }}
function pauseRealAudio(){ if(audioEl) audioEl.pause(); stopTimer(); }
function playEpisode(storyId, episodeId, auto=false){ const story=getStory(storyId); const ep=getEpisode(story,episodeId); if(!story || !ep) return; if(!ep.free){ toast('هذه الحلقة تفتح قريباً عند تفعيل الباقات'); return; } state.player={playing:true, kind:'episode', storyId, episodeId:ep.id, title:ep.title, subtitle:story.title+' · '+story.genre, audioSrc:availableAudio(ep.audioSrc), progress:0, duration:180, speed: state.player.speed&&state.player.speed!=='LIVE'?state.player.speed:'1x'}; updateRecent(storyId); if(!auto) toast('بدأ تشغيل بالخلفية: '+ep.title); render(); playRealAudio(true); }
function playFM(){ state.player={playing:true, kind:'fm', title:state.fm.title, subtitle:'جزل FM مباشر · '+state.fm.host, audioSrc:availableAudio(state.fm.streamUrl), progress:0, duration:0, speed:'LIVE'}; toast('جزل FM مباشر · يعمل بالخلفية'); render(); playRealAudio(true); }
function togglePlay(){ state.player.playing=!state.player.playing; if(state.player.playing) playRealAudio(false); else pauseRealAudio(); render(); }
function cycleSpeed(){ const speeds=['1x','1.25x','1.5x']; const idx=speeds.indexOf(state.player.speed||'1x'); state.player.speed=state.player.kind==='fm'?'LIVE':speeds[(idx+1)%speeds.length]; if(audioEl) audioEl.playbackRate=state.player.speed==='1.5x'?1.5:state.player.speed==='1.25x'?1.25:1; updateMediaSession(); save(); renderMiniPlayer(); toast('السرعة: '+state.player.speed); }
function startTimer(){ stopTimer(); playerTimer=setInterval(()=>{ if(!state.player.playing) return; if(!audioEl || !isFinite(audioEl.duration) || !audioEl.duration){ const inc=state.player.speed==='1.5x'?1.15:state.player.speed==='1.25x'?.95:.7; state.player.progress=state.player.kind==='fm'?((state.player.progress+1.7)%100):Math.min(100,state.player.progress+inc); } renderMiniPlayer(); renderPlayerProgress(); save(); },1200); }
function stopTimer(){ if(playerTimer) clearInterval(playerTimer); playerTimer=null; }

function toggleFav(id){ if(isFav(id)){state.favorites=state.favorites.filter(x=>x!==id); toast('انشال من المحفوظات');} else {state.favorites.unshift(id); toast('انحفظ بالمفضلة');} save(); render(); }
async function submitStory(e){
  e.preventDefault();
  const f=new FormData(e.target);
  const sub={
    title:sanitizeText(f.get('title'), 200),
    genre:sanitizeText(f.get('genre'), 50),
    body:sanitizeText(f.get('body'), 10000),
    name:sanitizeText(f.get('name'), 120),
    phone:sanitizeText(f.get('phone'), 30),
    status:'قيد المراجعة',
    createdAt:new Date().toISOString()
  };
  if(sub.body.length < 10){ toast('القصة قصيرة جداً'); return; }
  e.target.reset();
  state.mySubmissions.push({...sub, localId:'local-'+Date.now()});
  const sent=await cloudSubmissionCreate(sub);
  if(!sent) toast('انحفظت محلياً — فعّل Firestore Rules حتى توصل أونلاين');
  else toast('وصلت قصتك إلى إدارة جزل');
  save(); render();
}
function saveFM(e){
  if(!requireAdmin('تعديل FM')) return;
  e.preventDefault();
  const f=new FormData(e.target);
  state.fm.title=f.get('title'); state.fm.host=f.get('host'); state.fm.note=f.get('note'); state.fm.streamUrl=availableAudio(f.get('streamUrl')); state.fm.live=!!f.get('live');
  save(); cloudSaveSoon('fm'); toast('تم حفظ إعدادات FM'); render();
}
function addStory(e){
  if(!requireAdmin('إضافة قصة')) return;
  e.preventDefault();
  const f=new FormData(e.target);
  const submitBtn=e.target.querySelector('[type="submit"]');
  submitBtn.disabled=true;
  resolveAudioFromForm(f).then(audioSrc=>{
    const id='story-'+Date.now(); const epId=id+'-1';
    state.stories.unshift({id,title:f.get('title'),genre:f.get('genre'),emoji:f.get('emoji')||'🎧',tag:f.get('tag')||'جزل Originals',mood:'جديد',age:'عام',featured:false,published:!!f.get('published'),desc:f.get('desc'),color:'linear-gradient(145deg,#1b1640,#7c3aed 54%,#ec4899)',rating:'جديد',episodes:1,free:1,listens:'0',duration:'10د',episodeList:[{id:epId,title:f.get('episodeTitle')||'الحلقة الأولى',duration:'10:00',free:true,audioSrc:availableAudio(audioSrc)}]});
    save(); cloudSaveSoon('story'); toast('تمت إضافة القصة'); nav('library');
  }).catch(err=>toast(prettyFireError(err))).finally(()=>{ submitBtn.disabled=false; });
}
function addEpisode(e){
  if(!requireAdmin('إضافة حلقة')) return;
  e.preventDefault();
  const f=new FormData(e.target); const story=getStory(f.get('storyId')); if(!story) return;
  const submitBtn=e.target.querySelector('[type="submit"]');
  submitBtn.disabled=true;
  resolveAudioFromForm(f).then(audioSrc=>{
    story.episodeList=story.episodeList||[];
    const ep={id:story.id+'-ep-'+Date.now(), title:f.get('title'), duration:f.get('duration')||'10:00', free:!!f.get('free'), audioSrc:availableAudio(audioSrc)};
    story.episodeList.push(ep); story.episodes=story.episodeList.length; story.free=story.episodeList.filter(x=>x.free).length;
    save(); cloudSaveSoon('episode'); toast('تمت إضافة الحلقة'); render();
  }).catch(err=>toast(prettyFireError(err))).finally(()=>{ submitBtn.disabled=false; });
}
function deleteStory(id){
  if(!requireAdmin('حذف القصة')) return;
  if(!confirm('تحذف القصة من المكتبة؟')) return;
  state.stories=state.stories.filter(s=>s.id!==id); state.favorites=state.favorites.filter(x=>x!==id);
  save(); cloudSaveSoon('delete-story'); toast('انحذفت القصة'); render();
}

function editStory(id){
  if(!requireAdmin('تعديل القصة')) return;
  const story=getStory(id); if(!story) return;
  openEditModal('تعديل القصة', [
    {name:'title', label:'العنوان', value:story.title, required:true},
    {name:'genre', label:'التصنيف', value:story.genre},
    {name:'tag', label:'الوسم', value:story.tag},
    {name:'desc', label:'الوصف', type:'textarea', value:story.desc, required:true},
    {name:'emoji', label:'إيموجي', value:story.emoji},
    {name:'published', label:'منشور', type:'checkbox', checked:story.published!==false}
  ], async fd=>{
    Object.assign(story,{
      title:String(fd.get('title')||story.title).trim(),
      genre:String(fd.get('genre')||story.genre).trim(),
      tag:String(fd.get('tag')||story.tag).trim(),
      desc:String(fd.get('desc')||story.desc).trim(),
      emoji:String(fd.get('emoji')||story.emoji).trim(),
      published:!!fd.get('published')
    });
    save(); cloudSaveSoon('edit-story'); toast('تم تعديل القصة'); render();
  });
}
function togglePublish(id){
  if(!requireAdmin('نشر القصة')) return;
  const story=getStory(id); if(!story) return;
  story.published = story.published === false ? true : false;
  save(); cloudSaveSoon('toggle-publish');
  toast(story.published===false?'تم إخفاء القصة':'تم نشر القصة'); render();
}
function moveEpisode(payload){
  if(!requireAdmin('ترتيب الحلقات')) return;
  const [storyId, epId, dir]=payload.split('|');
  const story=getStory(storyId); if(!story) return;
  const list=story.episodeList||[];
  const idx=list.findIndex(e=>e.id===epId);
  if(idx<0) return;
  const swap=dir==='up'?idx-1:idx+1;
  if(swap<0||swap>=list.length) return;
  [list[idx], list[swap]]=[list[swap], list[idx]];
  save(); cloudSaveSoon('reorder-episode'); toast('تم تغيير ترتيب الحلقة'); render();
}
function editEpisode(payload){
  if(!requireAdmin('تعديل الحلقة')) return;
  const [storyId, epId]=payload.split('|'); const story=getStory(storyId); const ep=getEpisode(story, epId); if(!ep) return;
  openEditModal('تعديل الحلقة', [
    {name:'title', label:'عنوان الحلقة', value:ep.title, required:true},
    {name:'duration', label:'المدة', value:ep.duration},
    {name:'audioSrc', label:'رابط MP3', value:ep.audioSrc!==DEMO_AUDIO_SRC?ep.audioSrc:''},
    {name:'audioFile', label:'رفع MP3 جديد', type:'file', accept:'audio/*'},
    {name:'free', label:'مجانية', type:'checkbox', checked:!!ep.free}
  ], async fd=>{
    ep.title=String(fd.get('title')||ep.title).trim();
    ep.duration=String(fd.get('duration')||ep.duration).trim();
    ep.free=!!fd.get('free');
    const file=fd.get('audioFile');
    const url=String(fd.get('audioSrc')||'').trim();
    if(file && file.size) ep.audioSrc=availableAudio(await uploadAudioFile(file));
    else if(url) ep.audioSrc=availableAudio(isSafeAudioUrl(url)?url:'');
    story.free=(story.episodeList||[]).filter(e=>e.free).length;
    save(); cloudSaveSoon('edit-episode'); toast('تم تعديل الحلقة'); render();
  });
}
function setFeaturedStory(id){
  if(!requireAdmin('اختيار اليوم')) return;
  state.stories.forEach(s=>s.featured=(s.id===id));
  save(); cloudSaveSoon('featured-story'); toast('صار اختيار اليوم'); render();
}
function deleteEpisode(payload){
  if(!requireAdmin('حذف الحلقة')) return;
  const [storyId, epId]=payload.split('|'); const story=getStory(storyId); if(!story) return;
  if(!confirm('تحذف هذه الحلقة؟')) return;
  story.episodeList=(story.episodeList||[]).filter(e=>e.id!==epId);
  story.episodes=story.episodeList.length; story.free=story.episodeList.filter(e=>e.free).length;
  save(); cloudSaveSoon('delete-episode'); toast('انحذفت الحلقة'); render();
}
function addScheduleItem(e){
  if(!requireAdmin('جدول FM')) return;
  e.preventDefault(); const f=new FormData(e.target);
  state.schedule.push({time:f.get('time'), title:f.get('title'), host:f.get('host')||'ستوديو جزل', desc:f.get('desc')||'موعد جديد على جزل FM'});
  e.target.reset(); save(); cloudSaveSoon('schedule'); toast('تمت إضافة الموعد'); render();
}
function deleteSchedule(index){
  if(!requireAdmin('جدول FM')) return;
  state.schedule.splice(index,1); save(); cloudSaveSoon('delete-schedule'); toast('انحذف الموعد'); render();
}
async function shareApp(){
  const data={title:'جزل', text:'جزل — اسمع القصة للآخر', url:'https://jazal.vercel.app'};
  try{ if(navigator.share) await navigator.share(data); else { await navigator.clipboard?.writeText(data.url); toast('تم نسخ رابط جزل'); } }catch(e){}
}
async function shareStory(id){
  const story=getStory(id); if(!story) return;
  const url='https://jazal.vercel.app'; const text=`${story.title} على جزل — اسمع القصة للآخر`;
  try{ if(navigator.share) await navigator.share({title:story.title,text,url}); else { await navigator.clipboard?.writeText(`${text} ${url}`); toast('تم نسخ رابط القصة'); } }catch(e){}
}

async function markSubmission(index,status){
  if(!requireAdmin('مراجعة القصص')) return;
  if(!state.submissions[index]) return;
  const item = state.submissions[index]; item.status=status;
  await cloudSubmissionUpdate(item,{status});
  save(); toast('تم تحديث حالة القصة'); render();
}
async function convertSubmission(index){
  if(!requireAdmin('تحويل القصة')) return;
  const s=state.submissions[index]; if(!s) return;
  const id='submission-'+Date.now();
  state.stories.unshift({id,title:s.title,genre:s.genre,emoji:'✍️',tag:'من قصص الجمهور',mood:'واقعي',age:'عام',featured:false,published:true,desc:s.body,color:'linear-gradient(145deg,#101b39,#2563eb 48%,#a855f7)',rating:'جديد',episodes:1,free:1,listens:'0',duration:'10د',episodeList:[{id:id+'-1',title:'الحلقة الأولى',duration:'10:00',free:true,audioSrc:DEMO_AUDIO_SRC}]});
  s.status='تحولت لقصة';
  await cloudSubmissionUpdate(s,{status:'تحولت لقصة'});
  save(); cloudSaveSoon('convert-submission'); toast('تحولت القصة للمكتبة'); nav('library');
}
function saveFirebase(e){
  e.preventDefault();
  state.firebase.mode='firebase'; state.firebase.projectId=firebaseConfig.projectId; state.firebase.authDomain=firebaseConfig.authDomain; state.firebase.firestoreReady=true; state.firebase.lastSync=new Date().toISOString();
  save(); toast('Firebase مربوط داخل جزل'); render();
}
function exportBackup(){ if(!requireAdmin('تصدير النسخة')) return; const json=JSON.stringify(state,null,2); const box=qs('#backupBox'); if(box) box.value=json; navigator.clipboard?.writeText(json).catch(()=>{}); toast('تم تجهيز النسخة ونسخها'); }
function importBackup(){ if(!requireAdmin('استيراد النسخة')) return; const box=qs('#backupBox'); if(!box || !box.value.trim()) return toast('الصق JSON أولاً'); try{ const parsed=JSON.parse(box.value); state=merge(structured(defaultState), parsed); save(); toast('تم استيراد النسخة'); render(); }catch(e){ toast('ملف JSON غير صحيح'); } }
function installApp(){ if(deferredInstallPrompt){ deferredInstallPrompt.prompt(); deferredInstallPrompt=null; } else toast('من الآيفون: مشاركة → إضافة إلى الشاشة الرئيسية'); }
function resetDemo(){ if(!requireAdmin('تصفير البيانات')) return; if(confirm('تريد تصفر بيانات النسخة التجريبية؟')){ localStorage.removeItem(STORAGE_KEY); state=structured(defaultState); render(); } }
function openDrawer(){ qs('#drawer').classList.remove('hidden'); qs('#drawer').setAttribute('aria-hidden','false'); bindDrawerButtons(); }
function closeDrawer(){ qs('#drawer').classList.add('hidden'); qs('#drawer').setAttribute('aria-hidden','true'); }
function bindDrawerButtons(){ qsa('#drawer [data-view]').forEach(btn=>btn.onclick=()=>nav(btn.dataset.view)); }

qs('#menuBtn').onclick=openDrawer;
qs('#closeDrawer').onclick=closeDrawer;
qs('#drawer').onclick=e=>{ if(e.target.id==='drawer') closeDrawer(); };
qs('#searchBtn').onclick=()=>{ state.currentView='library'; render(); setTimeout(()=>qs('#searchInput')?.focus(),50); };
qsa('.brand-mini').forEach(el=>el.onclick=()=>nav('home'));
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredInstallPrompt=e; });
if('serviceWorker' in navigator){ window.addEventListener('load',async()=>{ try{ const reg=await navigator.serviceWorker.register('./sw.js'); if(reg && reg.update) reg.update(); }catch(e){ console.warn('SW registration skipped', e); } }); }
const initialRoute = parseHashRoute();
if(initialRoute) state.currentView = initialRoute;
window.addEventListener('hashchange', ()=>{ const route=parseHashRoute(); if(route && route!==state.currentView){ state.currentView=route; render(); }});
ensureAudio(); updateMediaSession(); render(); initFirebaseLive(); initCapacitor(); if(state.player.playing) playRealAudio(false);
