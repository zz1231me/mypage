import { Op, literal, WhereOptions } from 'sequelize';
import { Post, Attachment, PostInstance } from '../models/Post';
import { User } from '../models/User';
import { Board } from '../models/Board';
import { BoardManager } from '../models/BoardManager';
import { Tag } from '../models/Tag';
import { WikiPage } from '../models/WikiPage';
import { Event } from '../models/Event';
import { Memo } from '../models/Memo';
import { ROLES, MAX_FILE_COUNT } from '../config/constants';
import {
  getPostTitleMaxLength,
  getPostContentMaxLength,
  getPostSecretPasswordMinLength,
  getGlobalSearchLimit,
  getBcryptRounds,
} from '../utils/settingsCache';
import { BoardAccess } from '../models/BoardAccess';
import { BaseService } from './base.service';
import { AppError } from '../middlewares/error.middleware';
import { extractTextFromTiptap } from '../utils/tiptapRenderer';
import { sequelize } from '../config/sequelize';
import { logError } from '../utils/logger';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

// DTO Interfaces
export interface SearchPostsParams {
  userId: string;
  userRole: string;
  searchTerm: string;
}

export interface CreatePostParams {
  title: string;
  content: string;
  boardType: string;
  authorName: string;
  userId: string;
  files?: Express.Multer.File[];
  originalFilenames?: string;
  isSecret?: boolean;
  secretType?: 'password' | 'users';
  secretPassword?: string;
  secretUserIds?: string[];
  isEncrypted?: boolean;
  secretSalt?: string;
}

export interface UpdatePostParams {
  postId: string;
  title: string;
  content: string;
  userId: string;
  userRole: string;
  files?: Express.Multer.File[];
  keepExistingFiles?: string;
  originalFilenames?: string;
  deletedFileNames?: string;
  isSecret?: boolean;
  secretType?: 'password' | 'users' | null;
  secretPassword?: string | null;
  secretUserIds?: string[] | null;
  isEncrypted?: boolean;
  secretSalt?: string | null;
  // 낙관적 잠금: 클라이언트가 읽은 버전 번호 (제공 시 검증)
  version?: number;
}

export interface LockedPostMeta {
  isLocked: true;
  id: string;
  title: string; // 목록에서 이미 노출되는 정보이므로 허용
  boardType: string;
  secretType: 'password';
  isEncrypted: boolean;
  // E2EE 게시물: 서버도 복호화 불가이므로 ciphertext 노출 허용
  ciphertext?: string;
  secretSalt?: string | null;
  // author/createdAt은 비밀번호 없이 노출하지 않음
}

export class PostService extends BaseService {
  // ✅ 파일 삭제 유틸리티
  private deleteFileIfExists(filename: string, storagePath?: string): void {
    try {
      const uploadsRoot = path.resolve(process.cwd(), 'uploads');
      let filePath: string;
      if (storagePath) {
        // storagePath가 제공된 경우: 절대 경로 또는 /uploads/... 상대 경로
        if (path.isAbsolute(storagePath)) {
          filePath = path.resolve(storagePath);
        } else {
          // /uploads/files/xxx 또는 /uploads/images/xxx 형태
          filePath = path.resolve(
            process.cwd(),
            storagePath.startsWith('/') ? storagePath.slice(1) : storagePath
          );
        }
      } else {
        // 하위 호환: filename만으로 files 디렉토리 검색
        filePath = path.resolve(process.cwd(), 'uploads/files', filename);
      }
      // 경로 탈출(path traversal) 방지: uploads/ 디렉토리 내부만 허용
      if (!filePath.startsWith(uploadsRoot + path.sep) && filePath !== uploadsRoot) {
        logError(`파일 삭제 거부 (경계 이탈): ${filePath}`);
        return;
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      logError(`파일 삭제 실패: ${filename}`, error);
    }
  }

  // ✅ 안전한 첨부파일 파싱
  private parseAttachments(rawValue: Attachment[] | string | null | undefined): Attachment[] {
    if (!rawValue) return [];
    if (Array.isArray(rawValue)) return rawValue;

    if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        logError('JSON 파싱 실패', error);
        return [];
      }
    }
    return [];
  }

  // ✅ originalFilenames JSON 파싱 (파싱 실패 시 인덱스 기반 이름 사용)
  private parseOriginalNames(originalFilenames: string | undefined, count: number): string[] {
    if (originalFilenames) {
      try {
        return JSON.parse(originalFilenames);
      } catch (_error) {
        // 파싱 실패 시 폴백
      }
    }
    return Array.from({ length: count }, (_, i) => `file_${i + 1}`);
  }

  // ✅ 첨부파일 배열을 클라이언트 응답 형식으로 변환
  private formatAttachments(rawValue: Attachment[] | string | null | undefined) {
    return this.parseAttachments(rawValue).map(file => ({
      url: `/api/uploads/download/${file.filename}?originalName=${encodeURIComponent(file.originalname)}`,
      originalName: file.originalname,
      storedName: file.filename,
      size: file.size || 0,
      mimeType: file.mimetype || 'application/octet-stream',
    }));
  }

  // ✅ 글로벌 검색
  async globalSearch(params: SearchPostsParams) {
    const { userId, userRole, searchTerm } = params;

    if (searchTerm.length < 2) {
      throw new AppError(400, '검색어를 2자 이상 입력해주세요.');
    }
    if (searchTerm.length > 100) {
      throw new AppError(400, '검색어는 100자 이내로 입력해주세요.');
    }

    const escapedSearchTerm = searchTerm.replace(/[%_\\]/g, '\\$&');

    // 병렬로 접근 가능한 게시판 조회
    const [generalBoards, personalBoard] = await Promise.all([
      // 일반 게시판: 단일 JOIN 쿼리
      BoardAccess.findAll({
        where: {
          roleId: userRole,
          canRead: true,
        },
        include: [
          {
            model: Board,
            as: 'board',
            where: {
              isActive: true,
              isPersonal: false,
            },
            required: true,
            attributes: ['id'],
          },
        ],
        attributes: ['boardId'],
      }),
      // 개인 폴더
      Board.findOne({
        where: {
          isPersonal: true,
          ownerId: userId,
          isActive: true,
        },
        attributes: ['id'],
      }),
    ]);

    const accessibleBoardTypes = generalBoards.map(access => access.boardId);
    if (personalBoard) {
      accessibleBoardTypes.push(personalBoard.id);
    }

    if (accessibleBoardTypes.length === 0) {
      return { results: [], count: 0, query: searchTerm };
    }

    // 검색 실행 (최적화된 쿼리)
    // 비밀글은 작성자 본인에게만 노출 (secretType='users' 허용 대상 포함 불가 — SQL JSON 검색 복잡도 문제)
    const posts = await Post.findAll({
      where: {
        boardType: { [Op.in]: accessibleBoardTypes },
        [Op.and]: [
          {
            [Op.or]: [{ isSecret: false }, { isSecret: true, UserId: userId }],
          },
          {
            [Op.or]: [
              { title: { [Op.like]: `%${escapedSearchTerm}%` } },
              { content: { [Op.like]: `%${escapedSearchTerm}%` } },
            ],
          },
        ],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar'],
          required: false,
        },
        {
          model: Board,
          as: 'board',
          attributes: ['name', 'isPersonal'],
          required: false,
        },
      ],
      attributes: ['id', 'title', 'content', 'boardType', 'createdAt', 'UserId'],
      order: [['createdAt', 'DESC']],
      limit: getGlobalSearchLimit(),
    });

    const postResults = posts.map(post => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plainPost = post.get({ plain: true }) as any;
      const contentSummary = extractTextFromTiptap(plainPost.content, 200);
      const boardName = plainPost.board?.isPersonal
        ? '📁 나의 개인공간'
        : plainPost.board?.name || plainPost.boardType;

      return {
        id: String(plainPost.id),
        type: 'post' as const,
        title: plainPost.title,
        content: contentSummary,
        boardType: plainPost.boardType,
        boardName,
        createdAt: plainPost.createdAt,
        User: plainPost.user,
      };
    });

    // 위키 검색 (발행된 페이지만)
    const wikiPages = await WikiPage.findAll({
      where: {
        isPublished: true,
        [Op.or]: [
          { title: { [Op.like]: `%${escapedSearchTerm}%` } },
          { content: { [Op.like]: `%${escapedSearchTerm}%` } },
        ],
      },
      attributes: ['id', 'slug', 'title', 'content', 'createdAt'],
      order: [['updatedAt', 'DESC']],
      limit: getGlobalSearchLimit(),
    });

    const wikiResults = wikiPages.map(page => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plain = page.get({ plain: true }) as any;
      return {
        id: String(plain.id),
        type: 'wiki' as const,
        title: plain.title,
        content: extractTextFromTiptap(plain.content || '', 200),
        boardType: 'wiki',
        boardName: '📖 위키',
        slug: plain.slug,
        createdAt: plain.createdAt,
        User: undefined,
      };
    });

    // 이벤트 검색
    const events = await Event.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${escapedSearchTerm}%` } },
          { body: { [Op.like]: `%${escapedSearchTerm}%` } },
        ],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      attributes: ['id', 'title', 'body', 'start', 'end', 'createdAt'],
      order: [['start', 'DESC']],
      limit: getGlobalSearchLimit(),
    });

    const eventResults = events.map(event => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plain = event.get({ plain: true }) as any;
      return {
        id: String(plain.id),
        type: 'event' as const,
        title: plain.title,
        content: extractTextFromTiptap(plain.body || '', 200),
        boardType: 'event',
        boardName: '📅 일정',
        start: plain.start,
        end: plain.end,
        createdAt: plain.createdAt,
        User: plain.user,
      };
    });

    // 메모 검색 (본인 것만)
    const memos = await Memo.findAll({
      where: {
        UserId: userId,
        [Op.or]: [
          { title: { [Op.like]: `%${escapedSearchTerm}%` } },
          { content: { [Op.like]: `%${escapedSearchTerm}%` } },
        ],
      },
      attributes: ['id', 'title', 'content', 'createdAt'],
      order: [['updatedAt', 'DESC']],
      limit: getGlobalSearchLimit(),
    });

    const memoResults = memos.map(memo => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plain = memo.get({ plain: true }) as any;
      return {
        id: String(plain.id),
        type: 'memo' as const,
        title: plain.title || '제목 없음',
        content: extractTextFromTiptap(plain.content || '', 200),
        boardType: 'memo',
        boardName: '📝 메모',
        createdAt: plain.createdAt,
        User: undefined,
      };
    });

    const results = [...postResults, ...wikiResults, ...eventResults, ...memoResults];
    return { results, count: results.length, query: searchTerm };
  }

  // ✅ 게시글 목록 조회
  async getPosts(
    boardType: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    userId?: string,
    tagIds?: number[]
  ) {
    const andConditions: ReturnType<typeof literal>[] = [];

    if (tagIds && tagIds.length > 0) {
      // sequelize.escape()로 각 ID를 이스케이프하여 파라미터화된 쿼리와 동등한 안전성 확보
      const safeTagIds = tagIds.map(id => sequelize.escape(id)).join(',');
      andConditions.push(
        literal(
          `EXISTS(SELECT 1 FROM PostTags AS pt WHERE pt.PostId = Post.id AND pt.TagId IN (${safeTagIds}))`
        )
      );
    }

    const whereCondition: WhereOptions<PostInstance> & { [key: symbol]: unknown } = {
      boardType,
      ...(andConditions.length > 0 ? { [Op.and]: andConditions } : {}),
    };

    if (search) {
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${escapedSearch}%` } },
        { content: { [Op.like]: `%${escapedSearch}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    // isRead 서브쿼리 (userId 제공 시에만)
    const isReadAttribute = userId
      ? [
          [
            literal(
              `EXISTS(SELECT 1 FROM PostReads AS pr WHERE pr.PostId = Post.id AND pr.UserId = ${sequelize.escape(userId)})`
            ),
            'isRead',
          ] as any,
        ]
      : [];

    const [totalCount, posts] = await Promise.all([
      Post.count({ where: whereCondition }),
      Post.findAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'avatar'],
            required: false,
          },
          {
            model: Tag,
            as: 'tags',
            attributes: ['id', 'name', 'color'],
            through: { attributes: [] },
            required: false,
          },
        ],
        attributes: [
          'id',
          'title',
          'createdAt',
          'author',
          'content',
          'UserId',
          'viewCount',
          'isSecret',
          'secretType',
          'isPinned',
          [
            literal(`(SELECT COUNT(*) FROM comments AS c WHERE c.PostId = Post.id)`),
            'commentCount',
          ],
          [
            literal(`(SELECT COUNT(*) FROM PostLikes AS pl WHERE pl.PostId = Post.id)`),
            'likeCount',
          ],
          ...isReadAttribute,
        ],
        order: [
          ['isPinned', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit,
        offset,
        subQuery: false,
      }),
    ]);

    const formattedPosts = posts.map(post => {
      const postData = post.get({ plain: true }) as any;
      const isOwnSecret = postData.isSecret && postData.UserId === userId;
      // 본인 글이 아닌 비밀글은 작성자 정보 마스킹
      const revealAuthor = !postData.isSecret || isOwnSecret;
      return {
        id: postData.id,
        title: postData.isSecret ? '🔒 비밀글입니다.' : postData.title,
        author: revealAuthor ? postData.user?.name || postData.author || 'Unknown' : null,
        createdAt: postData.createdAt,
        UserId: revealAuthor ? postData.UserId : null,
        viewCount: postData.viewCount || 0,
        commentCount: parseInt(postData.commentCount, 10) || 0,
        likeCount: parseInt(postData.likeCount, 10) || 0,
        isSecret: postData.isSecret || false,
        secretType: postData.secretType || null,
        isPinned: postData.isPinned || false,
        isRead: userId ? Boolean(postData.isRead) : undefined,
        tags: postData.tags || [],
        user: revealAuthor ? postData.user : null,
      };
    });

    return {
      posts: formattedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  // ✅ 게시글 상세 조회 (requestUserId: 비밀글 접근 체크용, skipViewCount: 수정/삭제 시 조회수 증가 방지)
  async getPostById(
    id: string,
    requestUserId?: string,
    skipViewCount = false
  ): Promise<
    | { isLocked: false; post: InstanceType<typeof Post>; postData: any; attachments: any[] }
    | LockedPostMeta
    | null
  > {
    const post = await Post.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'avatar'],
        },
      ],
    });

    if (!post) return null;

    // 비밀글 접근 체크 (requestUserId 제공 시)
    if (requestUserId !== undefined && post.isSecret) {
      const isOwner = post.UserId === requestUserId;

      // E2EE 암호화 글은 작성자 본인도 비밀번호 입력 필요 (서버가 평문을 모름)
      if (!isOwner || post.isEncrypted) {
        if (post.secretType === 'password') {
          // 비밀번호 입력 필요 → 최소 메타만 반환 (author/createdAt 노출 방지)
          // E2EE 게시물은 서버도 복호화 불가이므로 ciphertext+salt 함께 반환
          return {
            isLocked: true as const,
            id: post.id,
            title: post.title,
            boardType: post.boardType,
            secretType: 'password' as const,
            isEncrypted: post.isEncrypted || false,
            ...(post.isEncrypted && {
              ciphertext: post.content,
              secretSalt: post.secretSalt,
            }),
          };
        }

        if (!isOwner && post.secretType === 'users') {
          const allowedIds = post.secretUserIds || [];
          if (!allowedIds.includes(requestUserId)) {
            throw new AppError(403, '이 비밀글에 접근할 권한이 없습니다.');
          }
        }
      }
    }

    // ✅ 조회수 증가 (수정/삭제 시 skipViewCount=true 로 우회)
    // increment는 원자적으로 실행되며, 이후 reload로 최신 값을 반영
    if (!skipViewCount) {
      await Post.increment('viewCount', { by: 1, where: { id: post.id } });
      await post.reload();
    }

    const attachments = this.formatAttachments(post.attachments);
    const postData = post.get({ plain: true }) as any;

    return {
      isLocked: false,
      post,
      postData,
      attachments,
    };
  }

  // ✅ 비밀글 비밀번호 검증 후 전체 데이터 반환
  async verifySecretPost(id: string, password: string) {
    const post = await Post.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
    });

    if (!post) throw new AppError(404, '게시글을 찾을 수 없습니다.');
    if (!post.isSecret || post.secretType !== 'password') {
      throw new AppError(400, '비밀번호가 설정된 게시글이 아닙니다.');
    }
    if (!post.secretPassword) {
      throw new AppError(500, '비밀번호 정보가 없습니다.');
    }

    const isMatch = await bcrypt.compare(password, post.secretPassword);
    if (!isMatch) throw new AppError(401, '비밀번호가 올바르지 않습니다.');

    await Post.increment('viewCount', { by: 1, where: { id: post.id } });
    await post.reload();

    const attachments = this.formatAttachments(post.attachments);
    const postData = post.get({ plain: true }) as any;
    return { post, postData, attachments };
  }

  // ✅ 게시글 생성
  async createPost(params: CreatePostParams) {
    const {
      title,
      content,
      boardType,
      authorName,
      userId,
      files,
      originalFilenames,
      isSecret,
      secretType,
      secretPassword,
      secretUserIds,
      isEncrypted,
      secretSalt,
    } = params;

    if (!title || !content || title.trim().length === 0 || content.trim().length === 0) {
      throw new AppError(400, '제목과 내용을 입력해주세요.');
    }
    if (title.trim().length > getPostTitleMaxLength()) {
      throw new AppError(400, `제목은 ${getPostTitleMaxLength()}자를 초과할 수 없습니다.`);
    }
    if (content.length > getPostContentMaxLength()) {
      throw new AppError(400, '본문이 너무 깁니다. 내용을 줄여주세요.');
    }

    let attachmentsData: Attachment[] = [];
    if (files && files.length > 0) {
      const originalNames = this.parseOriginalNames(originalFilenames, files.length);
      attachmentsData = files.map((file, index) => ({
        filename: file.filename,
        originalname: originalNames[index] || `file_${index + 1}`,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
      }));
    }

    // 비밀글 비밀번호 검증 및 해시
    let hashedPassword: string | null = null;
    if (isSecret && secretType === 'password') {
      if (!secretPassword || secretPassword.trim().length < getPostSecretPasswordMinLength()) {
        throw new AppError(
          400,
          `비밀글 비밀번호는 ${getPostSecretPasswordMinLength()}자 이상이어야 합니다.`
        );
      }
      hashedPassword = await bcrypt.hash(secretPassword.trim(), getBcryptRounds());
    }

    // ✅ 트랜잭션으로 원자적 생성 보장
    const postWithUser = await sequelize.transaction(async t => {
      const post = await Post.create(
        {
          title: title.trim(),
          content,
          boardType,
          author: authorName,
          UserId: userId,
          // setter가 init()에 정의되어 있으므로 create 시에도 JSON 직렬화가 정상 작동
          attachments: attachmentsData.length > 0 ? attachmentsData : null,
          isSecret: isSecret || false,
          secretType: isSecret ? secretType || null : null,
          secretPassword: hashedPassword,
          secretUserIds: isSecret && secretType === 'users' ? secretUserIds || null : null,
          isEncrypted: isEncrypted || false,
          secretSalt: isEncrypted && secretSalt ? secretSalt : null,
        },
        { transaction: t }
      );

      const created = await Post.findByPk(post.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'avatar'],
          },
        ],
        transaction: t,
      });

      if (!created) {
        throw new AppError(500, '게시글 생성 중 오류가 발생했습니다.');
      }

      return created;
    });

    return postWithUser;
  }

  // ✅ 게시글 수정
  async updatePost(params: UpdatePostParams) {
    const {
      postId,
      title,
      content,
      userId,
      userRole,
      files,
      keepExistingFiles,
      originalFilenames,
      deletedFileNames,
      isSecret,
      secretType,
      secretPassword,
      secretUserIds,
      isEncrypted,
      secretSalt,
      version,
    } = params;

    const post = await Post.findByPk(postId);
    if (!post) throw new AppError(404, '게시글을 찾을 수 없습니다.');

    const isOwner = userId === post.UserId;
    const board = await Board.findByPk(post.boardType);

    if (!board) {
      throw new AppError(404, '게시판을 찾을 수 없습니다.');
    }

    // 권한 확인을 낙관적 잠금보다 먼저 수행 (권한 없는 접근은 409 전에 차단)
    if (board.isPersonal) {
      if (!isOwner) throw new AppError(403, '개인공간의 게시글은 작성자만 수정할 수 있습니다.');
    } else {
      // 일반 게시판: 작성자, 관리자/매니저, 또는 해당 게시판 담당자만 수정 가능
      const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.MANAGER;
      if (!isOwner && !isPrivileged) {
        const isBoardManager = await BoardManager.findOne({
          where: { boardId: post.boardType, userId },
        });
        if (!isBoardManager) {
          throw new AppError(403, '게시글 수정 권한이 없습니다.');
        }
      }
    }

    // 낙관적 잠금: version 미전송 시 0으로 간주 (수정된 글은 반드시 version 포함 필요)
    if (post.version !== (version ?? 0)) {
      throw new AppError(
        409,
        '다른 사용자가 이미 이 게시글을 수정했습니다. 페이지를 새로고침 후 다시 시도해주세요.'
      );
    }

    if (!title || !content || title.trim().length === 0 || content.trim().length === 0) {
      throw new AppError(400, '제목과 내용을 입력해주세요.');
    }
    if (title.trim().length > getPostTitleMaxLength()) {
      throw new AppError(400, `제목은 ${getPostTitleMaxLength()}자를 초과할 수 없습니다.`);
    }
    if (content.length > getPostContentMaxLength()) {
      throw new AppError(400, '본문이 너무 깁니다. 내용을 줄여주세요.');
    }

    // 첨부파일 처리 — 삭제할 파일 목록 계산 (실제 삭제는 트랜잭션 성공 후)
    let existingFiles: Attachment[] = this.parseAttachments(post.attachments);
    const filesToDelete: Attachment[] = [];

    if (deletedFileNames) {
      try {
        const parsedDeletedFileNames: string[] =
          typeof deletedFileNames === 'string' ? JSON.parse(deletedFileNames) : deletedFileNames;

        existingFiles
          .filter(f => parsedDeletedFileNames.includes(f.filename))
          .forEach(f => filesToDelete.push(f));
        existingFiles = existingFiles.filter(
          file => !parsedDeletedFileNames.includes(file.filename)
        );
      } catch (error) {
        logError('deletedFileNames 파싱 오류', error);
      }
    }

    let finalFiles: Attachment[] = keepExistingFiles === 'true' ? [...existingFiles] : [];

    if (keepExistingFiles !== 'true') {
      existingFiles.forEach(file => filesToDelete.push(file));
    }

    if (files && files.length > 0) {
      const originalNames = this.parseOriginalNames(originalFilenames, files.length);
      const newFiles: Attachment[] = files.map((file, index) => ({
        filename: file.filename,
        originalname: originalNames[index] || `file_${index + 1}`,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
      }));

      finalFiles = [...finalFiles, ...newFiles];

      if (finalFiles.length > MAX_FILE_COUNT) {
        const excessFiles = finalFiles.slice(MAX_FILE_COUNT);
        excessFiles.forEach(file => filesToDelete.push(file));
        finalFiles = finalFiles.slice(0, MAX_FILE_COUNT);
      }
    }

    // 비밀글 비밀번호 해시 (트랜잭션 전)
    let newHashedPassword: string | null | undefined;
    if (isSecret !== undefined && isSecret && secretType === 'password' && secretPassword) {
      if (secretPassword.trim().length < getPostSecretPasswordMinLength()) {
        throw new AppError(
          400,
          `비밀글 비밀번호는 ${getPostSecretPasswordMinLength()}자 이상이어야 합니다.`
        );
      }
      newHashedPassword = await bcrypt.hash(secretPassword.trim(), getBcryptRounds());
    }

    // DB 저장을 트랜잭션으로 처리
    const updatedPost = await sequelize.transaction(async t => {
      post.title = title.trim();
      post.content = content;
      post.attachments = finalFiles.length > 0 ? finalFiles : null;

      // 비밀글 설정 업데이트
      if (isSecret !== undefined) {
        post.isSecret = isSecret;
        if (!isSecret) {
          post.secretType = null;
          post.secretPassword = null;
          post.secretUserIds = null;
          post.isEncrypted = false;
          post.secretSalt = null;
        } else {
          post.secretType = secretType || null;
          if (secretType === 'password') {
            if (newHashedPassword) {
              post.secretPassword = newHashedPassword;
            }
            post.secretUserIds = null;
            // E2EE 암호화 플래그 업데이트 (새 비밀번호로 재암호화 시에만)
            if (isEncrypted !== undefined) {
              post.isEncrypted = isEncrypted;
              post.secretSalt = isEncrypted && secretSalt ? secretSalt : null;
            }
          } else if (secretType === 'users') {
            post.secretUserIds = secretUserIds || null;
            post.secretPassword = null;
            post.isEncrypted = false;
            post.secretSalt = null;
          }
        }
      }

      // 낙관적 잠금: 버전 증가
      post.version = (post.version ?? 0) + 1;
      await post.save({ validate: false, transaction: t });

      const saved = await Post.findByPk(postId, {
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
        transaction: t,
      });

      if (!saved) {
        throw new AppError(500, '게시글 수정 중 오류가 발생했습니다.');
      }

      return saved;
    });

    // 트랜잭션 성공 후 파일 삭제 (롤백 시 파일은 유지됨)
    filesToDelete.forEach(att => this.deleteFileIfExists(att.filename, att.path));

    return updatedPost;
  }

  // ✅ 게시글 삭제
  async deletePost(postId: string, userId: string, userRole?: string): Promise<void> {
    const post = await Post.findByPk(postId);
    if (!post) throw new AppError(404, '게시글을 찾을 수 없습니다.');

    // 서비스 레이어 권한 검증: 소유자, 관리자/매니저, 또는 해당 게시판 담당자만 삭제 가능
    const isOwner = post.UserId === userId;
    const isPrivileged = userRole === ROLES.ADMIN || userRole === ROLES.MANAGER;
    if (!isOwner && !isPrivileged) {
      const isBoardManager = await BoardManager.findOne({
        where: { boardId: post.boardType, userId },
      });
      if (!isBoardManager) {
        throw new AppError(403, '게시글 삭제 권한이 없습니다.');
      }
    }

    const attachmentsArray = this.parseAttachments(post.attachments);

    // DB 레코드를 먼저 삭제한 뒤 파일 삭제 (DB 실패 시 파일은 유지됨)
    await post.destroy();

    for (const att of attachmentsArray) {
      try {
        this.deleteFileIfExists(att.filename, att.path);
      } catch (fileErr) {
        logError(`첨부파일 삭제 실패 (DB는 이미 정리됨): ${att.filename}`, fileErr);
      }
    }
  }

  // ✅ 게시글 고정/해제 (admin 또는 해당 게시판 담당자만 가능)
  async togglePin(
    postId: string,
    userId: string,
    userRole: string
  ): Promise<{ isPinned: boolean }> {
    const post = await Post.findByPk(postId);
    if (!post) throw new AppError(404, '게시글을 찾을 수 없습니다.');

    // admin은 무조건 허용
    if (userRole !== ROLES.ADMIN) {
      // manager 또는 일반 유저는 해당 게시판 담당자 여부 확인
      const isManager = await BoardManager.findOne({
        where: { boardId: post.boardType, userId },
      });
      if (!isManager) {
        throw new AppError(403, '이 게시판의 담당자만 고정 권한이 있습니다.');
      }
    }

    post.isPinned = !post.isPinned;
    await post.save();
    return { isPinned: post.isPinned };
  }
}

export const postService = new PostService();
