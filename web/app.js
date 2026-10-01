
'use strict';
/* Virkan Gym 1.9: local-only data, stable sessions, configurable progression. */
const VERSION=19, KEY='virkan_gym_html_state', SNAPSHOT_KEY='virkan_gym_before_restore';
const $=id=>document.getElementById(id), copy=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>String(v??'').trim()===''?NaN:Number(String(v).trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));
const fmt=n=>n==null?'—':Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
function localISO(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function dateObj(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12);}
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number(s.slice(0,4))>=1900&&Number(s.slice(0,4))<=2100&&localISO(dateObj(s))===s;}
function dayNum(s){const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;}
function shiftDate(s,n){const d=dateObj(s);d.setDate(d.getDate()+n);return localISO(d);}
function monday(s=localISO()){return shiftDate(s,-((dateObj(s).getDay()+6)%7));}
function dateLabel(s,long=false){return dateObj(s).toLocaleDateString('ru-RU',{day:'numeric',month:long?'long':'short',...(long?{year:'numeric'}:{})});}
function timeLabel(s){return s&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'Из прежней версии';}
const EQUIPMENT={extra:'Пресс: дополнительный вес, без массы тела',barbell:'Штанга: общий вес с грифом',dumbbell:'Гантели: вес одной гантели',machine:'Тренажёр: вес на шкале',bodyweight:'Без дополнительного веса'};
const CATALOG=[
 ['bench','Жим штанги лёжа','Грудь','barbell'],
 ['incline_db','Жим гантелей на наклонной скамье','Грудь','dumbbell'],
 ['chest_fly','Сведение рук / разводка','Грудь','machine'],
 ['triceps_push','Разгибание рук на блоке','Трицепс','machine'],
 ['triceps_overhead','Разгибание рук из-за головы','Трицепс','dumbbell'],
 ['lat_pull','Тяга верхнего блока','Спина','machine',5],
 ['row','Тяга горизонтального блока','Спина','machine'],
 ['one_arm_row','Тяга гантели одной рукой','Спина','dumbbell'],
 ['curl','Сгибание рук с гантелями','Бицепс','dumbbell'],
 ['hammer','Молотковые сгибания','Бицепс','dumbbell'],
 ['squat','Приседания','Ноги','barbell'],
 ['leg_press','Жим ногами','Ноги','machine'],
 ['leg_ext','Разгибание ног','Ноги','machine'],
 ['leg_curl','Сгибание ног','Ноги','machine'],
 ['calf','Подъём на носки','Ноги','machine'],
 ['flat_db','Жим гантелей лёжа','Грудь','dumbbell',2.5,true],
 ['machine_press','Жим от груди в тренажёре','Грудь','machine',2.5,true],
 ['barbell_curl','Сгибание рук со штангой','Бицепс','barbell',2.5,true],
 ['bent_row','Тяга штанги в наклоне','Спина','barbell',2.5,true]
].map(([id,name,group,equipment,step=2.5,alternative=false])=>({id,name,group,equipment,step,alternative,kind:'weighted'}));
const ABS=[{id:'abs_start',name:'Пресс — скручивания',kind:'abs',group:'Пресс'}, {id:'abs_end',name:'Пресс — подъём ног',kind:'abs',group:'Пресс'}];
const ALL_EXERCISES=[...CATALOG,...ABS];
const REGISTRY=Object.fromEntries(ALL_EXERCISES.map(e=>[e.id,e]));
const PLAN={
 1:{title:'Грудь + трицепс',tabs:['gym'],items:[['bench',3,10],['incline_db',3,10],['chest_fly',3,12],['triceps_push',3,12],['triceps_overhead',3,12]]},
 2:{title:'Кардио + бассейн',tabs:['cardio','pool'],items:[]},
 3:{title:'Отдых',tabs:[],items:[]},
 4:{title:'Спина + бицепс',tabs:['gym'],items:[['lat_pull',3,10],['row',3,10],['one_arm_row',3,10],['curl',3,12],['hammer',3,12]]},
 5:{title:'Отдых',tabs:[],items:[]},
 6:{title:'Ноги + бассейн',tabs:['gym','pool'],items:[['squat',3,10],['leg_press',3,12],['leg_ext',3,12],['leg_curl',3,12],['calf',4,15]]},
 0:{title:'Отдых',tabs:[],items:[]}
};
const DAY_NAMES=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
function defaultConfig(e){
 if(e.kind==='abs')return {base:0,mode:'reps',step:2.5,equipment:'bodyweight',rest:null,baseReps:e.id==='abs_start'?20:15,repStep:1};
 return {base:null,mode:'weighted',step:e.step,equipment:e.equipment,rest:null};
}
function defaultProgram(){return Object.fromEntries(Object.entries(PLAN).map(([k,p])=>[k,{...copy(p),absStartSets:3,absEndSets:3,absStartReps:20,absEndReps:15}]));}
function initialState(){return {schemaVersion:VERSION,profile:{height:null,weight:null,goal:null,confirmed:false,onboardingSeen:false},startDate:monday(),exerciseSettings:Object.fromEntries(ALL_EXERCISES.map(e=>[e.id,defaultConfig(e)])),programVersions:[{id:'default',effectiveFrom:'1900-01-01',savedAt:null,days:defaultProgram()}],rest:{seconds:90,sound:false,vibration:false},timer:{active:false,endAt:null,remaining:0,sessionId:null},sessions:{},weights:[],legacyHistory:[],backup:{lastExportAt:null},revision:0};}
function programRevision(date,store){return [...store.programVersions].reverse().find(v=>v.effectiveFrom<=date)||store.programVersions[0];}
function newSet(n,reps){return {number:n,weight:null,reps:String(reps),repsManual:false,overrideId:null,done:false,result:null};}
function newSession(date,store){
 const dow=dateObj(date).getDay(),rev=store?programRevision(date,store):null,p=rev?rev.days[dow]:defaultProgram()[dow];
 return {id:'s_'+date,originalDate:date,scheduledDate:date,dow,title:p.title,tabs:[...p.tabs],templateRevision:rev?.id||'default',manualEdits:false,exercises:p.tabs.length?[['abs_start',p.absStartSets,p.absStartReps],...p.items,['abs_end',p.absEndSets,p.absEndReps]].map(([id,n,reps])=>({slot:id,exerciseId:id,reps,skipped:false,sets:Array.from({length:n},(_,i)=>newSet(i+1,reps))})):[],activities:{},activityDrafts:{},finishedAt:null,status:'planned'};
}
function normalizeProgramDays(days){
 if(!days||typeof days!=='object')throw Error('В копии нет полного недельного расписания.');
 const out={};
 for(const d of [0,1,2,3,4,5,6]){
  const p=days[d];if(!p||!Array.isArray(p.tabs)||p.tabs.some(t=>!['gym','cardio','pool'].includes(t))||!Array.isArray(p.items)||p.items.length>30)throw Error('Некорректный день программы.');
  const isTraining=p.tabs.length>0,seen=new Set();
  const items=p.items.map(a=>{if(!Array.isArray(a)||a.length!==3||!CATALOG.some(e=>e.id===a[0])||seen.has(a[0])||!Number.isInteger(a[1])||a[1]<1||a[1]>20||!Number.isInteger(a[2])||a[2]<1||a[2]>500)throw Error('Проверьте упражнения, подходы и повторения в программе.');seen.add(a[0]);return [a[0],a[1],a[2]];});
  const abs={};for(const [k,def,max] of [['absStartSets',3,20],['absEndSets',3,20],['absStartReps',20,500],['absEndReps',15,500]]){const n=p[k]??def;if(!Number.isInteger(n)||n<1||n>max)throw Error('Неверные параметры пресса в программе.');abs[k]=n;}
  const tabs=isTraining?[...(items.length||!p.tabs.some(t=>t==='cardio'||t==='pool')?['gym']:[]),...['cardio','pool'].filter(t=>p.tabs.includes(t))]:[];
  out[d]={title:isTraining?String(p.title||'Тренировка').trim().slice(0,100):'Отдых',tabs,items:isTraining?items:[],...abs};
 }
 return out;
}
function normalizeProgramVersions(raw){
 if(raw==null)return [{id:'default',effectiveFrom:'1900-01-01',savedAt:null,days:defaultProgram()}];
 if(!Array.isArray(raw)||!raw.length||raw.length>1000)throw Error('Некорректные версии постоянной программы.');
 const seen=new Set();const versions=raw.map(v=>{if(!v||!validDate(v.effectiveFrom)||seen.has(v.effectiveFrom)||typeof v.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(v.id))throw Error('Неверная дата версии программы.');seen.add(v.effectiveFrom);return {id:v.id,effectiveFrom:v.effectiveFrom,savedAt:typeof v.savedAt==='string'?v.savedAt:null,days:normalizeProgramDays(v.days)};}).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
 if(versions[0].effectiveFrom!=='1900-01-01')throw Error('Отсутствует исходная версия программы.');return versions;
}
function profileNumber(v,lo,hi){const n=num(v);return Number.isFinite(n)&&n>=lo&&n<=hi?n:null;}
function nullableNum(v,lo=0,hi=5000){if(v==null||v==='')return null;const n=num(v);if(!Number.isFinite(n)||n<lo||n>hi)throw Error('Некорректное числовое значение в резервной копии.');return n;}
function normalize(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Неверный формат данных.');
 if(Number(raw.schemaVersion)>VERSION)throw Error('Эта копия из более новой версии приложения.');
 if(![18,VERSION].includes(Number(raw.schemaVersion)))return migrateLegacy(raw);
 const v=initialState();v.programVersions=normalizeProgramVersions(raw.programVersions);
 if(!validDate(raw.startDate))throw Error('Неверная дата начала программы.');v.startDate=raw.startDate;
 v.profile={height:profileNumber(raw.profile?.height,50,260),weight:profileNumber(raw.profile?.weight,20,400),goal:profileNumber(raw.profile?.goal,20,400),confirmed:false,onboardingSeen:Boolean(raw.profile?.onboardingSeen)};
 v.profile.confirmed=Boolean(raw.profile?.confirmed)&&['height','weight','goal'].every(k=>v.profile[k]!=null);
 for(const e of ALL_EXERCISES){
  const c=raw.exerciseSettings?.[e.id];if(!c)continue;const def=defaultConfig(e),step=nullableNum(c.step,0.01,100),isAbs=e.kind==='abs';
  const mode=isAbs&&c.mode==='reps'?'reps':c.mode==='bodyweight'?'bodyweight':'weighted';
  const eq=isAbs?(mode==='weighted'?'extra':'bodyweight'):(Object.hasOwn(EQUIPMENT,c.equipment)?c.equipment:e.equipment);
  v.exerciseSettings[e.id]={base:nullableNum(c.base),step:step??def.step,mode,equipment:eq,rest:nullableNum(c.rest,5,900)};
  if(isAbs){const b=nullableNum(c.baseReps,1,500),r=nullableNum(c.repStep,0,100);if((b!=null&&!Number.isInteger(b))||(r!=null&&!Number.isInteger(r)))throw Error('Повторения пресса должны быть целыми.');v.exerciseSettings[e.id].baseReps=b??def.baseReps;v.exerciseSettings[e.id].repStep=r??def.repStep;}
 }
 const sec=nullableNum(raw.rest?.seconds,5,900);if(sec!=null)v.rest.seconds=sec;v.rest.sound=!!raw.rest?.sound;v.rest.vibration=!!raw.rest?.vibration;
 if(Array.isArray(raw.weights))v.weights=raw.weights.filter(x=>x&&profileNumber(x.v,20,400)!=null).map(x=>({date:validDate(x.date)?x.date:null,label:String(x.label||x.date||'').slice(0,100),v:Number(x.v)}));
 const entries=Object.entries(raw.sessions||{});if(entries.length>10000)throw Error('Слишком много тренировок в копии.');
 for(const [id,s] of entries){
  if(!s||id!=='s_'+s.originalDate||!validDate(s.originalDate)||!validDate(s.scheduledDate))throw Error('Некорректные даты тренировки в копии.');
  const t=newSession(s.originalDate,v);t.templateRevision=String(s.templateRevision||"legacy").slice(0,80);t.manualEdits=!!s.manualEdits;t.scheduledDate=s.scheduledDate;t.title=String(s.title||t.title).slice(0,160);t.status=['planned','started','done','partial'].includes(s.status)?s.status:'planned';t.finishedAt=typeof s.finishedAt==='string'&&Number.isFinite(Date.parse(s.finishedAt))?s.finishedAt:null;
  t.tabs=Array.isArray(s.tabs)?s.tabs.filter(x=>['gym','cardio','pool'].includes(x)):t.tabs;
  if(!Array.isArray(s.exercises)||s.exercises.length>80)throw Error('Неверный список упражнений.');
  const slots=new Set();t.exercises=[];
  for(const ex of s.exercises){
   if(!REGISTRY[ex.exerciseId]||!REGISTRY[ex.slot]||slots.has(ex.slot)||!Array.isArray(ex.sets)||ex.sets.length>20)throw Error('Неизвестное или повторное упражнение.');slots.add(ex.slot);
   const te={slot:ex.slot,exerciseId:ex.exerciseId,reps:Number.isInteger(ex.reps)&&ex.reps>0&&ex.reps<=500?ex.reps:10,skipped:!!ex.skipped,sets:[]};
   for(let i=0;i<ex.sets.length;i++){
    const z=ex.sets[i];if(z.number!==i+1)throw Error('Неверная нумерация подходов.');
    const r=newSet(i+1,te.reps);r.weight=z.weight==null?null:String(z.weight).slice(0,24);r.reps=z.reps==null?String(te.reps):String(z.reps).slice(0,24);r.overrideId=REGISTRY[z.overrideId]?z.overrideId:null;r.repsManual=Number(raw.schemaVersion)===18?true:!!z.repsManual;
    if(z.done){const a=z.result;if(!a||!REGISTRY[a.exerciseId]||!validDate(a.date))throw Error('Неверная запись выполненного подхода.');const weight=nullableNum(a.weight),reps=nullableNum(a.reps,1,500);if(reps!=null&&!Number.isInteger(reps))throw Error('Повторения должны быть целыми.');r.done=true;r.result={exerciseId:a.exerciseId,name:String(a.name||REGISTRY[a.exerciseId].name).slice(0,160),kind:REGISTRY[a.exerciseId].kind,weight,reps,date:a.date,completedAt:typeof a.completedAt==='string'&&Number.isFinite(Date.parse(a.completedAt))?a.completedAt:null,migrated:!!a.migrated,equipment:EQUIPMENT[a.equipment]?a.equipment:null};}
    te.sets.push(r);
   }t.exercises.push(te);
  }
  for(const kind of ['cardio','pool']){const a=s.activities?.[kind];if(a&&validDate(a.date)){t.activities[kind]={distance:nullableNum(a.distance,0,100000),minutes:nullableNum(a.minutes,0,2000),date:a.date,savedAt:typeof a.savedAt==='string'?a.savedAt:null,meta:String(a.meta||'').slice(0,500)};}const dr=s.activityDrafts?.[kind];if(dr&&typeof dr==='object')t.activityDrafts[kind]={distance:String(dr.distance??'').slice(0,24),minutes:String(dr.minutes??'').slice(0,24)};}
  v.sessions[id]=t;
 }
 const occupied=new Set();for(const s of Object.values(v.sessions)){if(!s.tabs.length)continue;if(occupied.has(s.scheduledDate))throw Error('В копии две тренировки на одну дату.');occupied.add(s.scheduledDate);}
 if(Array.isArray(raw.legacyHistory))v.legacyHistory=raw.legacyHistory.filter(x=>x&&typeof x.title==='string').map(x=>({title:x.title.slice(0,160),meta:String(x.meta||'').slice(0,500),d:String(x.d||'').slice(0,30)}));
 if(typeof raw.backup?.lastExportAt==='string'&&Number.isFinite(Date.parse(raw.backup.lastExportAt)))v.backup.lastExportAt=raw.backup.lastExportAt;
 const tm=raw.timer;if(tm?.active){const remaining=Number(tm.remaining);const end=tm.endAt;v.timer={active:true,remaining:Number.isFinite(remaining)?Math.max(0,Math.min(900,remaining)):0,endAt:typeof end==='number'&&Number.isFinite(end)?end:null,sessionId:v.sessions[tm.sessionId]?tm.sessionId:null};if((v.timer.endAt!==null&&v.timer.endAt<=Date.now())||(v.timer.endAt===null&&!v.timer.remaining))v.timer.active=false;}
 v.revision=Number.isSafeInteger(raw.revision)?raw.revision:0;return v;
}
function migrateLegacy(raw){
 if(!raw.profile||!raw.baseWeights)throw Error('Это не резервная копия Virkan Gym.');
 const v=initialState();if(validDate(raw.startDate))v.startDate=raw.startDate;
 v.profile.height=profileNumber(raw.profile.height,50,260);v.profile.weight=profileNumber(raw.profile.weight,20,400);v.profile.goal=profileNumber(raw.profile.goal,20,400);
 for(const e of CATALOG){const n=num(raw.baseWeights[e.id]);if(Number.isFinite(n)&&n>0)v.exerciseSettings[e.id].base=n;}
 const sessionFor=date=>v.sessions['s_'+date]||(v.sessions['s_'+date]=newSession(date,v));
 const getSet=(key)=>{const m=key.match(/^(\d{4}-\d{2}-\d{2})_(.+)_(\d+)$/);if(!m||!validDate(m[1])||!REGISTRY[m[2]])return null;const idx=Number(m[3]);if(idx<0||idx>19)return null;const s=sessionFor(m[1]);let e=s.exercises.find(x=>x.slot===m[2]);if(!e){e={slot:m[2],exerciseId:m[2],reps:10,skipped:false,sets:[]};s.exercises.push(e);if(!s.tabs.length){s.title='Импортированная тренировка';s.tabs=['gym'];}}while(e.sets.length<=idx)e.sets.push(newSet(e.sets.length+1,e.reps));return {s,e,z:e.sets[idx],date:m[1]};};
 for(const [key,r] of Object.entries(raw.draftSets||{})){const q=getSet(key);if(q&&r){q.z.weight=r.weight==null?null:String(r.weight);q.z.reps=String(r.reps??q.e.reps);q.z.repsManual=true;}}
 const keys=new Set([...Object.keys(raw.completedSets||{}),...Object.keys(raw.checks||{}).filter(k=>raw.checks[k]===true)]);
 for(const key of keys){const q=getSet(key);if(!q)continue;const r=raw.completedSets?.[key]||{},w=r.weight==null?null:Number(r.weight),reps=r.reps==null?null:Number(r.reps);if(w!=null&&(!Number.isFinite(w)||w<0)||reps!=null&&(!Number.isInteger(reps)||reps<1))continue;q.z.done=true;q.z.result={exerciseId:q.e.exerciseId,name:REGISTRY[q.e.exerciseId].name,kind:REGISTRY[q.e.exerciseId].kind,weight:w,reps,date:q.date,completedAt:r.completedAt||null,migrated:w===null||reps===null,equipment:v.exerciseSettings[q.e.exerciseId]?.equipment||null};q.s.status='started';}
 for(const [date,done] of Object.entries(raw.completed||{})){if(validDate(date)&&done){const s=sessionFor(date);s.status='done';s.finishedAt=date+'T12:00:00';}}
 if(Array.isArray(raw.history)){for(const h of raw.history){if(!h||typeof h.title!=='string')continue;if(validDate(h.date)&&['pool','cardio'].includes(h.kind)){const s=sessionFor(h.date);s.activities[h.kind]={distance:null,minutes:null,date:h.date,savedAt:null,meta:String(h.meta||'')};}else if(!(h.kind==='workout'&&validDate(h.date)))v.legacyHistory.push({title:h.title,meta:String(h.meta||''),d:String(h.d||'')});}}
 if(Array.isArray(raw.weights))v.weights=raw.weights.filter(w=>profileNumber(w?.v,20,400)!=null).map(w=>({date:validDate(w.d)?w.d:null,label:String(w.d||''),v:Number(w.v)}));
 return v;
}
let loadNotice='';
function load(){
 for(const k of [KEY,'virkan_gym_html_v1_8','virkan_gym_html_v1_7','virkan_gym_html_v1_6','virkan_gym_html_v1_5']){
  try{const s=localStorage.getItem(k);if(s){const raw=JSON.parse(s);const v=normalize(raw);if(raw.schemaVersion!==VERSION)loadNotice='Перенесены данные прежней версии. Проверьте настройки пресса и недельные прибавки. Старые результаты сохранены.';return v;}}
  catch(e){loadNotice='Не удалось прочитать сохранённые данные. Исходная запись не удалена. Восстановите JSON-копию через настройки.';}
 }return initialState();
}
let state=load(), page='home',selectedSession=null,planWeek=monday(),activeTab=null,progressMode='sets',toastTimeout=null,settingsDirty=false,pendingImport=null,editTarget=null,audioCtx=null,lastDay=localISO();
function warn(s){$('storageWarning').textContent=s;$('storageWarning').hidden=!s;}
function persist(){try{state.revision++;localStorage.setItem(KEY,JSON.stringify(state));warn('');return true;}catch(e){warn('Браузер не разрешил сохранить данные. Не закрывайте страницу; создайте JSON-копию.');return false;}}
function commit(change){const before=copy(state);change();if(!persist()){state=before;toast('Изменение не сохранено.');return false;}return true;}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function weekIndex(date=localISO()){return Math.max(0,Math.floor((dayNum(date)-dayNum(state.startDate))/7));}
function targetWeight(id,date=localISO()){const c=state.exerciseSettings[id];if(!c)return 0;if(c.mode==='bodyweight'||c.mode==='reps')return 0;if(c.base==null)return null;return Math.round((c.base+c.step*weekIndex(date))*100)/100;}
function targetReps(id,date,fallback){const c=state.exerciseSettings[id];return c?.mode==='reps'?c.baseReps+c.repStep*weekIndex(date):fallback;}
function draftReps(s,e,z){return z.done||z.repsManual?z.reps:String(targetReps(effectiveId(e,z),s.scheduledDate,Number(z.reps)||e.reps));}
function resultText(r){if(r.weight==null||r.reps==null)return 'В старой версии сохранена только отметка';return r.kind==='abs'?(r.weight>0?'+'+fmt(r.weight)+' кг × ':'')+r.reps+' повторений':fmt(r.weight)+' кг × '+r.reps+' повторений';}
function targetPool(date=localISO()){return 200+50*weekIndex(date);}
function planned(date){
 const found=Object.values(state.sessions).find(s=>s.scheduledDate===date&&s.tabs.length);if(found)return found;
 if(state.sessions['s_'+date])return null;
 const fresh=newSession(date,state);return fresh.tabs.length?fresh:null;
}
function current(){return state.sessions[selectedSession]||null;}
function stats(s){const all=s?s.exercises.flatMap(e=>e.sets.map(z=>({e,z}))):[];const done=all.filter(x=>x.z.done).length;const skipped=all.filter(x=>x.e.skipped&&!x.z.done).length;return {total:all.length,done,skipped,left:all.length-done-skipped};}
function allResults(){const a=[];for(const s of Object.values(state.sessions))for(const e of s.exercises)for(const z of e.sets)if(z.done&&z.result)a.push({...z.result,sid:s.id,slot:e.slot,number:z.number});return a;}
function prior(id,sid){const list=allResults().filter(r=>r.exerciseId===id&&r.sid!==sid&&r.date<=localISO()&&r.weight!=null&&r.reps!=null);if(!list.length)return [];list.sort((a,b)=>b.date.localeCompare(a.date)||String(b.completedAt||'').localeCompare(String(a.completedAt||'')));const latest=list[0];return list.filter(r=>r.sid===latest.sid&&r.date===latest.date).sort((a,b)=>a.number-b.number);}
function mayLeave(){return !settingsDirty||confirm('Несохранённые изменения формы будут потеряны. Перейти?');}
function go(p){if(!mayLeave())return;settingsDirty=false;page=p;document.querySelectorAll('.screen').forEach(x=>x.classList.toggle('active',x.id===p));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.screen===((['bases','profileSettings','backup','programSettings','timerSettings','programEditor'].includes(p))?'settings':p)));renderPage();drawTimer();window.scrollTo({top:0,behavior:'instant'});}
function renderPage(){({home:renderHome,plan:renderPlan,workout:renderWorkout,progress:renderProgress,settings:renderSettings,bases:renderBases,profileSettings:renderProfile,backup:renderBackup,programSettings:renderProgram,timerSettings:renderTimerSettings,programEditor:renderPermanentEditor})[page]?.();}
function openWorkout(dateOrId){if(!mayLeave())return;const s=state.sessions[dateOrId]||planned(dateOrId);if(!s){toast('На этот день тренировка не запланирована.');return;}if(!state.sessions[s.id]&&!commit(()=>{state.sessions[s.id]=s;}))return;selectedSession=s.id;activeTab=s.tabs[0];settingsDirty=false;go('workout');}
function openToday(){const s=planned(localISO());if(s)openWorkout(s.id in state.sessions?s.id:localISO());else go('plan');}
function renderHome(){
 const date=localISO(),s=planned(date),st=stats(s);
 $('todayDate').textContent=dateLabel(date,true);$('todayWorkout').textContent=s?s.title:'День отдыха';$('todayMeta').textContent=s?`Выполнено ${st.done} из ${st.total} подходов${s.originalDate!==date?' · перенесённая тренировка':''}`:'Откройте план, чтобы посмотреть любую тренировку.';
 $('startBtn').textContent=s?(s.finishedAt?'ОТКРЫТЬ РЕЗУЛЬТАТ И ТРЕНИРОВКУ':st.done?'ПРОДОЛЖИТЬ ТРЕНИРОВКУ':'НАЧАТЬ ТРЕНИРОВКУ'):'ОТКРЫТЬ ПЛАН НЕДЕЛИ';
 $('homeWeek').textContent=weekIndex()+1;$('homePool').textContent=targetPool()+' м';
 $('homeProfileNote').hidden=state.profile.confirmed;$('homeProfileNote').textContent='Профиль не подтверждён. Рост, текущий и целевой вес вводятся в «Настройки → Профиль».';
 $('homeStructure').textContent=s?'Пресс в начале → '+s.title+' → Пресс в конце':'Сегодня день отдыха. Своё расписание можно изменить в «Настройки → Редактор постоянной программы».';
}
function weekNav(n){planWeek=n===0?monday():shiftDate(planWeek,n*7);renderPlan();}
function renderPlan(){
 $('weekLabel').textContent=dateLabel(planWeek)+' — '+dateLabel(shiftDate(planWeek,6));$('weekGrid').innerHTML='';$('planList').innerHTML='';
 for(let i=0;i<7;i++){
  const date=shiftDate(planWeek,i),s=planned(date),moved=state.sessions['s_'+date],isMoved=moved&&moved.scheduledDate!==date;const st=stats(s);
  const b=document.createElement('button');b.className='day '+(s?.finishedAt?'done':s?'plan':'rest')+(date===localISO()?' today':'');b.innerHTML=`<span>${DAY_NAMES[dateObj(date).getDay()]}</span><b>${dateObj(date).getDate()}</b>`;b.setAttribute('aria-label',dateLabel(date,true));b.onclick=()=>{if(s)openWorkout(s.id in state.sessions?s.id:date);else if(isMoved)openWorkout(moved.id);else toast('День отдыха. Перенос выбирается из карточки тренировочного дня.');};$('weekGrid').append(b);
  const div=document.createElement('div');div.className='item';
  div.innerHTML=`<div class="row"><div><strong>${DAY_NAMES[dateObj(date).getDay()]} · ${s?esc(s.title):'Отдых'}</strong><small>${dateLabel(date)}${s&&s.originalDate!==date?' · перенесено с '+dateLabel(s.originalDate):''}</small></div><span class="badge ${s?.finishedAt?'good':s?'info':''}">${s?.finishedAt?(s.status==='partial'?'Частично':'Завершено'):s?(st.done?'В процессе':'План'):'Отдых'}</span></div>${s?`<div class="button-row"><button class="btn secondary" onclick="openWorkout('${s.id in state.sessions?s.id:date}')">Открыть</button><button class="text-button" onclick="openMove('${s.id in state.sessions?s.id:date}')">Перенести</button></div>`:''}${isMoved?`<p class="note">${esc(moved.title)} перенесено на ${dateLabel(moved.scheduledDate)}.</p>`:''}`;
  $('planList').append(div);
 }
}
let moveId=null;
function showDialog(title,body){$('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;if(!$('dialog').open)$('dialog').showModal();}
function closeDialog(){if($('dialog').open)$('dialog').close();pendingImport=null;editTarget=null;}
function openMove(dateOrId,target){
 const s=state.sessions[dateOrId]||planned(dateOrId);if(!s)return;
 if(s.finishedAt){toast('Завершённая тренировка остаётся в истории; переносить её нельзя.');return;}
 if(!state.sessions[s.id]&&!commit(()=>{state.sessions[s.id]=s;}))return;moveId=s.id;
 showDialog('Перенести тренировку',`<p><strong>${esc(s.title)}</strong></p><p class="note">Сейчас: ${dateLabel(s.scheduledDate,true)}. Постоянное расписание не изменится. Записанные подходы сохранят фактические даты.</p><label class="field-label" for="moveDate">Новая дата</label><input type="date" class="input" id="moveDate" value="${target||s.scheduledDate}"><p id="moveError" class="form-error" role="alert"></p><button class="big-action" onclick="confirmMove()">ПЕРЕНЕСТИ</button>`);
}
function moveSession(id,target){
 const s=state.sessions[id];if(!s)throw Error('Тренировка не найдена.');if(s.finishedAt)throw Error('Завершённую тренировку нельзя переносить.');if(!validDate(target))throw Error('Укажите дату.');if(target<localISO())throw Error('Для переноса выберите сегодня или будущую дату.');
 const occupant=planned(target);if(occupant&&occupant.id!==id)throw Error('В этот день уже есть «'+occupant.title+'». Выберите свободный день, чтобы не потерять другую тренировку.');
 if(!commit(()=>{s.scheduledDate=target;}))throw Error('Не удалось сохранить перенос.');return true;
}
function confirmMove(){try{moveSession(moveId,$('moveDate').value);selectedSession=moveId;closeDialog();go('workout');toast('Тренировка перенесена; предыдущие результаты сохранены.');}catch(e){$('moveError').textContent=e.message;}}
function effectiveId(e,z){return z.overrideId||e.exerciseId;}
function draftWeight(s,e,z){if(z.weight!==null)return z.weight;const n=targetWeight(effectiveId(e,z),s.scheduledDate);return n==null?'':String(n);}
function editable(s){return s&&s.scheduledDate===localISO();}
function sessionKey(sid,slot,number){return sid+'|'+slot+'|'+number;}
function locate(key){const [sid,slot,n]=String(key).split('|'),s=state.sessions[sid],e=s?.exercises.find(e=>e.slot===slot),z=e?.sets.find(z=>z.number===Number(n));return s&&e&&z?{s,e,z}:null;}
function inputDraft(key,field,value){const q=locate(key);if(!q||q.z.done||!editable(q.s)||!['weight','reps'].includes(field))return;commit(()=>{q.z[field]=String(value);if(field==='reps')q.z.repsManual=true;});}
function restFor(id){return state.exerciseSettings[id]?.rest||state.rest.seconds;}
function exerciseCard(s,e,idx){
 const meta=REGISTRY[e.exerciseId],pending=e.sets.filter(z=>!z.done),isEdit=editable(s);if(!pending.length)return '';
 if(e.skipped)return `<article class="exercise skipped" data-slot="${e.slot}"><div class="ex-head"><div><strong>${idx+1}. ${esc(meta.name)}</strong><div class="muted">Пропущено в этой тренировке</div></div></div><button class="text-button inset" onclick="unskip('${s.id}','${e.slot}')">Вернуть упражнение</button></article>`;
 const cfg=state.exerciseSettings[e.exerciseId],p=prior(e.exerciseId,s.id),repsMode=cfg?.mode==='reps',target=repsMode?targetReps(e.exerciseId,s.scheduledDate,e.reps):targetWeight(e.exerciseId,s.scheduledDate);
 const basis=repsMode?fmt(cfg.baseReps)+' повт.':cfg?.mode==='bodyweight'?'Без веса':cfg?.base==null?'Не задан':fmt(cfg.base)+' кг';
 const unit=repsMode?'повт.':'кг',step=repsMode?cfg.repStep:cfg?.step;
 const note=p.length?`${dateLabel(p[0].date)} · `+p.map(resultText).join(' / '):'Предыдущих результатов пока нет.';
 let rows='';for(const z of pending){const id=effectiveId(e,z),c=state.exerciseSettings[id],noWeight=['reps','bodyweight'].includes(c?.mode),key=sessionKey(s.id,e.slot,z.number);
 rows+=`<tr data-key="${key}"><td>${z.number}</td><td>${noWeight?'<span class="bodyweight">Без веса</span>':`<input class="set-input" type="text" inputmode="decimal" data-field="weight" aria-label="Вес, кг — подход ${z.number}" value="${esc(draftWeight(s,e,z))}" placeholder="кг" ${isEdit?'':'disabled'} oninput="inputDraft('${key}','weight',this.value)">`}${id!==e.exerciseId?`<small class="row-override">${esc(REGISTRY[id].name)}</small>`:''}</td><td><input type="text" inputmode="numeric" data-field="reps" aria-label="Повторения — подход ${z.number}" value="${esc(draftReps(s,e,z))}" ${isEdit?'':'disabled'} oninput="inputDraft('${key}','reps',this.value)"></td><td><button class="complete-button" ${isEdit?'':'disabled'} onclick="completeSet('${key}',this)">${isEdit?'✓ Выполнено':'Просмотр'}</button></td></tr>`;}
 const autoCaption=cfg?.mode==='bodyweight'?'Без дополнительного веса':`неделя ${weekIndex(s.scheduledDate)+1} · +${fmt(step)} ${unit}/нед.`;
 return `<article class="exercise ${meta.kind==='abs'?'abs':''}" data-slot="${e.slot}"><div class="ex-head"><div><strong>${idx+1}. ${esc(meta.name)}</strong><div class="muted">Осталось ${pending.length} из ${e.sets.length} · отдых ${restFor(e.exerciseId)} сек</div></div><button class="text-button" aria-label="Изменить ${esc(meta.name)}" onclick="openExerciseEdit('${s.id}','${e.slot}')">Изменить</button></div>${cfg?`<div class="weight-box"><div class="weight-stat"><b>${basis}</b><span>${repsMode?'база повторений':'базовый вес'}</span></div><div class="weight-stat"><b>${target==null?'Не задан':fmt(target)+' '+unit}</b><span>${autoCaption}</span></div></div><p class="unit-note">${repsMode?'Повторения увеличиваются каждую неделю. Фактическое число можно изменить перед отметкой.':esc(EQUIPMENT[cfg.equipment])}${cfg.base===null&&cfg.mode==='weighted'?' · задайте базу в настройках':''}</p>`:''}<div class="previous-result"><span class="eyebrow">В ПРОШЛЫЙ РАЗ</span><div>${esc(note)}</div>${p.length&&cfg?`<button class="text-button" onclick="applyPrevious('${s.id}','${e.slot}')">${repsMode?'Использовать прошлые повторения':'Использовать прошлый вес'}</button>`:''}</div><table class="set-table"><thead><tr><th>№</th><th>${meta.kind==='abs'?'Доп. кг':'кг'}</th><th>Повт.</th><th>Отметка</th></tr></thead><tbody>${rows}</tbody></table></article>`;
}
function renderWorkout(){
 let s=current();if(!s){const today=planned(localISO());if(today){if(!state.sessions[today.id]){if(!commit(()=>{state.sessions[today.id]=today;}))return;}selectedSession=today.id;s=current();}}
 $('workoutBody').hidden=!s;$('noWorkout').hidden=!!s;if(!s){$('workoutTitle').textContent='Тренировка';$('workoutSubtitle').textContent='На сегодня отдых';return;}
 const st=stats(s),isEdit=editable(s);$('workoutTitle').textContent=s.title;$('workoutSubtitle').textContent=`${dateLabel(s.scheduledDate,true)} · неделя ${weekIndex(s.scheduledDate)+1}${s.originalDate!==s.scheduledDate?' · перенос с '+dateLabel(s.originalDate):''}`;
 $('previewNote').hidden=isEdit;$('previewNote').innerHTML=`<b>Просмотр программы</b><br>Результаты не записываются за другую дату. Для выполнения перенесите эту тренировку на сегодня.<div class="button-row"><button class="btn secondary" onclick="openMove('${s.id}','${localISO()}')">Выполнить сегодня</button></div>`;
 $('moveWorkout').onclick=()=>openMove(s.id);$('setStatus').innerHTML=`<div class="row"><div><strong>Осталось ${st.left} подходов</strong><small>Выполнено ${st.done} из ${st.total}${st.skipped?' · пропущено '+st.skipped:''}</small></div><button class="completed-link" onclick="openCompleted()">Выполненные · ${st.done}</button></div><div class="set-progress"><span style="width:${st.total?st.done/st.total*100:0}%"></span></div>`;
 $('absStartList').innerHTML='';$('exerciseList').innerHTML='';$('absEndList').innerHTML='';s.exercises.forEach((e,i)=>{const id=e.slot==='abs_start'?'absStartList':e.slot==='abs_end'?'absEndList':'exerciseList';$(id).innerHTML+=exerciseCard(s,e,i);});
 if(!st.left)$('absStartList').innerHTML='<div class="empty-sets"><strong>Все доступные подходы отмечены</strong><small>Выполненные подходы — во вкладке «Прогресс». Кардио и бассейн сохраняются отдельно.</small></div>';
 for(const tab of ['gym','cardio','pool'])$(tab+'TabBtn').hidden=!s.tabs.includes(tab);
 if(!s.tabs.includes(activeTab))activeTab=s.tabs[0];switchWorkout(activeTab);
 $('poolDistance').textContent=targetPool(s.scheduledDate)+' м';$('poolLaps').textContent=`${targetPool(s.scheduledDate)/50} отрезков по 50 м · длина бассейна 50 м`;
 for(const kind of ['cardio','pool']){const a=s.activities[kind],dr=s.activityDrafts[kind];$(kind+'Min').value=dr?.minutes??a?.minutes??'';$(kind+'Min').disabled=!isEdit;$(kind+'Save').disabled=!isEdit;$(kind+'Saved').textContent=a?'Сохранено: '+(a.meta||`${fmt(a.distance)} ${kind==='pool'?'м':'км'} · ${fmt(a.minutes)} мин`):'';}
 $('cardioKm').value=s.activityDrafts.cardio?.distance??s.activities.cardio?.distance??'';$('cardioKm').disabled=!isEdit;
 $('finishState').textContent=s.finishedAt?'Тренировка завершена. Подходы сохранены в прогрессе.':'';$('finishBtn').disabled=!isEdit;$('finishBtn').textContent=s.finishedAt?'ОБНОВИТЬ ИТОГ ТРЕНИРОВКИ':'ЗАВЕРШИТЬ ТРЕНИРОВКУ';
}
function switchWorkout(tab){const s=current();if(!s||!s.tabs.includes(tab))return;activeTab=tab;for(const t of ['gym','cardio','pool']){$(t+'Tab').hidden=t!==tab;$(t+'TabBtn').classList.toggle('active',t===tab);}}
function completeSet(key,button){
 const q=locate(key);if(!q||q.z.done)return;if(!editable(q.s)){toast('Это просмотр. Сначала перенесите тренировку на сегодня.');return;}
 const id=effectiveId(q.e,q.z),meta=REGISTRY[id],cfg=state.exerciseSettings[id],row=button.closest('tr'),w=cfg?.mode==='reps'||cfg?.mode==='bodyweight'?0:num(row.querySelector('[data-field="weight"]').value),r=num(row.querySelector('[data-field="reps"]').value);
 if(!Number.isFinite(w)||w<0||w>5000){toast('Введите фактический вес от 0 до 5000 кг.');return;}if(!Number.isInteger(r)||r<1||r>500){toast('Введите целое число повторений от 1 до 500.');return;}
 armAudio();const sec=restFor(id);
 if(!commit(()=>{q.z.done=true;q.z.result={exerciseId:id,name:meta.name,kind:meta.kind,weight:w,reps:r,date:localISO(),completedAt:new Date().toISOString(),migrated:false,equipment:cfg?.equipment||null};q.z.weight=String(w);q.z.reps=String(r);q.z.repsManual=true;q.s.finishedAt=null;q.s.status='started';state.timer={active:true,endAt:Date.now()+sec*1000,remaining:sec,sessionId:q.s.id};}))return;
 renderWorkout();drawTimer();toast(`Подход ${q.z.number} сохранён в «Прогресс».`);
}
function restoreSet(key){const q=locate(key);if(!q||!q.z.done)return;if(!editable(q.s)||q.z.result.date!==localISO()){toast('Вернуть можно сегодняшний подход в тренировку, назначенную на сегодня.');return;}
 if(!commit(()=>{const r=q.z.result;q.z.weight=r.weight==null?null:String(r.weight);q.z.reps=r.reps==null?String(q.e.reps):String(r.reps);q.z.repsManual=true;q.z.overrideId=r.exerciseId===q.e.exerciseId?null:r.exerciseId;q.z.done=false;q.z.result=null;q.e.skipped=false;q.s.finishedAt=null;q.s.status='started';}))return;renderPage();toast('Подход возвращён с прежним весом и повторениями.');}
function applyPrevious(sid,slot){
 const s=state.sessions[sid],e=s?.exercises.find(x=>x.slot===slot);if(!e||!editable(s)){toast('Предыдущий результат применяется только в сегодняшней тренировке.');return;}
 const p=prior(e.exerciseId,sid);if(!p.length)return;const cfg=state.exerciseSettings[e.exerciseId],repMode=cfg?.mode==='reps',unit=cfg?.equipment;
 if(!repMode&&p.some(r=>r.equipment&&r.equipment!==unit)&&!confirm('Способ учёта веса изменился. Проверьте единицы. Продолжить?'))return;
 if(!commit(()=>{for(const z of e.sets)if(!z.done&&!z.overrideId){const r=p.find(r=>r.number===z.number)||p[p.length-1];if(repMode){z.reps=String(r.reps);z.repsManual=true;}else z.weight=String(r.weight);}}))return;
 renderWorkout();toast('Предыдущие значения подставлены. Базовые настройки и история не изменены.');
}
function openExerciseEdit(sid,slot){const s=state.sessions[sid],e=s?.exercises.find(x=>x.slot===slot);if(!e)return;editTarget={sid,slot};const meta=REGISTRY[e.exerciseId],options=meta.kind==='abs'?[meta]:CATALOG.filter(x=>x.group===meta.group);
 showDialog('Изменить упражнение',`<p class="note">Изменения действуют только в этой тренировке. Выполненные подходы сохранят прежние названия и результаты.</p><label for="editExercise" class="field-label">Упражнение</label><select id="editExercise" class="input">${options.map(x=>`<option value="${x.id}" ${x.id===e.exerciseId?'selected':''}>${esc(x.name)}</option>`).join('')}</select><div class="form-row spaced"><label>Подходов<input id="editCount" class="input" type="number" min="1" max="20" value="${e.sets.length}"></label><label>Повторений<input id="editReps" class="input" type="number" min="1" max="500" value="${e.reps}"></label></div><p id="editError" class="form-error"></p><button class="big-action" onclick="saveExerciseEdit()">СОХРАНИТЬ ДЛЯ ЭТОЙ ТРЕНИРОВКИ</button><button class="text-button inset" onclick="skipExercise()">Пропустить оставшиеся подходы упражнения</button>`);
}
function saveExerciseEdit(){const {sid,slot}=editTarget||{},s=state.sessions[sid],e=s?.exercises.find(x=>x.slot===slot);if(!e)return;const id=$('editExercise').value,n=num($('editCount').value),r=num($('editReps').value);if(!REGISTRY[id]||!Number.isInteger(n)||n<1||n>20||!Number.isInteger(r)||r<1||r>500){$('editError').textContent='Проверьте количество подходов и повторений.';return;}if(e.sets.some(z=>z.number>n&&z.done)){$('editError').textContent='Нельзя удалить выполненный подход. Сначала верните его из прогресса.';return;}
 if(!commit(()=>{const changed=e.exerciseId!==id;e.exerciseId=id;e.reps=r;e.skipped=false;e.sets=e.sets.slice(0,n);while(e.sets.length<n)e.sets.push(newSet(e.sets.length+1,r));for(const z of e.sets)if(!z.done){z.reps=String(r);z.repsManual=true;if(changed){z.weight=null;z.overrideId=null;}}s.finishedAt=null;s.manualEdits=true;s.status=stats(s).done?'started':'planned';}))return;closeDialog();renderWorkout();toast('Изменения сохранены только для этой тренировки.');}
function skipExercise(){const {sid,slot}=editTarget||{},s=state.sessions[sid],e=s?.exercises.find(x=>x.slot===slot);if(!e)return;if(commit(()=>{e.skipped=true;s.finishedAt=null;})){closeDialog();renderWorkout();toast('Оставшиеся подходы пропущены, не отмечены выполненными.');}}
function unskip(sid,slot){const e=state.sessions[sid]?.exercises.find(x=>x.slot===slot);if(e&&commit(()=>{e.skipped=false;state.sessions[sid].finishedAt=null;}))renderWorkout();}
function activityInput(kind,field,value){const s=current();if(!editable(s))return;commit(()=>{s.activityDrafts[kind]??={};s.activityDrafts[kind][field]=value;});}
function saveActivity(kind){const s=current();if(!editable(s))return;const minutes=num($(kind+'Min').value),distance=kind==='pool'?targetPool(s.scheduledDate):num($('cardioKm').value);if(!Number.isFinite(minutes)||minutes<=0||minutes>2000||!Number.isFinite(distance)||distance<=0){toast('Укажите положительные дистанцию и время.');return;}
 if(!commit(()=>{s.activities[kind]={distance,minutes,date:localISO(),savedAt:new Date().toISOString(),meta:''};s.activityDrafts[kind]={distance:String(distance),minutes:String(minutes)};s.status='started';}))return;renderWorkout();toast((kind==='pool'?'Бассейн':'Кардио')+' сохранён в истории.');}
function finishWorkout(){const s=current();if(!editable(s))return;const st=stats(s);if(st.left&&!confirm(`Осталось ${st.left} подходов. Завершить досрочно? Эти подходы не будут отмечены выполненными.`))return;
 if(!commit(()=>{s.finishedAt=new Date().toISOString();s.status=st.left||st.skipped?'partial':'done';state.timer={active:false,endAt:null,remaining:0,sessionId:null};}))return;drawTimer();go('progress');progressMode='metrics';renderProgress();toast('Итог сохранён.');}
function openCompleted(){progressMode='sets';go('progress');$('completedFilter').value='session';renderCompletedSets();}
function renderProgress(){document.querySelectorAll('[data-progress]').forEach(b=>b.classList.toggle('active',b.dataset.progress===progressMode));$('completedProgress').hidden=progressMode!=='sets';$('metricsProgress').hidden=progressMode!=='metrics';renderCompletedSets();$('progressWeight').textContent=state.profile.weight==null?'Не задан':fmt(state.profile.weight)+' кг';$('progressGoal').textContent=state.profile.goal==null?'Не задан':fmt(state.profile.goal)+' кг';renderHistory();drawChart();}
function switchProgress(mode){progressMode=mode;renderProgress();}
function renderCompletedSets(){const filter=$('completedFilter').value,records=allResults().filter(r=>filter==='all'||filter==='session'&&r.sid===selectedSession||filter==='today'&&r.date===localISO()).sort((a,b)=>b.date.localeCompare(a.date)||a.sid.localeCompare(b.sid)||a.name.localeCompare(b.name,'ru')||a.number-b.number);
 $('completedSummary').textContent=records.length+' подходов';if(!records.length){$('completedSetsList').innerHTML='<div class="empty-sets"><strong>Пока нет выполненных подходов</strong><small>Нажмите «Выполнено» в сегодняшней тренировке. Результат появится здесь.</small></div>';return;}
 let html='',lastGroup='';for(const r of records){const group=r.date+'|'+r.sid+'|'+r.exerciseId;if(group!==lastGroup){if(lastGroup)html+='</section>';html+=`<section class="done-exercise"><header><div><span class="eyebrow">${dateLabel(r.date,true)}</span><h3>${esc(r.name)}</h3><small class="muted">${esc(state.sessions[r.sid].title)}</small></div></header>`;lastGroup=group;}const result=resultText(r);const key=sessionKey(r.sid,r.slot,r.number);html+=`<div class="done-set"><div class="row"><span class="set-label">Подход ${r.number}</span><span class="done-time">${esc(timeLabel(r.completedAt))}</span></div><div class="result">${result}</div>${r.equipment?`<small class="muted">${esc(EQUIPMENT[r.equipment])}</small><br>`:''}${r.date===localISO()&&editable(state.sessions[r.sid])?`<button class="restore-set" onclick="restoreSet('${key}')">Вернуть в тренировку</button>`:''}</div>`;}html+='</section>';$('completedSetsList').innerHTML=html;
}
function renderHistory(){const records=[];for(const s of Object.values(state.sessions)){if(s.finishedAt){const st=stats(s);records.push({date:s.finishedAt.slice(0,10),title:s.title,meta:`${s.status==='partial'?'Завершено частично':'Завершено'} · ${st.done} из ${st.total} подходов`,sid:s.id});}for(const [kind,a] of Object.entries(s.activities)){records.push({date:a.date,title:kind==='pool'?'Бассейн':'Кардио',meta:a.meta||`${fmt(a.distance)} ${kind==='pool'?'м':'км'} · ${fmt(a.minutes)} мин`,sid:s.id});}}
 records.sort((a,b)=>b.date.localeCompare(a.date));$('historyList').innerHTML=records.map(r=>`<div class="item"><div class="row"><div><strong>${esc(r.title)}</strong><small>${esc(r.meta)}</small></div><span class="badge">${dateLabel(r.date)}</span></div><button class="text-button" onclick="openWorkout('${r.sid}')">Открыть детали</button></div>`).join('')+state.legacyHistory.map(h=>`<div class="item"><strong>${esc(h.title)}</strong><small>${esc(h.meta)} · ${esc(h.d)}</small></div>`).join('')||'<div class="item"><small>Пока нет завершённых тренировок, кардио или плавания.</small></div>';}
function addWeight(){showDialog('Текущий вес',`<label class="field-label" for="newWeight">Вес, кг</label><input class="input" id="newWeight" inputmode="decimal" value="${state.profile.weight==null?'':fmt(state.profile.weight)}" placeholder="Не задан"><p id="weightError" class="form-error"></p><button class="big-action" onclick="saveWeight()">СОХРАНИТЬ</button>`);}
function saveWeight(){const n=profileNumber($('newWeight').value,20,400);if(n==null){$('weightError').textContent='Введите вес от 20 до 400 кг.';return;}if(!commit(()=>{state.profile.weight=n;state.weights=state.weights.filter(x=>x.date!==localISO());state.weights.push({date:localISO(),label:localISO(),v:n});}))return;closeDialog();renderPage();}
function drawChart(){const c=$('weightChart'),ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);const a=state.weights.slice(-12);ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillStyle='#aab3c1';if(!a.length){ctx.fillText('График появится после первого замера',W/2,H/2);return;}const min=Math.min(...a.map(x=>x.v))-1,max=Math.max(...a.map(x=>x.v))+1;ctx.strokeStyle='#28303b';ctx.lineWidth=1;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(16,H*i/4);ctx.lineTo(W-16,H*i/4);ctx.stroke();}const point=(p,i)=>({x:a.length===1?W/2:34+i*(W-68)/(a.length-1),y:H-36-(p.v-min)/(max-min)*(H-64)});ctx.strokeStyle='#4f8cff';ctx.lineWidth=3;ctx.beginPath();a.forEach((p,i)=>{const {x,y}=point(p,i);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();a.forEach((p,i)=>{const {x,y}=point(p,i);ctx.fillStyle='#70d39a';ctx.beginPath();ctx.arc(x,y,4,0,7);ctx.fill();if(i===0||i===a.length-1){ctx.fillText(fmt(p.v),x,y-10);ctx.fillStyle='#aab3c1';ctx.fillText(p.date?dateLabel(p.date):p.label,x,H-12);}});}
function remaining(){return !state.timer.active?0:state.timer.endAt===null?Math.max(0,state.timer.remaining):Math.max(0,Math.ceil((state.timer.endAt-Date.now())/1000));}
function drawTimer(){const n=remaining(),visible=state.timer.active&&n>0;$('restBar').hidden=!visible;document.body.classList.toggle('timer-visible',visible);$('timerTime').textContent=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;$('timerPause').textContent=state.timer.endAt===null?'Продолжить':'Пауза';}
function toggleTimer(){if(!state.timer.active)return;if(!commit(()=>{if(state.timer.endAt!==null){state.timer.remaining=remaining();state.timer.endAt=null;}else state.timer.endAt=Date.now()+state.timer.remaining*1000;}))return;armAudio();drawTimer();}
function extendTimer(){if(!state.timer.active)return;commit(()=>{if(state.timer.endAt!==null)state.timer.endAt+=30000;else state.timer.remaining+=30;});drawTimer();}
function skipTimer(){if(commit(()=>{state.timer={active:false,endAt:null,remaining:0,sessionId:null};}))drawTimer();}
function armAudio(){if(!state.rest.sound)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx??=new AC();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});}catch(e){}}
function timerSound(){if(state.rest.sound&&audioCtx?.state==='running'){try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.frequency.value=660;g.gain.setValueAtTime(.12,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.35);o.start();o.stop(audioCtx.currentTime+.36);}catch(e){}}if(state.rest.vibration&&navigator.vibrate)navigator.vibrate([100,50,100]);}
function timerTick(){if(state.timer.active&&state.timer.endAt!==null&&remaining()===0){state.timer={active:false,endAt:null,remaining:0,sessionId:null};persist();timerSound();toast('Отдых окончен. Таймер запустится после следующего подхода.');}drawTimer();}
function renderSettings(){$('editorSummary').textContent='Дни, порядок, подходы · '+state.programVersions.length+' версий расписания';$('profileSummary').textContent=state.profile.confirmed?'Профиль подтверждён':'Заполнить и подтвердить профиль';$('basesSummary').textContent=`${ALL_EXERCISES.filter(e=>state.exerciseSettings[e.id].base!=null||state.exerciseSettings[e.id].mode!=='weighted').length} из ${ALL_EXERCISES.length} настроек нагрузки · индивидуальные прибавки`;$('programSummary').textContent=`Начало ${dateLabel(state.startDate)} · неделя ${weekIndex()+1}`;$('timerSummary').textContent=`${state.rest.seconds} сек · появляется после подхода`;$('backupSummary').textContent=state.backup.lastExportAt?'Копия создана '+new Date(state.backup.lastExportAt).toLocaleString('ru-RU'):'Создать или восстановить копию';}
function markDirty(){settingsDirty=true;}
function renderProfile(){for(const [id,key] of [['heightInput','height'],['profileWeight','weight'],['goalInput','goal']])$(id).value=state.profile[key]==null?'':fmt(state.profile[key]);$('profileStatus').textContent=state.profile.confirmed?'Ваш профиль подтверждён.':'Укажите свои данные. В этой версии нет заранее заполненных роста и веса.';}
function saveProfile(){const h=profileNumber($('heightInput').value,50,260),w=profileNumber($('profileWeight').value,20,400),g=profileNumber($('goalInput').value,20,400);if(h==null||w==null||g==null){$('profileError').textContent='Укажите рост 50–260 см, текущий и целевой вес 20–400 кг.';return;}
 if(!commit(()=>{const changed=state.profile.weight!==w;state.profile={height:h,weight:w,goal:g,confirmed:true,onboardingSeen:true};if(changed||!state.weights.length){state.weights=state.weights.filter(x=>x.date!==localISO());state.weights.push({date:localISO(),label:localISO(),v:w});}}))return;settingsDirty=false;$('profileError').textContent='';go('settings');toast('Профиль подтверждён и сохранён.');}
function renderBases(){
 const groups=[...new Set(ALL_EXERCISES.map(e=>e.group))];
 $('baseGroups').innerHTML=groups.map((group,i)=>`<details class="base-group" ${i===0?'open':''} data-group="${esc(group)}"><summary>${group}<span>${ALL_EXERCISES.filter(e=>e.group===group).length}</span></summary><div class="group-content">${ALL_EXERCISES.filter(e=>e.group===group).map(e=>{
 const c=state.exerciseSettings[e.id],abs=e.kind==='abs';
 return `<article class="base-card base-entry" data-id="${e.id}"><h3>${esc(e.name)}${e.alternative?' <small class="muted">· замена</small>':''}</h3>${abs?`<label class="field-label" for="mode_${e.id}">Что увеличивать каждую неделю</label><select class="input" id="mode_${e.id}" onchange="baseEdited('${e.id}')"><option value="reps" ${c.mode==='reps'?'selected':''}>Количество повторений</option><option value="weighted" ${c.mode==='weighted'?'selected':''}>Дополнительный вес, кг</option><option value="bodyweight" ${c.mode==='bodyweight'?'selected':''}>Без автоприбавки</option></select><p class="mode-hint">Вес — только дополнительное отягощение, не масса тела. Выберите один способ прибавки.</p>`:`<label class="field-label" for="equipment_${e.id}">Как считать вес</label><select id="equipment_${e.id}" class="input" onchange="baseEdited('${e.id}')">${Object.entries(EQUIPMENT).filter(([k])=>k!=='extra').map(([k,v])=>`<option value="${k}" ${(c.mode==='bodyweight'?'bodyweight':c.equipment)===k?'selected':''}>${v}</option>`).join('')}</select>`}
 <div id="loadFields_${e.id}" class="form-row spaced"><label for="base_${e.id}">${abs?'База доп. веса, кг':'База, кг'}<input id="base_${e.id}" class="input" type="text" inputmode="decimal" placeholder="Не задана" value="${c.base==null?'':fmt(c.base)}" oninput="baseEdited('${e.id}')"></label><label for="step_${e.id}">Прибавка / нед., кг<input id="step_${e.id}" class="input" type="text" inputmode="decimal" list="weightSteps" value="${fmt(c.step)}" oninput="baseEdited('${e.id}')"></label></div>
 ${abs?`<div id="repFields_${e.id}" class="form-row spaced"><label for="baseReps_${e.id}">База повторений<input id="baseReps_${e.id}" class="input" type="text" inputmode="numeric" value="${c.baseReps}" oninput="baseEdited('${e.id}')"></label><label for="repStep_${e.id}">Прибавка / нед., повт.<input id="repStep_${e.id}" class="input" type="text" inputmode="numeric" value="${c.repStep}" oninput="baseEdited('${e.id}')"></label></div>`:''}
 <label class="field-label" for="rest_${e.id}">Отдых после подхода, сек</label><input id="rest_${e.id}" class="input" type="text" inputmode="numeric" placeholder="Общий: ${state.rest.seconds}" value="${c.rest==null?'':c.rest}" oninput="markDirty()"><div class="base-preview" id="basePreview_${e.id}"></div></article>`;
 }).join('')}</div></details>`).join('');
 for(const e of ALL_EXERCISES)previewBase(e.id);$('baseSavedNote').textContent='';
}
function previewBase(id){
 const abs=REGISTRY[id].kind==='abs',mode=abs?$('mode_'+id).value:$('equipment_'+id).value==='bodyweight'?'bodyweight':'weighted';
 const bw=mode==='bodyweight',rp=mode==='reps';$('loadFields_'+id).hidden=abs&&mode!=='weighted';if(abs)$('repFields_'+id).hidden=!rp;
 $('base_'+id).disabled=bw||rp;$('step_'+id).disabled=bw||rp;
 const b=num($(rp?'baseReps_'+id:'base_'+id).value),s=num($(rp?'repStep_'+id:'step_'+id).value),unit=rp?'повт.':'кг';
 const ok=Number.isFinite(b)&&b>=(rp?1:0)&&Number.isFinite(s)&&s>=(rp?0:0.01)&&(!rp||(Number.isInteger(b)&&Number.isInteger(s)));
 $('basePreview_'+id).textContent=bw?'Автоприбавка выключена. Повторения берутся из постоянной программы.':ok?`1-я неделя: ${fmt(b)} ${unit} → 2-я: ${fmt(b+s)} ${unit} → 3-я: ${fmt(b+2*s)} ${unit}. Сейчас: ${fmt(b+weekIndex()*s)} ${unit}.`:'Введите корректную базу и прибавку. Пустая база веса означает «не задана».';
}
function baseEdited(id){markDirty();previewBase(id);}
function saveBases(){
 const values={};
 for(const e of ALL_EXERCISES){
  const abs=e.kind==='abs',old=state.exerciseSettings[e.id],mode=abs?$('mode_'+e.id).value:$('equipment_'+e.id).value==='bodyweight'?'bodyweight':'weighted';
  const baseText=$('base_'+e.id).value,base=baseText.trim()===''?null:num(baseText),step=num($('step_'+e.id).value),restText=$('rest_'+e.id).value,rest=restText.trim()===''?null:num(restText);
  const baseReps=abs?num($('baseReps_'+e.id).value):null,repStep=abs?num($('repStep_'+e.id).value):null;
  const invalid=mode==='weighted'&&((base!==null&&(!Number.isFinite(base)||base<0||base>5000))||!Number.isFinite(step)||step<=0||step>100)||rest!==null&&(!Number.isInteger(rest)||rest<5||rest>900)||mode==='reps'&&(!Number.isInteger(baseReps)||baseReps<1||baseReps>500||!Number.isInteger(repStep)||repStep<0||repStep>100);
  if(invalid){$('baseSavedNote').textContent='Проверьте базу, прибавку или отдых: '+e.name;const d=$('base_'+e.id).closest('details');d.open=true;d.scrollIntoView({block:'start',behavior:'smooth'});return;}
  values[e.id]={...old,base:mode==='weighted'?base:old.base,mode,step:mode==='weighted'?step:old.step,equipment:abs?(mode==='weighted'?'extra':'bodyweight'):mode==='bodyweight'?'bodyweight':$('equipment_'+e.id).value,rest};
  if(abs){values[e.id].baseReps=mode==='reps'?baseReps:old.baseReps;values[e.id].repStep=mode==='reps'?repStep:old.repStep;}
 }
 if(commit(()=>{state.exerciseSettings=values;})){settingsDirty=false;$('baseSavedNote').textContent='Сохранено. Завершённые подходы и вручную введённые результаты не пересчитаны.';toast('Базы и недельные прибавки сохранены, включая пресс.');}
}
function renderProgram(){$('startDateInput').value=state.startDate;$('programDetails').textContent=`Сейчас неделя ${weekIndex()+1}. Бассейн: ${targetPool()} м.`;}
function saveProgram(){const d=$('startDateInput').value;if(!validDate(d)){toast('Укажите дату.');return;}if(d!==state.startDate&&!confirm('Новая дата изменит будущие расчётные веса и дистанции. Выполненные результаты останутся прежними. Сохранить?'))return;if(commit(()=>{state.startDate=d;})){settingsDirty=false;go('settings');}}
function renderTimerSettings(){$('restSeconds').value=state.rest.seconds;$('soundToggle').checked=state.rest.sound;$('vibrationToggle').checked=state.rest.vibration;}
function saveTimerSettings(){const n=num($('restSeconds').value);if(!Number.isInteger(n)||n<5||n>900){toast('Укажите целое время от 5 до 900 секунд.');return;}if(commit(()=>{state.rest={seconds:n,sound:$('soundToggle').checked,vibration:$('vibrationToggle').checked};})){armAudio();settingsDirty=false;go('settings');toast('Настройки отдыха сохранены.');}}
function counts(s){return {sessions:Object.values(s.sessions).filter(x=>x.finishedAt||x.exercises.some(e=>e.sets.some(z=>z.done))||Object.keys(x.activities).length).length,sets:Object.values(s.sessions).reduce((a,x)=>a+x.exercises.reduce((n,e)=>n+e.sets.filter(z=>z.done).length,0),0),weights:s.weights.length,bases:ALL_EXERCISES.filter(e=>s.exerciseSettings[e.id].base!=null||s.exerciseSettings[e.id].mode!=='weighted').length,programs:s.programVersions.length};}
function backupText(c){return `${c.sessions} тренировок с результатами · ${c.sets} подходов · ${c.weights} замеров · ${c.bases} базовых настроек · ${c.programs||1} версий программы`;}
function renderBackup(){$('backupCounts').textContent=backupText(counts(state));$('lastBackup').textContent=state.backup.lastExportAt?'Последняя созданная копия: '+new Date(state.backup.lastExportAt).toLocaleString('ru-RU'):'Резервная копия ещё не создавалась.';try{$('restoreSnapshot').hidden=!localStorage.getItem(SNAPSHOT_KEY);}catch(e){$('restoreSnapshot').hidden=true;}}
function downloadJSON(data,name){
 const text=JSON.stringify(data,null,2);
 if(window.VirkanPlatform?.isAndroid){window.VirkanPlatform.saveBackup(text,name);return 'native';}
 const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return 'browser';
}
function exportData(){
 const now=new Date().toISOString(),snapshot=copy(state);snapshot.backup.lastExportAt=now;
 try{
  const mode=downloadJSON({app:'Virkan Gym',schemaVersion:VERSION,version:'1.9',exportedAt:now,state:snapshot},'Virkan_Gym_backup_'+localISO()+'_'+Date.now()+'.json');
  if(mode==='native'){toast('Выберите папку и подтвердите сохранение JSON.');}
  else{commit(()=>{state.backup.lastExportAt=now;});if(page==='backup')renderBackup();toast('Загрузка JSON начата. Проверьте сохранённый файл.');}
 }catch(e){toast('Не удалось создать файл: '+e.message);}
}
window.virkanNativeExportFinished=function(ok){
 if(ok){commit(()=>{state.backup.lastExportAt=new Date().toISOString();});if(page==='backup')renderBackup();toast('JSON-файл сохранён.');}
 else{toast('JSON не сохранён. Данные приложения не изменены.');}
};
async function importData(event){const f=event.target.files[0];if(!f)return;try{if(f.size>5*1024*1024)throw Error('Размер копии больше 5 МБ.');const raw=JSON.parse(await f.text());if(raw.app&&raw.app!=='Virkan Gym')throw Error('Файл другого приложения.');const data=raw.state||raw,v=normalize(data);pendingImport={value:v,source:raw,filename:f.name};const old=Number(data.schemaVersion)!==VERSION;
 showDialog('Предварительный просмотр копии',`<p class="filename">${esc(f.name)}</p><div class="notice"><b>В копии:</b><br>${backupText(counts(v))}</div><p class="note">Создана: ${raw.exportedAt&&Number.isFinite(Date.parse(raw.exportedAt))?new Date(raw.exportedAt).toLocaleString('ru-RU'):'дата не указана'}</p><p class="note">Сейчас в приложении: ${backupText(counts(state))}.</p>${old?'<p class="notice">Копия прежней версии: результаты и индивидуальные веса сохраняются. Для пресса добавлена прибавка повторений по умолчанию; проверьте её. Сохранённые ранее подходы не пересчитываются.</p>':''}<p>Восстановление <b>заменит</b> текущие данные. Перед заменой сохранится локальная копия текущего состояния.</p><button class="btn secondary full" onclick="exportData()">Сначала скачать текущие данные</button><button class="big-action" onclick="confirmImport()">ВОССТАНОВИТЬ ИЗ ЭТОЙ КОПИИ</button>`);
 }catch(e){toast('Импорт не выполнен: '+e.message);}finally{event.target.value='';}}
function confirmImport(){if(!pendingImport)return;const prior=copy(state),next=pendingImport.value;try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify({app:'Virkan Gym',schemaVersion:VERSION,state:prior}));state=next;if(!persist()){state=prior;throw Error('Браузер не сохранил замену.');}selectedSession=null;activeTab=null;closeDialog();settingsDirty=false;go('backup');toast('Копия восстановлена. Старые данные доступны кнопкой возврата.');if(!state.profile.confirmed)promptProfile();}catch(e){state=prior;toast(e.message);}}
function restoreSnapshot(){try{const raw=localStorage.getItem(SNAPSHOT_KEY);if(!raw)return;if(!confirm('Вернуть данные до последнего импорта или сброса? Текущие будут заменены.'))return;const v=normalize(JSON.parse(raw).state),old=state;state=v;if(!persist()){state=old;return;}selectedSession=null;renderPage();toast('Данные до замены восстановлены.');}catch(e){toast('Не удалось восстановить локальную копию: '+e.message);}}
function resetAll(){if(!confirm('Сбросить профиль, настройки и результаты? Перед сбросом рекомендуется скачать JSON-копию.'))return;try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify({app:'Virkan Gym',schemaVersion:VERSION,state}));}catch(e){toast('Не удалось создать защитную копию. Сброс отменён.');return;}if(commit(()=>{state=initialState();})){selectedSession=null;settingsDirty=false;go('home');promptProfile();}}
function promptProfile(){if(state.profile.confirmed||state.profile.onboardingSeen)return;showDialog('Подтвердите свой профиль',`<p>Введите рост, текущий и целевой вес в настройках профиля. Заранее заданных значений нет.</p><p class="note">Если вы восстановили старую копию, проверьте перенесённые данные перед подтверждением.</p><button class="big-action" onclick="onboardingProfile()">ОТКРЫТЬ НАСТРОЙКИ ПРОФИЛЯ</button><button class="text-button inset" onclick="skipOnboarding()">Заполнить позже</button>`);}
function onboardingProfile(){closeDialog();settingsDirty=false;go('profileSettings');}
function skipOnboarding(){commit(()=>{state.profile.onboardingSeen=true;});closeDialog();}


// Android adapter: no network or watch integration.
window.virkanHandleBack=function(){
 if($('dialog').open){closeDialog();return true;}
 if(page==='home')return false;
 go(['bases','profileSettings','backup','programSettings','timerSettings','programEditor'].includes(page)?'settings':'home');
 return true;
};
window.virkanOnResume=function(){checkDay();timerTick();};

// Permanent program: date-based snapshots. Edits never overwrite recorded results.
let editorDraft=null,editorDow=1;
function nextMonday(){return shiftDate(monday(),7);}
function renderPermanentEditor(){
 const from=nextMonday();editorDraft={effectiveFrom:from,days:copy(programRevision(from,state).days)};editorDow=dateObj(localISO()).getDay();if(!editorDraft.days[editorDow].tabs.length)editorDow=1;
 $('editorFrom').value=from;$('editorFrom').min=localISO();$('editorError').textContent='';$('editorSaved').textContent='';renderEditorDay();
}
function editorDateChanged(){if(!editorDraft)return;editorDraft.effectiveFrom=$('editorFrom').value;markDirty();$('editorSaved').textContent='Выбранная дата применения изменена. Состав программы остаётся в редакторе до сохранения.';}
function loadEditorForDate(){const d=$('editorFrom').value;if(!validDate(d)){toast('Укажите дату.');return;}if(settingsDirty&&!confirm('Заменить несохранённый черновик программой, действующей на выбранную дату?'))return;editorDraft={effectiveFrom:d,days:copy(programRevision(d,state).days)};settingsDirty=false;renderEditorDay();$('editorSaved').textContent='Загружена программа на '+dateLabel(d,true)+'.';}
function selectEditorDay(d){editorDow=d;renderEditorDay();}
function editorTitle(v){editorDraft.days[editorDow].title=v;markDirty();}
function editorInteger(field,v,index=null){const n=num(v);if(index===null)editorDraft.days[editorDow][field]=n;else editorDraft.days[editorDow].items[index][field]=n;markDirty();}
function editorEnabled(on){const p=editorDraft.days[editorDow];if(on){p.tabs=['gym'];if(p.title==='Отдых')p.title=PLAN[editorDow].tabs.length?PLAN[editorDow].title:'Тренировка';}else p.tabs=[];markDirty();renderEditorDay();}
function editorActivity(kind,on){const p=editorDraft.days[editorDow];p.tabs=p.tabs.filter(x=>x!==kind);if(on)p.tabs.push(kind);if(!p.tabs.length)p.tabs=['gym'];markDirty();}
function selectExerciseOptions(chosen){return [...new Set(CATALOG.map(e=>e.group))].map(g=>`<optgroup label="${g}">${CATALOG.filter(e=>e.group===g).map(e=>`<option value="${e.id}" ${e.id===chosen?'selected':''}>${esc(e.name)}</option>`).join('')}</optgroup>`).join('');}
function editorExercise(i,id){const p=editorDraft.days[editorDow];if(p.items.some((x,k)=>k!==i&&x[0]===id)){toast('Это упражнение уже есть в данном дне.');renderEditorDay();return;}p.items[i][0]=id;markDirty();}
function addEditorExercise(){const p=editorDraft.days[editorDow],id=$('editorAddSelect').value;if(!id||p.items.some(x=>x[0]===id)){toast('Выберите упражнение, которого ещё нет в дне.');return;}p.items.push([id,3,10]);markDirty();renderEditorDay();}
function shiftEditorItem(i,delta){const a=editorDraft.days[editorDow].items,j=i+delta;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];markDirty();renderEditorDay();}
function removeEditorItem(i){editorDraft.days[editorDow].items.splice(i,1);markDirty();renderEditorDay();}
function absEditorBlock(start){const id=start?'abs_start':'abs_end',p=editorDraft.days[editorDow],cfg=state.exerciseSettings[id],setKey=start?'absStartSets':'absEndSets',repKey=start?'absStartReps':'absEndReps',rp=cfg.mode==='reps';return `<div class="abs-anchor"><span class="eyebrow">${start?'ПЕРВОЕ УПРАЖНЕНИЕ':'ПОСЛЕДНЕЕ УПРАЖНЕНИЕ'}</span><strong>${esc(REGISTRY[id].name)}</strong><div class="form-row spaced"><label>Подходов<input id="editor_${setKey}" class="input" type="number" min="1" max="20" value="${Number.isFinite(p[setKey])?p[setKey]:''}" oninput="editorInteger('${setKey}',this.value)"></label><label>${rp?'Повт. первой недели':'Повторений'}<input id="editor_${repKey}" class="input" type="number" min="1" max="500" value="${rp?cfg.baseReps:Number.isFinite(p[repKey])?p[repKey]:''}" ${rp?'disabled':''} oninput="editorInteger('${repKey}',this.value)"></label></div>${rp?`<p class="note">База ${cfg.baseReps} + ${cfg.repStep} повт./нед. Управление — в базовых весах, группа «Пресс».</p>`:''}</div>`;}
function renderEditorDay(){
 const p=editorDraft.days[editorDow],on=p.tabs.length>0;
 $('editorDays').innerHTML=[1,2,3,4,5,6,0].map(d=>`<button class="${d===editorDow?'active':''}" aria-pressed="${d===editorDow}" onclick="selectEditorDay(${d})">${DAY_NAMES[d]}<small>${editorDraft.days[d].tabs.length?'Занятие':'Отдых'}</small></button>`).join('');
 $('editorDayBody').innerHTML=`<div class="card"><label class="toggle-row"><input id="editorTraining" type="checkbox" ${on?'checked':''} onchange="editorEnabled(this.checked)"><span>Тренировочный день · ${DAY_NAMES[editorDow]}</span></label>${on?`<label class="field-label" for="editorTitle">Название тренировки</label><input id="editorTitle" class="input" maxlength="100" value="${esc(p.title)}" oninput="editorTitle(this.value)"><div class="editor-activities spaced"><label><input type="checkbox" id="editorCardio" ${p.tabs.includes('cardio')?'checked':''} onchange="editorActivity('cardio',this.checked)">Кардио</label><label><input type="checkbox" id="editorPool" ${p.tabs.includes('pool')?'checked':''} onchange="editorActivity('pool',this.checked)">Бассейн</label></div><p class="note">Отмеченные кардио и бассейн идут после основного блока и перед заключительным прессом.</p>`:'<p class="note">В этот день программа не назначается.</p>'}</div>${on?absEditorBlock(true)+`<div class="editor-heading"><h3>Основные упражнения</h3><span class="badge">${p.items.length}</span></div>`+p.items.map(([id,n,r],i)=>`<article class="program-row" data-program-index="${i}"><label class="field-label" for="editorExercise_${i}">${i+2}. Упражнение</label><select class="input" id="editorExercise_${i}" onchange="editorExercise(${i},this.value)">${selectExerciseOptions(id)}</select><div class="form-row spaced"><label>Подходов<input class="input" type="number" min="1" max="20" id="editorSets_${i}" value="${Number.isFinite(n)?n:''}" oninput="editorInteger(1,this.value,${i})"></label><label>Повторений<input class="input" type="number" min="1" max="500" id="editorReps_${i}" value="${Number.isFinite(r)?r:''}" oninput="editorInteger(2,this.value,${i})"></label></div><div class="program-controls"><button class="btn secondary" ${i===0?'disabled':''} onclick="shiftEditorItem(${i},-1)" aria-label="Переместить вверх ${esc(REGISTRY[id].name)}">↑</button><button class="btn secondary" ${i===p.items.length-1?'disabled':''} onclick="shiftEditorItem(${i},1)" aria-label="Переместить вниз ${esc(REGISTRY[id].name)}">↓</button><button class="text-button remove" onclick="removeEditorItem(${i})">Убрать</button></div></article>`).join('')+`<div class="card spaced"><label class="field-label" for="editorAddSelect">Добавить упражнение</label><select class="input" id="editorAddSelect"><option value="">Выберите упражнение</option>${selectExerciseOptions('')}</select><button class="btn secondary full spaced" onclick="addEditorExercise()">+ Добавить в этот день</button></div>`+((p.tabs.includes('cardio')||p.tabs.includes('pool'))?`<p class="notice spaced">После основных упражнений: ${[p.tabs.includes('cardio')?'кардио':'',p.tabs.includes('pool')?'бассейн':''].filter(Boolean).join(' → ')}.</p>`:'')+absEditorBlock(false):''}`;
}
function protectedSession(s){return !!(s.finishedAt||s.status==='started'||s.manualEdits||s.originalDate!==s.scheduledDate||Object.keys(s.activities).length||Object.values(s.activityDrafts).some(d=>Object.values(d).some(x=>String(x??'').trim()!==''))||s.exercises.some(e=>e.skipped||e.sets.some(z=>z.done||z.weight!==null||z.repsManual)));}
function savePermanentProgram(){
 try{
  if(!editorDraft)throw Error('Откройте редактор заново.');const from=$('editorFrom').value;
  if(!validDate(from)||from<localISO())throw Error('Выберите сегодня или будущую дату применения.');
  for(const p of Object.values(editorDraft.days))if(p.tabs.length&&!p.title.trim())throw Error('Укажите название каждого тренировочного дня.');
  const days=normalizeProgramDays(editorDraft.days),nextVersion=state.programVersions.find(v=>v.effectiveFrom>from);
  const changed=Object.values(state.sessions).filter(x=>x.originalDate>=from&&(!nextVersion||x.originalDate<nextVersion.effectiveFrom));
  const retained=changed.filter(protectedSession).length,preview=changed.filter(x=>!protectedSession(x));
  if(!confirm(`Сохранить постоянную программу с ${dateLabel(from,true)}?${nextVersion?' Она действует до '+dateLabel(nextVersion.effectiveFrom)+', затем включится уже сохранённая следующая версия.':''}\n${retained?'Начатые, изменённые или перенесённые тренировки ('+retained+') сохранят прежнюю программу.\n':''}Архив не изменится. Нетронутые будущие просмотры обновятся.`))return;
  const version={id:'p_'+Date.now(),effectiveFrom:from,savedAt:new Date().toISOString(),days};
  if(!commit(()=>{state.programVersions=state.programVersions.filter(v=>v.effectiveFrom!==from);state.programVersions.push(version);state.programVersions.sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));for(const x of preview){delete state.sessions[x.id];if(selectedSession===x.id)selectedSession=null;}}))return;
  settingsDirty=false;editorDraft={effectiveFrom:from,days:copy(days)};$('editorError').textContent='';$('editorSaved').textContent=`Сохранено с ${dateLabel(from,true)}. Будущие занятия используют новую программу. История и начатые тренировки сохранены.`;toast('Постоянная программа сохранена.');
 }catch(e){$('editorError').textContent=e.message;}
}
function resetEditorDraft(){if(!confirm('Вернуть исходные Пн/Вт/Чт/Сб только в черновик редактора? Данные изменятся лишь после сохранения.'))return;editorDraft.days=defaultProgram();markDirty();renderEditorDay();$('editorSaved').textContent='Исходный план восстановлен в черновике. Сохраните, чтобы применить.';}

function checkDay(){if(lastDay!==localISO()){lastDay=localISO();if(!settingsDirty)renderPage();}}
if (!globalThis.VIRKAN_TEST_MODE) {
window.addEventListener('beforeunload',e=>{if(settingsDirty){e.preventDefault();e.returnValue='';}});
function syncNavOffset(){const h=document.querySelector('.bottom').getBoundingClientRect().height;document.documentElement.style.setProperty('--nav-height',Math.ceil(h+8)+'px');}
window.addEventListener('resize',syncNavOffset);
window.addEventListener('focus',()=>{checkDay();timerTick();});document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkDay();timerTick();}});
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue)warn('Данные изменены в другой вкладке. Перед продолжением обновите эту страницу; несохранённую форму сначала сохраните отдельно.');});
$('dialog').addEventListener('cancel',()=>{pendingImport=null;editTarget=null;});
syncNavOffset();renderPage();drawTimer();if(loadNotice)warn(loadNotice);promptProfile();
setInterval(timerTick,250);setInterval(checkDay,30000);


}
