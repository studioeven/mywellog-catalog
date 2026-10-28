// 문답 정의. 진단으로 읽힐 질문은 넣지 않고, 결과에 실제로 쓰는 항목만 묻는다.
// 수면·활동량은 브리프의 예시였지만 결과에 쓸 근거가 없어 묻지 않는다(최소 수집).

export type QuestionId = "age" | "interests" | "meals" | "rarelyEat" | "sunlight" | "avoid" | "safety";

export interface Option { value: string; label: string; exclusive?: boolean }
export interface Question {
  id: QuestionId;
  title: string;
  help?: string;
  multi: boolean;
  sensitive: boolean; // 민감정보 동의가 있을 때만 묻는다
  options: Option[];
  freeText?: { label: string; placeholder: string }; // 기타 직접 입력
}

export const QUESTIONS: Question[] = [
  {
    id: "age",
    title: "연령대를 알려 주세요",
    help: "생년월일은 받지 않아요. 미성년자용 안내를 보여 줄지 정하는 데만 써요.",
    multi: false,
    sensitive: false,
    options: [
      { value: "u19", label: "19세 미만" },
      { value: "20s", label: "19~29세" },
      { value: "30s", label: "30대" },
      { value: "40s", label: "40대" },
      { value: "50s", label: "50대" },
      { value: "60p", label: "60세 이상" },
    ],
  },
  {
    id: "interests",
    title: "어떤 기능성 분야의 정보가 궁금한가요?",
    help: "여러 개를 고를 수 있어요. 고른 분야의 제품을 먼저 보여 드려요.",
    multi: true,
    sensitive: false,
    options: [
      { value: "eye", label: "눈 건강" },
      { value: "gut", label: "장 건강" },
      { value: "immune", label: "면역 기능" },
      { value: "fatigue", label: "피로 개선" },
      { value: "blood", label: "혈행·혈중 지질" },
      { value: "liver", label: "간 건강" },
      { value: "bone", label: "뼈·관절·근육" },
      { value: "skin", label: "피부 건강" },
      { value: "memory", label: "기억력·인지" },
      { value: "sleep", label: "수면·긴장 완화" },
      { value: "nutrient", label: "비타민·무기질" },
    ],
  },
  {
    id: "meals",
    title: "평소 식사는 어떤 편인가요?",
    multi: false,
    sensitive: false,
    options: [
      { value: "regular", label: "대체로 세 끼를 챙겨요" },
      { value: "skip", label: "한두 끼는 자주 걸러요" },
      { value: "irregular", label: "시간과 양이 들쑥날쑥해요" },
    ],
  },
  {
    id: "rarelyEat",
    title: "거의 먹지 않는 식품군이 있나요?",
    help: "일주일에 한 번도 먹지 않는 편이면 골라 주세요.",
    multi: true,
    sensitive: false,
    options: [
      { value: "fish", label: "생선" },
      { value: "dairy", label: "우유·유제품" },
      { value: "veg", label: "채소·과일" },
      { value: "none", label: "해당 없어요", exclusive: true },
    ],
  },
  {
    id: "sunlight",
    title: "낮에 햇빛을 받으며 밖에 있는 시간은요?",
    multi: false,
    sensitive: false,
    options: [
      { value: "low", label: "하루 10분도 안 돼요" },
      { value: "mid", label: "30분 안팎이에요" },
      { value: "high", label: "1시간 넘게 있어요" },
    ],
  },
  {
    id: "avoid",
    title: "알레르기가 있거나 피하는 원료가 있나요?",
    help: "고른 원료가 원재료명에 보이는 제품은 결과에서 빼 드려요.",
    multi: true,
    sensitive: true,
    options: [
      { value: "milk", label: "우유" },
      { value: "soy", label: "대두" },
      { value: "egg", label: "달걀" },
      { value: "wheat", label: "밀" },
      { value: "fish", label: "생선" },
      { value: "shellfish", label: "새우·게 등 갑각류" },
      { value: "nuts", label: "땅콩·견과류" },
      { value: "gelatin", label: "젤라틴" },
      { value: "none", label: "없어요", exclusive: true },
    ],
    freeText: { label: "다른 원료", placeholder: "예: 프로폴리스, 알로에" },
  },
  {
    id: "safety",
    title: "해당하는 것이 있으면 골라 주세요",
    help: "해당 항목이 있으면 제품보다 전문가 상담 안내를 먼저 보여 드려요. 점수나 등급을 매기지 않아요.",
    multi: true,
    sensitive: true,
    options: [
      { value: "pregnant", label: "임신 중이거나 수유 중이에요" },
      { value: "medication", label: "처방받은 약을 먹고 있어요" },
      { value: "chronic", label: "치료 중인 질환이 있어요" },
      { value: "surgery", label: "수술이나 시술을 앞두고 있어요" },
      { value: "adverse", label: "건강기능식품을 먹고 불편했던 적이 있어요" },
      { value: "none", label: "해당 없어요", exclusive: true },
    ],
  },
];

export type Answers = Partial<Record<QuestionId, string[]>> & { avoidOther?: string };

export const visibleQuestions = (sensitiveConsent: boolean) =>
  QUESTIONS.filter((q) => sensitiveConsent || !q.sensitive);
