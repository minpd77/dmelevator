import React from 'react';
import { Calendar, ArrowLeft, Database } from 'lucide-react';

interface HeaderProps {
  currentView?: 'home' | 'inspection-db' | 'calendar' | 'report-form';
  onNavigateHome?: () => void;
  onNavigateDb?: () => void;
  onNavigateCalendar?: () => void;
  onNavigateReportForm?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = 'home',
  onNavigateHome,
  onNavigateDb,
  onNavigateCalendar,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand */}
          <div 
            onClick={onNavigateHome} 
            className="flex items-center gap-3 cursor-pointer select-none group"
            role="button"
            tabIndex={0}
            title="홈으로 가기"
          >
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">
                대명엘리베이터
              </h1>
              {currentView === 'inspection-db' && (
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                  현장 검사조건부 조회
                </span>
              )}
              {currentView === 'calendar' && (
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                  일정 캘린더
                </span>
              )}
              {currentView === 'report-form' && (
                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                  신고 및 보고 양식
                </span>
              )}
            </div>
          </div>

          {/* Action buttons (Top-Right) */}
          <div className="flex items-center gap-2">
            {currentView !== 'home' ? (
              <button
                id="btn-header-back"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl transition-all shadow-md cursor-pointer ring-1 ring-blue-400/30"
                title="메인 홈 화면으로 돌아가기"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>이전 (홈으로)</span>
              </button>
            ) : (
              <>
                {onNavigateCalendar && (
                  <button
                    id="btn-quick-calendar"
                    onClick={onNavigateCalendar}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 hover:text-white rounded-xl border border-slate-700 transition-colors shadow-xs"
                    title="일정 캘린더 페이지로 이동"
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>일정 캘린더</span>
                  </button>
                )}

                {onNavigateDb && (
                  <button
                    id="btn-quick-db"
                    onClick={onNavigateDb}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 hover:text-white rounded-xl border border-slate-700 transition-colors shadow-xs"
                    title="현장 검사조건부 조회 페이지로 이동"
                  >
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">현장 검사조건부</span>
                    <span className="sm:hidden">검사조건부</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
