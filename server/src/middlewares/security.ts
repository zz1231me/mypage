// server/src/middlewares/security.ts - 종합 보안 미들웨어
// Rate Limiters는 rate-limit.middleware.ts 에서 단일 관리합니다.
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { logWarning } from '../utils/logger';
import { sendError, sendForbidden } from '../utils/response';

// ✅ Helmet 보안 헤더 설정
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // ✅ 'unsafe-inline' 제거 — Vite 빌드 결과물은 외부 JS 파일만 사용
        'https://cdnjs.cloudflare.com', // CDN 허용
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Tailwind CSS 인라인 스타일 허용
        'https://fonts.googleapis.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: [
        "'self'",
        'data:', // Base64 이미지 허용
        'blob:', // Blob URL 허용
        'https:', // HTTPS 이미지 허용
      ],
      connectSrc: [
        "'self'",
        'https://api.anthropic.com', // API 연결 허용
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // XSS 보호
  crossOriginEmbedderPolicy: false, // React와 호환성을 위해 비활성화

  // 기타 보안 헤더
  hsts: {
    maxAge: 31536000, // 1년
    includeSubDomains: true,
    preload: true,
  },

  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'same-origin' },
});

// ✅ CORS 설정
export const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // 허용된 도메인 목록 (개발/프로덕션 공통 사용)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:80',
      'http://localhost',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      // 프로덕션 도메인은 환경변수로 추가 가능
      ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : []),
    ];

    // origin이 없으면 (서버-서버 요청, Postman 등) 개발 모드에서만 허용
    if (!origin) {
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('CORS 정책에 의해 차단되었습니다.'));
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logWarning('CORS 차단', { origin });
      callback(new Error('CORS 정책에 의해 차단되었습니다.'));
    }
  },
  credentials: true, // 쿠키 허용
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
  ],
};

// ✅ 입력값 검증 및 정화
export function validateInput(req: Request, res: Response, next: NextFunction): void {
  // SQL Injection: Sequelize ORM이 파라미터를 escape 처리하므로 별도 SQL 키워드 차단은 불필요.
  // 실제 위험한 HTML 인젝션 패턴만 검사한다.
  // (주의: "select", "update", "javascript" 등 일반 단어를 차단하면 정상 게시글이 막힘)
  const dangerousPatterns = [
    /<script[\s>]/i, // <script> 태그 직접 삽입
    /javascript\s*:/i, // javascript: URI scheme
    /vbscript\s*:/i, // vbscript: URI scheme
    /data\s*:\s*text\/html/i, // data:text/html 인젝션
  ];

  // 중첩 객체/배열까지 재귀 검증
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return !dangerousPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.every(item => checkValue(item));
    }
    if (value !== null && typeof value === 'object') {
      return Object.values(value).every(v => checkValue(v));
    }
    return true;
  };

  // Request body 검증
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (!checkValue(value)) {
        logWarning('의심스러운 입력 감지', { key });
        sendError(res, 400, '잘못된 입력값이 감지되었습니다.');
        return;
      }
    }
  }

  // Query parameters 검증
  for (const [key, value] of Object.entries(req.query)) {
    if (!checkValue(value)) {
      logWarning('의심스러운 쿼리 감지', { key });
      sendError(res, 400, '잘못된 쿼리 매개변수가 감지되었습니다.');
      return;
    }
  }

  next();
}

// ✅ IP 화이트리스트 (관리자용)
export function ipWhitelist(allowedIPs: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      return next(); // 개발 모드에서는 스킵
    }

    const clientIP = req.ip || req.connection.remoteAddress || '';

    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logWarning('IP 차단', { clientIP });
      sendForbidden(res, '접근이 거부되었습니다.');
      return;
    }

    next();
  };
}

// ✅ 요청 크기 제한
// Content-Length 헤더는 클라이언트가 생략하거나 조작할 수 있으므로
// 이 미들웨어는 명시적으로 큰 값을 선언한 요청만 빠르게 차단하는 용도로 사용.
// 실제 body 크기 제한은 Express body-parser의 limit 옵션으로 처리해야 함.
export const requestSizeLimit = (maxSize: string = '10mb') => {
  const maxSizeBytes = parseSize(maxSize);

  if (maxSizeBytes <= 0) {
    throw new Error(`requestSizeLimit: 잘못된 크기 형식 "${maxSize}". 예: "10mb", "1gb"`);
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLengthHeader = req.get('content-length');
    if (!contentLengthHeader) {
      // Content-Length 헤더가 없으면 body-parser에 위임
      return next();
    }

    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > maxSizeBytes) {
      sendError(res, 413, '요청 크기가 너무 큽니다.');
      return;
    }

    next();
  };
};

// 크기 문자열을 바이트로 변환
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) {
    return 0;
  }

  return Math.floor(parseFloat(match[1]) * units[match[2]]);
}
