# Railway 배포 가이드 (Node.js + 이 저장소)

이 프로젝트는 **저장소 루트**에서 `client`를 빌드한 뒤, **`server`** 가 API(`/api/*`)와 빌드된 React(`client/dist`)를 같은 호스트에서 제공합니다.

## 이미 준비된 파일

| 파일 | 역할 |
|------|------|
| `package.json` (루트) | `build`: client `npm ci` + `vite build` + server `npm ci` / `start`: server 기동 |
| `railway.toml` | Nixpacks 빌더, `npm start`, 헬스체크 `/api/health` |
| `server/src/index.js` | `NODE_ENV=production`일 때 `client/dist`가 있으면 정적 파일 + SPA 폴백 |
| `server/.env.example` | Railway에 넣을 환경 변수 목록 |

## 당신이 해야 할 일 (체크리스트)

### 1. Railway 프로젝트 생성

1. [Railway](https://railway.app) 로그인 → **New Project** → **Deploy from GitHub repo** (또는 CLI로 연결).
2. 이 저장소를 선택합니다.
3. **Settings → Root Directory**  
   - **비워 두기** (저장소 루트 = `package.json` + `railway.toml` 있는 폴더).  
   - `server`만 루트로 두면 클라이언트 빌드가 돌지 않으니, **루트 배포**를 권장합니다.

### 2. MongoDB

- **MongoDB Atlas**에서 클러스터 + DB 사용자 + Network Access(IP `0.0.0.0/0` 또는 Railway 고정 IP) 설정 후 **연결 문자열**을 복사합니다.  
  또는 Railway **MongoDB 플러그인**을 추가해 `MONGODB_URI`를 변수로 연결합니다.

### 3. 환경 변수 (Railway → Variables)

`server/.env.example`을 참고해 아래는 **반드시** 설정하세요.

| 변수 | 설명 |
|------|------|
| `MONGODB_URI` | Mongo 연결 문자열 |
| `JWT_SECRET` | 긴 랜덤 문자열 |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | 실제 사용자가 접속하는 **프론트 URL**(Railway 기본 도메인 또는 커스텀 도메인). CORS에 사용됩니다. 여러 개면 쉼표로 구분. |

**빌드 시점**(Railway Variables에 동일 이름으로 추가 — Build가 읽음):

| 변수 | 설명 |
|------|------|
| `VITE_API_BASE` | 같은 Railway 서비스에서 프론트+API를 같이 쓸 때 **`/api`** 권장 (절대 URL도 가능). |
| `VITE_SITE_URL` | 사이트 공개 URL (예: `https://xxx.up.railway.app`). SEO 스크립트·사이트맵 등에 사용. |

배포 URL을 모를 때: 첫 배포 후 Railway가 준 **공개 URL**을 복사해 `CLIENT_URL` / `VITE_SITE_URL`에 넣고, **Redeploy** 한 번 하면 클라이언트 빌드에 반영됩니다.

### 4. 포트

- Railway가 `PORT`를 주입합니다. 코드는 이미 `process.env.PORT`를 사용합니다. **별도로 PORT 고정할 필요 없음.**

### 5. 파일 업로드 (S3 권장)

- **Amazon S3**: `server/.env.example`의 `AWS_*`, `S3_BUCKET` 등을 설정하면 관리자 이미지·견적문의 첨부(이미지·PDF)가 **S3 우선**으로 올라갑니다. 버킷에 객체 읽기 정책(또는 CloudFront)을 맞추고, 필요하면 `S3_PUBLIC_URL_BASE`에 CDN URL을 넣으세요.  
- S3를 쓰지 않을 때만 **Cloudinary** → 그다음 로컬 `uploads/` 순입니다. Railway에서 로컬만 쓰면 재배포 시 파일이 사라질 수 있습니다.

### 6. 배포 후 확인

- 브라우저에서 `https://<your-domain>/api/health` → `{"ok":true}`  
- 같은 도메인 루트 `/` → 메인 페이지  
- `/admin/login` → 관리자 로그인 (DB 비어 있으면 서버가 기본 관리자를 만들 수 있음 — 운영 전 비밀번호 변경)

### 7. (선택) 커스텀 도메인

- Railway **Settings → Networking → Custom Domain**에서 도메인 연결 후, `CLIENT_URL` / `VITE_SITE_URL`을 해당 도메인으로 맞추고 재빌드합니다.

## 문제가 생기면

- **빌드 실패**: Railway 로그에서 `npm ci` / `vite build` 오류 확인. Node 버전은 루트 `package.json`의 `engines.node` 참고.
- **화면은 뜨는데 API만 실패**: `VITE_API_BASE`가 빌드에 반영됐는지, `CLIENT_URL` CORS가 브라우저 주소와 맞는지 확인.
- **SPA 새로고침 404**: 루트 배포 + `NODE_ENV=production` + `client/dist` 존재 여부 확인 (빌드 로그에 `client/dist` 생성 확인).
