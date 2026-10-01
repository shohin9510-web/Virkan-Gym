#!/usr/bin/env python3
"""One-time import of the reviewed v1.9 text sources; removed after import.

The six binary parts are an XZ-compressed JSON mapping of relative source paths
and UTF-8 file contents. SHA-256 is verified before parsing; no code is eval'd.
"""
import hashlib
import json
import lzma
from pathlib import Path, PurePosixPath
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.bootstrap'
EXPECTED = '02886d4871691053d6c6e9f1d88825597dfcf198e8cd0fbd13f1428e65893659'
bundle = b''.join((SOURCE / ('source.%02d.xzpart' % i)).read_bytes() for i in range(1, 7))
if len(bundle) != 42608 or hashlib.sha256(bundle).hexdigest() != EXPECTED:
    raise SystemExit('Source bundle checksum mismatch; refusing import')
files = json.loads(lzma.decompress(bundle).decode('utf-8'))
if not isinstance(files, dict) or len(files) != 26:
    raise SystemExit('Unexpected source manifest')
for name, content in files.items():
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] in ('.git', '.github', '.bootstrap'):
        raise SystemExit('Unsafe source path: ' + name)
    if not isinstance(content, str):
        raise SystemExit('Source must be UTF-8 text')
    dest = ROOT / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding='utf-8')

# Reuse the user's original golden emblem, already versioned in this repository.
icon = (SOURCE / 'icon.png').read_bytes()
if not icon.startswith(b'\x89PNG\r\n\x1a\n'):
    raise SystemExit('Invalid icon')
if hashlib.sha1(b'blob ' + str(len(icon)).encode() + b'\0' + icon).hexdigest() != '888a57c951c460adf727cd883067aca38b5d91ab':
    raise SystemExit('Icon checksum mismatch')
for size in (64, 192, 512):
    dest = ROOT / ('web/icons/icon-%d.png' % size)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(icon)
for density in ('mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'):
    for name in ('ic_launcher', 'ic_launcher_round'):
        dest = ROOT / ('app/src/main/res/mipmap-%s/%s.png' % (density, name))
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(icon)
dest = ROOT / 'app/src/main/res/drawable-nodpi/virkan_gym_logo.png'
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_bytes(icon)
dest = ROOT / 'app/src/main/res/drawable/launcher_foreground.xml'
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text('''<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:inset="18%" android:drawable="@drawable/virkan_gym_logo" />
''', encoding='utf-8')
(ROOT / 'gradlew').chmod(0o755)
for script in (ROOT / 'scripts').glob('*.sh'):
    script.chmod(0o755)
print('Imported 26 reviewed source files; source bundle SHA-256:', EXPECTED)
shutil.rmtree(SOURCE)
