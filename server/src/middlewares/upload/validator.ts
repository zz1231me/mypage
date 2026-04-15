// server/src/middlewares/upload/validator.ts
import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import { MAGIC_NUMBERS } from './config';
import { logInfo, logWarning, logError } from '../../utils/logger';
import { sendError } from '../../utils/response';

/**
 * 파일 내용 검증 (Magic Number 체크)
 *
 * - MAGIC_NUMBERS에 정의된 타입: magic byte로 검증
 * - MAGIC_NUMBERS에 빈 배열인 타입 (text/plain 등): magic byte 검증 불가 — 통과
 * - MAGIC_NUMBERS에 없는 타입: 허용되지 않은 MIME 타입으로 거부
 */
async function validateFileContent(filePath: string, mimetype: string): Promise<boolean> {
  try {
    const expectedHeaders = MAGIC_NUMBERS[mimetype];

    // MIME 타입이 화이트리스트에 없으면 거부
    if (expectedHeaders === undefined) {
      logWarning('허용되지 않은 MIME 타입', { mimetype, filePath });
      return false;
    }

    // magic number 정의가 없는 타입(text 등)은 확장자/MIME 일치 검증만으로 통과
    if (expectedHeaders.length === 0) {
      return true;
    }

    const fd = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(16);
    await fd.read(buf, 0, 16, 0);
    await fd.close();

    // mp4는 offset 4에 ftyp이 있으므로 별도 처리
    if (mimetype === 'video/mp4') {
      const ftypHeader = buf.slice(4, 8);
      return ftypHeader.equals(expectedHeaders[0]);
    }

    return expectedHeaders.some(expected => buf.slice(0, expected.length).equals(expected));
  } catch (error) {
    logError('파일 내용 검증 실패', error);
    return false;
  }
}

/**
 * 업로드 후 파일 검증 미들웨어
 */
export async function validateUploadedFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const files: Express.Multer.File[] = [];

    // 단일 파일
    if (req.file) {
      files.push(req.file);
    }

    // 다중 파일
    if (req.files) {
      if (Array.isArray(req.files)) {
        files.push(...req.files);
      } else {
        // 객체 형태인 경우 (fields)
        Object.values(req.files).forEach(fileList => {
          files.push(...fileList);
        });
      }
    }

    if (files.length === 0) {
      return next();
    }

    for (const file of files) {
      const filePath = file.path;

      // 파일 내용 검증
      const isValidContent = await validateFileContent(filePath, file.mimetype);
      if (!isValidContent) {
        await fs.unlink(filePath);
        sendError(res, 400, `파일 내용이 올바르지 않습니다: ${file.originalname}`);
        return;
      }

      logInfo('파일 검증 완료', { filename: file.filename });

      // ✅ 권한 설정: 실행 권한 제거 (644: rw-r--r--)
      // 윈도우에서는 chmod가 다르게 동작하므로 POSIX 환경에서만 실행
      if (process.platform !== 'win32') {
        await fs.chmod(filePath, 0o644);
      }
    }

    next();
  } catch (error) {
    logError('파일 검증 실패', error);
    sendError(res, 500, '파일 검증 중 오류가 발생했습니다.');
  }
}
