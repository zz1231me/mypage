// server/src/middlewares/dynamicRateLimit.ts - 동적 Rate Limiting (초기화 수정됨)
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { RateLimitSettings } from '../models/RateLimitSettings';
import { logInfo, logSuccess, logError, logWarning } from '../utils/logger';

interface CreateRateLimitSettingsData {
  category: string;
  name: string;
  description: string;
  windowMs: number;
  maxRequests: number;
  enabled: boolean;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  message: string;
  statusCode: number;
  applyTo: string;
  priority?: number;
  whitelistIPs?: string;
  blacklistIPs?: string;
  headers?: string;
}

// ✅ 메모리 캐시로 성능 최적화
interface RateLimitSettingsSnapshot {
  windowMs: number;
  maxRequests: number;
  message: string;
  statusCode: number;
  applyTo: string;
}

interface CachedRateLimit {
  middleware: RateLimitRequestHandler;
  lastUpdated: Date;
  settings: RateLimitSettingsSnapshot;
}

class DynamicRateLimitManager {
  private cache = new Map<string, CachedRateLimit>();
  private isInitialized = false;
  private defaultSettings = {
    windowMs: 15 * 60 * 1000, // 15분
    maxRequests: 1000,
    message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
    statusCode: 429,
  };

  // ✅ 설정 캐시 새로고침 (5분마다) - 초기화 후에만
  constructor() {
    logInfo('DynamicRateLimitManager 생성됨 (초기화 대기 중...)');
  }

  // ✅ 지연 초기화 메서드 추가
  async initialize() {
    if (this.isInitialized) return;

    try {
      logInfo('Rate Limiting 매니저 초기화 시작...');
      await this.createDefaultSettings();
      await this.refreshCache();

      // 주기적 캐시 새로고침 설정 (5분마다)
      setInterval(
        () => {
          void this.refreshCache();
        },
        5 * 60 * 1000
      );

      this.isInitialized = true;
      logSuccess('Rate Limiting 매니저 초기화 완료');
    } catch (error) {
      logError('Rate Limiting 매니저 초기화 실패', error);
    }
  }

  // ✅ 기본 설정 생성 (없는 경우) - 수정됨
  async createDefaultSettings() {
    try {
      logInfo('기본 Rate Limiting 설정 확인 중...');

      const defaultConfigs = [
        {
          category: 'auth',
          name: 'login',
          description: '로그인 시도 제한',
          windowMs: 15 * 60 * 1000, // 15분
          maxRequests: 10,
          enabled: true,
          skipSuccessfulRequests: true,
          skipFailedRequests: false,
          message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
          statusCode: 429,
          applyTo: '/api/auth/login',
          priority: 10,
          whitelistIPs: '[]',
          blacklistIPs: '[]',
          headers: '{}',
        },
        {
          category: 'api',
          name: 'general',
          description: '일반 API 요청 제한',
          windowMs: 15 * 60 * 1000, // 15분
          maxRequests: 1000,
          enabled: true,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          message: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          statusCode: 429,
          applyTo: '/api',
          priority: 100,
          whitelistIPs: '[]',
          blacklistIPs: '[]',
          headers: '{}',
        },
        {
          category: 'upload',
          name: 'file_upload',
          description: '파일 업로드 제한',
          windowMs: 60 * 60 * 1000, // 1시간
          maxRequests: 50,
          enabled: true,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          message: '파일 업로드 한도를 초과했습니다. 1시간 후 다시 시도해주세요.',
          statusCode: 429,
          applyTo: '/api/uploads',
          priority: 20,
          whitelistIPs: '[]',
          blacklistIPs: '[]',
          headers: '{}',
        },
        {
          category: 'admin',
          name: 'admin_panel',
          description: '관리자 페이지 제한',
          windowMs: 15 * 60 * 1000, // 15분
          maxRequests: 200,
          enabled: true,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          message: '관리자 페이지 요청이 너무 많습니다.',
          statusCode: 429,
          applyTo: '/api/admin',
          priority: 30,
          whitelistIPs: '[]',
          blacklistIPs: '[]',
          headers: '{}',
        },
      ];

      let createdCount = 0;
      for (const config of defaultConfigs) {
        const existing = await RateLimitSettings.findOne({
          where: { category: config.category, name: config.name },
        });

        if (!existing) {
          await RateLimitSettings.create(config);
          logSuccess(`기본 Rate Limit 설정 생성: ${config.category}.${config.name}`);
          createdCount++;
        }
      }

      if (createdCount > 0) {
        logSuccess(`기본 설정 생성됨`, { count: createdCount });
      } else {
        logInfo('기존 설정이 있어서 새로 생성하지 않음');
      }
    } catch (error) {
      logError('기본 설정 생성 실패', error);
      throw error;
    }
  }

  // ✅ 캐시 새로고침
  async refreshCache() {
    try {
      logInfo('Rate Limit 캐시 새로고침 중...');

      const settings = await RateLimitSettings.findAll({
        where: { enabled: true },
        order: [['priority', 'ASC']],
      });

      logInfo(`활성화된 설정 발견`, { count: settings.length });

      const newCache = new Map<string, CachedRateLimit>();

      for (const setting of settings) {
        const key = `${setting.category}.${setting.name}`;
        const middleware = this.createRateLimiter(setting);

        newCache.set(key, {
          middleware,
          lastUpdated: new Date(),
          settings: setting.toJSON(),
        });

        logInfo(`Rate Limit 설정 로드`, {
          key,
          maxRequests: setting.maxRequests,
          window: this.formatTime(setting.windowMs),
        });
      }

      this.cache = newCache;
      logSuccess(`Rate Limit 캐시 새로고침 완료`, { loaded: settings.length });
    } catch (error) {
      logError('Rate Limit 캐시 새로고침 실패', error);
    }
  }

  // ✅ 시간 포맷팅 헬퍼
  private formatTime(ms: number): string {
    const seconds = ms / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;

    if (hours >= 1) return `${hours}시간`;
    if (minutes >= 1) return `${minutes}분`;
    return `${seconds}초`;
  }

  // ✅ Rate Limiter 생성
  private createRateLimiter(setting: RateLimitSettings): RateLimitRequestHandler {
    const whitelistIPs = setting.getWhitelistIPs();
    const blacklistIPs = setting.getBlacklistIPs();
    const customHeaders = setting.getHeaders();

    return rateLimit({
      windowMs: setting.windowMs,
      max: setting.maxRequests,
      skipSuccessfulRequests: setting.skipSuccessfulRequests,
      skipFailedRequests: setting.skipFailedRequests,
      message: {
        error: setting.message,
        retryAfter: Math.ceil(setting.windowMs / 1000),
      },
      standardHeaders: 'draft-6',
      legacyHeaders: false,

      // ✅ IP 기반 필터링
      skip: (req: Request) => {
        const clientIP = req.ip || req.connection.remoteAddress || '';

        // 블랙리스트 체크
        if (blacklistIPs.length > 0 && blacklistIPs.includes(clientIP)) {
          return false; // 블랙리스트는 항상 제한
        }

        // 화이트리스트 체크
        if (whitelistIPs.length > 0 && whitelistIPs.includes(clientIP)) {
          return true; // 화이트리스트는 제한 건너뛰기
        }

        return false; // 일반 사용자는 제한 적용
      },

      handler: (req: Request, res: Response) => {
        const clientIP = req.ip || req.connection.remoteAddress || '';
        logWarning(`Rate limit 초과`, {
          category: setting.category,
          name: setting.name,
          ip: clientIP,
          url: req.url,
        });

        // 커스텀 헤더 설정
        Object.entries(customHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        res.status(setting.statusCode).json({
          message: setting.message,
          retryAfter: Math.ceil(setting.windowMs / 1000),
          category: setting.category,
          limit: setting.maxRequests,
        });
      },
    });
  }

  // ✅ 경로별 미들웨어 가져오기
  getMiddleware(path: string): RateLimitRequestHandler[] {
    // 초기화되지 않은 경우 기본 미들웨어만 반환
    if (!this.isInitialized) {
      return [this.getDefaultMiddleware()];
    }

    const middlewares: RateLimitRequestHandler[] = [];

    for (const [, cached] of this.cache.entries()) {
      const settings = cached.settings;

      // 경로 매칭 (간단한 패턴 매칭)
      if (this.pathMatches(path, settings.applyTo)) {
        middlewares.push(cached.middleware);
      }
    }

    // 매칭되는 미들웨어가 없으면 기본 미들웨어
    if (middlewares.length === 0) {
      middlewares.push(this.getDefaultMiddleware());
    }

    return middlewares;
  }

  // ✅ 경로 매칭 함수
  private pathMatches(requestPath: string, pattern: string): boolean {
    // 정확한 매칭
    if (requestPath === pattern) return true;

    // 접두사 매칭 (/api/auth* 형태)
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return requestPath.startsWith(prefix);
    }

    // 하위 경로 매칭 (/api/auth로 시작하는 모든 경로) — 세그먼트 경계 확인
    if (
      requestPath.startsWith(pattern) &&
      (requestPath.length === pattern.length || requestPath[pattern.length] === '/')
    ) {
      return true;
    }

    return false;
  }

  // ✅ 기본 미들웨어
  private getDefaultMiddleware(): RateLimitRequestHandler {
    return rateLimit({
      windowMs: this.defaultSettings.windowMs,
      max: this.defaultSettings.maxRequests,
      message: {
        error: this.defaultSettings.message,
        retryAfter: Math.ceil(this.defaultSettings.windowMs / 1000),
      },
    });
  }

  // ✅ 특정 설정 가져오기
  async getSettings(): Promise<RateLimitSettings[]> {
    // 초기화되지 않았으면 먼저 초기화
    await this.initialize();

    return await RateLimitSettings.findAll({
      order: [
        ['priority', 'ASC'],
        ['category', 'ASC'],
      ],
    });
  }

  // ✅ 설정 업데이트
  async updateSettings(id: number, data: Partial<RateLimitSettings>): Promise<boolean> {
    try {
      const [updatedCount] = await RateLimitSettings.update(data, {
        where: { id },
      });

      if (updatedCount > 0) {
        await this.refreshCache();
        logSuccess(`Rate Limit 설정 업데이트`, { id });
        return true;
      }

      return false;
    } catch (error) {
      logError('Rate Limit 설정 업데이트 실패', error);
      return false;
    }
  }

  // ✅ 설정 생성
  async createSettings(data: CreateRateLimitSettingsData): Promise<RateLimitSettings | null> {
    try {
      const newSettings = await RateLimitSettings.create(data);
      await this.refreshCache();
      logSuccess(`Rate Limit 설정 생성`, { category: data.category, name: data.name });
      return newSettings;
    } catch (error) {
      logError('Rate Limit 설정 생성 실패', error);
      return null;
    }
  }

  // ✅ 설정 삭제
  async deleteSettings(id: number): Promise<boolean> {
    try {
      const deletedCount = await RateLimitSettings.destroy({
        where: { id },
      });

      if (deletedCount > 0) {
        await this.refreshCache();
        logSuccess(`Rate Limit 설정 삭제`, { id });
        return true;
      }

      return false;
    } catch (error) {
      logError('Rate Limit 설정 삭제 실패', error);
      return false;
    }
  }

  // ✅ 통계 정보
  getStats() {
    return {
      cachedSettings: this.cache.size,
      categories: [...new Set(Array.from(this.cache.keys()).map(key => key.split('.')[0]))],
      lastRefresh:
        this.cache.size > 0
          ? Math.min(...Array.from(this.cache.values()).map(c => c.lastUpdated.getTime()))
          : 0,
    };
  }
}

// ✅ 싱글톤 인스턴스
export const rateLimitManager = new DynamicRateLimitManager();

// ✅ 동적 Rate Limiting 미들웨어
export const dynamicRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 초기화되지 않았으면 먼저 초기화
    await rateLimitManager.initialize();

    // req.baseUrl + req.path = full path (e.g. /api/auth/login), not just relative path
    const middlewares = rateLimitManager.getMiddleware(req.baseUrl + req.path);

    // 여러 미들웨어 순차 실행
    let index = 0;

    const runNext = (err?: unknown) => {
      if (err) return next(err);

      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      void middleware(req, res, runNext);
    };

    runNext();
  } catch (error) {
    logError('dynamicRateLimit 오류', error);
    next(); // 오류가 발생해도 요청은 계속 처리
  }
};
