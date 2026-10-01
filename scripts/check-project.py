#!/usr/bin/env python3
"""Dependency-free structural checks. Not a replacement for an Android build."""
from pathlib import Path
from html.parser import HTMLParser
import re,xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
required=['.github/workflows/build-apk.yml','settings.gradle','build.gradle','app/build.gradle',
'app/src/main/AndroidManifest.xml','app/src/main/java/tj/virkan/gym/MainActivity.java',
'web/index.html','web/styles.css','web/app.js','web/platform.js','web/icons/icon-192.png']
for f in required:
    if not (root/f).is_file(): raise SystemExit('MISSING: '+f)
for f in root.glob('app/src/main/**/*.xml'): ET.parse(f)
class Parser(HTMLParser):
    def __init__(self): super().__init__(); self.ids=set(); self.refs=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, 'Duplicate id: '+a['id']
            self.ids.add(a['id'])
        if tag in ('script','img','link'):
            ref=a.get('src') or a.get('href','')
            if ref and not ref.startswith(('data:','#','http')): self.refs.append(ref)
p=Parser();p.feed((root/'web/index.html').read_text())
for ref in p.refs: assert (root/'web'/ref).is_file(), 'Missing web asset: '+ref
js=(root/'web/app.js').read_text()
assert "const VERSION=19" in js
assert "'virkan_gym_html_state'" in js
assert 'function savePermanentProgram(' in js
assert 'baseReps' in js and 'repStep' in js
assert not re.search(r'\bRIR\b|\bRPE\b',js)
assert not list(root.glob('app/src/**/*.kt')), 'Do not merge old Kotlin files into this WebView project'
manifest=(root/'app/src/main/AndroidManifest.xml').read_text()
assert 'android.permission.INTERNET' not in manifest
assert not re.search(r'android.permission.(BLUETOOTH|ACCESS_FINE_LOCATION|READ_HEALTH)',manifest)
workflow=(root/'.github/workflows/build-apk.yml').read_text()
assert 'android-actions/setup-android' not in workflow
assert 'gradle-version:' in workflow and "'8.9'" in workflow
assert 'sdkmanager' not in workflow or '"tools"' not in workflow
for f in root.glob('**/*'):
    if f.is_file() and f.suffix in ('.jks','.keystore'): raise SystemExit('Private signing key in project!')
print(f'PASS: structure, {len(p.ids)} unique HTML ids, local assets, XML, schema, no old Kotlin/private keys')
