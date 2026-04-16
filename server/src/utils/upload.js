import { Readable } from "stream";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

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

/** Cloudinary 미설정 시 로컬 디스크 저장. 반환: `/uploads/파일명` */
export async function saveUploadedImageLocally(buffer, mimetype) {
  const ext =
    mimetype === "image/png" ? ".png" : mimetype === "image/webp" ? ".webp" : mimetype === "image/gif" ? ".gif" : ".jpg";
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

export { isCloudinaryConfigured };
