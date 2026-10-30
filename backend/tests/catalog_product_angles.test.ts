import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { z } from "zod";

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

function resolveProductDeletionStrategy(orderItemsCount: number): "DELETE" | "ARCHIVE" {
  return orderItemsCount === 0 ? "DELETE" : "ARCHIVE";
}

test("product creation schema accepts 4 photographic angles with external URLs", () => {
  const input = {
    sku: "TEST-PROD-001",
    name: "Ergonomic Studio Chair",
    slug: "ergonomic-studio-chair",
    description: "Premium mesh ergonomic office chair with lumbar support",
    price: 249.99,
    categoryId: crypto.randomUUID(),
    images: [
      { url: "https://images.unsplash.com/photo-1580481077195-731da06d13a8?w=800", altText: "Front Hero", position: 0 },
      { url: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800", altText: "Side Profile", position: 1 },
      { url: "https://images.unsplash.com/photo-1589384267710-7a170981ca78?w=800", altText: "Lifestyle Context", position: 2 },
      { url: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800", altText: "Detail Macro", position: 3 }
    ],
    initialQuantity: 50,
    warehouseId: crypto.randomUUID()
  };

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) {
    console.error("Validation failed:", parsed.error.issues);
  }
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.images?.length, 4);
    assert.equal(parsed.data.images[0].position, 0);
    assert.equal(parsed.data.images[3].position, 3);
  }
});

test("product creation schema accepts uploaded static server paths (/uploads/gc-...)", () => {
  const input = {
    sku: "TEST-PROD-002",
    name: "Mechanical Keyboard RGB",
    slug: "mechanical-keyboard-rgb",
    description: "Hot-swappable mechanical keyboard",
    price: 89.99,
    categoryId: crypto.randomUUID(),
    imageUrl: "/uploads/gc-1792600123-abcdef.png",
    images: [
      { url: "/uploads/gc-1792600123-abcdef.png", altText: "Front Hero", position: 0 },
      { url: "/uploads/gc-1792600124-fedcba.png", altText: "Side View", position: 1 }
    ]
  };

  const parsed = productCreateSchema.safeParse(input);
  assert.equal(parsed.success, true);
});

test("product deletion strategy chooses permanent DELETE for unpurchased products", () => {
  const strategy = resolveProductDeletionStrategy(0);
  assert.equal(strategy, "DELETE");
});

test("product deletion strategy chooses safe ARCHIVE for products with order history", () => {
  const strategy = resolveProductDeletionStrategy(14);
  assert.equal(strategy, "ARCHIVE");
});
