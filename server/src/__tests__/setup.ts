// 테스트 DB 초기화 - 테스트 프레임워크 로드 후 실행됨 (jest setupFilesAfterEnv)
import { sequelize } from '../config/sequelize';
import '../models'; // 모든 모델 + 관계 초기화

beforeAll(async () => {
  // SQLite 인메모리 DB 동기화
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
