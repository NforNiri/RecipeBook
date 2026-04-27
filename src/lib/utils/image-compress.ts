"use client";

import imageCompression from "browser-image-compression";

const MAX_MB = 5;
const TARGET_MB = 1;
const MAX_DIMENSION = 1920;

/**
 * Validates that a file is under 5 MB, then compresses it client-side
 * if it is larger than 1 MB before returning the (possibly smaller) File.
 * Throws a user-facing Error string if the file is too large.
 */
export async function validateAndCompressImage(file: File): Promise<File> {
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB > MAX_MB) {
    throw new Error(
      `Image must be under ${MAX_MB} MB. Your file is ${sizeMB.toFixed(1)} MB — please reduce it before uploading.`
    );
  }

  if (sizeMB > TARGET_MB) {
    const compressed = await imageCompression(file, {
      maxSizeMB: TARGET_MB,
      maxWidthOrHeight: MAX_DIMENSION,
      useWebWorker: true,
      // Preserve the original file type where possible
      fileType: file.type as "image/jpeg" | "image/png" | "image/webp",
    });
    return compressed;
  }

  return file;
}
