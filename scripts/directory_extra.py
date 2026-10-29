"""Adds verified civil-society, legal-aid, mental-health, scholarship, OFW and consumer entries to data/directory_hub.json.
Each URL was checked on Oct 29, 2026 (PHT). status 'live' = HTTP 200; 'live-bot-protected' = server answered with a bot challenge
(403/Cloudflare), i.e. the official site is up but blocks scripts. Re-run with --check to re-verify. Phones: only official public hotlines,
with the official page that publishes them in 'phone_src'."""
import json, sys, urllib.request
C = "2026-10-29"
V = "Volunteer & NGOs"; L = "Legal aid & rights"; M = "Mental health"; S = "Learning & scholarships"; O = "OFW services"; K = "Consumer complaints"; G = "Government services"
E = [
 (V,"PNVSCA – Philippine National Volunteer Service Coordinating Agency","https://www.pnvsca.gov.ph/","Government agency that coordinates volunteer programs nationwide; find accredited volunteer orgs.","live-bot-protected"),
 (V,"Philippine Red Cross – Volunteer Service","https://redcross.org.ph/volunteer-service/","Sign up as a Red Cross volunteer (disaster response, blood services, first aid).","live"),
 (V,"Gawad Kalinga","https://www.gk1world.com/home","Community development: housing, child nutrition, farm villages. Volunteer and donate.","live"),
 (V,"Habitat for Humanity Philippines","https://www.habitat.org.ph/","Build homes with families; group and individual volunteer builds.","live"),
 (V,"WWF-Philippines","https://www.wwf.org.ph/","Conservation (oceans, climate, wildlife). Volunteer and internship programs.","live-bot-protected"),
 (V,"Haribon Foundation","https://haribon.org.ph/","Biodiversity conservation, rainforest restoration, bird conservation. Volunteer tree-planting.","live"),
 (V,"Angat Buhay","https://www.angatbuhay.ph/","Non-profit for nutrition, education and disaster relief through volunteer and partner networks.","live"),
 (V,"ABS-CBN Foundation (incl. Bantay Kalikasan, Sagip Kapamilya)","https://www.abs-cbnfoundation.org/","Environmental programs (Bantay Kalikasan) and disaster relief (Sagip Kapamilya).","live-bot-protected"),
 (V,"GMA Kapuso Foundation","https://www.gmanetwork.com/kapusofoundation/","Relief operations, school building, health missions.","live"),
 (V,"Ayala Foundation","https://ayalafoundation.org/","Education, sustainable livelihood, arts and culture programs.","live"),
 (V,"Philippine Business for Social Progress (PBSP)","https://www.pbsp.org.ph/","Business-led social development foundation; corporate volunteering.","live"),
 (V,"SM Foundation","https://www.sm-foundation.org/","Scholarships, health missions, school buildings, farmer training.","live"),
 (V,"Caritas Manila","https://caritasmanila.org.ph/","Church-based social services: scholarships, feeding, disaster relief.","live"),
 (V,"World Vision Philippines","https://www.worldvision.org.ph/","Child sponsorship and community development.","live"),
 (V,"Save the Children Philippines","https://www.savethechildren.org.ph/","Child rights, education, emergency response.","live"),
 (V,"UNICEF Philippines","https://www.unicef.org/philippines/","UN agency for children: health, nutrition, education, protection.","live"),
 (V,"Plan International Philippines","https://plan-international.org/philippines/","Children's and girls' rights, disaster preparedness.","live"),
 (V,"ChildHope Philippines","https://childhope.org.ph/","Programs for street children: education, protection, health.","live"),
 (V,"Greenpeace Philippines","https://www.greenpeace.org/philippines/","Environmental campaigns (climate, plastics, oceans). Volunteer network.","live"),
 (V,"EcoWaste Coalition","https://ecowastecoalition.org/","Zero-waste and toxics watchdog network of community groups.","live-bot-protected"),
 (V,"Institute for Climate and Sustainable Cities (ICSC)","https://www.icsc.ngo/","Climate and energy policy, resilience work with LGUs.","live"),
 (V,"Balay Mindanaw","https://www.balaymindanaw.org/","Mindanao peace-building, governance and community development.","live"),
 (V,"Hands On Manila","https://handsonmanila.org/","Flexible volunteer projects in Metro Manila (sign up per activity).","live"),
 (V,"Girl Scouts of the Philippines","https://girlscouts.org.ph/","Youth leadership and community service.","live"),
 (V,"International Coastal Cleanup (Ocean Conservancy)","https://oceanconservancy.org/work/plastics/cleanups-icc/","Global coastal cleanup; find or register a beach/river cleanup in your area.","live"),
 (L,"Public Attorney's Office (PAO)","https://www.pao.gov.ph/","Free legal assistance for qualified indigent clients.","live-bot-protected"),
 (L,"Integrated Bar of the Philippines (IBP) – legal aid","https://www.ibp.ph/","National lawyers' organization; chapters run free legal aid.","live"),
 (L,"Commission on Human Rights (CHR)","https://chr.gov.ph/","File human rights complaints; rights education.","live"),
 (L,"Office of the Ombudsman","https://www.ombudsman.gov.ph/","File complaints against government officials and employees.","live"),
 (L,"Philippine Commission on Women (PCW)","https://www.pcw.gov.ph/","Women's rights, VAWC resources and referral info.","live-bot-protected"),
 (L,"National Council on Disability Affairs (NCDA)","https://ncda.gov.ph/","PWD rights, PWD ID info, accessibility.","live"),
 (M,"NCMH Crisis Hotline (24/7)","https://ncmh.gov.ph/","National Center for Mental Health crisis line. Also 1800-1888-1553 (nationwide, see DOH page).","live-bot-protected","1553","https://caro.doh.gov.ph/world-suicide-prevention-day/"),
 (M,"MentalHealthPH","https://mentalhealthph.org/","Non-profit mental health advocacy and resource directory.","live"),
 (S,"UniFAST – free tuition & student aid (RA 10931)","https://unifast.gov.ph/","Free higher education, Tertiary Education Subsidy, student loans.","live"),
 (S,"CHED scholarships","https://ched.gov.ph/","CHED Merit Scholarship and other student financial assistance.","live-bot-protected"),
 (O,"Department of Migrant Workers (DMW)","https://dmw.gov.ph/","Verify agencies and job orders, OFW documents, assistance.","live"),
 (O,"OWWA","https://owwa.gov.ph/","OFW welfare: membership, scholarships, repatriation, reintegration.","live-bot-protected"),
 (K,"DTI – consumer complaints","https://www.dti.gov.ph/","File complaints on products, prices, warranties, online sellers.","live"),
 (K,"NTC – telco complaints","https://www.ntc.gov.ph/","Complaints on mobile, internet and text scams.","live-bot-protected"),
 (K,"ERC – power complaints","https://www.erc.gov.ph/","Electricity rates and distribution utility complaints.","live-bot-protected"),
 (K,"LTFRB – public transport complaints","https://ltfrb.gov.ph/","Complaints on PUVs, TNVS (ride-hailing) and fares.","live-bot-protected"),
 (K,"CAB – air passenger rights","https://www.cab.gov.ph/","Flight delays, cancellations, passenger rights complaints.","live-bot-protected"),
 (G,"DSWD","https://www.dswd.gov.ph/","Social welfare: 4Ps, AICS crisis assistance, disaster relief packs.","live"),
 ("Health","WHO Philippines","https://www.who.int/philippines","Health data and advisories for the Philippines.","live"),
]
def check(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 CiviDirectoryCheck"}), timeout=15); return "live" if r.status == 200 else str(r.status)
    except urllib.error.HTTPError as e: return "live-bot-protected" if e.code in (403, 429, 503) else str(e.code)
    except Exception: return "unreachable"
p = "data/directory_hub.json"; d = json.load(open(p)); have = {i["url"] for i in d["items"]}
add = []
for e in E:
    cat, name, url, desc, st = e[:5]
    if "--check" in sys.argv: st = check(url)
    if url in have or st not in ("live", "live-bot-protected"): continue
    it = {"cat": cat, "name": name, "url": url, "desc": desc, "status": st, "checked": C}
    if len(e) > 5: it["phone"], it["phone_src"] = e[5], e[6]
    add.append(it)
d["items"] += add
d["note"] = "Official sites only, each checked live on " + C + ". Hotlines only when published by the agency/DOH; verify before relying on them. 'Bot-protected' = site is up but blocks automated checks."
json.dump(d, open(p, "w"), ensure_ascii=False, indent=1)
import collections; print(len(add), "added; total", len(d["items"])); print(collections.Counter(i["cat"] for i in d["items"]))
