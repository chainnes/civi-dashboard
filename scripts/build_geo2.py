"""Build higher-resolution geo data for the map (run once / when geoBoundaries updates).
Source: geoBoundaries gbOpen PHL ADM0-ADM3 simplified (NAMRIA/PSA/OCHA, CC BY 3.0 IGO). Needs: pip install shapely.
Outputs:
  data/geo_regions.json  ADM1 regions, ~100 m precision (replaces the old 0.01-degree version that cut into land)
  data/ph_mask.json      PH outline buffered OUTWARD ~3 km, used as the hole in the 'other countries' mask
  data/places.json       Region > Province/HUC > City/Municipality hierarchy with centroids (point-on-surface)
"""
import json, re, sys, urllib.request, pathlib
from shapely.geometry import shape, mapping, Point
from shapely.ops import unary_union
from shapely.strtree import STRtree
D = pathlib.Path(__file__).resolve().parent.parent / "data"; CACHE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
def load(l):
    if CACHE and (CACHE / f"{l}.geojson").exists(): return json.loads((CACHE / f"{l}.geojson").read_text())
    meta = json.loads(urllib.request.urlopen(f"https://www.geoboundaries.org/api/current/gbOpen/PHL/{l}/").read())
    return json.loads(urllib.request.urlopen(meta["simplifiedGeometryGeoJSON"]).read())
def rnd(g, n=3):
    def w(c): return [round(c[0], n), round(c[1], n)] if isinstance(c[0], (int, float)) else [w(x) for x in c]
    g["coordinates"] = w(g["coordinates"]); return g
save = lambda n, o: (D / n).write_text(json.dumps(o, ensure_ascii=False, separators=(",", ":")))
A0, A1, A2, A3 = (load(l) for l in ("ADM0", "ADM1", "ADM2", "ADM3"))
src = "geoBoundaries PHL (NAMRIA/PSA/OCHA), CC BY 3.0 IGO"
# regions
R = [(f["properties"]["shapeName"], shape(f["geometry"]).buffer(0)) for f in A1["features"]]
save("geo_regions.json", {"source": src + " ADM1, simplified 0.001 deg", "type": "FeatureCollection", "features": [
    {"type": "Feature", "properties": {"name": n}, "geometry": rnd(mapping(g.simplify(0.001, preserve_topology=True)))} for n, g in R]})
# mask hole: outward buffer so coastline/land is never clipped
ph = unary_union([shape(f["geometry"]).buffer(0) for f in A0["features"]]).buffer(0.03).simplify(0.01)
polys = [ph] if ph.geom_type == "Polygon" else list(ph.geoms)
save("ph_mask.json", {"source": src + " ADM0, buffered +0.03 deg (~3 km)", "rings": [[[round(y, 3), round(x, 3)] for x, y in p.exterior.coords] for p in polys if p.area > 0.0005]})
# hierarchy
def prov_name(n):
    if n.startswith("NCR"): return {"NCR, City of Manila, First District": "Manila (1st District)"}.get(n, n.replace("NCR, ", "NCR ")).replace("Fourth", "4th").replace("Second", "2nd").replace("Third", "3rd")
    return {"Compostela Valley": "Davao de Oro (Compostela Valley)", "City of Isabela": "Isabela City (Basilan)"}.get(n, n)
P = [(prov_name(f["properties"]["shapeName"]), shape(f["geometry"]).buffer(0)) for f in A2["features"]]
def which(pt, L):
    for n, g in L:
        if g.contains(pt): return n
    return min(L, key=lambda x: x[1].distance(pt))[0]
def clean(n):
    m = re.match(r"City of (.+)", n)
    return (m.group(1) + " City", "city") if m else ((n, "city") if n.endswith(" City") else (n, "mun"))
out = []
for f in A3["features"]:
    g = shape(f["geometry"]).buffer(0); pt = g.representative_point(); n, lvl = clean(f["properties"]["shapeName"])
    out.append({"n": n, "lvl": lvl, "p": which(pt, P), "r": which(pt, R), "ll": [round(pt.y, 4), round(pt.x, 4)]})
prov = {}
for n, g in P:
    pt = g.representative_point(); prov[n] = {"r": which(pt, R), "ll": [round(pt.y, 4), round(pt.x, 4)]}
save("places.json", {"source": src + " ADM2/ADM3 (point-on-surface)", "provinces": prov, "places": out})
print(len(out), "places;", len(prov), "provinces;", len(polys), "mask polys")
