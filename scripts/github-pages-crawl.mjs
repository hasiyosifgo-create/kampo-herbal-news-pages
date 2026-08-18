import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(root, "github-pages/data/news.json");
const membersPath = process.env.MEMBERS_SOURCE || resolve(root, "member-sources.txt");
const now = new Date();
const hash = value => createHash("sha256").update(value).digest("hex");
const clean = value => value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

const categoryOf = text => /自主回収|リコール|回収/.test(text) ? "recall"
  : /販売中止|販売終了|終売|製造終了|出荷停止|供給停止|限定出荷/.test(text) ? "discontinued"
  : /新発売|発売開始|新製品|新商品|販売開始|新登場|追加発売|リニューアル発売/.test(text) ? "launch"
  : /店舗.*(?:オープン|開店)|(?:オープン|開店).*店舗/.test(text) ? "store" : null;
const productWords = /漢方|生薬|和漢|葛根湯|五苓散|八味地黄丸|防風通聖散|当帰|柴胡|半夏|麦門冬湯|猪苓湯|桂枝|麻黄|ヨクイニン|附子|芎帰|人参|黄連|エキス(?:顆粒|細粒|錠|散)|煎じ|生薬配合/;
const excludedWords = /化粧|スキン|シャンプー|コスメ|青汁|健康茶|サプリ|禁煙/;
const relevant = text => (productWords.test(text) || (/店舗|薬局/.test(text) && /漢方|生薬/.test(text))) && !excludedWords.test(text);

export const chooseShard = (date = new Date()) => Math.floor(date.getTime() / 300000) % 3;
export const parseMembers = source => [...source.matchAll(/company:\s*["']([^"']+)["'],\s*url:\s*["']([^"']+)["'],\s*sourceType:\s*["']([^"']+)["']/g)].map(([, company, url, sourceType]) => ({ company, url, sourceType }));
export const classifyTitle = title => relevant(title) ? (categoryOf(title) || "general") : null;

async function fetchWithTimeout(url, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { headers: { "user-agent": "kampo-herbal-news-pages/1.0" }, signal: controller.signal });
    if (!response.ok) throw new Error(String(response.status));
    return await response.text();
  } finally { clearTimeout(timer); }
}

function absolute(href, base) {
  try { const url = new URL(href, base); return url.hostname === new URL(base).hostname ? url.toString() : null; }
  catch { return null; }
}

function isoDate(year, month, day) {
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 3)).toISOString();
}

function dateFromText(text, href = "") {
  const written = text.match(/(20\d{2})[年./_-]\s?(\d{1,2})[月./_-]\s?(\d{1,2})/);
  if (written) return isoDate(written[1], written[2], written[3]);
  const fullPathDate = href.match(/(?<!\d)(20\d{2})(0[1-9]|1[0-2])([0-2]\d|3[01])(?!\d)/);
  if (fullPathDate) return isoDate(fullPathDate[1], fullPathDate[2], fullPathDate[3]);
  const shortPathDate = href.match(/(?<!\d)(\d{2})(0[1-9]|1[0-2])([0-2]\d|3[01])(?!\d)/);
  if (shortPathDate) return isoDate(`20${shortPathDate[1]}`, shortPathDate[2], shortPathDate[3]);
  return null;
}

function productNamesFromTitle(title) {
  const quoted = [...title.matchAll(/[「『]([^」』]{2,80})[」』]/g)].map(match => match[1]);
  return quoted.slice(0, 4);
}

function entriesFromHtml(html, member) {
  const entries = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = clean(match[2]);
    const sourceUrl = absolute(match[1], member.url);
    const category = classifyTitle(title);
    if (!sourceUrl || !title || !category) continue;
    const context = clean(html.slice(Math.max(0, (match.index || 0) - 320), (match.index || 0) + match[0].length + 220));
    const publishedAt = dateFromText(`${context} ${title}`, sourceUrl);
    if (!publishedAt || new Date(publishedAt).getTime() > Date.now()) continue;
    entries.push({
      id: hash(sourceUrl), title, category, publishedAt,
      launchDate: null,
      productNames: productNamesFromTitle(title),
      summary: `${member.company}の公式告知を確認してください。`,
      sourceName: member.company, sourceUrl,
    });
  }
  return entries.slice(0, 12);
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) results.push(await fn(items[cursor++]));
  }));
  return results;
}

async function main() {
  const memberText = await readFile(membersPath, "utf8");
  const members = parseMembers(memberText);
  const shard = Number(process.env.KAMPO_SHARD ?? chooseShard(now));
  const active = members.filter((member, index) => member.sourceType !== "no_public_source" && index % 3 === shard);
  const stored = JSON.parse(await readFile(dataPath, "utf8"));
  const previous = process.env.KAMPO_RESET === "1" ? { articles: [], checks: {} } : stored;
  const checkResults = await mapLimit(active, 4, async member => {
    try { return { member, status: "success", articles: entriesFromHtml(await fetchWithTimeout(member.url), member) }; }
    catch { return { member, status: "failure", articles: [] }; }
  });

  const byId = new Map((previous.articles || []).map(article => [article.id, article]));
  checkResults.flatMap(check => check.articles).forEach(article => byId.set(article.id, article));
  const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const articles = [...byId.values()].filter(article => new Date(article.publishedAt).getTime() >= cutoff).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const checks = Array.isArray(previous.checks) ? {} : { ...(previous.checks || {}) };
  checkResults.forEach(check => { checks[check.member.company] = { status: check.status, checkedAt: now.toISOString() }; });
  const fresh = Object.values(checks).filter(check => Date.now() - new Date(check.checkedAt).getTime() < 86400000);

  const output = {
    updatedAt: now.toISOString(),
    coverage: {
      memberCompanies: members.length,
      officialSources: members.filter(member => member.sourceType !== "no_public_source").length,
      pmdaFallbackCompanies: members.filter(member => member.sourceType === "no_public_source").length,
      checkedCompanies: fresh.length,
      successfulCompanies: fresh.filter(check => check.status === "success").length,
      failedCompanies: fresh.filter(check => check.status === "failure").length,
    },
    checks, articles,
  };
  await writeFile(dataPath, JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({ shard, checked: active.length, newArticles: checkResults.flatMap(check => check.articles).length, totalArticles: articles.length }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
