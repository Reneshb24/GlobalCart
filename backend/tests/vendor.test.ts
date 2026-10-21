import test from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Response } from "express";
import { createRequireVendorMiddleware, type VendorDependencies, type VendorRequest } from "../src/middleware/requireVendor";
import type { AuthenticatedRequest } from "../src/middleware/authenticate";

function setup(options: {
  auth?: { userId: string; role: string };
  user?: { email: string; role: string; isActive: boolean } | null;
  vendor?: { id: string; name: string; email: string | null; phone: string | null; isActive: boolean } | null;
  dbError?: Error;
} = {}) {
  let statusCode = 200;
  let responseBody: unknown;
  let nextCalled = false;

  const req = {
    auth: options.auth
  } as unknown as AuthenticatedRequest;

  const res = {
    status(code: number) { statusCode = code; return this; },
    json(body: unknown) { responseBody = body; return this; }
  } as unknown as Response;

  const next = (() => { nextCalled = true; }) as NextFunction;

  const deps: VendorDependencies = {
    findUser: async (userId: string) => {
      if (options.dbError) throw options.dbError;
      if (options.user === undefined) {
        return { email: "vendor@example.com", role: options.auth?.role ?? "VENDOR", isActive: true };
      }
      return options.user;
    },
    findVendor: async (email: string) => {
      if (options.dbError) throw options.dbError;
      if (options.vendor === undefined) {
        return { id: "vendor-1", name: "Acme Vendor", email, phone: "1234567890", isActive: true };
      }
      return options.vendor;
    }
  };

  const middleware = createRequireVendorMiddleware(deps);

  return {
    run: () => middleware(req, res, next),
    req,
    get statusCode() { return statusCode; },
    get responseBody() { return responseBody; },
    get nextCalled() { return nextCalled; }
  };
}

test("requireVendor rejects when user is not authenticated", async () => {
  const state = setup({ auth: undefined });
  await state.run();

  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.responseBody, { error: "Authentication required" });
  assert.equal(state.nextCalled, false);
});

test("requireVendor rejects when role is CUSTOMER", async () => {
  const state = setup({
    auth: { userId: "user-1", role: "CUSTOMER" },
    user: { email: "cust@example.com", role: "CUSTOMER", isActive: true }
  });
  await state.run();

  assert.equal(state.statusCode, 403);
  assert.deepEqual(state.responseBody, { error: "Vendor access required" });
  assert.equal(state.nextCalled, false);
});

test("requireVendor rejects when user is inactive", async () => {
  const state = setup({
    auth: { userId: "user-1", role: "VENDOR" },
    user: { email: "vendor@example.com", role: "VENDOR", isActive: false }
  });
  await state.run();

  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.responseBody, { error: "Account unavailable" });
  assert.equal(state.nextCalled, false);
});

test("requireVendor rejects when no vendor profile matches email", async () => {
  const state = setup({
    auth: { userId: "user-1", role: "VENDOR" },
    user: { email: "unlinked@example.com", role: "VENDOR", isActive: true },
    vendor: null
  });
  await state.run();

  assert.equal(state.statusCode, 403);
  assert.deepEqual(state.responseBody, { error: "No vendor profile linked to this account" });
  assert.equal(state.nextCalled, false);
});

test("requireVendor rejects when vendor profile is inactive", async () => {
  const state = setup({
    auth: { userId: "user-1", role: "VENDOR" },
    user: { email: "inactive@example.com", role: "VENDOR", isActive: true },
    vendor: { id: "v-inactive", name: "Inactive Co", email: "inactive@example.com", phone: null, isActive: false }
  });
  await state.run();

  assert.equal(state.statusCode, 403);
  assert.deepEqual(state.responseBody, { error: "Vendor account is inactive" });
  assert.equal(state.nextCalled, false);
});

test("requireVendor attaches vendor identity and calls next on success", async () => {
  const state = setup({
    auth: { userId: "user-1", role: "VENDOR" },
    user: { email: "active@example.com", role: "VENDOR", isActive: true },
    vendor: { id: "v-active", name: "Active Electronics", email: "active@example.com", phone: "+123456", isActive: true }
  });
  await state.run();

  assert.equal(state.statusCode, 200);
  assert.equal(state.nextCalled, true);
  const vendorReq = state.req as VendorRequest;
  assert.ok(vendorReq.vendor);
  assert.equal(vendorReq.vendor.id, "v-active");
  assert.equal(vendorReq.vendor.name, "Active Electronics");
});
