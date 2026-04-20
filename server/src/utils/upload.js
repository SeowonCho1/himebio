import { Readable } from "stream";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

function requestBaseUrl(req) {
  if (!req) return "";
  const proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();
  const host = (req.get("x-forwarded-host") || req.get("host") || "localhost").split(",")[0].trim();
  return `${proto}://${host}`;
}

export function isS3Configured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION &&
      process.env.S3_BUCKET
  );
}

let s3Client = null;
function getS3Client() {
  if (!isS3Configured()) return null;
  if (s3Client) return s3Client;
  const endpoint = process.env.S3_ENDPOINT?.trim();
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" || process.env.S3_FORCE_PATH_STYLE === "1",
        }
      : {}),
  });
  return s3Client;
}

/** 공개 GET이 가능한 객체 URL (버킷 정책·CloudFront 등은 콘솔에서 설정) */
function buildS3PublicUrl(key) {
  const custom = process.env.S3_PUBLIC_URL_BASE?.replace(/\/$/, "");
  const encodedPath = key.split("/").map(encodeURIComponent).join("/");
  if (custom) return `${custom}/${encodedPath}`;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedPath}`;
}

/** @param {Buffer} buffer @param {string} key S3 object key @param {string} contentType */
export async function uploadBufferToS3(buffer, key, contentType) {
  const client = getS3Client();
  if (!client) throw new Error("S3 is not configured");
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000",
    })
  );
  return buildS3PublicUrl(key);
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function configureCloudinary() {
  if (!isCloudinaryConfigured()) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return true;
}

/** @param {Buffer} buffer @param {string} folder */
export async function uploadBufferToCloudinary(buffer, folder = "bio-trade") {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary is not configured");
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err);
      else resolve(result?.secure_url);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
}

function extFromImageMime(mimetype) {
  if (mimetype === "image/png") return ".png";
  if (mimetype === "image/webp") return ".webp";
  if (mimetype === "image/gif") return ".gif";
  return ".jpg";
}

/** Cloudinary 미설정 시 로컬 디스크 저장. 반환: `/uploads/파일명` */
export async function saveUploadedImageLocally(buffer, mimetype) {
  const ext = extFromImageMime(mimetype);
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return `/uploads/${name}`;
}

const INQUIRY_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

/** 견적문의 첨부: 이미지 또는 PDF, `uploads/inquiries/` 저장 */
export async function saveInquiryAttachmentLocally(buffer, mimetype) {
  if (!INQUIRY_ALLOWED.has(mimetype)) {
    throw new Error("지원하지 않는 파일 형식입니다. (이미지, PDF)");
  }
  let ext = ".bin";
  if (mimetype === "image/png") ext = ".png";
  else if (mimetype === "image/webp") ext = ".webp";
  else if (mimetype === "image/gif") ext = ".gif";
  else if (mimetype.startsWith("image/")) ext = ".jpg";
  else if (mimetype === "application/pdf") ext = ".pdf";
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "uploads", "inquiries");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buffer);
  return `/uploads/inquiries/${name}`;
}

function s3KeyPrefix() {
  return (process.env.S3_UPLOAD_PREFIX || "bio-trade").replace(/^\/+|\/+$/g, "");
}

/**
 * 관리자 이미지 업로드. 우선순위: S3 → Cloudinary → 로컬(절대 URL)
 * @param {import("express").Request | undefined} req 로컬 저장 시 절대 URL 만들기용
 */
export async function storeAdminUpload(buffer, mimetype, req) {
  if (isS3Configured()) {
    const key = `${s3KeyPrefix()}/images/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extFromImageMime(mimetype)}`;
    return uploadBufferToS3(buffer, key, mimetype || "image/jpeg");
  }
  if (isCloudinaryConfigured()) return uploadBufferToCloudinary(buffer);
  const rel = await saveUploadedImageLocally(buffer, mimetype);
  const base = requestBaseUrl(req);
  return base ? `${base}${rel}` : rel;
}

/**
 * 견적문의 첨부(이미지·PDF). 우선순위: S3 → (이미지만 Cloudinary) → 로컬
 * @param {import("express").Request | undefined} req
 */
export async function storeInquiryUpload(buffer, mimetype, req) {
  if (!INQUIRY_ALLOWED.has(mimetype)) {
    throw new Error("지원하지 않는 파일 형식입니다. (이미지, PDF)");
  }
  if (isS3Configured()) {
    let ext = ".bin";
    if (mimetype === "image/png") ext = ".png";
    else if (mimetype === "image/webp") ext = ".webp";
    else if (mimetype === "image/gif") ext = ".gif";
    else if (mimetype.startsWith("image/")) ext = ".jpg";
    else if (mimetype === "application/pdf") ext = ".pdf";
    const key = `${s3KeyPrefix()}/inquiries/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    return uploadBufferToS3(buffer, key, mimetype);
  }
  if (isCloudinaryConfigured() && mimetype.startsWith("image/")) {
    return uploadBufferToCloudinary(buffer, "bio-trade/inquiries");
  }
  const rel = await saveInquiryAttachmentLocally(buffer, mimetype);
  const base = requestBaseUrl(req);
  return base ? `${base}${rel}` : rel;
}

export { isCloudinaryConfigured };
