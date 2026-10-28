// 식품안전나라 I0030 원문 행 → Product. 다른 공식 출처가 생기면 같은 모양의 어댑터를 하나 더 만든다.
import type { Catalog, CatalogMeta, Product } from "../types.ts";
import { classifyAreas } from "../areas.ts";
import { NOTE_PATTERNS } from "../rules/safety.ts";

export type I0030Row = Record<string, string>;
export interface I0030File {
  source: string;
  sourceUrl: string;
  scope: "sample" | "full";
  syncedAt: string;
  rows: I0030Row[];
}

const clean = (v: string | undefined) => {
  const t = (v ?? "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  return t ? t : null;
};

/** 괄호 밖의 쉼표로만 나눈다: "식물혼합농축액(대추60%,구기자12%), 정제수" → 2개 */
export function splitIngredients(v: string | undefined): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of v ?? "") {
    if ("([{（".includes(ch)) depth++;
    if (")]}）".includes(ch)) depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === "，") && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

const ymd = (v: string | undefined) => (v && /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}` : null);

/** 소비자용 완제품이 아닌 행을 걸러 낸다. 이유를 돌려주고, 통과하면 null. */
export function exclusionReason(r: I0030Row): keyof CatalogMeta["excluded"] | null {
  if (/원료로\s*사용/.test(r.NTK_MTHD ?? "")) return "rawMaterial";
  if (/전량\s*수출|수출\s*(용|전용)/.test(r.PRDLST_NM ?? "")) return "exportOnly"; // "(수출용)", "(일본수출용)", "(수출전용)" 등
  if (/^\s*\(구\)/.test(r.PRDLST_NM ?? "")) return "renamed";
  return null;
}

export function toProduct(r: I0030Row, file: Pick<I0030File, "source" | "sourceUrl" | "syncedAt">): Product {
  const functionality = clean(r.PRIMARY_FNCLTY);
  return {
    id: r.PRDLST_REPORT_NO,
    name: (r.PRDLST_NM ?? "").trim(),
    manufacturer: (r.BSSH_NM ?? "").trim(),
    brand: null,
    type: clean(r.PRDLST_CDNM) ?? clean(r.RAWMTRL_NM),
    shape: clean(r.PRDT_SHAP_CD_NM),
    functionalIngredients: splitIngredients(r.INDIV_RAWMTRL_NM),
    otherIngredients: [...splitIngredients(r.ETC_RAWMTRL_NM), ...splitIngredients(r.CAP_RAWMTRL_NM)],
    functionality,
    intake: clean(r.NTK_MTHD),
    precautions: clean(r.IFTKN_ATNT_MATR_CN),
    storage: clean(r.CSTDY_MTHD),
    standard: clean(r.STDR_STND),
    discontinued: r.PRODUCTION === "예" ? true : r.PRODUCTION === "아니오" ? false : null,
    areas: classifyAreas(functionality),
    hasFunctionality: functionality !== null,
    noteFlags: Object.entries(NOTE_PATTERNS).filter(([, re]) => re!.test(r.IFTKN_ATNT_MATR_CN ?? "")).map(([k]) => k),
    sponsorship: null,
    source: {
      dataset: "I0030",
      datasetName: file.source,
      url: file.sourceUrl,
      recordId: r.PRDLST_REPORT_NO,
      officialUpdatedAt: ymd(r.LAST_UPDT_DTM),
      syncedAt: file.syncedAt,
    },
  };
}

export function toCatalog(file: I0030File | null): Catalog {
  const excluded = { rawMaterial: 0, exportOnly: 0, renamed: 0 };
  if (!file) {
    return { meta: { datasetName: "", sourceUrl: "", scope: "empty", syncedAt: null, total: 0, excluded }, products: [] };
  }
  const products: Product[] = [];
  for (const r of file.rows) {
    const why = exclusionReason(r);
    if (why) excluded[why]++;
    else if (r.PRDLST_REPORT_NO && r.PRDLST_NM) products.push(toProduct(r, file));
  }
  products.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return {
    meta: { datasetName: file.source, sourceUrl: file.sourceUrl, scope: file.scope, syncedAt: file.syncedAt, total: products.length, excluded },
    products,
  };
}
