// 데이터 모델. 화면에 보이는 모든 값은 공식 원문(official)인지 서비스가 정리한 것(service)인지 구분한다.

export type Provenance = "official" | "service";

export interface Source {
  dataset: "I0030";
  datasetName: string;
  url: string;
  recordId: string; // 품목제조번호
  officialUpdatedAt: string | null; // 원천의 최종수정일자 (YYYY-MM-DD)
  syncedAt: string; // 이 서비스가 받아 온 시각 (ISO)
}

/** 목록·검색·겹침 확인에 쓰는 가벼운 정보. 원격 카탈로그의 목록 인덱스에 들어간다. */
export interface ProductSummary {
  id: string;
  name: string;
  manufacturer: string; // 업소명(제조업소). 판매 브랜드와 다를 수 있다.
  brand: null; // I0030에는 브랜드 필드가 없다. 검토된 품목제조번호→브랜드 표가 생기기 전까지 비워 둔다.
  type: string | null; // 유형(품목유형)
  functionalIngredients: string[]; // 기능성 원재료 (official)
  otherIngredients: string[]; // 기타·캡슐 원재료 (official)
  discontinued: boolean | null; // 생산 종료 여부. 판매 상태가 아니다.
  areas: string[]; // 기능성 분야 (service: 주된 기능성 문구를 키워드로 분류)
  sponsorship: null | { label: string }; // 광고·제휴. 개인화 점수에 쓰지 않는다.
  hasFunctionality: boolean; // 주된 기능성 원문이 있는지. 없으면 추천 근거가 될 수 없다.
  noteFlags: string[]; // 주의사항 원문에 들어 있는 문구 종류 (의약품·임신·어린이 등)
}

/** 상세 화면용 전체 정보. 원격 카탈로그에서는 제품마다 따로 받는다. */
export interface Product extends ProductSummary {
  shape: string | null;
  functionality: string | null; // 주된 기능성 (official, 원문 그대로)
  intake: string | null; // 섭취 방법 (official)
  precautions: string | null; // 섭취 시 주의사항 (official)
  storage: string | null; // 보관 방법 (official)
  standard: string | null; // 기준규격 (official). 함량 표시량이 자유 서술로 들어 있을 수 있다.
  source: Source;
}

export interface CatalogMeta {
  datasetName: string;
  sourceUrl: string;
  scope: "sample" | "full" | "empty";
  syncedAt: string | null;
  total: number;
  excluded: { rawMaterial: number; exportOnly: number; renamed: number };
}

export interface Catalog {
  meta: CatalogMeta;
  products: ProductSummary[]; // 번들 데이터에서는 Product 전체가 들어 있다
}
