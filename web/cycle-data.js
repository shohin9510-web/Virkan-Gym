/* Virkan Gym v2.0. Exercise identities are stable; images are mapped individually. */
const V20_ROWS=[
['bench','Жим штанги лёжа','Грудь','barbell'],['incline_db','Жим гантелей на наклонной скамье','Грудь','dumbbell'],['incline_bb','Жим штанги на наклонной скамье','Грудь','barbell'],['chest_fly','Сведение рук в тренажёре','Грудь','machine'],['flat_db','Жим гантелей лёжа','Грудь','dumbbell'],['machine_press','Жим от груди в тренажёре','Грудь','machine'],['dips','Брусья — собственный вес','Грудь','bodyweight'],['cable_fly','Сведение рук в кроссовере','Грудь','machine'],['db_fly','Разводка гантелей лёжа','Грудь','dumbbell'],
['triceps_push','Разгибание рук на верхнем блоке','Трицепс','machine'],['triceps_overhead','Разгибание гантели из-за головы двумя руками','Трицепс','dumbbell'],['french_press','Французский жим с изогнутой штангой лёжа','Трицепс','barbell'],['rope_push','Разгибание рук с канатом на верхнем блоке','Трицепс','machine'],['rope_overhead','Разгибание рук из-за головы с канатом','Трицепс','machine'],['single_push','Разгибание одной руки на верхнем блоке','Трицепс','machine'],['kickback','Разгибание руки с гантелью в наклоне','Трицепс','dumbbell'],
['lat_pull','Тяга верхнего блока к груди','Спина','machine'],['lat_neutral','Тяга верхнего блока нейтральным хватом','Спина','machine'],['lat_close','Тяга верхнего блока узким хватом','Спина','machine'],['row','Тяга горизонтального блока','Спина','machine'],['one_arm_row','Тяга гантели одной рукой','Спина','dumbbell'],['supported_row','Тяга гантелей с опорой грудью на скамью','Спина','dumbbell'],['straight_pull','Тяга прямыми руками на верхнем блоке','Спина','machine'],['bent_row','Тяга штанги в наклоне','Спина','barbell'],
['barbell_curl','Сгибание рук с изогнутой штангой','Бицепс','barbell'],['curl','Сгибание рук с гантелями стоя','Бицепс','dumbbell'],['seated_curl','Сгибание рук с гантелями сидя','Бицепс','dumbbell'],['hammer','Молотковые сгибания','Бицепс','dumbbell'],['preacher','Сгибание рук на скамье Скотта','Бицепс','barbell'],['cable_curl','Сгибание рук на нижнем блоке','Бицепс','machine'],['incline_curl','Сгибание рук с гантелями на наклонной скамье','Бицепс','dumbbell'],
['squat','Приседания со штангой','Ноги','barbell'],['leg_press','Жим ногами','Ноги','machine'],['leg_curl','Сгибание ног лёжа','Ноги','machine'],['leg_curl_seated','Сгибание ног сидя','Ноги','machine'],['leg_ext','Разгибание ног в тренажёре','Ноги','machine'],['calf','Подъём на носки стоя','Ноги','machine'],['calf_seated','Подъём на носки сидя','Ноги','machine'],['reverse_lunge','Выпады назад с гантелями','Ноги','dumbbell'],['rdl','Румынская тяга','Ноги','barbell'],
['lateral_raise','Подъём гантелей через стороны','Дельты','dumbbell'],['reverse_fly','Обратное разведение рук в тренажёре','Дельты','machine'],['shoulder_press','Жим гантелей сидя','Дельты','dumbbell'],['shrug','Шраги с гантелями','Трапеция','dumbbell'],['wrist_extension','Разгибание кистей с гантелями','Предплечья','dumbbell'],['wrist_curl','Сгибание кистей с гантелями','Предплечья','dumbbell'],['glute_bridge','Ягодичный мост','Ягодицы','extra'],['glute_cable','Отведение ноги назад на нижнем блоке','Ягодицы','machine'],['pallof','Жим перед собой с сопротивлением повороту корпуса','Корпус','machine']
];
const V20_CATALOG=V20_ROWS.map(([id,name,group,equipment])=>({id,name,group,equipment,step:equipment==='machine'?5:2.5,alternative:id==='bent_row',kind:'weighted',lockedBodyweight:id==='dips'})).concat(DOC_PLAN.pending.filter(e=>e.kind!=='abs'));
const V20_ABS=[['abs_start','Скручивания лёжа'],['reverse_crunch','Обратные скручивания'],['dead_bug','Поочерёдное опускание противоположных руки и ноги'],['abs_end','Подъём ног лёжа — прежний вариант']].map(([id,name])=>({id,name,group:'Пресс',kind:'abs',alternative:id==='abs_end'})).concat([{id:'plank',name:'Планка',group:'Пресс',kind:'abs',unit:'seconds'},{id:'machine_leg_raise',name:'Подъём ног на тренажёре',group:'Пресс',kind:'abs'}],DOC_PLAN.pending.filter(e=>e.kind==='abs'));
const V20_CARDIO={treadmill:'Ходьба на беговой дорожке',bike:'Велотренажёр',elliptical:'Эллиптический тренажёр'};
const V20_ITEMS=[
{1:['bench','incline_db','chest_fly','triceps_push','triceps_overhead','french_press'],4:['lat_pull','row','one_arm_row','barbell_curl','seated_curl','hammer'],6:['squat','leg_curl','calf','lateral_raise','shrug','glute_bridge']},
{1:['dips','incline_bb','cable_fly','french_press','rope_overhead','single_push'],4:['lat_neutral','supported_row','straight_pull','curl','preacher','cable_curl'],6:['leg_press','leg_curl_seated','calf_seated','reverse_fly','wrist_extension','pallof']},
{1:['flat_db','machine_press','db_fly','triceps_overhead','rope_push','kickback'],4:['row','lat_close','one_arm_row','hammer','incline_curl','barbell_curl'],6:['reverse_lunge','rdl','leg_ext','shoulder_press','wrist_curl','glute_cable']}
];
function v20LegacyDefaultCycles(){return V20_ITEMS.map((items,c)=>Object.fromEntries([0,1,2,3,4,5,6].map(d=>[d,{title:({1:'Грудь + трицепс + бассейн',2:'Кардио + бассейн',4:'Спина + бицепс + бассейн',6:'Ноги + дополнительные группы + бассейн'})[d]||'Отдых',tabs:d===2?['cardio','pool']:[1,4,6].includes(d)?['gym','pool']:[],items:(items[d]||[]).map(id=>[id,2,['squat','rdl','bench','dips'].includes(id)?10:12]),includeAbs:[2,4,6].includes(d),absStartExercise:['abs_start','dead_bug','reverse_crunch'][c],absEndExercise:['reverse_crunch','abs_start','dead_bug'][c],absStartSets:1,absEndSets:2,absStartReps:c===1?8:12,absEndReps:c===2?8:12,cardioType:['treadmill','bike','elliptical'][c]}])));}
const V20_CUES={
'Грудь':'Устойчивая опора • Движение под контролем',
'Трицепс':'Плечо держите устойчиво • Не раскачивайте корпус',
'Спина':'Контролируйте корпус • Тяните без рывков',
'Бицепс':'Не раскачивайтесь • Возвращайте вес плавно',
'Ноги':'Устойчивая опора • Комфортная контролируемая амплитуда',
'Дельты':'Не подбрасывайте вес • Плечи не поднимайте к ушам',
'Трапеция':'Поднимайте плечи вверх • Не вращайте плечами',
'Предплечья':'Предплечья на опоре • Движение только в кистях',
'Ягодицы':'Таз под контролем • Не переразгибайте поясницу',
'Корпус':'Не поворачивайте корпус вслед за тросом',
'Пресс':'Двигайтесь плавно • Не тяните голову руками'
};

function v20DefaultCycles(){return documentCycles({});}
function sourceDocumentCycles(d={}){
 const cycles=JSON.parse(JSON.stringify(DOC_PLAN.cycles));
 for(const p of cycles){
  if(d.monPool){p[1].docIssues=p[1].docIssues.filter(x=>x!=='mon_pool');if(d.monPool==='yes')p[1].tabs.push('pool');}
  if(d.thuPool){p[4].docIssues=p[4].docIssues.filter(x=>x!=='thu_pool');if(d.thuPool==='yes')p[4].tabs.push('pool');}
  if(d.thuAbs){p[4].docIssues=p[4].docIssues.filter(x=>x!=='thu_abs');p[4].includeAbs=d.thuAbs==='yes';if(p[4].includeAbs)for(const k of ['absStartExercise','absEndExercise','absStartSets','absEndSets','absStartReps','absEndReps'])p[4][k]=p[3][k];}
  if(d.tuesday==='rest'){p[2].tabs=[];p[2].title='Отдых';p[2].docIssues=[];}
  for(const day of Object.values(p)){
   for(const pre of ['absStart','absEnd']){const old=day[pre+'Exercise'];if(d[old]&&DOC_PLAN.pending.some(e=>e.id===old)){
    day[pre+'Exercise']=d[old];if(old==='doc_sat_end3')day[pre+'Reps']=Number(d.satEndCount);
   }}
   day.itemUnits=[];
   day.items=day.items.map(([id,n,r],i)=>{if(id==='doc_trap'&&d.doc_trap){day.itemUnits[i]=d.trapUnit;return [d.doc_trap,n,Number(d.trapCount)];}return [id,n,r];});
  }
 }
 return cycles;
}

// Latest explicit user instructions override only weekday pairings and resolved flags.
function documentCycles(d={}){
 const cycles=sourceDocumentCycles({...d,monPool:'yes',thuPool:'yes',thuAbs:'yes',tuesday:'reserved',trapCount:60,trapUnit:'reps'});
 const pairs=[{1:['Бицепс','Трицепс'],4:['Грудь','Спина']},{1:['Бицепс','Грудь'],4:['Трицепс','Спина']},{1:['Спина','Бицепс'],4:['Грудь','Трицепс']}];
 cycles.forEach((days,c)=>{
  const src=DOC_PLAN.cycles[c],blocks={'Спина':src[1].items.slice(0,3),'Грудь':src[1].items.slice(3,6),'Бицепс':src[4].items.slice(0,3),'Трицепс':src[4].items.slice(3,6)};
  for(const day of [1,4]){const names=pairs[c][day];days[day].title=names[0]+' + '+names[1].toLocaleLowerCase('ru-RU');days[day].items=JSON.parse(JSON.stringify(names.flatMap(g=>blocks[g])));days[day].itemUnits=days[day].items.map(()=>'reps');}
  for(const day of [1,3,4,6]){days[day].includeAbs=true;days[day].tabs=[...new Set([...days[day].tabs,'pool'])];days[day].docIssues=(days[day].docIssues||[]).filter(x=>!['mon_pool','thu_pool','thu_abs'].includes(x));}
  days[2].title='Шея + трапеция';days[2].includeAbs=false;days[2].tabs=['gym'];
  for(const day of Object.values(days))day.items=day.items.map(([id,n,reps],i)=>{if(id==='doc_trap'){day.itemUnits[i]='reps';return [id,3,60];}return [id,n,reps];});
 });return cycles;
}
