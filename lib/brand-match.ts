// 브랜드 1차 후보 규칙. 결과는 사람이 검토하기 전까지 후보일 뿐이고, 화면에는 검토가 끝난 품목제조번호 표만 쓴다.
// 확실: 자사 제조 업소명(manufacturer) 또는 브랜드 고유 제품명(name)에 걸린 경우
// 확인 필요: 짧거나 흔한 제품명(weakName), 또는 남의 제품도 만드는 업소(manufacturerOem)에 걸린 경우
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
const hit = (text: string, terms: string[] = []) => terms.find((t) => norm(text).includes(norm(t)));

export function matchBrand(b: Brand, p: { name: string; manufacturer: string }): BrandMatch | null {
  const r = b.rules;
  if (hit(p.name, r.excludeName)) return null;
  let t;
  if ((t = hit(p.manufacturer, r.manufacturer))) return { by: `업소명:${t}`, sure: true };
  if ((t = hit(p.name, r.name))) return { by: `제품명:${t}`, sure: true };
  if ((t = hit(p.manufacturer, r.manufacturerOem))) return { by: `업소명(위탁 겸업):${t}`, sure: false };
  if ((t = hit(p.name, r.weakName))) return { by: `제품명(짧은 이름):${t}`, sure: false };
  return null;
}
