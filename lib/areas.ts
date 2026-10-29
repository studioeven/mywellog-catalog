// 기능성 분야. 분야 이름은 서비스가 붙인 묶음이고, 판단 근거는 언제나 제품의 '주된 기능성' 원문이다.
// shortcut: 원문 키워드 매칭이라 표현이 다르면 놓친다. 전체 데이터가 들어오면 미분류 비율을 보고 키워드를 보강한다.

export interface Area { id: string; label: string; short: string; match: RegExp } // short: 바로가기 칸에 한 줄로 들어가는 이름(5자 이내)

export const AREAS: Area[] = [
  { id: "eye", label: "눈 건강", short: "눈 건강", match: /눈|황반/ },
  { id: "gut", label: "장 건강", short: "장 건강", match: /배변|장 건강|장건강|유익균|유해균|장내/ },
  { id: "immune", label: "면역 기능", short: "면역", match: /면역/ },
  { id: "fatigue", label: "피로 개선", short: "피로", match: /(?<!눈의 )피로(?!도)/ },
  { id: "blood", label: "혈행·혈중 지질", short: "혈행", match: /혈행|혈액흐름|중성지방|중성지질|콜레스테롤/ },
  { id: "liver", label: "간 건강", short: "간 건강", match: /간 건강|간건강|간기능/ },
  { id: "bone", label: "뼈·관절·근육", short: "뼈·관절", match: /뼈|골다공증|관절|연골|근력|근육/ },
  { id: "antioxidant", label: "항산화", short: "항산화", match: /항산화|유해산소/ },
  { id: "skin", label: "피부 건강", short: "피부", match: /피부/ },
  { id: "bodyfat", label: "체지방 감소", short: "체지방", match: /체지방/ },
  { id: "memory", label: "기억력·인지", short: "기억력", match: /기억력|인지/ },
  { id: "sleep", label: "수면·긴장 완화", short: "수면", match: /수면|긴장/ },
  { id: "glucose", label: "혈당", short: "혈당", match: /혈당/ },
  { id: "nutrient", label: "비타민·무기질", short: "비타민", match: /에너지 ?생성|에너지 ?이용|정상적인|필요|형성|유지에 필요/ },
];

export const areaLabel = (id: string) => AREAS.find((a) => a.id === id)?.label ?? id;

export function classifyAreas(functionality: string | null): string[] {
  if (!functionality) return [];
  return AREAS.filter((a) => a.match.test(functionality)).map((a) => a.id);
}
