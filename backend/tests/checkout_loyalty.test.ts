import test from "node:test";
import assert from "node:assert/strict";

// Business logic functions mirror order.service.ts
function calculateLoyaltyRedemption(params: {
  pointsBalance: number;
  remainingToCover: number;
  pointsToRedeemInput?: number;
}) {
  const { pointsBalance, remainingToCover, pointsToRedeemInput } = params;

  if (pointsBalance <= 0 || remainingToCover <= 0) {
    return {
      pointsRedeemed: 0,
      discountAmount: 0
    };
  }

  // 100 points = $1.00
  const maxPointsNeeded = Math.ceil(remainingToCover * 100);
  const maxAvailable = pointsToRedeemInput !== undefined
    ? Math.min(pointsBalance, pointsToRedeemInput)
    : pointsBalance;

  const pointsRedeemed = Math.min(maxAvailable, maxPointsNeeded);
  let rawDiscount = (pointsRedeemed / 100);
  let discountAmount = Math.min(rawDiscount, remainingToCover);

  return {
    pointsRedeemed,
    // Must return a NUMBER to prevent .toFixed is not a function crashes
    discountAmount: Number(discountAmount.toFixed(2))
  };
}

function calculateLoyaltyEarnings(paidTotal: number): number {
  if (paidTotal <= 0) return 0;
  // 5% in SuperCoins: 5 points per $1 spent
  return Math.floor(paidTotal * 5);
}

function calculateOfferDiscount(params: {
  subtotal: number;
  offer: {
    discountPercent?: number | null;
    discountAmount?: number | null;
    minOrderAmount?: number | null;
    startsAt?: Date;
    endsAt?: Date;
  };
}) {
  const { subtotal, offer } = params;
  const now = new Date();

  if (offer.startsAt && offer.startsAt > now) return { valid: false, reason: "Offer has not started" };
  if (offer.endsAt && offer.endsAt < now) return { valid: false, reason: "Offer expired" };
  if (offer.minOrderAmount && subtotal < offer.minOrderAmount) {
    return { valid: false, reason: `Minimum order amount of $${offer.minOrderAmount} required` };
  }

  let discount = 0;
  if (offer.discountPercent != null && offer.discountPercent > 0) {
    discount = (subtotal * offer.discountPercent) / 100;
  } else if (offer.discountAmount != null && offer.discountAmount > 0) {
    discount = Math.min(offer.discountAmount, subtotal);
  }

  return {
    valid: true,
    discountAmount: Number(discount.toFixed(2))
  };
}

test("loyalty discount calculation returns a numeric type", () => {
  const result = calculateLoyaltyRedemption({
    pointsBalance: 500,
    remainingToCover: 50.00
  });

  // Verify result is a number
  assert.equal(typeof result.discountAmount, "number");
  assert.equal(typeof result.pointsRedeemed, "number");
  assert.equal(result.pointsRedeemed, 500);
  assert.equal(result.discountAmount, 5.00);

  // Calling .toFixed(2) must never throw TypeError
  assert.equal(result.discountAmount.toFixed(2), "5.00");
});

test("loyalty discount caps points redeemed at remaining balance", () => {
  const result = calculateLoyaltyRedemption({
    pointsBalance: 2000, // $20 worth
    remainingToCover: 12.50 // only needs $12.50 = 1250 points
  });

  assert.equal(result.pointsRedeemed, 1250);
  assert.equal(result.discountAmount, 12.50);
  assert.equal(result.discountAmount.toFixed(2), "12.50");
});

test("loyalty points earned calculates 5 points per $1 spent", () => {
  const points = calculateLoyaltyEarnings(120.50);
  assert.equal(points, 602);
});

test("percentage coupon calculates correct discount", () => {
  const res = calculateOfferDiscount({
    subtotal: 100.00,
    offer: { discountPercent: 20 }
  });

  assert.equal(res.valid, true);
  assert.equal(res.discountAmount, 20.00);
});

test("fixed amount coupon applies discount capped at subtotal", () => {
  const res = calculateOfferDiscount({
    subtotal: 15.00,
    offer: { discountAmount: 50.00 }
  });

  assert.equal(res.valid, true);
  assert.equal(res.discountAmount, 15.00);
});

test("coupon rejects when subtotal is below minimum order amount", () => {
  const res = calculateOfferDiscount({
    subtotal: 30.00,
    offer: { discountPercent: 10, minOrderAmount: 50.00 }
  });

  assert.equal(res.valid, false);
  assert.match(res.reason as string, /Minimum order amount/);
});

test("coupon rejects expired offer", () => {
  const res = calculateOfferDiscount({
    subtotal: 100.00,
    offer: {
      discountPercent: 10,
      endsAt: new Date(Date.now() - 100000)
    }
  });

  assert.equal(res.valid, false);
  assert.match(res.reason as string, /Offer expired/);
});
