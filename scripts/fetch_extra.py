#!/usr/bin/env python3
"""Fetch REAL Directory + law reference data into data/*.json (stdlib only).
Directory: Luma public discover feed (Manila place), plus official agency websites (links only).
Law refs: LawPhil Republic Act index pages (public, no robots.txt restriction found Oct 28, 2026).
Not scraped (blocked by Cloudflare bot challenge, HTTP 403): Official Gazette, Senate, House -> link-only.
Not scraped by policy: Instagram, Facebook (ToS), Eventbrite HTML (ToS forbids scraping; use its API with your own token)."""
import json, re, os, urllib.request, datetime as dt, pathlib, html, time
D = pathlib.Path(__file__).resolve().parent.parent / "data"; D.mkdir(exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (CiviMVP fetcher; contact via repo)"}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
save = lambda n, o: (D / n).write_text(json.dumps(o, ensure_ascii=False, indent=1))
now = dt.datetime.now(dt.timezone.utc).isoformat(); status = {}

TAGS = {"tech": r"\b(ai|tech|dev|code|coding|data|cloud|web3|blockchain|startup|software|hack|build)", "business": r"business|sme|startup|founder|pitch|market",
        "environment": r"climate|environment|green|sustain|solar|mangrove|ocean", "civic": r"civic|community|government|volunteer|public",
        "arts": r"art|music|film|design|party|prom|halloween", "education": r"workshop|class|learn|bootcamp|course|talk|seminar"}
def tags(t): t = t.lower(); return [k for k, p in TAGS.items() if re.search(p, t)] or ["general"]
def region(city):
    c = (city or "").lower()
    if re.search(r"manila|makati|taguig|pasig|quezon|mandaluyong|pasay|san juan|paranaque|muntinlupa|marikina|caloocan", c): return "NCR"
    if re.search(r"cebu|iloilo|bacolod|tacloban|bohol", c): return "Visayas"
    if re.search(r"davao|cagayan de oro|zamboanga|general santos", c): return "Mindanao"
    return "Luzon" if c else "Online"

items = []
# Luma public discover (Manila place id found on luma.com/manila)
try:
    d = json.loads(get("https://api.lu.ma/discover/get-paginated-events?discover_place_api_id=discplace-XeAvnK62YmCW54R&pagination_limit=50"))
    for e in d.get("entries", []):
        ev = e["event"]; city = (ev.get("geo_address_info") or {}).get("city") or ""
        items.append({"type": "event", "name": ev["name"], "location": region(city) if ev.get("location_type") != "online" else "Online",
            "city": city, "tags": tags(ev["name"]), "roles": ["student", "professional", "volunteer"], "source": "Luma",
            "url": "https://luma.com/" + ev["url"], "starts_at": ev.get("start_at"), "external_id": ev["api_id"]})
    status["Luma"] = f"ok ({len(d.get('entries', []))})"
except Exception as e: status["Luma"] = f"fail: {e}"

# Official agencies (real public websites; no phone numbers copied, link to the source instead)
AG = [("NDRRMC", "https://ndrrmc.gov.ph/", ["disaster", "civic"]), ("PAGASA", "https://www.pagasa.dost.gov.ph/", ["disaster", "environment"]),
      ("PHIVOLCS", "https://www.phivolcs.dost.gov.ph/", ["disaster"]), ("TESDA", "https://www.tesda.gov.ph/", ["education", "jobs"]),
      ("DOLE PhilJobNet", "https://philjobnet.gov.ph/", ["jobs"]), ("DOST-SEI", "https://www.sei.dost.gov.ph/", ["education", "tech"]),
      ("DENR", "https://www.denr.gov.ph/", ["environment"]), ("DOH", "https://doh.gov.ph/", ["health"])]
for n, u, t in AG:
    items.append({"type": "contact", "name": n, "location": "Nationwide", "tags": t, "roles": ["citizen", "student", "volunteer", "professional"],
                  "source": "Website", "url": u, "external_id": u})
status["Agencies"] = f"ok ({len(AG)} links)"
save("directory.json", {"sample": False, "fetched_at": now, "note": "Real public listings: Luma public events (Manila) and official agency websites. IG/Facebook are not scraped.", "items": items})

# --- LawPhil RA index
laws = []
for y in range(dt.date.today().year, dt.date.today().year - 3, -1):
    try:
        t = get(f"https://lawphil.net/statutes/repacts/ra{y}/ra{y}.html").decode("cp1252", "replace")
        for m in re.finditer(r'<a href="(ra_(\d+)_%d\.html)">Republic Act No\. \d+</a><br />([^<]+)</td><td>\s*(.*?)\s*</td>' % y, t, re.S):
            laws.append({"source": "LawPhil", "kind": "Republic Act", "number": "RA " + m.group(2), "date": m.group(3).strip(),
                         "title": html.unescape(re.sub(r"\s+", " ", re.sub("<[^>]+>", "", m.group(4)))).strip(),
                         "url": f"https://lawphil.net/statutes/repacts/ra{y}/{m.group(1)}"})
        status[f"LawPhil {y}"] = "ok"; time.sleep(1)
    except Exception as e: status[f"LawPhil {y}"] = f"fail: {e}"
LINKS = [{"name": "Official Gazette", "url": "https://www.officialgazette.gov.ph/", "note": "link only (bot challenge blocks automated fetch)"},
         {"name": "LawPhil", "url": "https://lawphil.net/", "note": "indexed (Republic Acts)"},
         {"name": "Supreme Court E-Library", "url": "https://elibrary.judiciary.gov.ph/", "note": "link only (reachable; search is interactive)"},
         {"name": "Senate of the Philippines", "url": "https://web.senate.gov.ph/", "note": "link only (bot challenge)"},
         {"name": "House of Representatives", "url": "https://www.congress.gov.ph/", "note": "link only (bot challenge)"}]
save("law_refs.json", {"fetched_at": now, "items": laws, "portals": LINKS})
status["LawPhil total"] = len(laws)
old = json.loads((D / "status.json").read_text()) if (D / "status.json").exists() else {"sources": {}}
old["sources"].update(status); old["extra_fetched_at"] = now; save("status.json", old)
print(json.dumps(status, indent=1))
