#!/usr/bin/env python3
"""Fetch REAL public data for Civi into data/*.json so the site works offline.
Sources: USGS earthquakes (PH bbox), GDACS RSS (PH-filtered), Rappler/GMA/Philstar RSS,
Open-Meteo forecast + marine. Each source fails independently."""
import json, re, time, urllib.request, xml.etree.ElementTree as ET, datetime as dt, pathlib
D = pathlib.Path(__file__).resolve().parent.parent / "data"; D.mkdir(exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (CiviMVP fetcher)"}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
def save(n, o): (D / n).write_text(json.dumps(o, ensure_ascii=False, indent=1))
now = dt.datetime.now(dt.timezone.utc).isoformat()
status = {}

TOPICS = {"Disaster & Weather": r"typhoon|storm|flood|quake|earthquake|volcan|landslide|pagasa|phivolcs|rain|bagyo|ndrrmc|evacua",
 "Economy & Jobs": r"peso|inflation|economy|gdp|jobs|employment|price|tariff|business|invest|bsp|stock|market|wage",
 "Governance": r"senate|congress|marcos|duterte|ombudsman|court|comelec|corruption|government|dpwh|budget|lgu|mayor|governor",
 "Health": r"health|doh|hospital|dengue|vaccine|disease|philhealth",
 "Education": r"school|student|deped|ched|tesda|education|teacher|universit",
 "Environment": r"climate|environment|denr|forest|reef|pollution|mining|wildlife|el ni|water|power|energy|brownout|meralco",
 "Security & Sea": r"west philippine sea|china|coast guard|military|afp|police|pnp|crime|drug"}
REGIONS = {"NCR": r"manila|quezon city|makati|pasig|taguig|ncr|metro manila|caloocan|paranaque",
 "Luzon": r"luzon|cagayan|isabela|ilocos|pampanga|bulacan|batangas|cavite|laguna|baguio|bicol|albay|benguet|pangasinan|zambales|quezon province|mindoro|palawan",
 "Visayas": r"visayas|cebu|iloilo|bohol|leyte|samar|negros|tacloban|bacolod|capiz|aklan",
 "Mindanao": r"mindanao|davao|zamboanga|cotabato|bukidnon|surigao|agusan|bangsamoro|barmm|cagayan de oro|sulu|lanao|general santos"}
NEG = r"dead|death|kill|damage|flood|loss|crisis|hike|shortage|corrupt|probe|arrest|injur|missing|slump|fall|decline|threat|fraud|scam|lawsuit|rape"
POS = r"rise|growth|award|win|launch|open|approve|rescue|aid|help|record high|boost|complete|inaugurat|free|grant|recover|improve"
def tag(text):
    t = text.lower()
    topics = [k for k, p in TOPICS.items() if re.search(p, t)] or ["Other"]
    regions = [k for k, p in REGIONS.items() if re.search(p, t)] or ["National/Unspecified"]
    s = len(re.findall(POS, t)) - len(re.findall(NEG, t))
    return topics, regions, ("positive" if s > 0 else "negative" if s < 0 else "neutral")

# --- News RSS
FEEDS = {"Rappler": "https://www.rappler.com/feed/", "GMA News": "https://data.gmanetwork.com/gno/rss/news/feed.xml",
         "Philstar": "https://www.philstar.com/rss/headlines"}
news = []
for src, u in FEEDS.items():
    try:
        root = ET.fromstring(get(u)); n = 0
        for it in root.iter("item"):
            title = (it.findtext("title") or "").strip()
            desc = re.sub("<[^>]+>", "", it.findtext("description") or "").strip()[:300]
            tp, rg, sen = tag(title + " " + desc)
            news.append({"source": src, "title": title, "link": (it.findtext("link") or "").strip(),
                         "published": it.findtext("pubDate"), "summary": desc, "topics": tp, "regions": rg, "sentiment": sen})
            n += 1
        status[src] = f"ok ({n})"
    except Exception as e: status[src] = f"fail: {e}"
save("news.json", {"fetched_at": now, "items": news})

# --- USGS earthquakes, PH bounding box, last 30 days M4+
try:
    st = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=30)).strftime("%Y-%m-%d")
    g = json.loads(get(f"https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime={st}&minlatitude=4&maxlatitude=21.5&minlongitude=116&maxlongitude=127.5&minmagnitude=4&orderby=time"))
    q = [{"mag": f["properties"]["mag"], "place": f["properties"]["place"], "time": f["properties"]["time"],
          "url": f["properties"]["url"], "lon": f["geometry"]["coordinates"][0], "lat": f["geometry"]["coordinates"][1],
          "depth_km": f["geometry"]["coordinates"][2]} for f in g["features"]]
    save("quakes.json", {"fetched_at": now, "source": "USGS FDSN", "items": q}); status["USGS"] = f"ok ({len(q)})"
except Exception as e: status["USGS"] = f"fail: {e}"

# --- GDACS RSS (global alerts filtered to PH)
try:
    root = ET.fromstring(get("https://www.gdacs.org/xml/rss.xml")); al = []
    for it in root.iter("item"):
        t = (it.findtext("title") or "") + " " + (it.findtext("description") or "")
        if re.search(r"philippin", t, re.I):
            al.append({"title": it.findtext("title"), "link": it.findtext("link"), "published": it.findtext("pubDate"),
                       "summary": re.sub("<[^>]+>", "", it.findtext("description") or "")[:300]})
    save("gdacs.json", {"fetched_at": now, "source": "GDACS", "items": al}); status["GDACS"] = f"ok ({len(al)} PH)"
except Exception as e: status["GDACS"] = f"fail: {e}"

# --- Open-Meteo weather + marine for key cities
CITIES = {"Manila": (14.60, 120.98), "Baguio": (16.41, 120.60), "Cebu": (10.32, 123.89), "Iloilo": (10.72, 122.56),
          "Tacloban": (11.24, 125.00), "Davao": (7.19, 125.46), "Zamboanga": (6.91, 122.08), "Puerto Princesa": (9.74, 118.74)}
wx = []
for c, (la, lo) in CITIES.items():
    try:
        w = json.loads(get(f"https://api.open-meteo.com/v1/forecast?latitude={la}&longitude={lo}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&daily=precipitation_sum,temperature_2m_max,wind_speed_10m_max&forecast_days=7&timezone=Asia%2FManila"))
        wx.append({"city": c, "lat": la, "lon": lo, "current": w["current"], "daily": w["daily"]}); time.sleep(0.3)
    except Exception as e: status[f"Open-Meteo {c}"] = f"fail: {e}"
status["Open-Meteo"] = f"ok ({len(wx)} cities)"
save("weather.json", {"fetched_at": now, "source": "Open-Meteo", "items": wx})
SEAS = {"Manila Bay": (14.45, 120.75), "Visayan Sea": (11.6, 123.6), "Philippine Sea (E. Samar)": (11.5, 126.2), "Sulu Sea": (8.5, 120.5), "West Philippine Sea": (15.0, 119.3)}
ma = []
for s, (la, lo) in SEAS.items():
    try:
        m = json.loads(get(f"https://marine-api.open-meteo.com/v1/marine?latitude={la}&longitude={lo}&current=wave_height,sea_surface_temperature&timezone=Asia%2FManila"))
        ma.append({"sea": s, "lat": la, "lon": lo, "current": m.get("current", {})})
    except Exception as e: status[f"Marine {s}"] = f"fail: {e}"
save("marine.json", {"fetched_at": now, "source": "Open-Meteo Marine", "items": ma})
save("status.json", {"fetched_at": now, "sources": status})
print(json.dumps(status, indent=1))
