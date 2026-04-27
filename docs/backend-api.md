# Backend API 정리 (유지보수용)

생성일: 2026-04-27  
기준 코드: `server/src/index.js`, `server/src/routes/public.js`

## 공통 규칙

| 항목 | 값 |
|---|---|
| Base URL | `/api` |
| 인증 | Public API는 무인증, Admin API는 `Authorization: Bearer <token>` |
| 페이징 | `page`(기본 1), `limit`(기본 10/12, 최대 50) |
| 에러 형식 | `{ "error": "메시지" }` |
| JSON Body Limit | 2MB |

## 전체 엔드포인트 요약

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/health` | 없음 | 헬스체크 |
| POST | `/api/inquiry-upload` | 없음 | 문의 첨부파일 업로드(이미지/PDF) |
| POST | `/api/admin/login` | 없음 | 관리자 로그인 |
| GET | `/api/site-settings` | 없음 | 사이트 설정 조회 |
| GET | `/api/banners` | 없음 | 활성 배너 목록 |
| GET | `/api/popups/active` | 없음 | 활성 팝업 목록 |
| GET | `/api/partners` | 없음 | 파트너 목록 |
| GET | `/api/product-categories` | 없음 | 공개 제품 분류 트리 |
| GET | `/api/products` | 없음 | 제품 목록 |
| GET | `/api/products/:id` | 없음 | 제품 상세 |
| GET | `/api/boards/:slug` | 없음 | 게시판 메타 |
| GET | `/api/boards/:slug/posts` | 없음 | 게시글 목록 |
| GET | `/api/boards/:slug/posts/:id` | 없음 | 게시글 상세(조회수 증가) |
| GET | `/api/notices` | 없음 | 공지 목록 별칭 |
| GET | `/api/notices/:id` | 없음 | 공지 상세 별칭 |
| GET | `/api/events` | 없음 | 이벤트 목록 별칭 |
| GET | `/api/events/:id` | 없음 | 이벤트 상세 별칭 |
| GET | `/api/references` | 없음 | 참고논문 목록 별칭 |
| GET | `/api/references/:id` | 없음 | 참고논문 상세 별칭 |
| POST | `/api/inquiries` | 없음 | 문의 등록 |
| POST | `/api/visits` | 없음 | 방문 집계 저장 |
| GET | `/api/admin/banners` | Admin | 배너 목록 |
| POST | `/api/admin/banners` | Admin | 배너 생성 |
| PUT | `/api/admin/banners/:id` | Admin | 배너 수정 |
| DELETE | `/api/admin/banners/:id` | Admin | 배너 삭제 |
| GET | `/api/admin/popups` | Admin | 팝업 목록 |
| POST | `/api/admin/popups` | Admin | 팝업 생성 |
| PUT | `/api/admin/popups/:id` | Admin | 팝업 수정 |
| DELETE | `/api/admin/popups/:id` | Admin | 팝업 삭제 |
| GET | `/api/admin/partners` | Admin | 파트너 목록 |
| POST | `/api/admin/partners` | Admin | 파트너 생성 |
| PUT | `/api/admin/partners/:id` | Admin | 파트너 수정 |
| DELETE | `/api/admin/partners/:id` | Admin | 파트너 삭제 |
| GET | `/api/admin/products` | Admin | 제품 목록 |
| GET | `/api/admin/products/:id` | Admin | 제품 상세 |
| POST | `/api/admin/products` | Admin | 제품 생성 |
| PUT | `/api/admin/products/:id` | Admin | 제품 수정 |
| DELETE | `/api/admin/products/:id` | Admin | 제품 삭제 |
| GET | `/api/admin/product-categories` | Admin | 분류 목록/트리 |
| POST | `/api/admin/product-categories` | Admin | 분류 생성 |
| PUT | `/api/admin/product-categories/:id` | Admin | 분류 수정 |
| DELETE | `/api/admin/product-categories/:id` | Admin | 분류 삭제 |
| GET | `/api/admin/boards` | Admin | 게시판 목록 |
| POST | `/api/admin/boards` | Admin | 게시판 생성 |
| PUT | `/api/admin/boards/:id` | Admin | 게시판 수정 |
| DELETE | `/api/admin/boards/:id` | Admin | 게시판 삭제 |
| GET | `/api/admin/board-posts` | Admin | 게시글 목록 |
| GET | `/api/admin/board-posts/:id` | Admin | 게시글 상세 |
| POST | `/api/admin/board-posts` | Admin | 게시글 생성 |
| PUT | `/api/admin/board-posts/:id` | Admin | 게시글 수정 |
| DELETE | `/api/admin/board-posts/:id` | Admin | 게시글 삭제 |
| GET | `/api/admin/inquiries` | Admin | 문의 목록 |
| GET | `/api/admin/inquiries/:id` | Admin | 문의 상세 |
| PATCH | `/api/admin/inquiries/:id/status` | Admin | 문의 상태 변경 |
| POST | `/api/admin/upload` | Admin | 관리자 이미지 업로드 |
| GET | `/api/admin/site-settings` | Admin | 사이트 설정 조회 |
| PUT | `/api/admin/site-settings` | Admin | 사이트 설정 수정 |
| GET | `/api/admin/system-admins` | Admin | 관리자 계정 목록 |
| POST | `/api/admin/system-admins` | Admin | 관리자 계정 생성 |
| DELETE | `/api/admin/system-admins/:id` | Admin | 관리자 계정 삭제 |
| GET | `/api/admin/analytics/summary` | Admin | 방문 통계 요약 |

---

## POST/PUT/PATCH 상세 파라미터 표

### 1) 인증/업로드

#### `POST /api/admin/login`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| email | string | Y | 관리자 이메일 |
| password | string | Y | 비밀번호 |

응답: `{ token, admin: { id, email, name } }`

#### `POST /api/inquiry-upload` (multipart/form-data)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| file | file | Y | 이미지 또는 PDF, 최대 10MB |

#### `POST /api/admin/upload` (multipart/form-data)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| file | file | Y | 이미지 파일, 최대 5MB |

---

### 2) Public 작성 API

#### `POST /api/inquiries`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| inquirerType | string | Y | `USER` 또는 `DEALER` |
| affiliation | string | Y | 소속(회사/기관) |
| name | string | Y | 이름 |
| phone | string | Y | 연락처 |
| email | string | Y | 이메일(형식 검증) |
| brand | string | Y | 브랜드 |
| catalogNumber | string | Y | 카탈로그 번호 |
| productName | string | Y | 제품명 |
| quantity | string | N | 수량 |
| message | string | N | 문의 내용 |
| howHeard | string | N | 유입경로 enum |
| howHeardOther | string | N | `howHeard=OTHER`일 때 사용 |
| attachmentUrl | string | N | 업로드 파일 URL |
| productId | string(ObjectId) | N | 제품 ID |
| privacyAgreed | boolean | Y | `true` 필수 |

성공 응답: `201 { ok: true, id }`

#### `POST /api/visits`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| visitorId | string | Y | 브라우저 고유 방문자 키(최대 80자) |
| path | string | N | 방문 경로(기본 `/`) |

성공 응답: `204 No Content`

---

### 3) Admin 제품 관리

#### `POST /api/admin/products`
#### `PUT /api/admin/products/:id`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| name | string | Y | 제품명 |
| productNumber | string | N | 제품 번호 |
| category | string | N | 제품 타입(MANUFACTURER/SYNTHESIS) |
| categoryId | string(ObjectId/null) | N | 분류 ID |
| category2Id | string(ObjectId/null) | N | 분류2 ID |
| partnerId | string(ObjectId) | N | 파트너 ID |
| thumbnailUrl | string | N | 썸네일 URL |
| imageUrl | string | N | 대표 이미지 URL |
| shortDescription | string | N | 짧은 설명 |
| contentHtml | string | N | 상세 본문 HTML |
| featuresHtml | string | N | FEATURES HTML |
| applicationHtml | string | N | APPLICATION HTML |
| componentsHtml | string | N | COMPONENTS HTML |
| shippingStorageHtml | string | N | SHIPPING AND STORAGE HTML |
| dataHtml | string | N | DATA HTML |
| downloadHtml | string | N | DOWNLOAD HTML |
| specification | string | N | 규격 텍스트 |
| isRecommended | boolean | N | 추천 표시 |
| isNew | boolean | N | 신상품 표시 |
| isActive | boolean | N | 활성 여부 |

참고:
- `categoryId`, `category2Id`는 서버 검증 수행
- 응답에 `categoryPath`, `category2Path` 포함

---

### 4) Admin 제품 분류 관리

#### `POST /api/admin/product-categories`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| name | string | Y | 분류명 |
| parentId | string(ObjectId/null) | N | 상위 분류 |
| sortOrder | number | N | 정렬순서 |
| scope | string | N | `PRODUCTS` / `SYNTHESIS` / `BOTH` |
| isActive | boolean | N | 활성 여부 |

#### `PUT /api/admin/product-categories/:id`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| name | string | N | 분류명 |
| parentId | string(ObjectId/null) | N | 상위 분류 변경 |
| sortOrder | number | N | 정렬순서 |
| scope | string | N | scope 변경(하위에 전파) |
| isActive | boolean | N | 활성 여부 |

삭제 제약:
- 하위 분류 존재 시 삭제 불가
- 제품에서 사용 중이면 삭제 불가
- 최대 깊이 4단계

---

### 5) Admin 게시판 / 게시글

#### `POST /api/admin/boards`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| slug | string | Y | 소문자/숫자/하이픈, 2~50자 |
| title | string | Y | 게시판명 |
| subtitle | string | N | 부제목 |
| displayType | string | N | BoardDisplayType 값 |
| showSearch | boolean | N | 검색 UI 노출 |
| sortOrder | number | N | 정렬순서 |
| isActive | boolean | N | 활성 여부 |

#### `PUT /api/admin/boards/:id`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| title | string | N | 게시판명 |
| subtitle | string | N | 부제목 |
| displayType | string | N | 표시 타입 |
| showSearch | boolean | N | 검색 UI 노출 |
| sortOrder | number | N | 정렬순서 |
| isActive | boolean | N | 활성 여부 |

#### `POST /api/admin/board-posts`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| boardId | string(ObjectId) | Y | 게시판 ID |
| title | string | Y | 제목 |
| summary | string | N | 요약 |
| content | string | N | 본문 |
| thumbnailUrl | string | N | 썸네일 URL |
| isImportant | boolean | N | 중요글 |
| isActive | boolean | N | 활성 여부 |
| startAt | datetime string | N | 시작일 |
| endAt | datetime string | N | 종료일 |
| forceEnded | boolean | N | 강제 종료 |
| youtubeUrl | string | N | 유튜브 링크 |

#### `PUT /api/admin/board-posts/:id`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| boardId | string(ObjectId) | N | 게시판 변경 |
| title | string | N | 제목 |
| summary | string | N | 요약 |
| content | string | N | 본문 |
| thumbnailUrl | string | N | 썸네일 URL |
| isImportant | boolean | N | 중요글 |
| isActive | boolean | N | 활성 여부 |
| startAt | datetime string/null | N | 시작일(빈값 가능) |
| endAt | datetime string/null | N | 종료일(빈값 가능) |
| forceEnded | boolean | N | 강제 종료 |
| youtubeUrl | string | N | 유튜브 링크 |

---

### 6) Admin 문의 / 사이트설정 / 관리자

#### `PATCH /api/admin/inquiries/:id/status`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| status | string | Y | `InquiryStatus` enum 값 |

#### `PUT /api/admin/site-settings`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| headerLogoUrl | string | N | 헤더 로고 |
| footerLogoUrl | string | N | 푸터 로고 |
| companyName | string | N | 회사명 |
| footerTopBar | string | N | 푸터 상단 문구 |
| copyrightText | string | N | 카피라이트 |
| showFooterAddress | boolean | N | 주소 노출 여부 |
| address | string | N | 주소 |
| tel | string | N | 전화번호 |
| fax | string | N | 팩스 |
| email | string | N | 이메일 |
| businessRegistrationNumber | string | N | 사업자번호 |
| termsTitle | string | N | 약관명 |
| termsUrl | string | N | 약관 링크 |
| privacyTitle | string | N | 개인정보처리방침명 |
| privacyUrl | string | N | 개인정보처리방침 링크 |

#### `POST /api/admin/system-admins`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| email | string | Y | 로그인 이메일(중복 불가) |
| password | string | Y | 평문 입력 -> 서버 해시 저장 |
| name | string | N | 관리자 이름 |

삭제 제약:
- `DELETE /api/admin/system-admins/:id`는 본인 삭제 불가
- 마지막 관리자 1명은 삭제 불가

---

## 운영 시 자주 보는 응답 필드

| API | 핵심 응답 |
|---|---|
| 목록형 API | `items`, `total`, `page`, `limit`, `hasMore` |
| 제품 상세 | `categoryPath`, `category2Path` |
| 통계 | `todayVisitors`, `thisMonthUniqueVisitors`, `todayPageViews`, `totalPageViews` |
| 문의 등록 | `{ ok: true, id }` |

## 유지보수 체크리스트

| 체크 항목 | 확인 내용 |
|---|---|
| 신규 필드 추가 | 모델 + Admin POST/PUT + Public 응답까지 반영했는지 |
| enum 변경 | 클라이언트 옵션값과 서버 검증값 동기화 |
| 파일 업로드 | MIME/용량 제한, 저장소 오류 처리 |
| 페이징 API | `limit` 상한(50)과 기본값 유지 |
| 권한 | Admin 라우트에 `authAdmin` 누락 없는지 |

