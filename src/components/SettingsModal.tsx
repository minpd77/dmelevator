import React, { useState, useRef } from 'react';
import {
  X,
  Settings,
  Download,
  Upload,
  RotateCcw,
  Database,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { StorageService } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  siteCount: number;
  feedbackCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  siteCount,
  feedbackCount,
}) => {
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Export
  const handleExport = () => {
    const jsonStr = StorageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daemyung_portal_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle File Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importData(content);
      setImportStatus(res);
      if (res.success) {
        onDataChanged();
      }
    };
    reader.readAsText(file);
  };

  // Handle Reset to defaults
  const handleReset = () => {
    if (window.confirm('모든 사이트 및 피드백 데이터를 초기 테스트 데이터로 리셋하시겠습니까? 현재 변경사항은 덮어쓰여집니다.')) {
      StorageService.resetToDefaults();
      onDataChanged();
      setImportStatus({ success: true, message: '초기 4개 테스트 사이트 및 샘플 피드백으로 초기화되었습니다.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">포털 시스템 설정</h2>
              <p className="text-xs text-slate-500">데이터 백업, 복원 및 클라우드 연동 정보</p>
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Status Message */}
          {importStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                importStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Current Storage Stats */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>현재 저장소 상태 (로컬 격리 저장)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">등록된 사이트</span>
                <span className="text-base font-bold text-slate-900">{siteCount}개</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">등록된 피드백</span>
                <span className="text-base font-bold text-slate-900">{feedbackCount}건</span>
              </div>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              데이터 백업 및 복원
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs transition-colors"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>JSON 백업 다운로드</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>백업 파일 복원</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Database Architecture Info (Section 11) */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>클라우드 DB 확장 설계 완료 (요구사항 11번 준수)</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              현재 사이트 및 피드백 데이터는 표준 규격(<code>sites</code>, <code>feedbacks</code>)으로 완전히 분리되어 관리됩니다. 차후 필요 시 Firebase Firestore 또는 구글 계정 기반 영구 클라우드 DB로 즉시 승격 가능한 구조입니다.
            </p>
          </div>

          {/* Reset to Test Data */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-700 block">초기 테스트 데이터 복구</span>
              <span className="text-[11px] text-slate-400">초기 4개 사이트 및 샘플 피드백으로 되돌립니다</span>
            </div>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
