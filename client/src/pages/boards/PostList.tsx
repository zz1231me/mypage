// src/pages/boards/PostList.tsx - 중복 권한 체크 제거
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchPostsByType, PostListResponse } from '../../api/posts';
import { getTags } from '../../api/tags';
import { checkUserBoardAccess } from '../../api/boards';
import { useAuth } from '../../store/auth';
import { Post, BoardInfo, PaginationInfo, Tag } from '../../types/board.types';
import axios from 'axios';
import { boardLogger } from '../../utils/logger';
import { formatRelativeDate } from '../../utils/date';
import { getBoardTitle } from '../../constants/boardTitles';

import { PageHeader } from '../../components/common/PageHeader';
import { AnimatedPage } from '../../components/common/AnimatedPage';
import { SkeletonLoader } from '../../components/boards/SkeletonLoader';
import { ErrorState } from '../../components/boards/ErrorState';
import { EmptyState } from '../../components/boards/EmptyState';
import { PostListTable } from '../../components/boards/PostListTable';

const PostList = () => {
  const { boardType } = useParams<{ boardType: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);

  // 페이지 번호를 URL 쿼리 파라미터에서 읽어 뒤로가기 시 복원
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [postsPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localSearch, setLocalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const navigate = useNavigate();
  const { getUserRole } = useAuth();

  const handlePostClick = useCallback(
    (postId: string) => {
      if (boardType) {
        navigate(`/dashboard/posts/${boardType}/${postId}`);
      }
    },
    [boardType, navigate]
  );

  const handleNewPost = useCallback(() => {
    if (boardType) {
      navigate(`/dashboard/posts/${boardType}/new`);
    }
  }, [boardType, navigate]);

  const setPage = useCallback(
    (page: number) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (page === 1) {
          next.delete('page');
        } else {
          next.set('page', String(page));
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setPage]
  );

  // 검색어 디바운스 (300ms) — localSearch 실제 변경 시에만 페이지 초기화
  const prevLocalSearch = useRef(localSearch);
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localSearch.trim();
      const hasChanged = trimmed !== prevLocalSearch.current;
      prevLocalSearch.current = trimmed;
      setDebouncedSearch(trimmed);
      if (hasChanged) setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setPage]);

  // 게시판별 태그 로드 + boardType 변경 시 필터 초기화
  // setPage(1) 불필요: boardType 변경 시 URL이 달라지므로 searchParams의 page도 자동 초기화됨
  useEffect(() => {
    setSelectedTagIds([]);
    setAvailableTags([]);
    if (!boardType) return;
    getTags(boardType)
      .then(setAvailableTags)
      .catch(err => boardLogger.warn('태그 로드 실패', err));
  }, [boardType]);

  const handleTagToggle = useCallback(
    (tagId: number) => {
      setSelectedTagIds(prev =>
        prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
      );
      setPage(1);
    },
    [setPage]
  );

  const handleTagClear = useCallback(() => {
    setSelectedTagIds([]);
    setPage(1);
  }, [setPage]);

  // ✅ post-updated 이벤트 구독 (게시글 수정/삭제 후 목록 자동 갱신)
  useEffect(() => {
    const handlePostUpdated = () => {
      setPage(1);
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('post-updated', handlePostUpdated);
    return () => window.removeEventListener('post-updated', handlePostUpdated);
  }, [setPage]);

  const setDefaultBoardInfo = useCallback((boardId: string) => {
    setBoardInfo({
      id: boardId,
      name: getBoardTitle(boardId), // ✅ 중앙화된 상수 사용
      description: '게시글 목록을 확인하세요',
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadData = async () => {
      if (!boardType) return;

      const userRole = getUserRole();
      if (!userRole) {
        boardLogger.warn('사용자 역할 정보 없음');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        boardLogger.info('게시글 목록 로딩 시작', { boardType });

        // ✅ BoardProtectedRoute에서 이미 권한 체크 완료
        // 게시판 정보만 가져오기 (권한 체크 없이)
        try {
          const accessRes = await checkUserBoardAccess(boardType);

          if (isMounted) {
            // sendSuccess wraps data: { success, data: { board, ... } }
            const boardData = accessRes.data?.data?.board ?? accessRes.data?.board;
            if (boardData) {
              setBoardInfo({
                id: boardData.id,
                name: boardData.name,
                description: boardData.description || '게시글 목록을 확인하세요',
              });
            } else {
              setDefaultBoardInfo(boardType);
            }
          }
        } catch (boardInfoError) {
          boardLogger.warn('게시판 정보 가져오기 실패, 기본 정보 사용', boardInfoError);
          if (isMounted) {
            setDefaultBoardInfo(boardType);
          }
        }

        const postResponse: PostListResponse = await fetchPostsByType(
          boardType,
          {
            page: currentPage,
            limit: postsPerPage,
            search: debouncedSearch || undefined,
            tags: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          },
          abortController.signal
        );

        boardLogger.info('게시글 목록 조회 완료', {
          postsCount: postResponse.posts?.length || 0,
          totalCount: postResponse.pagination?.totalCount || 0,
        });

        if (isMounted) {
          setPosts(postResponse.posts || []);
          setPagination(postResponse.pagination);
        }
      } catch (err) {
        if (axios.isCancel(err)) return;

        boardLogger.error('게시글 불러오기 실패', err);

        if (isMounted) {
          const axiosError = err as {
            response?: { data?: { message?: string } };
            message?: string;
          };
          setError(
            axiosError.response?.data?.message ||
              axiosError.message ||
              '게시글을 불러오는 중 오류가 발생했습니다.'
          );
          setPosts([]);
          setPagination({
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 10,
            hasNextPage: false,
            hasPrevPage: false,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [
    boardType,
    getUserRole,
    setDefaultBoardInfo,
    currentPage,
    postsPerPage,
    refreshKey,
    selectedTagIds,
    debouncedSearch,
  ]);

  if (!boardType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-12 max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            잘못된 접근입니다
          </h3>
          <p className="text-slate-600 dark:text-slate-400">올바른 게시판을 선택해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedPage className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ✅ 표준화된 페이지 헤더 적용 */}
        <PageHeader
          title={boardInfo?.name || '게시판'}
          description={`${boardInfo?.description || '게시글 목록을 확인하세요'}\n총 ${pagination?.totalCount || 0}개의 게시글`}
          icon={
            <svg
              className="w-6 h-6 text-primary-600 dark:text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
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
              <input
                type="text"
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                placeholder="빠른 검색..."
                className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 w-40 sm:w-52"
              />
            </div>
            <button onClick={handleNewPost} aria-label="새 게시글 작성" className="btn-primary">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              새 글 작성
            </button>
          </div>
        </PageHeader>

        {/* 태그 필터 */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTagClear}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedTagIds.length === 0
                  ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400'
              }`}
            >
              전체
            </button>
            {availableTags.map(tag => {
              const isActive = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    isActive
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400'
                  }`}
                  style={isActive ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                >
                  {isActive && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/70 mr-1.5 align-middle" />
                  )}
                  {tag.name}
                </button>
              );
            })}
            {selectedTagIds.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                {selectedTagIds.length}개 태그 필터 중
              </span>
            )}
          </div>
        )}

        {/* ✅ 게시글 목록 카드 */}
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden"
          role="region"
          aria-label={`${boardInfo?.name || '게시판'} 목록`}
          aria-live="polite"
          aria-busy={loading}
        >
          {loading && (
            <div>
              <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <div className="col-span-8">제목</div>
                  <div className="col-span-2 text-center hidden sm:block">작성자</div>
                  <div className="col-span-2 text-center">작성일</div>
                </div>
              </div>
              <SkeletonLoader />
            </div>
          )}

          {error && <ErrorState error={error} />}

          {!loading && !error && posts.length === 0 && (
            <EmptyState debouncedSearchTerm={debouncedSearch} onNewPost={handleNewPost} />
          )}

          {!loading && !error && posts.length > 0 && (
            <PostListTable
              posts={posts}
              currentPage={currentPage}
              pagination={pagination}
              onPostClick={handlePostClick}
              onPageChange={handlePageChange}
              formatDate={formatRelativeDate}
            />
          )}
        </div>
      </div>
    </AnimatedPage>
  );
};

export default PostList;
