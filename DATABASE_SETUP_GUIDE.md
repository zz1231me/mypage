# 🗄️ 마이홈 다중 데이터베이스 설정 가이드

마이홈는 **SQLite**, **MySQL**, **MariaDB**, **PostgreSQL**을 지원합니다.  
환경변수를 통해 손쉽게 데이터베이스를 전환할 수 있습니다.

---

## 📋 목차
1. [빠른 시작 (SQLite)](#빠른-시작-sqlite)
2. [환경변수 레퍼런스](#환경변수-레퍼런스)
3. [MySQL 설정](#mysql-설정)
4. [MariaDB 설정](#mariadb-설정)
5. [PostgreSQL 설정](#postgresql-설정)
6. [데이터베이스 전환](#데이터베이스-전환)
7. [트러블슈팅](#트러블슈팅)

---

## 🚀 빠른 시작 (SQLite)

SQLite는 **별도 설치 없이** 바로 사용할 수 있어 개발 및 테스트에 적합합니다.

```bash
# 1. 환경변수 설정 (루트에서 실행)
cp .env.example server/.env

# 2. server/.env 파일에서 아래 값만 확인
# DB_TYPE=sqlite
# DB_STORAGE=./database.sqlite

# 3. 의존성 설치
cd server
npm install

# 4. 서버 시작
npm run dev
```

> 💡 기본 설정이 SQLite이므로 .env 파일을 복사하면 바로 사용 가능합니다!

---

## 📝 환경변수 레퍼런스

루트의 `.env.example` 파일에 모든 설정이 포함되어 있습니다. `cp .env.example server/.env`로 복사 후 수정하세요.

### 필수 설정

```env
# 🔐 보안 (반드시 변경!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# ⚙️ 서버
PORT=4000
NODE_ENV=development
```

### 데이터베이스별 설정

#### SQLite (기본값)
```env
DB_TYPE=sqlite
DB_STORAGE=./database.sqlite
```

#### MySQL
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=myhome
DB_USER=myhome
DB_PASSWORD=your_secure_password
```

#### MariaDB
```env
DB_TYPE=mariadb
DB_HOST=localhost
DB_PORT=3306
DB_NAME=myhome
DB_USER=myhome
DB_PASSWORD=your_secure_password
```

#### PostgreSQL
```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myhome
DB_USER=myhome
DB_PASSWORD=your_secure_password
```

---

## 🐬 MySQL 설정

**장점**: 검증된 안정성, 높은 성능, 풍부한 자료  
**권장**: 중규모 서비스 (동시 사용자 ~100명)

### 1. MySQL 설치

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

#### macOS
```bash
brew install mysql
brew services start mysql
```

#### Windows
[MySQL 공식 사이트](https://dev.mysql.com/downloads/mysql/)에서 다운로드

### 2. 데이터베이스 생성

```bash
# MySQL 접속
sudo mysql -u root -p
```

```sql
-- 데이터베이스 생성
CREATE DATABASE myhome CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 생성
CREATE USER 'myhome'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 권한 부여
GRANT ALL PRIVILEGES ON myhome.* TO 'myhome'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 환경변수 설정

```bash
# server/.env 파일 수정
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=myhome
DB_USER=myhome
DB_PASSWORD=your_secure_password
```

### 4. 서버 재시작

```bash
npm run dev
```

---

## 🦭 MariaDB 설정

**장점**: MySQL 완전 호환, 오픈소스, 더 나은 성능  
**권장**: MySQL 대안으로 선호하는 경우

### 1. MariaDB 설치

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install mariadb-server
sudo mysql_secure_installation
```

#### macOS
```bash
brew install mariadb
brew services start mariadb
```

### 2. 데이터베이스 생성

MySQL과 동일한 명령어 사용:

```sql
CREATE DATABASE myhome CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myhome'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON myhome.* TO 'myhome'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 환경변수 설정

```env
DB_TYPE=mariadb
DB_HOST=localhost
DB_PORT=3306
DB_NAME=myhome
DB_USER=myhome
DB_PASSWORD=your_secure_password
```

---

## 🐘 PostgreSQL 설정

**장점**: 고급 기능, 확장성, ACID 완전 준수  
**권장**: 대규모 서비스, 프로덕션 환경 (동시 사용자 ~500명)

### 1. PostgreSQL 설치

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Windows
[PostgreSQL 공식 사이트](https://www.postgresql.org/download/)에서 다운로드

### 2. 데이터베이스 생성

```bash
# PostgreSQL 사용자로 전환
sudo -u postgres psql
```

```sql
-- 사용자 및 데이터베이스 생성
CREATE USER myhome WITH ENCRYPTED PASSWORD 'your_secure_password';
CREATE DATABASE myhome OWNER myhome;
GRANT ALL PRIVILEGES ON DATABASE myhome TO myhome;
\q
```

### 3. 환경변수 설정

```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myhome
DB_USER=myhome
DB_PASSWORD=your_secure_password
```

### 4. 의존성 설치

PostgreSQL 드라이버(`pg`)는 이미 `server/package.json`에 포함되어 있습니다.

```bash
cd server
npm install
```

---

## 🔄 데이터베이스 전환

### 전환 절차

1. **서버 중지**
2. **`server/.env` 수정** (`DB_TYPE` 및 접속 정보 변경)
3. **서버 재시작** (드라이버는 이미 포함되어 별도 설치 불필요)

### 드라이버

모든 DB 드라이버(`sqlite3`, `mysql2`, `pg`, `mariadb`)가 `server/package.json`에 이미 포함되어 있습니다. **별도 설치 불필요** — `npm install`만 실행하면 됩니다.

### 주의사항

> ⚠️ 데이터베이스를 전환하면 **기존 데이터는 자동으로 마이그레이션되지 않습니다**.  
> 데이터 마이그레이션이 필요한 경우 별도로 백업 및 복원 작업이 필요합니다.

---

## 🔧 트러블슈팅

### 일반적인 문제

#### 1. "Unknown database" 오류
```bash
# 데이터베이스가 생성되지 않은 경우
# MySQL/MariaDB:
CREATE DATABASE myhome CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# PostgreSQL:
CREATE DATABASE myhome;
```

#### 2. 연결 거부 오류
```bash
# 데이터베이스 서비스 실행 확인
# MySQL:
sudo systemctl status mysql

# PostgreSQL:
sudo systemctl status postgresql

# MariaDB:
sudo systemctl status mariadb
```

#### 3. 권한 오류
```sql
-- MySQL/MariaDB
GRANT ALL PRIVILEGES ON myhome.* TO 'myhome'@'localhost';
FLUSH PRIVILEGES;

-- PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE myhome TO myhome;
```

#### 4. 인증 플러그인 오류 (MySQL)
```sql
-- MySQL 8.0 이상에서 발생할 수 있음
ALTER USER 'myhome'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### 성능 최적화

#### SQLite
```sql
-- WAL 모드 활성화 (기본 적용됨)
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

#### MySQL/MariaDB
```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 200
```

#### PostgreSQL
```conf
# /etc/postgresql/14/main/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
```

---

## 📊 데이터베이스 선택 가이드

| 기준 | SQLite | MySQL | MariaDB | PostgreSQL |
|------|--------|-------|---------|------------|
| **설치 복잡도** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **성능** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **동시 사용자** | ~10명 | ~100명 | ~100명 | ~500명 |
| **확장성** | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **메모리 사용** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ |

### 권장 사용 시나리오

- **개발/테스트**: SQLite
- **개인 블로그, 소규모 팀**: SQLite
- **중소규모 커뮤니티**: MySQL/MariaDB
- **대규모 서비스, 엔터프라이즈**: PostgreSQL

---

## 🔗 추가 자료

- [SQLite 공식 문서](https://sqlite.org/docs.html)
- [MySQL 공식 문서](https://dev.mysql.com/doc/)
- [MariaDB 공식 문서](https://mariadb.com/kb/en/)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [Sequelize 공식 문서](https://sequelize.org/)
