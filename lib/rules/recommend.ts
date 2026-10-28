// 추천 규칙: 답변 → 보여 줄 기능성 분야·원료와 그 이유. 안전 판단은 safety.ts가 따로 한다.
// 근거는 둘뿐이다. ① 사용자가 직접 고른 관심 분야 ② 식습관 답변과 원료의 일반적인 식품 공급원 정보.
import type { ProductSummary as Product } from "../types.ts";
import type { Answers } from "../questions.ts";
import { areaLabel } from "../areas.ts";

export interface Lead {
  key: string;
  kind: "area" | "ingredient";
  label: string;
  basis: "interest" | "diet";
  reason: string;
  match: (p: Product) => boolean;
}

const DIET_LEADS: Record<string, { label: string; match: RegExp; reason: string }> = {
  fish: {
    label: "EPA·DHA 원료",
    match: /EPA|DHA|오메가/i,
    reason: "생선을 거의 먹지 않는다고 답하셨어요. EPA와 DHA는 주로 등푸른 생선에 들어 있는 지방산이라, 이를 원료로 쓴 제품 정보를 함께 보여 드려요.",
  },
  dairy: {
    label: "칼슘 원료",
    match: /칼슘/,
    reason: "우유·유제품을 거의 먹지 않는다고 답하셨어요. 우유와 유제품은 칼슘이 많은 대표 식품이라, 칼슘을 원료로 쓴 제품 정보를 함께 보여 드려요.",
  },
  veg: {
    label: "비타민 C 원료",
    match: /비타민\s?C/i,
    reason: "채소·과일을 거의 먹지 않는다고 답하셨어요. 비타민 C는 주로 채소와 과일에 들어 있어서, 이를 원료로 쓴 제품 정보를 함께 보여 드려요.",
  },
  sun: {
    label: "비타민 D 원료",
    match: /비타민\s?D/i,
    reason: "햇빛을 받는 시간이 짧다고 답하셨어요. 비타민 D는 햇빛을 받으면 피부에서도 만들어지는 영양소라, 이를 원료로 쓴 제품 정보를 함께 보여 드려요.",
  },
};

export function leadsFrom(a: Answers): Lead[] {
  const leads: Lead[] = (a.interests ?? []).map((id) => ({
    key: `area:${id}`,
    kind: "area",
    label: areaLabel(id),
    basis: "interest",
    reason: `'${areaLabel(id)}' 분야가 궁금하다고 고르셨어요. 주된 기능성 원문에 이 분야의 표현이 있는 제품을 모았어요.`,
    match: (p) => p.areas.includes(id),
  }));
  const diet = [...(a.rarelyEat ?? []).filter((v) => v !== "none"), ...(a.sunlight?.[0] === "low" ? ["sun"] : [])];
  for (const d of diet) {
    const l = DIET_LEADS[d];
    if (l) leads.push({ key: `ing:${d}`, kind: "ingredient", label: l.label, basis: "diet", reason: l.reason, match: (p) => p.functionalIngredients.some((i) => l.match.test(i)) });
  }
  return leads;
}

/** 근거로 쓸 수 있는 제품만 남긴다: 주된 기능성 원문이 없으면 추천 근거가 될 수 없다. */
export const eligibleForLead = (p: Product) => p.hasFunctionality && p.discontinued !== true;

export function profileSummary(a: Answers): string[] {
  const lines: string[] = [];
  const meals = { regular: "끼니는 대체로 챙겨 드시는 편이에요.", skip: "한두 끼를 자주 거르시는 편이에요.", irregular: "식사 시간과 양이 일정하지 않은 편이에요." }[a.meals?.[0] ?? ""];
  if (meals) lines.push(meals);
  const rare = (a.rarelyEat ?? []).filter((v) => v !== "none").map((v) => ({ fish: "생선", dairy: "우유·유제품", veg: "채소·과일" })[v]).filter(Boolean);
  if (rare.length) lines.push(`거의 드시지 않는 식품군: ${rare.join(", ")}`);
  else if (a.rarelyEat?.includes("none")) lines.push("거의 안 먹는 식품군은 없다고 답하셨어요.");
  const sun = { low: "낮에 밖에 있는 시간이 짧은 편이에요.", mid: "낮에 30분 안팎은 밖에 계세요.", high: "낮에 밖에 있는 시간이 긴 편이에요." }[a.sunlight?.[0] ?? ""];
  if (sun) lines.push(sun);
  if (a.interests?.length) lines.push(`관심 분야: ${a.interests.map(areaLabel).join(", ")}`);
  return lines;
}
