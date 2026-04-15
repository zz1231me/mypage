import React from 'react';

interface PostListHeaderProps {
  boardInfo: {
    name: string;
    description: string;
  } | null;
  totalCount: number;
  debouncedSearchTerm: string;
  currentPage: number;
  totalPages: number;
  onNewPost: () => void;
}

export const PostListHeader: React.FC<PostListHeaderProps> = ({
  boardInfo,
  totalCount,
  debouncedSearchTerm,
  currentPage,
  totalPages,
  onNewPost,
}) => {
  return (
    <div className="mb-6">
      {/* ✅ 카드 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* ✅ 아이콘 */}
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>

            {/* ✅ 타이틀 정보 */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {boardInfo?.name || '게시판'}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
                <span className="font-medium">총 {totalCount}개</span>
                {debouncedSearchTerm && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      '{debouncedSearchTerm}' 검색 결과
                    </span>
                  </>
                )}
                {totalPages > 1 && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {currentPage}/{totalPages} 페이지
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ✅ 글쓰기 버튼 - 검은 테두리 완전 제거 */}
          <button
            onClick={onNewPost}
            style={{
              border: 'none',
              outline: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            }}
            className="flex items-center gap-2 px-5 py-3 
                       bg-gradient-to-r from-primary-600 to-secondary-600 
                       hover:from-primary-700 hover:to-secondary-700 
                       text-white font-semibold rounded-xl 
                       hover:shadow-xl 
                       transform hover:-translate-y-0.5 
                       transition-all duration-200 flex-shrink-0"
            aria-label="새 글 작성하기"
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow =
                '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow =
                '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">글쓰기</span>
            <span className="sm:hidden">작성</span>
          </button>
        </div>
      </div>
    </div>
  );
};
