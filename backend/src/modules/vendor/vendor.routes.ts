import { Router } from "express";
import { Prisma } from "../../generated/prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticateToken } from "../../middleware/authenticate";
import { requireVendor, type VendorRequest } from "../../middleware/requireVendor";

const vendorRouter = Router();

vendorRouter.use(authenticateToken, requireVendor);

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
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  imageUrl: z.string().max(10000000).or(z.literal("")).nullable().optional(),
  images: z.array(z.object({
    url: z.string().max(10000000),
    altText: z.string().max(200).optional(),
    position: z.number().int().min(0).max(10).optional()
  })).optional(),
  imageUrls: z.array(z.string().max(10000000).or(z.literal(""))).optional(),
  initialQuantity: z.number().int().min(0).max(1000000).optional(),
  warehouseId: z.string().uuid().nullable().optional()
});

const productUpdateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().min(1).max(10000).optional(),
  brand: z.string().trim().max(100).nullable().optional(),
  price: z.number().finite().min(0).max(9999999999).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  imageUrl: z.string().max(10000000).or(z.literal("")).nullable().optional(),
  images: z.array(z.object({
    url: z.string().max(10000000),
    altText: z.string().max(200).optional(),
    position: z.number().int().min(0).max(10).optional()
  })).optional(),
  imageUrls: z.array(z.string().max(10000000).or(z.literal(""))).optional(),
  initialQuantity: z.number().int().min(0).max(1000000).optional(),
  warehouseId: z.string().uuid().nullable().optional()
}).refine(val => Object.keys(val).length > 0, {
  message: "Provide at least one field to update"
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

  console.error("Vendor operation failed:", error);
  res.status(500).json({ error: "Unable to complete vendor operation" });
}

// -------------------- DASHBOARD --------------------

vendorRouter.get("/dashboard", async (req, res) => {
  const vendor = (req as VendorRequest).vendor!;

  try {
    const [products, orderItems, lowStockItems] = await Promise.all([
      prisma.product.groupBy({
        by: ["status"],
        where: { vendorId: vendor.id },
        _count: { id: true }
      }),
      prisma.orderItem.findMany({
        where: { product: { vendorId: vendor.id } },
        select: {
          quantity: true,
          lineTotal: true,
          orderId: true
        }
      }),
      prisma.inventory.findMany({
        where: {
          product: { vendorId: vendor.id },
          warehouse: { isActive: true }
        },
        select: {
          quantity: true,
          reserved: true,
          reorderLevel: true
        }
      })
    ]);

    const productCounts = {
      total: products.reduce((acc, p) => acc + p._count.id, 0),
      active: products.find(p => p.status === "ACTIVE")?._count.id ?? 0,
      draft: products.find(p => p.status === "DRAFT")?._count.id ?? 0,
      archived: products.find(p => p.status === "ARCHIVED")?._count.id ?? 0
    };

    const uniqueOrderIds = new Set(orderItems.map(item => item.orderId));
    const unitsSold = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const grossRevenue = orderItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const lowStockCount = lowStockItems.filter(item => item.quantity - item.reserved <= item.reorderLevel).length;

    res.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone
      },
      metrics: {
        products: productCounts,
        ordersCount: uniqueOrderIds.size,
        unitsSold,
        grossRevenue: Number(grossRevenue.toFixed(2)),
        lowStockCount
      }
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- PRODUCTS --------------------

vendorRouter.get("/products", async (req, res) => {
  const vendor = (req as VendorRequest).vendor!;
  const parsed = z.object({
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
    search: z.string().trim().optional()
  }).safeParse(req.query);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  const { status, search } = parsed.data;

  const where: Prisma.ProductWhereInput = {
    vendorId: vendor.id
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } }
    ];
  }

  try {
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, altText: true, position: true }, orderBy: { position: "asc" } },
        inventory: {
          include: {
            warehouse: { select: { id: true, code: true, name: true } }
          }
        }
      }
    });

    res.json({
      products: products.map(p => ({
        ...p,
        price: Number(p.price),
        inventory: p.inventory.map(inv => ({
          ...inv,
          available: inv.quantity - inv.reserved
        }))
      }))
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

vendorRouter.post("/products", async (req, res) => {
  const vendor = (req as VendorRequest).vendor!;
  const parsed = productCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const input = parsed.data;
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId }
    });

    if (!category) {
      res.status(400).json({ error: "Category not found" });
      return;
    }

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
        brand: input.brand || null,
        price: new Prisma.Decimal(input.price),
        currency: input.currency,
        status: input.status,
        categoryId: input.categoryId,
        vendorId: vendor.id,
        ...(imageList.length > 0 ? {
          images: {
            create: imageList
          }
        } : {})
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          select: { id: true, url: true, altText: true, position: true },
          orderBy: { position: "asc" }
        }
      }
    });

    // If initialQuantity is provided with warehouseId, stock at that warehouse
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

    res.status(201).json({
      product: {
        ...product,
        price: Number(product.price)
      }
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

vendorRouter.patch("/products/:productId", async (req, res) => {
  const vendor = (req as VendorRequest).vendor!;
  const rawId = req.params.productId;
  const productId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!uuidSchema.safeParse(productId).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }

  try {
    const existing = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (existing.vendorId !== vendor.id) {
      res.status(403).json({ error: "You can only update your own products" });
      return;
    }

    const input = parsed.data;
    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId }
      });
      if (!category) {
        res.status(400).json({ error: "Category not found" });
        return;
      }
    }

    // Collect all 4 angle images to update if provided
    const updateImages: { url: string; altText: string; position: number }[] = [];
    if (input.images && input.images.length > 0) {
      input.images.forEach((img, idx) => {
        if (img.url && img.url.trim()) {
          updateImages.push({
            url: img.url.trim(),
            altText: img.altText || `${input.name || existing.name} view ${idx + 1}`,
            position: img.position !== undefined ? img.position : idx
          });
        }
      });
    } else if (input.imageUrls && input.imageUrls.length > 0) {
      input.imageUrls.forEach((url, idx) => {
        if (url && url.trim()) {
          updateImages.push({
            url: url.trim(),
            altText: `${input.name || existing.name} view ${idx + 1}`,
            position: idx
          });
        }
      });
    } else if (input.imageUrl !== undefined && input.imageUrl !== null && input.imageUrl.trim()) {
      updateImages.push({
        url: input.imageUrl.trim(),
        altText: input.name || existing.name,
        position: 0
      });
    }

    if (updateImages.length > 0) {
      await prisma.productImage.deleteMany({
        where: { productId }
      });
      await prisma.productImage.createMany({
        data: updateImages.map(img => ({
          productId,
          url: img.url,
          altText: img.altText,
          position: img.position
        }))
      });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.brand !== undefined ? { brand: input.brand } : {}),
        ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price) } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
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

    // If initialQuantity is provided with warehouseId, update/create inventory record in that warehouse
    if (input.initialQuantity !== undefined && input.warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: input.warehouseId }
      });
      if (warehouse && warehouse.isActive) {
        await prisma.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId,
              warehouseId: input.warehouseId
            }
          },
          update: {
            quantity: input.initialQuantity
          },
          create: {
            productId,
            warehouseId: input.warehouseId,
            quantity: input.initialQuantity,
            reserved: 0
          }
        });
      }
    }

    res.json({
      product: {
        ...updated,
        price: Number(updated.price)
      }
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

vendorRouter.post("/products/:productId/archive", async (req, res) => {
  const vendor = (req as VendorRequest).vendor!;
  const productId = req.params.productId;

  if (!uuidSchema.safeParse(productId).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const existing = await prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id }
    });

    if (!existing) {
      res.status(404).json({ error: "Product not found or not owned by your vendor account" });
      return;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { status: "ARCHIVED" },
      select: { id: true, name: true, slug: true, status: true }
    });

    res.json({ message: "Product archived successfully", product: updated });
  } catch (error) {
    handleWriteError(res, error);
  }
});

vendorRouter.delete("/products/:productId", async (req, res) => {
  const vendor = (req as VendorRequest).vendor!;
  const productId = req.params.productId;

  if (!uuidSchema.safeParse(productId).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const existing = await prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id },
      include: {
        _count: {
          select: { orderItems: true }
        }
      }
    });

    if (!existing) {
      res.status(404).json({ error: "Product not found or not owned by your vendor account" });
      return;
    }

    if (existing._count.orderItems > 0) {
      // Historical orders exist: safely archive product to preserve order history
      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { productId } }),
        prisma.wishlistItem.deleteMany({ where: { productId } }),
        prisma.inventory.updateMany({
          where: { productId },
          data: { quantity: 0, reserved: 0 }
        }),
        prisma.product.update({
          where: { id: productId },
          data: { status: "ARCHIVED" }
        })
      ]);

      res.json({
        message: `Product "${existing.name}" has historical orders and was safely archived and removed from storefront catalog.`,
        archived: true,
        productId
      });
      return;
    }

    // No historical orders: perform complete clean deletion
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { productId } }),
      prisma.wishlistItem.deleteMany({ where: { productId } }),
      prisma.inventory.deleteMany({ where: { productId } }),
      prisma.productImage.deleteMany({ where: { productId } }),
      prisma.review.deleteMany({ where: { productId } }),
      prisma.offer.deleteMany({ where: { productId } }),
      prisma.product.delete({ where: { id: productId } })
    ]);

    res.json({
      message: `Product "${existing.name}" has been permanently deleted.`,
      deleted: true,
      productId
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- INVENTORY --------------------

vendorRouter.get("/inventory", async (req, res) => {
  const vendor = (req as VendorRequest).vendor!;

  try {
    const inventory = await prisma.inventory.findMany({
      where: {
        product: { vendorId: vendor.id },
        warehouse: { isActive: true }
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true, status: true }
        },
        warehouse: { select: { id: true, code: true, name: true } }
      },
      orderBy: { product: { name: "asc" } }
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
      stockValue: Number(item.product.price.mul(item.quantity).toFixed(2)),
      lowStock: item.quantity - item.reserved <= item.reorderLevel
    }));

    res.json({
      inventory: rows,
      lowStock: rows.filter(r => r.lowStock)
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- ORDERS (VENDOR-SCOPED) --------------------

vendorRouter.get("/orders", async (req, res) => {
  const vendor = (req as VendorRequest).vendor!;

  try {
    // Find all orders that have items belonging to this vendor
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: { vendorId: vendor.id }
          }
        }
      },
      orderBy: { placedAt: "desc" },
      include: {
        items: {
          where: {
            product: { vendorId: vendor.id }
          },
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
        shipments: {
          select: { id: true, status: true, trackingNumber: true, carrier: true }
        }
      }
    });

    res.json({
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: order.placedAt.toISOString(),
        shippingCity: order.shippingCity,
        shippingRegion: order.shippingRegion,
        shippingCountryCode: order.shippingCountryCode,
        shipments: order.shipments,
        items: order.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          lineTotal: Number(item.lineTotal),
          product: item.product
        })),
        vendorSubtotal: order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0)
      }))
    });
  } catch (error) {
    handleWriteError(res, error);
  }
});

// -------------------- CATEGORIES & WAREHOUSES (READ ONLY) --------------------

vendorRouter.get("/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: "asc" }
    });
    res.json({ categories });
  } catch (error) {
    handleWriteError(res, error);
  }
});

vendorRouter.get("/warehouses", async (_req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        region: true,
        countryCode: true,
        isActive: true
      },
      orderBy: [{ countryCode: "asc" }, { city: "asc" }, { name: "asc" }]
    });
    res.json({ warehouses });
  } catch (error) {
    handleWriteError(res, error);
  }
});

export default vendorRouter;
