#!/usr/bin/env python3
"""Fetch a pinned public-domain exercise dataset; do not use generated collages as technique references."""
import concurrent.futures, hashlib, json, pathlib, time, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
REV='f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'
BASE='https://raw.githubusercontent.com/yuhonas/free-exercise-db/'+REV+'/'
# Exact database identifiers, never fuzzy first-result matching.
MAP={
'bench':['Barbell_Bench_Press_-_Medium_Grip'],
'incline_db':['Incline_Dumbbell_Press'],
'incline_bb':['Barbell_Incline_Bench_Press_-_Medium_Grip'],
'chest_fly':['Butterfly'],
'flat_db':['Dumbbell_Bench_Press'],
'machine_press':['Machine_Bench_Press'],
'dips':['Dips_-_Chest_Version'],
'cable_fly':['Cable_Crossover'],
'db_fly':['Dumbbell_Flyes'],
 'triceps_push':['Triceps_Pushdown'],
 'triceps_overhead':['Seated_Triceps_Press'],
 'french_press':['Lying_Triceps_Press'],
 'rope_push':['Triceps_Pushdown_-_Rope_Attachment'],
 'rope_overhead':['Triceps_Overhead_Extension_with_Rope'],
 'single_push':['Cable_One_Arm_Tricep_Extension'],
 'kickback':['Tricep_Dumbbell_Kickback'],
 'lat_pull':['Wide-Grip_Lat_Pulldown'],
 'lat_neutral':['V-Bar_Pulldown'],
 'lat_close':['Close-Grip_Front_Lat_Pulldown'],
 'row':['Seated_Cable_Rows'],
 'one_arm_row':['One-Arm_Dumbbell_Row'],
 'supported_row':['Incline_Dumbbell_Row'],
 'straight_pull':['Straight-Arm_Pulldown'],
 'bent_row':['Bent_Over_Barbell_Row'],
 'barbell_curl':['EZ-Bar_Curl'],
 'curl':['Dumbbell_Bicep_Curl'],
 'seated_curl':['Seated_Dumbbell_Curl'],
 'hammer':['Hammer_Curls'],
 'preacher':['Preacher_Curl'],
 'cable_curl':['Standing_Biceps_Cable_Curl'],
 'incline_curl':['Incline_Dumbbell_Curl'],
 'squat':['Barbell_Squat'],
 'leg_press':['Leg_Press'],
 'leg_curl':['Lying_Leg_Curls'],
 'leg_curl_seated':['Seated_Leg_Curl'],
 'leg_ext':['Leg_Extensions'],
 'calf':['Standing_Calf_Raises'],
 'calf_seated':['Seated_Calf_Raise'],
 'reverse_lunge':['Dumbbell_Rear_Lunge'],
 'rdl':['Romanian_Deadlift'],
 'lateral_raise':['Side_Lateral_Raise'],
 'reverse_fly':['Reverse_Machine_Flyes'],
 'shoulder_press':['Dumbbell_Shoulder_Press'],
 'shrug':['Dumbbell_Shrug'],
 'wrist_extension':['Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench'],
 'wrist_curl':['Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench'],
 'glute_bridge':['Butt_Lift_Bridge'],
 'glute_cable':['One-Legged_Cable_Kickback'],
 'pallof':['Pallof_Press'],
 'abs_start':['Crunches'],
 'abs_end':['Flat_Bench_Lying_Leg_Raise'],
 'reverse_crunch':['Reverse_Crunch'],
 'dead_bug':['Dead_Bug'],
 'treadmill':['Walking_Treadmill'],
 'bike':['Bicycling_Stationary'],
 'elliptical':['Elliptical_Trainer']
}
def get(path):
    for n in range(4):
        try:
            with urllib.request.urlopen(BASE+path,timeout=45) as r: return r.read()
        except Exception:
            if n==3: raise
            time.sleep(1+n)
def main():
    dest=ROOT/'web'/'cards';dest.mkdir(parents=True,exist_ok=True)
    db=json.loads(get('dist/exercises.json'));lookup={x['id']:x for x in db}
    records={};missing={}
    def one(item):
        key,candidates=item
        entry=next((lookup[x] for x in candidates if x in lookup),None)
        if not entry: return key,None
        files=[];hashes=[]
        for i,path in enumerate(entry.get('images',[])[:2]):
            if not path.endswith('.jpg') or '..' in path: raise ValueError('Invalid image path')
            data=get('exercises/'+path)
            if not data.startswith(b'\xff\xd8'): raise ValueError('Not a JPEG: '+path)
            name=key+'_'+str(i)+'.jpg';(dest/name).write_bytes(data)
            files.append('cards/'+name);hashes.append(hashlib.sha256(data).hexdigest())
        return key,{'sourceId':entry['id'],'sourceName':entry['name'],'files':files,'sha256':hashes,'instructions':entry['instructions'],'sourceRevision':REV}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for key,result in ex.map(one,MAP.items()):
            if result: records[key]=result
            else: missing[key]=MAP[key]
    (ROOT/'web'/'cards-meta.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    qa=ROOT/'qa'/'cards';qa.mkdir(parents=True,exist_ok=True)
    (qa/'missing.json').write_text(json.dumps(missing,indent=2),encoding='utf-8')
    (qa/'exercise-index.json').write_text(json.dumps([{'id':x['id'],'name':x['name']} for x in db],indent=2),encoding='utf-8')
    (qa/'dataset.json').write_text(json.dumps(db,ensure_ascii=False),encoding='utf-8')
    (ROOT/'web'/'IMAGE_CREDITS.txt').write_text('Exercise reference photos: yuhonas/free-exercise-db, public-domain dataset under The Unlicense as declared by its maintainer. Original dataset: wrkout/exercises.json.\nSource: https://github.com/yuhonas/free-exercise-db\nPinned revision: '+REV+'\nPhotos are references, not individually validated medical or coaching advice. Generated collage posters are NOT used in the app.\n',encoding='utf-8')
    print(json.dumps({'downloaded':len(records),'missing':missing},ensure_ascii=False))
if __name__=='__main__':main()
