// 정리본 저장 경로 예약. 사용법: node save-note.mjs --title "<주제>"
// 파일 내용은 호출한 쪽(Claude)이 출력된 경로에 쓴다. 같은 이름이 있으면 번호를 붙인다.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

const argv = process.argv.slice(2);
const titleIndex = argv.indexOf('--title');
const rawTitle = titleIndex >= 0 ? argv[titleIndex + 1] : '';

if (!rawTitle) {
  process.stderr.write('오류: --title "<주제>" 가 필요해요.\n');
  process.exit(1);
}

const safeTitle =
  rawTitle
    .replace(/[\\/:*?"<>|\r\n]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, config.noteTitleMaxLength) || '노트';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

fs.mkdirSync(config.notesDir, { recursive: true });

let target = path.join(config.notesDir, `${date}_${safeTitle}.md`);
for (let n = 2; fs.existsSync(target); n++) {
  target = path.join(config.notesDir, `${date}_${safeTitle}_${n}.md`);
}

process.stdout.write(target);
