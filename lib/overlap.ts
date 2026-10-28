// 섭취 중인 제품 사이의 기능성 원재료 겹침. 함량은 공식 데이터에 없어 계산하지 않는다.
// 원재료명은 자유 서술이라("비타민 D3(고시형)", "건조효모(비타민D)", "비타민D3혼합제제") 대표 성분으로 묶어 비교한다.
import type { ProductSummary as Product } from "./types.ts";

// shortcut: 자주 쓰이는 고시형 원료만 묶는다. 전체 데이터가 들어오면 묶이지 않은 원재료명 빈도를 보고 보강한다.
const CANON: [string, RegExp][] = [
  ["비타민 A", /비타민\s?A|베타카로틴/i],
  ["비타민 B1", /비타민\s?B1(?!\d)|티아민/i],
  ["비타민 B2", /비타민\s?B2|리보플라빈/i],
  ["비타민 B6", /비타민\s?B6|피리독신/i],
  ["비타민 B12", /비타민\s?B12|시아노코발라민/i],
  ["비타민 C", /비타민\s?C|아스코르브/i],
  ["비타민 D", /비타민\s?D|콜레칼시페롤/i],
  ["비타민 E", /비타민\s?E|토코페롤/i],
  ["비타민 K", /비타민\s?K/i],
  ["엽산", /엽산/],
  ["나이아신", /나이아신|니코틴산/],
  ["판토텐산", /판토텐산/],
  ["비오틴", /비오틴/],
  ["칼슘", /(?<!셀룰로스|스테아린산)칼슘/],
  ["마그네슘", /(?<!스테아린산)마그네슘/],
  ["아연", /아연/],
  ["철", /(?<![가-힣])철(?![가-힣])|푸마르산제일철|황산제일철|철\(/],
  ["셀레늄", /셀레늄|셀렌/],
  ["EPA·DHA", /EPA|DHA|오메가-?3/i],
  ["루테인", /루테인/],
  ["프로바이오틱스", /프로바이오틱스|유산균|Lacto|Bifido|Streptococcus|Enterococcus|Lacti|Limosi|Lactiplanti/i],
  ["홍삼", /홍삼/],
  ["밀크씨슬", /밀크씨슬|실리마린/],
  ["코엔자임Q10", /코엔자임\s?Q10/i],
  ["MSM", /엠에스엠|MSM/i],
];

const EXCIPIENT = /스테아린산마그네슘|이산화규소|결정셀룰로스/;

/** 원재료명 하나 → 대표 성분 이름들. 묶이지 않으면 괄호를 떼고 정리한 원문을 쓴다. */
export function canonicalIngredients(s: string): string[] {
  if (EXCIPIENT.test(s)) return [];
  const hits = CANON.filter(([, re]) => re.test(s)).map(([k]) => k);
  return hits.length ? hits : [s.replace(/\((고시형|개별인정형)\)/g, "").replace(/\s+/g, " ").trim()];
}

export interface Overlap { ingredient: string; products: Product[]; sources: Record<string, string[]> }

export function findOverlaps(products: Product[]): Overlap[] {
  const by = new Map<string, Overlap>();
  for (const p of products) {
    for (const raw of p.functionalIngredients) {
      for (const k of canonicalIngredients(raw)) {
        const e = by.get(k) ?? { ingredient: k, products: [], sources: {} };
        if (!e.products.includes(p)) e.products.push(p);
        (e.sources[p.id] ??= []).push(raw);
        by.set(k, e);
      }
    }
  }
  return [...by.values()].filter((e) => e.products.length > 1);
}
