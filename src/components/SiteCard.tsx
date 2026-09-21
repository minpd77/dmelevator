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
    (Boolean(site.siteUrl) && (site.siteUrl.includes('report-form') || site.siteUrl.includes('dm119')));
  const isInternal = isInspectionDbCard || isCalendarCard || isReportFormCard;

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

  const getBadgeLabel = () => {
    if (isInspectionDbCard) return '실시간 DB';
    if (isCalendarCard) return '실시간 일정';
    if (isReportFormCard) return '보고 양식';
    return site.category;
  };

  return (
    <a
      id={`card-${site.id}`}
      href={getTargetHref()}
      target={isInternal ? '_self' : '_blank'}
      rel={isInternal ? undefined : 'noopener noreferrer'}
      onClick={handleClick}
      className={`group block bg-slate-900/90 hover:bg-slate-900 active:bg-slate-800 border rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden select-none ${
        isInternal ? 'border-blue-800/80 hover:border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-800 hover:border-blue-500/60'
      }`}
    >
      {/* Top row: Icon, Category tag, and Action Arrow */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800/90 group-hover:bg-blue-950/70 flex items-center justify-center text-blue-400 group-hover:text-blue-300 shrink-0 border border-slate-700/70 group-hover:border-blue-600/60 transition-colors shadow-xs">
          {renderSiteIcon(site.icon, 'w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors')}
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${categoryColor.bg} ${categoryColor.text} ${categoryColor.border}`}>
            {getBadgeLabel()}
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-800/60 group-hover:bg-blue-600 flex items-center justify-center text-slate-400 group-hover:text-white transition-all">
            {isInternal ? (
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            ) : (
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Title only (No description, clean and simple) */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
          {site.name}
        </h3>
      </div>
    </a>
  );
};
