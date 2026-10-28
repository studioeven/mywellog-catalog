// 안전 규칙. 추천 규칙과 분리되어 있고, 결과 화면은 이 판단을 먼저 적용한다.
// 원칙: 상호작용·적합성을 판정하지 않는다. 공식 원문의 주의 문구를 찾아 보여 주고, 전문가 상담을 먼저 안내한다.
import type { Product, ProductSummary } from "../types.ts";
import type { Answers } from "../questions.ts";

export type SafetyFlag = "pregnant" | "medication" | "chronic" | "surgery" | "adverse" | "minor";

export const FLAG_LABEL: Record<SafetyFlag, string> = {
  pregnant: "임신·수유 중",
  medication: "처방약 복용 중",
  chronic: "치료 중인 질환",
  surgery: "수술·시술 예정",
  adverse: "이상 경험",
  minor: "19세 미만",
};

export function safetyFlags(a: Answers): SafetyFlag[] {
  const flags = (a.safety ?? []).filter((v): v is SafetyFlag => v in FLAG_LABEL);
  if (a.age?.[0] === "u19") flags.push("minor");
  return flags;
}

/** 하나라도 있으면 결과 화면은 제품 제안 대신 상담 안내를 먼저 보여 준다. */
export const consultFirst = (flags: SafetyFlag[]) => flags.length > 0;

// shortcut: 원재료명 문구 매칭이라 '유청단백'처럼 표기가 다르면 놓칠 수 있다. 실제 알레르기 표시는 라벨로 확인하도록 안내한다.
export const ALLERGENS: Record<string, RegExp> = {
  milk: /우유|유청|카제인|유당|분유|탈지유|버터|치즈|요구르트|락토페린/,
  soy: /대두|두유|레시틴|콩/,
  egg: /달걀|계란|난황|난백|전란/,
  wheat: /밀가루|소맥|글루텐|밀\s?전분|밀배아/,
  fish: /어유|생선|어류|연어|참치|멸치|정어리|명태|피쉬|fish/i,
  shellfish: /갑각|새우|크릴|게살|꽃게|키토산|글루코사민/,
  nuts: /땅콩|호두|아몬드|잣|캐슈|헤이즐넛|피칸|마카다미아|견과/,
  gelatin: /젤라틴|돈피|우피/,
};

export interface AllergenHit { term: string; ingredient: string }

export function allergenHits(p: ProductSummary, a: Answers): AllergenHit[] {
  const patterns: [string, RegExp][] = (a.avoid ?? []).filter((v) => ALLERGENS[v]).map((v) => [v, ALLERGENS[v]]);
  for (const t of (a.avoidOther ?? "").split(/[,，\s]+/).filter((s) => s.length >= 2)) {
    patterns.push([t, new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")]);
  }
  const hits: AllergenHit[] = [];
  for (const ing of [...p.functionalIngredients, ...p.otherIngredients]) {
    for (const [term, re] of patterns) if (re.test(ing)) hits.push({ term, ingredient: ing });
  }
  return hits;
}

export const NOTE_PATTERNS: Partial<Record<SafetyFlag, RegExp>> = {
  pregnant: /임산부|임신|수유/,
  medication: /의약품|약물|복용/,
  chronic: /질환|질병/,
  surgery: /수술/,
  minor: /어린이|영유아|청소년|미성년/,
};

/** 사용자의 안전 항목과 관련된 공식 주의사항 문장을 그대로 뽑아 준다. 판단은 하지 않는다. */
export function relevantPrecautions(p: Product, flags: SafetyFlag[]): string[] {
  if (!p.precautions) return [];
  const lines = p.precautions.split(/\n|(?<=\.)\s+(?=[①-⑳⑴-⒇\d])/).map((l) => l.trim()).filter(Boolean);
  return lines.filter((l) => flags.some((f) => NOTE_PATTERNS[f]?.test(l)));
}
