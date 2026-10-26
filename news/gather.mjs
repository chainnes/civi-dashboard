import { writeFileSync } from "node:fs";
import { gather } from "./intel.mjs";

const news = await gather();
const file = new URL("../data/news.json", import.meta.url);
writeFileSync(file, `${JSON.stringify(news, null, 2)}\n`);
const counts = {};
for (const item of news.briefings) counts[item.topic] = (counts[item.topic] || 0) + 1;
const grouped = news.briefings.filter((item) => item.sources.length > 1).length;
console.log(JSON.stringify({ fetchedAt: news.fetchedAt, briefings: news.briefings.length, grouped, counts, sources: news.sources }, null, 2));
