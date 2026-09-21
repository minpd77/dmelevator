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
  siteName: string; // 현장명
  elevatorNumber: string; // 승강기번호 (예: 0000272)
  manufacturer: string; // 제조업체 (현대, OTIS 등)
  model: string; // 모델명
  type: string; // 종류 (승객용, 장애인용 등)
  capacity: string; // 적재하중
  area: string; // 구역 (강북, 강남 등)
  address: string; // 주소
  insurance?: string; // 보험사
  safetyManager?: string; // 안전관리자명
  inspectionType: string; // 검사구분 (정밀, 정기, 수시)
  inspectionDate: string; // 최근 검사일자
  inspectionResult: string; // 검사결과 (조건부, 합격 등)
  conditionCode?: string; // 조건부코드
  conditionDeadline?: string; // 조건부기한
  conditionRemarks: string; // 조건부사항 (지적 내용, 시정 사항)
  maintenanceDate: string; // 자체점검 일자 (예: 2026-09-15)
  maintenanceStartTime: string; // 점검 시작시간 (예: 16:00)
  maintenanceEndTime: string; // 점검 종료시간 (예: 16:22)
  technicianPrimary: string; // 점검정 (담당 기사)
  technicianSecondary: string; // 점검보조 (부 기사)
  deadlineDate: string; // AT열 마감 날짜 (예: 2026-09-25)
}
