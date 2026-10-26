/** Public-feed gathering for the Civi hub. Headlines only; articles stay on the outlet. */

export const SOURCES = [
  { name: "Inquirer News", url: "https://newsinfo.inquirer.net/feed", official: false },
  { name: "Inquirer Business", url: "https://business.inquirer.net/feed", official: false },
  { name: "Inquirer Global Nation", url: "https://globalnation.inquirer.net/feed", official: false },
  { name: "Philstar Headlines", url: "https://www.philstar.com/rss/headlines", official: false },
  { name: "Philstar Nation", url: "https://www.philstar.com/rss/nation", official: false },
  { name: "Philstar Business", url: "https://www.philstar.com/rss/business", official: false },
  { name: "Rappler", url: "https://www.rappler.com/feed/", official: false },
  { name: "Rappler Nation", url: "https://www.rappler.com/nation/feed/", official: false },
  { name: "Rappler Business", url: "https://www.rappler.com/business/feed/", official: false },
  { name: "GMA News", url: "https://data.gmanews.tv/gno/rss/news/feed.xml", official: false },
  { name: "BusinessWorld", url: "https://www.bworldonline.com/feed/", official: false },
  { name: "Official Gazette", url: "https://www.officialgazette.gov.ph/feed/", official: true },
];

const RULES = [
  ["emergency", ["typhoon", "bagyo", "earthquake", "lindol", "flood", "flooding", "baha", "storm surge", "ndrrmc", "pagasa", "phivolcs", "volcanic", "eruption", "landslide", "tsunami", "evacuation", "habagat", "super typhoon", "signal no", "disaster", "calamity"]],
  ["health", ["department of health", "dengue", "covid", "measles", "vaccine", "vaccination", "hospital", "philhealth", "outbreak", "mpox", "influenza", "mental health", "doh"]],
  ["ids", ["passport", "philsys", "national id", "nbi clearance", "nbi", "driver's license", "drivers license", "driver license", "comelec", "voter registration", "birth certificate"]],
  ["benefits", ["pag-ibig", "pagibig", "4ps", "ayuda", "pension", "owwa", "gsis", "dswd", "sss"]],
  ["jobs", ["job fair", "unemployment", "minimum wage", "ofw", "migrant worker", "wage hike", "salary hike", "dole", "deportee"]],
  ["education", ["deped", "ched", "tesda", "scholarship", "tuition", "class suspension", "classes suspended", "public school", "literacy", "struggling reader", "classroom", "pupil"]],
  ["taxes", ["bureau of internal revenue", "income tax", "taxpayer", "inflation", "interest rate", "stock market", "bangko sentral", "bir", "bsp", "customs", "invoicing"]],
  ["legal", ["supreme court", "sandiganbayan", "ombudsman", "senate", "house of representatives", "house bill", "republic act", "plunder", "data privacy", "cybercrime", "court of appeals", "saln", "national budget", "budget insertion"]],
  ["environment", ["denr", "climate change", "el nino", "el niño", "reclamation", "oil price", "fuel price", "diesel price", "gasoline price", "power outage", "brownout", "pollution", "mining", "lpg", "irrigation"]],
  ["local", ["mmda", "barangay", "city hall", "metro manila", "edsa", "traffic", "mayor", "ltfrb"]],
  ["tools", ["phishing", "data breach", "scam", "hacked"]],
];

const STOP = new Set("the a an of and to in for on at as by with from after over its is are was be that this it or ng sa ang mga na will has have been not their his her from into about says said".split(" "));

function decode(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(block, name) {
  const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]) : "";
}

function linkOf(block) {
  const href = block.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i);
  if (href) return href[1].trim();
  const text = tagText(block, "link");
  if (/^https?:\/\//i.test(text)) return text;
  const guid = tagText(block, "guid");
  if (/^https?:\/\//i.test(guid)) return guid;
  return "";
}

function publishedOf(block) {
  const raw = tagText(block, "pubDate") || tagText(block, "updated") || tagText(block, "dc:date");
  const time = Date.parse(raw);
  return Number.isNaN(time) ? "" : new Date(time).toISOString();
}

export function parseFeed(xml) {
  const blocks = String(xml).match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  const items = [];
  for (const block of blocks) {
    const title = tagText(block, "title");
    const url = linkOf(block);
    if (!title || !/^https?:\/\//i.test(url)) continue;
    items.push({ title, url, published: publishedOf(block) });
  }
  return items;
}

function fold(value) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function hits(text, phrase) {
  const escaped = fold(phrase).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}s?(?:$|[^a-z0-9])`, "i").test(text);
}

export function classify(title) {
  const text = fold(title);
  for (const [topic, phrases] of RULES) {
    const matched = phrases.find((phrase) => hits(text, phrase));
    if (matched) return { topic, matched };
  }
  return { topic: "nation", matched: "" };
}

function tokens(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word));
}

function sameStory(a, b) {
  if (a.topic !== b.topic) return false;
  const left = new Set(tokens(a.title));
  const right = new Set(tokens(b.title));
  if (left.size < 3 || right.size < 3) return false;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  const union = left.size + right.size - shared;
  return shared >= 4 || (shared >= 3 && shared / union >= 0.5);
}

function cluster(items) {
  const groups = [];
  for (const item of items) {
    const group = groups.find((existing) => sameStory(existing, item));
    if (!group) {
      groups.push({ ...item, sources: [{ name: item.source, url: item.url, official: item.official }] });
      continue;
    }
    if (!group.sources.some((source) => source.url === item.url || source.name === item.source)) {
      group.sources.push({ name: item.source, url: item.url, official: item.official });
    }
    const groupTime = Date.parse(group.published) || 0;
    const itemTime = Date.parse(item.published) || 0;
    if (itemTime && (!groupTime || itemTime < groupTime)) {
      group.published = item.published;
    }
    if (item.title.length > group.title.length) group.title = item.title;
  }
  return groups;
}

async function readSource(source, fetchImpl) {
  const response = await fetchImpl(source.url, {
    headers: { "user-agent": "CiviDashboard/1.0 (+https://chai-civi.pages.dev)", accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const xml = await response.text();
  const items = parseFeed(xml).slice(0, 12).map((item) => {
    const filing = classify(item.title);
    return { ...item, ...filing, source: source.name, official: source.official };
  });
  return { source: { name: source.name, url: source.url, official: source.official, items: items.length }, items };
}

export async function gather(fetchImpl = fetch) {
  const settled = await Promise.allSettled(SOURCES.map((source) => readSource(source, fetchImpl)));
  const sources = [];
  const seen = new Set();
  const items = [];
  for (let i = 0; i < settled.length; i += 1) {
    const result = settled[i];
    if (result.status === "rejected") {
      sources.push({ name: SOURCES[i].name, url: SOURCES[i].url, official: SOURCES[i].official, items: 0, error: String(result.reason && result.reason.message || result.reason) });
      continue;
    }
    sources.push(result.value.source);
    for (const item of result.value.items) {
      const key = item.url.split("?")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  items.sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));
  const briefings = cluster(items)
    .sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0))
    .slice(0, 40)
    .map((item, index) => ({
      id: `b${index + 1}`,
      title: item.title,
      topic: item.topic,
      matched: item.matched,
      published: item.published,
      sources: item.sources,
    }));
  return {
    fetchedAt: new Date().toISOString(),
    note: "Headlines are copied from public RSS feeds and link back to the outlet. Civi files each headline by words in the title, and groups titles that share enough of the same words. Civi does not rewrite articles and does not decide whether a story is true.",
    sources: sources.filter((source) => source.url),
    briefings,
  };
}
