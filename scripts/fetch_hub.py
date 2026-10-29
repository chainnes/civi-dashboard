#!/usr/bin/env python3
"""Civi beta hub data: PH region boundaries, PSGC gazetteer, real KPIs, categorized + geotagged map items.
Sources (all free/public): geoBoundaries (NAMRIA/PSA/OCHA, CC BY 3.0 IGO), PSGC API (psgc.gitlab.io, mirrors PSA PSGC),
PSA OpenSTAT PXWeb API, World Bank API, Frankfurter (ECB reference rates), existing news/quake/gdacs/directory snapshots."""
import json, re, math, urllib.request, datetime as dt, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from taxonomy import categorize, CATEGORIES
R = pathlib.Path(__file__).resolve().parent.parent; D = R / "data"
UA = {"User-Agent": "Mozilla/5.0 (Civi beta fetcher; contact via repo)", "content-type": "application/json"}
def get(u, body=None):
    return urllib.request.urlopen(urllib.request.Request(u, data=body and json.dumps(body).encode(), headers=UA), timeout=60).read()
def save(n, o): (D / n).write_text(json.dumps(o, ensure_ascii=False, separators=(",", ":")))
now = dt.datetime.now(dt.timezone.utc).isoformat(); status = {}

def rnd(c):
    return [rnd(x) for x in c] if isinstance(c[0], list) else [round(c[0], 3), round(c[1], 3)]
def centroid(geom):
    pts = []
    def walk(c):
        if isinstance(c[0], (int, float)): pts.append(c)
        else: [walk(x) for x in c]
    walk(geom["coordinates"]); xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return [round((min(ys)+max(ys))/2, 4), round((min(xs)+max(xs))/2, 4)]

# --- boundaries
regions_c, prov_c = {}, {}
for lvl, out in (("ADM1", "geo_regions.json"), ("ADM2", None)):
    meta = json.loads(get(f"https://www.geoboundaries.org/api/current/gbOpen/PHL/{lvl}/"))
    g = json.loads(get(meta["simplifiedGeometryGeoJSON"]))
    for f in g["features"]:
        n = f["properties"]["shapeName"]
        (regions_c if lvl == "ADM1" else prov_c)[n] = centroid(f["geometry"])
        f["geometry"]["coordinates"] = rnd(f["geometry"]["coordinates"]); f["properties"] = {"name": n}
    if out: save(out, {"source": "geoBoundaries PHL ADM1 (NAMRIA/PSA/OCHA), CC BY 3.0 IGO", "type": "FeatureCollection", "features": g["features"]})
    status["geoBoundaries " + lvl] = f"ok ({len(g['features'])})"

# --- PSGC gazetteer (provinces + cities + capitals). Municipalities skipped: too many ambiguous names.
def norm(s): return re.sub(r"\s+", " ", re.sub(r"\(.*?\)|city of |^city of|\bcity\b", "", s.lower())).strip()
provs = json.loads(get("https://psgc.gitlab.io/api/provinces.json"))
regs = {r["code"]: r for r in json.loads(get("https://psgc.gitlab.io/api/regions.json"))}
cities = json.loads(get("https://psgc.gitlab.io/api/cities-municipalities.json"))
pc = {norm(k): v for k, v in prov_c.items()}
def reg_c(code):
    rn = regs.get(code, {}).get("regionName", "") + " " + regs.get(code, {}).get("name", "")
    for k, v in regions_c.items():
        if k.lower().split("(")[0].strip() in rn.lower() or rn.lower().split("(")[0].strip() in k.lower(): return v
    return None
gaz = {}; provname = {}
for p in provs:
    provname[p["code"]] = p["name"]; c = pc.get(norm(p["name"])) or reg_c(p["regionCode"])
    if c: gaz[norm(p["name"])] = {"n": p["name"], "ll": c, "lvl": "province", "psgc": p["code"], "region": regs.get(p["regionCode"], {}).get("name")}
ncr = next((v for k, v in regions_c.items() if "national capital" in k.lower() or "ncr" in k.lower()), [14.6, 121.0])
for c in cities:
    if not (c["isCity"] or c["isCapital"]): continue
    pn = provname.get(c["provinceCode"] or "", ""); ll = pc.get(norm(pn)) if pn else None
    if not ll: ll = ncr if c["regionCode"] == "130000000" else reg_c(c["regionCode"])
    k = norm(c["name"])
    if ll and len(k) > 3 and k not in gaz:
        gaz[k] = {"n": c["name"], "ll": ll, "lvl": "city", "psgc": c["code"], "region": regs.get(c["regionCode"], {}).get("name"), "approx": True}
for k, v in {"metro manila": ncr, "manila": ncr, "luzon": [15.8, 121.0], "visayas": [10.8, 123.6], "mindanao": [7.8, 124.8],
             "west philippine sea": [14.9, 117.8], "sierra madre": [16.2, 121.8], "bangsamoro": [7.2, 124.2], "barmm": [7.2, 124.2]}.items():
    gaz.setdefault(k, {"n": k.title(), "ll": v, "lvl": "area"})
save("gazetteer.json", gaz); status["PSGC gazetteer"] = f"ok ({len(gaz)} names)"
BAD = {"bay", "san jose", "santa", "general", "lucena"} - {"lucena"}
keys = sorted([k for k in gaz if k not in BAD], key=len, reverse=True)
def geotag(text):
    t = " " + re.sub(r"[^a-zñ ]", " ", text.lower()) + " "
    for k in keys:
        if f" {k} " in t: return gaz[k]
    return None

# --- KPIs
kpis = {"fetched_at": now, "items": {}}
def px(path, pick, labels):
    """PSA PXWeb: query with format=json, return [(label, value)] in time order. Missing values ('..') skipped."""
    m = json.loads(get(path)); q = []; vt = {v["code"]: dict(zip(v["values"], v["valueTexts"])) for v in m["variables"]}
    for v in m["variables"]: q.append({"code": v["code"], "selection": {"filter": "item", "values": pick.get(v["code"], [v["values"][0]])}})
    d = json.loads(get(path, {"query": q, "response": {"format": "json"}}))["data"]; out = []
    for r in d:
        try: val = float(r["values"][0])
        except ValueError: continue
        out.append((" ".join(vt[c][k] for c, k in zip([x["code"] for x in m["variables"]], r["key"]) if c in labels), val))
    return out
P = "https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB"
try:
    s = px(f"{P}/1B/LFS/0021B3FKEI2.px", {"Rates": ["2"], "Sex": ["0"], "Year": ["19", "20", "21"], "Month": [str(i) for i in range(12)]}, ["Month", "Year"])
    kpis["items"]["unemployment"] = {"label": "Unemployment rate", "unit": "%", "series": s[-12:], "source": "PSA Labor Force Survey (OpenSTAT)", "url": "https://openstat.psa.gov.ph/", "official": True}
    status["PSA LFS"] = f"ok ({len(s)})"
except Exception as e: status["PSA LFS"] = f"fail: {e}"
try:
    s = px(f"{P}/2M/PI/CPI/2018NEW/0012M4ACP23.px", {"Year": ["5", "6", "7"], "Period": [str(i) for i in range(12)]}, ["Period", "Year"])
    kpis["items"]["inflation"] = {"label": "Headline inflation (YoY)", "unit": "%", "series": s[-12:], "source": "PSA CPI 2018=100, all items (OpenSTAT)", "url": "https://openstat.psa.gov.ph/", "official": True}
    status["PSA CPI"] = f"ok ({len(s)})"
except Exception as e: status["PSA CPI"] = f"fail: {e}"
try:
    end = dt.date.today(); st = end - dt.timedelta(days=90)
    fx = json.loads(get(f"https://api.frankfurter.app/{st}..{end}?from=USD&to=PHP"))
    s = [(d, r["PHP"]) for d, r in sorted(fx["rates"].items())]
    kpis["items"]["usdphp"] = {"label": "USD → PHP", "unit": "₱", "series": s, "source": "Frankfurter (ECB reference rates), not BSP", "url": "https://www.frankfurter.app/", "official": False}
    status["FX"] = f"ok ({len(s)})"
except Exception as e: status["FX"] = f"fail: {e}"
for key, ind, lab in (("gdp_growth", "NY.GDP.MKTP.KD.ZG", "GDP growth (annual)"), ("poverty", "SI.POV.NAHC", "Poverty incidence (national line)"), ("population", "SP.POP.TOTL", "Population")):
    try:
        w = json.loads(get(f"https://api.worldbank.org/v2/country/PHL/indicator/{ind}?format=json&mrv=8"))[1]
        s = [(x["date"], x["value"]) for x in reversed(w) if x["value"] is not None]
        kpis["items"][key] = {"label": lab, "unit": "" if key == "population" else "%", "series": s, "source": "World Bank WDI API", "url": f"https://data.worldbank.org/indicator/{ind}?locations=PH", "official": True}
        status["WB " + key] = f"ok ({len(s)})"
    except Exception as e: status["WB " + key] = f"fail: {e}"

# --- map items: news (categorized + geotagged) + hazards + community events
items = []
news = json.loads((D / "news.json").read_text())["items"]
for n in news:
    txt = n["title"] + " " + (n.get("summary") or ""); g = geotag(txt)
    items.append({"kind": "news", "title": n["title"], "url": n["link"], "source": n["source"], "stype": "News outlet",
        "cat": categorize(txt), "time": n.get("published"), "summary": (n.get("summary") or "")[:220],
        "place": g["n"] if g else "Philippines (national)", "ll": g["ll"] if g else None, "geo": "psgc-match" if g else "national"})
for q in json.loads((D / "quakes.json").read_text())["items"]:
    items.append({"kind": "hazard", "title": f"M{q['mag']} earthquake, {q['place']}", "url": q["url"], "source": "USGS", "stype": "Government / agency",
        "cat": "Disaster & Weather", "time": dt.datetime.fromtimestamp(q["time"]/1000, dt.timezone.utc).isoformat(), "place": q["place"], "ll": [q["lat"], q["lon"]], "geo": "exact", "mag": q["mag"]})
for g0 in json.loads((D / "gdacs.json").read_text())["items"]:
    items.append({"kind": "hazard", "title": g0["title"][:140], "url": g0["link"], "source": "GDACS (UN/EC)", "stype": "Government / agency",
        "cat": "Disaster & Weather", "time": g0.get("published"), "summary": g0.get("summary", "")[:220], "place": "Philippines (regional)", "ll": None, "geo": "national"})
for e in json.loads((D / "directory.json").read_text())["items"]:
    if e.get("type") != "event": continue
    g = geotag((e.get("city") or "") + " " + (e.get("location") or ""))
    items.append({"kind": "event", "title": e["name"], "url": e["url"], "source": e["source"], "stype": "Community",
        "cat": "Community Events", "time": e.get("starts_at"), "place": e.get("city") or "", "ll": g["ll"] if g else ncr, "geo": "psgc-match"})
save("map_items.json", {"fetched_at": now, "categories": CATEGORIES, "items": items})
kpis["items"]["hazards_30d"] = {"label": "M4+ quakes, last 30 days", "unit": "", "value": sum(1 for i in items if i["kind"] == "hazard" and i["source"] == "USGS"), "source": "USGS FDSN", "url": "https://earthquake.usgs.gov/", "official": True}
cc = {}
for i in items:
    if i["kind"] == "news": cc[i["cat"]] = cc.get(i["cat"], 0) + 1
kpis["items"]["news_by_cat"] = {"label": "News volume by category (snapshot)", "counts": cc, "source": "Civi keyword categorizer (experimental)", "official": False}
save("kpis.json", kpis); status["map items"] = f"ok ({len(items)}, {sum(1 for i in items if i['ll'])} geotagged)"
print(json.dumps(status, indent=1)); (D / "hub_status.json").write_text(json.dumps({"fetched_at": now, "sources": status}, indent=1))
