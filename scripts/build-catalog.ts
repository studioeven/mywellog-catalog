// data/i0030-raw.json → dist/catalog/ (정적 호스팅에 폴더째 올린다)
//   index.json      목록 인덱스: 제품마다 가벼운 정보만 (앱이 처음 받아 기기에 저장)
//   p/<번호>.json   제품별 상세: 공식 원문 전체와 출처 (상세 화면을 열 때 받음)
//   sync-log.json   마지막 성공 기록
// 동기화가 실패하면 이 스크립트까지 오지 않으므로 이미 올라가 있는 이전 파일이 그대로 남는다.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { toCatalog } from "../lib/adapters/i0030.ts";
import { parseCatalog, parseProduct } from "../lib/catalog-parse.ts";
import type { Product, ProductSummary } from "../lib/types.ts";

const raw = JSON.parse(await readFile(new URL("../data/i0030-raw.json", import.meta.url), "utf8"));
const full = toCatalog(raw);

const summary = (p: Product): ProductSummary => ({
  id: p.id, name: p.name, manufacturer: p.manufacturer, brand: p.brand, type: p.type,
  functionalIngredients: p.functionalIngredients, otherIngredients: p.otherIngredients,
  discontinued: p.discontinued, reportedAt: p.reportedAt, areas: p.areas, sponsorship: p.sponsorship,
  hasFunctionality: p.hasFunctionality, noteFlags: p.noteFlags,
});
const index = { meta: full.meta, products: (full.products as Product[]).map(summary) };
if (!parseCatalog(index)) throw new Error("목록 인덱스가 형식에 맞지 않습니다");

const out = new URL("../dist/catalog/", import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(new URL("p/", out), { recursive: true });
for (const p of full.products as Product[]) {
  if (!parseProduct(p)) throw new Error(`상세 형식 오류: ${p.id}`);
  await writeFile(new URL(`p/${p.id}.json`, out), JSON.stringify(p)); // id는 숫자만 허용(parseProduct)이라 경로로 써도 안전
}
const body = JSON.stringify(index);
await writeFile(new URL("index.json", out), body);
await writeFile(new URL("sync-log.json", out), JSON.stringify({
  lastSuccessAt: raw.syncedAt, mode: raw.mode ?? "full", scope: full.meta.scope,
  rawRows: raw.rows.length, products: full.meta.total, excluded: full.meta.excluded,
}, null, 1));
console.log(`index.json ${(body.length / 1e6).toFixed(2)} MB · 제품 ${full.meta.total}개 (제품당 ${Math.round(body.length / Math.max(1, full.meta.total))}바이트)`);
