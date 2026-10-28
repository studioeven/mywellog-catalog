# mywellog-catalog

마이웰로그 앱이 내려받는 건강기능식품 카탈로그를 만드는 저장소입니다. 매일 03:00(KST)에 식품의약품안전처 식품안전나라 OpenAPI(I0030, 건강기능식품 품목제조 신고사항 현황)를 받아 정적 JSON으로 바꾸고 GitHub Pages에 올립니다.

## 결과물 (GitHub Pages)

| 경로 | 내용 |
| --- | --- |
| `index.json` | 목록 인덱스. 제품마다 이름·업소명·유형·기능성 원재료 같은 가벼운 정보만 |
| `p/<품목제조번호>.json` | 제품별 상세. 공식 원문 전체와 출처 |
| `sync-log.json` | 마지막 성공 시각, 원문 건수, 제품 수, 제외 건수 |

앱에서는 `EXPO_PUBLIC_CATALOG_URL`에 `https://studioeven.github.io/mywellog-catalog/index.json`을 넣습니다.

## 처음 한 번 설정

1. **인증키 넣기**: 저장소 **Settings → Secrets and variables → Actions → New repository secret**을 누르고, Name에 `FSK_API_KEY`, Secret에 식품안전나라에서 받은 인증키를 넣어 저장합니다. 키는 파일로 커밋하지 않습니다.
2. **Pages 켜기**: **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
3. **첫 실행**: **Actions → sync-catalog → Run workflow**에서 `전체 동기화 강제`를 체크하고 실행합니다. 첫 실행은 약 4만 6천 건을 받습니다.

인증키가 없으면 동기화 단계에서 멈추고 배포하지 않습니다. 이미 올라가 있는 카탈로그는 그대로 남습니다.

## 동작

- 지난 전체 동기화가 6일 이내면 `CHNG_DT`(하루 겹침)로 바뀐 품목만 받아 합칩니다. 아니면 전체를 받습니다. 증분으로는 삭제된 품목을 알 수 없어서 6일마다 전체로 돌아갑니다.
- 지난 원문은 Actions 캐시로 이어받습니다. 캐시가 사라지면 다음 실행이 전체 동기화가 됩니다.
- 어느 단계든 실패하면 배포하지 않습니다.
- 원료 납품용, 전량 수출용, 이름이 바뀐 `(구)` 제품은 빠집니다.

## 로컬에서 돌려 보기 (Node 24 이상)

```bash
echo "FSK_API_KEY=발급키" > .env.local
npm run sync
npm run build:catalog
npm test
```

## 코드 출처

`lib/`와 `scripts/`는 앱 저장소(`studioeven/mywellog`)의 같은 경로에서 복사한 것입니다. 어댑터나 형식 검증을 고치면 두 저장소를 함께 고쳐야 합니다.
