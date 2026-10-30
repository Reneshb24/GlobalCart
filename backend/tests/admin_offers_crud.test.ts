import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Tier extraction utility mirroring backend offers routes & order service
function extractOfferTier(description?: string | null): { eligibleTier: string; cleanDescription: string } {
  let eligibleTier = "ALL";
  let cleanDescription = description || "";
  if (description && description.includes("[TIER:")) {
    const match = description.match(/\[TIER:([A-Za-z0-9_,]+)\]/);
    if (match) {
      eligibleTier = match[1].trim().toUpperCase();
      cleanDescription = description.replace(/\[TIER:[^\]]+\]/g, "").trim();
    }
  }
  return { eligibleTier, cleanDescription };
}

// Tier hierarchy validator mirroring order.service.ts
function checkTierEligibility(userTier: string, requiredTier: string): { eligible: boolean; message?: string } {
  const tierRanks: Record<string, number> = {
    STANDARD: 0,
    BRONZE: 1,
    SILVER: 2,
    GOLD: 3,
    PLATINUM: 4
  };

  const userRank = tierRanks[userTier.toUpperCase()] ?? 0;
  const minRequiredRank = tierRanks[requiredTier.toUpperCase()] ?? 1;

  if (requiredTier === "ALL" || userRank >= minRequiredRank) {
    return { eligible: true };
  }

  return {
    eligible: false,
    message: `Coupon is reserved for ${requiredTier} tier members. Your current tier is ${userTier}.`
  };
}

// Offer create & update validation schema
const offerCreateSchema = z.object({
  code: z.string().min(3).max(40).regex(/^[A-Z0-9_-]+$/),
  title: z.string().min(2).max(120).optional(),
  name: z.string().min(2).max(120).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  discountValue: z.number().positive().max(100000).optional(),
  discountPercent: z.number().positive().max(100).optional(),
  discountAmount: z.number().positive().max(100000).optional(),
  eligibleTier: z.enum(["ALL", "BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED", "EXPIRED"]).optional()
});

test("extractOfferTier parses [TIER:GOLD] and returns clean description", () => {
  const raw = "Exclusive 30% Off for Gold VIPs [TIER:GOLD]";
  const { eligibleTier, cleanDescription } = extractOfferTier(raw);
  assert.equal(eligibleTier, "GOLD");
  assert.equal(cleanDescription, "Exclusive 30% Off for Gold VIPs");
});

test("extractOfferTier defaults to ALL when no tier tag is present", () => {
  const raw = "Open to everyone for festive season";
  const { eligibleTier, cleanDescription } = extractOfferTier(raw);
  assert.equal(eligibleTier, "ALL");
  assert.equal(cleanDescription, "Open to everyone for festive season");
});

test("checkTierEligibility permits higher rank tiers (PLATINUM using GOLD coupon)", () => {
  const result = checkTierEligibility("PLATINUM", "GOLD");
  assert.equal(result.eligible, true);
});

test("checkTierEligibility permits exact rank tier (GOLD using GOLD coupon)", () => {
  const result = checkTierEligibility("GOLD", "GOLD");
  assert.equal(result.eligible, true);
});

test("checkTierEligibility rejects lower rank tier (BRONZE using GOLD coupon)", () => {
  const result = checkTierEligibility("BRONZE", "GOLD");
  assert.equal(result.eligible, false);
  assert.ok(result.message?.includes("reserved for GOLD tier members"));
});

test("checkTierEligibility permits any user when coupon is for ALL", () => {
  const result = checkTierEligibility("STANDARD", "ALL");
  assert.equal(result.eligible, true);
});

test("offer schema accepts valid percentage festival promotion", () => {
  const parsed = offerCreateSchema.safeParse({
    code: "DIWALI25",
    title: "Diwali Mega Festival Deal 25% Off",
    discountType: "PERCENTAGE",
    discountValue: 25,
    eligibleTier: "ALL",
    status: "ACTIVE"
  });
  assert.equal(parsed.success, true);
});

test("offer schema accepts fixed amount promotion for VIP members", () => {
  const parsed = offerCreateSchema.safeParse({
    code: "VIP50",
    title: "$50 Off Exclusive VIP Coupon",
    discountType: "FIXED_AMOUNT",
    discountValue: 50,
    eligibleTier: "PLATINUM",
    status: "ACTIVE"
  });
  assert.equal(parsed.success, true);
});

test("offer schema rejects invalid code with special symbols", () => {
  const parsed = offerCreateSchema.safeParse({
    code: "SAVE 20%!",
    title: "Invalid Code",
    discountType: "PERCENTAGE",
    discountValue: 20
  });
  assert.equal(parsed.success, false);
});
