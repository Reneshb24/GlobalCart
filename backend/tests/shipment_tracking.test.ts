import test from "node:test";
import assert from "node:assert/strict";

const allowedTransitions: Record<string, string[]> = {
  PREPARING: ["DISPATCHED", "FAILED"],
  DISPATCHED: ["IN_TRANSIT", "FAILED", "RETURNED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  FAILED: [],
  DELIVERED: [],
  RETURNED: []
};

function canTransitionShipment(currentStatus: string, nextStatus: string): boolean {
  const allowed = allowedTransitions[currentStatus] || [];
  return allowed.includes(nextStatus);
}

function resolveDerivedOrderStatus(shipmentStatus: string): string | null {
  if (shipmentStatus === "DISPATCHED") return "SHIPPED";
  if (shipmentStatus === "DELIVERED") return "DELIVERED";
  return null;
}

test("shipment allows valid sequential 5-stage progression", () => {
  // 1. PREPARING -> DISPATCHED
  assert.equal(canTransitionShipment("PREPARING", "DISPATCHED"), true);

  // 2. DISPATCHED -> IN_TRANSIT
  assert.equal(canTransitionShipment("DISPATCHED", "IN_TRANSIT"), true);

  // 3. IN_TRANSIT -> OUT_FOR_DELIVERY
  assert.equal(canTransitionShipment("IN_TRANSIT", "OUT_FOR_DELIVERY"), true);

  // 4. OUT_FOR_DELIVERY -> DELIVERED
  assert.equal(canTransitionShipment("OUT_FOR_DELIVERY", "DELIVERED"), true);
});

test("shipment rejects invalid milestone jumps", () => {
  // Cannot jump directly from PREPARING to DELIVERED
  assert.equal(canTransitionShipment("PREPARING", "DELIVERED"), false);

  // Cannot jump directly from PREPARING to OUT_FOR_DELIVERY
  assert.equal(canTransitionShipment("PREPARING", "OUT_FOR_DELIVERY"), false);

  // Cannot transition backwards from DELIVERED to IN_TRANSIT
  assert.equal(canTransitionShipment("DELIVERED", "IN_TRANSIT"), false);

  // Terminal state DELIVERED allows no further transitions
  assert.equal(canTransitionShipment("DELIVERED", "DISPATCHED"), false);
});

test("shipment dispatch correctly derives order status SHIPPED", () => {
  const derived = resolveDerivedOrderStatus("DISPATCHED");
  assert.equal(derived, "SHIPPED");
});

test("shipment delivery correctly derives order status DELIVERED", () => {
  const derived = resolveDerivedOrderStatus("DELIVERED");
  assert.equal(derived, "DELIVERED");
});

test("intermediate shipment stages do not alter order terminal status", () => {
  assert.equal(resolveDerivedOrderStatus("IN_TRANSIT"), null);
  assert.equal(resolveDerivedOrderStatus("OUT_FOR_DELIVERY"), null);
});
