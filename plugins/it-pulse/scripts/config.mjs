import os from 'node:os';
import path from 'node:path';

const env = process.env;

const num = (value, fallback) => {
  const parsed = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  // HN Algolia API (키 불필요)
  apiBase: env.HN_API_BASE ?? 'https://hn.algolia.com/api/v1',
  hnItemUrl: 'https://news.ycombinator.com/item?id=',
  requestTimeoutMs: num(env.IT_PULSE_TIMEOUT_MS, 10000),
  userAgent: env.IT_PULSE_USER_AGENT ?? 'Mozilla/5.0 (compatible; it-pulse)',

  // 수집·추림
  fetchCount: num(env.IT_PULSE_FETCH_COUNT, 30),
  candidates: num(env.IT_PULSE_CANDIDATES, 15),
  titleSimilarity: num(env.IT_PULSE_TITLE_SIMILARITY, 0.6),
  minTokenLength: 3,

  // 뉴스 RSS (피드 목록은 feeds.json)
  feedsFile: env.IT_PULSE_FEEDS_FILE ?? path.join(import.meta.dirname, '..', 'feeds.json'),
  newsMaxAgeDays: num(env.IT_PULSE_NEWS_MAX_AGE_DAYS, 3),
  newsCandidates: num(env.IT_PULSE_NEWS_CANDIDATES, 25),
  newsPerFeed: num(env.IT_PULSE_NEWS_PER_FEED, 15),
  newsSummaryMaxChars: num(env.IT_PULSE_NEWS_SUMMARY_MAX_CHARS, 200),
  newsHistoryFile: 'news-history.json',

  // HN 반응 검색
  hnSearchHits: num(env.IT_PULSE_HN_SEARCH_HITS, 3),

  // 이전 브리핑 이력
  historyDays: num(env.IT_PULSE_HISTORY_DAYS, 14),
  historyFile: 'history.json',
  dataDir: env.IT_PULSE_DATA_DIR ?? path.join(os.homedir(), '.it-pulse'),

  // 후속 질문용 댓글
  commentCount: num(env.IT_PULSE_COMMENT_COUNT, 8),
  commentMaxChars: num(env.IT_PULSE_COMMENT_MAX_CHARS, 600),

  // 대화 정리본 저장
  notesDir: env.IT_PULSE_NOTES_DIR ?? path.join(os.homedir(), 'Downloads', 'it-pulse'),
  noteTitleMaxLength: 40,
};
