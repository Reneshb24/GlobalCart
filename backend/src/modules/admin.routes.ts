import { randomUUID } from "node:crypto";
import { Router } from "express";
import { Prisma } from "../generated/prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";

const adminRouter = Router();

adminRouter.use(authenticateToken, requireAdmin);

const uuidSchema = z.string().uuid();

const productCreateSchema = z.object({
  sku: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(10000),
  brand: z.string().trim().max(100).nullable().optional(),
  price: z.number().finite().min(0).max(9999999999),
  currency: z.string().trim().length(3).transform(v => v.toUpperCase()).default("USD"),
  categoryId: z.string().uuid(),
  vendorId: z.string().uuid().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  imageUrl: z.string().url().max(2000).or(z.literal("")).nullable().optional(),
  images: z.array(z.object({
    url: z.string().url().max(2000),
    altText: z.string().max(200).optional(),
    position: z.number().int().min(0).max(10).optional()
  })).optional(),
  imageUrls: z.array(z.string().url().max(2000).or(z.literal(""))).optional(),
  initialQuantity: z.number().int().min(0).max(1000000).optional(),
  warehouseId: z.string().uuid().nullable().optional()
});

const productUpdateSchema = productCreateSchema.partial()
  .refine(value => Object.keys(value).length > 0, {
    message: "Provide at least one product field to update"
  });

const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(170)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().default(true)
});

const categoryUpdateSchema = categoryCreateSchema.partial()
  .refine(value => Object.keys(value).length > 0, {
    message: "Provide at least one category field to update"
  });

const inventoryAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  delta: z.number().int().min(-1000000).max(1000000)
    .refine(value => value !== 0, "delta cannot be zero")
});

function validationError(res: import("express").Response, error: z.ZodError) {
  res.status(400).json({
    error: "Invalid request",
    details: error.issues.map(issue => ({
      field: issue.path.join("."),
      message: issue.message
    }))
  });
}

function handleWriteError(res: import("express").Response, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({ error: "A record with a conflicting unique value already exists" });
      return;
    }
    if (error.code === "P2003") {
      res.status(400).json({ error: "A referenced record does not exist" });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
  }

  console.error("Admin operation failed:", error);
  res.status(500).json({ error: "Unable to complete administrator operation" });
}

// -------------------- PRODUCTS --------------------

adminRouter.get("/products", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, name: true } },
        images: {
          select: { id: true, url: true, altText: true, position: true },
          orderBy: { position: "asc" }
        },
        inventory: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, isActive: true } }
          }
        }
      }
    });
    res.json({ products });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/products", async (req, res) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;

    // Collect all 4 angle images
    const imageList: { url: string; altText: string; position: number }[] = [];
    if (input.images && input.images.length > 0) {
      input.images.forEach((img, idx) => {
        if (img.url && img.url.trim()) {
          imageList.push({
            url: img.url.trim(),
            altText: img.altText || `${input.name} view ${idx + 1}`,
            position: img.position !== undefined ? img.position : idx
          });
        }
      });
    } else if (input.imageUrls && input.imageUrls.length > 0) {
      input.imageUrls.forEach((url, idx) => {
        if (url && url.trim()) {
          imageList.push({
            url: url.trim(),
            altText: `${input.name} view ${idx + 1}`,
            position: idx
          });
        }
      });
    } else if (input.imageUrl && input.imageUrl.trim()) {
      imageList.push({
        url: input.imageUrl.trim(),
        altText: input.name,
        position: 0
      });
    }

    const product = await prisma.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        slug: input.slug,
        description: input.description,
        brand: input.brand ?? null,
        price: new Prisma.Decimal(input.price),
        currency: input.currency,
        categoryId: input.categoryId,
        vendorId: input.vendorId ?? null,
        status: input.status,
        ...(imageList.length > 0 ? {
          images: {
            create: imageList
          }
        } : {})
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, name: true } },
        images: {
          select: { id: true, url: true, altText: true, position: true },
          orderBy: { position: "asc" }
        },
        inventory: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, isActive: true } }
          }
        }
      }
    });

    // If initialQuantity is provided with warehouseId, create inventory record
    if (input.initialQuantity !== undefined && input.initialQuantity > 0 && input.warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: input.warehouseId }
      });
      if (warehouse && warehouse.isActive) {
        await prisma.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: product.id,
              warehouseId: input.warehouseId
            }
          },
          update: {
            quantity: input.initialQuantity
          },
          create: {
            productId: product.id,
            warehouseId: input.warehouseId,
            quantity: input.initialQuantity,
            reserved: 0
          }
        });
      }
    }

    res.status(201).json({ product });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/products/:productId", async (req, res) => {
  if (!uuidSchema.safeParse(req.params.productId).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;
    const data: Prisma.ProductUpdateInput = {
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.brand !== undefined ? { brand: input.brand } : {}),
      ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.categoryId !== undefined ? {
        category: { connect: { id: input.categoryId } }
      } : {}),
      ...(input.vendorId !== undefined ? {
        vendor: input.vendorId === null
          ? { disconnect: true }
          : { connect: { id: input.vendorId } }
      } : {})
    };

    // Update images if provided
    const updateImages: { url: string; altText: string; position: number }[] = [];
    if (input.images && input.images.length > 0) {
      input.images.forEach((img, idx) => {
        if (img.url && img.url.trim()) {
          updateImages.push({
            url: img.url.trim(),
            altText: img.altText || `${input.name || "Product"} view ${idx + 1}`,
            position: img.position !== undefined ? img.position : idx
          });
        }
      });
    } else if (input.imageUrls && input.imageUrls.length > 0) {
      input.imageUrls.forEach((url, idx) => {
        if (url && url.trim()) {
          updateImages.push({
            url: url.trim(),
            altText: `${input.name || "Product"} view ${idx + 1}`,
            position: idx
          });
        }
      });
    } else if (input.imageUrl !== undefined && input.imageUrl !== null && input.imageUrl.trim()) {
      updateImages.push({
        url: input.imageUrl.trim(),
        altText: input.name || "Product",
        position: 0
      });
    }

    if (updateImages.length > 0) {
      await prisma.productImage.deleteMany({
        where: { productId: req.params.productId }
      });
      await prisma.productImage.createMany({
        data: updateImages.map(img => ({
          productId: req.params.productId,
          url: img.url,
          altText: img.altText,
          position: img.position
        }))
      });
    }

    const product = await prisma.product.update({
      where: { id: req.params.productId },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, name: true } },
        images: {
          select: { id: true, url: true, altText: true, position: true },
          orderBy: { position: "asc" }
        },
        inventory: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, isActive: true } }
          }
        }
      }
    });

    // If initialQuantity is provided with warehouseId, update or create inventory record
    if (input.initialQuantity !== undefined && input.warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: input.warehouseId }
      });
      if (warehouse && warehouse.isActive) {
        await prisma.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: req.params.productId,
              warehouseId: input.warehouseId
            }
          },
          update: {
            quantity: input.initialQuantity
          },
          create: {
            productId: req.params.productId,
            warehouseId: input.warehouseId,
            quantity: input.initialQuantity,
            reserved: 0
          }
        });
      }
    }

    res.json({ product });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/products/:productId/archive", async (req, res) => {
  if (!uuidSchema.safeParse(req.params.productId).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const product = await prisma.product.update({
      where: { id: req.params.productId },
      data: { status: "ARCHIVED" },
      select: { id: true, name: true, slug: true, status: true }
    });
    res.json({ message: "Product archived", product });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- CATEGORIES --------------------

adminRouter.get("/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true, products: true } }
      }
    });
    res.json({ categories });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/categories", async (req, res) => {
  const parsed = categoryCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;
    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        isActive: input.isActive
      }
    });
    res.status(201).json({ category });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/categories/:categoryId", async (req, res) => {
  if (!uuidSchema.safeParse(req.params.categoryId).success) {
    res.status(400).json({ error: "Invalid category ID" });
    return;
  }

  const parsed = categoryUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;
    if (input.parentId === req.params.categoryId) {
      res.status(400).json({ error: "A category cannot be its own parent" });
      return;
    }

    const category = await prisma.category.update({
      where: { id: req.params.categoryId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {})
      }
    });
    res.json({ category });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- INVENTORY --------------------

adminRouter.get("/inventory", async (_req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      orderBy: [{ warehouseId: "asc" }, { productId: "asc" }],
      include: {
        product: { select: { id: true, sku: true, name: true, status: true } },
        warehouse: { select: { id: true, code: true, name: true, isActive: true } }
      }
    });

    res.json({
      inventory: inventory.map(row => ({
        ...row,
        available: Math.max(0, row.quantity - row.reserved)
      }))
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/inventory/adjust", async (req, res) => {
  const parsed = inventoryAdjustmentSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  const { productId, warehouseId, delta } = parsed.data;

  try {
    const result = await prisma.$transaction(async tx => {
      const row = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId }
        },
        include: {
          product: { select: { id: true, sku: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true, isActive: true } }
        }
      });

      if (!row) {
        res.status(404).json({ error: "Inventory record not found for this product and warehouse" });
        return null;
      }

      if (!row.warehouse.isActive) {
        res.status(409).json({ error: "Cannot adjust inventory in an inactive warehouse" });
        return null;
      }

      const nextQuantity = row.quantity + delta;
      if (nextQuantity < row.reserved) {
        res.status(409).json({
          error: "Adjustment would reduce quantity below reserved stock",
          quantity: row.quantity,
          reserved: row.reserved,
          requestedDelta: delta
        });
        return null;
      }

      const changed = await tx.inventory.updateMany({
        where: {
          id: row.id,
          quantity: row.quantity,
          reserved: row.reserved
        },
        data: { quantity: nextQuantity }
      });

      if (changed.count !== 1) {
        res.status(409).json({ error: "Inventory changed concurrently. Please retry" });
        return null;
      }

      return {
        id: row.id,
        product: row.product,
        warehouse: row.warehouse,
        previousQuantity: row.quantity,
        quantity: nextQuantity,
        reserved: row.reserved,
        available: nextQuantity - row.reserved,
        delta
      };
    });

    if (result) {
      res.json({ message: "Inventory adjusted", inventory: result });
    }
  } catch (error) {
    handleWriteError(res, error);
  }
});


// -------------------- VENDORS --------------------

const vendorCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  isActive: z.boolean().default(true)
});

const vendorUpdateSchema = vendorCreateSchema.partial().refine(
  value => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

adminRouter.get("/vendors", async (_req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } }
    });
    res.json({ vendors });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/vendors", async (req, res) => {
  const parsed = vendorCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;
    const vendor = await prisma.vendor.create({
      data: {
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        isActive: input.isActive
      }
    });
    res.status(201).json({ vendor });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/vendors/:vendorId", async (req, res) => {
  const vendorId = req.params.vendorId;
  if (!uuidSchema.safeParse(vendorId).success) {
    res.status(400).json({ error: "Invalid vendor ID" });
    return;
  }

  const parsed = vendorUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;
    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      },
      include: { _count: { select: { products: true } } }
    });
    res.json({ vendor });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- WAREHOUSES --------------------

const warehouseCreateSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(150),
  countryCode: z.string().trim().length(2).transform(value => value.toUpperCase()),
  region: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().min(2).max(100),
  isActive: z.boolean().default(true)
});

const warehouseUpdateSchema = warehouseCreateSchema.partial().refine(
  value => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

adminRouter.get("/warehouses", async (_req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: [{ countryCode: "asc" }, { city: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { inventory: true } }
      }
    });
    res.json({ warehouses });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/warehouses", async (req, res) => {
  const parsed = warehouseCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;
    const warehouse = await prisma.warehouse.create({
      data: {
        code: input.code,
        name: input.name,
        countryCode: input.countryCode,
        region: input.region || null,
        city: input.city,
        isActive: input.isActive
      }
    });
    res.status(201).json({ warehouse });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/warehouses/:warehouseId", async (req, res) => {
  const warehouseId = req.params.warehouseId;
  if (!uuidSchema.safeParse(warehouseId).success) {
    res.status(400).json({ error: "Invalid warehouse ID" });
    return;
  }

  const parsed = warehouseUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;
    const warehouse = await prisma.warehouse.update({
      where: { id: warehouseId },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
        ...(input.region !== undefined ? { region: input.region || null } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      },
      include: { _count: { select: { inventory: true } } }
    });
    res.json({ warehouse });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.get("/reviews/pending", async (_req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        createdAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        product: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    res.json({ reviews, count: reviews.length });
  } catch (error) {
    console.error("Pending review retrieval failed:", error);
    res.status(500).json({ error: "Unable to retrieve pending reviews" });
  }
});

adminRouter.patch("/reviews/:reviewId/moderation", async (req, res) => {
  const reviewId = req.params.reviewId;
  const id = Array.isArray(reviewId) ? reviewId[0] : reviewId;

  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: "Invalid review ID" });
    return;
  }

  const parsed = z.object({
    status: z.enum(["APPROVED", "REJECTED"])
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Status must be APPROVED or REJECTED"
    });
    return;
  }

  try {
    const existing = await prisma.review.findUnique({
      where: { id },
      select: { id: true, status: true }
    });

    if (!existing) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    const review = await prisma.review.update({
      where: { id },
      data: { status: parsed.data.status },
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        createdAt: true
      }
    });

    res.json({ message: "Review moderation updated", review });
  } catch (error) {
    console.error("Review moderation failed:", error);
    res.status(500).json({ error: "Unable to moderate review" });
  }
});


// -------------------- SHIPMENTS --------------------

const shipmentCreateSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().trim().min(2).max(100),
  trackingNumber: z.string().trim().min(3).max(150).optional(),
  estimatedDelivery: z.string().datetime().optional()
}).strict();

const shipmentStatusSchema = z.object({
  status: z.enum([
    "DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY",
    "DELIVERED", "FAILED", "RETURNED"
  ])
}).strict();

adminRouter.get("/shipments", async (req, res) => {
  const parsed = z.object({
    orderId: z.string().uuid().optional()
  }).safeParse(req.query);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const shipments = await prisma.shipment.findMany({
      where: parsed.data.orderId
        ? { orderId: parsed.data.orderId }
        : undefined,
      include: {
        order: {
          select: {
            id: true, orderNumber: true, status: true,
            shippingRecipient: true, shippingCity: true,
            shippingCountryCode: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ shipments, count: shipments.length });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/shipments", async (req, res) => {
  const parsed = shipmentCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: parsed.data.orderId },
        select: { id: true, status: true }
      });

      if (!order) {
        return { error: "Order not found", status: 404 as const };
      }

      if (!["CONFIRMED", "PROCESSING"].includes(order.status)) {
        return {
          error: "Only confirmed or processing orders can be shipped",
          status: 409 as const
        };
      }

      const existing = await tx.shipment.findFirst({
        where: { orderId: order.id }
      });

      if (existing) {
        return {
          error: "A shipment already exists for this order",
          status: 409 as const
        };
      }

      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: parsed.data.carrier,
          trackingNumber: parsed.data.trackingNumber || null,
          estimatedDelivery: parsed.data.estimatedDelivery
            ? new Date(parsed.data.estimatedDelivery)
            : null,
          status: "PREPARING"
        }
      });

      if (order.status === "CONFIRMED") {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PROCESSING" }
        });
      }

      return { shipment };
    });

    if ("error" in result) {
      res.status(result.status ?? 500).json({ error: result.error });
      return;
    }

    res.status(201).json({ shipment: result.shipment });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/shipments/:shipmentId/status", async (req, res) => {
  const rawId = req.params.shipmentId;
  const shipmentId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(shipmentId).success) {
    res.status(400).json({ error: "Invalid shipment ID" });
    return;
  }

  const parsed = shipmentStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  const allowedTransitions: Record<string, string[]> = {
    PREPARING: ["DISPATCHED", "FAILED"],
    DISPATCHED: ["IN_TRANSIT", "FAILED", "RETURNED"],
    IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED", "RETURNED"],
    OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
    FAILED: [],
    DELIVERED: [],
    RETURNED: []
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.shipment.findUnique({
        where: { id: shipmentId }
      });

      if (!current) {
        return { error: "Shipment not found", status: 404 as const };
      }

      const nextStatus = parsed.data.status;
      if (!allowedTransitions[current.status]?.includes(nextStatus)) {
        return {
          error: `Cannot transition shipment from ${current.status} to ${nextStatus}`,
          status: 409 as const
        };
      }

      const now = new Date();
      const shipment = await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: nextStatus,
          ...(nextStatus === "DISPATCHED" ? { shippedAt: now } : {}),
          ...(nextStatus === "DELIVERED" ? { deliveredAt: now } : {})
        }
      });

      if (nextStatus === "DISPATCHED") {
        await tx.order.update({
          where: { id: current.orderId },
          data: { status: "SHIPPED" }
        });
      } else if (nextStatus === "DELIVERED") {
        await tx.order.update({
          where: { id: current.orderId },
          data: { status: "DELIVERED" }
        });

        const deliveredOrder = await tx.order.findUnique({
          where: { id: current.orderId },
          select: {
            id: true,
            userId: true,
            total: true,
            status: true
          }
        });

        if (deliveredOrder?.status === "DELIVERED") {
          const points = Math.floor(Number(deliveredOrder.total));

          if (points > 0) {
            const account = await tx.loyaltyAccount.upsert({
              where: { userId: deliveredOrder.userId },
              create: { userId: deliveredOrder.userId },
              update: {}
            });

            const existingEarn = await tx.loyaltyTransaction.findFirst({
              where: {
                orderId: deliveredOrder.id,
                type: "EARNED"
              }
            });

            if (!existingEarn) {
              await tx.loyaltyTransaction.create({
                data: {
                  userId: deliveredOrder.userId,
                  accountId: account.id,
                  type: "EARNED",
                  points,
                  description: `Points earned for order ${deliveredOrder.id}`,
                  orderId: deliveredOrder.id
                }
              });

              await tx.loyaltyAccount.update({
                where: { id: account.id },
                data: { pointsBalance: { increment: points } }
              });
            }
          }
        }
      } else if (nextStatus === "RETURNED") {
        await tx.order.update({
          where: { id: current.orderId },
          data: { status: "RETURNED" }
        });
      }

      return { shipment };
    });

    if ("error" in result) {
      res.status(result.status ?? 500).json({ error: result.error });
      return;
    }

    res.json({ shipment: result.shipment });
  } catch (error) {
    handleWriteError(res, error);
  }
});


/* -------------------- RETURNS AND SIMULATED REFUNDS -------------------- */

const returnDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "RECEIVED", "CLOSED"])
}).strict();

adminRouter.get("/returns", async (req, res) => {
  const parsed = z.object({
    status: z.enum([
      "REQUESTED", "APPROVED", "REJECTED", "PICKUP_SCHEDULED",
      "RECEIVED", "REFUNDED", "CLOSED"
    ]).optional()
  }).safeParse(req.query);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const returns = await prisma.returnRequest.findMany({
      where: parsed.data.status ? { status: parsed.data.status } : undefined,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        order: { select: { id: true, orderNumber: true, status: true, currency: true } },
        items: { include: { orderItem: true } },
        refunds: true
      },
      orderBy: { requestedAt: "desc" }
    });
    res.json({ returns, count: returns.length });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/returns/:returnId/status", async (req, res) => {
  const rawId = req.params.returnId;
  const returnId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(returnId).success) {
    res.status(400).json({ error: "Invalid return ID" });
    return;
  }

  const parsed = returnDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const result = await prisma.$transaction(async tx => {
      const current = await tx.returnRequest.findUnique({
        where: { id: returnId },
        include: { order: true }
      });

      if (!current) return { error: "Return request not found", status: 404 as const };

      const allowed: Record<string, string[]> = {
        REQUESTED: ["APPROVED", "REJECTED"],
        APPROVED: ["RECEIVED", "CLOSED"],
        RECEIVED: ["CLOSED"],
        REJECTED: ["CLOSED"],
        PICKUP_SCHEDULED: ["RECEIVED", "CLOSED"]
      };

      if (!allowed[current.status]?.includes(parsed.data.status)) {
        return {
          error: `Cannot transition return from ${current.status} to ${parsed.data.status}`,
          status: 409 as const
        };
      }

      const updated = await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: parsed.data.status,
          ...(parsed.data.status === "REJECTED" || parsed.data.status === "CLOSED"
            ? { resolvedAt: new Date() }
            : {})
        }
      });

      return { returnRequest: updated };
    });

    if ("error" in result) {
      res.status(result.status ?? 500).json({ error: result.error });
      return;
    }

    res.json(result);
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/returns/:returnId/refund", async (req, res) => {
  const rawId = req.params.returnId;
  const returnId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(returnId).success) {
    res.status(400).json({ error: "Invalid return ID" });
    return;
  }

  try {
    const result = await prisma.$transaction(async tx => {
      const returnRequest = await tx.returnRequest.findUnique({
        where: { id: returnId },
        include: {
          items: { include: { orderItem: true } },
          refunds: true,
          order: { include: { payments: true } }
        }
      });

      if (!returnRequest) {
        return { error: "Return request not found", status: 404 as const };
      }

      if (returnRequest.status !== "RECEIVED") {
        return {
          error: "Return must be marked RECEIVED before refunding",
          status: 409 as const
        };
      }

      if (returnRequest.refunds.length > 0) {
        return {
          error: "A refund has already been created for this return",
          status: 409 as const
        };
      }

      const refundAmount = returnRequest.items.reduce(
        (sum, item) => sum + Number(item.orderItem.unitPrice) * item.quantity,
        0
      );

      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        return { error: "Refund amount must be positive", status: 409 as const };
      }

      const payment = returnRequest.order.payments.find(
        p => p.status === "CAPTURED" || p.status === "PARTIALLY_REFUNDED"
      );

      if (!payment) {
        return {
          error: "No captured payment is available to refund",
          status: 409 as const
        };
      }

      const priorRefunds = await tx.refund.aggregate({
        where: { paymentId: payment.id },
        _sum: { amount: true }
      });

      const alreadyRefunded = Number(priorRefunds._sum.amount ?? 0);
      const remaining = Number(payment.amount) - alreadyRefunded;

      if (refundAmount > remaining + 0.0001) {
        return {
          error: "Refund exceeds the remaining captured payment amount",
          status: 409 as const
        };
      }

      // Atomically claim the RECEIVED return before creating a refund.
      // The claim and all refund writes share this transaction, so failures roll back.
      const claimed = await tx.returnRequest.updateMany({
        where: { id: returnRequest.id, status: "RECEIVED" },
        data: { status: "REFUNDED", resolvedAt: new Date() }
      });

      if (claimed.count !== 1) {
        return {
          error: "Return is already being processed or is no longer eligible for refund",
          status: 409 as const
        };
      }

      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          returnRequestId: returnRequest.id,
          amount: refundAmount.toFixed(2),
          reason: returnRequest.reason,
          reference: `SIM-REF-${randomUUID()}`
        }
      });

      const newRefundedTotal = alreadyRefunded + refundAmount;
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newRefundedTotal >= Number(payment.amount) - 0.0001
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED"
        }
      });

      const updatedReturn = await tx.returnRequest.findUniqueOrThrow({
        where: { id: returnRequest.id }
      });

      return { refund, returnRequest: updatedReturn, simulated: true };
    });

    if ("error" in result) {
      res.status(result.status ?? 500).json({ error: result.error });
      return;
    }

    res.status(201).json(result);
  } catch (error) {
    handleWriteError(res, error);
  }
});


/* -------------------- ADMIN OFFER MANAGEMENT -------------------- */

const offerCreateSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/)
    .transform(value => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  discountPercent: z.number().positive().max(100).optional(),
  discountAmount: z.number().positive().max(100000000).optional(),
  currency: z.string().trim().length(3).transform(value => value.toUpperCase()).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional()
}).strict().refine(
  data => (data.discountPercent !== undefined) !== (data.discountAmount !== undefined),
  { message: "Provide exactly one of discountPercent or discountAmount" }
).refine(
  data => data.endsAt > data.startsAt,
  { message: "endsAt must be later than startsAt", path: ["endsAt"] }
).refine(
  data => !(data.productId && data.categoryId),
  { message: "Target either a product or a category, not both" }
);

const offerUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  discountPercent: z.number().positive().max(100).nullable().optional(),
  discountAmount: z.number().positive().max(100000000).nullable().optional(),
  currency: z.string().trim().length(3).transform(value => value.toUpperCase()).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  productId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional()
}).strict().refine(data => Object.keys(data).length > 0, {
  message: "At least one field is required"
}).refine(
  data => !(data.productId && data.categoryId),
  { message: "Target either a product or a category, not both" }
);

const offerStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED", "EXPIRED"])
}).strict();

adminRouter.get("/offers", async (req, res) => {
  const parsed = z.object({
    status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "DISABLED"]).optional()
  }).safeParse(req.query);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const offers = await prisma.offer.findMany({
      where: parsed.data.status ? { status: parsed.data.status } : undefined,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ offers, count: offers.length });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.post("/offers", async (req, res) => {
  const parsed = offerCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const data = parsed.data;
    const offer = await prisma.offer.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        currency: data.currency ?? "USD",
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        productId: data.productId,
        categoryId: data.categoryId,
        status: "DRAFT"
      }
    });
    res.status(201).json({ offer });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/offers/:offerId", async (req, res) => {
  const rawId = req.params.offerId;
  const offerId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(offerId).success) {
    res.status(400).json({ error: "Invalid offer ID" });
    return;
  }

  const parsed = offerUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const current = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!current) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    const data = parsed.data;
    const percent = data.discountPercent === undefined
      ? current.discountPercent === null ? undefined : Number(current.discountPercent)
      : data.discountPercent;
    const amount = data.discountAmount === undefined
      ? current.discountAmount === null ? undefined : Number(current.discountAmount)
      : data.discountAmount;

    if ((percent !== undefined && percent !== null) &&
        (amount !== undefined && amount !== null)) {
      res.status(400).json({ error: "An offer cannot have both discount types" });
      return;
    }
    if ((percent === undefined || percent === null) &&
        (amount === undefined || amount === null)) {
      res.status(400).json({ error: "An offer must retain one discount type" });
      return;
    }

    const startsAt = data.startsAt ?? current.startsAt;
    const endsAt = data.endsAt ?? current.endsAt;
    if (endsAt <= startsAt) {
      res.status(400).json({ error: "endsAt must be later than startsAt" });
      return;
    }

    if (data.productId && data.categoryId) {
      res.status(400).json({ error: "Target either a product or a category, not both" });
      return;
    }

    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        ...data,
        ...(data.discountPercent !== undefined && data.discountPercent !== null
          ? { discountAmount: null }
          : {}),
        ...(data.discountAmount !== undefined && data.discountAmount !== null
          ? { discountPercent: null }
          : {})
      }
    });
    res.json({ offer });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/offers/:offerId/status", async (req, res) => {
  const rawId = req.params.offerId;
  const offerId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(offerId).success) {
    res.status(400).json({ error: "Invalid offer ID" });
    return;
  }

  const parsed = offerStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }

    if (parsed.data.status === "ACTIVE" &&
        (offer.endsAt <= new Date() || offer.discountPercent === null && offer.discountAmount === null)) {
      res.status(409).json({ error: "Offer dates or discount configuration are invalid" });
      return;
    }

    const updated = await prisma.offer.update({
      where: { id: offerId },
      data: { status: parsed.data.status }
    });
    res.json({ offer: updated });
  } catch (error) {
    handleWriteError(res, error);
  }
});

/* -------------------- ADMIN ANALYTICS -------------------- */

const analyticsDateSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
}).strict().refine(
  data => !data.from || !data.to || new Date(data.from) <= new Date(data.to),
  { message: "'from' must be earlier than or equal to 'to'" }
);

adminRouter.get("/analytics/overview", async (_req, res) => {
  try {
    const [orders, customers, capturedPayments, refunds, products, inventory] =
      await Promise.all([
        prisma.order.findMany({
          select: { id: true, total: true, status: true }
        }),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
        prisma.payment.findMany({
          where: { status: { in: ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] } },
          select: { amount: true, currency: true }
        }),
        prisma.refund.findMany({
          select: { amount: true, payment: { select: { currency: true } } }
        }),
        prisma.product.count(),
        prisma.inventory.aggregate({
          _sum: { quantity: true, reserved: true }
        })
      ]);

    const grossByCurrency: Record<string, number> = {};
    const refundedByCurrency: Record<string, number> = {};

    for (const payment of capturedPayments) {
      grossByCurrency[payment.currency] =
        (grossByCurrency[payment.currency] ?? 0) + Number(payment.amount);
    }

    for (const refund of refunds) {
      const currency = refund.payment.currency;
      refundedByCurrency[currency] =
        (refundedByCurrency[currency] ?? 0) + Number(refund.amount);
    }

    const netRevenueByCurrency = Object.fromEntries(
      [...new Set([
        ...Object.keys(grossByCurrency),
        ...Object.keys(refundedByCurrency)
      ])].map(currency => [
        currency,
        Number((
          (grossByCurrency[currency] ?? 0) -
          (refundedByCurrency[currency] ?? 0)
        ).toFixed(2))
      ])
    );

    const completedOrders = orders.filter(order =>
      ["DELIVERED", "SHIPPED", "PROCESSING", "CONFIRMED"].includes(order.status)
    );

    res.json({
      orders: {
        total: orders.length,
        pending: orders.filter(order => order.status === "PENDING").length,
        cancelled: orders.filter(order => order.status === "CANCELLED").length,
        delivered: orders.filter(order => order.status === "DELIVERED").length
      },
      customers,
      products,
      inventory: {
        quantity: inventory._sum.quantity ?? 0,
        reserved: inventory._sum.reserved ?? 0
      },
      payments: {
        grossCapturedByCurrency: grossByCurrency,
        refundedByCurrency: refundedByCurrency,
        netRevenueByCurrency
      },
      averageOrderValue: completedOrders.length
        ? Number((
            completedOrders.reduce((sum, order) => sum + Number(order.total), 0) /
            completedOrders.length
          ).toFixed(2))
        : 0
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.get("/analytics/sales", async (req, res) => {
  const parsed = analyticsDateSchema.safeParse(req.query);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const from = parsed.data.from ? new Date(parsed.data.from) : new Date(Date.now() - 30 * 86400000);
    const to = parsed.data.to ? new Date(parsed.data.to) : new Date();

    const orders = await prisma.order.findMany({
      where: {
        placedAt: { gte: from, lte: to }
      },
      select: {
        placedAt: true,
        status: true,
        total: true,
        currency: true
      },
      orderBy: { placedAt: "asc" }
    });

    const days: Record<string, {
      orders: number;
      grossOrderValueByCurrency: Record<string, number>;
    }> = {};

    for (const order of orders) {
      const day = order.placedAt.toISOString().slice(0, 10);
      days[day] ??= { orders: 0, grossOrderValueByCurrency: {} };
      days[day].orders++;
      days[day].grossOrderValueByCurrency[order.currency] =
        (days[day].grossOrderValueByCurrency[order.currency] ?? 0) +
        Number(order.total);
    }

    res.json({
      from: from.toISOString(),
      to: to.toISOString(),
      daily: Object.entries(days).map(([date, values]) => ({
        date,
        orders: values.orders,
        grossOrderValueByCurrency: Object.fromEntries(
          Object.entries(values.grossOrderValueByCurrency).map(([currency, value]) =>
            [currency, Number(value.toFixed(2))]
          )
        )
      }))
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.get("/analytics/products", async (_req, res) => {
  try {
    const grouped = await prisma.orderItem.groupBy({
      by: ["productId", "productName", "sku"],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 20
    });

    res.json({
      products: grouped.map(item => ({
        productId: item.productId,
        name: item.productName,
        sku: item.sku,
        unitsSold: item._sum.quantity ?? 0,
        grossSales: Number((item._sum.lineTotal ?? new Prisma.Decimal(0)).toFixed(2))
      }))
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.get("/analytics/inventory", async (_req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      where: { warehouse: { isActive: true } },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true, status: true }
        },
        warehouse: { select: { id: true, code: true, name: true } }
      }
    });

    const rows = inventory.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      warehouseCode: item.warehouse.code,
      warehouseName: item.warehouse.name,
      quantity: item.quantity,
      reserved: item.reserved,
      available: item.quantity - item.reserved,
      reorderLevel: item.reorderLevel,
      stockValue: Number((item.product.price.mul(item.quantity)).toFixed(2)),
      lowStock: item.quantity - item.reserved <= item.reorderLevel
    }));

    res.json({
      lowStock: rows.filter(item => item.lowStock),
      inventory: rows,
      totalStockValueByCurrencyNote:
        "Stock value uses each product's listed price; values across different currencies must not be summed."
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- ORDERS --------------------

const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([
    "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED",
    "DELIVERED", "CANCELLED", "RETURNED"
  ]).optional(),
  search: z.string().trim().optional()
});

adminRouter.get("/orders", async (req, res) => {
  const parsed = orderListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  const { page, limit, status, search } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { shippingRecipient: { contains: search, mode: "insensitive" } },
      { shippingCity: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } }
          ]
        }
      }
    ];
  }

  try {
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { placedAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true }
          },
          _count: { select: { items: true } },
          shipments: {
            select: { id: true, status: true, trackingNumber: true, carrier: true }
          },
          payments: {
            select: { id: true, status: true, method: true, amount: true }
          }
        }
      })
    ]);

    res.json({
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        currency: order.currency,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        shippingCost: Number(order.shippingCost),
        discount: Number(order.discount),
        total: Number(order.total),
        shippingRecipient: order.shippingRecipient,
        shippingCity: order.shippingCity,
        shippingRegion: order.shippingRegion,
        shippingCountryCode: order.shippingCountryCode,
        placedAt: order.placedAt.toISOString(),
        customer: order.user,
        itemCount: order._count.items,
        shipments: order.shipments,
        payments: order.payments.map(p => ({
          ...p,
          amount: Number(p.amount)
        }))
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.get("/orders/:orderId", async (req, res) => {
  const rawId = req.params.orderId;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(orderId).success) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                images: { select: { url: true, altText: true }, take: 1 }
              }
            }
          }
        },
        payments: {
          include: {
            refunds: true
          }
        },
        shipments: true,
        returnRequests: {
          include: {
            items: true,
            refunds: true
          }
        }
      }
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        shippingCost: Number(order.shippingCost),
        discount: Number(order.discount),
        total: Number(order.total),
        items: order.items.map(item => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal)
        })),
        payments: order.payments.map(payment => ({
          ...payment,
          amount: Number(payment.amount),
          refunds: payment.refunds.map(refund => ({
            ...refund,
            amount: Number(refund.amount)
          }))
        }))
      }
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

const orderStatusUpdateSchema = z.object({
  status: z.enum([
    "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED",
    "DELIVERED", "CANCELLED", "RETURNED"
  ])
});

adminRouter.patch("/orders/:orderId/status", async (req, res) => {
  const rawId = req.params.orderId;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(orderId).success) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const parsed = orderStatusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const existing = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: parsed.data.status }
    });

    res.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        shippingCost: Number(order.shippingCost),
        discount: Number(order.discount),
        total: Number(order.total)
      }
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- PAYMENTS --------------------

adminRouter.get("/payments", async (req, res) => {
  const parsed = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum([
      "PENDING", "AUTHORIZED", "CAPTURED", "FAILED",
      "REFUNDED", "PARTIALLY_REFUNDED"
    ]).optional()
  }).safeParse(req.query);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  const { page, limit, status } = parsed.data;
  const skip = (page - 1) * limit;

  try {
    const where: Prisma.PaymentWhereInput = status ? { status } : {};
    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              user: {
                select: { id: true, email: true, firstName: true, lastName: true }
              }
            }
          },
          refunds: true
        }
      })
    ]);

    res.json({
      payments: payments.map(p => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order.orderNumber,
        customer: p.order.user,
        method: p.method,
        status: p.status,
        amount: Number(p.amount),
        currency: p.currency,
        providerReference: p.providerReference,
        simulated: p.simulated,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        refunds: p.refunds.map(r => ({
          id: r.id,
          amount: Number(r.amount),
          reason: r.reason,
          reference: r.reference,
          createdAt: r.createdAt.toISOString()
        }))
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- CUSTOMERS --------------------

adminRouter.get("/customers", async (req, res) => {
  const parsed = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional()
  }).safeParse(req.query);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  const { page, limit, search } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } }
    ];
  }

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { orders: true, reviews: true }
          },
          orders: {
            where: { status: { notIn: ["CANCELLED"] } },
            select: { total: true }
          }
        }
      })
    ]);

    res.json({
      customers: users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        orderCount: u._count.orders,
        reviewCount: u._count.reviews,
        totalSpend: u.orders.reduce((sum, o) => sum + Number(o.total), 0)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

adminRouter.patch("/customers/:userId/status", async (req, res) => {
  const rawId = req.params.userId;
  const targetUserId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(targetUserId).success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const currentUserId = (req as AuthenticatedRequest).auth?.userId;
  if (currentUserId === targetUserId) {
    res.status(400).json({ error: "Cannot modify your own active status" });
    return;
  }

  const parsed = z.object({
    isActive: z.boolean()
  }).safeParse(req.body);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: parsed.data.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    handleWriteError(res, error);
  }
});

export default adminRouter;












