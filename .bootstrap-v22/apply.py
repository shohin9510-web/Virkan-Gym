#!/usr/bin/env python3
"""Apply the reviewed local source delta only after validating every file."""
from pathlib import Path
import base64, hashlib, json, lzma, os, shutil
ROOT=Path(__file__).resolve().parents[1]
assert os.environ.get('GITHUB_REF')=='refs/heads/build/virkan-gym-v2.2', 'Dedicated branch required'
def digest(s): return hashlib.sha256(s.encode('utf-8')).hexdigest()
parts=[]
for i in range(4):
    text=(ROOT/'.bootstrap-v22'/f'part{i}.b64').read_text().strip()
    print('Part',i,'length',len(text),'sha256',digest(text))
    parts.append(text)
packed=base64.b64decode(''.join(parts),validate=True)
assert hashlib.sha256(packed).hexdigest()=='3dfb6bd10a286e221b5600664a76cd1681afb43810afcf1667e08a3b7a75afba', 'Payload checksum mismatch'
delta=json.loads(lzma.decompress(packed))
ready=[]
for name,item in delta.items():
    path=(ROOT/name).resolve()
    assert path.is_relative_to(ROOT) and not name.startswith(('.git/','.github/')), 'Invalid target'
    original=path.read_text(encoding='utf-8') if path.exists() else ''
    assert digest(original)==item['base'], 'Base changed: '+name
    result=original
    for start,end,replacement in reversed(item['edits']):
        assert 0<=start<=end<=len(original), 'Invalid edit offset'
        result=result[:start]+replacement+result[end:]
    assert digest(result)==item['sha'], 'Result checksum mismatch: '+name
    ready.append((path,result))
for path,result in ready:
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(result,encoding='utf-8')
print('Applied and verified',len(ready),'readable source files')
shutil.rmtree(ROOT/'.bootstrap-v22')
