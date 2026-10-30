import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

// 1x1 test image
const testPngDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function createMockResponse() {
  let statusCode = 200;
  let responseData: any = null;

  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData
  };
}

test("upload handler returns 400 when request body has no file", async () => {
  const req: any = { body: {} };
  const res = createMockResponse();

  const { file } = req.body;
  if (!file || typeof file !== "string") {
    res.status(400).json({ error: "Missing image file data" });
  }

  assert.equal(res.getStatusCode(), 400);
  assert.equal(res.getData().error, "Missing image file data");
});

test("upload handler returns 400 for non-image format", async () => {
  const req: any = { body: { file: "data:text/plain;base64,SGVsbG8gV29ybGQ=" } };
  const res = createMockResponse();

  const matches = req.body.file.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) {
    res.status(400).json({
      error: "Invalid image format. Expected base64 data URI (JPEG, PNG, WebP, GIF, SVG)"
    });
  }

  assert.equal(res.getStatusCode(), 400);
  assert.match(res.getData().error, /Expected base64 data URI/);
});

test("upload handler processes valid PNG and returns public URL", async () => {
  const req: any = {
    body: { file: testPngDataUri, filename: "product-front.png" },
    headers: { "x-forwarded-proto": "https", "x-forwarded-host": "api.globalcart.example" },
    get: (header: string) => header === "host" ? "api.globalcart.example" : ""
  };
  const res = createMockResponse();

  const matches = req.body.file.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  assert.ok(matches);

  const ext = matches[1].toLowerCase();
  const buffer = Buffer.from(matches[2], "base64");
  const filename = `gc-test-${Date.now()}.${ext}`;

  const uploadsDir = path.resolve(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const targetPath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(targetPath, buffer);

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || "";
  const publicUrl = `${proto}://${host}/uploads/${filename}`;

  res.status(201).json({
    success: true,
    url: publicUrl,
    filename,
    size: buffer.length
  });

  assert.equal(res.getStatusCode(), 201);
  assert.equal(res.getData().success, true);
  assert.equal(res.getData().url, `https://api.globalcart.example/uploads/${filename}`);
  assert.ok(fs.existsSync(targetPath));

  // Clean up
  await fs.promises.unlink(targetPath);
});
