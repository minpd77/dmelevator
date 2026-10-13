import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Building2, ExternalLink, ArrowRight, Sparkles, MapPin } from 'lucide-react';
import { ElevatorRecord, Site } from '../types';
import { 
  cleanAreaName, 
  getAreaBadgeClass, 
  filterAndRankElevatorRecords,
  stripWhitespace
} from '../utils/elevatorUtils';

interface GlobalSearchProps {
  records: ElevatorRecord[];
  sites: Site[];
  onSearchSubmit: (query: string) => void;
  onSelectRecord: (record: ElevatorRecord) => void;
  onOpenDb?: () => void;
  onOpenCalendar?: () => void;
  onOpenReportForm?: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  records,
  sites,
  onSearchSubmit,
  onSelectRecord,
  onOpenDb,
  onOpenCalendar,
  onOpenReportForm,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut '/' or 'Ctrl+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' && document.activeElement !== inputRef.current) || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter matching sites (4 main boxes)
  const matchedSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return sites.filter((site) => {
      const name = (site.name || '').toLowerCase();
      const cat = (site.category || '').toLowerCase();
      const desc = (site.description || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || desc.includes(q);
    });
  }, [sites, query]);

  // Filter and prioritize matching elevator records (1순위 현장명, 2순위 승강기번호, 3순위 구역, 4순위 모델명 등)
  const matchedRecords = useMemo(() => {
    return filterAndRankElevatorRecords(records, query);
  }, [records, query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      onSearchSubmit(query.trim());
    }
  };

  const handleSelectChip = (chip: string) => {
    setQuery(chip);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleSiteClick = (site: Site) => {
    setIsOpen(false);
    if (site.id === 'site-1' || site.siteUrl.includes('inspection-db')) {
      onOpenDb?.();
    } else if (site.id === 'site-cal' || site.siteUrl.includes('calendar')) {
      onOpenCalendar?.();
    } else if (site.id === 'site-3' || site.siteUrl.includes('report-form')) {
      onOpenReportForm?.();
    } else if (site.siteUrl) {
      window.open(site.siteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const quickChips = ['조건부', '정밀', '강남', '강북', '경기', '크로노스', '정립회관'];

  return (
    <div ref={containerRef} className="relative w-full z-20">
      {/* Search Input Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-4 sm:left-5 text-slate-400 pointer-events-none flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="현장명, 승강기번호(7자리), 구역(강남/강북/경기), 모델명 통합검색 (띄어쓰기 무관)..."
            className="w-full pl-12 sm:pl-14 pr-24 sm:pr-32 py-3.5 sm:py-4 bg-slate-900/95 hover:bg-slate-900 text-white placeholder-slate-400 text-sm sm:text-base font-medium rounded-2xl border border-slate-700/80 hover:border-blue-500/70 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-lg backdrop-blur-md transition-all"
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="입력 내용 지우기"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
            >
              <span>검색</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </button>
          </div>
        </div>
      </form>

      {/* Quick Search Chips (under search bar) */}
      <div className="flex items-center gap-1.5 sm:gap-2 mt-2.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-500 shrink-0 flex items-center gap-1 pl-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="font-semibold text-[11px]">추천 검색:</span>
        </span>
        {quickChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleSelectChip(chip)}
            className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-blue-700 text-[11px] font-medium transition-all cursor-pointer"
          >
            #{chip}
          </button>
        ))}
      </div>

      {/* Search Results Dropdown Panel */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[75vh] flex flex-col">
          {/* Header summary */}
          <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                <strong className="text-blue-400 font-bold">{query}</strong> 검색 결과:{' '}
                <strong className="text-white font-bold">{matchedRecords.length + matchedSites.length}</strong>건
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] border border-blue-800/60">
                우선순위: 1순위 현장명 · 2순위 승강기번호 · 3순위 구역 · 4순위 모델명
              </span>
            </div>
            <span className="text-slate-500 text-[11px]">
              Enter 또는 [전체보기]로 DB 조회
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-800/60 p-2">
            {/* Matched Menu / Sites */}
            {matchedSites.length > 0 && (
              <div className="p-2 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  메뉴 바로가기
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {matchedSites.map((site) => (
                    <div
                      key={site.id}
                      onClick={() => handleSiteClick(site)}
                      className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-blue-950/50 border border-slate-700/70 hover:border-blue-600/60 flex items-center justify-between cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs group-hover:text-blue-300">
                            {site.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {site.category} 바로가기
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matched Elevator Records */}
            {matchedRecords.length > 0 ? (
              <div className="p-2 space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>승강기 현장 검색 ({matchedRecords.length}개)</span>
                  <span className="text-[10px] text-slate-500 font-normal">클릭 시 상세정보 팝업</span>
                </div>

                <div className="space-y-1.5">
                  {matchedRecords.slice(0, 8).map((rec) => {
                    const isPrecision = rec.inspectionType && rec.inspectionType.includes('정밀');
                    const isConditional = rec.inspectionResult.includes('조건부') || rec.conditionRemarks.trim().length > 0;

                    return (
                      <div
                        key={rec.id}
                        onClick={() => {
                          setIsOpen(false);
                          onSelectRecord(rec);
                        }}
                        className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-blue-500/60 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-xs sm:text-sm group-hover:text-blue-400 transition-colors truncate">
                              {rec.siteName}
                            </h4>
                            {rec.elevatorNumber && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[11px] text-slate-300 border border-slate-700">
                                {rec.elevatorNumber}
                              </span>
                            )}
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getAreaBadgeClass(rec.area)}`}>
                              {cleanAreaName(rec.area)}
                            </span>
                            {rec.type && (
                              <span className="text-[11px] text-slate-400">
                                {rec.type}
                              </span>
                            )}
                            {rec.model && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                ({rec.model})
                              </span>
                            )}
                          </div>

                          {rec.address && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{rec.address}</span>
                            </p>
                          )}
                        </div>

                        {/* Right info tags */}
                        <div className="flex items-center gap-2 shrink-0 text-right self-end sm:self-center">
                          {rec.inspectionDate && (
                            <div className="text-[11px] text-slate-300 font-medium">
                              <span className="text-slate-500 mr-1">검사:</span>
                              <span>{rec.inspectionDate}</span>
                              {rec.inspectionType && (
                                <span
                                  className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                    isPrecision
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {rec.inspectionType}
                                </span>
                              )}
                            </div>
                          )}

                          {isConditional ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
                              {rec.inspectionResult || '조건부'}
                            </span>
                          ) : rec.inspectionResult.includes('합격') ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                              합격
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : matchedSites.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Building2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300">검색 조건에 일치하는 현장이 없습니다.</p>
                <p className="text-slate-500 text-[11px] mt-1">현장명, 승강기 7자리 번호, 도로명 주소 등으로 다시 검색해 보세요.</p>
              </div>
            ) : null}
          </div>

          {/* Footer Jump Button */}
          {matchedRecords.length > 0 && (
            <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                총 <strong className="text-blue-400 font-bold">{matchedRecords.length}</strong>개의 현장이 일치합니다.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSearchSubmit(query);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <span>검사조건부에서 전체보기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
