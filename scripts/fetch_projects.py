"""Project Watch seed: PhilGEPS public 'Open Opportunities' list (no robots.txt; public pages, no login).
Stores only facts about procurements (title, procuring entity, area, approved budget, dates). Contact persons are NOT stored (RA 10173).
DPWH project monitoring is behind an anti-bot wall (Incapsula) -> not fetched, only linked. Polite: 1.5 s between requests."""
import re, html, json, time, datetime, urllib.request, os
B = "https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/"
UA = {"User-Agent": "Mozilla/5.0 (CiviBot/0.1; +mailto:privacy@chainnes.com)"}
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25).read().decode("utf-8", "ignore")
def clean(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
here = os.path.dirname(__file__); gaz = json.load(open(os.path.join(here, "../data/gazetteer.json")))
lst = get(B + "SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&Result=3")
rows = re.findall(r'<td[^>]*>(\d\d/\d\d/\d{4})</td><td[^>]*>([^<]*)</td><td class="GridItemTD">\s*<a[^>]*refID=(\d+)[^>]*>(.*?)</a>\s*<span[^>]*>(.*?)</span>', lst, re.S)
out = []
for pub, close, ref, title, org in rows[:20]:
    time.sleep(1.5); url = f"{B}SplashBidNoticeAbstractUI.aspx?menuIndex=3&refID={ref}&Result=3"
    try: d = clean(re.sub(r"<script.*?</script>|<style.*?</style>", "", get(url), flags=re.S))
    except Exception as e: print("skip", ref, e); continue
    f = lambda k, nxt: (re.search(re.escape(k) + r"\s*:?\s*(.*?)\s+(?:" + nxt + ")", d) or [None, ""])[1]
    abc = f("Approved Budget for the Contract:", "Delivery Period|Client Agency|Contact"); area = re.sub(r"-->|Contract Duration:.*", "", f("Area of Delivery", "Printable|Solicitation")).strip()
    ent = f("Procuring Entity", "Title"); cat = f("Category:", "Approved Budget"); mode = f("Procurement Mode:", "Classification"); cls = f("Classification:", "Category")
    amt = re.sub(r"[^\d.]", "", abc); ll = None
    for k, g in gaz.items():
        if k in (area + " " + ent).lower(): ll = g["ll"]; break
    pd = datetime.datetime.strptime(pub, "%d/%m/%Y").date().isoformat()
    out.append({"id": "pg-" + ref, "title": clean(title)[:200], "entity": ent or clean(org).split(",")[-1].strip(), "category": cat, "classification": cls, "mode": mode,
        "budget_php": float(amt) if amt else None, "contractor": None, "contractor_note": "Not yet awarded (open bid). Awardee appears on PhilGEPS after award.",
        "published": pd, "deadline": close.strip(), "deadline_kind": "Bid closing", "location": area, "ll": ll, "source": "PhilGEPS Open Opportunities", "url": url})
    print(ref, out[-1]["title"][:50], abc, area)
json.dump({"sample": False, "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "source": "PhilGEPS public bid notices (Open Opportunities, first page)",
  "source_url": B + "SplashOpportunitiesSearchUI.aspx?menuIndex=3&ClickFrom=OpenOpp&Result=3",
  "note": "Real public bid notices. Contact persons omitted (RA 10173). DPWH infrastructure/flood-control lists are behind an anti-bot wall, so they are linked, not copied. Not every item is infrastructure.",
  "links": [{"name": "DPWH Infrastructure Projects (official)", "url": "https://www.dpwh.gov.ph/dpwh/gis/project_monitoring"}, {"name": "PhilGEPS (official)", "url": "https://notices.philgeps.gov.ph/"}, {"name": "Sumbong sa Pangulo flood control portal (official)", "url": "https://sumbongsapangulo.ph/"}],
  "items": out}, open(os.path.join(here, "../data/projects.json"), "w"), indent=1, ensure_ascii=False)
print(len(out), "projects")
