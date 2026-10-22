import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export interface ProductListFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  page: number;
  limit: number;
}

export async function listProducts(filters: ProductListFilters) {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    category: {
      isActive: true
    }
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { brand: { contains: filters.search, mode: "insensitive" } }
    ];
  }

  if (filters.category) {
    where.category = {
      isActive: true,
      slug: filters.category
    };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {})
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price_asc"
      ? { price: "asc" }
      : filters.sort === "price_desc"
        ? { price: "desc" }
        : filters.sort === "name"
          ? { name: "asc" }
          : { createdAt: "desc" };

  const skip = (filters.page - 1) * filters.limit;

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: filters.limit,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        brand: true,
        price: true,
        currency: true,
        category: {
          select: {
            name: true,
            slug: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        images: {
          orderBy: { position: "asc" },
          select: {
            url: true,
            altText: true,
            position: true
          }
        },
        inventory: {
          where: {
            warehouse: { isActive: true }
          },
          select: {
            quantity: true,
            reserved: true
          }
        }
      }
    }),
    prisma.product.count({ where })
  ]);

  const items = products.map(({ inventory, ...product }) => ({
    ...product,
    availableStock: inventory.reduce(
      (totalStock, item) =>
        totalStock + Math.max(0, item.quantity - item.reserved),
      0
    )
  }));

  return {
    items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit)
    }
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      status: "ACTIVE",
      category: { isActive: true }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      brand: true,
      price: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          name: true,
          slug: true
        }
      },
      vendor: {
        where: { isActive: true },
        select: {
          name: true
        }
      },
      images: {
        orderBy: { position: "asc" },
        select: {
          url: true,
          altText: true,
          position: true
        }
      },
      inventory: {
        where: {
          warehouse: { isActive: true }
        },
        select: {
          quantity: true,
          reserved: true
        }
      }
    }
  });

  if (!product) {
    return null;
  }

  const { inventory, ...details } = product;

  return {
    ...details,
    availableStock: inventory.reduce(
      (totalStock, item) =>
        totalStock + Math.max(0, item.quantity - item.reserved),
      0
    )
  };
}
