'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../web/document-data.js'), 'utf8')+'\n'+fs.readFileSync(path.join(__dirname, '../web/cycle-data.js'), 'utf8')+'\n'+fs.readFileSync(path.join(__dirname, '../web/cards-index.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname, '../web/notifications.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname, '../web/app.js'), 'utf8');

function app() {
  let now = Date.parse('2026-10-26T09:00:00+05:00');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const storage = new Map(), nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {value:'',hidden:false,open:false,textContent:'',innerHTML:'',
      classList:{toggle(){},add(){},remove(){}}, addEventListener(){},getContext(){return new Proxy({}, {get:()=>()=>{}});},
      getBoundingClientRect(){return {height:72};},querySelectorAll(){return [];}});
    return nodes.get(id);
  };
  const context = vm.createContext({
    VIRKAN_TEST_MODE:true, Date:Clock, console,
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},
    window:{},navigator:{}, confirm:()=>true,
    document:{getElementById:node,querySelectorAll:()=>[],body:{classList:{toggle(){}}}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  });
  vm.runInContext(code, context, {timeout:2000});
  return {run:s=>vm.runInContext(s,context,{timeout:2000}),node,context,storage,tick:n=>{now+=n;}};
}
function equalPlain(actual, expected) { assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected); }


test('Schema 22 and blank profile',()=>{const a=app();assert.equal(a.run('VERSION'),22);assert.equal(a.run('state.profile.weight'),null);assert.equal(a.run('state.profile.confirmed'),false);});
test('Keep exact source date, no silent Monday shift',()=>{const a=app();assert.equal(a.run('state.startDate'),'2026-10-23');});
test('All 44 numeric base/step pairs match Word',()=>{const a=app();assert.equal(a.run('DOC_PLAN.weights.filter(x=>!x.bodyweight).length'),44);assert.equal(a.run('DOC_PLAN.weights.filter(x=>!x.bodyweight).every(x=>state.exerciseSettings[x.id].base===x.base&&state.exerciseSettings[x.id].step===x.step)'),true);});
test('Both no-load entries preserved',()=>{const a=app();for(const id of ['dips','glute_bridge'])assert.equal(a.run(`state.exerciseSettings.${id}.mode`),'bodyweight');});
test('Missing TR05 and TR06 base AND step remain null',()=>{const a=app();for(const id of ['rope_overhead','single_push']){assert.equal(a.run(`state.exerciseSettings.${id}.base`),null);assert.equal(a.run(`state.exerciseSettings.${id}.step`),null);}});
test('Abs progression is NOT invented from empty cells',()=>{const a=app();for(const id of ['abs_start','reverse_crunch','dead_bug']){assert.equal(a.run(`state.exerciseSettings.${id}.mode`),'bodyweight');assert.equal(a.run(`state.exerciseSettings.${id}.repStep`),null);assert.equal(a.run(`targetReps('${id}','2026-12-30',12)`),12);}});
test('Tuesday is reserved with no invented neck exercises',()=>{const a=app();const s=a.run("newSession('2026-10-27',state)");assert.equal(s.exercises.length,0);assert.ok(s.docIssues.includes('tue_plan'));});
test('Wednesday cycles and source abs set counts',()=>{const a=app();equalPlain(a.run("['2026-10-28','2026-11-04','2026-11-11'].map(d=>newSession(d,state).cardioType)"),['treadmill','bike','elliptical']);equalPlain(a.run("newSession('2026-10-28',state).exercises.map(e=>e.sets.length)"),[1,3]);});
test('Saturday plank 2 x 60 SECONDS not repetitions',()=>{const a=app();const e=a.run("newSession('2026-10-24',state).exercises[0]");assert.equal(e.exerciseId,'plank');assert.equal(e.unit,'seconds');equalPlain(e.sets.map(x=>x.reps),['60','60']);});
test('Saturday duplicate abs quantities remain a marked placeholder',()=>{const a=app();assert.equal(a.run("newSession('2026-11-07',state).exercises.at(-1).exerciseId"),'doc_sat_end3');});
test('Friday and Sunday remain rest days',()=>{const a=app();for(const d of ['2026-10-23','2026-10-25'])assert.equal(a.run(`newSession('${d}',state).tabs.length`),0);});
test('Explicit abs choice uses its own identity',()=>{const a=app();assert.equal(a.run("documentCycles({doc_press_pr01:'abs_start'})[0][1].absStartExercise"),'abs_start');});
test('Invalid review values are not accepted',()=>{const a=app();equalPlain(a.run("cleanDocumentSelections({monPool:'hacked',doc_trap:'shrug',trapCount:60,trapUnit:'kg',doc_press_pr01:'bench'})"),{});});
test('Weight increment uses source 5kg and is idempotent',()=>{const a=app();assert.equal(a.run("targetWeight('lat_pull','2026-10-30')"),40);assert.equal(a.run("targetWeight('lat_pull','2026-11-06')"),45);assert.equal(a.run("targetWeight('lat_pull','2026-11-06')"),45);});
test('User edit overrides source weight for normal operation',()=>{const a=app();a.run('state.exerciseSettings.bench.base=77');assert.equal(a.run("targetWeight('bench','2026-10-23')"),77);});
test('Body weight dips do not receive automatic extra load',()=>{const a=app();assert.equal(a.run("targetWeight('dips','2028-01-01')"),0);});
test('Fixed timer ignores old 60/120 overrides',()=>{const a=app();a.run('state.rest.seconds=60;state.exerciseSettings.bench.rest=120');assert.equal(a.run("restFor('bench')"),90);});
test('Completed approach archives actual weights and restarts timer',()=>{const a=app();a.run("var s=newSession(localISO(),state);state.sessions[s.id]=s;selectedSession=s.id;renderWorkout=()=>{};var key=sessionKey(s.id,'barbell_curl',1)");a.context.button={closest:()=>({querySelector:x=>({value:x.includes('weight')?'38':'11'})})};a.run('completeSet(key,button)');assert.equal(a.run('allResults()[0].weight'),38);assert.equal(a.run('allResults()[0].reps'),11);assert.equal(a.run('remaining()'),90);a.tick(2000);a.run("completeSet(sessionKey(s.id,'barbell_curl',2),button)");assert.equal(a.run('remaining()'),90);});
test('Completion is not duplicated',()=>{const a=app();a.run("var s=newSession(localISO(),state);state.sessions[s.id]=s;selectedSession=s.id;renderWorkout=()=>{};var key=sessionKey(s.id,'barbell_curl',1)");a.context.button={closest:()=>({querySelector:x=>({value:x.includes('weight')?'35':'12'})})};a.run('completeSet(key,button);completeSet(key,button)');assert.equal(a.run('allResults().length'),1);});
test('Expired rest becomes hidden',()=>{const a=app();a.run('state.timer={active:true,endAt:Date.now()+1000,remaining:1,sessionId:null};drawTimer()');assert.equal(a.node('restBar').hidden,false);a.tick(1500);a.run('timerTick()');assert.equal(a.node('restBar').hidden,true);});
test('Paused timer retains remaining duration',()=>{const a=app();a.run('state.timer={active:true,endAt:null,remaining:37,sessionId:null}');a.tick(50000);assert.equal(a.run('remaining()'),37);});
test('Source ambiguity prevents pretending a workout is fully done',()=>{const a=app();a.run("var s=newSession('2026-10-26',state);for(const e of s.exercises)for(const z of e.sets)z.done=true");assert.ok(a.run('pendingDocumentCount(s)')>0);});
test('Plank result uses seconds after JSON round trip',()=>{const a=app();a.run("var s=newSession('2026-10-24',state);var z=s.exercises[0].sets[0];z.done=true;z.result={exerciseId:'plank',name:'Планка',kind:'abs',weight:0,reps:60,unit:'seconds',date:'2026-10-24'};state.sessions[s.id]=s;var v=normalize(copy(state))");assert.equal(a.run('v.sessions[s.id].exercises[0].sets[0].result.unit'),'seconds');assert.equal(a.run('resultText(v.sessions[s.id].exercises[0].sets[0].result)'),'60 сек');});
test('Failed persistence rolls changes back',()=>{const a=app();a.context.localStorage.setItem=()=>{throw Error('full');};assert.equal(a.run('commit(()=>state.profile.weight=99)'),false);assert.equal(a.run('state.profile.weight'),null);});
test('No fictitious measurements or activity history',()=>{const a=app();assert.equal(a.run('state.weights.length'),0);assert.equal(a.run('Object.keys(state.sessions).length'),0);});
test('Future schemas rejected',()=>{const a=app();assert.throws(()=>a.run('normalize({...state,schemaVersion:99})'),/новой версии/);});
test('Bad imported number rejected',()=>{const a=app();assert.throws(()=>a.run('normalize({...state,exerciseSettings:{bench:{base:-1}}})'),/числовое/);});
test('HTML source text is escaped',()=>{const a=app();assert.equal(a.run("esc('<script>')"),'&lt;script&gt;');});
test('Decimal comma and spaces accepted',()=>{const a=app();assert.equal(a.run("num('12,5')"),12.5);assert.equal(a.run("num('1 200,5')"),1200.5);});
test('Sunday remains unchanged after opening plan',()=>{const a=app();assert.equal(a.run("newSession('2026-10-25',state).title"),'Отдых');});
test('Sound is enabled initially but user preference persists',()=>{const a=app();assert.equal(a.run('state.rest.sound'),true);a.run('state.rest.sound=false');assert.equal(a.run('normalize(copy(state)).rest.sound'),false);});
test('Data identity stable between HTML and Android exports',()=>{const a=app();assert.equal(a.run('KEY'),'virkan_gym_html_state');});
test('Actual v20 backup preserves results, profile, custom weights and old program',()=>{const a=app();a.context.old20=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy20.json'),'utf8'));a.run('var imported=normalize(old20)');assert.equal(a.run('imported.profile.height'),180);assert.equal(a.run('imported.exerciseSettings.bench.base'),77);assert.equal(a.run("imported.sessions.s_2026"),undefined);});
test('Actual v20 archived result is not rewritten by new document plan',()=>{const a=app();a.context.old20=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy20.json'),'utf8'));a.run('var imported=normalize(old20)');assert.equal(a.run("imported.sessions['s_2026-10-01'].exercises.find(e=>e.exerciseId==='lat_pull').sets[0].result.weight"),35);assert.equal(a.run("imported.programVersions[0].days[1].title"),'Грудь + трицепс + бассейн');});
test('Approved pairings across all 3 weeks',()=>{const a=app();const pairs=[{1:['Бицепс','Трицепс'],4:['Грудь','Спина']},{1:['Бицепс','Грудь'],4:['Трицепс','Спина']},{1:['Спина','Бицепс'],4:['Грудь','Трицепс']}];for(let i=0;i<3;i++)for(const day of [1,4])equalPlain(a.run(`documentCycles({})[${i}][${day}].items.map(x=>REGISTRY[x[0]].group)`),[...Array(3).fill(pairs[i][day][0]),...Array(3).fill(pairs[i][day][1])]);});
test('Pool and abs in 4 confirmed days, no pool Tuesday',()=>{const a=app();for(let i=0;i<3;i++)for(const d of [1,2,3,4,6]){assert.equal(a.run(`documentCycles({})[${i}][${d}].tabs.includes('pool')`),d!==2);assert.equal(a.run(`documentCycles({})[${i}][${d}].includeAbs`),d!==2);}});
test('Confirmed flags override obsolete source disagreements',()=>{const a=app();for(let c=0;c<3;c++)for(const d of [1,4])equalPlain(a.run(`documentCycles({monPool:'no',thuPool:'no',thuAbs:'no'})[${c}][${d}].docIssues`),[]);assert.equal(a.run("documentCycles({tuesday:'rest'})[0][2].title"),'Шея + трапеция');});
test('Saturday 3 legs + 3 accessories remains unchanged',()=>{const a=app();for(let c=0;c<3;c++){assert.equal(a.run(`documentCycles({})[${c}][6].items.length`),6);equalPlain(a.run(`documentCycles({})[${c}][6].items.slice(0,3).map(x=>REGISTRY[x[0]].group)`),['Ноги','Ноги','Ноги']);}});
test('Trap 3 x 60 reps and independent unassigned weight',()=>{const a=app();a.run("var s=newSession('2026-10-24',state);var e=s.exercises.find(x=>x.exerciseId==='doc_trap')");assert.equal(a.run('e.unit'),'reps');equalPlain(a.run('e.sets.map(z=>z.reps)'),['60','60','60']);assert.equal(a.run('state.exerciseSettings.doc_trap.base'),null);assert.equal(a.run('state.exerciseSettings.lateral_raise.base'),10);});
test('Trap can be explicitly remapped but stays 60 repetitions',()=>{const a=app();equalPlain(a.run("documentCycles({doc_trap:'shrug',trapUnit:'seconds',trapCount:10})[0][6].items[3]"),['shrug',3,60]);assert.equal(a.run("documentCycles({doc_trap:'shrug',trapUnit:'seconds'})[0][6].itemUnits[3]"),'reps');});
test('All new cycles validate and normalize roundtrip',()=>{const a=app();assert.equal(a.run('documentCycles({}).map(normalizeProgramDays).length'),3);assert.equal(a.run('normalize(copy(state)).schemaVersion'),22);});
test('Three-week pattern repeats in fourth week',()=>{const a=app();assert.equal(a.run("newSession('2026-11-16',state).title"),a.run("newSession('2026-10-26',state).title"));});
test('Notification defaults off, no assumed permission',()=>{const a=app();assert.equal(a.run('state.notifications.enabled'),false);equalPlain(a.run('previewReminders()'),[]);});
test('Invalid notification times safely rejected',()=>{const a=app();assert.equal(a.run("normalizeNotifications({days:{1:{plan:'99:78'}}}).days[1].plan"),'08:00');});
test('Notification days match 5 training days',()=>{const a=app();equalPlain(a.run('Object.entries(defaultNotifications().days).filter(x=>x[1].enabled).map(x=>Number(x[0]))'),[1,2,3,4,6]);});
test('Notifications restore with JSON, not enabled by legacy copy',()=>{const a=app();a.run("state.notifications.enabled=true;state.notifications.days[1].plan='09:23'");assert.equal(a.run('normalize(copy(state)).notifications.days[1].plan'),'09:23');a.run('var v=copy(state);v.schemaVersion=21;delete v.notifications');assert.equal(a.run('normalize(v).notifications.enabled'),false);});
test('Notification cycle titles follow actual group pairings',()=>{const a=app();equalPlain(a.run('reminderPayload().versions[0].cycles.map(c=>c[1].title)'),['Бицепс + трицепс','Бицепс + грудь','Спина + бицепс']);});
test('Native reminder payload excludes profile and weights',()=>{const a=app();const p=a.run('JSON.stringify(reminderPayload())');assert.ok(!p.includes('exerciseSettings'));assert.ok(!p.includes('height'));assert.ok(!p.includes('108.4'));});
test('Finished workout no longer eligible for any reminder',()=>{const a=app();a.run('var s=newSession(localISO(),state);s.finishedAt=new Date().toISOString()');for(const k of ['plan','workout','unfinished','pool'])assert.equal(a.run(`reminderCandidate(s,'${k}')`),false);});
test('Pool completion suppresses only pool reminder until finish',()=>{const a=app();a.run('var s=newSession(localISO(),state);s.activities.pool={date:localISO()}');assert.equal(a.run("reminderCandidate(s,'pool')"),false);assert.equal(a.run("reminderCandidate(s,'workout')"),true);});
test('Moved training and source date are both synchronized',()=>{const a=app();a.run("var s=newSession(localISO(),state);s.scheduledDate='2026-10-30';state.sessions[s.id]=s");assert.equal(a.run('reminderPayload().sessions[0].date'),'2026-10-30');assert.equal(a.run('reminderPayload().sessions[0].originalDate'),'2026-10-26');});
test('Single release version string and local finish date',()=>{const a=app();assert.equal(a.run('APP_VERSION'),'2.2.0');const s=fs.readFileSync(path.join(__dirname,'../web/app.js'),'utf8');assert.ok(!s.includes("version:'2.0'"));assert.ok(s.includes('date:localISO(new Date(s.finishedAt))'));});
