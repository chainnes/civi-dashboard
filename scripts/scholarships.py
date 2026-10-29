"""Civi Scholarships (Directory): official program pages only, each checked live. Entries whose official URLs all fail are dropped (listed in data/scholarships.json 'dropped').
Deadlines are typical windows; when unsure: 'Check official site'. Re-run to re-verify."""
import json, datetime, urllib.request, ssl, os, concurrent.futures as cf
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36", "Accept": "text/html,*/*"}
C = "Check official site"
# (scope, name, provider, country, levels, fields, coverage, deadline, eligibility, [official urls in preference order])
S = [
 ("Local","CHED Merit Scholarship Program (CMSP)","CHED","Philippines",["UG"],"Priority programs (STEM, agri, health, teacher ed, etc.)","Tuition + stipend (full or half merit, per CHED guidelines)",C,"Incoming/continuing college students with high GWA; family income cap applies.",["https://ched.gov.ph/cmsp/","https://ched.gov.ph/"]),
 ("Local","CHED Tulong Dunong Program (TDP)","CHED / UniFAST","Philippines",["UG"],"Any","Grant-in-aid per semester (amount per current guidelines)",C,"Financially needy students in CHED-recognized HEIs; via CHED regional offices.",["https://unifast.gov.ph/tdp.html","https://unifast.gov.ph/","https://ched.gov.ph/"]),
 ("Local","Tertiary Education Subsidy (TES)","UniFAST","Philippines",["UG"],"Any","Subsidy for education-related expenses",C,"Students in SUCs/LUCs/private HEIs; priority to Listahanan/4Ps households.",["https://unifast.gov.ph/tes.html","https://unifast.gov.ph/"]),
 ("Local","DOST-SEI Undergraduate Scholarships (RA 7687 / Merit / RA 10612)","DOST Science Education Institute","Philippines",["UG"],"Science, technology, engineering, math, science teaching","Tuition, stipend, book & other allowances",C+" (exam usually announced mid-year)","Incoming college freshmen in priority S&T courses; national exam.",["https://www.sei.dost.gov.ph/","https://sei.dost.gov.ph/"]),
 ("Local","DOST-SEI Graduate Scholarships (ASTHRDP / ERDT)","DOST Science Education Institute","Philippines",["Masters","PhD"],"Science & engineering","Tuition, stipend, research grants",C,"Graduate students in accredited PH universities in S&T fields.",["https://www.sei.dost.gov.ph/","https://sei.dost.gov.ph/"]),
 ("Local","OWWA Education for Development Scholarship Program (EDSP)","OWWA","Philippines",["UG"],"Any 4-5 yr course","Up to ₱60,000 per school year (per OWWA)",C,"Dependents of active OWWA members; qualifying exam.",["https://owwa.gov.ph/","https://www.owwa.gov.ph/"]),
 ("Local","OWWA ELAP (Education and Livelihood Assistance Program)","OWWA","Philippines",["UG"],"Any","Education assistance for dependents of deceased OFWs",C,"Children of deceased OWWA-member OFWs.",["https://owwa.gov.ph/","https://www.owwa.gov.ph/"]),
 ("Local","GSIS Scholarship Program (GSP)","GSIS","Philippines",["UG"],"Any","Tuition + allowance per GSIS guidelines",C,"Dependents of active GSIS members within salary grade limits.",["https://www.gsis.gov.ph/","https://gsis.gov.ph/"]),
 ("Local","SSS Educational Assistance Loan Program","SSS","Philippines",["UG"],"Any","Education loan (not a grant)",C,"SSS members for themselves or a beneficiary; loan terms apply.",["https://www.sss.gov.ph/"]),
 ("Local","LGU scholarships (city/municipal/provincial)","Your LGU","Philippines",["UG"],"Any","Varies by LGU",C,"Residents; check your city/municipal hall or official LGU page.",["https://www.dilg.gov.ph/"]),
 ("Local","SM College Scholarship","SM Foundation","Philippines",["UG"],"Selected courses (per call)","Full tuition + monthly allowance",C,"Incoming freshmen from low-income families with good grades.",["https://www.sm-foundation.org/","https://sm-foundation.org/"]),
 ("Local","Ayala Foundation scholarships / youth programs","Ayala Foundation","Philippines",["UG"],"Varies","Varies by program",C,"Check current program calls.",["https://www.ayalafoundation.org/"]),
 ("Local","Megaworld Foundation Scholarship","Megaworld Foundation","Philippines",["UG"],"Selected courses","Tuition + allowance per program",C,"Academically excellent, financially challenged students in partner schools.",["https://www.megaworldfoundation.com/","https://megaworldfoundation.com/"]),
 ("Local","Metrobank Foundation scholarships","Metrobank Foundation","Philippines",["UG"],"Selected courses","Per program",C,"Check current calls (partner schools).",["https://www.mbfoundation.org.ph/","https://mbfoundation.org.ph/"]),
 ("Local","Jollibee Group Foundation programs","Jollibee Group Foundation","Philippines",["UG","Short"],"Agri-entrepreneurship, values, youth programs","Per program",C,"Check current calls.",["https://www.jollibeegroupfoundation.org/","https://jollibeegroupfoundation.org/"]),
 ("Abroad","Erasmus Mundus Joint Masters","European Union","EU (multi-country)",["Masters"],"Any (program-specific)","Full: tuition, travel, monthly allowance",C+" (often Oct–Feb)","Bachelor's degree; apply directly to each consortium.",["https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en","https://erasmus-plus.ec.europa.eu/"]),
 ("Abroad","Chevening Scholarships","UK Government (FCDO)","United Kingdom",["Masters"],"Any","Full: tuition, stipend, flights",C+" (usually Aug–Nov)","2+ years work experience; return home for 2 years after.",["https://www.chevening.org/"]),
 ("Abroad","Fulbright Philippines (Graduate Student / Scholar)","PAEF / US Government","United States",["Masters","PhD"],"Any","Tuition, stipend, travel",C,"Filipino citizens; returning-home requirement.",["https://www.fulbright.org.ph/","https://fulbright.org.ph/"]),
 ("Abroad","MEXT Japanese Government Scholarship","Government of Japan (via Embassy in PH)","Japan",["UG","Masters","PhD","Short"],"Any","Full: tuition, monthly stipend, airfare",C+" (embassy recommendation usually Apr–May)","Age limits by category; embassy exam/interview.",["https://www.studyinjapan.go.jp/en/smap-stopj-applications-scholarships.html","https://www.ph.emb-japan.go.jp/","https://www.ph.emb-japan.go.jp/itpr_en/00_000039.html","https://www.studyinjapan.go.jp/en/"]),
 ("Abroad","Australia Awards Scholarships – Philippines","Australian Government (DFAT)","Australia",["Masters","PhD"],"Development priority fields","Full: tuition, travel, living expenses",C+" (usually Feb–Apr)","Filipino citizens; work experience; return home after.",["https://www.australiaawardsphilippines.org/","https://www.dfat.gov.au/people-to-people/australia-awards"]),
 ("Abroad","Global Korea Scholarship (GKS, formerly KGSP)","Korean Government (NIIED)","South Korea",["UG","Masters","PhD"],"Any","Full: tuition, stipend, airfare, Korean language year",C+" (graduate track often Feb–Mar)","Via embassy or university track.",["https://www.studyinkorea.go.kr/","https://www.niied.go.kr/"]),
 ("Abroad","Manaaki New Zealand Scholarships","New Zealand MFAT","New Zealand",["Masters","PhD","Short"],"Development priority fields","Full: tuition, living, travel",C,"Eligible ASEAN countries incl. PH; return home after.",["https://www.nzscholarships.govt.nz/","https://www.mfat.govt.nz/"]),
 ("Abroad","DAAD Scholarships (incl. EPOS)","German Academic Exchange Service","Germany",["Masters","PhD","Short"],"Any (EPOS: development-related)","Monthly stipend, insurance, travel",C,"Programs vary; DAAD scholarship database.",["https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/","https://www.daad.de/en/"]),
 ("Abroad","Swedish Institute Scholarships for Global Professionals","Swedish Institute","Sweden",["Masters"],"Any","Tuition, living allowance, travel grant",C+" (usually Feb)","Work + leadership experience; eligible country list.",["https://si.se/en/apply/scholarships/","https://si.se/en/"]),
 ("Abroad","Stipendium Hungaricum","Tempus Public Foundation (Hungary)","Hungary",["UG","Masters","PhD","Short"],"Any","Tuition, monthly stipend, housing support",C+" (usually Nov–Jan)","PH is a partner country; nominated via sending partner.",["https://stipendiumhungaricum.hu/","https://stipendiumhungaricum.hu/apply/"]),
 ("Abroad","Chinese Government Scholarship (CSC)","China Scholarship Council","China",["UG","Masters","PhD","Short"],"Any","Tuition, housing, stipend, insurance",C,"Via embassy, universities or programs.",["https://www.campuschina.org/","https://www.csc.edu.cn/"]),
 ("Abroad","ADB–Japan Scholarship Program (ADB-JSP)","Asian Development Bank / Japan","Asia-Pacific (participating institutions)",["Masters"],"Economics, management, science & tech, development","Tuition, stipend, travel",C,"Citizens of ADB borrowing members; apply via participating university.",["https://www.adb.org/work-with-us/careers/japan-scholarship-program"]),
 ("Abroad","Commonwealth Scholarships","Commonwealth Scholarship Commission in the UK","United Kingdom",["Masters","PhD"],"Development-related","Full",C,"Check eligible countries (Commonwealth members); PH is NOT a Commonwealth member, so only shared/distance schemes may apply.",["https://cscuk.fcdo.gov.uk/"]),
 ("Abroad","Türkiye Bursları (Türkiye Scholarships)","Government of Türkiye","Türkiye",["UG","Masters","PhD"],"Any","Tuition, stipend, housing, flights, Turkish course",C+" (usually Jan–Feb)","Age and grade limits by level.",["https://www.turkiyeburslari.gov.tr/"]),
 ("Abroad","Eiffel Excellence Scholarship","Campus France","France",["Masters","PhD"],"Engineering, economics, law, politics, sciences","Monthly allowance, travel, insurance",C+" (French universities nominate, usually by Jan)","Nominated by a French institution.",["https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence"]),
 ("Abroad","Orange Knowledge Programme / Netherlands scholarships","Nuffic (Netherlands)","Netherlands",["Masters","Short"],"Varies","Varies",C+" (OKP has ended; see Study in NL for current schemes)","Check Study in NL for current scholarships.",["https://www.studyinnl.org/finances/scholarships","https://www.nuffic.nl/en"]),
 ("Abroad","ASEAN Undergraduate Scholarship (Singapore)","Ministry of Education Singapore","Singapore",["UG"],"Any","Tuition (subsidized) + living allowance",C,"ASEAN nationals admitted to Singapore autonomous universities.",["https://www.moe.gov.sg/financial-matters/awards-scholarships/asean-undergraduate-scholarship","https://www.moe.gov.sg/financial-matters/awards-scholarships"]),
 ("Abroad","Brunei Darussalam Government Scholarship","Ministry of Foreign Affairs Brunei","Brunei",["UG","Masters","PhD"],"Any","Full",C+" (often Jan–Mar)","Foreign nationals incl. ASEAN; via MFA Brunei / embassy.",["https://www.mfa.gov.bn/Pages/bdgs.aspx","https://www.mfa.gov.bn/"]),
]
ctx = ssl.create_default_context()
import subprocess
def ok(u):
    try:
        c = subprocess.run(["curl","-s","-o","/dev/null","-w","%{http_code}","-L","-m","25","-A",UA["User-Agent"],"-H","Accept: text/html",u],capture_output=True,text=True).stdout.strip()
        return int(c) if c.isdigit() and c != "000" else "unreachable"
    except Exception as e: return str(e)[:60]
def _ok_old(u):
    for m in ("HEAD", "GET"):
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, headers=UA, method=m), timeout=20, context=ctx)
            if r.status < 400: return r.status
        except urllib.error.HTTPError as e:
            if m == "GET": return e.code
        except Exception as e:
            if m == "GET": return str(e)[:60]
    return None
def check(row):
    for u in row[-1]:
        s = ok(u)
        if s == 200 or (isinstance(s, int) and s < 400): return row, u, s
    return row, None, [ok(u) for u in row[-1][:1]]
items, dropped = [], []
with cf.ThreadPoolExecutor(8) as ex:
    for row, u, s in ex.map(check, S):
        sc, n, p, c, lv, f, cov, dl, el, urls = row
        if u: items.append({"scope": sc, "name": n, "provider": p, "country": c, "levels": lv, "fields": f, "coverage": cov, "deadline": dl, "eligibility": el, "url": u})
        else: dropped.append({"name": n, "tried": urls, "result": str(s)})
json.dump({"checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "note": "Official pages only, checked live. Amounts and windows change every cycle: always confirm on the official site.",
  "items": items, "dropped": dropped}, open(os.path.join(os.path.dirname(__file__), "../data/scholarships.json"), "w"), indent=1, ensure_ascii=False)
print(len(items), "kept;", "dropped:", [(d["name"], d["result"]) for d in dropped])
# NOTE: Chevening, Fulbright PH, GKS (studyinkorea.go.kr) and OWWA block scripted checks from some networks; on Oct 29, 2026 they were
# confirmed live through a separate web fetch and added with verified_via="web fetch". Re-check manually if this script drops them.
