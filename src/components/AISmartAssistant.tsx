import React, { useState } from 'react';
import { Sparkles, X, ArrowRight, Bot, Search, MessageSquare, Check, Terminal } from 'lucide-react';
import { Site, Feedback, SiteCategory } from '../types';

interface AISmartAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  sites: Site[];
  feedbacks: Feedback[];
  onApplyFilter: (category: SiteCategory | '전체', query: string, favoritesOnly?: boolean) => void;
  onOpenFeedbackManager: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const AISmartAssistant: React.FC<AISmartAssistantProps> = ({
  isOpen,
  onClose,
  sites,
  feedbacks,
  onApplyFilter,
  onOpenFeedbackManager,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '안녕하세요! 대명엘리 사이트 AI 도우미입니다.\n\n"검사와 관련된 사이트 찾아줘", "최근 만든 사이트 보여줘", "즐겨찾기 사이트" 등 자연어로 요청하시면 바로 찾아드립니다.',
    },
  ]);

  if (!isOpen) return null;

  const handleProcessQuery = (query: string) => {
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Natural Language intent processor
    setTimeout(() => {
      const q = query.toLowerCase();
      let responseText = '';
      let actionLabel: string | undefined;
      let actionHandler: (() => void) | undefined;

      if (q.includes('검사') || q.includes('조건부') || q.includes('합격')) {
        const matched = sites.filter((s) => s.category === '검사' || s.name.includes('검사') || s.description.includes('검사'));
        responseText = `검사 관련 사이트 ${matched.length}개를 찾았습니다.\n• ${matched.map((s) => s.name).join(', ')}`;
        actionLabel = '검사 카테고리 필터 적용';
        actionHandler = () => {
          onApplyFilter('검사', '');
          onClose();
        };
      } else if (q.includes('고장') || q.includes('에러') || q.includes('긴급')) {
        const matched = sites.filter((s) => s.category === '고장' || s.name.includes('고장'));
        responseText = `고장 및 긴급 조치 관련 사이트 ${matched.length}개를 찾았습니다.\n• ${matched.map((s) => s.name).join(', ')}`;
        actionLabel = '고장 카테고리 보기';
        actionHandler = () => {
          onApplyFilter('고장', '');
          onClose();
        };
      } else if (q.includes('일정') || q.includes('스케줄') || q.includes('달력')) {
        const matched = sites.filter((s) => s.category === '일정' || s.name.includes('일정'));
        responseText = `일정 및 캘린더 관련 사이트 ${matched.length}개를 찾았습니다.\n• ${matched.map((s) => s.name).join(', ')}`;
        actionLabel = '일정 사이트 보기';
        actionHandler = () => {
          onApplyFilter('일정', '');
          onClose();
        };
      } else if (q.includes('db') || q.includes('데이터') || q.includes('현황') || q.includes('마스터')) {
        const matched = sites.filter((s) => s.category === 'DB' || s.name.includes('현황'));
        responseText = `승강기 DB 및 마스터 현황 관련 사이트 ${matched.length}개를 찾았습니다.\n• ${matched.map((s) => s.name).join(', ')}`;
        actionLabel = 'DB 카테고리 보기';
        actionHandler = () => {
          onApplyFilter('DB', '');
          onClose();
        };
      } else if (q.includes('즐겨찾기') || q.includes('자주')) {
        const matched = sites.filter((s) => s.favorite);
        responseText = `현재 즐겨찾기(⭐)로 등록된 사이트 ${matched.length}개를 불러옵니다.\n• ${matched.map((s) => s.name).join(', ')}`;
        actionLabel = '즐겨찾기만 보기 활성화';
        actionHandler = () => {
          onApplyFilter('전체', '', true);
          onClose();
        };
      } else if (q.includes('최근') || q.includes('신규')) {
        const sorted = [...sites].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const top = sorted.slice(0, 3);
        responseText = `최근 등록된 사이트 목록입니다:\n${top.map((s, idx) => `${idx + 1}. ${s.name} (${s.category})`).join('\n')}`;
        actionLabel = '최신 사이트 전체보기';
        actionHandler = () => {
          onApplyFilter('전체', '');
          onClose();
        };
      } else if (q.includes('피드백') || q.includes('오류') || q.includes('요청')) {
        const pending = feedbacks.filter((f) => f.status === '미처리').length;
        responseText = `현재 총 ${feedbacks.length}건의 피드백 중 ${pending}건이 '미처리' 상태입니다. 피드백 관리 창을 열어 확인하실 수 있습니다.`;
        actionLabel = '피드백 관리창 열기';
        actionHandler = () => {
          onClose();
          onOpenFeedbackManager();
        };
      } else {
        // Fallback search
        const matched = sites.filter(
          (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
        );
        if (matched.length > 0) {
          responseText = `"${query}" 검색 결과 ${matched.length}개 사이트를 찾았습니다:\n• ${matched.map((s) => s.name).join(', ')}`;
          actionLabel = '검색 결과 필터링 적용';
          actionHandler = () => {
            onApplyFilter('전체', query);
            onClose();
          };
        } else {
          responseText = `"${query}"와 관련된 사이트를 찾지 못했습니다. 키워드를 변경하시거나 [사이트 추가] 버튼을 눌러 등록해보세요.`;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: responseText,
          actionLabel,
          onAction: actionHandler,
        },
      ]);
    }, 400);
  };

  const samplePrompts = [
    '검사와 관련된 사이트 찾아줘',
    '고장 접수 사이트 보여줘',
    '즐겨찾기한 사이트만 볼래',
    '최근 등록된 사이트 보여줘',
    '미처리 피드백 확인',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-purple-200 overflow-hidden">
        {/* Assistant Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">AI 자연어 사이트 도우미</h2>
              <p className="text-xs text-purple-200">Gemini 연동 지능형 사이트 탐색 & 피드백 분류기</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>

                {m.actionLabel && m.onAction && (
                  <button
                    onClick={m.onAction}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                  >
                    <span>{m.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Sample Prompts */}
        <div className="p-3 bg-white border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">추천 명령어:</span>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p) => (
              <button
                key={p}
                onClick={() => handleProcessQuery(p)}
                className="px-2.5 py-1 text-xs rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessQuery(inputText);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="예: '검사 관련 사이트 찾아줘', '최근 만든 사이트'..."
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
            <button
              type="submit"
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>질문</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
