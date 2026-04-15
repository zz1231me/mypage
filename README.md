# 마이홈 (Myhome) — 통합 커뮤니티 관리 시스템

React + Express + SQLite/MySQL/MariaDB/PostgreSQL 기반의 풀스택 웹 애플리케이션

<!-- CI 배지: 아래 URL을 실제 GitHub 레포지토리 경로로 변경하세요 -->
<!-- [![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/<repo>/actions/workflows/ci.yml) -->

---

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [빠른 시작](#빠른-시작)
- [프로젝트 구조](#프로젝트-구조)
- [환경변수 설정](#환경변수-설정)
- [데이터베이스 설정](#데이터베이스-설정)
- [API 문서](#api-문서)
- [Docker 배포](#docker-배포)
- [보안](#보안)
- [개발 가이드](#개발-가이드)

---

## 주요 기능

### 인증 & 권한 관리
- JWT 기반 인증 (HttpOnly 쿠키, 자동 토큰 갱신)
- 2단계 인증 (2FA/TOTP) 지원
- 역할 기반 접근 제어 (RBAC)
- 멀티탭 자동 로그아웃 (storage event 동기화)
- 기기 지문 기반 세션 관리

### 게시판 시스템
- 다중 게시판 (권한별 접근 제어, 비활성 게시판 차단)
- CKEditor 5 WYSIWYG 에디터
- 파일 첨부 (이미지, 문서), 이미지 인라인 업로드
- 중첩 댓글 시스템 (낙관적 업데이트)
- 이모지 리액션 (like/love/haha/wow/sad/angry)
- 게시글 태그 (색상 지정 가능)
- 비밀 게시글 (비밀번호 보호)
- 게시글 고정 (관리자/매니저)
- 읽음 표시 (파란 점), 북마크
- 자동저장 (30초), 이중 제출 방지, 임시저장 복원
- OG 메타태그 동적 업데이트

### 위키
- 슬러그 기반 계층형 위키 페이지
- 버전 관리 (Diff 뷰어)
- 발행/비발행 상태 관리

### 메모
- 사용자별 스티키 메모 보드
- 색상 지정, 고정(pin), 드래그 정렬

### 이벤트 캘린더
- FullCalendar 기반 드래그 & 드롭 일정 관리
- 반복 일정 (일/주/월/연)
- 권한별 이벤트 생성 제어

### 실시간 기능
- Socket.io 기반 실시간 알림
- 멀티유저 협업 이벤트 동기화

### 전역 검색
- ⌘K / Ctrl+K 단축키 CommandPalette

### 관리자 기능
- 사용자 관리 (역할 변경, 계정 활성/비활성)
- 게시판 관리 (생성, 수정, 권한 설정)
- 역할/권한 관리 (시각화 그래프 포함)
- 태그 관리
- 이벤트 관리
- 보안 로그 / 에러 로그 / 감사 로그 / 로그인 기록
- 신고 관리
- IP 규칙 관리
- Rate Limit 설정
- 사이트 설정

### UI/UX
- 다크/라이트 모드
- 반응형 디자인
- 가상 스크롤 (대용량 목록 최적화)
- Framer Motion 애니메이션

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18 | UI 라이브러리 |
| TypeScript | 5 | 타입 안정성 |
| Vite | 5 | 빌드 도구 (HMR) |
| Tailwind CSS | 3 | 스타일링 |
| Zustand | 4 | 전역 상태 관리 |
| React Query | 5 | 서버 상태 캐싱 |
| React Router | 6 | 라우팅 |
| CKEditor 5 | 44 | WYSIWYG 에디터 |
| FullCalendar | 6 | 캘린더 |
| Socket.io Client | 4 | 실시간 통신 |
| Uppy | 5 | 파일 업로드 |
| Framer Motion | 12 | 애니메이션 |
| DOMPurify | 3 | XSS 방지 |
| Lucide React | - | 아이콘 |

### Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| Express | 5 | 웹 프레임워크 |
| TypeScript | 5 | 타입 안정성 |
| Sequelize | 6 | ORM (다중 DB 지원) |
| Socket.io | 4 | 실시간 통신 |
| JWT | - | 인증 |
| bcrypt | 6 | 비밀번호 해싱 |
| Speakeasy | - | 2FA (TOTP) |
| Winston | - | 구조화 로깅 |
| Multer | 2 | 파일 업로드 |
| Sharp | - | 이미지 최적화 |
| Zod | 4 | 요청 유효성 검사 |
| Helmet | - | 보안 헤더 |

### 데이터베이스 (선택)

| DB | 권장 용도 |
|----|-----------|
| SQLite | 개발, 소규모 (기본값) |
| MySQL/MariaDB | 중규모 서비스 |
| PostgreSQL | 대규모, 프로덕션 |

---

## 빠른 시작

### 사전 요구사항

| 도구 | 최소 버전 | 확인 명령 |
|------|-----------|-----------|
| Node.js | **20.x 이상** | `node --version` |
| npm | 9.x 이상 | `npm --version` |

> **Windows 사용자**: `migrate`, `db:indexes` 스크립트는 Git Bash 또는 WSL2 환경에서 실행하세요.  
> PowerShell / cmd.exe에서는 `npm run dev`, `npm run build`, `npm test` 등 기본 명령은 정상 동작합니다.

### 1. 저장소 클론

```bash
# 아래 URL을 실제 레포지토리 주소로 변경하세요
git clone https://github.com/<owner>/<repo>.git
cd <repo>
```

### 2. 서버 설정

```bash
# 환경변수 설정 (반드시 JWT_SECRET 값 변경!)
cp .env.example server/.env

cd server

# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:4000)
npm run dev
```

> **첫 실행 시** DB 테이블 생성 + 인덱스 + 기본 데이터(admin 계정, 역할, 사이트 설정) 초기화가 자동으로 진행됩니다 (약 10~30초).

### 3. 클라이언트 설정

서버가 `🚀 API 서버 시작` 메시지를 출력한 뒤 **새 터미널**에서 실행하세요.

```bash
cd client

# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:8080)
npm run dev
```

### 4. 접속

| 서비스 | URL |
|--------|-----|
| 클라이언트 | http://localhost:8080 |
| API 서버 | http://localhost:4000 |
| API 문서 (Swagger) | http://localhost:4000/api-docs |

> 기본값으로 **SQLite**를 사용하므로 별도 DB 설치 없이 바로 시작할 수 있습니다.

> ⚠️ **초기 로그인**: ID `admin` / 비밀번호는 `server/.env`의 `ADMIN_DEFAULT_PASSWORD` 값입니다.  
> 첫 로그인 후 반드시 비밀번호를 변경하세요.

---

## 프로젝트 구조

```
myhome/
├── client/                    # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── api/               # Axios API 클라이언트
│   │   ├── components/        # React 컴포넌트
│   │   │   ├── Dashboard/     # 사이드바, 알림 등 대시보드 레이아웃
│   │   │   ├── admin/         # 관리자 탭 컴포넌트
│   │   │   ├── boards/        # 게시판 컴포넌트 (PostListItem, ReactionPicker, TagBadge 등)
│   │   │   ├── common/        # 공통 컴포넌트 (LoadingStates, ErrorBoundary 등)
│   │   │   ├── editor/        # CKEditor 래퍼, 파일 업로드
│   │   │   └── wiki/          # 위키 컴포넌트 (DiffViewer, History)
│   │   ├── config/            # 클라이언트 상수
│   │   ├── constants/         # 게시판 타이틀 등 상수
│   │   ├── contexts/          # Socket, Theme 컨텍스트
│   │   ├── hooks/             # 커스텀 훅
│   │   ├── pages/             # 페이지 컴포넌트
│   │   │   ├── admin/         # 관리자 페이지
│   │   │   ├── boards/        # 게시판, 게시글, 댓글
│   │   │   ├── memos/         # 메모 보드
│   │   │   ├── wiki/          # 위키 페이지
│   │   │   └── *.tsx          # 인증(Login, Register, 2FA), Dashboard, Profile 등
│   │   ├── providers/         # React Query Provider
│   │   ├── store/             # Zustand 스토어 (auth, siteSettings)
│   │   ├── styles/            # 글로벌 CSS, 디자인 시스템
│   │   ├── test/              # 클라이언트 테스트
│   │   ├── types/             # TypeScript 타입 정의
│   │   └── utils/             # 유틸리티 함수
│   ├── package.json
│   └── vite.config.ts
│
├── server/                    # 백엔드 (Express + Sequelize)
│   ├── src/
│   │   ├── config/            # DB, 환경변수, Swagger, 상수 설정
│   │   ├── controllers/       # HTTP 요청/응답 처리
│   │   ├── middlewares/       # 인증, 권한, 보안, Rate Limit
│   │   │   └── upload/        # Multer 파일 업로드 미들웨어
│   │   ├── models/            # Sequelize 모델 (30개+)
│   │   ├── routes/            # 라우트 정의
│   │   ├── services/          # 비즈니스 로직
│   │   ├── types/             # TypeScript 타입 확장
│   │   ├── utils/             # logger, response, pagination 등
│   │   └── validators/        # Zod 스키마 유효성 검사
│   ├── src/__tests__/         # Jest 테스트 (SQLite in-memory)
│   ├── src/scripts/           # DB 마이그레이션, 시드 스크립트
│   ├── uploads/               # 업로드 파일 저장소 (gitignored)
│   └── package.json
│
├── .env.example               # 환경변수 템플릿 (루트에 위치)
├── .github/workflows/ci.yml   # GitHub Actions CI
├── nginx.conf                 # Nginx 리버스 프록시 설정
├── docker-compose.yml         # Docker Compose (MariaDB + App + Nginx)
├── Dockerfile                 # 멀티스테이지 빌드
└── README.md
```

---

## 환경변수 설정

루트의 `.env.example`을 `server/.env`로 복사하고 값을 수정하세요.

```bash
cp .env.example server/.env
```

### 필수 설정

```env
# 보안 (반드시 변경!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# 데이터베이스
DB_TYPE=sqlite
DB_STORAGE=./database.sqlite

# 서버
PORT=4000
NODE_ENV=development
```

### 선택 설정

```env
# 관리자 API IP 화이트리스트 (미설정 시 전체 허용)
ALLOWED_ADMIN_IPS=127.0.0.1,::1

# 로그 보존 기간 (일)
SECURITY_LOG_RETENTION_DAYS=90
ERROR_LOG_RETENTION_DAYS=30
```

> 파일 업로드 제한(용량, 개수)은 환경변수가 아닌 관리자 페이지에서 동적으로 설정합니다.

---

## 데이터베이스 설정

기본적으로 **SQLite**를 사용하여 별도 설치 없이 바로 시작할 수 있습니다.

다른 DB로 전환하려면 [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md)를 참고하세요.

| DB | 환경변수 |
|----|---------|
| SQLite | `DB_TYPE=sqlite` + `DB_STORAGE=./database.sqlite` |
| MySQL | `DB_TYPE=mysql` + `DB_HOST/PORT/USER/PASSWORD/NAME` |
| MariaDB | `DB_TYPE=mariadb` + `DB_HOST/PORT/USER/PASSWORD/NAME` |
| PostgreSQL | `DB_TYPE=postgresql` + `DB_HOST/PORT/USER/PASSWORD/NAME` |

---

## API 문서

개발 모드에서 Swagger UI로 전체 API 문서를 확인할 수 있습니다.

**URL**: http://localhost:4000/api-docs (`NODE_ENV=development` 환경에서 자동 활성화)

### 주요 엔드포인트

| 그룹 | 경로 |
|------|------|
| 인증 | `/api/auth/*` |
| 2FA | `/api/2fa/*` |
| 게시판 | `/api/boards/*` |
| 게시글 | `/api/posts/*` |
| 댓글 | `/api/comments/*` |
| 이벤트 | `/api/events/*` |
| 메모 | `/api/memos/*` |
| 위키 | `/api/wiki/*` |
| 태그 | `/api/tags/*` |
| 알림 | `/api/notifications/*` |
| 사용자 | `/api/users/*` |
| 북마크 | `/api/bookmarks/*` |
| 신고 | `/api/reports/*` |
| 사이트 설정 | `/api/site-settings/*` |
| 관리자 | `/api/admin/*` |
| 파일 업로드 | `/api/uploads/*` |

---

## Docker 배포

### 빠른 실행

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 아래 항목 반드시 변경:
#   JWT_SECRET, JWT_REFRESH_SECRET  — 32자 이상 랜덤 문자열
#   DB_PASSWORD                     — MariaDB 비밀번호
#   DB_ROOT_PASSWORD                — MariaDB root 비밀번호
#   ADMIN_DEFAULT_PASSWORD          — 초기 admin 계정 비밀번호

# 2. 이미지 빌드 & 컨테이너 실행
docker-compose up -d --build

# 3. 로그 확인 (첫 실행 시 DB 초기화 ~30초 소요)
docker-compose logs -f app

# 4. 중지
docker-compose down

# 데이터 포함 완전 삭제 (주의!)
docker-compose down -v
```

> **참고**: 클라이언트 정적 파일은 Docker 이미지 빌드 시 자동으로 포함되어 Nginx로 서빙됩니다.  
> 호스트에 `client/dist`를 별도로 빌드할 필요가 없습니다.

### Nginx IP 제한 안내

`nginx.conf`는 기본적으로 **내부 네트워크(192.168.x.x, 172.16.x.x)만 허용**하도록 설정되어 있습니다.  
인터넷에서 직접 접근하려면 `nginx.conf`의 IP 제한 블록을 수정하세요:

```nginx
# nginx.conf — 공인 IP 접근 허용 시 아래 블록 주석 처리 또는 삭제
# allow 192.168.0.0/16;
# allow 172.16.0.0/12;
# allow 127.0.0.1;
# deny all;
```

### 서비스 구성

| 서비스 | 이미지 | 포트 |
|--------|--------|------|
| MariaDB | mariadb:11 | 3306 |
| App (Node) | node:20 | 4000 |
| Nginx | nginx:alpine | 80 |

---

## 보안

### 적용된 보안 기능

- HttpOnly 쿠키 기반 JWT (XSS 방지)
- 2단계 인증 (TOTP/Google Authenticator)
- CORS 설정
- Rate Limiting (전체 / API / 로그인별 개별 제한)
- 동적 Rate Limit (DB 기반 관리자 설정)
- SQL Injection 방지 (ORM + Zod 유효성 검사)
- XSS 방지 (DOMPurify + sanitize-html)
- 파일 업로드 검증 (MIME 타입, 경로 조작 방지, 확장자 블록리스트)
- Helmet 보안 헤더
- CSRF 미들웨어
- IP 화이트리스트 (Nginx + 앱 레벨)
- 비밀번호 재설정 토큰 SHA-256 해싱 (DB 저장)
- 보안 이벤트 자동 로깅

### 배포 전 보안 체크리스트

- [ ] `.env` 파일을 Git에 커밋하지 않기
- [ ] `JWT_SECRET` 32자 이상 랜덤 값으로 변경
- [ ] `ADMIN_DEFAULT_PASSWORD` 변경 후 삭제
- [ ] HTTPS 적용 (Let's Encrypt 등)
- [ ] `ALLOWED_ADMIN_IPS` 설정으로 관리자 API 제한
- [ ] 정기적인 의존성 업데이트 (`npm audit`)

---

## 개발 가이드

### 로컬 검증 (CI 통과 기준)

```bash
# 서버
cd server
npx tsc --noEmit       # TypeScript 타입 에러 0개
npm run lint           # ESLint 경고/에러 0개
npm run format:check   # Prettier 포맷 일치
npm test               # Jest 테스트 통과

# 클라이언트
cd client
npx tsc --noEmit
npm run lint
npm run format:check
npm run build          # Vite 빌드 성공
```

### 테스트

```bash
cd server && npm test
```

- SQLite in-memory DB 사용 (실제 DB 영향 없음)
- 테스트 파일: `server/src/__tests__/`

### 데이터베이스 초기화 스크립트

```bash
# DB 환경변수 자동 설정 (sqlite / mysql / mariadb / postgresql)
cd server && npm run setup:sqlite

# DB 인덱스 생성
cd server && npm run db:indexes

# 마이그레이션 실행
cd server && npm run migrate
```

### 코드 스타일

- **TypeScript strict mode** 적용
- **ESLint** + **Prettier** (`.prettierrc` 참고)
- 미사용 파라미터는 `_` 접두사 사용
- `console.log` 대신 `logInfo()` / `logError()` 사용
- `res.json()` 대신 `sendSuccess()` / `sendError()` 사용

---

## 트러블슈팅

### 포트 충돌 (EADDRINUSE)

```bash
# Mac/Linux — 포트 점유 프로세스 확인
lsof -i :4000
lsof -i :8080

# Windows
netstat -ano | findstr :4000

# 서버 포트 변경: server/.env
PORT=5000

# 클라이언트 API 대상 변경: client/.env.local 파일 생성
VITE_API_URL=http://localhost:5000
```

### 데이터베이스 초기화 (처음부터 다시 시작)

```bash
# SQLite
rm server/database.sqlite
cd server && npm run dev   # 재실행 시 자동 재생성

# MySQL/MariaDB/PostgreSQL
# DB 접속 후:
# DROP DATABASE myhome;
# CREATE DATABASE myhome CHARACTER SET utf8mb4;
```

### Windows에서 migrate / db:indexes 실패

PowerShell이나 cmd.exe에서는 `NODE_ENV=` 접두사 문법이 지원되지 않습니다.  
Git Bash 또는 WSL2에서 실행하세요:

```bash
# Git Bash / WSL2
cd server && npm run migrate
cd server && npm run db:indexes
```

### Docker — nginx가 빈 화면 표시

정적 파일 볼륨 초기화 순서 문제일 수 있습니다. 아래 명령으로 볼륨을 재생성하세요:

```bash
docker-compose down -v
docker-compose up -d --build
```

---

## 라이센스

MIT License

---

## 기여

버그 리포트, 기능 제안, Pull Request를 환영합니다.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request to `https://github.com/<owner>/<repo>`
