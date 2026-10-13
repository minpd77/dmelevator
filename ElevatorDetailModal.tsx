import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { ElevatorRecord } from '../types';
import { cleanAreaName, getAreaBadgeClass, parseConditionLines } from '../utils/elevatorUtils';

interface ElevatorDetailModalProps {
  record: ElevatorRecord | null;
  onClose: () => void;
  onOpenInDb?: (record: ElevatorRecord) => void;
}

export const ElevatorDetailModal: React.FC<ElevatorDetailModalProps> = ({
  record,
  onClose,
  onOpenInDb,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (record) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [record, onClose]);

  if (!record) return null;

  const conditionLines = parseConditionLines(record.conditionRemarks);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {record.siteName}
              </h3>
              {record.elevatorNumber && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-xs border border-slate-700">
                  고유번호: {record.elevatorNumber}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getAreaBadgeClass(record.area)}`}>
                {cleanAreaName(record.area)}
              </span>
              {record.model && (
                <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono text-xs border border-slate-700">
                  {record.model}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {record.address || '주소 정보 없음'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="닫기 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs sm:text-sm">
          {/* Inspection and Deadline Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block">
                검사 일시 / 구분 및 결과
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">검사일자:</span>
                <strong className="text-white font-bold">{record.inspectionDate || '-'}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">검사구분:</span>
                <strong className={record.inspectionType?.includes('정밀') ? 'text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800' : 'text-white'}>
                  {record.inspectionType || '-'}
                </strong>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">결과:</span>
                <strong className={record.inspectionResult.includes('조건부') ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {record.inspectionResult || '-'}
                </strong>
              </div>
            </div>

            <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-900/60 space-y-1.5">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                마감 날짜
              </span>
              <div className="text-amber-300 font-mono font-bold text-base">
                {record.deadlineDate || '지정된 마감날짜 없음'}
              </div>
              {record.conditionDeadline && (
                <div className="text-xs text-amber-400/80">
                  기한: {record.conditionDeadline}
                </div>
              )}
            </div>
          </div>

          {/* Condition Remarks */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>조건부 내용 (지적 사항 전체)</span>
            </div>

            {conditionLines.length > 0 ? (
              <div className="space-y-2 bg-amber-950/20 p-3 rounded-xl border border-amber-900/40">
                {conditionLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="text-amber-100/90 leading-relaxed bg-amber-950/60 p-2.5 rounded-lg border border-amber-900/40 text-xs sm:text-sm font-sans"
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>등록된 조건부 지적사항이 없거나 조치 완료된 현장입니다.</span>
              </div>
            )}
          </div>

          {/* Specs Details */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h5 className="font-bold text-slate-300 text-xs uppercase tracking-wider">
              승강기 제원 정보
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">제조업체 / 모델</span>
                <span className="text-slate-200 font-medium">
                  {record.manufacturer || '-'} {record.model ? `(${record.model})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">용도 / 적재하중</span>
                <span className="text-slate-200 font-medium">
                  {record.type || '-'} / {record.capacity || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">보험사</span>
                <span className="text-slate-200 font-medium">
                  {record.insurance || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">안전관리자</span>
                <span className="text-slate-200 font-medium">
                  {record.safetyManager || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          {onOpenInDb ? (
            <button
              onClick={() => {
                onOpenInDb(record);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <span>현장 검사조건부에서 조회</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
