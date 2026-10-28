// 브랜드 1차 후보 규칙. 결과는 사람이 검토하기 전까지 후보일 뿐이고, 화면에는 검토가 끝난 품목제조번호 표만 쓴다.
// 규칙: manufacturer(업소명 포함)나 name(제품명 포함) 중 하나라도 맞으면 후보, excludeName이 제품명에 있으면 제외.
export interface BrandRules { manufacturer?: string[]; name?: string[]; excludeName?: string[] }
export interface Brand { id: string; name: string; company: string; rules: BrandRules; products: string[]; _check?: string }

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
const hit = (text: string, terms: string[] = []) => terms.find((t) => norm(text).includes(norm(t)));

/** 맞으면 어떤 규칙에 걸렸는지("업소명:대상웰라이프"), 아니면 null */
export function matchBrand(b: Brand, p: { name: string; manufacturer: string }): string | null {
  if (hit(p.name, b.rules.excludeName)) return null;
  const m = hit(p.manufacturer, b.rules.manufacturer);
  if (m) return `업소명:${m}`;
  const n = hit(p.name, b.rules.name);
  return n ? `제품명:${n}` : null;
}
