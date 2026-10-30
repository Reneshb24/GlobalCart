import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "super_secure_test_jwt_secret_with_more_than_64_characters_for_unit_tests_1234567890";
import { signAuthToken, verifyAuthToken } from "../src/utils/jwt";

const vendorRegisterSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(72),
  businessName: z.string().trim().min(2).max(150),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional(),
  nearestWarehouseId: z.string().uuid().optional()
});

test("vendor onboarding schema accepts valid registration details", () => {
  const input = {
    businessName: "Nordic Living Co",
    firstName: "Astrid",
    lastName: "Lindgren",
    email: "astrid@nordicliving.example",
    password: "SecurePassword123!",
    phone: "+46 8 123 4567",
    nearestWarehouseId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
  };

  const parsed = vendorRegisterSchema.safeParse(input);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, "astrid@nordicliving.example");
    assert.equal(parsed.data.businessName, "Nordic Living Co");
  }
});

test("vendor onboarding schema normalizes email to lowercase", () => {
  const input = {
    businessName: "Nordic Living Co",
    firstName: "Astrid",
    lastName: "Lindgren",
    email: "ASTRID@NordicLiving.EXAMPLE",
    password: "SecurePassword123!"
  };

  const parsed = vendorRegisterSchema.safeParse(input);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, "astrid@nordicliving.example");
  }
});

test("vendor onboarding schema rejects password shorter than 8 characters", () => {
  const input = {
    businessName: "Nordic Living Co",
    firstName: "Astrid",
    lastName: "Lindgren",
    email: "astrid@nordicliving.example",
    password: "short"
  };

  const parsed = vendorRegisterSchema.safeParse(input);
  assert.equal(parsed.success, false);
});

test("vendor onboarding schema rejects empty business name", () => {
  const input = {
    businessName: " ",
    firstName: "Astrid",
    lastName: "Lindgren",
    email: "astrid@nordicliving.example",
    password: "SecurePassword123!"
  };

  const parsed = vendorRegisterSchema.safeParse(input);
  assert.equal(parsed.success, false);
});

test("vendor password hashes and verifies with bcrypt", async () => {
  const rawPassword = "MyVendorSecretPassword2026!";
  const hash = await bcrypt.hash(rawPassword, 10);

  assert.notEqual(rawPassword, hash);
  const isMatch = await bcrypt.compare(rawPassword, hash);
  assert.equal(isMatch, true);

  const wrongMatch = await bcrypt.compare("WrongPassword", hash);
  assert.equal(wrongMatch, false);
});

test("vendor JWT signs and verifies with VENDOR role payload", () => {
  const fakeUserId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const token = signAuthToken({
    userId: fakeUserId,
    role: "VENDOR"
  });

  assert.ok(token && typeof token === "string");

  const decoded = verifyAuthToken(token);
  assert.equal(decoded.userId, fakeUserId);
  assert.equal(decoded.role, "VENDOR");
});
