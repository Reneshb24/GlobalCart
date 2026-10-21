import { prisma } from "../../lib/prisma";
import type {
  CreateAddressInput,
  UpdateAddressInput
} from "./address.schemas";

export class AddressError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AddressError";
  }
}

export async function listAddresses(userId: string) {
  return prisma.userAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
  });
}

export async function createAddress(
  userId: string,
  input: CreateAddressInput
) {
  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.userAddress.count({
      where: { userId }
    });

    const shouldBeDefault = input.isDefault === true || existingCount === 0;

    if (shouldBeDefault) {
      await tx.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    return tx.userAddress.create({
      data: {
        ...input,
        userId,
        isDefault: shouldBeDefault
      }
    });
  });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userAddress.findFirst({
      where: { id: addressId, userId }
    });

    if (!existing) {
      throw new AddressError("Address not found", 404);
    }

    if (input.isDefault === true) {
      await tx.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    return tx.userAddress.update({
      where: { id: addressId },
      data: input
    });
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userAddress.findFirst({
      where: { id: addressId, userId }
    });

    if (!existing) {
      throw new AddressError("Address not found", 404);
    }

    await tx.userAddress.delete({
      where: { id: addressId }
    });

    if (existing.isDefault) {
      const replacement = await tx.userAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });

      if (replacement) {
        await tx.userAddress.update({
          where: { id: replacement.id },
          data: { isDefault: true }
        });
      }
    }

    return { message: "Address deleted" };
  });
}
