import React from 'react';
import { Search, X, Star, SlidersHorizontal, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { SiteCategory } from '../types';

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: SiteCategory;
  onCategoryChange: (category: SiteCategory) => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  sortBy: 'latest' | 'name' | 'favorites';
  onSortChange: (sort: 'latest' | 'name' | 'favorites') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
}

const CATEGORIES: SiteCategory[] = ['전체', '검사', '고장', '일정', 'DB', '업무', '기타'];

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  categoryCounts,
  totalCount,
}) => {
  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          id="input-main-search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="사이트 이름, 설명, 카테고리 검색 (예: 검사, 고장보고, DB...)"
          className="w-full pl-11 pr-10 py-3.5 bg-white text-slate-900 placeholder-slate-400 text-base rounded-xl border border-slate-300 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            title="검색어 지우기"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category Pills and Utility Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = cat === '전체' ? totalCount : (categoryCounts[cat] || 0);

            return (
              <button
                key={cat}
                id={`btn-category-${cat}`}
                onClick={() => onCategoryChange(cat)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected ? 'bg-blue-700/80 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right side controls: Favorites toggle, Sort, View mode */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          {/* Favorites Only Toggle */}
          <button
            id="btn-favorites-toggle"
            onClick={onToggleFavoritesOnly}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border ${
              showFavoritesOnly
                ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="즐겨찾기 등록된 사이트만 표시합니다"
          >
            <Star
              className={`w-4 h-4 ${
                showFavoritesOnly ? 'fill-amber-400 text-amber-500' : 'text-slate-400'
              }`}
            />
            <span>즐겨찾기만 보기</span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              id="select-sort-by"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="text-xs sm:text-sm bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="latest">최신 등록순</option>
              <option value="name">이름 가나다순</option>
              <option value="favorites">즐겨찾기 우선</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center border border-slate-200 rounded-lg bg-white p-0.5">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded ${
                viewMode === 'grid' ? 'bg-slate-100 text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="그리드 카드 뷰"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="리스트 뷰"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
