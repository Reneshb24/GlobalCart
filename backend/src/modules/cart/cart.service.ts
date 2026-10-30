import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { AddCartItemInput, UpdateCartItemInput } from "./cart.schemas";

export class CartError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "CartError";
  }
}

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

async function getAvailableStock(productId: string): Promise<number> {
  const inventory = await prisma.inventory.findMany({
    where: {
      productId,
      warehouse: { isActive: true }
    },
    select: {
      quantity: true,
      reserved: true
    }
  });

  return inventory.reduce(
    (total, item) =>
      total + Math.max(0, item.quantity - item.reserved),
    0
  );
}

async function getActiveProduct(productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "ACTIVE",
      category: { isActive: true }
    },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true
    }
  });

  if (!product) {
    throw new CartError("Active product not found", 404);
  }

  return product;
}

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          currency: true,
          status: true,
          category: {
            select: { isActive: true }
          },
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: {
              url: true,
              altText: true
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
      }
    }
  });

  const cartItems = items.map(({ product, ...item }) => {
    const availableStock = product.inventory.reduce(
      (total, stock) =>
        total + Math.max(0, stock.quantity - stock.reserved),
      0
    );

    const { inventory, category, ...productDetails } = product;

    return {
      ...item,
      product: productDetails,
      availableStock,
      subtotal: product.price.mul(item.quantity).toFixed(2),
      isAvailable: product.status === "ACTIVE" && category.isActive,
      isInStock: availableStock >= item.quantity
    };
  });

  const total = cartItems.reduce(
    (sum, item) =>
      sum.add(new Prisma.Decimal(item.subtotal)),
    new Prisma.Decimal(0)
  );

  const currencySet = new Set(
    cartItems.map((item) => item.product.currency)
  );

  return {
    cart: {
      id: cart.id,
      items: cartItems,
      itemCount: cartItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
      total: total.toFixed(2),
      currency: currencySet.size === 1
        ? cartItems[0]?.product.currency ?? null
        : null,
      hasMixedCurrencies: currencySet.size > 1
    }
  };
}

export async function addCartItem(
  userId: string,
  input: AddCartItemInput
) {
  const product = await getActiveProduct(input.productId);
  const cart = await getOrCreateCart(userId);

  return prisma.$transaction(async (tx) => {
    const existingItem = await tx.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: product.id
        }
      },
      select: {
        id: true,
        quantity: true
      }
    });

    const newQuantity =
      (existingItem?.quantity ?? 0) + input.quantity;

    if (newQuantity > 100) {
      throw new CartError(
        "A cart item cannot exceed quantity 100",
        400
      );
    }

    const inventory = await tx.inventory.findMany({
      where: {
        productId: product.id,
        warehouse: { isActive: true }
      },
      select: {
        quantity: true,
        reserved: true
      }
    });

    const availableStock = inventory.reduce(
      (total, item) =>
        total + Math.max(0, item.quantity - item.reserved),
      0
    );

    if (newQuantity > availableStock) {
      throw new CartError(
        `Only ${availableStock} units are currently available`,
        409
      );
    }

    const item = existingItem
      ? await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          select: {
            id: true,
            productId: true,
            quantity: true,
            updatedAt: true
          }
        })
      : await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            quantity: input.quantity
          },
          select: {
            id: true,
            productId: true,
            quantity: true,
            updatedAt: true
          }
        });

    return {
      message: existingItem
        ? "Cart item quantity increased"
        : "Item added to cart",
      item
    };
  }, {
    maxWait: 15000,
    timeout: 30000
  });
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  input: UpdateCartItemInput
) {
  const cart = await getOrCreateCart(userId);

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id
    },
    select: {
      id: true,
      productId: true
    }
  });

  if (!existingItem) {
    throw new CartError("Cart item not found", 404);
  }

  const product = await getActiveProduct(existingItem.productId);
  const availableStock = await getAvailableStock(product.id);

  if (input.quantity > availableStock) {
    throw new CartError(
      `Only ${availableStock} units are currently available`,
      409
    );
  }

  const item = await prisma.cartItem.update({
    where: { id: existingItem.id },
    data: { quantity: input.quantity },
    select: {
      id: true,
      productId: true,
      quantity: true,
      updatedAt: true
    }
  });

  return {
    message: "Cart item updated",
    item
  };
}

export async function removeCartItem(
  userId: string,
  itemId: string
) {
  const cart = await getOrCreateCart(userId);

  const item = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id
    },
    select: { id: true }
  });

  if (!item) {
    throw new CartError("Cart item not found", 404);
  }

  await prisma.cartItem.delete({
    where: { id: item.id }
  });

  return { message: "Item removed from cart" };
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);

  const result = await prisma.cartItem.deleteMany({
    where: { cartId: cart.id }
  });

  return {
    message: "Cart cleared",
    removedItems: result.count
  };
}
