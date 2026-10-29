# Marks each item in the UX data files with link status: live (200), bot-protected (403/blocked but host up), or check (other)
import json,subprocess,concurrent.futures as cf
def chk(u):
  r=subprocess.run(['curl','-s','-o','/dev/null','-L','-m','25','-A','Mozilla/5.0','-w','%{http_code}',u],capture_output=True,text=True);c=r.stdout
  return u,("live" if c=="200" else "bot-protected" if c in("403","401","429","503") else "check:"+c)
for f in ['gov_directory','officials','companies','howto']:
  p=f'data/{f}.json';d=json.load(open(p));us={i.get('url') or i['src'] for i in d['items']}
  with cf.ThreadPoolExecutor(20) as ex: st=dict(ex.map(chk,us))
  for i in d['items']: i['link']=st[i.get('url') or i['src']]
  json.dump(d,open(p,'w'),ensure_ascii=False,indent=0); print(f,[ (i.get('url') or i['src'],i['link']) for i in d['items'] if i['link'].startswith('check')])
