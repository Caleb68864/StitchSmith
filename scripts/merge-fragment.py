#!/usr/bin/env python3
"""Merge a docs/fragments/<id>.md (sections (a) decisions, (b) roadmap, (c) CLAUDE.md bullets, (d) e2e TARGETS)
into docs/decisions.md, the roadmap, CLAUDE.md and e2e/3d-assembly.spec.ts. Usage: merge-fragment.py <id> "<roadmap stub heading>"."""
import re, sys
P='/home/caleb/Projects/StitchSmith'
gid=sys.argv[1]; stub=sys.argv[2]  # e.g. fanny-pack "### 6. Fanny pack"
frag=open(f'{P}/docs/fragments/{gid}.md').read()
def section(tag):
    m=re.search(r'^## \('+tag+r'\).*?$', frag, re.M)
    if not m: return ''
    rest=frag[m.end():]
    n=re.search(r'^## (\(|Shared)', rest, re.M)
    return rest[:n.start()] if n else rest
a=section('a').strip('\n'); b=section('b').strip('\n'); c=section('c'); d=section('d')
# (a) decisions
p=f'{P}/docs/decisions.md'; s=open(p).read()
if a.splitlines()[0] not in s:
    s=s.rstrip('\n')+'\n\n'+a+'\n'; open(p,'w').write(s)
# (b) roadmap: replace stub block
p=f'{P}/docs/plans/2026-09-11-pattern-roadmap.md'; s=open(p).read()
i=s.index(stub); j=s.index('\n### ', i+1)
s=s[:i]+b+'\n\n'+s[j+1:]; open(p,'w').write(s)
# (c) CLAUDE.md bullets: lines up to the first non-bullet paragraph
lines=c.strip('\n').splitlines(); bullets=[]
for ln in lines:
    if ln.startswith('- ') or (ln.startswith('  ') and bullets): bullets.append(ln)
    elif ln.strip()=='' and bullets: continue
    elif bullets: break
p=f'{P}/CLAUDE.md'; s=open(p).read()
block='\n'.join(bullets)
if bullets and bullets[0] not in s:
    s=s.replace('\n## 3D preview conventions', '\n'+block+'\n\n## 3D preview conventions',1); open(p,'w').write(s)
# (d) e2e targets: code inside ```ts fence
m=re.search(r'```ts\n(.*?)```', d, re.S)
if m:
    code=m.group(1).rstrip('\n')
    p=f'{P}/e2e/3d-assembly.spec.ts'; s=open(p).read()
    key=code.strip().splitlines()[0].split(':')[0].strip()
    if key not in s:
        anchor="  'micro rig (.308 stacked)': {"
        s=s.replace(anchor, code+'\n'+anchor,1); open(p,'w').write(s)
print('merged', gid)
