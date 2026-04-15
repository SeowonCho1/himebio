import { Readable } from "stream";
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

export { isCloudinaryConfigured };
