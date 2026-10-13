import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  description?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col border border-slate-200 animate-in fade-in zoom-in duration-100">
        <div className="p-6">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-600 mb-2">
            정말로 <strong className="text-slate-900 font-semibold">"{itemName}"</strong> 을(를) 삭제하시겠습니까?
          </p>
          <p className="text-xs text-slate-400">
            {description || '삭제된 데이터는 복구할 수 없습니다. 계속 진행하시겠습니까?'}
          </p>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              id="btn-confirm-delete"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>삭제 확인</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
