# it-pulse

Hacker News 인기글에서 AI·빅테크·보안·개발기술 이슈만 골라 3~5개로 브리핑하고, 궁금한 건 친구와 대화하듯 물어볼 수 있는 Claude Code 플러그인입니다.

## 이런 점이 달라요
- **핵심만 3~5개**: HN 메인 페이지 글 중 AI·빅테크·보안·개발기술 글만 남기고, 같은 이슈는 하나로 합쳐요.
- **중복 최소화**: 이전에 보여준 글은 다음 브리핑에서 제외해요. (다시 보고 싶으면 "다시 보여줘")
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
| 기사 자세히 보기 | "3번 자세히 설명해줘" |
| 용어·배경 묻기 | "ㅇㅇ이 뭐야?" |
| 대화 정리 저장 | "정리해줘" 또는 `/it-pulse:save-notes` (끝내는 말을 하면 저장할지 먼저 물어봐요) |

### 대화 예시 (형식을 보여주는 예시이며 실제 결과가 아닙니다)
```
나: 요즘 IT 이슈 뭐야?
Claude: 요즘 이런 이슈들이 올라오고 있어요.
        1. <한글 제목> [AI]
           <한두 줄 요약> (HN 점수 · 댓글수)
        2. <한글 제목> [보안]
           ...
        궁금한 번호나 용어 있으면 말해주세요.
나: 1번 자세히 설명해줘
Claude: (원문과 HN 댓글을 읽고 출처를 구분해서 설명)
```

## 동작 방식
1. 스크립트가 HN Algolia API(`hn.algolia.com/api/v1`)에서 메인 페이지 글을 가져와요. API 키는 필요 없어요.
2. 이전에 본 글을 빼고, 같은 URL이거나 제목이 비슷한 글은 점수가 높은 쪽만 남겨 후보 15개로 줄여요.
3. Claude가 분야를 분류하고, 의미가 겹치는 글을 합치고, HN 반응과 업계 영향 범위로 3~5개를 골라요.
4. 후속 질문은 기사 원문과 HN 댓글을 근거로 답하고, 개념 질문은 일반 지식으로 설명하되 그렇다고 밝혀요.

외부로 나가는 요청은 HN API 호출과, 후속 질문 때 읽는 기사 원문 요청뿐입니다.

## 설정 (환경변수, 모두 선택)
| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `IT_PULSE_NOTES_DIR` | `%USERPROFILE%\Downloads\it-pulse` | 정리본 저장 폴더 |
| `IT_PULSE_FETCH_COUNT` | 30 | HN에서 가져올 글 수 |
| `IT_PULSE_CANDIDATES` | 15 | Claude에게 넘길 후보 수 |
| `IT_PULSE_HISTORY_DAYS` | 14 | 이전 브리핑 제외 기간(일) |
| `IT_PULSE_DATA_DIR` | `%USERPROFILE%\.it-pulse` | 이력 폴더 (스킬은 플러그인 데이터 폴더를 넘겨요) |
| `IT_PULSE_COMMENT_COUNT` | 8 | 후속 질문 때 읽는 HN 댓글 수 |
| `HN_API_BASE` | `https://hn.algolia.com/api/v1` | HN API 주소 |

## 구조
```
.claude-plugin/marketplace.json      마켓플레이스 정의
plugins/it-pulse/
  .claude-plugin/plugin.json         플러그인 정의
  skills/briefing/SKILL.md           브리핑과 후속 대화 규칙
  skills/save-notes/SKILL.md         대화 정리 저장
  scripts/fetch-hn.mjs               HN 수집, 중복 제거, 이력
  scripts/save-note.mjs              정리본 저장 경로 생성
  scripts/config.mjs                 설정값
```

## 한계
- HN에 올라온 글만 대상이라, HN에서 화제가 되지 않은 소식은 나오지 않아요.
- 분야 분류와 중요도 판단은 Claude가 해서, 매번 결과가 조금씩 다를 수 있어요.
- 페이월이나 차단으로 원문을 읽지 못하면 그 사실을 알리고, 읽지 못한 내용은 답하지 않아요.

## 라이선스
[LICENSE](LICENSE)를 참고하세요.
