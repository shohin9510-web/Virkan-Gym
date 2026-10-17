#!/usr/bin/env python3
import base64,hashlib,io,json,pathlib,shutil,subprocess,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
BOOT=ROOT/'.bootstrap-v20'
parts=[(BOOT/f'part{i}.b64').read_text().strip() for i in range(3)]
# Correct three observed transport transcription errors before checksum verification.
parts[2]=parts[2].replace('ph3D8T3fvfvOheOLNdd','ph3D8T3fvOheOLNdd').replace('VHURWdpzr17','VHURWdzr17').replace('hMeP5vH3P0ff','hMeP5vH4P0ff')
for i,p in enumerate(parts):print('Part',i,'length',len(p),'sha256',hashlib.sha256(p.encode()).hexdigest())
encoded=''.join(parts)
raw=base64.b64decode(encoded,validate=True)
assert hashlib.sha256(raw).hexdigest()=='54f21e8167479e6c793742204770c8e46997fe3e0e4715c34d298915bc07d102','Payload checksum mismatch: stop without patching'
work=BOOT/'work';work.mkdir(exist_ok=True)
with zipfile.ZipFile(io.BytesIO(raw)) as z:
    assert set(z.namelist())=={'patch.py','cycle-data.js','logic.test.cjs'}
    for name in z.namelist():(work/name).write_bytes(z.read(name))
collector=ROOT/'scripts/collect-cards.py'
collector.write_text(collector.read_text().replace("'Incline_Dumbbell_Row'","'Dumbbell_Incline_Row'"))
subprocess.run(['python3',str(collector)],check=True,cwd=ROOT)
missing=json.loads((ROOT/'qa/cards/missing.json').read_text())
assert not missing,missing
subprocess.run(['python3',str(work/'patch.py'),str(ROOT)],check=True,cwd=ROOT)
shutil.copy2(work/'logic.test.cjs',ROOT/'tests/logic.test.cjs')
assert hashlib.sha256((ROOT/'web/app.js').read_bytes()).hexdigest()=='0564b1b2e55b894a22dbaa1172858a831deeea78bd3966669f4aa2236b099237','Application differs from locally tested source'
(ROOT/'docs/CHANGELOG_2_0.md').write_text('''# Virkan Gym 2.0 — test build\n\nThree rotating weekly complexes. Monday: 3 chest + 3 triceps + pool, no abs. Tuesday: abs, rotating cardio, abs, pool. Thursday: abs, 3 back, 3 biceps, abs, pool. Saturday: abs, 3 legs, 3 accessory exercises, abs, pool. Pool always last and recorded only as done/not done.\n\nRest is fixed at 90 seconds, appears after each completed set, disappears when finished. Dips use bodyweight only. Base loads are blank and entered by the user; individual equipment increments remain. Program editor handles all three variants and preserves historical sessions.\n\nExercise references use individual paired photos from the pinned Free Exercise DB public-domain dataset, NOT the flawed generated collage posters. Photographs are educational references, not a professional assessment of individual technique. Exercise equipment and demonstrators differ between photos.\n\n## Install without deleting 1.9\nThis preview uses application ID tj.virkan.gym.preview20 and label Virkan Gym 2.0. It installs separately from tj.virkan.gym. Preserve the old installation, export JSON, import into the preview.\n\nImport deliberately preserves your older custom program. To use the new 3-week default after importing: Settings > Permanent program editor > Load new three-week plan > choose effective date > Save. Bases and completed history remain.\n\nThis is a debug APK, not a store release. Permanent signing is optional via existing repository secrets; no signing keys are stored in source. Physical-device installation, Android file picker and behavior remain to be tested by the user.\n\n## Tests\n57 Node logic tests pass locally. Chromium interface scenarios were checked using actual source with an isolated mocked localStorage, not on an Android phone. CI compiles Android, runs lint and verifies APK signature. Full lint warnings are uploaded.\n''',encoding='utf-8')
(ROOT/'docs/УСТАНОВКА_2_0.md').write_text('''# Установка Virkan Gym 2.0\n\n1. Старую версию не удаляйте. В ней сохраните резервную копию JSON.\n2. Установите Virkan-Gym-2.0.0-preview.apk. Значок называется Virkan Gym 2.0, приложение устанавливается отдельно от 1.9.\n3. При необходимости восстановите JSON через настройки новой версии.\n4. Импорт сохраняет вашу прежнюю программу. Чтобы включить новый цикл, откройте «Настройки → Редактор постоянной программы → Загрузить новый трёхнедельный план», выберите дату начала и сохраните. История не переписывается.\n5. Проверьте базовые веса. Значения вводите сами; брусья — без дополнительного груза.\n6. «Фото выполнения» открывает две справочные фотографии, а весь каталог находится в настройках. Это не ранее показанные сгенерированные плакаты.\n7. После подхода таймер отсчитывает 90 секунд и исчезает. Бассейн — последняя отдельная отметка, без метров и обязательного времени.\n\nЭто тестовая сборка. Перед переустановкой всегда сохраняйте JSON.\n''',encoding='utf-8')
shutil.rmtree(ROOT/'qa/cards')
shutil.rmtree(BOOT)
print('Verified patch applied; all exercise references present.')
