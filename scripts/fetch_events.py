"""Public community events for the Civi map. Real data only, each item tagged with place + source.
API/feed sources (allowed):
  - Luma public discover endpoint (the same public JSON luma.com/discover uses; robots.txt does not disallow it). Queried by
    city coordinates across PH; only events whose venue country is the Philippines are kept; online events skipped for the map.
  - Eventbrite: public search API was shut down Dec 2019. Optional: events of specific organizations you list, via the official
    /v3/organizations/{id}/events/ endpoint with EVENTBRITE_TOKEN (server-side env only; never in the frontend). Off by default.
  - Public iCalendar (.ics) feeds that an organization publishes itself (data/event_feeds.json). Off until a feed is verified.
  - Community-submitted events (Empower > Events, and Share links) come from Supabase at runtime, not from this script.
Link-only (no API/feed we may use): Facebook Events (Graph event search removed 2018; no scraping), Meetup (API needs Meetup Pro
+ approval), Allevents.in (partner API), Ticketnet, SM Tickets, TicketWorld, Klook, Smile, DOT/LGU calendars, GDG/AWS pages.
"""
import json, os, re, sys, time, urllib.request, pathlib, datetime as dt
sys.path.insert(0, str(pathlib.Path(__file__).parent)); import geotag
D = pathlib.Path(__file__).resolve().parent.parent / "data"
UA = {"User-Agent": "Civi-beta/1.0 (+https://civi.chainnes.com; privacy@chainnes.com)"}
get = lambda u, h={}: json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={**UA, **h}), timeout=40).read())
CITIES = {"Manila": (14.5995, 120.9842), "Quezon City": (14.676, 121.0437), "Makati": (14.5547, 121.0244), "Taguig BGC": (14.5509, 121.0503), "Pasig": (14.5764, 121.0851),
  "Baguio": (16.4023, 120.596), "Angeles/Clark": (15.145, 120.5887), "Batangas": (13.7565, 121.0583), "Laguna": (14.2117, 121.1653), "Cavite": (14.4791, 120.897),
  "Naga": (13.6218, 123.1948), "Legazpi": (13.1391, 123.7438), "Iloilo": (10.7202, 122.5621), "Bacolod": (10.6765, 122.9509), "Cebu": (10.3157, 123.8854),
  "Dumaguete": (9.3068, 123.3054), "Tacloban": (11.2433, 125.0039), "Bohol": (9.6496, 123.8546), "Puerto Princesa": (9.7392, 118.7353),
  "Cagayan de Oro": (8.4542, 124.6319), "Davao": (7.1907, 125.4553), "Zamboanga": (6.9214, 122.079), "General Santos": (6.1164, 125.1716), "Iligan": (8.228, 124.2452), "Butuan": (8.9475, 125.5406)}
items, seen, status = [], set(), {}
def add(title, url, source, starts, place_text, ll=None, online=False):
    if not url or url in seen: return
    seen.add(url); it = {"kind": "event", "title": title[:160], "url": url, "source": source, "esrc": source, "stype": "Community", "cat": "Community Events",
        "time": starts, "place": place_text or "", "ll": ll, "geo": "exact" if ll else "national", "online": online}
    geotag.apply(it)
    if ll: it["geo"] = "exact"
    items.append(it)
n = 0
for name, (la, lo) in CITIES.items():
    try:
        d = get(f"https://api.lu.ma/discover/get-paginated-events?latitude={la}&longitude={lo}&pagination_limit=50")
        for e in d.get("entries", []):
            v = e["event"]; g = v.get("geo_address_info") or {}; c = v.get("coordinate") or {}
            if v.get("location_type") == "online" or not c.get("latitude"): continue
            if "philippines" not in (g.get("country") or g.get("full_address") or "Philippines").lower(): continue
            add(v["name"], "https://luma.com/" + v["url"], "Luma", v.get("start_at"), ", ".join(x for x in (g.get("city"), g.get("region")) if x), [round(c["latitude"], 5), round(c["longitude"], 5)]); n += 1
        time.sleep(1)
    except Exception as ex: status["Luma " + name] = f"fail: {ex}"
status["Luma"] = f"ok ({len([i for i in items if i['source'] == 'Luma'])} unique, {len(CITIES)} cities)"
tok = os.environ.get("EVENTBRITE_TOKEN"); orgs = json.loads((D / "event_feeds.json").read_text()) if (D / "event_feeds.json").exists() else {}
for oid in orgs.get("eventbrite_org_ids", []):
    if not tok: status["Eventbrite"] = "skipped (no EVENTBRITE_TOKEN)"; break
    try:
        for e in get(f"https://www.eventbriteapi.com/v3/organizations/{oid}/events/?status=live&expand=venue", {"Authorization": "Bearer " + tok}).get("events", []):
            ven = e.get("venue") or {}; a = ven.get("address") or {}
            ll = [float(ven["latitude"]), float(ven["longitude"])] if ven.get("latitude") else None
            if a.get("country") not in (None, "PH"): continue
            add(e["name"]["text"], e["url"], "Eventbrite", e["start"]["utc"], a.get("city") or "", ll)
        status["Eventbrite"] = "ok"
    except Exception as ex: status["Eventbrite"] = f"fail: {ex}"
for f in orgs.get("ics_feeds", []):  # {"name","url","source"} verified public feeds only
    try:
        txt = urllib.request.urlopen(urllib.request.Request(f["url"], headers=UA), timeout=40).read().decode("utf8", "ignore").replace("\r\n ", "")
        for blk in txt.split("BEGIN:VEVENT")[1:]:
            fld = lambda k: (re.search(rf"^{k}[^:\n]*:(.*)$", blk, re.M) or [None, ""])[1].strip()
            s = fld("DTSTART"); ds = re.sub(r"(\d{4})(\d\d)(\d\d)T?(\d\d)?(\d\d)?.*", lambda m: f"{m[1]}-{m[2]}-{m[3]}T{m[4] or '00'}:{m[5] or '00'}:00+08:00", s)
            if ds[:10] < dt.date.today().isoformat(): continue
            add(fld("SUMMARY"), fld("URL") or f["url"], f.get("source", f["name"]), ds, fld("LOCATION"))
        status["ICS " + f["name"]] = "ok"
    except Exception as ex: status["ICS " + f["name"]] = f"fail: {ex}"
now = dt.datetime.now(dt.timezone.utc).isoformat()
(D / "events.json").write_text(json.dumps({"fetched_at": now, "status": status, "items": items}, ensure_ascii=False, separators=(",", ":")))
# merge into the map snapshot (replace old event items)
m = json.loads((D / "map_items.json").read_text()); m["items"] = [i for i in m["items"] if i.get("kind") != "event"] + items
(D / "map_items.json").write_text(json.dumps(m, ensure_ascii=False, separators=(",", ":")))
print(json.dumps(status, indent=1)); print(len(items), "events")
