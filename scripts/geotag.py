"""Place tagger for Civi (used by fetch_hub.py and retag step). Matches city/HUC names + common aliases first,
then provinces, then 'Municipality, Province' pairs. Data: data/places.json (build_geo2.py). Ambiguous bare names skipped."""
import json, re, pathlib
D = pathlib.Path(__file__).resolve().parent.parent / "data"
_P = json.loads((D / "places.json").read_text())
ALIASES = {"qc": "Quezon City", "q c": "Quezon City", "quezon city": "Quezon City", "makati": "Makati City", "pasig": "Pasig City", "taguig": "Taguig City",
    "bgc": "Taguig City", "bonifacio global city": "Taguig City", "manila": "Manila", "city of manila": "Manila", "maynila": "Manila", "cebu city": "Cebu City",
    "davao city": "Davao City", "mandaluyong": "Mandaluyong City", "marikina": "Marikina City", "paranaque": "Parañaque City", "parañaque": "Parañaque City",
    "las pinas": "Las Piñas City", "las piñas": "Las Piñas City", "muntinlupa": "Muntinlupa City", "caloocan": "Caloocan City", "valenzuela": "Valenzuela City",
    "malabon": "Malabon City", "navotas": "Navotas City", "san juan city": "San Juan City", "pasay": "Pasay City", "pateros": "Pateros", "baguio": "Baguio City",
    "iloilo city": "Iloilo City", "bacolod": "Bacolod City", "cagayan de oro": "Cagayan de Oro City", "cdo": "Cagayan de Oro City", "zamboanga city": "Zamboanga City",
    "general santos": "General Santos City", "gensan": "General Santos City", "lapu lapu": "Lapu-Lapu City", "lapu-lapu": "Lapu-Lapu City", "mandaue": "Mandaue City",
    "tacloban": "Tacloban City", "puerto princesa": "Puerto Princesa City", "angeles city": "Angeles City", "olongapo": "Olongapo City", "antipolo": "Antipolo City",
    "calamba": "Calamba City", "batangas city": "Batangas City", "naga city": "Naga City", "legazpi": "Legazpi City", "dumaguete": "Dumaguete City",
    "tagaytay": "Tagaytay City", "iligan": "Iligan City", "butuan": "Butuan City", "cotabato city": "Cotabato City", "clark": "Mabalacat City"}
NOT_BARE = {"quezon", "san jose", "santa rosa", "san fernando", "naga", "trece martires"}  # need 'City' or province context
PL = _P["places"]; byname = {}
for p in PL: byname.setdefault(p["n"].lower(), []).append(p)
def _norm(s): return " " + re.sub(r"[^a-zñ0-9\- ]", " ", s.lower()).replace("-", " ") + " "
CITY_KEYS = {}
for p in PL:
    if p["lvl"] != "city" or len(byname[p["n"].lower()]) > 1: continue
    k = p["n"].lower(); CITY_KEYS[k.replace("-", " ")] = p
    stem = k[:-5]
    if stem not in NOT_BARE and len(stem) > 3 and stem not in byname: CITY_KEYS.setdefault(stem.replace("-", " "), p)
for a, n in ALIASES.items():
    c = byname.get(n.lower())
    if c and len(c) == 1: CITY_KEYS[a.replace("-", " ")] = c[0]
PROV = {k.lower(): (k, v) for k, v in _P["provinces"].items() if not k.startswith("NCR")}
def tag(text):
    t = _norm(text or "")
    for k in sorted(CITY_KEYS, key=len, reverse=True):
        if f" {k} " in t:
            p = CITY_KEYS[k]; return {"n": p["n"], "lvl": "city", "city": p["n"], "prov": p["p"], "region": p["r"], "ll": p["ll"]}
    for k in sorted(PROV, key=len, reverse=True):
        if f" {k} " in t:
            n, v = PROV[k]
            for m in (q for q in PL if q["p"] == n and q["lvl"] == "mun"):  # 'Municipality, Province' pairs
                if f" {m['n'].lower()} " in t and m["n"].lower() != k: return {"n": m["n"], "lvl": "mun", "city": m["n"], "prov": n, "region": m["r"], "ll": m["ll"]}
            return {"n": n, "lvl": "province", "prov": n, "region": v["r"], "ll": v["ll"]}
    for k, r in (("metro manila", "NCR"), ("ncr", "NCR")):
        if f" {k} " in t: return {"n": "Metro Manila", "lvl": "region", "region": "NCR", "ll": [14.5995, 120.9842]}
    return None
def nearest(ll):
    """Nearest city/municipality point for exact-coordinate items (quakes); returns None if >25 km away (offshore)."""
    best = min(PL, key=lambda p: (p["ll"][0] - ll[0]) ** 2 + (p["ll"][1] - ll[1]) ** 2)
    return best if ((best["ll"][0] - ll[0]) ** 2 + (best["ll"][1] - ll[1]) ** 2) ** .5 < .23 else None
def apply(item):
    """Set place/ll/city/prov/region on a map item from its text (news/events) or exact coords (hazards)."""
    if item.get("geo") == "exact" and item.get("ll"):
        g = tag(item.get("place") or "") if item.get("kind") == "event" else None  # venue city text beats nearest centroid
        if g and g.get("city"): item.update(city=g["city"], prov=g.get("prov"), region=g["region"]); return item
        p = nearest(item["ll"])
        if p: item.update(city=p["n"], prov=p["p"], region=p["r"])
        return item
    g = tag(" ".join(str(item.get(k) or "") for k in ("place", "title", "summary")))
    if g:
        item.update(place=g["n"], ll=g["ll"], geo="psgc-match", region=g["region"], prov=g.get("prov"), city=g.get("city"))
    return item
if __name__ == "__main__":  # retag the current snapshot without refetching
    m = json.loads((D / "map_items.json").read_text())
    for i in m["items"]:
        if i.get("kind") == "event" and i.get("place"): i["place"] = i["place"]
        apply(i)
    (D / "map_items.json").write_text(json.dumps(m, ensure_ascii=False, separators=(",", ":")))
    for i in m["items"]:
        if i.get("city") or i.get("prov"): print(i.get("city") or "-", "|", i.get("prov"), "|", i.get("region"), "|", i["title"][:70])
