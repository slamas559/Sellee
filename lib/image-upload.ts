/**
 * Server-side image validation for vendor uploads.
 *
 * The browser-supplied filename and Content-Type can't be trusted, so we read
 * the file's real signature (magic bytes) and derive the extension and
 * Content-Type ourselves. Anything that isn't a real image is rejected.
 */

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export type DetectedImage = { contentType: string; extension: string };

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function detectImageType(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { contentType: "image/jpeg", extension: "jpg" };

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", extension: "png" };
  }

  // GIF: "GIF87a" / "GIF89a"
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return { contentType: "image/gif", extension: "gif" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { contentType: "image/webp", extension: "webp" };
  }

  // AVIF: ISO-BMFF box "ftyp" at byte 4 with brand "avif" / "avis"
  if (
    startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4) &&
    (startsWith(bytes, [0x61, 0x76, 0x69, 0x66], 8) || startsWith(bytes, [0x61, 0x76, 0x69, 0x73], 8))
  ) {
    return { contentType: "image/avif", extension: "avif" };
  }

  return null;
}

/** Reads a File, checks size + real image type, and returns bytes ready to upload. */
export async function readValidatedImage(
  file: File,
): Promise<DetectedImage & { buffer: Buffer }> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError("Image is too large. Max 10MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageType(buffer);
  if (!detected) {
    throw new ImageValidationError("Unsupported file. Upload a JPG, PNG, WebP, GIF or AVIF image.");
  }

  return { ...detected, buffer };
}
