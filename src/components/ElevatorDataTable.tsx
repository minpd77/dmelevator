import React, { useState, useMemo, useEffect } from 'react';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Calendar,
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  X,
  Sparkles
} from 'lucide-react';
import { ElevatorRecord } from '../types';
import { SPREADSHEET_ID, normalizeDateTime } from '../services/sheetsService';
import { ElevatorDetailModal } from './ElevatorDetailModal';
import { 
  cleanAreaName, 
  getAreaBadgeClass, 
  scoreElevatorRecord, 
  stripWhitespace,
  parseConditionLines 
} from '../utils/elevatorUtils';

interface ElevatorDataTableProps {
  records: ElevatorRecord[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  onRefresh: () => void;
  onBack?: () => void;
  initialSearchQuery?: string;
  initialSelectedRecord?: ElevatorRecord | null;
}

// Remove duplicated parseConditionLines since imported from elevatorUtils

export const ElevatorDataTable: React.FC<ElevatorDataTableProps> = ({
  records,
  isLoading,
  error,
  lastUpdated,
  onRefresh,
  onBack,
  initialSearchQuery = '',
  initialSelectedRecord = null,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [selectedArea, setSelectedArea] = useState<'ALL' | '강남' | '강북' | '경기'>('ALL');
  const [selectedInspectionType, setSelectedInspectionType] = useState<string>('ALL');
  // Sort options: relevance (priority), inspection date/time, deadline, or original
  const [sortOrder, setSortOrder] = useState<
    'RELEVANCE' | 'DEADLINE_ASC' | 'DEADLINE_DESC' | 'INSPECTION_ASC' | 'INSPECTION_DESC' | 'ORIGINAL'
  >(initialSearchQuery ? 'RELEVANCE' : 'INSPECTION_ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState<ElevatorRecord | null>(initialSelectedRecord);

  // Sync when initial search query changes from outside (e.g., global search)
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchTerm(initialSearchQuery);
      if (initialSearchQuery.trim()) {
        setSortOrder('RELEVANCE');
      }
      setCurrentPage(1);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialSelectedRecord !== undefined) {
      setSelectedRecord(initialSelectedRecord);
    }
  }, [initialSelectedRecord]);
  // Track expanded condition remarks for each row
  const [expandedRemarks, setExpandedRemarks] = useState<Record<string, boolean>>({});

  const toggleExpandRemarks = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRemarks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Area counts
  const areaCounts = useMemo(() => {
    let gangnam = 0;
    let gangbuk = 0;
    let gyeonggi = 0;
    records.forEach((r) => {
      const a = String(r?.area || '');
      if (a.includes('강남')) gangnam++;
      else if (a.includes('강북')) gangbuk++;
      else if (a.includes('경기')) gyeonggi++;
    });
    return {
      all: records.length,
      gangnam,
      gangbuk,
      gyeonggi,
    };
  }, [records]);

  // Unique inspection types list
  const inspectionTypes = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const t = String(r?.inspectionType || '').trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort();
  }, [records]);

  // Count records with deadline
  const deadlineCount = useMemo(() => {
    return records.filter((r) => Boolean(r?.deadlineDate && String(r.deadlineDate).trim())).length;
  }, [records]);

  // Count records with inspection date
  const inspectionDateCount = useMemo(() => {
    return records.filter((r) => Boolean(r?.inspectionDate && String(r.inspectionDate).trim())).length;
  }, [records]);

  // Helper to remove all whitespace and lowercase for space-insensitive search
  const stripWhitespace = (str: string | undefined | null): string => {
    return String(str || '').replace(/\s+/g, '').toLowerCase();
  };

  // Helper to check if record has inspection date and time (e.g. "2026-09-15 14:00" or from calendar schedule)
  const hasInspectionTime = (recOrStr: ElevatorRecord | string | undefined | null): boolean => {
    if (!recOrStr) return false;
    if (typeof recOrStr === 'object') {
      if (recOrStr.inspectionScheduledDateTime && String(recOrStr.inspectionScheduledDateTime).trim()) {
        return true;
      }
      return hasInspectionTime(recOrStr.inspectionDate);
    }
    const trimmed = String(recOrStr).trim();
    if (!trimmed) return false;
    // Check for presence of time pattern like HH:mm (e.g., 14:00, 9:30, 09:30)
    return /\b\d{1,2}:\d{2}\b/.test(trimmed);
  };

  // Helper to get normalized comparable key for inspection datetime (canonical "YYYY-MM-DD HH:mm")
  const getInspectionSortKey = (rec: ElevatorRecord): string => {
    const raw = rec.inspectionScheduledDateTime || rec.inspectionDate || '';
    if (!raw.trim()) return '9999-99-99 99:99';
    return normalizeDateTime(raw);
  };

  // Count records with inspection date & time
  const scheduledTimeCount = useMemo(() => {
    return records.filter((r) => hasInspectionTime(r)).length;
  }, [records]);

  // Filter and sort logic
  const filteredAndSortedRecords = useMemo(() => {
    // 1. Filter by area & inspection type
    let filtered = records.filter((rec) => {
      if (!rec) return false;
      const recArea = String(rec.area || '');

      if (selectedArea !== 'ALL') {
        if (!recArea.includes(selectedArea)) {
          return false;
        }
      }

      // Filter by inspection type (정기, 정밀, 수시 등)
      if (selectedInspectionType !== 'ALL') {
        const recType = String(rec.inspectionType || '').trim();
        if (recType !== selectedInspectionType) {
          return false;
        }
      }

      // Keyword search (1순위 현장명, 2순위 승강기번호, 3순위 구역, 4순위 모델명, 5순위 주소 등 띄어쓰기 무시)
      if (!searchTerm.trim()) return true;
      return scoreElevatorRecord(rec, searchTerm) > 0;
    });

    // 2. Sort and filter logic
    if (sortOrder === 'RELEVANCE' || (searchTerm.trim() && sortOrder === 'ORIGINAL')) {
      return [...filtered].sort((a, b) => {
        const sA = scoreElevatorRecord(a, searchTerm);
        const sB = scoreElevatorRecord(b, searchTerm);
        if (sB !== sA) return sB - sA;
        return (a.siteName || '').localeCompare(b.siteName || '');
      });
    } else if (sortOrder === 'DEADLINE_ASC') {
      return [...filtered].sort((a, b) => {
        const hasA = Boolean(a.deadlineDate && a.deadlineDate.trim());
        const hasB = Boolean(b.deadlineDate && b.deadlineDate.trim());
        if (hasA && hasB) {
          return a.deadlineDate.localeCompare(b.deadlineDate);
        }
        if (hasA) return -1;
        if (hasB) return 1;
        return 0;
      });
    } else if (sortOrder === 'DEADLINE_DESC') {
      return [...filtered].sort((a, b) => {
        const hasA = Boolean(a.deadlineDate && a.deadlineDate.trim());
        const hasB = Boolean(b.deadlineDate && b.deadlineDate.trim());
        if (hasA && hasB) {
          return b.deadlineDate.localeCompare(a.deadlineDate);
        }
        if (hasA) return -1;
        if (hasB) return 1;
        return 0;
      });
    } else if (sortOrder === 'INSPECTION_ASC') {
      // "검사일시/구분 필터 누르면 빠른순인데 날짜만 있는건 제외하고 시간이 같이 있는것만 빠른순으로"
      // Only keep records where inspectionDate has both date and time (ex: "2026-09-15 14:00")
      const withTimeOnly = filtered.filter((r) => hasInspectionTime(r));
      return withTimeOnly.sort((a, b) => {
        const keyA = getInspectionSortKey(a);
        const keyB = getInspectionSortKey(b);
        return keyA.localeCompare(keyB);
      });
    } else if (sortOrder === 'INSPECTION_DESC') {
      const withTimeOnly = filtered.filter((r) => hasInspectionTime(r));
      return withTimeOnly.sort((a, b) => {
        const keyA = getInspectionSortKey(a);
        const keyB = getInspectionSortKey(b);
        return keyB.localeCompare(keyA);
      });
    }

    return filtered;
  }, [records, searchTerm, selectedArea, selectedInspectionType, sortOrder]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  // Reset to page 1 on filter/sort change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedArea, selectedInspectionType, sortOrder, pageSize]);

  // Toggle deadline sort
  const toggleDeadlineSort = () => {
    if (sortOrder === 'DEADLINE_ASC') {
      setSortOrder('DEADLINE_DESC');
    } else if (sortOrder === 'DEADLINE_DESC') {
      setSortOrder('ORIGINAL');
    } else {
      setSortOrder('DEADLINE_ASC');
    }
  };

  // Toggle inspection date/time sort
  const toggleInspectionSort = () => {
    if (sortOrder === 'INSPECTION_ASC') {
      setSortOrder('INSPECTION_DESC');
    } else if (sortOrder === 'INSPECTION_DESC') {
      setSortOrder('ORIGINAL');
    } else {
      setSortOrder('INSPECTION_ASC');
    }
  };

  return (
    <section 
      id="elevator-db-section" 
      className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden scroll-mt-20 transition-all duration-300"
    >
      {/* Section Header */}
      <div className="px-4 sm:px-6 py-4 bg-slate-900/95 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                현장 검사조건부 조회
              </h2>
              {/* 실시간 연동, 검사일정, 마감일 뱃지 */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                실시간 연동
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                검사일정 {scheduledTimeCount}개
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                마감일 {deadlineCount}개
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                총 {records.length.toLocaleString()}개 현장
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-stretch lg:self-auto justify-between sm:justify-end">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400 hidden xl:inline">
              최근 갱신: {new Date(lastUpdated).toLocaleTimeString('ko-KR')}
            </span>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 transition-colors disabled:opacity-50"
            title="스프레드시트 최신 데이터 다시 가져오기"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? '불러오는 중...' : '새로고침'}</span>
          </button>
        </div>
      </div>

      {/* Search & Area Filter Bar */}
      <div className="p-4 sm:p-5 bg-slate-900/60 border-b border-slate-800 space-y-3">
        {/* Search Row */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTerm(val);
                if (val.trim()) {
                  setSortOrder('RELEVANCE');
                }
              }}
              placeholder="현장명, 승강기번호(7자리), 구역(강남/강북/경기), 모델명 통합검색 (띄어쓰기 무관)..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort & PageSize Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* 검색 우선순위순 정렬 버튼 (검색어 있을 때) */}
            {searchTerm.trim() && (
              <button
                onClick={() => setSortOrder('RELEVANCE')}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  sortOrder === 'RELEVANCE'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                title="1순위 현장명 · 2순위 번호 · 3순위 구역 · 4순위 모델 순위 정렬"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>우선순위순</span>
              </button>
            )}

            {/* 검사일시 정렬 버튼 */}
            <button
              onClick={toggleInspectionSort}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                sortOrder === 'INSPECTION_ASC'
                  ? 'bg-blue-950/90 text-blue-300 border-blue-600/80 shadow-xs'
                  : sortOrder === 'INSPECTION_DESC'
                  ? 'bg-blue-950/50 text-blue-400 border-blue-800'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
              title="검사일시 정렬 전환 (시간포함된 빠른순 / 늦은순 / 기본)"
            >
              {sortOrder === 'INSPECTION_ASC' ? (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>검사일시 빠른순</span>
                </>
              ) : sortOrder === 'INSPECTION_DESC' ? (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                  <span>검사일시 늦은순</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>검사일시순</span>
                </>
              )}
            </button>

            {/* 마감날짜 정렬 버튼 */}
            <button
              onClick={toggleDeadlineSort}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                sortOrder === 'DEADLINE_ASC'
                  ? 'bg-amber-950/90 text-amber-300 border-amber-700/80'
                  : sortOrder === 'DEADLINE_DESC'
                  ? 'bg-amber-950/50 text-amber-400 border-amber-800'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
              title="마감 날짜 정렬 전환"
            >
              {sortOrder === 'DEADLINE_ASC' ? (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>마감일 빠른순</span>
                </>
              ) : sortOrder === 'DEADLINE_DESC' ? (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>마감일 늦은순</span>
                </>
              ) : (
                <>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>마감일순</span>
                </>
              )}
            </button>

            {/* 검사구분 필터 드롭다운 */}
            {inspectionTypes.length > 0 && (
              <select
                value={selectedInspectionType}
                onChange={(e) => setSelectedInspectionType(e.target.value)}
                className={`px-3 py-2.5 bg-slate-950 border text-xs font-medium rounded-xl focus:border-blue-500 focus:outline-none transition-colors ${
                  selectedInspectionType !== 'ALL'
                    ? 'border-blue-500 text-blue-300 font-bold bg-blue-950/40'
                    : 'border-slate-800 text-slate-300'
                }`}
                title="검사구분 필터"
              >
                <option value="ALL">구분: 전체</option>
                {inspectionTypes.map((type) => (
                  <option key={type} value={type}>
                    구분: {type}
                  </option>
                ))}
              </select>
            )}

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-2.5 bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value={15}>15개씩</option>
              <option value={25}>25개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
            </select>
          </div>
        </div>

        {/* 검색현장명 아래: 전체현장, 강남, 강북, 경기 딱 4개만 표시 (모바일 4분할 최적화) */}
        <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 sm:gap-2 pt-1 text-xs">
          <button
            onClick={() => setSelectedArea('ALL')}
            className={`py-2 px-1 sm:px-4 rounded-xl text-xs font-bold transition-all text-center ${
              selectedArea === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span className="sm:hidden">전체</span>
            <span className="hidden sm:inline">전체현장</span>
            <span className="ml-1 opacity-80 text-[11px]">({areaCounts.all.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setSelectedArea('강남')}
            className={`py-2 px-1 sm:px-4 rounded-xl text-xs font-bold transition-all text-center ${
              selectedArea === '강남'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>강남</span>
            <span className="ml-1 opacity-80 text-[11px]">({areaCounts.gangnam.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setSelectedArea('강북')}
            className={`py-2 px-1 sm:px-4 rounded-xl text-xs font-bold transition-all text-center ${
              selectedArea === '강북'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>강북</span>
            <span className="ml-1 opacity-80 text-[11px]">({areaCounts.gangbuk.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setSelectedArea('경기')}
            className={`py-2 px-1 sm:px-4 rounded-xl text-xs font-bold transition-all text-center ${
              selectedArea === '경기'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span>경기</span>
            <span className="ml-1 opacity-80 text-[11px]">({areaCounts.gyeonggi.toLocaleString()})</span>
          </button>

          {selectedInspectionType !== 'ALL' && (
            <button
              onClick={() => setSelectedInspectionType('ALL')}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-950/80 border border-blue-600 text-blue-300 font-medium text-[11px] hover:bg-blue-900 transition-colors"
              title="검사구분 필터 해제"
            >
              <span>{selectedInspectionType}</span>
              <X className="w-3 h-3 text-blue-400" />
            </button>
          )}

          <span className="col-span-4 sm:col-span-1 sm:ml-auto text-slate-400 text-xs font-medium text-right pt-1 sm:pt-0">
            조회 결과: <strong className="text-blue-400 font-bold">{filteredAndSortedRecords.length.toLocaleString()}</strong>건
            {sortOrder === 'INSPECTION_ASC' && (
              <span className="text-blue-300/90 ml-1.5 inline-block text-[11px] font-semibold">
                (검사일시 빠른순 · 시간 포함)
              </span>
            )}
            {sortOrder === 'INSPECTION_DESC' && (
              <span className="text-blue-300/90 ml-1.5 inline-block text-[11px] font-semibold">
                (검사일시 늦은순 · 시간 포함)
              </span>
            )}
            {sortOrder === 'DEADLINE_ASC' && (
              <span className="text-amber-300/90 ml-1.5 inline-block text-[11px]">
                (마감일 빠른순)
              </span>
            )}
            {sortOrder === 'DEADLINE_DESC' && (
              <span className="text-amber-300/90 ml-1.5 inline-block text-[11px]">
                (마감일 늦은순)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Error State */}
      {error && records.length === 0 && (
        <div className="p-8 text-center bg-rose-950/40 border-b border-rose-900/50">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-rose-200">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && records.length === 0 && (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm font-medium">구글 스프레드시트에서 승강기 DB 데이터를 추출하고 있습니다...</p>
        </div>
      )}

      {/* Records Table (Desktop) & Cards (Mobile) */}
      {!isLoading || records.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold w-[200px]">현장명 / 번호</th>
                  <th className="py-3 px-3 font-semibold w-[160px]">구역 / 주소</th>
                  <th 
                    onClick={toggleInspectionSort}
                    className="py-3 px-3 font-semibold w-[150px] cursor-pointer hover:bg-slate-800/80 transition-colors select-none group"
                    title="클릭하여 검사일시 정렬 전환"
                  >
                    <div className="inline-flex items-center gap-1 text-slate-300 font-semibold group-hover:text-blue-300">
                      <span>검사 일시 / 구분</span>
                      {sortOrder === 'INSPECTION_ASC' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                      ) : sortOrder === 'INSPECTION_DESC' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-blue-300" />
                      )}
                    </div>
                    {(sortOrder === 'INSPECTION_ASC' || sortOrder === 'INSPECTION_DESC') && (
                      <div className="text-[10px] text-blue-400 font-normal">
                        {sortOrder === 'INSPECTION_ASC' ? '빠른순' : '늦은순'}
                      </div>
                    )}
                  </th>
                  <th className="py-3 px-3 font-semibold w-[100px]">검사결과</th>
                  <th className="py-3 px-4 font-semibold min-w-[340px]">조건부 내용</th>
                  <th 
                    onClick={toggleDeadlineSort}
                    className="py-3 px-4 font-semibold w-[140px] text-right cursor-pointer hover:bg-slate-800/80 transition-colors select-none group"
                    title="클릭하여 마감 날짜 정렬 전환"
                  >
                    <div className="inline-flex items-center gap-1 text-amber-300 font-bold justify-end">
                      <span>마감 날짜</span>
                      {sortOrder === 'DEADLINE_ASC' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                      ) : sortOrder === 'DEADLINE_DESC' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {sortOrder === 'DEADLINE_ASC' ? '최신순→먼날짜순' : sortOrder === 'DEADLINE_DESC' ? '먼날짜순' : '기본순'}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((rec) => {
                    const isConditional = rec.inspectionResult.includes('조건부') || rec.conditionRemarks.trim().length > 0;
                    const conditionLines = parseConditionLines(rec.conditionRemarks);
                    const hasDeadline = Boolean(rec.deadlineDate && rec.deadlineDate.trim());
                    const isExpanded = Boolean(expandedRemarks[rec.id]);
                    // Show 1 line by default, or all if expanded
                    const visibleLines = isExpanded ? conditionLines : conditionLines.slice(0, 1);
                    const hasMore = conditionLines.length > 1;

                    return (
                      <tr
                        key={rec.id}
                        onClick={() => setSelectedRecord(rec)}
                        className={`hover:bg-slate-800/50 cursor-pointer transition-colors group ${
                          hasDeadline ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        {/* 1. 현장명 / 번호 */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors text-sm">
                            {rec.siteName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {rec.elevatorNumber && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-300 border border-slate-700">
                                {rec.elevatorNumber}
                              </span>
                            )}
                            {rec.type && (
                              <span className="text-[11px] text-slate-400">
                                {rec.type}
                              </span>
                            )}
                          </div>
                          {rec.model && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[220px]" title={rec.model}>
                              {rec.model}
                            </div>
                          )}
                        </td>

                        {/* 2. 구역 / 주소 */}
                        <td className="py-3.5 px-3 align-top max-w-[160px]">
                          <div className="inline-block">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getAreaBadgeClass(rec.area)}`}>
                              {cleanAreaName(rec.area)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 break-words mt-1 leading-snug" title={rec.address}>
                            {rec.address || '-'}
                          </div>
                        </td>

                        {/* 3. 검사 일시 / 구분 */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          {rec.inspectionDate ? (
                            <div className="space-y-1">
                              <div className="font-bold text-slate-200">
                                <span>{rec.inspectionDate}</span>
                              </div>
                              {rec.inspectionType && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                    rec.inspectionType.includes('정밀')
                                      ? 'bg-rose-950 text-rose-300 border-rose-800 font-bold'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {rec.inspectionType}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* 4. 검사결과 */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          {isConditional ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              {rec.inspectionResult || '조건부'}
                            </span>
                          ) : rec.inspectionResult.includes('합격') ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              합격
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">
                              {rec.inspectionResult || '-'}
                            </span>
                          )}
                        </td>

                        {/* 5. 조건부 내용 (데스크탑: 1개까지 보여주고 그 이상은 조건부 더보기) */}
                        <td className="py-3.5 px-4 align-top">
                          {conditionLines.length > 0 ? (
                            <div className="space-y-1.5 max-w-xl">
                              {/* 1개 기본 표시 (더보기 클릭 시 전체 표시) */}
                              {(isExpanded ? conditionLines : conditionLines.slice(0, 1)).map((line, idx) => (
                                <div 
                                  key={idx} 
                                  className="text-xs text-amber-200/90 leading-relaxed bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-900/50"
                                >
                                  {line}
                                </div>
                              ))}

                              {/* 1개 초과 시 '조건부 더보기 / 접기' 버튼 */}
                              {conditionLines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleExpandRemarks(rec.id, e)}
                                  className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-950/70 hover:bg-amber-900/80 active:bg-amber-900 px-2.5 py-1 rounded-lg border border-amber-800/80 transition-all shadow-2xs cursor-pointer"
                                  title={isExpanded ? "조건부 접기" : "조건부 더보기"}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  {isExpanded ? (
                                    <>
                                      <span>접기</span>
                                      <ChevronUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    </>
                                  ) : (
                                    <>
                                      <span>+{conditionLines.length - 1}개 조건부 더보기</span>
                                      <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </td>

                        {/* 6. 맨 오른쪽: 마감 날짜 (단독 날짜만 표출, 조건부 마감일 문구 제거됨) */}
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          {hasDeadline ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-300 font-mono font-bold text-xs shadow-xs">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>{rec.deadlineDate}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      <div className="space-y-2">
                        <div>조건에 일치하는 현장 데이터가 없습니다.</div>
                        {sortOrder.startsWith('INSPECTION') && (
                          <button
                            type="button"
                            onClick={() => setSortOrder('DEADLINE_ASC')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs border border-slate-700 cursor-pointer"
                          >
                            <span>마감일순으로 전체 현장 보기</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (모바일 최적화) */}
          <div className="block md:hidden divide-y divide-slate-800/80">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((rec) => {
                const isConditional = rec.inspectionResult.includes('조건부') || rec.conditionRemarks.trim().length > 0;
                const conditionLines = parseConditionLines(rec.conditionRemarks);
                const hasDeadline = Boolean(rec.deadlineDate && rec.deadlineDate.trim());
                const isExpanded = Boolean(expandedRemarks[rec.id]);

                return (
                  <div
                    key={rec.id}
                    className={`p-4 transition-colors space-y-3 ${
                      hasDeadline ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    {/* 카드 본문 (터치 시 상세 팝업 열기) */}
                    <div 
                      onClick={() => setSelectedRecord(rec)}
                      className="cursor-pointer space-y-2.5 active:opacity-75 transition-opacity"
                    >
                      {/* Header: Site Name, Elevator No, and Result Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-base leading-snug">
                            {rec.siteName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {rec.elevatorNumber && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-300 border border-slate-700">
                                {rec.elevatorNumber}
                              </span>
                            )}
                            {rec.type && (
                              <span className="text-xs text-slate-400">
                                {rec.type}
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getAreaBadgeClass(rec.area)}`}>
                              {cleanAreaName(rec.area)}
                            </span>
                          </div>
                          {rec.model && (
                            <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                              {rec.model}
                            </div>
                          )}
                        </div>

                        {/* 검사결과 */}
                        {isConditional ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 shrink-0 shadow-2xs">
                            {rec.inspectionResult || '조건부'}
                          </span>
                        ) : rec.inspectionResult.includes('합격') ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0 shadow-2xs">
                            합격
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs shrink-0">
                            {rec.inspectionResult}
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      {rec.address && (
                        <p className="text-xs text-slate-400 leading-normal">
                          {rec.address}
                        </p>
                      )}

                      {/* 검사 일시/구분 & 마감 날짜 Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/90 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px] font-medium">검사 일시 / 구분</span>
                          <span className="text-slate-200 font-bold block mt-0.5">
                            {rec.inspectionDate || '-'}
                          </span>
                          {rec.inspectionType && (
                            <span
                              className={`block text-[11px] mt-0.5 font-semibold ${
                                rec.inspectionType.includes('정밀')
                                  ? 'text-rose-400 font-bold'
                                  : 'text-blue-400'
                              }`}
                            >
                              {rec.inspectionType}
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-amber-400 block text-[10px] font-bold">마감 날짜</span>
                          {hasDeadline ? (
                            <span className="text-amber-300 font-mono font-bold block text-sm mt-0.5">
                              {rec.deadlineDate}
                            </span>
                          ) : (
                            <span className="text-slate-500 block text-xs mt-0.5">-</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 조건부 내용 토글: 기본적으로 '조건부 보기' 버튼만 나오고 터치했을 때 펼쳐짐 */}
                    {conditionLines.length > 0 && (
                      <div className="pt-0.5">
                        {!isExpanded ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandRemarks(rec.id, e);
                            }}
                            className="w-full inline-flex items-center justify-between px-3.5 py-2.5 bg-amber-950/40 hover:bg-amber-950/70 active:bg-amber-900/60 rounded-xl border border-amber-900/70 text-xs font-bold text-amber-300 transition-colors shadow-2xs"
                          >
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>조건부 보기</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-200 text-[11px] font-mono border border-amber-800/80">
                                {conditionLines.length}건
                              </span>
                            </span>
                            <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                          </button>
                        ) : (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="space-y-2 bg-amber-950/30 p-3 rounded-xl border border-amber-900/60 animate-in fade-in duration-150"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>조건부 내용 ({conditionLines.length}건)</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandRemarks(rec.id, e);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-950/90 px-2.5 py-1 rounded-lg border border-amber-800 transition-colors"
                              >
                                <span>접기</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {conditionLines.map((line, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs text-amber-100/90 leading-relaxed bg-amber-950/70 p-2.5 rounded-lg border border-amber-900/60 font-sans"
                                >
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <div>검색 조건에 일치하는 현장이 없습니다.</div>
                {sortOrder.startsWith('INSPECTION') && (
                  <button
                    type="button"
                    onClick={() => setSortOrder('DEADLINE_ASC')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs border border-slate-700 cursor-pointer"
                  >
                    <span>마감일순으로 전체 현장 보기</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">
                페이지 <strong className="text-white">{currentPage}</strong> / {totalPages}
                <span className="hidden sm:inline text-slate-500 ml-2">
                  (총 {filteredAndSortedRecords.length.toLocaleString()}건)
                </span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition-colors"
                  title="이전 페이지"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 text-slate-300 font-medium">
                  {((currentPage - 1) * pageSize + 1).toLocaleString()} - {Math.min(currentPage * pageSize, filteredAndSortedRecords.length).toLocaleString()}건
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition-colors"
                  title="다음 페이지"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Detailed Modal Popup */}
      <ElevatorDetailModal 
        record={selectedRecord} 
        onClose={() => setSelectedRecord(null)} 
      />
    </section>
  );
};
