/// <reference path="./types/express/index.d.ts" />
// ============================================================================
// server/src/index.ts
// Express 5.1 + TypeScript 5.8 + 통합 업로드 미들웨어
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

// ✅ 환경변수 먼저 로드 및 검증
dotenv.config();
import { validateEnv, env } from './config/env';
validateEnv();

// ✅ 유틸리티
import { logger, requestLogger, logError } from './utils/logger';
import { getCacheStats } from './utils/cache';
import { sendSuccess, sendError } from './utils/response';
// ✅ Swagger 설정
import { swaggerSpec } from './config/swagger';

// ✅ 미들웨어
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { dynamicRateLimit } from './middlewares/dynamicRateLimit';
import { maintenanceMiddleware } from './middlewares/maintenance.middleware';
import { csrfProtection } from './middlewares/csrf.middleware';

// ✅ 업로드 디렉토리 초기화
import { initializeUploadDirs } from './middlewares/upload/utils';

// ✅ 라우트
import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import adminRoutes from './routes/admin.routes';
import eventRoutes from './routes/event.routes';
import uploadRoutes from './routes/upload.routes';
import boardRoutes from './routes/board.routes';
import commentRoutes from './routes/comment.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import siteSettingsRoutes from './routes/siteSettings';
import twoFactorRoutes from './routes/twoFactor.routes';
import notificationRoutes from './routes/notification.routes';
import userRoutes from './routes/user.routes';
import memoRoutes from './routes/memo.routes';
import wikiRoutes from './routes/wiki.routes';
import tagRoutes from './routes/tag.routes';
import reportRoutes from './routes/report.routes';
import boardManagerRoutes from './routes/boardManager.routes';

// ✅ 데이터베이스 설정
import {
  sequelize,
  initializeDatabase,
  closeDatabaseConnection,
  checkDatabaseHealth,
} from './config/sequelize';

// ✅ 모든 모델 import (관계 설정 포함)
import './models';
// ✅ 디버그 엔드포인트에서 직접 참조하기 위한 모델 import
import { User as UserModel } from './models/User';
import { Role as RoleModel } from './models/Role';
import { Post as PostModel } from './models/Post';
import { Comment as CommentModel } from './models/Comment';
import Board from './models/Board';
import BoardAccess from './models/BoardAccess';
import Event from './models/Event';
import EventPermission from './models/EventPermission';
import Bookmark from './models/Bookmark';
import { SiteSettings as SiteSettingsModel } from './models/SiteSettings';

// ✅ DB 인덱스 생성
import { addDatabaseIndexes } from './scripts/add-indexes';

// ✅ 로그 자동 정리
import { securityLogService } from './services/securityLog.service';
import { errorLogService } from './services/errorLog.service';
import { loginHistoryService } from './services/loginHistory.service';
import { auditLogService } from './services/auditLog.service';
import { userSessionService } from './services/userSession.service';
import { loadSettingsCache, getSettings } from './utils/settingsCache';

/**
 * 오래된 로그 자동 정리
 * - 보안 로그: 90일 이상 보존 (기본값)
 * - 에러 로그: 30일 이상 보존 (기본값)
 */
async function runLogCleanup(): Promise<void> {
  try {
    const { securityLogRetentionDays, errorLogRetentionDays } = getSettings();

    const [secDeleted, errDeleted, loginDeleted, auditDeleted, sessionDeleted] = await Promise.all([
      securityLogService.deleteOldLogs(securityLogRetentionDays),
      errorLogService.deleteOldLogs(errorLogRetentionDays),
      loginHistoryService.deleteOldRecords(90),
      auditLogService.deleteOldLogs(365),
      userSessionService.cleanExpiredSessions(),
    ]);

    if (
      secDeleted > 0 ||
      errDeleted > 0 ||
      loginDeleted > 0 ||
      auditDeleted > 0 ||
      sessionDeleted > 0
    ) {
      logger.info(
        `🗑️ 로그 자동 정리 완료 — 보안로그: ${secDeleted}건, 에러로그: ${errDeleted}건, 로그인이력: ${loginDeleted}건, 감사로그: ${auditDeleted}건, 세션: ${sessionDeleted}건 삭제`
      );
    }
  } catch (error) {
    logger.error('로그 자동 정리 실패:', error);
  }
}

const app = express();
const PORT = env.PORT;

// ============================================================================
// ✅ 초기 데이터 자동 생성
// ============================================================================
async function initializeDefaultData() {
  try {
    const { Role } = await import('./models/Role');
    const { User } = await import('./models/User');
    const { SiteSettings } = await import('./models/SiteSettings');

    // 1. 역할 초기화
    logger.info('🔄 기본 역할 확인 중...');
    const roleCount = await Role.count();

    if (roleCount === 0) {
      logger.info('📝 기본 역할 생성 중...');
      const roles = [
        {
          id: 'admin',
          name: '관리자',
          description: '모든 권한을 가진 최고 관리자',
          isActive: true,
        },
        {
          id: 'manager',
          name: '매니저',
          description: '게시판 및 사용자 관리 권한',
          isActive: true,
        },
        { id: 'user', name: '일반 사용자', description: '기본 사용자 권한', isActive: true },
        { id: 'guest', name: '게스트', description: '읽기 전용 권한', isActive: true },
      ];

      for (const roleData of roles) {
        await Role.create(roleData);
        logger.info(`  ✅ 역할 생성: ${roleData.name}`);
      }
    } else {
      logger.info(`✅ 역할 ${roleCount}개 존재`);
    }

    // 2. 기본 admin 계정 생성
    logger.info('🔄 기본 admin 계정 확인 중...');
    const adminUser = await User.findByPk('admin', { paranoid: false }); // ✅ deletedAt 컬럼 없어도 동작

    const defaultAdminPw = env.ADMIN_DEFAULT_PASSWORD;

    if (!adminUser) {
      logger.info('📝 기본 admin 계정 생성 중...');
      await User.create({
        id: 'admin',
        password: defaultAdminPw, // 평문 전달 — beforeCreate 훅에서 해시
        name: '관리자',
        email: 'admin@myhome.com',
        roleId: 'admin',
        isActive: true,
      });
      logger.info(`  ✅ admin 계정 생성 완료 (비밀번호: ADMIN_DEFAULT_PASSWORD 환경변수 값)`);
      logger.warn('  ⚠️  보안을 위해 admin 비밀번호를 반드시 변경하세요!');
    } else {
      // ✅ 기존 admin 계정이 비활성화되어 있으면 활성화
      if (!adminUser.isActive) {
        adminUser.isActive = true;
        await adminUser.save();
        logger.info('  ✅ admin 계정 활성화 완료');
      } else {
        logger.info('  ✅ admin 계정 존재 (활성화 상태)');
      }
    }

    // 3. 사이트 설정 초기화
    logger.info('🔄 사이트 설정 확인 중...');
    const siteSettings = await SiteSettings.findOne();

    if (!siteSettings) {
      logger.info('📝 기본 사이트 설정 생성 중...');
      await SiteSettings.create({
        siteName: '마이홈',
        siteTitle: '마이홈 - 우리 동네 커뮤니티',
        description: '우리 동네 커뮤니티',
        logoUrl: null,
        faviconUrl: null,
        allowRegistration: true,
        requireApproval: false,
        maintenanceMode: false,
        maintenanceMessage: null,
        loginMessage: null,
      });
      logger.info('  ✅ 사이트 설정 생성 완료');
    } else {
      logger.info('✅ 사이트 설정 존재');
    }

    // 4. 이벤트 권한 기본값 초기화
    logger.info('🔄 이벤트 권한 확인 중...');
    const { default: EventPermission } = await import('./models/EventPermission');
    const permCount = await EventPermission.count();

    if (permCount === 0) {
      logger.info('📝 기본 이벤트 권한 생성 중...');
      const defaultPerms = [
        { roleId: 'admin', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        { roleId: 'manager', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        { roleId: 'user', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        { roleId: 'guest', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      ];
      for (const perm of defaultPerms) {
        await EventPermission.create(perm);
        logger.info(`  ✅ 이벤트 권한 생성: ${perm.roleId}`);
      }
    } else {
      logger.info(`✅ 이벤트 권한 ${permCount}개 존재`);
    }

    logger.info('✅ 초기 데이터 확인/생성 완료');
  } catch (error) {
    logger.error('❌ 초기 데이터 생성 실패:', error);
    throw error;
  }
}

// ============================================================================
// ✅ Express 설정
// ============================================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:
          env.NODE_ENV === 'production'
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // 개발 모드에서만 허용
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  })
);

app.disable('x-powered-by');

// ✅ Proxy 신뢰 설정 (rate limiter가 실제 클라이언트 IP를 올바르게 인식하도록)
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // 프로덕션: 첫 번째 프록시(nginx 등)만 신뢰
} else {
  app.set('trust proxy', false); // 개발: 프록시 신뢰 비활성화
}

app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// CORS_ALLOW_ALL=true 이면 모든 origin 허용
// nginx가 이미 IP 수준에서 외부를 차단하는 인트라넷 환경에서 권장
const CORS_ALLOW_ALL = process.env.CORS_ALLOW_ALL === 'true';

// 표준 사설망 IP 대역 (192.168.x.x / 10.x.x.x / 172.16-31.x.x)
const PRIVATE_NETWORK_REGEX =
  /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

// 회사 전용 IP/hostname 패턴 — 환경변수로 추가 가능
// 예: CORS_IP_PATTERN=^https?:\/\/20\.\d+\.\d+\.\d+(:\d+)?$
const CORS_IP_PATTERN = process.env.CORS_IP_PATTERN
  ? new RegExp(process.env.CORS_IP_PATTERN)
  : null;

const LOCALHOST_ORIGINS = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1',
  'http://127.0.0.1:80',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
];

// 추가 허용 origin 목록 — 환경변수로 지정
// 예: CORS_ORIGINS=https://example.com,http://myhome.local:8080
const EXTRA_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

/** origin 이 허용 목록에 속하는지 검사 */
function isOriginAllowed(origin: string): boolean {
  if (CORS_ALLOW_ALL) return true;
  if (LOCALHOST_ORIGINS.includes(origin)) return true;
  if (PRIVATE_NETWORK_REGEX.test(origin)) return true;
  if (CORS_IP_PATTERN?.test(origin)) return true;
  if (EXTRA_ORIGINS.includes(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      // origin 없는 요청 (서버 간 호출, curl, nginx 내부 프록시 등) 허용
      if (!origin) return callback(null, true);

      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      // 차단 — 로그에 origin 명시하여 디버깅 용이하게
      logger.warn(`CORS 차단: ${origin}`);
      callback(new Error(`CORS 차단: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600,
  })
);

// ✅ app.use(cors()) 가 preflightContinue:false(기본값) 로 OPTIONS 응답을 이미 종료하므로
//    별도의 app.options() 등록은 불필요. 잘못된 인자 없는 cors()는 모든 origin 허용 → 제거.

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

if (env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    logger.info(`📥 ${req.method} ${req.url} from ${req.get('origin') || req.ip}`);
    next();
  });
}

// ✅ body 크기 제한을 런타임에 settingsCache에서 읽어 동적으로 적용
//    관리자가 maxFileSizeMb를 변경해도 재시작 없이 즉시 반영됨 (lazy wrapper 패턴)
app.use((req, res, next) => {
  const limitMb = (getSettings().maxFileSizeMb ?? 100) + 10; // 10MB 여유 버퍼
  return express.json({ limit: `${limitMb}mb`, strict: true, type: 'application/json' })(
    req,
    res,
    next
  );
});
app.use((req, res, next) => {
  const limitMb = (getSettings().maxFileSizeMb ?? 100) + 10;
  return express.urlencoded({ extended: true, limit: `${limitMb}mb`, parameterLimit: 10000 })(
    req,
    res,
    next
  );
});
app.use(cookieParser());

if (env.NODE_ENV === 'development') {
  app.use(requestLogger);
}

if (env.NODE_ENV === 'development') {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: '마이홈 API 문서',
    })
  );
  logger.info('📚 Swagger UI: http://127.0.0.1:' + PORT + '/api-docs');
}

// ✅ 보안 로깅 미들웨어
import { activityLogger } from './middlewares/securityLogger';
app.use(activityLogger);

// ✅ CSRF 보호 (X-Requested-With 헤더 검증, sameSite:lax 쿠키와 이중 방어)
app.use('/api', csrfProtection);

app.use('/api', dynamicRateLimit);
app.use('/api', maintenanceMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/wiki', wikiRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/board-managers', boardManagerRoutes);

const fileStaticOptions = {
  maxAge: env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true,
  lastModified: true,
  index: false,
  setHeaders: (res: express.Response) => {
    // ✅ 일반 파일은 무조건 다운로드 (실행 방지)
    res.set('Content-Disposition', 'attachment');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Download-Options', 'noopen');
  },
};

const imageStaticOptions = {
  maxAge: env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true,
  lastModified: true,
  index: false,
  setHeaders: (res: express.Response) => {
    // ✅ 이미지/아바타는 브라우저 표시 허용 (Inline)
    res.set('Content-Disposition', 'inline');
    res.set('X-Content-Type-Options', 'nosniff');
  },
};

app.use(
  '/uploads/images',
  express.static(path.resolve(__dirname, '../uploads/images'), imageStaticOptions)
);
app.use(
  '/uploads/files',
  express.static(path.resolve(__dirname, '../uploads/files'), fileStaticOptions)
);
app.use(
  '/uploads/avatars',
  express.static(path.resolve(__dirname, '../uploads/avatars'), imageStaticOptions)
);

// ✅ 클라이언트 빌드 서빙 (npm 프로덕션 모드 — 별도 정적 서버 불필요)
// NODE_ENV !== 'development' 이고 client/dist가 존재하면 Express가 직접 서빙
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');
const clientBuildExists = env.NODE_ENV !== 'development' && fs.existsSync(clientIndexPath);

if (clientBuildExists) {
  app.use(
    express.static(clientDistPath, {
      index: false,
      maxAge: env.NODE_ENV === 'production' ? '1d' : 0,
      etag: true,
    })
  );
  // SPA 폴백: /api, /uploads 이외 모든 경로에 index.html 반환
  // Express 5는 app.get(/regex/) 미지원 → app.use + path 검사 방식 사용
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      next();
      return;
    }
    res.set('Cache-Control', 'no-store');
    res.sendFile(clientIndexPath, err => {
      if (err) {
        logError('index.html 전송 실패', err);
        sendError(res, 500, '클라이언트 파일을 불러올 수 없습니다.');
      }
    });
  });
  logger.info(`✅ 클라이언트 빌드 서빙 활성화: ${clientDistPath}`);
} else {
  // 클라이언트 빌드 없음(개발 모드 등) — API 상태 확인용 루트 엔드포인트
  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'API 서버가 정상 작동 중입니다.', version: '1.0.0' });
  });
}

app.get('/api/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const dbInfo =
    env.NODE_ENV !== 'production'
      ? {
          ...dbHealth,
          type: env.DB_TYPE,
          host: env.DB_TYPE !== 'sqlite' ? env.DB_HOST : 'file',
          port: env.DB_TYPE !== 'sqlite' ? env.DB_PORT : null,
          name: env.DB_TYPE !== 'sqlite' ? env.DB_NAME : env.DB_STORAGE,
        }
      : {
          ...dbHealth,
          status: 'connected',
        };

  // ✅ 업로드 디렉토리 접근 가능 여부 확인
  const uploadDirs = {
    images: path.resolve(__dirname, '../uploads/images'),
    files: path.resolve(__dirname, '../uploads/files'),
    avatars: path.resolve(__dirname, '../uploads/avatars'),
  };
  const uploadStatus: Record<string, boolean> = {};
  for (const [key, dir] of Object.entries(uploadDirs)) {
    uploadStatus[key] = fs.existsSync(dir);
  }
  const uploadsHealthy = Object.values(uploadStatus).every(Boolean);

  // ✅ 캐시 통계
  const cacheStats = getCacheStats();

  sendSuccess(
    res,
    {
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: dbInfo,
      port: PORT,
      cache: {
        status: 'ok',
        keys: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
      },
      uploads: {
        status: uploadsHealthy ? 'ok' : 'degraded',
        directories: uploadStatus,
      },
      features: {
        swagger: env.NODE_ENV === 'development',
        rateLimit: true,
        cache: true,
        logger: true,
        multiDatabase: true,
        avatar: true,
        helmet: true,
        compression: true,
        uploadMiddleware: 'unified',
        csrfProtection: true,
        zodValidation: true,
      },
    },
    '✅ API 서버 정상 작동'
  );
});

if (env.NODE_ENV === 'development') {
  app.get('/api/__cache-stats', (_req, res) => {
    sendSuccess(res, getCacheStats());
  });

  app.get('/api/__debug-upload-path', (_req, res) => {
    const imagePath = path.resolve(__dirname, '../uploads/images');
    const filePath = path.resolve(__dirname, '../uploads/files');
    const avatarPath = path.resolve(__dirname, '../uploads/avatars');
    const listFiles = (dir: string) => {
      try {
        return fs.readdirSync(dir).slice(0, 20); // 최대 20개
      } catch {
        return [];
      }
    };
    sendSuccess(res, {
      paths: { images: imagePath, files: filePath, avatars: avatarPath },
      exists: {
        images: fs.existsSync(imagePath),
        files: fs.existsSync(filePath),
        avatars: fs.existsSync(avatarPath),
      },
      files: {
        images: listFiles(imagePath),
        files: listFiles(filePath),
        avatars: listFiles(avatarPath),
      },
    });
  });

  app.get('/api/__debug-models', (_req, res) => {
    sendSuccess(res, {
      models: {
        User: !!UserModel,
        Role: !!RoleModel,
        Post: !!PostModel,
        Comment: !!CommentModel,
        Board: !!Board,
        BoardAccess: !!BoardAccess,
        Event: !!Event,
        EventPermission: !!EventPermission,
        Bookmark: !!Bookmark,
        SiteSettings: !!SiteSettingsModel,
      },
      associations: {
        User: Object.keys(UserModel.associations || {}),
        Role: Object.keys(RoleModel.associations || {}),
        Post: Object.keys(PostModel.associations || {}),
        Comment: Object.keys(CommentModel.associations || {}),
        Board: Object.keys(Board.associations || {}),
        BoardAccess: Object.keys(BoardAccess.associations || {}),
        Event: Object.keys(Event.associations || {}),
        EventPermission: Object.keys(EventPermission.associations || {}),
      },
    });
  });

  app.get('/api/__debug-database', (_req, res) => {
    sendSuccess(res, {
      type: env.DB_TYPE,
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      ssl: env.DB_SSL,
      storage: env.DB_STORAGE,
    });
  });

  app.get('/api/__debug-cookies', (req, res) => {
    sendSuccess(res, {
      cookies: req.cookies,
      signedCookies: req.signedCookies,
      headers: req.headers.cookie,
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    logger.info('🔄 API 서버 초기화 시작...');

    // ✅ 업로드 디렉토리 초기화
    logger.info('📁 업로드 디렉토리 초기화 중...');
    await initializeUploadDirs();
    logger.info('✅ 업로드 디렉토리 초기화 완료');

    logger.info('🗄️ 데이터베이스 초기화 중...');
    await initializeDatabase();

    logger.info('🔄 테이블 동기화 시작...');
    const syncOptions =
      env.DB_TYPE === 'sqlite' ? { alter: false, force: false } : { alter: true, force: false };
    await sequelize.sync(syncOptions);
    logger.info('✅ 테이블 동기화 완료');

    await initializeDefaultData();

    logger.info('⚙️ 설정 캐시 로드 중...');
    await loadSettingsCache();
    logger.info('✅ 설정 캐시 로드 완료');

    logger.info('🔍 DB 인덱스 확인/생성 중...');
    await addDatabaseIndexes();
    logger.info('✅ DB 인덱스 확인/생성 완료');

    logger.info('🚦 Rate Limiting 매니저 초기화 시작...');
    const { rateLimitManager } = await import('./middlewares/dynamicRateLimit');
    await rateLimitManager.initialize();
    logger.info('✅ Rate Limiting 매니저 초기화 완료');

    // ✅ 로그 자동 정리 (시작 시 1회 + 24시간 주기)
    await runLogCleanup();
    setInterval(
      () => {
        void runLogCleanup();
      },
      24 * 60 * 60 * 1000
    );

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 API 서버 시작: http://0.0.0.0:${PORT}`);
      logger.info(`   📍 로컬 접속: http://127.0.0.1:${PORT}`);
      logger.info(`   📍 로컬 접속: http://localhost:${PORT}`);
      logger.info('   ✅ 통합 업로드 미들웨어 활성화');
      logger.info('');
      logger.info(
        '📌 기본 관리자 계정: ID=admin (비밀번호는 환경변수 ADMIN_DEFAULT_PASSWORD 참조)'
      );
      logger.warn('   ⚠️  보안을 위해 admin 비밀번호를 반드시 변경하세요!');
    });
  } catch (error) {
    logger.error('❌ API 서버 시작 실패:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, _promise) => {
  logger.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', error => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  void (async () => {
    logger.info('⚠️ SIGTERM 수신, 서버 종료 중...');
    await closeDatabaseConnection();
    process.exit(0);
  })();
});

process.on('SIGINT', () => {
  void (async () => {
    logger.info('⚠️ SIGINT 수신, 서버 종료 중...');
    await closeDatabaseConnection();
    process.exit(0);
  })();
});

// 테스트 환경에서는 서버를 시작하지 않음
if (require.main === module) {
  void startServer();
}

export { app };
