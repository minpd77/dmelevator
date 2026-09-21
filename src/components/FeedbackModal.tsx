import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { Site, FeedbackType, Feedback } from '../types';
import { getFeedbackTypeBadge } from '../utils/iconMap';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Site | null;
  onSubmit: (feedbackData: Omit<Feedback, 'id' | 'createdAt'>) => void;
}

const FEEDBACK_TYPES: FeedbackType[] = [
  '오류',
  '수정 요청',
  '기능 추가',
  '개선 의견',
  '좋았던 점',
  '기타',
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  site,
  onSubmit,
}) => {
  const [selectedType, setSelectedType] = useState<FeedbackType>('기능 추가');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !site) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('피드백 내용을 입력해주세요.');
      return;
    }

    onSubmit({
      siteId: site.id,
      siteName: site.name,
      type: selectedType,
      content: content.trim(),
      status: '미처리',
    });

    setContent('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col border border-slate-200 animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">사이트 피드백 등록</h2>
              <p className="text-xs text-slate-500">개선 의견이나 오류를 전달합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Site Info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 block">대상 사이트</span>
              <span className="text-sm font-bold text-slate-800">{site.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700">
              {site.category}
            </span>
          </div>

          {/* Feedback Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              피드백 종류 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FEEDBACK_TYPES.map((type) => {
                const isSelected = selectedType === type;
                const badge = getFeedbackTypeBadge(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-semibold'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Content Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              피드백 내용 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (error) setError('');
              }}
              placeholder="예: 검사일 기준으로 검색 및 엑셀 다운로드할 수 있는 기능을 추가해주세요."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed placeholder-slate-400"
            />
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>

          {/* Tips guidance */}
          <div className="text-[11px] text-slate-500 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>등록된 피드백은 상단의 [피드백 관리] 메뉴에서 미처리, 확인, 작업중, 완료 상태로 직접 관리하실 수 있습니다.</span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>등록</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
