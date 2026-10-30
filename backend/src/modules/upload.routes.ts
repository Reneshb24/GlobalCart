import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { authenticateToken } from "../middleware/authenticate";

const router = Router();

// Locate uploads folder
const uploadsDir = fs.existsSync(path.resolve(__dirname, "../../uploads"))
  ? path.resolve(__dirname, "../../uploads")
  : path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { file, filename: originalFilename } = req.body;

    if (!file || typeof file !== "string") {
      res.status(400).json({ error: "Missing image file data" });
      return;
    }

    // Match data URI pattern: data:image/(png|jpeg|jpg|webp|gif|svg+xml);base64,...
    const matches = file.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({
        error: "Invalid image format. Expected base64 data URI (JPEG, PNG, WebP, GIF, SVG)"
      });
      return;
    }

    let ext = matches[1].toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    if (ext === "svg+xml") ext = "svg";

    const allowedExtensions = ["jpg", "png", "webp", "gif", "svg"];
    if (!allowedExtensions.includes(ext)) {
      res.status(400).json({
        error: `Unsupported image format (${ext}). Allowed: JPG, PNG, WebP, GIF, SVG.`
      });
      return;
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Max 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      res.status(400).json({ error: "File exceeds 10MB limit." });
      return;
    }

    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const cleanFilename = `gc-${uniqueSuffix}.${ext}`;
    const targetPath = path.join(uploadsDir, cleanFilename);

    await fs.promises.writeFile(targetPath, buffer);

    // Build URL
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "";
    const publicUrl = host ? `${proto}://${host}/uploads/${cleanFilename}` : `/uploads/${cleanFilename}`;

    res.status(201).json({
      success: true,
      url: publicUrl,
      filename: cleanFilename,
      size: buffer.length
    });
  } catch (error) {
    console.error("Image upload failed:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;
