import React from 'react';

interface SearchBarProps {
  searchTerm: string;
  debouncedSearchTerm: string;
  onSearchChange: (value: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  debouncedSearchTerm,
  onSearchChange,
}) => {
  return (
    <div className="mb-6">
      <div className="relative max-w-2xl">
        {/* ✅ 검색 아이콘 */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* ✅ 검색 입력 필드 - 검은 테두리 완전 제거 */}
        <input
          type="text"
          placeholder="검색어를 2자 이상 입력하세요..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          maxLength={20}
          style={{
            border: '1px solid #e5e7eb',
            outline: 'none',
            boxShadow: 'none',
          }}
          className="w-full pl-11 pr-20 h-12 text-base rounded-xl
                     bg-white dark:bg-slate-800
                     text-slate-900 dark:text-slate-100
                     placeholder:text-slate-400 dark:placeholder:text-slate-500
                     focus:border-primary-500 dark:focus:border-primary-400
                     transition-all duration-200"
          aria-label="게시글 검색"
          onFocus={e => {
            e.currentTarget.style.border = '1px solid #3b82f6';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={e => {
            e.currentTarget.style.border = '1px solid #e5e7eb';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {/* ✅ 글자 수 표시 */}
        {searchTerm && (
          <div className="absolute top-1/2 right-4 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
            {searchTerm.length}/20
          </div>
        )}

        {/* ✅ 검색 중 표시 */}
        {searchTerm !== debouncedSearchTerm && searchTerm.length >= 2 && (
          <div className="absolute top-full left-0 mt-2 flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>검색 중...</span>
          </div>
        )}

        {/* ✅ 안내 메시지 */}
        {searchTerm.length > 0 && searchTerm.length < 2 && (
          <div className="absolute top-full left-0 mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>검색어를 2자 이상 입력해주세요</span>
          </div>
        )}
      </div>
    </div>
  );
};
