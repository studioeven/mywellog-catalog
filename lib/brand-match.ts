// 브랜드 1차 후보 규칙. 결과는 사람이 검토하기 전까지 후보일 뿐이고, 화면에는 검토가 끝난 품목제조번호 표만 쓴다.
// 확실: 자사 제조 업소명(manufacturer) 또는 브랜드 고유 제품명(name)에 걸린 경우
// 확인 필요: 짧거나 흔한 제품명(weakName), 또는 남의 제품·원료도 만드는 업소(manufacturerOem)에 걸린 경우
// excludeName이 제품명에 있으면 항상 제외. 띄어쓰기와 대소문자는 무시한다.
export interface BrandRules {
  manufacturer?: string[];
  manufacturerOem?: string[];
  name?: string[];
  weakName?: string[];
  excludeName?: string[];
}
export interface Brand { id: string; name: string; company: string; rules: BrandRules; products: string[]; _check?: string }
export interface BrandMatch { by: string; sure: boolean }

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 영문 약어(GNM, CJ)는 띄어쓰기를 지우면 "Young NMN"→"youngnmn"처럼 엉뚱하게 걸리므로 원문에서 단어 경계로 찾는다
const hitOne = (text: string, t: string) =>
  /^[a-z0-9]+$/i.test(t) ? new RegExp(`(^|[^a-z0-9])${esc(t)}([^a-z0-9]|$)`, "i").test(text) : norm(text).includes(norm(t));
const hit = (text: string, terms: string[] = []) => terms.find((t) => hitOne(text, t));

export function matchBrand(b: Brand, p: { name: string; manufacturer: string }): BrandMatch | null {
  const r = b.rules;
  if (hit(p.name, r.excludeName)) return null;
  let t;
  if ((t = hit(p.manufacturer, r.manufacturer))) return { by: `업소명:${t}`, sure: true };
  const oem = hit(p.manufacturer, r.manufacturerOem);
  if ((t = hit(p.name, r.name))) {
    // 원료·위탁 겸업 업소가 만든 제품은 제품명이 맞아도 원료명일 수 있어 확인 필요로 둔다
    return oem ? { by: `제품명:${t} · 업소명(위탁 겸업):${oem}`, sure: false } : { by: `제품명:${t}`, sure: true };
  }
  // 제품명 규칙이 없는 브랜드(예: 일동)만 겸업 업소명 하나로 후보를 잡는다
  if (oem && !r.name && !r.weakName) return { by: `업소명(위탁 겸업):${oem}`, sure: false };
  if ((t = hit(p.name, r.weakName))) return { by: `제품명(짧은 이름):${t}`, sure: false };
  return null;
}
