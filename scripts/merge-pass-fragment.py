#!/usr/bin/env python3
"""Merge a hardening/polish pass fragment (decisions entry + CLAUDE.md bullets, no roadmap/e2e) into the docs."""
import re, sys
P='/home/caleb/Projects/StitchSmith'
gid=sys.argv[1]
frag=open(f'{P}/docs/fragments/{gid}.md').read()
def section(tag):
    m=re.search(r'^## \('+tag+r'\).*?$', frag, re.M)
    if not m: return ''
    rest=frag[m.end():]; n=re.search(r'^## (\(|Shared)', rest, re.M)
    return rest[:n.start()] if n else rest
a=section('a').strip('\n'); c=section('c')
if not a:
    # fragments that start straight with the decisions heading
    m=re.search(r'^## 2026-.*$', frag, re.M)
    if m:
        rest=frag[m.start():]; n=re.search(r'^## (\(|Shared|CLAUDE)', rest, re.M)
        a=(rest[:n.start()] if n else rest).strip('\n')
p=f'{P}/docs/decisions.md'; s=open(p).read()
if a and a.splitlines()[0] not in s:
    open(p,'w').write(s.rstrip('\n')+'\n\n'+a+'\n')
bullets=[]
for ln in c.strip('\n').splitlines():
    if ln.startswith('- ') or (ln.startswith('  ') and bullets): bullets.append(ln)
    elif ln.strip()=='' and bullets: continue
    elif bullets: break
p=f'{P}/CLAUDE.md'; s=open(p).read()
if bullets and bullets[0] not in s:
    if '## UI conventions' not in s:
        s=s.rstrip('\n')+'\n\n## UI conventions\n\n'
    s=s.rstrip('\n')+'\n'+'\n'.join(bullets)+'\n'
    open(p,'w').write(s)
print('merged', gid, 'decisions' if a else '-', len(bullets), 'bullets')
