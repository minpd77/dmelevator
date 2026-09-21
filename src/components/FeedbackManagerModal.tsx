import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Calendar,
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { Feedback, FeedbackStatus, FeedbackType, Site } from '../types';
import { getFeedbackTypeBadge, getFeedbackStatusBadge } from '../utils/iconMap';

interface FeedbackManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedbacks: Feedback[];
  sites: Site[];
  onUpdateStatus: (id: string, status: FeedbackStatus) => void;
  onDeleteFeedback: (id: string) => void;
}

const STATUS_LIST: FeedbackStatus[] = ['미처리', '확인', '작업중', '완료'];

export const FeedbackManagerModal: React.FC<FeedbackManagerModalProps> = ({
  isOpen,
  onClose,
  feedbacks,
  sites,
  onUpdateStatus,
  onDeleteFeedback,
}) => {
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: feedbacks.length,
      pending: feedbacks.filter((f) => f.status === '미처리').length,
      confirmed: feedbacks.filter((f) => f.status === '확인').length,
      inProgress: feedbacks.filter((f) => f.status === '작업중').length,
      completed: feedbacks.filter((f) => f.status === '완료').length,
    };
  }, [feedbacks]);

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      if (selectedSiteFilter !== 'all' && f.siteId !== selectedSiteFilter) return false;
      if (selectedStatusFilter !== 'all' && f.status !== selectedStatusFilter) return false;
      if (selectedTypeFilter !== 'all' && f.type !== selectedTypeFilter) return false;
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchContent = f.content.toLowerCase().includes(query);
        const matchSite = f.siteName.toLowerCase().includes(query);
        const matchType = f.type.toLowerCase().includes(query);
        if (!matchContent && !matchSite && !matchType) return false;
      }
      return true;
    });
  }, [feedbacks, selectedSiteFilter, selectedStatusFilter, selectedTypeFilter, searchKeyword]);

  // AI Analysis simulation based on Section 13 requirements
  const handleRunAiAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const bugCount = feedbacks.filter((f) => f.type === '오류').length;
      const featCount = feedbacks.filter((f) => f.type === '기능 추가').length;
      const reqCount = feedbacks.filter((f) => f.type === '수정 요청' || f.type === '개선 의견').length;

      const summary = `📊 **AI 피드백 자동 분류 및 분석 보고서**
• **우선 조치 권장 (오류)**: ${bugCount}건 (특히 모바일 사진 업로드 및 현장 데이터 조회 에러 우선 처리 필요)
• **신규 기능 제안**: ${featCount}건 (엑셀 다운로드, 바코드 스캔 바로가기 등 현장 편의성 중심)
• **수정/개선 요청**: ${reqCount}건
• **추천 작업 로드맵**: 미처리 상태의 고장보고 오류를 '확인'으로 전환하고, 검사조건부 조회 엑셀 필터링 작업을 우선 진행하는 것이 효율적입니다.`;

      setAiAnalysisResult(summary);
      setIsAnalyzing(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">통합 피드백 관리 센터</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  총 {stats.total}건
                </span>
              </div>
              <p className="text-xs text-slate-500">
                운영 중인 모든 GitHub Pages 사이트의 개선 요청 및 오류를 일괄 관리합니다
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzing || feedbacks.length === 0}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
              title="피드백 내용 AI 자동 분석 및 우선순위 제안"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{isAnalyzing ? '분석 중...' : 'AI 피드백 분석'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats summary banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-3 bg-white border-b border-slate-200">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">미처리</span>
              <span className="text-lg font-bold text-slate-700">{stats.pending}건</span>
            </div>
            <span className="w-3 h-3 rounded-full bg-slate-400"></span>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-sky-700 font-medium block">확인 완료</span>
              <span className="text-lg font-bold text-sky-800">{stats.confirmed}건</span>
            </div>
            <span className="w-3 h-3 rounded-full bg-sky-500"></span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-700 font-medium block">작업중</span>
              <span className="text-lg font-bold text-amber-800">{stats.inProgress}건</span>
            </div>
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-700 font-medium block">완료</span>
              <span className="text-lg font-bold text-emerald-800">{stats.completed}건</span>
            </div>
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          </div>
        </div>

        {/* AI Analysis Card (Collapsible) */}
        {aiAnalysisResult && (
          <div className="mx-6 mt-3 p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start justify-between">
            <div className="space-y-1 whitespace-pre-line leading-relaxed">
              {aiAnalysisResult}
            </div>
            <button
              onClick={() => setAiAnalysisResult(null)}
              className="text-purple-400 hover:text-purple-700 ml-2 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter controls */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="내용 검색..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Site selector */}
            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">모든 사이트 ({sites.length})</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Status selector */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">모든 상태</option>
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Type selector */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">모든 종류</option>
              <option value="오류">오류</option>
              <option value="수정 요청">수정 요청</option>
              <option value="기능 추가">기능 추가</option>
              <option value="개선 의견">개선 의견</option>
              <option value="좋았던 점">좋았던 점</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div className="text-xs text-slate-500">
            필터 결과: <strong className="text-slate-800">{filteredFeedbacks.length}</strong>건
          </div>
        </div>

        {/* Feedback List Container */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
          {filteredFeedbacks.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-medium">조건에 일치하는 피드백이 없습니다.</p>
              <p className="text-xs text-slate-400">새 피드백을 등록하거나 필터를 초기화해보세요.</p>
            </div>
          ) : (
            filteredFeedbacks.map((fb) => {
              const typeBadge = getFeedbackTypeBadge(fb.type);
              const statusBadge = getFeedbackStatusBadge(fb.status);
              const formattedDate = new Date(fb.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={fb.id}
                  className="py-4 first:pt-0 last:pb-0 hover:bg-slate-50/60 transition-colors rounded-xl px-3 -mx-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{fb.siteName}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeBadge.bg}`}>
                        {typeBadge.label}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Status Changer and Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 hidden sm:inline">처리상태:</span>
                        <select
                          value={fb.status}
                          onChange={(e) => onUpdateStatus(fb.id, e.target.value as FeedbackStatus)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border cursor-pointer transition-all ${statusBadge.bg}`}
                        >
                          {STATUS_LIST.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          if (window.confirm('이 피드백을 삭제하시겠습니까?')) {
                            onDeleteFeedback(fb.id);
                          }
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="피드백 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Feedback Text */}
                  <p className="text-sm text-slate-700 bg-slate-50/90 p-3 rounded-xl border border-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                    {fb.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            상태를 변경하면 브라우저에 즉시 저장되며, 차후 Firebase 연동 시 실시간 동기화됩니다.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
