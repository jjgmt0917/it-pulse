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

  // 수집·추림
  fetchCount: num(env.IT_PULSE_FETCH_COUNT, 30),
  candidates: num(env.IT_PULSE_CANDIDATES, 15),
  titleSimilarity: num(env.IT_PULSE_TITLE_SIMILARITY, 0.6),
  minTokenLength: 3,

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
