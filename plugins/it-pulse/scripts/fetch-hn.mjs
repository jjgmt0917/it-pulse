// HN 수집 스크립트. 사용법:
//   node fetch-hn.mjs list [--data-dir <경로>] [--include-seen]
//   node fetch-hn.mjs item <id>
//   node fetch-hn.mjs mark <id,id,...> [--data-dir <경로>]
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

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
    else positional.push(arg);
  }
  return { positional, flags };
};

const getJson = async (url) => {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(config.requestTimeoutMs) });
  } catch (err) {
    fail(`HN API 요청 실패 (${err.name}: ${err.message})`);
  }
  if (!res.ok) fail(`HN API 응답 오류 (HTTP ${res.status})`);
  return res.json();
};

const stripHtml = (html = '') =>
  html
    .replace(/<p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .trim();

const normalizeUrl = (url) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

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

const historyPath = (dataDir) => path.join(dataDir, config.historyFile);

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

const toStory = (hit) => ({
  id: hit.objectID,
  title: hit.title,
  url: hit.url || `${config.hnItemUrl}${hit.objectID}`,
  hnUrl: `${config.hnItemUrl}${hit.objectID}`,
  points: hit.points ?? 0,
  comments: hit.num_comments ?? 0,
  created: hit.created_at,
});

const runList = async (flags) => {
  const dataDir = flags.dataDir ?? config.dataDir;
  const data = await getJson(`${config.apiBase}/search?tags=front_page&hitsPerPage=${config.fetchCount}`);
  const history = loadHistory(dataDir);

  const stories = data.hits.filter((h) => h.title).map(toStory).sort((a, b) => b.points - a.points);
  const fresh = flags.includeSeen ? stories : stories.filter((s) => !history[s.id]);

  // 1차 중복 제거: 같은 URL 또는 제목 유사도가 높으면 점수 높은 쪽만 유지
  const kept = [];
  for (const story of fresh) {
    const norm = normalizeUrl(story.url);
    const tok = tokens(story.title);
    const dup = kept.some(
      (k) => (norm && norm === k._norm) || similarity(tok, k._tok) >= config.titleSimilarity,
    );
    if (!dup) kept.push({ ...story, _norm: norm, _tok: tok });
  }

  const candidates = kept.slice(0, config.candidates).map(({ _norm, _tok, ...story }) => story);
  process.stdout.write(
    JSON.stringify({ fetched: stories.length, skippedSeen: stories.length - fresh.length, candidates }, null, 2),
  );
};

const runItem = async (id) => {
  if (!/^\d+$/.test(id ?? '')) fail('item 모드에는 숫자 id가 필요해요.');
  const item = await getJson(`${config.apiBase}/items/${id}`);
  const comments = (item.children ?? [])
    .filter((c) => c.text)
    .slice(0, config.commentCount)
    .map((c) => ({ author: c.author, text: stripHtml(c.text).slice(0, config.commentMaxChars) }));
  process.stdout.write(
    JSON.stringify(
      { id: item.id, title: item.title, url: item.url, points: item.points, hnUrl: `${config.hnItemUrl}${item.id}`, comments },
      null,
      2,
    ),
  );
};

const runMark = (ids, flags) => {
  const list = (ids ?? '').split(',').filter((v) => /^\d+$/.test(v));
  if (!list.length) fail('mark 모드에는 쉼표로 구분한 숫자 id가 필요해요.');
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
else if (mode === 'item') await runItem(arg);
else if (mode === 'mark') runMark(arg, flags);
else fail('사용법: fetch-hn.mjs list | item <id> | mark <id,id,...>');
