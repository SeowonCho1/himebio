# 바이오 시약 무역 — 웹 (클라이언트 + API)

공개 사이트(소개·제품·공지·이벤트·참고논문·견적문의)와 관리자 CRUD, 사이트 설정(로고·푸터 등)을 포함한 풀스택 예제 프로젝트입니다.

## 구성

| 경로 | 설명 |
|------|------|
| `client/` | React 19 + Vite + Tailwind — 사용자 화면·관리자 UI (`src/App.jsx` 중심) |
| `server/` | Express + MongoDB(Mongoose) + JWT — REST API |

## 사전 요구

- **Node.js** 20 이상 권장  
- **MongoDB** (로컬 또는 Atlas 등)

## 빠른 시작

### 1. 저장소 클론 후 의존성 설치

```bash
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 2. 서버 환경 변수

`server/.env` 파일을 만들고 `server/.env.example`을 참고해 채웁니다.

```bash
copy server\.env.example server\.env
```

**Git에 올리면 안 되는 값**: `MONGODB_URI`, `JWT_SECRET`, SMTP·Cloudinary 키, 실제 `CLIENT_URL` 등.  
저장소에는 **`.env.example`만** 두고, 실제 비밀은 로컬 `server/.env`에만 두세요.

### 3. 실행 (터미널 두 개)

API 서버:

```bash
cd server
npm run dev
```

기본 포트는 `4000`입니다 (`PORT`로 변경 가능).

프론트:

```bash
cd client
npm run dev
```

Vite 기본은 `5173`입니다. API 주소는 `client/src/lib/api.js`의 `VITE_API_BASE` 또는 기본값 `http://localhost:4000/api`를 사용합니다.

### 4. 기본 관리자 (DB가 비어 있을 때 서버가 한 번 생성)

이메일 `admin@example.com` / 비밀번호 `admin1234` — **운영 전에 반드시 변경**하세요.

## npm 스크립트 요약

**server**

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | `node --watch`로 개발 서버 |
| `npm start` | 프로덕션 실행 |
| `npm run seed` | 시드 데이터 삽입 |
| `npm run clean-data` | 콘텐츠 위주 삭제(관리자·사이트 설정 유지 등은 스크립트 내용 확인) |

**client**

| 스크립트 | 설명 |
|----------|------|
| `npm run dev` | Vite 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`prebuild`로 SEO 스크립트 실행) |
| `npm run preview` | 빌드 결과 미리보기 |

## Git에 넣지 말아야 할 것

`.gitignore`에 이미 포함된 예시입니다.

- **`server/.env`**, 루트·클라이언트의 **`.env` / `.env.local`** — 비밀·URI
- **`node_modules/`** — `npm install`로 재생성
- **`client/dist/`** — `npm run build` 산출물
- 로그·OS·IDE 캐시 등

**커밋해도 되는 것**: `server/.env.example`, 소스, `package-lock.json` 등.

## 라이선스

프로젝트 용도에 맞게 자유롭게 수정해 사용하시면 됩니다.
