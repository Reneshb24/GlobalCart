import test from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema } from "../src/modules/orders/checkout.schemas";
import {
  createAddressSchema,
  updateAddressSchema
} from "../src/modules/addresses/address.schemas";

const validCheckout = {
  paymentMethod: "COD",
  shippingAddress: {
    recipient: "Test Customer",
    line1: "123 Demo Street",
    city: "Chennai",
    region: "Tamil Nadu",
    postalCode: "600001",
    countryCode: "in"
  }
};

test("checkout accepts a valid COD request", () => {
  const result = checkoutSchema.safeParse(validCheckout);
  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.shippingAddress.countryCode, "IN");
  }
});

test("checkout rejects unsupported payment methods", () => {
  const result = checkoutSchema.safeParse({
    ...validCheckout,
    paymentMethod: "WALLET"
  });

  assert.equal(result.success, false);
});

test("checkout rejects incomplete shipping addresses", () => {
  const result = checkoutSchema.safeParse({
    paymentMethod: "COD",
    shippingAddress: { recipient: "A" }
  });

  assert.equal(result.success, false);
});

test("address creation normalizes country codes", () => {
  const result = createAddressSchema.safeParse({
    recipient: "Test Customer",
    line1: "123 Demo Street",
    city: "Chennai",
    region: "Tamil Nadu",
    postalCode: "600001",
    countryCode: "in"
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.countryCode, "IN");
  }
});

test("address creation rejects invalid country codes", () => {
  const result = createAddressSchema.safeParse({
    recipient: "Test Customer",
    line1: "123 Demo Street",
    city: "Chennai",
    region: "Tamil Nadu",
    postalCode: "600001",
    countryCode: "IND"
  });

  assert.equal(result.success, false);
});

test("address updates reject empty objects", () => {
  const result = updateAddressSchema.safeParse({});
  assert.equal(result.success, false);
});

test("address updates accept a single valid field", () => {
  const result = updateAddressSchema.safeParse({
    isDefault: true
  });

  assert.equal(result.success, true);
});
