# it-pulse

국내외 IT 뉴스 RSS에서 AI·빅테크·보안·개발기술 이슈만 골라 3~5개로 브리핑하고, 궁금한 건 친구와 대화하듯 물어볼 수 있는 Claude Code 플러그인입니다. "다른 사람들 반응은?"이라고 물으면 Hacker News 논의를 찾아 알려줘요.

## 이런 점이 달라요
- **뉴스 기반 브리핑**: 국내·해외 IT 매체 RSS에서 AI·빅테크·보안·개발기술 기사만 남기고, 같은 이슈는 하나로 합쳐요.
- **지역 선택**: "한국 IT 소식"은 국내 매체만, "해외 IT 소식"은 해외 매체만, 지역을 말하지 않으면 국내+해외를 섞어 `[국내]`/`[해외]`로 표시해요.
- **중복 최소화**: 이전에 보여준 기사는 다음 브리핑에서 제외해요. (다시 보고 싶으면 "다시 보여줘")
- **HN 반응 조회**: "다른 사람들 반응은?"을 물을 때만 해당 기사의 HN 글과 댓글을 참고해요.
- **물은 것에만 답해요**: 질문 범위를 벗어난 설명이나 제안을 붙이지 않아요.
- **추측하지 않아요**: 모르거나 확인되지 않은 내용은 그대로 모른다고 말해요. 원문을 못 읽었을 때도 마찬가지예요.
- **친구 같은 말투**: 편한 존댓말(해요체)로 쉽게 설명해요.
- **대화 정리 저장**: 대화가 끝나면 주제와 내용을 마크다운 노트로 저장해요.

## 설치
Node.js가 필요합니다. 외부 패키지는 없어요.

```powershell
claude plugin marketplace add jjgmt0917/it-pulse
claude plugin install it-pulse@it-pulse-market
```

설치 후 Claude Code에서 `/reload-plugins`를 실행하세요. 로컬 폴더로 설치하려면 첫 줄의 `jjgmt0917/it-pulse` 대신 이 폴더의 경로를 넣으면 됩니다.

## 사용법
| 하고 싶은 것 | 이렇게 말하세요 |
| --- | --- |
| 브리핑 받기 | "요즘 IT 이슈 뭐야?", "요즘 토픽 뭐야" 또는 `/it-pulse:briefing` |
| 국내 / 해외만 보기 | "한국 IT 소식", "해외 IT 소식" |
| 기사 자세히 보기 | "3번 자세히 설명해줘" |
| 용어·배경 묻기 | "ㅇㅇ이 뭐야?" |
| 다른 사람들 반응 | "3번 다른 사람들 반응은?", "개발자들은 어떻게 봐?" |
| 대화 정리 저장 | "정리해줘" 또는 `/it-pulse:save-notes` (끝내는 말을 하면 저장할지 먼저 물어봐요) |

### 대화 예시 (형식을 보여주는 예시이며 실제 결과가 아닙니다)
```
나: 요즘 IT 이슈 뭐야?
Claude: 요즘 이런 이슈들이 올라오고 있어요.
        1. <한글 제목> [AI] [해외]
           <한두 줄 요약> (<출처> · <날짜>)
        2. <한글 제목> [보안] [국내]
           ...
        궁금한 번호나 용어 있으면 말해주세요.
나: 1번 자세히 설명해줘
Claude: (원문을 읽고 설명)
나: 다른 사람들 반응은?
Claude: (HN 글과 댓글을 읽고 출처를 밝혀 요약. HN에 글이 없으면 없다고만 답해요)
```

## 동작 방식
1. 스크립트(`fetch-news.mjs`)가 `feeds.json`에 적힌 RSS/Atom 피드를 병렬로 가져와요. API 키는 필요 없어요. 일부 피드가 실패해도 나머지로 진행하고, 실패한 매체는 알려줘요.
2. 최근 며칠 이내 기사만 남기고, 이전에 본 기사를 빼고, 같은 URL이거나 제목이 비슷한 기사는 하나로 합쳐요. 여러 매체가 보도한 기사는 매체 수를 기록해요.
3. Claude가 분야를 분류하고, 의미가 겹치는 기사를 합치고, 동시 보도·업계 영향 범위·최신성으로 3~5개를 골라요.
4. 후속 질문은 기사 원문을 근거로 답하고, 개념 질문은 일반 지식으로 설명하되 그렇다고 밝혀요.
5. 반응을 물으면 `fetch-hn.mjs`가 HN Algolia API(`hn.algolia.com/api/v1`)에서 해당 기사의 HN 글을 찾고, 그 댓글을 근거로 요약해요.

외부로 나가는 요청은 RSS 피드 요청, HN API 호출, 후속 질문 때 읽는 기사 원문 요청뿐입니다.

## 뉴스 소스 바꾸기
`plugins/it-pulse/feeds.json`에서 매체를 추가·삭제하세요. 각 항목은 아래 형식입니다.

```json
{ "name": "매체 이름", "url": "RSS 주소", "lang": "ko 또는 en", "region": "kr 또는 global" }
```

`region`이 `kr`이면 "한국 IT 소식"에, `global`이면 "해외 IT 소식"에 쓰여요.

## 설정 (환경변수, 모두 선택)
| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `IT_PULSE_NOTES_DIR` | `%USERPROFILE%\Downloads\it-pulse` | 정리본 저장 폴더 |
| `IT_PULSE_FEEDS_FILE` | 플러그인 폴더의 `feeds.json` | RSS 피드 목록 파일 |
| `IT_PULSE_NEWS_MAX_AGE_DAYS` | 3 | 며칠 이내 기사만 대상으로 할지 |
| `IT_PULSE_NEWS_PER_FEED` | 15 | 피드당 가져올 기사 수 |
| `IT_PULSE_NEWS_CANDIDATES` | 25 | Claude에게 넘길 후보 수 (지역별로 나눠요) |
| `IT_PULSE_NEWS_SUMMARY_MAX_CHARS` | 200 | 후보 요약 길이 |
| `IT_PULSE_HISTORY_DAYS` | 14 | 이전 브리핑 제외 기간(일) |
| `IT_PULSE_DATA_DIR` | `%USERPROFILE%\.it-pulse` | 이력 폴더 (스킬은 플러그인 데이터 폴더를 넘겨요) |
| `IT_PULSE_COMMENT_COUNT` | 8 | 반응 조회 때 읽는 HN 댓글 수 |
| `IT_PULSE_HN_SEARCH_HITS` | 3 | 기사 하나당 찾아볼 HN 글 수 |
| `IT_PULSE_TIMEOUT_MS` | 10000 | 요청 제한 시간 |
| `HN_API_BASE` | `https://hn.algolia.com/api/v1` | HN API 주소 |

## 구조
```
.claude-plugin/marketplace.json      마켓플레이스 정의
plugins/it-pulse/
  .claude-plugin/plugin.json         플러그인 정의
  feeds.json                         뉴스 RSS 피드 목록
  skills/briefing/SKILL.md           브리핑, 후속 대화, HN 반응 규칙
  skills/save-notes/SKILL.md         대화 정리 저장
  scripts/fetch-news.mjs             RSS 수집, 지역 필터, 중복 제거, 이력
  scripts/fetch-hn.mjs               HN 글 검색, 댓글 조회
  scripts/save-note.mjs              정리본 저장 경로 생성
  scripts/config.mjs                 설정값
```

## 한계
- 피드에 올라온 기사만 대상이라, 목록에 없는 매체의 소식은 나오지 않아요.
- 피드 요약은 앞부분만 담고 있어서, 자세한 내용은 번호를 물어봐야 원문을 읽고 답해요.
- 한국 기사처럼 HN에서 다뤄지지 않은 소식은 반응을 찾을 수 없어요.
- 분야 분류와 중요도 판단은 Claude가 해서, 매번 결과가 조금씩 다를 수 있어요.
- 페이월이나 차단으로 원문을 읽지 못하면 그 사실을 알리고, 읽지 못한 내용은 답하지 않아요.

## 라이선스
[LICENSE](LICENSE)를 참고하세요.
