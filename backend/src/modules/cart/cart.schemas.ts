import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID"),
  quantity: z.number()
    .int("quantity must be an integer")
    .min(1, "quantity must be at least 1")
    .max(100, "quantity cannot exceed 100")
});

export const updateCartItemSchema = z.object({
  quantity: z.number()
    .int("quantity must be an integer")
    .min(1, "quantity must be at least 1")
    .max(100, "quantity cannot exceed 100")
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
