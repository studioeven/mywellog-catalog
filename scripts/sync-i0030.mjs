// 식품안전나라 I0030(건강기능식품 품목제조 신고사항) 원문을 data/i0030-raw.json으로 저장한다.
// FSK_API_KEY가 있으면 1,000건씩 받고, 없으면 공개 샘플 키로 키워드별 최대 15건만 받는다.
// 키가 있을 때: 지난 전체 동기화가 6일 이내면 CHNG_DT로 그 뒤 바뀐 것만 받아 합치고(증분), 아니면 전체를 받는다.
// FSK_FULL=1이면 항상 전체. 증분으로는 삭제된 품목을 알 수 없으므로 주 1회는 전체로 돌린다.
// 호출 제한: 1회 1,000건, 06~19시 300회/일, 증분(CHNG_DT) 없이 시간당 100회.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const KEY = process.env.FSK_API_KEY || "sample";
const BASE = "http://openapi.foodsafetykorea.go.kr/api";
const SAMPLE_KEYWORDS = [
  "루테인", "오메가", "비타민D", "비타민C", "멀티비타민", "칼슘", "마그네슘", "철", "아연",
  "유산균", "프로바이오틱스", "홍삼", "밀크씨슬", "가르시니아", "코엔자임", "쏘팔메토",
  "엽산", "콜라겐", "테아닌", "감마리놀렌산", "프락토올리고당", "비타민B",
];

async function page(start, end, query = "") {
  const url = `${BASE}/${KEY}/I0030/json/${start}/${end}${query ? "/" + encodeURI(query) : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url.replace(KEY, "***")}`);
  const body = (await res.json()).I0030;
  const code = body?.RESULT?.CODE;
  if (code === "INFO-200") return { rows: [], total: 0 };
  if (code !== "INFO-000") throw new Error(`${code} ${body?.RESULT?.MSG}`);
  return { rows: body.row ?? [], total: Number(body.total_count) };
}

const OUT = new URL("../data/i0030-raw.json", import.meta.url);
const kstYmd = (t) => new Date(t + 9 * 3_600_000).toISOString().slice(0, 10).replaceAll("-", "");
let mode = KEY === "sample" ? "sample" : "full";
let fullSyncedAt = new Date().toISOString();

async function fetchAll(query) {
  const { total } = await page(1, 1, query);
  for (let s = 1; s <= total; s += 1000) {
    const { rows: r } = await page(s, Math.min(s + 999, total), query);
    r.forEach((x) => rows.set(x.PRDLST_REPORT_NO, x));
    console.log(`${query || "전체"} ${Math.min(s + 999, total)} / ${total}`);
  }
}

const rows = new Map();
if (KEY === "sample") {
  // 샘플 키는 호출 횟수가 적게 막혀 있다. 막히면 그때까지 받은 것만 저장한다.
  try {
    for (const kw of SAMPLE_KEYWORDS) {
      for (const [s, e] of [[1, 5], [6, 10], [11, 15]]) {
        const { rows: r } = await page(s, e, `PRDLST_NM=${kw}`);
        r.forEach((x) => rows.set(x.PRDLST_REPORT_NO, x));
        if (r.length < 5) break;
      }
    }
  } catch (err) {
    console.warn(`중단: ${err.message}`);
    if (!rows.size) process.exit(1);
  }
} else {
  const prev = await readFile(OUT, "utf8").then(JSON.parse).catch(() => null);
  const ageDays = prev ? (Date.now() - Date.parse(prev.fullSyncedAt ?? prev.syncedAt)) / 86_400_000 : Infinity;
  if (prev?.scope === "full" && ageDays < 6 && !process.env.FSK_FULL) {
    mode = "incremental";
    fullSyncedAt = prev.fullSyncedAt ?? prev.syncedAt;
    prev.rows.forEach((x) => rows.set(x.PRDLST_REPORT_NO, x));
    await fetchAll(`CHNG_DT=${kstYmd(Date.parse(prev.syncedAt) - 86_400_000)}`); // 하루 겹쳐 받아 경계 누락을 막는다
  } else {
    await fetchAll("");
  }
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true }); // CI 첫 실행에는 data 폴더가 없다
// 임시 파일에 다 쓴 뒤 바꿔 끼운다. 중간에 실패하면 마지막 성공 파일이 그대로 남는다.
const TMP = new URL("../data/i0030-raw.json.tmp", import.meta.url);
await writeFile(
  TMP,
  JSON.stringify({
    dataset: "I0030",
    source: "식품의약품안전처 식품안전나라 · 건강기능식품 품목제조 신고사항 현황",
    sourceUrl: "https://www.foodsafetykorea.go.kr/api/openApiInfo.do?svc_no=I0030",
    scope: KEY === "sample" ? "sample" : "full",
    mode,
    syncedAt: new Date().toISOString(),
    fullSyncedAt,
    rows: [...rows.values()],
  }, null, 1),
);
await rename(TMP, OUT);
console.log(`saved ${rows.size} rows (${mode})`);
