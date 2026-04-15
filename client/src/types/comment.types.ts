// 개선된 AppComment 타입 정의
type AppComment = {
  id: number;
  content: string;
  author: string; // ✅ 추가됨
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  editedAt?: string | null;
  UserId: string | null;
  PostId: string;

  // 관계 데이터
  user?: {
    id: string;
    name: string;
  };
  User?: {
    name: string;
  };

  // 대댓글 지원
  parentId?: number | null;
  depth?: number;
  replies?: AppComment[];
};

// ✅ 개선된 사용자 이름 표시 로직
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getUserDisplayName = (comment: AppComment): string => {
  // 1순위: author 필드 (익명화 대응)
  if (comment.author) return comment.author;

  // 2순위: 관계 데이터의 사용자명
  if (comment.user?.name) return comment.user.name;
  if (comment.User?.name) return comment.User.name;

  // 3순위: UserId 폴백
  if (comment.UserId) return comment.UserId;

  // 최종: 기본값
  return '알수없음';
};
