import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  recipient: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(2).max(20),
  countryCode: z.string().trim().length(2)
    .transform((value) => value.toUpperCase()),
  isDefault: z.boolean().optional()
});

export const updateAddressSchema = createAddressSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one field to update" }
);

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
