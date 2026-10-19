import json,re,os,sys
feat=json.load(open('/tmp/ra/feat.json'))
cache={}
def read(p):
    if p not in cache:
        try: cache[p]=open(p).read()
        except: cache[p]=None
    return cache[p]
EXTS=['.tsx','.ts','/index.tsx','/index.ts','.jsx','.js']
def resolve(frm,spec):
    if spec.startswith('@/'): base=spec[2:]
    elif spec.startswith('.'): base=os.path.normpath(os.path.join(os.path.dirname(frm),spec))
    else: return None
    if re.search(r'\.(tsx?|jsx?)$',base) and read(base) is not None: return base
    for e in EXTS:
        if read(base+e) is not None: return base+e
IMP=re.compile(r'(?:import|export)\s[^;]*?from\s+["\']([^"\']+)["\']|import\(\s*["\']([^"\']+)["\']\s*\)',re.S)
LIT=re.compile(r'<EntityCustomFields\b[^>]*?entityToken=["\']([a-z0-9_]+)["\']',re.S)
res={}
for k,v in feat.items():
    f=v['file']; roots=[f]; d=os.path.dirname(f)
    while d.startswith('app'):
        l=d+'/layout.tsx'
        if read(l) is not None: roots.append(l)
        if re.search(r'/\([^/]+\)$',d) or d=='app': break
        d=os.path.dirname(d)
    seen=set(roots); q=list(roots); found={}
    while q and len(seen)<=600:
        c=q.pop(0); t=read(c) or ''
        for m in LIT.finditer(t): found.setdefault(m.group(1),c)
        for m in IMP.finditer(t):
            r=resolve(c,m.group(1) or m.group(2))
            if r and r not in seen and not r.startswith('node_modules'): seen.add(r); q.append(r)
    res[k]=found
json.dump(res,open('/tmp/ra/reach.json','w'),indent=1)
n=0
for k,f in res.items():
    if f: n+=1; print(k[6:],feat[k]['tailIsParam'],{a:b for a,b in f.items()})
print(n)
