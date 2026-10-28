// 원격 카탈로그 검증. 앱(원격 수신)과 빌드 스크립트가 같이 쓴다. 하나라도 어긋나면 통째로 버린다.
import type { Catalog, Product, ProductSummary } from "./types.ts";

const isStrArr = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
const isStrOrNull = (v: unknown) => v === null || typeof v === "string";

const isSummary = (p: ProductSummary) =>
  !!p && typeof p.id === "string" && /^\d+$/.test(p.id) && typeof p.name === "string" && typeof p.manufacturer === "string" &&
  isStrOrNull(p.type) && isStrArr(p.functionalIngredients) && isStrArr(p.otherIngredients) && isStrArr(p.areas) &&
  isStrArr(p.noteFlags) && typeof p.hasFunctionality === "boolean";

export function parseCatalog(x: unknown): Catalog | null {
  const c = x as Catalog;
  if (!c || typeof c !== "object" || !c.meta || !Array.isArray(c.products)) return null;
  if (!["sample", "full", "empty"].includes(c.meta.scope) || !isStrOrNull(c.meta.syncedAt)) return null;
  return c.products.every(isSummary) ? { ...c, meta: { ...c.meta, total: c.products.length } } : null;
}

export function parseProduct(x: unknown): Product | null {
  const p = x as Product;
  const ok = isSummary(p) && [p.shape, p.functionality, p.intake, p.precautions, p.storage, p.standard].every(isStrOrNull) &&
    !!p.source && typeof p.source.recordId === "string" && typeof p.source.syncedAt === "string";
  return ok ? p : null;
}

/** 번들 데이터처럼 상세 정보까지 들어 있는 항목인지 */
export const isFull = (p: ProductSummary): p is Product => "source" in p;
