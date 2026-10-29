"""Builds data/civic_transport.json: community-built civic tech + Transport & Schedules (Land/Air/Water).
Links only to official pages; Civi never copies schedules or fares (they change). Checked Oct 29, 2026 (PHT).
link: 'live' = HTTP 200; 'bot-protected' = site answered 403/406/bot challenge (up, but blocks scripts)."""
import json
C = "2026-10-29"; CT = "Civic tech & community-built"; LA, AI, WA = "Transport: Land", "Transport: Air", "Transport: Water"
NB = "Community-built, not government."; SCH = "Check the official site for the latest schedule and fares."
I = [
 (CT, "BetterGov.ph", "BetterGov", "https://bettergov.ph/", "Volunteer-run portal that organizes government services, hotlines and info (per its own site). " + NB, "live"),
 (CT, "BetterGov Transparency Dashboard", "", "https://transparency.bettergov.ph/", "Search and browse PhilGEPS procurement, tax and budget records (per its own site). " + NB, "live"),
 (CT, "BetterGov.ph on GitHub", "", "https://github.com/bettergovph", "Open-source code of the volunteer-led BetterGov civic tech projects. " + NB, "live"),
 (CT, "Sakay.ph", "", "https://www.sakay.ph/", "Metro Manila commute directions: jeepneys, trains, buses, P2P, UV Express, Pasig River Ferry (per its own site). Privately built, not government.", "live"),
 (CT, "Bantay Kita", "", "https://www.bantaykita.ph/", "Civil society group for empowered communities and transparency (per its own site). Not government.", "live"),
 # Added Oct 29, 2026 from lists by Martha (OSS/community) and Seb (fact-check/transparency).
 (CT, "OSSPH (Open Source Software PH)", "OSSPH", "https://ossph.org/", "Open source: Filipino developer community supporting OSS projects and maintainers (per its own site). " + NB, "live"),
 (CT, "Python Philippines", "PythonPH", "https://python.ph/", "Developer community: PH community for Python enthusiasts and users (per its own site). " + NB, "live"),
 (CT, "DEVCON Philippines", "DEVCON", "https://devcon.ph/", "Developer community: volunteer tech community with free code camps and events (per its own site). " + NB, "live"),
 (CT, "OpenStreetMap Philippines", "OSM PH", "https://wiki.openstreetmap.org/wiki/Philippines", "Maps / open data: volunteer mapping of the Philippines on OpenStreetMap. " + NB, "live"),
 (CT, "Humanitarian OpenStreetMap Team", "HOT", "https://www.hotosm.org/", "Maps / disaster: global volunteer mapping for humanitarian response, with PH projects. " + NB, "live"),
 (CT, "VERA Files", "", "https://verafiles.org/", "Fact-check / media: independent nonprofit media organization doing fact checks. Not government.", "live"),
 (CT, "Tsek.ph", "", "https://www.tsek.ph/", "Fact-check: collaborative fact-checking project of PH newsrooms and universities. Not government.", "live"),
 (CT, "PCIJ", "PCIJ", "https://www.pcij.org/", "Transparency / investigative journalism: Philippine Center for Investigative Journalism. Not government.", "live"),
 (CT, "Rappler Fact Check", "", "https://www.rappler.com/newsbreak/fact-check/", "Fact-check: Rappler newsroom's fact checks of false claims (per its own site). Private media, not government.", "live"),
 (LA, "LRT-1 (LRMC)", "LRT-1", "https://lrmc.ph/", "Private operator of LRT-1. " + SCH, "live"),
 (LA, "LRT-2 (LRTA)", "LRTA", "https://www.lrta.gov.ph/", "Light Rail Transit Authority, operator of LRT-2. " + SCH, "live"),
 (LA, "MRT-3", "MRT-3", "https://mrt3.com/", "Official MRT-3 site (DOTr). " + SCH, "bot-protected"),
 (LA, "Philippine National Railways", "PNR", "https://pnr.gov.ph/", "PNR train service and advisories. " + SCH, "bot-protected"),
 (LA, "DOTr (EDSA Busway, P2P, rail)", "DOTr", "https://dotr.gov.ph/", "Department of Transportation: EDSA Busway/Carousel, P2P and rail advisories. " + SCH, "bot-protected"),
 (LA, "LTFRB", "LTFRB", "https://ltfrb.gov.ph/", "Franchises, routes and fare matrices for buses, jeepneys and UV Express. " + SCH, "bot-protected"),
 (LA, "Sakay.ph route planner", "", "https://www.sakay.ph/", "Commute directions for Metro Manila. Privately built, not government. " + SCH, "live"),
 (LA, "Victory Liner", "", "https://www.victoryliner.com/", "Provincial bus line (North Luzon). " + SCH, "live"),
 (LA, "Genesis Transport", "", "https://www.genesis.com.ph/", "Provincial bus line (Genesis/JoyBus). " + SCH, "bot-protected"),
 (LA, "Ceres Liner", "", "https://ceresliner.com/", "Bus schedules and online booking for southern Cebu (per its own site). " + SCH, "live"),
 (LA, "PITX terminal", "PITX", "https://www.pitx.ph/", "Parañaque Integrated Terminal Exchange (provincial buses). " + SCH, "bot-protected"),
 (AI, "NAIA / MIAA", "MIAA", "https://www.miaa.gov.ph/", "Manila International Airport Authority: NAIA flight info and advisories. " + SCH, "live"),
 (AI, "CAAP", "CAAP", "https://www.caap.gov.ph/", "Civil Aviation Authority: regional airports and aviation advisories.", "live"),
 (AI, "Philippine Airlines", "PAL", "https://www.philippineairlines.com/", "Flight status, schedules and travel advisories. " + SCH, "live"),
 (AI, "Cebu Pacific", "", "https://www.cebupacificair.com/", "Flight status and travel advisories. " + SCH, "bot-protected"),
 (AI, "AirAsia Philippines", "", "https://www.airasia.com/", "Flights and travel advisories. " + SCH, "live"),
 (AI, "PAGASA weather (travel)", "PAGASA", "https://www.pagasa.dost.gov.ph/", "Typhoon and weather bulletins that can cancel flights and trips.", "live"),
 (AI, "PHIVOLCS (volcano/ash advisories)", "PHIVOLCS", "https://www.phivolcs.dost.gov.ph/", "Volcano and earthquake bulletins that can affect travel.", "live"),
 (WA, "Philippine Ports Authority", "PPA", "https://www.ppa.com.ph/", "Ports and port advisories. " + SCH, "live"),
 (WA, "MARINA", "MARINA", "https://marina.gov.ph/", "Maritime Industry Authority: shipping regulation and advisories.", "live"),
 (WA, "Philippine Coast Guard", "PCG", "https://coastguard.gov.ph/", "Sailing advisories and suspensions during bad weather.", "bot-protected"),
 (WA, "2GO", "", "https://2go.com.ph/", "Ferry travel and logistics (per its own site). " + SCH, "live"),
 (WA, "Starlite Ferries", "", "https://starliteferries.com/", "Ferry booking: Batangas, Mindoro, Aklan, Romblon, Capiz and more (per its own site). " + SCH, "live"),
 (WA, "OceanJet", "", "https://www.oceanjet.net/", "Fast ferry trips (per its own site). " + SCH, "live"),
 (WA, "Montenegro Lines", "", "https://www.montenegrolines.com/", "Ferry and RoRo routes. " + SCH, "bot-protected"),
]
items = [dict(cat=c, name=n, abbr=a, url=u, desc=d, link=l, checked=C) for c, n, a, u, d, l in I]
json.dump({"as_of": C, "note": "Links only to official/own pages. Civi does not copy schedules or fares; always check the official site. Community-built sites are not government.", "items": items},
          open("data/civic_transport.json", "w"), ensure_ascii=False, indent=1)
from collections import Counter; print(Counter(i["cat"] for i in items))
