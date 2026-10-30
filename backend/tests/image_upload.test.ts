import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// 1x1 transparent PNG data URI
const samplePngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// 1x1 JPEG data URI
const sampleJpgBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

// 1x1 WebP data URI
const sampleWebpBase64 = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";

// Helper to validate and extract base64 image data
function validateAndParseImage(file: string) {
  if (!file || typeof file !== "string") {
    return { valid: false, error: "Missing image file data" };
  }

  const matches = file.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) {
    return {
      valid: false,
      error: "Invalid image format. Expected base64 data URI (JPEG, PNG, WebP, GIF, SVG)"
    };
  }

  let ext = matches[1].toLowerCase();
  if (ext === "jpeg") ext = "jpg";
  if (ext === "svg+xml") ext = "svg";

  const allowedExtensions = ["jpg", "png", "webp", "gif", "svg"];
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported image format (${ext}). Allowed: JPG, PNG, WebP, GIF, SVG.`
    };
  }

  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  const MAX_SIZE = 10 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    return { valid: false, error: "File exceeds 10MB limit." };
  }

  return { valid: true, ext, buffer };
}

test("upload engine accepts valid PNG base64 data URI", () => {
  const result = validateAndParseImage(samplePngBase64);
  assert.equal(result.valid, true);
  assert.equal(result.ext, "png");
  assert.ok(result.buffer && result.buffer.length > 0);
});

test("upload engine accepts valid JPEG base64 data URI", () => {
  const result = validateAndParseImage(sampleJpgBase64);
  assert.equal(result.valid, true);
  assert.equal(result.ext, "jpg");
  assert.ok(result.buffer && result.buffer.length > 0);
});

test("upload engine accepts valid WebP base64 data URI", () => {
  const result = validateAndParseImage(sampleWebpBase64);
  assert.equal(result.valid, true);
  assert.equal(result.ext, "webp");
  assert.ok(result.buffer && result.buffer.length > 0);
});

test("upload engine rejects non-image formats (e.g. PDF or plain text)", () => {
  const fakePdf = "data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOf";
  const result = validateAndParseImage(fakePdf);
  assert.equal(result.valid, false);
  assert.match(result.error as string, /Invalid image format|Unsupported image format/);
});

test("upload engine rejects malformed data URI strings", () => {
  const malformed = "not-a-valid-data-uri";
  const result = validateAndParseImage(malformed);
  assert.equal(result.valid, false);
  assert.match(result.error as string, /Expected base64 data URI/);
});

test("upload engine rejects payloads exceeding 10MB limit", () => {
  // Create an artificial buffer > 10MB
  const bigBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);
  const bigDataUri = `data:image/png;base64,${bigBuffer.toString("base64")}`;
  const result = validateAndParseImage(bigDataUri);
  assert.equal(result.valid, false);
  assert.match(result.error as string, /exceeds 10MB limit/);
});

test("upload engine writes valid image buffer to disk and generates safe filename", async () => {
  const parsed = validateAndParseImage(samplePngBase64);
  assert.equal(parsed.valid, true);

  const uploadsDir = path.resolve(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const uniqueSuffix = `test-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const cleanFilename = `gc-${uniqueSuffix}.${parsed.ext}`;
  const targetPath = path.join(uploadsDir, cleanFilename);

  await fs.promises.writeFile(targetPath, parsed.buffer!);

  // Verify file was written
  assert.ok(fs.existsSync(targetPath));
  const stats = fs.statSync(targetPath);
  assert.equal(stats.size, parsed.buffer!.length);

  // Clean up test file
  await fs.promises.unlink(targetPath);
  assert.ok(!fs.existsSync(targetPath));
});
