import { randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { CheckoutInput } from "./checkout.schemas";

export class OrderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "OrderError";
  }
}

function createOrderNumber(): string {
  return `GC-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function checkout(userId: string, input: CheckoutInput) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: { select: { isActive: true } }
                }
              }
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        throw new OrderError("Your cart is empty", 400);
      }

      const currencies = new Set(
        cart.items.map((item) => item.product.currency)
      );

      if (currencies.size !== 1) {
        throw new OrderError(
          "Products with different currencies cannot be checked out together",
          400
        );
      }

      for (const item of cart.items) {
        if (
          item.product.status !== "ACTIVE" ||
          !item.product.category.isActive
        ) {
          throw new OrderError(
            `Product "${item.product.name}" is no longer available`,
            409
          );
        }
      }

      const currency = cart.items[0].product.currency;
      let subtotal = new Prisma.Decimal(0);

      for (const item of cart.items) {
        subtotal = subtotal.add(
          item.product.price.mul(item.quantity)
        );
      }

      const tax = new Prisma.Decimal(0);
      const shippingCost = new Prisma.Decimal(0);
      let discount = new Prisma.Decimal(0);

      if (input.offerCode) {
        const now = new Date();
        const normalizedCode = input.offerCode.trim().toUpperCase();
        const offer = await tx.offer.findUnique({
          where: { code: normalizedCode }
        });

        if (
          !offer ||
          offer.status !== "ACTIVE" ||
          offer.startsAt > now ||
          offer.endsAt <= now
        ) {
          throw new OrderError("Offer code is invalid or unavailable", 400);
        }

        if (offer.currency && currency && offer.currency.toUpperCase() !== currency.toUpperCase()) {
          throw new OrderError("Offer currency does not match the cart", 400);
        }

        if (
          offer.productId &&
          !cart.items.some(item => item.productId === offer.productId)
        ) {
          throw new OrderError("Offer does not apply to items in your cart", 400);
        }

        if (
          offer.categoryId &&
          !cart.items.some(item => item.product.categoryId === offer.categoryId)
        ) {
          throw new OrderError("Offer does not apply to items in your cart", 400);
        }

        let eligibleSubtotal = new Prisma.Decimal(0);

        for (const item of cart.items) {
          const eligible =
            (!offer.productId || item.productId === offer.productId) &&
            (!offer.categoryId || item.product.categoryId === offer.categoryId);

          if (eligible) {
            eligibleSubtotal = eligibleSubtotal.add(
              item.product.price.mul(item.quantity)
            );
          }
        }

        if (eligibleSubtotal.lte(0)) {
          throw new OrderError("No eligible items for this offer", 400);
        }

        if (offer.discountPercent !== null) {
          discount = eligibleSubtotal
            .mul(offer.discountPercent)
            .div(100)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        } else if (offer.discountAmount !== null) {
          discount = Prisma.Decimal.min(
            eligibleSubtotal,
            offer.discountAmount
          );
        } else {
          throw new OrderError("Offer has no valid discount configured", 409);
        }

        discount = Prisma.Decimal.min(discount, subtotal);
      }

      // Loyalty points redemption (Flipkart SuperCoins / Amazon Rewards style)
      let loyaltyPointsRedeemed = 0;
      let loyaltyDiscount = new Prisma.Decimal(0);

      let loyaltyAccount = await tx.loyaltyAccount.findUnique({
        where: { userId }
      });

      if (!loyaltyAccount) {
        loyaltyAccount = await tx.loyaltyAccount.create({
          data: { userId, pointsBalance: 0, tier: "STANDARD" }
        });
      }

      if (input.redeemLoyaltyPoints && loyaltyAccount.pointsBalance > 0) {
        const remainingToCover = subtotal.sub(discount);
        if (remainingToCover.gt(0)) {
          const maxPointsNeeded = Math.ceil(Number(remainingToCover) * 100);
          const maxAvailable = input.loyaltyPointsToRedeem !== undefined
            ? Math.min(loyaltyAccount.pointsBalance, input.loyaltyPointsToRedeem)
            : loyaltyAccount.pointsBalance;

          loyaltyPointsRedeemed = Math.min(maxAvailable, maxPointsNeeded);
          if (loyaltyPointsRedeemed > 0) {
            loyaltyDiscount = new Prisma.Decimal(loyaltyPointsRedeemed).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            loyaltyDiscount = Prisma.Decimal.min(loyaltyDiscount, remainingToCover);
            discount = discount.add(loyaltyDiscount);
          }
        }
      }

      const total = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        subtotal.add(tax).add(shippingCost).sub(discount)
      );

      // Only the simulated card flow is treated as captured.
      // COD remains pending until payment is collected.
      const paymentCaptured = input.paymentMethod === "SIMULATED_CARD";

      const order = await tx.order.create({
        data: {
          orderNumber: createOrderNumber(),
          userId,
          status: paymentCaptured ? "CONFIRMED" : "PENDING",
          currency,
          subtotal,
          tax,
          shippingCost,
          discount,
          total,
          shippingRecipient: input.shippingAddress.recipient,
          shippingLine1: input.shippingAddress.line1,
          shippingLine2: input.shippingAddress.line2 || null,
          shippingCity: input.shippingAddress.city,
          shippingRegion: input.shippingAddress.region,
          shippingPostalCode: input.shippingAddress.postalCode,
          shippingCountryCode: input.shippingAddress.countryCode
        }
      });

      for (const item of cart.items) {
        let remaining = item.quantity;

        const inventories = await tx.inventory.findMany({
          where: {
            productId: item.productId,
            warehouse: { isActive: true }
          },
          orderBy: { id: "asc" }
        });

        for (const inventory of inventories) {
          if (remaining === 0) break;

          const available = Math.max(
            0,
            inventory.quantity - inventory.reserved
          );

          if (available === 0) continue;

          const take = Math.min(remaining, available);

          // Conditional update: do not consume stock that is no longer available.
          const changed = await tx.inventory.updateMany({
            where: {
              id: inventory.id,
              quantity: { gte: take + inventory.reserved },
              reserved: inventory.reserved
            },
            data: {
              quantity: { decrement: take }
            }
          });

          if (changed.count !== 1) {
            throw new OrderError(
              `Stock changed while checking out "${item.product.name}". Please retry`,
              409
            );
          }

          remaining -= take;
        }

        if (remaining > 0) {
          throw new OrderError(
            `Insufficient stock for "${item.product.name}"`,
            409
          );
        }

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            unitPrice: item.product.price,
            quantity: item.quantity,
            lineTotal: item.product.price.mul(item.quantity)
          }
        });
      }

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          method: input.paymentMethod,
          status: paymentCaptured ? "CAPTURED" : "PENDING",
          amount: total,
          currency,
          providerReference: `SIM-${randomUUID()}`,
          simulated: true,
          paidAt: paymentCaptured ? new Date() : null
        }
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      // Update Loyalty Account for redemption if applied
      if (loyaltyPointsRedeemed > 0 && loyaltyAccount) {
        await tx.loyaltyAccount.update({
          where: { id: loyaltyAccount.id },
          data: {
            pointsBalance: { decrement: loyaltyPointsRedeemed }
          }
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            accountId: loyaltyAccount.id,
            type: "REDEEMED",
            points: -loyaltyPointsRedeemed,
            description: `Redeemed ${loyaltyPointsRedeemed} points on Order #${order.orderNumber}`,
            orderId: order.id
          }
        });
      }

      // Award Loyalty Points for order placed (5 points per $1 spent, minimum 10 points)
      const pointsEarned = Math.max(10, Math.floor(Number(total) * 5));
      if (pointsEarned > 0 && loyaltyAccount) {
        const netPoints = (loyaltyAccount.pointsBalance - loyaltyPointsRedeemed) + pointsEarned;
        const newTier = netPoints >= 5000 ? "PLATINUM" : netPoints >= 2000 ? "GOLD" : netPoints >= 500 ? "SILVER" : "STANDARD";

        await tx.loyaltyAccount.update({
          where: { id: loyaltyAccount.id },
          data: {
            pointsBalance: { increment: pointsEarned },
            tier: newTier
          }
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            accountId: loyaltyAccount.id,
            type: "EARNED",
            points: pointsEarned,
            description: `Earned ${pointsEarned} points from Order #${order.orderNumber}`,
            orderId: order.id
          }
        });
      }

      return {
        message: "Checkout completed",
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          currency,
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          discount: discount.toFixed(2),
          total: total.toFixed(2),
          items: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price.toFixed(2),
            lineTotal: item.product.price
              .mul(item.quantity)
              .toFixed(2)
          }))
        },
        payment: {
          id: payment.id,
          method: payment.method,
          status: payment.status,
          amount: payment.amount.toFixed(2),
          currency: payment.currency,
          simulated: payment.simulated
        },
        loyalty: {
          pointsRedeemed: loyaltyPointsRedeemed,
          discountAmount: loyaltyDiscount.toFixed(2),
          pointsEarned
        }
      };
    });
    } catch (error) {
      if (error instanceof OrderError) throw error;

      const isConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (isConflict && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }

      if (isConflict) {
        throw new OrderError(
          "Checkout conflicted with another transaction. Please retry",
          409
        );
      }

      throw error;
    }
  }

  throw new OrderError(
    "Checkout could not be completed. Please retry",
    409
  );
}

export async function cancelOrder(userId: string, orderId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { items: true, payments: true }
      });

      if (!order) {
        throw new OrderError("Order not found", 404);
      }

      if (order.status !== "PENDING") {
        throw new OrderError(
          "Only pending orders can be cancelled",
          409
        );
      }

      if (order.payments.some((payment) => payment.status === "CAPTURED")) {
        throw new OrderError(
          "This order has a captured payment and cannot be cancelled through this endpoint",
          409
        );
      }

      // Claim cancellation first. The transaction rolls this back if stock
      // restoration fails, and concurrent cancellations cannot both succeed.
      const changed = await tx.order.updateMany({
        where: {
          id: orderId,
          userId,
          status: "PENDING"
        },
        data: { status: "CANCELLED" }
      });

      if (changed.count !== 1) {
        throw new OrderError(
          "Order status changed during cancellation. Please retry",
          409
        );
      }

      for (const item of order.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouse: { isActive: true }
          },
          orderBy: { id: "asc" }
        });

        if (!inventory) {
          throw new OrderError(
            `Cannot restore stock for "${item.productName}" because no active inventory is available`,
            409
          );
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { increment: item.quantity } }
        });
      }

      return {
        message: "Order cancelled",
        orderId,
        status: "CANCELLED"
      };
    });
  } catch (error) {
    if (error instanceof OrderError) throw error;

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new OrderError(
        "Cancellation conflicted with another transaction. Please retry",
        409
      );
    }

    throw error;
  }
}
export async function listOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      subtotal: true,
      tax: true,
      shippingCost: true,
      discount: true,
      total: true,
      placedAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          sku: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
          product: {
            select: {
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { url: true, altText: true }
              }
            }
          }
        }
      },
      payments: {
        select: {
          method: true,
          status: true,
          amount: true,
          currency: true,
          simulated: true
        }
      }
    }
  });
}

export async function getOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { url: true, altText: true }
              }
            }
          }
        }
      },
      payments: {
        select: {
          id: true,
          method: true,
          status: true,
          amount: true,
          currency: true,
          simulated: true,
          paidAt: true,
          createdAt: true
        }
      },
      shipments: true
    }
  });

  if (!order) {
    throw new OrderError("Order not found", 404);
  }

  return order;
}





