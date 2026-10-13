import React from 'react';
import {
  Wrench,
  AlertTriangle,
  Calendar,
  Database,
  Briefcase,
  Globe,
  FileText,
  CheckCircle2,
  ClipboardList,
  Layers,
  Cpu,
  Building2,
  Server,
  Folder,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SiteCategory, FeedbackType, FeedbackStatus } from '../types';

export const AVAILABLE_ICONS = [
  { id: 'wrench', label: '렌치/정비', component: Wrench },
  { id: 'alert-triangle', label: '경고/고장', component: AlertTriangle },
  { id: 'calendar', label: '일정/달력', component: Calendar },
  { id: 'database', label: '데이터베이스', component: Database },
  { id: 'building', label: '건물/현장', component: Building2 },
  { id: 'check-circle', label: '점검완료', component: CheckCircle2 },
  { id: 'clipboard', label: '체크리스트', component: ClipboardList },
  { id: 'briefcase', label: '업무', component: Briefcase },
  { id: 'file-text', label: '보고서/문서', component: FileText },
  { id: 'layers', label: '종합/관리', component: Layers },
  { id: 'cpu', label: '제어반/장비', component: Cpu },
  { id: 'server', label: '서버/시스템', component: Server },
  { id: 'shield', label: '안전검사', component: ShieldCheck },
  { id: 'zap', label: '전기/동력', component: Zap },
  { id: 'globe', label: '웹/포털', component: Globe },
];

export function renderSiteIcon(iconId: string, className = 'w-5 h-5'): React.ReactNode {
  // Check if it's an image URL
  if (iconId && (iconId.startsWith('http://') || iconId.startsWith('https://') || iconId.startsWith('data:image'))) {
    return (
      <img
        src={iconId}
        alt="icon"
        className={`${className} object-contain rounded`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Check matched Lucide icon
  const found = AVAILABLE_ICONS.find((i) => i.id === iconId);
  if (found) {
    const IconComp = found.component;
    return <IconComp className={className} />;
  }

  // Fallback defaults based on potential string match or default globe
  switch (iconId) {
    case 'wrench':
    case '검사':
      return <Wrench className={className} />;
    case 'alert-triangle':
    case '고장':
      return <AlertTriangle className={className} />;
    case 'calendar':
    case '일정':
      return <Calendar className={className} />;
    case 'database':
    case 'DB':
      return <Database className={className} />;
    case 'briefcase':
    case '업무':
      return <Briefcase className={className} />;
    default:
      return <Globe className={className} />;
  }
}

export function getCategoryBadgeColor(category: SiteCategory | string): { bg: string; text: string; border: string } {
  switch (category) {
    case '검사':
      return { bg: 'bg-blue-950/70', text: 'text-blue-300', border: 'border-blue-800/80' };
    case '고장':
      return { bg: 'bg-rose-950/70', text: 'text-rose-300', border: 'border-rose-800/80' };
    case '일정':
      return { bg: 'bg-amber-950/70', text: 'text-amber-300', border: 'border-amber-800/80' };
    case 'DB':
      return { bg: 'bg-emerald-950/70', text: 'text-emerald-300', border: 'border-emerald-800/80' };
    case '업무':
      return { bg: 'bg-indigo-950/70', text: 'text-indigo-300', border: 'border-indigo-800/80' };
    case '기타':
    default:
      return { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  }
}

export function getFeedbackTypeBadge(type: FeedbackType): { bg: string; text: string; label: string } {
  switch (type) {
    case '오류':
      return { bg: 'bg-red-100 text-red-700 border border-red-200', text: 'text-red-700', label: '오류' };
    case '수정 요청':
      return { bg: 'bg-orange-100 text-orange-700 border border-orange-200', text: 'text-orange-700', label: '수정 요청' };
    case '기능 추가':
      return { bg: 'bg-blue-100 text-blue-700 border border-blue-200', text: 'text-blue-700', label: '기능 추가' };
    case '개선 의견':
      return { bg: 'bg-purple-100 text-purple-700 border border-purple-200', text: 'text-purple-700', label: '개선 의견' };
    case '좋았던 점':
      return { bg: 'bg-emerald-100 text-emerald-700 border border-emerald-200', text: 'text-emerald-700', label: '좋았던 점' };
    case '기타':
    default:
      return { bg: 'bg-slate-100 text-slate-700 border border-slate-200', text: 'text-slate-700', label: '기타' };
  }
}

export function getFeedbackStatusBadge(status: FeedbackStatus): { bg: string; text: string; dot: string } {
  switch (status) {
    case '미처리':
      return { bg: 'bg-slate-100 text-slate-700 border border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' };
    case '확인':
      return { bg: 'bg-sky-100 text-sky-800 border border-sky-200', text: 'text-sky-800', dot: 'bg-sky-500' };
    case '작업중':
      return { bg: 'bg-amber-100 text-amber-800 border border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' };
    case '완료':
      return { bg: 'bg-emerald-100 text-emerald-800 border border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' };
    default:
      return { bg: 'bg-slate-100 text-slate-700 border border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' };
  }
}
