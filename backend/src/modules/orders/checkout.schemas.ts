import { z } from "zod";

export const checkoutSchema = z.object({
  paymentMethod: z.enum(["SIMULATED_CARD", "COD"]),
  offerCode: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/).transform(value => value.toUpperCase()).optional(),
  redeemLoyaltyPoints: z.boolean().optional(),
  loyaltyPointsToRedeem: z.number().int().min(0).optional(),
  shippingAddress: z.object({
    recipient: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(30).optional(),
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    region: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().min(2).max(20),
    countryCode: z.string().trim().length(2)
      .transform((value) => value.toUpperCase())
  })
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

