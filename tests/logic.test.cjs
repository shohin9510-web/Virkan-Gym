'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../web/cycle-data.js'), 'utf8')+'\n'+fs.readFileSync(path.join(__dirname, '../web/cards-index.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname, '../web/app.js'), 'utf8');

function app() {
  let now = Date.parse('2026-10-01T09:00:00+05:00');
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

test('Blank profile; no invented weight or history',()=>{const a=app();equalPlain(a.run('state.profile'),{height:null,weight:null,goal:null,confirmed:false,onboardingSeen:false});assert.equal(a.run('state.weights.length'),0);});
test('Default training days are Monday, Tuesday, Thursday, Saturday',()=>{const a=app();equalPlain(a.run('Object.entries(PLAN).filter(([d,p])=>p.tabs.length).map(([d])=>Number(d))'),[1,2,4,6]);});
test('Tuesday and Saturday include swimming',()=>{const a=app();equalPlain(a.run('PLAN[2].tabs'),['cardio','pool']);equalPlain(a.run('PLAN[6].tabs'),['gym','pool']);});
test('Tuesday Thursday Saturday have abdominal anchors; Monday has none',()=>{const a=app();for(const d of ['2026-09-29','2026-10-01','2026-10-03']){const e=a.run(`newSession('${d}',state).exercises`);assert.equal(e[0].slot,'abs_start');assert.equal(e.at(-1).slot,'abs_end');assert.equal(e.filter(x=>x.slot.startsWith('abs')).length,2);}});
test('Rest days have no exercises',()=>{const a=app();assert.equal(a.run("newSession('2026-09-30',state).exercises.length"),0);});
test('Upper pulldown starts with a 5 kg weekly increment',()=>{const a=app();a.run("state.startDate='2026-09-28'; state.exerciseSettings.lat_pull.base=50");equalPlain(a.run("['2026-09-28','2026-10-05','2026-10-12'].map(d=>targetWeight('lat_pull',d))"),[50,55,60]);});
test('Bench increment is 2.5 kg',()=>{const a=app();a.run("state.startDate='2026-09-28';state.exerciseSettings.bench.base=70");equalPlain(a.run("['2026-09-28','2026-10-05','2026-10-12'].map(d=>targetWeight('bench',d))"),[70,72.5,75]);});
test('Custom machine increment is used',()=>{const a=app();a.run("state.startDate='2026-09-28';state.exerciseSettings.leg_press.base=80;state.exerciseSettings.leg_press.step=10");assert.equal(a.run("targetWeight('leg_press','2026-10-12')"),100);});
test('Missing base is not a zero base',()=>{const a=app();assert.equal(a.run("targetWeight('bench')"),null);a.run("state.startDate='2026-09-28';state.exerciseSettings.bench.base=0");assert.equal(a.run("targetWeight('bench','2026-10-05')"),2.5);});
test('Abs repetition progression',()=>{const a=app();a.run("state.startDate='2026-09-28'");assert.equal(a.run("targetReps('abs_start','2026-10-12',20)"),14);assert.equal(a.run("targetReps('abs_end','2026-10-12',15)"),14);});
test('Abs weighted mode counts only additional weight',()=>{const a=app();a.run("state.startDate='2026-09-28';Object.assign(state.exerciseSettings.abs_start,{mode:'weighted',base:0,step:2.5});state.profile.weight=110");assert.equal(a.run("targetWeight('abs_start','2026-10-12')"),5);});
test('Swimming no longer calculates planned distance',()=>{const a=app();a.run("state.startDate='2026-09-28'");equalPlain(a.run("['2026-09-28','2026-10-05','2026-10-12'].map(targetPool)"),[null,null,null]);});
test('Calendar increments occur only after seven dates',()=>{const a=app();a.run("state.startDate='2026-09-28'");assert.equal(a.run("weekIndex('2026-10-04')"),0);assert.equal(a.run("weekIndex('2026-10-05')"),1);assert.equal(a.run("weekIndex('2026-09-01')"),0);});
test('Invalid calendar date is rejected',()=>{const a=app();assert.equal(a.run("validDate('2026-02-30')"),false);assert.equal(a.run("validDate('2024-02-29')"),true);});
test('Progress calculations are idempotent',()=>{const a=app();a.run("state.exerciseSettings.bench.base=70");const before=a.run('JSON.stringify(state)');for(let i=0;i<20;i++)a.run("targetWeight('bench')");assert.equal(a.run('JSON.stringify(state)'),before);});
test('Fixed 90 second rest ignores old duration overrides',()=>{const a=app();a.run('state.rest.seconds=60;state.exerciseSettings.lat_pull.rest=120');assert.equal(a.run("restFor('lat_pull')"),90);assert.equal(a.run("restFor('bench')"),90);});
test('Permanent program version begins on its effective date',()=>{const a=app();a.run("var custom=defaultProgram();custom[1].title='Новая программа';state.programVersions.push({id:'p_test',effectiveFrom:'2026-10-05',savedAt:null,days:custom})");assert.equal(a.run("newSession('2026-09-28',state).title"),'Грудь + трицепс + бассейн');assert.equal(a.run("newSession('2026-10-05',state).title"),'Новая программа');});
test('Program changes do not mutate already stored sessions',()=>{const a=app();a.run("state.sessions.s_2026= newSession('2026-09-28',state);var p=defaultProgram();p[1].items=[];state.programVersions.push({id:'p_new',effectiveFrom:'2026-10-05',savedAt:null,days:p})");assert.equal(a.run('state.sessions.s_2026.exercises.length'),6);});
test('Schema 20 round-trip retains progression and versions',()=>{const a=app();a.run("state.exerciseSettings.lat_pull.base=50;state.profile.height=177");assert.equal(a.run('normalize(copy(state)).exerciseSettings.lat_pull.base'),50);assert.equal(a.run('normalize(copy(state)).profile.height'),177);});
test('Schema 18 is migrated without invented profile data',()=>{const a=app();a.run('var old=copy(state);old.schemaVersion=18;delete old.programVersions');assert.equal(a.run('normalize(old).schemaVersion'),20);assert.equal(a.run('normalize(old).profile.confirmed'),false);});
test('Future schema is rejected',()=>{const a=app();assert.throws(()=>a.run('normalize({...state,schemaVersion:99})'),/новой версии/);});
test('Negative progression in backup is rejected',()=>{const a=app();a.run('var bad=copy(state);bad.exerciseSettings.bench.step=-5');assert.throws(()=>a.run('normalize(bad)'),/числовое/);});
test('Comma decimal input is accepted',()=>{const a=app();assert.equal(a.run("num('72,5')"),72.5);assert.equal(a.run("num('1 200,5')"),1200.5);});
test('Imported text is escaped, not injected',()=>{const a=app();assert.equal(a.run("esc('<img src=x onerror=alert(1)>')"),'&lt;img src=x onerror=alert(1)&gt;');});
test('Backup statistics are empty at first launch',()=>{const a=app();assert.equal(a.run('counts(state).sets'),0);assert.equal(a.run('counts(state).sessions'),0);});
test('Expired timer hides and does not remain negative',()=>{const a=app();a.run('state.timer={active:true,endAt:Date.now()+1000,remaining:1,sessionId:null};drawTimer()');assert.equal(a.node('restBar').hidden,false);a.tick(1200);a.run('timerTick()');assert.equal(a.node('restBar').hidden,true);assert.equal(a.run('remaining()'),0);});
test('Paused timer retains its remaining value',()=>{const a=app();a.run('state.timer={active:true,endAt:null,remaining:37,sessionId:null}');a.tick(50000);assert.equal(a.run('remaining()'),37);});
test('Skipping timer clears it',()=>{const a=app();a.run('state.timer={active:true,endAt:Date.now()+90000,remaining:90,sessionId:null};skipTimer()');assert.equal(a.run('state.timer.active'),false);assert.equal(a.node('restBar').hidden,true);});
test('Completed set is archived with actual result and timer restarts',()=>{const a=app();a.run("var ss=newSession(localISO(),state);state.sessions[ss.id]=ss;selectedSession=ss.id;renderWorkout=()=>{};state.exerciseSettings.lat_pull.base=50;var key=sessionKey(ss.id,'lat_pull',1)");a.context.button={closest:()=>({querySelector:s=>({value:s.includes('weight')?'55':'11'})})};a.run('completeSet(key,button)');assert.equal(a.run('allResults()[0].weight'),55);assert.equal(a.run('allResults()[0].reps'),11);assert.equal(a.run('state.timer.active'),true);assert.equal(a.run('remaining()'),90);assert.equal(a.run('stats(current()).done'),1);});
test('Duplicate completion does not duplicate the result',()=>{const a=app();a.run("var ss=newSession(localISO(),state);state.sessions[ss.id]=ss;selectedSession=ss.id;renderWorkout=()=>{};var key=sessionKey(ss.id,'abs_start',1)");a.context.button={closest:()=>({querySelector:()=>({value:'20'})})};a.run('completeSet(key,button);completeSet(key,button)');assert.equal(a.run('allResults().length'),1);});
test('Failed storage rolls back a change',()=>{const a=app();a.context.localStorage.setItem=()=>{throw Error('full');};assert.equal(a.run('commit(()=>{state.profile.weight=99})'),false);assert.equal(a.run('state.profile.weight'),null);});
test('Native export cancellation does not set backup date',()=>{const a=app();a.run('window.virkanNativeExportFinished(false)');assert.equal(a.run('state.backup.lastExportAt'),null);});
test('Successful native export sets backup date',()=>{const a=app();a.run('window.virkanNativeExportFinished(true)');assert.ok(a.run('state.backup.lastExportAt'));});
test('Stable storage key does not depend on filename or release label',()=>{const a=app();assert.equal(a.run('KEY'),'virkan_gym_html_state');});

test('Cycle is 1-2-3-1',()=>{const a=app();a.run("state.startDate='2026-09-28'");equalPlain(a.run("['2026-09-28','2026-10-05','2026-10-12','2026-10-19'].map(d=>programRevision(d,state).cycleIndex)"),[0,1,2,0]);});
test('All Mondays are 3 chest + 3 triceps without abs',()=>{const a=app();for(const d of ['2026-09-28','2026-10-05','2026-10-12']){a.run(`var s=newSession('${d}',state)`);assert.equal(a.run('s.exercises.length'),6);for(const g of ['Грудь','Трицепс'])assert.equal(a.run(`s.exercises.filter(e=>REGISTRY[e.exerciseId].group==='${g}').length`),3);}});
test('All Thursdays are 2 abs + 3 back + 3 biceps',()=>{const a=app();for(const d of ['2026-10-01','2026-10-08','2026-10-15']){a.run(`var s=newSession('${d}',state)`);assert.equal(a.run('s.exercises.length'),8);for(const g of ['Спина','Бицепс'])assert.equal(a.run(`s.exercises.filter(e=>REGISTRY[e.exerciseId].group==='${g}').length`),3);}});
test('All Saturdays are 2 abs + 3 legs + 3 accessories',()=>{const a=app();for(const d of ['2026-10-03','2026-10-10','2026-10-17']){a.run(`var s=newSession('${d}',state)`);assert.equal(a.run('s.exercises.length'),8);assert.equal(a.run("s.exercises.filter(e=>REGISTRY[e.exerciseId].group==='Ноги').length"),3);assert.equal(a.run("s.exercises.filter(e=>!['Ноги','Пресс'].includes(REGISTRY[e.exerciseId].group)).length"),3);}});
test('Pool scheduled on all four days',()=>{const a=app();for(const d of ['2026-09-28','2026-09-29','2026-10-01','2026-10-03'])assert.ok(a.run(`newSession('${d}',state).tabs.includes('pool')`));});
test('Three cardio variants',()=>{const a=app();equalPlain(a.run("['2026-09-29','2026-10-06','2026-10-13'].map(d=>newSession(d,state).cardioType)"),['treadmill','bike','elliptical']);});
test('Three abs combinations',()=>{const a=app();equalPlain(a.run("['2026-09-29','2026-10-06','2026-10-13'].map(d=>newSession(d,state).exercises.map(e=>e.exerciseId))"),[['abs_start','reverse_crunch'],['dead_bug','abs_start'],['reverse_crunch','dead_bug']]);});
test('Dips cannot prescribe extra load',()=>{const a=app();a.run("Object.assign(state.exerciseSettings.dips,{base:50,step:20,mode:'weighted'})");assert.equal(a.run("targetWeight('dips','2026-12-01')"),0);assert.equal(a.run('normalize(copy(state)).exerciseSettings.dips.mode'),'bodyweight');});
test('Personal weighted bases stay blank',()=>{const a=app();assert.ok(a.run("CATALOG.filter(e=>e.id!=='dips').every(e=>state.exerciseSettings[e.id].base===null)"));});
test('Pool check has no fake distance, time or rest timer',()=>{const a=app();a.run("var s=newSession(localISO(),state);state.sessions[s.id]=s;selectedSession=s.id;renderWorkout=()=>{};togglePool()");assert.equal(a.run('s.activities.pool.meta'),'Выполнено');assert.equal(a.run("Object.hasOwn(s.activities.pool,'distance')"),false);assert.equal(a.run("Object.hasOwn(s.activities.pool,'minutes')"),false);assert.equal(a.run('state.timer.active'),false);});
test('Pool check is reversible and preserves exercises',()=>{const a=app();a.run("var s=newSession(localISO(),state);state.sessions[s.id]=s;selectedSession=s.id;renderWorkout=()=>{};togglePool();togglePool()");assert.equal(a.run('s.activities.pool'),undefined);assert.equal(a.run('s.exercises.length'),8);});
test('No future pool results',()=>{const a=app();a.run("var s=newSession('2026-10-08',state);state.sessions[s.id]=s;selectedSession=s.id;togglePool()");assert.equal(a.run('s.activities.pool'),undefined);});
test('Missing pool prevents full completion',()=>{const a=app();a.run("var s=newSession(localISO(),state);state.sessions[s.id]=s;selectedSession=s.id;go=()=>{};for(const e of s.exercises)for(const z of e.sets)z.done=true;finishWorkout()");assert.equal(a.run('s.status'),'partial');});
test('Finished sets and pool give full completion',()=>{const a=app();a.run("var s=newSession(localISO(),state);state.sessions[s.id]=s;selectedSession=s.id;go=()=>{};for(const e of s.exercises)for(const z of e.sets)z.done=true;s.activities.pool={date:localISO(),meta:'Выполнено'};finishWorkout()");assert.equal(a.run('s.status'),'done');});
test('Pool check survives JSON roundtrip',()=>{const a=app();a.run("var s=newSession(localISO(),state);state.sessions[s.id]=s;selectedSession=s.id;renderWorkout=()=>{};togglePool()");assert.equal(a.run('normalize(copy(state)).sessions[s.id].activities.pool.meta'),'Выполнено');});
test('Three variants survive JSON roundtrip',()=>{const a=app();assert.equal(a.run('normalize(copy(state)).programVersions[0].cycles.length'),3);assert.equal(a.run('normalize(copy(state)).programVersions[0].cycles[1][1].items[0][0]'),'dips');});
test('Invalid two-week cycle rejected',()=>{const a=app();a.run('var bad=copy(state);bad.programVersions[0].cycles.pop()');assert.throws(()=>a.run('normalize(bad)'),/3 недели/);});
test('v19 custom program, profile and bases preserved',()=>{const a=app();a.run("var old=copy(state);old.schemaVersion=19;delete old.programVersions[0].cycles;old.programVersions[0].days[1].title='Моя программа';old.exerciseSettings.bench.base=47.5;old.profile.weight=92");assert.equal(a.run('normalize(old).exerciseSettings.bench.base'),47.5);assert.equal(a.run('normalize(old).profile.weight'),92);assert.equal(a.run('normalize(old).programVersions[0].days[1].title'),'Моя программа');});
test('Old timer settings cannot override fixed rest',()=>{const a=app();a.run('var old=copy(state);old.schemaVersion=19;old.rest.seconds=300;old.exerciseSettings.bench.rest=240');assert.equal(a.run('normalize(old).rest.seconds'),90);assert.equal(a.run('normalize(old).exerciseSettings.bench.rest'),null);});
test('Old pool records retained as history',()=>{const a=app();a.run("var s=newSession(localISO(),state);state.sessions[s.id]=s;s.activities.pool={date:localISO(),distance:300,minutes:10,meta:'Прежнее плавание'}");assert.equal(a.run('normalize(copy(state)).sessions[s.id].activities.pool.distance'),300);});
test('Invalid abs selection is rejected',()=>{const a=app();a.run("var p=defaultProgram();p[4].absStartExercise='bench'");assert.throws(()=>a.run('normalizeProgramDays(p)'),/пресс/);});
test('No unknown scheduled exercises',()=>{const a=app();assert.ok(a.run('v20DefaultCycles().every(w=>Object.values(w).every(d=>d.items.every(x=>REGISTRY[x[0]])))'));});
test('Pool UI is after final abs and has no meter or time fields',()=>{const h=fs.readFileSync(path.join(__dirname,'../web/index.html'),'utf8');assert.ok(h.indexOf('id="poolTab"')>h.indexOf('id="absEndList"'));for(const id of ['poolMin','poolDistance','restSeconds'])assert.ok(!h.includes('id="'+id+'"'));assert.ok(!h.includes('onclick="extendTimer()"'));});
