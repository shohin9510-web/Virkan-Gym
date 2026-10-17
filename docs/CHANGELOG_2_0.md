# Virkan Gym 2.0 — test build

Three rotating weekly complexes. Monday: 3 chest + 3 triceps + pool, no abs. Tuesday: abs, rotating cardio, abs, pool. Thursday: abs, 3 back, 3 biceps, abs, pool. Saturday: abs, 3 legs, 3 accessory exercises, abs, pool. Pool always last and recorded only as done/not done.

Rest is fixed at 90 seconds, appears after each completed set, disappears when finished. Dips use bodyweight only. Base loads are blank and entered by the user; individual equipment increments remain. Program editor handles all three variants and preserves historical sessions.

Exercise references use individual paired photos from the pinned Free Exercise DB public-domain dataset, NOT the flawed generated collage posters. Photographs are educational references, not a professional assessment of individual technique. Exercise equipment and demonstrators differ between photos.

## Install without deleting 1.9
This preview uses application ID tj.virkan.gym.preview20 and label Virkan Gym 2.0. It installs separately from tj.virkan.gym. Preserve the old installation, export JSON, import into the preview.

Import deliberately preserves your older custom program. To use the new 3-week default after importing: Settings > Permanent program editor > Load new three-week plan > choose effective date > Save. Bases and completed history remain.

This is a debug APK, not a store release. Permanent signing is optional via existing repository secrets; no signing keys are stored in source. Physical-device installation, Android file picker and behavior remain to be tested by the user.

## Tests
57 Node logic tests pass locally. Chromium interface scenarios were checked using actual source with an isolated mocked localStorage, not on an Android phone. CI compiles Android, runs lint and verifies APK signature. Full lint warnings are uploaded.
