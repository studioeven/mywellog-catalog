import { test } from "node:test";
import assert from "node:assert/strict";
import { splitIngredients, toCatalog } from "./adapters/i0030.ts";
import { leadsFrom, eligibleForLead } from "./rules/recommend.ts";
import { allergenHits, safetyFlags, consultFirst, relevantPrecautions } from "./rules/safety.ts";
import { findOverlaps, canonicalIngredients } from "./overlap.ts";

const row = (o: Record<string, string>) => ({
  PRDLST_REPORT_NO: "1", PRDLST_NM: "테스트", BSSH_NM: "제조사", NTK_MTHD: "1일 1회", PRODUCTION: "아니오",
  PRIMARY_FNCLTY: "", INDIV_RAWMTRL_NM: "", ETC_RAWMTRL_NM: "", IFTKN_ATNT_MATR_CN: "", LAST_UPDT_DTM: "20260721", ...o,
});
const file = (rows: Record<string, string>[]) => ({ source: "s", sourceUrl: "u", scope: "sample" as const, syncedAt: "2026-10-23T00:00:00Z", rows });

test("괄호 안 쉼표는 나누지 않는다", () => {
  assert.deepEqual(splitIngredients("식물혼합농축액(대추60%,구기자12%), 정제수"), ["식물혼합농축액(대추60%,구기자12%)", "정제수"]);
});

test("원료용·수출용·(구) 제품은 카탈로그에서 빠진다", () => {
  const c = toCatalog(file([
    row({ PRDLST_REPORT_NO: "a", NTK_MTHD: "건강기능식품 원료로 사용" }),
    row({ PRDLST_REPORT_NO: "b", PRDLST_NM: "(전량수출용)비타민" }),
    row({ PRDLST_REPORT_NO: "c", PRDLST_NM: "(구) 루테인" }),
    row({ PRDLST_REPORT_NO: "d", PRIMARY_FNCLTY: "눈의 피로도 개선에 도움을 줄 수 있음" }),
  ]));
  assert.equal(c.products.length, 1);
  assert.deepEqual(c.meta.excluded, { rawMaterial: 1, exportOnly: 1, renamed: 1 });
  assert.deepEqual(c.products[0].areas, ["eye"]); // 눈의 피로도는 피로 개선 분야가 아니다
  assert.equal(c.products[0].source.officialUpdatedAt, "2026-07-21");
});

test("관심 분야와 식습관이 이유와 함께 리드로 바뀐다", () => {
  const leads = leadsFrom({ interests: ["eye"], rarelyEat: ["fish"], sunlight: ["low"] });
  assert.deepEqual(leads.map((l) => l.key), ["area:eye", "ing:fish", "ing:sun"]);
  const [p] = toCatalog(file([row({ INDIV_RAWMTRL_NM: "EPA 및 DHA 함유 유지", PRIMARY_FNCLTY: "혈중 중성지방 개선" })])).products;
  assert.ok(leads[1].match(p));
  assert.ok(!leads[2].match(p));
});

test("주된 기능성 원문이 없거나 생산 종료된 제품은 추천 근거가 될 수 없다", () => {
  const [a, b] = toCatalog(file([row({ PRDLST_REPORT_NO: "x" }), row({ PRDLST_REPORT_NO: "y", PRIMARY_FNCLTY: "면역", PRODUCTION: "예" })])).products;
  assert.equal(eligibleForLead(a), false);
  assert.equal(eligibleForLead(b), false);
});

test("안전 항목이나 19세 미만이면 상담 안내가 먼저다", () => {
  assert.equal(consultFirst(safetyFlags({ safety: ["none"] })), false);
  assert.deepEqual(safetyFlags({ age: ["u19"] }), ["minor"]);
  assert.equal(consultFirst(safetyFlags({ safety: ["medication"] })), true);
});

test("피할 원료가 원재료명에 있으면 찾아낸다 (밀크씨슬은 밀이 아니다)", () => {
  const [p] = toCatalog(file([row({ INDIV_RAWMTRL_NM: "밀크씨슬(카르두스 마리아누스) 추출물", ETC_RAWMTRL_NM: "젤라틴(돼지), 대두유" })])).products;
  const hits = allergenHits(p, { avoid: ["wheat", "gelatin", "soy"] });
  assert.deepEqual(hits.map((h) => h.term).sort(), ["gelatin", "soy"]);
  assert.equal(allergenHits(p, { avoidOther: "카르두스" }).length, 1);
});

test("안전 항목과 관련된 공식 주의 문장만 그대로 뽑는다", () => {
  const [p] = toCatalog(file([row({ IFTKN_ATNT_MATR_CN: "1. 임산부는 섭취를 피하십시오.\n2. 이상사례 발생 시 섭취를 중단하십시오." })])).products;
  assert.deepEqual(relevantPrecautions(p, ["pregnant"]), ["1. 임산부는 섭취를 피하십시오."]);
});

test("같은 기능성 원재료는 표기가 조금 달라도 겹침으로 잡는다", () => {
  const c = toCatalog(file([
    row({ PRDLST_REPORT_NO: "1", PRDLST_NM: "가", INDIV_RAWMTRL_NM: "비타민 D(고시형), 칼슘" }),
    row({ PRDLST_REPORT_NO: "2", PRDLST_NM: "나", INDIV_RAWMTRL_NM: "비타민D" }),
  ]));
  const o = findOverlaps(c.products);
  assert.equal(o.length, 1);
  assert.equal(o[0].products.length, 2);
});

test("원재료명 표기가 달라도 대표 성분으로 묶고, 부형제는 빼낸다", () => {
  assert.deepEqual(canonicalIngredients("비타민 D3(고시형)"), ["비타민 D"]);
  assert.deepEqual(canonicalIngredients("건조효모(비타민D)"), ["비타민 D"]);
  assert.deepEqual(canonicalIngredients("비타민D3혼합제제"), ["비타민 D"]);
  assert.deepEqual(canonicalIngredients("스테아린산마그네슘"), []);
  assert.deepEqual(canonicalIngredients("산화마그네슘(고시형)"), ["마그네슘"]);
  assert.deepEqual(canonicalIngredients("Lactiplantibacillus plantarum(고시형)"), ["프로바이오틱스"]);
  assert.deepEqual(canonicalIngredients("엠에스엠(고시형)"), ["MSM"]);
});

test("원격 카탈로그는 형식이 하나라도 어긋나면 통째로 버린다", async () => {
  const { parseCatalog } = await import("./catalog-parse.ts");
  const good = toCatalog(file([row({ PRDLST_REPORT_NO: "1", INDIV_RAWMTRL_NM: "칼슘" })]));
  assert.ok(parseCatalog(JSON.parse(JSON.stringify(good))));
  assert.equal(parseCatalog(null), null);
  assert.equal(parseCatalog({ meta: good.meta, products: "x" }), null);
  const bad = JSON.parse(JSON.stringify(good));
  bad.products[0].functionalIngredients = "칼슘";
  assert.equal(parseCatalog(bad), null);
  bad.products[0].functionalIngredients = [];
  bad.meta.scope = "huge";
  assert.equal(parseCatalog(bad), null);
});

test("브랜드 후보 규칙: 업소명·제품명 포함, 제외어 우선, 띄어쓰기 무시", async () => {
  const { matchBrand } = await import("./brand-match.ts");
  const ckd = { id: "ckdhc", name: "종근당건강", company: "", products: [], rules: { manufacturer: ["종근당건강"], excludeName: ["락토핏"] } };
  assert.equal(matchBrand(ckd, { name: "프로메가", manufacturer: "종근당건강(주)" }), "업소명:종근당건강");
  assert.equal(matchBrand(ckd, { name: "락토핏 생유산균 골드", manufacturer: "종근당건강(주)" }), null);
  const lacto = { id: "lactofit", name: "락토핏", company: "", products: [], rules: { name: ["락토핏"] } };
  assert.equal(matchBrand(lacto, { name: "락토 핏 골드", manufacturer: "다른공장" }), "제품명:락토핏");
  assert.equal(matchBrand(lacto, { name: "비타민C", manufacturer: "다른공장" }), null);
});
