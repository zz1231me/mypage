import React from 'react';

interface EmptyStateProps {
  debouncedSearchTerm: string;
  onNewPost: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ debouncedSearchTerm, onNewPost }) => {
  if (debouncedSearchTerm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center mb-5">
          <svg
            className="w-7 h-7 text-slate-400 dark:text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
          검색 결과가 없습니다
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            '{debouncedSearchTerm}'
          </span>
          에 대한 게시글을 찾지 못했습니다.
          <br />
          다른 검색어를 입력해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center mb-5">
        <svg
          className="w-7 h-7 text-slate-400 dark:text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
        아직 게시글이 없습니다
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        첫 번째 게시글을 작성해보세요.
      </p>
      <button
        onClick={onNewPost}
        className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        첫 글 작성하기
      </button>
    </div>
  );
};
