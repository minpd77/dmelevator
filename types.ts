export type SiteCategory = 
  | '전체'
  | '검사'
  | '고장'
  | '일정'
  | 'DB'
  | '업무'
  | '기타';

export interface Site {
  id: string;
  name: string;
  description: string;
  category: SiteCategory;
  githubUrl?: string;
  siteUrl: string;
  icon: string; // Icon identifier or emoji
  createdAt: string; // ISO date or YYYY-MM-DD
  favorite: boolean;
}

export type FeedbackType = 
  | '오류'
  | '수정 요청'
  | '기능 추가'
  | '개선 의견'
  | '좋았던 점'
  | '기타';

export type FeedbackStatus = 
  | '미처리'
  | '확인'
  | '작업중'
  | '완료';

export interface Feedback {
  id: string;
  siteId: string;
  siteName: string;
  type: FeedbackType;
  content: string;
  status: FeedbackStatus;
  createdAt: string;
  aiSuggestedCategory?: string;
}

export interface StorageData {
  sites: Site[];
  feedbacks: Feedback[];
  version: string;
}

export interface ElevatorRecord {
  id: string;
  siteName: string; // Col A (현장명)
  elevatorNumber: string; // Col B (승강기번호, 예: 0000272)
  // [Col C~H 제외: 제조업체, 모델명, 종류, 적재하중, 층수, 설치일자 기존 컬럼 제외]
  area: string; // Col I (구역: 강남, 강북, 경기)
  infoCenterSiteName?: string; // Col J (정보센터 현장명)
  manufacturer: string; // Col K (제조업체)
  model: string; // Col L (승강기모델)
  capacity: string; // Col M (적재하중)
  speedOrFloors?: string; // Col N (운행구간 / 층수 / 속도)
  installDate?: string; // Col O (설치일자)
  validInspectionDate?: string; // Col P (정기검사 유효기간)
  carDepth?: string; // Col Q (카치수 안길이)
  carWidth?: string; // Col R (카치수 폭)
  doorHeight?: string; // Col S (카출입구치수 높이)
  doorWidth?: string; // Col T (카출입구치수 폭)
  doorTypeOrPassengerCount?: string; // Col U (개폐방식 / 정원)
  type: string; // Col V (승강기종류: 승객용, 장애인용, 비상용 등)
  address: string; // Col W (주소)
  buildingUsage?: string; // Col X (건물용도)
  insurance?: string; // Col Y (보험사)
  insuranceStartDate?: string; // Col Z (보험가입일)
  insuranceEndDate?: string; // Col AA (보험만료일)
  safetyManagerAppointDate?: string; // Col AB (안전관리자 선임일)
  safetyManager?: string; // Col AC (안전관리자명)
  safetyManagerBirth?: string; // Col AD (안전관리자 생년월일)
  trainingDate?: string; // Col AE (직무교육일)
  trainingValidDate?: string; // Col AF (직무교육 유효기간)
  inspectionType: string; // Col AG (검사구분: 정밀, 정기, 수시)
  inspectionDate: string; // Col AH (검사일자)
  inspectionResult: string; // Col AI (검사결과: 합격, 조건부 등)
  conditionCode?: string; // Col AJ (조건부코드)
  conditionDeadline?: string; // Col AK (조건부기한)
  conditionRemarks: string; // Col AL (조건부사항 / 지적내용)
  maintenanceMonth?: string; // Col AM (점검월)
  maintenanceDate: string; // Col AN (자체점검 일자)
  maintenanceStartTime: string; // Col AO (점검 시작시간)
  maintenanceEndTime: string; // Col AP (점검 종료시간)
  nextMaintenanceDate?: string; // Col AQ (다음 점검일)
  technicianPrimary: string; // Col AR (점검정 담당기사)
  technicianSecondary: string; // Col AS (점검보조 부기사)
  deadlineDate: string; // Col AT (마감일)
  
  // Sheet 2 (gid=381852124, 승강기 번호는 X열)
  emergencyEquipment?: string; // Sheet 2 Col Q (비상통화장비)
  emergencyPhone?: string; // Sheet 2 Col AA (비상통화번호)

  inspectionScheduledDateTime?: string; // 점검표TO캘린더 연동 검사일시
}
