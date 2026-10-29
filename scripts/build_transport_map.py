"""Transport layer for the map: coordinates from OpenStreetMap (© OpenStreetMap contributors, ODbL) via the Overpass API.
Run occasionally (not on every fetch). Output: data/transport_map.json. Links point to official pages only (no schedules copied)."""
import json, urllib.request, urllib.parse, pathlib, time
D = pathlib.Path(__file__).resolve().parent.parent / "data"
OV = "https://overpass-api.de/api/interpreter"
import hashlib
CDIR = pathlib.Path("/tmp/civi_overpass"); CDIR.mkdir(exist_ok=True)
def q(s):
  f = CDIR / (hashlib.md5(s.encode()).hexdigest() + ".json")
  if f.exists(): return json.loads(f.read_text())
  r = q0(s); f.write_text(json.dumps(r)); return r
def q0(s):
  for i in range(12):
    try: return _q(s, [OV, "https://overpass.kumi.systems/api/interpreter"][i % 2])
    except Exception as e: print("retry", e); time.sleep(8)
  raise SystemExit("overpass failed")
def _q(s, OV):
    req = urllib.request.Request(OV, data=urllib.parse.urlencode({"data": s}).encode(), headers={"User-Agent": "Civi-beta/1.0 (privacy@chainnes.com)"})
    return json.loads(urllib.request.urlopen(req, timeout=200).read())["elements"]
AIRPORTS = {"MNL": "NAIA (Ninoy Aquino Intl), Manila", "CRK": "Clark Intl", "CEB": "Mactan-Cebu Intl", "DVO": "Francisco Bangoy Intl (Davao)", "ILO": "Iloilo Intl",
    "BCD": "Bacolod-Silay", "PPS": "Puerto Princesa Intl", "TAG": "Bohol-Panglao Intl", "KLO": "Kalibo Intl", "MPH": "Godofredo P. Ramos (Caticlan)",
    "CGY": "Laguindingan (Cagayan de Oro)", "ZAM": "Zamboanga Intl", "GES": "General Santos Intl", "TAC": "Daniel Z. Romualdez (Tacloban)", "LAO": "Laoag Intl",
    "DGT": "Sibulan (Dumaguete)", "IAO": "Sayak (Siargao)", "USU": "Francisco B. Reyes (Busuanga/Coron)", "BXU": "Bancasi (Butuan)", "DRP": "Bicol Intl (Daraga)"}
out = {"source": "Coordinates © OpenStreetMap contributors (ODbL), via Overpass API", "fetched": time.strftime("%Y-%m-%d"), "airports": [], "ports": [], "rail": [], "lines": [], "bus": []}
for e in q('[out:json][timeout:180];nwr(4.5,116.0,21.5,127.0)["aeroway"="aerodrome"]["iata"];out center tags;'):
    c = e.get("center") or e; i = e["tags"].get("iata")
    if i in AIRPORTS and not any(a["iata"] == i for a in out["airports"]): out["airports"].append({"iata": i, "n": AIRPORTS[i], "ll": [round(c["lat"], 4), round(c["lon"], 4)]})
PORTS = ["Manila North Harbor", "Manila South Harbor", "Batangas Port", "Cebu", "Iloilo", "Cagayan de Oro", "Davao", "Zamboanga", "Caticlan", "Matnog", "Allen", "Dumaguete", "Tagbilaran", "Ormoc", "Surigao", "Puerto Princesa", "Calapan", "Bacolod", "Dapitan", "Ozamiz", "Lipata", "Liloan", "San Isidro"]
for e in q('[out:json][timeout:180];(nwr(4.5,116.0,21.5,127.0)["harbour"="yes"]["name"];nwr(4.5,116.0,21.5,127.0)["landuse"="port"]["name"];nwr(4.5,116.0,21.5,127.0)["amenity"="ferry_terminal"]["name"];);out center tags;'):
    c = e.get("center") or e; n = e["tags"].get("name", "")
    if any(p.lower() in n.lower() for p in PORTS) and ("port" in n.lower() or "harbor" in n.lower() or "harbour" in n.lower() or "terminal" in n.lower() or "wharf" in n.lower()):
        out["ports"].append({"n": n, "ll": [round(c["lat"], 4), round(c["lon"], 4)]})
for e in q('[out:json][timeout:180];(node["railway"="station"](14.2,120.9,14.9,121.3););out body;'):
    t = e["tags"]; net = " ".join([t.get("network", ""), t.get("operator", ""), t.get("line", ""), t.get("subway", ""), t.get("light_rail", ""), t.get("name", "")])
    line = next((l for l, k in (("LRT-1", ["LRT-1", "LRT Line 1", "Light Rail Manila", "Line 1"]), ("LRT-2", ["LRT-2", "LRT Line 2", "Line 2"]), ("MRT-3", ["MRT-3", "MRT Line 3", "Line 3"]), ("PNR", ["PNR", "Philippine National Railways"])) if any(x in net for x in k)), None)
    if line and t.get("name"): out["rail"].append({"n": t["name"], "line": line, "ll": [round(e["lat"], 5), round(e["lon"], 5)]})
for e in q('[out:json][timeout:180];(relation["route"~"light_rail|subway|train|monorail"](14.2,120.9,14.9,121.3););out geom;'):
    n = e["tags"].get("name", "") + " " + e["tags"].get("ref", "")
    line = next((l for l, k in (("LRT-1", ["LRT-1", "Line 1"]), ("LRT-2", ["LRT-2", "Line 2"]), ("MRT-3", ["MRT-3", "Line 3"]), ("PNR", ["PNR", "Metro Commuter"])) if any(x in n for x in k)), None)
    if not line or any(x["line"] == line for x in out["lines"]): continue
    segs = [[[round(p["lat"], 4), round(p["lon"], 4)] for p in m["geometry"]] for m in e["members"] if m["type"] == "way" and m.get("role", "") in ("", "forward", "backward") and m.get("geometry")]
    if segs: out["lines"].append({"line": line, "name": e["tags"].get("name"), "segs": segs})
for e in q('[out:json][timeout:180];(nwr(4.5,116.0,21.5,127.0)["amenity"="bus_station"]["name"~"PITX|Parañaque Integrated|Cubao|Araneta|Victory Liner|Five Star|Genesis|Ceres|SM North|Pasay|Cebu South Bus|Cebu North Bus|Davao City Overland|Ecoland|Integrated Bus Terminal|Bus Terminal",i];);out center tags;'):
    c = e.get("center") or e; out["bus"].append({"n": e["tags"]["name"], "ll": [round(c["lat"], 4), round(c["lon"], 4)]})
out["bus"] = out["bus"][:60]
(D / "transport_map.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print({k: len(v) for k, v in out.items() if isinstance(v, list)})
