import React from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { Site } from '../types';
import { renderSiteIcon, getCategoryBadgeColor } from '../utils/iconMap';

interface SiteCardProps {
  site: Site;
  onOpenDb?: () => void;
  onOpenCalendar?: () => void;
  onOpenReportForm?: () => void;
  onToggleFavorite?: (id: string) => void;
}

export const SiteCard: React.FC<SiteCardProps> = ({
  site,
  onOpenDb,
  onOpenCalendar,
  onOpenReportForm,
}) => {
  const categoryColor = getCategoryBadgeColor(site.category);

  const isInspectionDbCard =
    site.id === 'site-1' ||
    site.name.includes('조건부') ||
    site.name.includes('검사') ||
    (Boolean(site.siteUrl) && site.siteUrl.includes('inspection-db'));

  const isCalendarCard =
    site.id === 'site-cal' ||
    site.name.includes('캘린더') ||
    (Boolean(site.siteUrl) && site.siteUrl.includes('calendar'));

  const isReportFormCard =
    site.id === 'site-3' ||
    site.name.includes('신고') ||
    site.name.includes('보고') ||
    (Boolean(site.siteUrl) &&
      (site.siteUrl.includes('report-form') ||
        site.siteUrl.includes('dm119')));

  const isInternal =
    isInspectionDbCard ||
    isCalendarCard ||
    isReportFormCard;

  /*
   * 기존 DB의 description 값이 비어 있어도
   * 카드에는 기본 설명이 표시되도록 처리합니다.
   */
  const getDescription = () => {
    if (site.description?.trim()) {
      return site.description;
    }

    if (isInspectionDbCard) {
      return '검사 결과와 조건부 내용을 빠르게 조회합니다.';
    }

    if (isCalendarCard) {
      return '검사 및 점검 일정을 한눈에 확인합니다.';
    }

    if (isReportFormCard) {
      return '고장 및 민원 신고·보고 양식을 작성합니다.';
    }

    if (site.id === 'site-2' || site.name.includes('현장지도')) {
      return '현장 위치와 승강기 정보를 지도에서 확인합니다.';
    }

    return '대명엘리베이터 업무 사이트를 이용합니다.';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isInspectionDbCard) {
      e.preventDefault();

      if (onOpenDb) {
        onOpenDb();
      }
    } else if (isCalendarCard) {
      e.preventDefault();

      if (onOpenCalendar) {
        onOpenCalendar();
      }
    } else if (isReportFormCard) {
      e.preventDefault();

      if (onOpenReportForm) {
        onOpenReportForm();
      }
    }
  };

  const getTargetHref = () => {
    if (isInspectionDbCard) return '#inspection-db';
    if (isCalendarCard) return '#calendar';
    if (isReportFormCard) return '#report-form';

    return site.siteUrl;
  };

  return (
    <a
      id={`card-${site.id}`}
      href={getTargetHref()}
      target={isInternal ? '_self' : '_blank'}
      rel={isInternal ? undefined : 'noopener noreferrer'}
      onClick={handleClick}
      className={`group block w-full text-left rounded-2xl border bg-slate-900 hover:bg-slate-800 p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer relative overflow-hidden select-none ${
        isInternal
          ? 'border-slate-800 hover:border-blue-600'
          : 'border-slate-800 hover:border-blue-500/60'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* 아이콘 + 제목 + 설명 */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`
              w-11 h-11
              rounded-xl
              bg-slate-800/90
              group-hover:bg-blue-950/70
              border border-slate-700/70
              group-hover:border-blue-600/60
              flex items-center justify-center
              shrink-0
              transition-colors
            `}
          >
            {renderSiteIcon(
              site.icon,
              `w-6 h-6 ${
                categoryColor.text
              } group-hover:text-blue-300 transition-colors`
            )}
          </div>

          <div className="min-w-0">
            <h3
              className="
                text-lg sm:text-xl
                font-bold
                text-white
                tracking-tight
                group-hover:text-blue-400
                transition-colors
              "
            >
              {site.name}
            </h3>

            <p
              className="
                text-sm
                text-slate-400
                mt-1
                leading-relaxed
              "
            >
              {getDescription()}
            </p>
          </div>
        </div>

        {/* 오른쪽 이동 화살표 */}
        <div
          className="
            w-8 h-8
            rounded-lg
            bg-slate-800/60
            group-hover:bg-blue-600
            flex items-center justify-center
            text-slate-400
            group-hover:text-white
            transition-all
            shrink-0
          "
        >
          {isInternal ? (
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          ) : (
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </div>
      </div>
    </a>
  );
};
