#!/usr/bin/env python3
# one-off classifier for the 580 pending dynamic routes (lane RECORD-VIEW-AUDIT). Output: JSON to argv[1].
import json,re,os,sys
R=os.getcwd()
pend=json.load(open('lib/record-pages/pending.json'))['pending']
gen=json.load(open('lib/record-pages/record-pages.generated.json'))['records']
snap=json.load(open('lib/record-pages/entity-types.snapshot.json'))
ok={e['token'] for e in snap if e['is_active'] and e['custom_fields_enabled'] and e['type'].lower() in('entity','detail')}
def sing(w):
    w=w.replace('-','_')
    if w.endswith('ies'): return w[:-3]+'y'
    if w.endswith('sses') : return w[:-2]
    if w.endswith('s') and not w.endswith('ss'): return w[:-1]
    return w
def read(p):
    try: return open(p).read()
    except: return ''
def imports(f,text):
    out=[]
    for m in re.finditer(r'from\s+["\']([^"\']+)["\']',text):
        s=m.group(1)
        base=None
        if s.startswith('@/'): base=s[2:]
        elif s.startswith('.'): base=os.path.normpath(os.path.join(os.path.dirname(f),s))
        if not base: continue
        for ext in ('.tsx','.ts','/index.tsx','/index.ts'):
            if os.path.isfile(base+ext): out.append(base+ext);break
    return out
res={}
for k in pend:
    if not k.startswith('route:') or '[' not in k: continue
    pat=k[6:]; f=gen[k]['file']
    segs=[s for s in pat.split('/') if s]
    params=[s for s in segs if s.startswith('[')]
    d=os.path.dirname(f)
    # page + layouts up to route group
    texts={f:read(f)}
    dd=d
    while dd.startswith('app'):
        l=dd+'/layout.tsx'
        if os.path.isfile(l): texts[l]=read(l)
        if re.search(r'/\([^/]+\)$',dd) or dd=='app': break
        dd=os.path.dirname(dd)
    for p in list(texts):
        for i in imports(p,texts[p])[:30]:
            if i not in texts and (i.startswith('features/') or i.startswith('app/') or i.startswith('components/')): texts[i]=read(i)
    allt='\n'.join(texts.values())
    froms=sorted(set(re.findall(r'\.from\(\s*["\']([a-z_.]+)["\']',allt)))
    rpcs=sorted(set(re.findall(r'\.rpc\(\s*["\']([a-z_.]+)["\']',allt)))
    # noun before last param
    last_idx=max(i for i,s in enumerate(segs) if s.startswith('['))
    noun=None
    for i in range(last_idx-1,-1,-1):
        if not segs[i].startswith('['): noun=segs[i];break
    cands=set()
    if noun:
        n=sing(noun)
        pre=[sing(s) for s in segs[:last_idx-1] if not s.startswith('[')]
        for t in ok:
            if t==n or t.endswith('_'+n): cands.add(t)
        # prefer ones with a prefix match
        pm=[t for t in cands if any(t.startswith(p+'_') for p in pre)]
        if pm: cands=set(pm)
    tabletoks=set()
    for fr in froms:
        t=sing(fr.split('.')[-1])
        if t in ok: tabletoks.add(t)
    tail=segs[-1]
    redirect=bool(re.search(r'\bredirect\(|permanentRedirect\(',read(f))) and len(read(f))<1500
    res[k]=dict(file=f,segs=segs,params=params,noun=noun,tail=tail,tailIsParam=tail.startswith('['),
        cands=sorted(cands),tabletoks=sorted(tabletoks),froms=froms[:8],rpcs=rpcs[:6],redirect=redirect,
        size=len(read(f)),mounts=bool(re.search(r'EntityCustomFields',allt)),client='use client' in read(f)[:200])
json.dump(res,open(sys.argv[1],'w'),indent=1)
print(len(res))
