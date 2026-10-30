import "dotenv/config";
import "./lib/dns-setup";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma";
import authRouter from "./modules/auth/auth.routes";
import categoryRouter from "./modules/catalog/category.routes";
import productRouter from "./modules/catalog/product.routes";
import checkoutRouter from "./modules/orders/checkout.routes";
import orderRouter from "./modules/orders/order.routes";
import addressRouter from "./modules/addresses/address.routes";
import cartRouter from "./modules/cart/cart.routes";
import adminRouter from "./modules/admin.routes";
import wishlistRouter from "./modules/wishlist/wishlist.routes";
import reviewRouter from "./modules/reviews/review.routes";
import returnsRouter from "./modules/returns.routes";
import offersRouter from "./modules/offers.routes";
import loyaltyRouter from "./modules/loyalty.routes";
import vendorRouter from "./modules/vendor/vendor.routes";
import uploadRouter from "./modules/upload.routes";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins =
  configuredOrigins.length > 0
    ? configuredOrigins
    : process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(cors({
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes("*") ||
      allowedOrigins.includes(origin) ||
      allowedOrigins.some((o) => origin.endsWith(o.replace(/^\*/, "")))
    ) {
      callback(null, true);
      return;
    }

    callback(null, false);
  }
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const staticUploadsDir = fs.existsSync(path.resolve(__dirname, "../uploads"))
  ? path.resolve(__dirname, "../uploads")
  : path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(staticUploadsDir)) {
  fs.mkdirSync(staticUploadsDir, { recursive: true });
}
app.use("/uploads", express.static(staticUploadsDir));

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again later."
  }
});

app.use("/api/auth/login", loginRateLimiter);


app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "GlobalCart API",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health/database", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      service: "GlobalCart API",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      status: "error",
      service: "GlobalCart API",
      database: "unavailable",
      timestamp: new Date().toISOString()
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/orders", orderRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/admin", adminRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/returns", returnsRouter);
app.use("/api/offers", offersRouter);
app.use("/api/loyalty", loyaltyRouter);
app.use("/api/vendor", vendorRouter);
app.use("/api/upload", uploadRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`GlobalCart API running at http://localhost:${port}`);
  });
}

export default app;
export { app };









