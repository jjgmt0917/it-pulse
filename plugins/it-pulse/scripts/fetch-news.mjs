// 뉴스 RSS 수집 스크립트. 사용법:
//   node fetch-news.mjs list [--region kr|global|all] [--data-dir <경로>] [--include-seen]
//   node fetch-news.mjs mark <id,id,...> [--data-dir <경로>]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

const REGIONS = ['kr', 'global', 'all'];

const fail = (message) => {
  process.stderr.write(`오류: ${message}\n`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--include-seen') flags.includeSeen = true;
    else if (arg === '--data-dir') flags.dataDir = argv[++i];
    else if (arg === '--region') flags.region = argv[++i];
    else positional.push(arg);
  }
  return { positional, flags };
};

const decodeEntities = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

const cleanText = (raw = '') =>
  decodeEntities(
    raw
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();

const tagContent = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
};

const linkOf = (block) => {
  const text = cleanText(tagContent(block, 'link'));
  if (text) return text;
  // Atom: <link rel="alternate" href="..."/>
  const links = [...block.matchAll(/<link\s[^>]*>/gi)].map((m) => m[0]);
  const pick = links.find((l) => /rel=["']alternate["']/i.test(l)) ?? links[0] ?? '';
  return decodeEntities(pick.match(/href=["']([^"']+)["']/i)?.[1] ?? '');
};

const parseItems = (xml) =>
  [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(([block]) => {
    const dateRaw = cleanText(
      tagContent(block, 'pubDate') || tagContent(block, 'published') || tagContent(block, 'updated') || tagContent(block, 'dc:date'),
    );
    const parsed = Date.parse(dateRaw);
    const summary = cleanText(
      tagContent(block, 'description') || tagContent(block, 'summary') || tagContent(block, 'content:encoded') || tagContent(block, 'content'),
    );
    return {
      title: cleanText(tagContent(block, 'title')),
      url: linkOf(block),
      published: Number.isNaN(parsed) ? null : new Date(parsed).toISOString(),
      summary: summary.slice(0, config.newsSummaryMaxChars),
    };
  });

const normalizeUrl = (url) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

const articleId = (url) => crypto.createHash('sha1').update(normalizeUrl(url)).digest('hex').slice(0, 12);

const tokens = (title) =>
  new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/)
      .filter((t) => t.length >= config.minTokenLength),
  );

const similarity = (a, b) => {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const t of a) if (b.has(t)) common++;
  return common / (a.size + b.size - common);
};

const historyPath = (dataDir) => path.join(dataDir, config.newsHistoryFile);

const loadHistory = (dataDir) => {
  try {
    const raw = JSON.parse(fs.readFileSync(historyPath(dataDir), 'utf8'));
    const limit = Date.now() - config.historyDays * 24 * 60 * 60 * 1000;
    return Object.fromEntries(Object.entries(raw).filter(([, at]) => Date.parse(at) >= limit));
  } catch {
    return {};
  }
};

const saveHistory = (dataDir, history) => {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(historyPath(dataDir), JSON.stringify(history, null, 2), 'utf8');
};

const loadFeeds = () => {
  try {
    return JSON.parse(fs.readFileSync(config.feedsFile, 'utf8'));
  } catch (err) {
    return fail(`피드 목록을 읽지 못했어요 (${config.feedsFile}: ${err.message})`);
  }
};

const fetchFeed = async (feed) => {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': config.userAgent },
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseItems(await res.text()).filter((i) => i.title && i.url);
    return { feed, items: items.slice(0, config.newsPerFeed) };
  } catch (err) {
    return { feed, error: `${err.name}: ${err.message}` };
  }
};

// 같은 URL 또는 제목 유사도가 높은 기사는 하나로 합치고, 보도한 매체 수를 sources에 기록
const mergeDuplicates = (articles) => {
  const merged = [];
  for (const article of articles) {
    const norm = normalizeUrl(article.url);
    const tok = tokens(article.title);
    const dup = merged.find((m) => (norm && norm === m._norm) || similarity(tok, m._tok) >= config.titleSimilarity);
    if (dup) {
      if (!dup.outlets.includes(article.source)) dup.outlets.push(article.source);
    } else {
      merged.push({ ...article, outlets: [article.source], _norm: norm, _tok: tok });
    }
  }
  return merged.map(({ _norm, _tok, outlets, ...article }) => ({ ...article, sources: outlets.length, outlets }));
};

// 지역별 후보 수를 균등 배분하고 매체 수 → 최신순으로 정렬
const pickCandidates = (articles) => {
  const rank = (a, b) => b.sources - a.sources || Date.parse(b.published ?? 0) - Date.parse(a.published ?? 0);
  const regions = [...new Set(articles.map((a) => a.region))];
  const quota = Math.ceil(config.newsCandidates / Math.max(regions.length, 1));
  return regions.flatMap((r) => articles.filter((a) => a.region === r).sort(rank).slice(0, quota)).sort(rank);
};

const runList = async (flags) => {
  const region = flags.region ?? 'all';
  if (!REGIONS.includes(region)) fail(`--region은 ${REGIONS.join(' | ')} 중 하나여야 해요.`);
  const dataDir = flags.dataDir ?? config.dataDir;

  const feeds = loadFeeds().filter((f) => region === 'all' || f.region === region);
  if (!feeds.length) fail(`'${region}' 지역 피드가 feeds.json에 없어요.`);

  const results = await Promise.all(feeds.map(fetchFeed));
  const failedFeeds = results.filter((r) => r.error).map((r) => ({ name: r.feed.name, error: r.error }));
  if (failedFeeds.length === results.length) fail(`모든 피드 수집에 실패했어요 (${failedFeeds.map((f) => `${f.name}: ${f.error}`).join(', ')})`);

  const limit = Date.now() - config.newsMaxAgeDays * 24 * 60 * 60 * 1000;
  const history = loadHistory(dataDir);

  const all = results
    .flatMap((r) => (r.items ?? []).map((i) => ({ ...i, id: articleId(i.url), source: r.feed.name, lang: r.feed.lang, region: r.feed.region })))
    .filter((a) => !a.published || Date.parse(a.published) >= limit)
    .sort((a, b) => Date.parse(b.published ?? 0) - Date.parse(a.published ?? 0));
  const fresh = flags.includeSeen ? all : all.filter((a) => !history[a.id]);

  const candidates = pickCandidates(mergeDuplicates(fresh));
  process.stdout.write(
    JSON.stringify({ region, fetched: all.length, skippedSeen: all.length - fresh.length, failedFeeds, candidates }, null, 2),
  );
};

const runMark = (ids, flags) => {
  const list = (ids ?? '').split(',').filter((v) => /^[0-9a-f]{12}$/.test(v));
  if (!list.length) fail('mark 모드에는 쉼표로 구분한 기사 id(12자리 16진수)가 필요해요.');
  const dataDir = flags.dataDir ?? config.dataDir;
  const history = loadHistory(dataDir);
  const now = new Date().toISOString();
  for (const id of list) history[id] = now;
  saveHistory(dataDir, history);
  process.stdout.write(`기록 완료: ${list.length}건`);
};

const { positional, flags } = parseArgs(process.argv.slice(2));
const [mode, arg] = positional;

if (mode === 'list') await runList(flags);
else if (mode === 'mark') runMark(arg, flags);
else fail('사용법: fetch-news.mjs list [--region kr|global|all] | mark <id,id,...>');
