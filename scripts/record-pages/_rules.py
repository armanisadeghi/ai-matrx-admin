import json,re,sys
r=json.load(open('/tmp/ra/feat.json'))
CATALOG={'token','secret','code','slug','handle','key','provider','app','kind','category','feature','platform','version','view','industry','job','reportKey','resourceType','path','name','rest','tab','tabKey','payload'}
def pname(p): return re.sub(r'[\[\]\.]','',p)
out={}
for k,v in r.items():
    pat=k[6:]; segs=v['segs']; tail=v['tail']; tp=pname(tail)
    if v['redirect']: out[k]=('none','a redirect to the page that shows the record'); continue
    if not v['tailIsParam']:
        # find nearest parent param noun
        out[k]=('none',f"a sub-view ({tail}) inside a record or scope; the record's own page carries the section"); continue
    if pat.startswith('/administration/') and not v['mounts']:
        out[k]=('none',"an admin support view; the admin seat never edits an organization's fields"); continue
    if tail.startswith('[...') or tail.startswith('[[...'):
        out[k]=('none','a catch-all route that resolves paths, not one record'); continue
    if re.search(r'/(edit|battle|bakeoff|run-dense|run-refine|run-reimagine|run-sharp)/',pat+'/') or '/battle/' in pat or '/bakeoff/' in pat or '/studio/run-' in pat:
        out[k]=('none','an editor or experiment surface for a record, not the record view'); continue
    if re.search(r'/(accept|invitations)/',pat) or tp in ('token','secret','code'):
        out[k]=('none','a public link addressed by a one-time token or code, not a record page'); continue
    if tp in CATALOG or pat.startswith('/oauth/'):
        out[k]=('none',f'addressed by a catalog key ({tp}), not a record id'); continue
    out[k]=('review',None)
c={}
for k,(a,b) in out.items(): c[a]=c.get(a,0)+1
print(c)
json.dump(out,open('/tmp/ra/rules.json','w'),indent=1)
for k,(a,b) in out.items():
    if a=='review':
        v=r[k]; print(k[6:],'|',','.join(v['cands'][:3]),'|',','.join(v['tabletoks']),'|M' if v['mounts'] else '')
