import React, { useState, useEffect } from 'react';
import { X, Globe, Github, Tag, FileText, Check, Star } from 'lucide-react';
import { Site, SiteCategory } from '../types';
import { AVAILABLE_ICONS, renderSiteIcon } from '../utils/iconMap';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (siteData: Omit<Site, 'id' | 'createdAt'>, existingId?: string) => void;
  editingSite?: Site | null;
}

const CATEGORY_OPTIONS: SiteCategory[] = ['검사', '고장', '일정', 'DB', '업무', '기타'];

export const SiteModal: React.FC<SiteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSite,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SiteCategory>('검사');
  const [githubUrl, setGithubUrl] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('wrench');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [isCustomIcon, setIsCustomIcon] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingSite) {
      setName(editingSite.name);
      setDescription(editingSite.description);
      setCategory(editingSite.category);
      setGithubUrl(editingSite.githubUrl || '');
      setSiteUrl(editingSite.siteUrl);
      setFavorite(editingSite.favorite);

      if (editingSite.icon.startsWith('http://') || editingSite.icon.startsWith('https://')) {
        setIsCustomIcon(true);
        setCustomIconUrl(editingSite.icon);
        setSelectedIcon('wrench');
      } else {
        setIsCustomIcon(false);
        setSelectedIcon(editingSite.icon || 'wrench');
      }
    } else {
      // Default reset for new site
      setName('');
      setDescription('');
      setCategory('검사');
      setGithubUrl('');
      setSiteUrl('https://');
      setSelectedIcon('wrench');
      setCustomIconUrl('');
      setIsCustomIcon(false);
      setFavorite(false);
    }
    setErrors({});
  }, [editingSite, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '사이트 이름을 입력해주세요.';
    if (!description.trim()) errs.description = '사이트 설명을 간단히 입력해주세요.';
    if (githubUrl.trim() && !githubUrl.startsWith('http://') && !githubUrl.startsWith('https://')) {
      errs.githubUrl = '올바른 URL 형식(https://)을 입력해주세요.';
    }
    if (!siteUrl.trim()) {
      errs.siteUrl = '실제 운영 사이트 URL을 입력해주세요.';
    } else if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      errs.siteUrl = '올바른 URL 형식(https://)을 입력해주세요.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalIcon = isCustomIcon && customIconUrl.trim() ? customIconUrl.trim() : selectedIcon;

    onSave(
      {
        name: name.trim(),
        description: description.trim(),
        category,
        githubUrl: githubUrl.trim(),
        siteUrl: siteUrl.trim(),
        icon: finalIcon,
        favorite,
      },
      editingSite ? editingSite.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col my-8 border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {editingSite ? '✏️' : '➕'}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingSite ? '사이트 정보 수정' : '새 사이트 추가'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {/* Site Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              사이트 이름 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 검사조건부 조회, 승강기 에러코드 사전"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Category & Favorite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                카테고리 <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SiteCategory)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                즐겨찾기 여부
              </label>
              <button
                type="button"
                onClick={() => setFavorite(!favorite)}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  favorite
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Star className={`w-4 h-4 ${favorite ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                <span>{favorite ? '즐겨찾기 활성' : '일반 등록'}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              간단한 설명 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="사이트의 주요 기능이나 관리 대상을 간략히 설명해주세요."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description}</p>}
          </div>

          {/* Live Site URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              실제 운영 사이트 주소 (GitHub Pages URL) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://daemyung-ele.github.io/your-project"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {errors.siteUrl && <p className="text-xs text-rose-500 mt-1">{errors.siteUrl}</p>}
          </div>

          {/* GitHub Repository URL (선택 사항) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              GitHub 저장소 주소 <span className="text-slate-400 font-normal text-[11px]">(선택 사항)</span>
            </label>
            <div className="relative flex items-center">
              <Github className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/your-username/your-repo (선택 사항)"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {errors.githubUrl && <p className="text-xs text-rose-500 mt-1">{errors.githubUrl}</p>}
          </div>

          {/* Icon Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                대표 아이콘 선택
              </label>
              <button
                type="button"
                onClick={() => setIsCustomIcon(!isCustomIcon)}
                className="text-xs text-blue-600 hover:underline"
              >
                {isCustomIcon ? '기본 아이콘 목록 보기' : '이미지 URL 직접 입력'}
              </button>
            </div>

            {isCustomIcon ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={customIconUrl}
                  onChange={(e) => setCustomIconUrl(e.target.value)}
                  placeholder="https://example.com/icon.png (이미지 주소)"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {customIconUrl && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>미리보기:</span>
                    <div className="w-7 h-7 p-1 border rounded bg-slate-50">
                      {renderSiteIcon(customIconUrl, 'w-5 h-5')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                {AVAILABLE_ICONS.map((icon) => {
                  const isSelected = selectedIcon === icon.id;
                  const IconComp = icon.component;
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => setSelectedIcon(icon.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs scale-105'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                      title={icon.label}
                    >
                      <IconComp className="w-5 h-5 mb-1" />
                      <span className="text-[10px] truncate max-w-[50px]">{icon.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              {editingSite ? '수정 완료' : '사이트 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
