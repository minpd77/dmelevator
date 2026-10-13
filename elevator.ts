export interface ElevatorRecord {
  siteName: string;            // 현장명
  elevatorNo: string;          // 승강기 번호
  manufacturer: string;        // 제조업체
  model: string;               // 모델명
  type: string;                // 종류
  capacity: string;            // 적재하중
  floors: string;              // 층수
  district: string;            // 구역 (강북, 강남, 경기)
  address: string;             // 주소
  insurance: string;           // 보험사
  inspectionType: string;      // 검사구분 (정기, 정밀, 수시 등)
  inspectionDate: string;      // 검사일
  inspectionResult: string;    // 검사결과 (합격, 조건부, 불합격 등)
  actionDeadline: string;      // 조치만료일
  conditionalItems: string;    // 조건부사항
  checkDate: string;           // 점검일자
  inspector: string;           // 점검정
  assistant: string;           // 점검보조
}

export type FilterStatus = 'ALL' | 'CONDITIONAL' | 'FAILED' | 'PASSED';
export type FilterDistrict = 'ALL' | '강북' | '강남' | '경기';
