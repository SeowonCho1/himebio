/**
 * S3 PutObject 스모크 테스트
 * 실행: cd server && npm run test:s3
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { isS3Configured, uploadBufferToS3 } = await import("../src/utils/upload.js");

async function main() {
  if (!isS3Configured()) {
    console.error("S3 미설정: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET를 server/.env에 넣어 주세요.");
    process.exit(1);
  }

  const prefix = (process.env.S3_UPLOAD_PREFIX || "bio-trade").replace(/^\/+|\/+$/g, "");
  const key = `${prefix}/self-tests/${Date.now()}-upload-test.txt`;
  const body = Buffer.from(`S3 self-test\nUTC ${new Date().toISOString()}\n`, "utf8");

  console.log("PutObject 시도…", { region: process.env.AWS_REGION, bucket: process.env.S3_BUCKET, key });
  const url = await uploadBufferToS3(body, key, "text/plain; charset=utf-8");
  console.log("PutObject 성공");
  console.log("객체 URL:", url);

  try {
    const res = await fetch(url, { method: "GET" });
    const text = res.status === 200 ? await res.text() : "";
    console.log("GET 응답:", res.status, res.status === 200 ? `본문 ${text.length}바이트` : "(403 등이면 버킷 퍼블릭 읽기 정책 또는 CloudFront 확인)");
    if (res.status === 200 && !text.includes("S3 self-test")) {
      console.log("경고: 응답 본문이 예상과 다를 수 있음");
    }
  } catch (e) {
    console.log("GET 확인 스킵(네트워크):", e.message);
  }
}

main().catch((e) => {
  console.error("실패:", e.name, e.message);
  if (e.$metadata) console.error("AWS metadata:", e.$metadata);
  process.exit(1);
});
