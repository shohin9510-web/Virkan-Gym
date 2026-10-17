/* Virkan Gym v2.0. Exercise identities are stable; images are mapped individually. */
const V20_ROWS=[
['bench','Жим штанги лёжа','Грудь','barbell'],['incline_db','Жим гантелей на наклонной скамье','Грудь','dumbbell'],['incline_bb','Жим штанги на наклонной скамье','Грудь','barbell'],['chest_fly','Сведение рук в тренажёре','Грудь','machine'],['flat_db','Жим гантелей лёжа','Грудь','dumbbell'],['machine_press','Жим от груди в тренажёре','Грудь','machine'],['dips','Брусья — собственный вес','Грудь','bodyweight'],['cable_fly','Сведение рук в кроссовере','Грудь','machine'],['db_fly','Разводка гантелей лёжа','Грудь','dumbbell'],
['triceps_push','Разгибание рук на верхнем блоке','Трицепс','machine'],['triceps_overhead','Разгибание гантели из-за головы двумя руками','Трицепс','dumbbell'],['french_press','Французский жим с изогнутой штангой лёжа','Трицепс','barbell'],['rope_push','Разгибание рук с канатом на верхнем блоке','Трицепс','machine'],['rope_overhead','Разгибание рук из-за головы с канатом','Трицепс','machine'],['single_push','Разгибание одной руки на верхнем блоке','Трицепс','machine'],['kickback','Разгибание руки с гантелью в наклоне','Трицепс','dumbbell'],
['lat_pull','Тяга верхнего блока к груди','Спина','machine'],['lat_neutral','Тяга верхнего блока нейтральным хватом','Спина','machine'],['lat_close','Тяга верхнего блока узким хватом','Спина','machine'],['row','Тяга горизонтального блока','Спина','machine'],['one_arm_row','Тяга гантели одной рукой','Спина','dumbbell'],['supported_row','Тяга гантелей с опорой грудью на скамью','Спина','dumbbell'],['straight_pull','Тяга прямыми руками на верхнем блоке','Спина','machine'],['bent_row','Тяга штанги в наклоне','Спина','barbell'],
['barbell_curl','Сгибание рук с изогнутой штангой','Бицепс','barbell'],['curl','Сгибание рук с гантелями стоя','Бицепс','dumbbell'],['seated_curl','Сгибание рук с гантелями сидя','Бицепс','dumbbell'],['hammer','Молотковые сгибания','Бицепс','dumbbell'],['preacher','Сгибание рук на скамье Скотта','Бицепс','barbell'],['cable_curl','Сгибание рук на нижнем блоке','Бицепс','machine'],['incline_curl','Сгибание рук с гантелями на наклонной скамье','Бицепс','dumbbell'],
['squat','Приседания со штангой','Ноги','barbell'],['leg_press','Жим ногами','Ноги','machine'],['leg_curl','Сгибание ног лёжа','Ноги','machine'],['leg_curl_seated','Сгибание ног сидя','Ноги','machine'],['leg_ext','Разгибание ног в тренажёре','Ноги','machine'],['calf','Подъём на носки стоя','Ноги','machine'],['calf_seated','Подъём на носки сидя','Ноги','machine'],['reverse_lunge','Выпады назад с гантелями','Ноги','dumbbell'],['rdl','Румынская тяга','Ноги','barbell'],
['lateral_raise','Подъём гантелей через стороны','Дельты','dumbbell'],['reverse_fly','Обратное разведение рук в тренажёре','Дельты','machine'],['shoulder_press','Жим гантелей сидя','Дельты','dumbbell'],['shrug','Шраги с гантелями','Трапеция','dumbbell'],['wrist_extension','Разгибание кистей с гантелями','Предплечья','dumbbell'],['wrist_curl','Сгибание кистей с гантелями','Предплечья','dumbbell'],['glute_bridge','Ягодичный мост','Ягодицы','extra'],['glute_cable','Отведение ноги назад на нижнем блоке','Ягодицы','machine'],['pallof','Жим перед собой с сопротивлением повороту корпуса','Корпус','machine']
];
const V20_CATALOG=V20_ROWS.map(([id,name,group,equipment])=>({id,name,group,equipment,step:equipment==='machine'?5:2.5,alternative:id==='bent_row',kind:'weighted',lockedBodyweight:id==='dips'}));
const V20_ABS=[['abs_start','Скручивания лёжа'],['reverse_crunch','Обратные скручивания'],['dead_bug','Поочерёдное опускание противоположных руки и ноги'],['abs_end','Подъём ног лёжа — прежний вариант']].map(([id,name])=>({id,name,group:'Пресс',kind:'abs',alternative:id==='abs_end'}));
const V20_CARDIO={treadmill:'Ходьба на беговой дорожке',bike:'Велотренажёр',elliptical:'Эллиптический тренажёр'};
const V20_ITEMS=[
{1:['bench','incline_db','chest_fly','triceps_push','triceps_overhead','french_press'],4:['lat_pull','row','one_arm_row','barbell_curl','seated_curl','hammer'],6:['squat','leg_curl','calf','lateral_raise','shrug','glute_bridge']},
{1:['dips','incline_bb','cable_fly','french_press','rope_overhead','single_push'],4:['lat_neutral','supported_row','straight_pull','curl','preacher','cable_curl'],6:['leg_press','leg_curl_seated','calf_seated','reverse_fly','wrist_extension','pallof']},
{1:['flat_db','machine_press','db_fly','triceps_overhead','rope_push','kickback'],4:['row','lat_close','one_arm_row','hammer','incline_curl','barbell_curl'],6:['reverse_lunge','rdl','leg_ext','shoulder_press','wrist_curl','glute_cable']}
];
function v20DefaultCycles(){return V20_ITEMS.map((items,c)=>Object.fromEntries([0,1,2,3,4,5,6].map(d=>[d,{title:({1:'Грудь + трицепс + бассейн',2:'Кардио + бассейн',4:'Спина + бицепс + бассейн',6:'Ноги + дополнительные группы + бассейн'})[d]||'Отдых',tabs:d===2?['cardio','pool']:[1,4,6].includes(d)?['gym','pool']:[],items:(items[d]||[]).map(id=>[id,2,['squat','rdl','bench','dips'].includes(id)?10:12]),includeAbs:[2,4,6].includes(d),absStartExercise:['abs_start','dead_bug','reverse_crunch'][c],absEndExercise:['reverse_crunch','abs_start','dead_bug'][c],absStartSets:1,absEndSets:2,absStartReps:c===1?8:12,absEndReps:c===2?8:12,cardioType:['treadmill','bike','elliptical'][c]}])));}
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
