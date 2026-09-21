import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ExternalLink, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  CalendarDays, 
  ListFilter, 
  Grid3X3,
  Info,
  ArrowLeft
} from 'lucide-react';

interface CalendarSectionProps {
  calendarUrl: string;
  onBack?: () => void;
}

type CalendarViewMode = 'AGENDA' | 'WEEK' | 'MONTH';

export const CalendarSection: React.FC<CalendarSectionProps> = ({ calendarUrl, onBack }) => {
  // Default to AGENDA (일정 목록) mode as requested by user
  const [viewMode, setViewMode] = useState<CalendarViewMode>('AGENDA');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  // Construct Google Calendar URL with optimized display parameters
  const currentIframeSrc = React.useMemo(() => {
    try {
      const url = new URL(calendarUrl);
      url.searchParams.set('mode', viewMode);
      url.searchParams.set('wkst', '2'); // Start week on Monday (월요일 시작, 월-금 업무일 중심)
      url.searchParams.set('showTitle', '0'); // Hide redundant title inside iframe
      url.searchParams.set('showPrint', '0');
      url.searchParams.set('showTabs', '1');
      url.searchParams.set('showCalendars', '0');
      url.searchParams.set('showTz', '0');
      return url.toString();
    } catch {
      return `${calendarUrl}&mode=${viewMode}&wkst=2&showTitle=0`;
    }
  }, [calendarUrl, viewMode]);

  return (
    <section id="calendar-section" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Calendar Header Bar */}
      <div className="px-4 sm:px-6 py-4 bg-slate-900/95 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                대명엘리베이터 일정 캘린더
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-950 text-purple-300 border border-purple-800/80">
                실시간 연동
              </span>
            </div>
            <p className="text-xs text-slate-400">
              한국승강기안전공단 검사 및 현장 자체점검 스케줄 (KST)
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Action Controls */}
        <div className="flex items-center flex-wrap gap-2 self-stretch lg:self-auto justify-between sm:justify-end">
          {/* View Mode Toggle Segmented Control */}
          <div className="inline-flex p-1 bg-slate-800/90 rounded-xl text-xs font-semibold border border-slate-700/60">
            <button
              onClick={() => setViewMode('AGENDA')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'AGENDA'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="긴 이벤트명도 글자 잘림 없이 전체 목록으로 확인 (기본값)"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>일정 목록</span>
            </button>

            <button
              onClick={() => setViewMode('WEEK')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'WEEK'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="월요일 시작으로 월~금 평일 일정을 넓게 확인"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>주간 보기</span>
            </button>

            <button
              onClick={() => setViewMode('MONTH')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'MONTH'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="한 달 전체 달력 보기"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>월간 보기</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-2xs transition-colors"
              title="캘린더 새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새로고침</span>
            </button>

            <a
              href={currentIframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-800/80 shadow-2xs transition-colors"
              title="구글 캘린더 전체 화면 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">크게 보기</span>
            </a>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isCollapsed ? '캘린더 펼치기' : '캘린더 접기'}
            >
              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Helpful View Tip Banner */}
      {!isCollapsed && (
        <div className="px-4 sm:px-6 py-2 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 font-medium">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              {viewMode === 'AGENDA' && '💡 [일정 목록] 승강기 검사·점검 일정이 긴 제목 그대로 글자 잘림 없이 순서대로 표시됩니다.'}
              {viewMode === 'WEEK' && '💡 [주간 보기] 월요일 시작(월~금)으로 주간 스케줄을 확인합니다.'}
              {viewMode === 'MONTH' && '💡 [월간 보기] 한 달 전체 윤곽을 파악할 수 있습니다.'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            상단 탭으로 전환 가능
          </span>
        </div>
      )}

      {/* Embedded Google Calendar Iframe */}
      {!isCollapsed && (
        <div className="relative w-full bg-slate-950 p-2 sm:p-4">
          <div className="w-full h-[620px] sm:h-[750px] rounded-xl overflow-hidden border border-slate-800 bg-white relative shadow-inner">
            <iframe
              key={`${iframeKey}-${viewMode}`}
              src={currentIframeSrc}
              style={{ border: 0 }}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="auto"
              title="대명엘리베이터 일정 구글 캘린더"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </section>
  );
};
