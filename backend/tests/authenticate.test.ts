import test from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { createAuthenticateTokenMiddleware } from "../src/middleware/authenticate";

const validPayload = { userId: "user-123", role: "CUSTOMER" };

function setup(options: {
  authorization?: string;
  verifyError?: Error;
  user?: { isActive: boolean } | null;
  databaseError?: Error;
} = {}) {
  let statusCode = 200;
  let responseBody: unknown;
  let nextCalled = false;
  let lookupCount = 0;

  const req = {
    headers: options.authorization === undefined
      ? {}
      : { authorization: options.authorization }
  } as unknown as Request;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    }
  } as unknown as Response;

  const next = (() => {
    nextCalled = true;
  }) as NextFunction;

  const middleware = createAuthenticateTokenMiddleware({
    verifyToken(token) {
      if (options.verifyError) throw options.verifyError;
      assert.equal(token, "valid-token");
      return validPayload;
    },
    async findUser(userId) {
      lookupCount++;
      assert.equal(userId, validPayload.userId);
      if (options.databaseError) throw options.databaseError;
      return options.user === undefined ? { isActive: true } : options.user;
    }
  });

  return {
    run: () => middleware(req, res, next),
    req,
    get statusCode() { return statusCode; },
    get responseBody() { return responseBody; },
    get nextCalled() { return nextCalled; },
    get lookupCount() { return lookupCount; }
  };
}

test("rejects a request without a bearer token", async () => {
  const state = setup();
  await state.run();

  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.responseBody, {
    error: "Authentication token required"
  });
  assert.equal(state.nextCalled, false);
  assert.equal(state.lookupCount, 0);
});

test("rejects an invalid or expired token", async () => {
  const state = setup({
    authorization: "Bearer invalid-token",
    verifyError: new Error("invalid token")
  });
  await state.run();

  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.responseBody, {
    error: "Invalid or expired authentication token"
  });
  assert.equal(state.nextCalled, false);
  assert.equal(state.lookupCount, 0);
});

test("rejects an inactive account", async () => {
  const state = setup({
    authorization: "Bearer valid-token",
    user: { isActive: false }
  });
  await state.run();

  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.responseBody, {
    error: "Account unavailable"
  });
  assert.equal(state.nextCalled, false);
});

test("rejects a token for a missing account", async () => {
  const state = setup({
    authorization: "Bearer valid-token",
    user: null
  });
  await state.run();

  assert.equal(state.statusCode, 401);
  assert.equal(state.nextCalled, false);
});

test("allows an active account and attaches authenticated identity", async () => {
  const state = setup({
    authorization: "Bearer valid-token",
    user: { isActive: true }
  });
  await state.run();

  assert.equal(state.statusCode, 200);
  assert.equal(state.nextCalled, true);
  assert.deepEqual((state.req as Request & {
    auth?: { userId: string; role: string }
  }).auth, validPayload);
});

test("fails closed when account verification fails", async () => {
  const state = setup({
    authorization: "Bearer valid-token",
    databaseError: new Error("simulated database failure")
  });

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await state.run();
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.responseBody, {
    error: "Unable to verify account access"
  });
  assert.equal(state.nextCalled, false);
});
