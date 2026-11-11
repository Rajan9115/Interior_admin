import assert from "node:assert/strict";
import { hashPassword, verifyPassword, generateOpaqueToken, hashToken, anonymizeIdentifier } from "../lib/auth/crypto";
import { isRateLimited, recordFailure, resetLimit } from "../lib/auth/rate-limit";
import { loginSchema } from "../lib/validation/auth";
import { verifyMutationOrigin } from "../lib/auth/guard";

async function runAuthTests() {
  console.log("Starting Phase 2 Authentication Security Unit Tests...\n");

  // Test 1: Cryptographic Password Hashing & Verification
  console.log("1. Testing Password Hashing & Verification...");
  const rawPassword = "StrongOwnerPassword#2026!";
  const hashedPassword = await hashPassword(rawPassword);
  assert.notEqual(rawPassword, hashedPassword, "Hash must not equal plaintext password");
  assert.ok(hashedPassword.startsWith("$2"), "Must use bcrypt format");

  const isMatch = await verifyPassword(rawPassword, hashedPassword);
  assert.equal(isMatch, true, "Valid password must verify successfully");

  const isWrongMatch = await verifyPassword("WrongPassword#999", hashedPassword);
  assert.equal(isWrongMatch, false, "Invalid password must be rejected");
  console.log("✓ Password hashing & verification passed.\n");

  // Test 2: Opaque Token Generation & SHA-256 Hashing
  console.log("2. Testing Opaque Token Generation & Hashing...");
  const token1 = generateOpaqueToken();
  const token2 = generateOpaqueToken();
  assert.equal(token1.length, 64, "Token must be 64 hex characters (32 bytes entropy)");
  assert.notEqual(token1, token2, "Subsequent tokens must be cryptographically distinct");

  const hash1 = hashToken(token1);
  const hash2 = hashToken(token1);
  assert.equal(hash1, hash2, "Hashing the same token must be deterministic");
  assert.notEqual(hash1, token1, "Hash must differ from raw token");

  const anonymized = anonymizeIdentifier("192.168.1.55");
  assert.equal(anonymized.length, 16, "Anonymized identifier must be 16 characters");
  console.log("✓ Opaque token generation and hashing passed.\n");

  // Test 3: Rate Limiter Throttling & Reset
  console.log("3. Testing Rate Limiting Logic...");
  const testIpKey = "test-ip-rate-limit-123";
  resetLimit(testIpKey);

  for (let i = 1; i <= 5; i++) {
    const statusBefore = isRateLimited(testIpKey, 5);
    assert.equal(statusBefore.limited, false, `Attempt ${i} should be permitted`);
    recordFailure(testIpKey);
  }

  const statusAfter5 = isRateLimited(testIpKey, 5);
  assert.equal(statusAfter5.limited, true, "6th attempt must be throttled");
  assert.ok(statusAfter5.retryAfterSeconds > 0, "Must provide retry-after seconds");

  resetLimit(testIpKey);
  const statusAfterReset = isRateLimited(testIpKey, 5);
  assert.equal(statusAfterReset.limited, false, "Limit must be cleared after reset");
  console.log("✓ Rate limiting throttling and reset passed.\n");

  // Test 4: Zod Login Input Validation
  console.log("4. Testing Zod Login Validation Schema...");
  const validResult = loginSchema.safeParse({
    email: " OWNER@MamaInterior.IN  ",
    password: "securepassword",
  });
  assert.equal(validResult.success, true, "Valid email and password should pass");
  if (validResult.success) {
    assert.equal(validResult.data.email, "owner@mamainterior.in", "Email must be trimmed and lowercased");
  }

  const invalidEmailResult = loginSchema.safeParse({
    email: "not-an-email",
    password: "password123",
  });
  assert.equal(invalidEmailResult.success, false, "Invalid email format must fail validation");

  const emptyPasswordResult = loginSchema.safeParse({
    email: "owner@mamainterior.in",
    password: "",
  });
  assert.equal(emptyPasswordResult.success, false, "Empty password must fail validation");
  console.log("✓ Login schema validation passed.\n");

  // Test 5: CSRF / Mutation Origin Verification
  console.log("5. Testing CSRF Origin Verification...");
  const validReq = new Request("https://admin.mamainterior.in/api/v1/auth/login", {
    method: "POST",
    headers: {
      origin: "https://admin.mamainterior.in",
      host: "admin.mamainterior.in",
    },
  });
  assert.equal(verifyMutationOrigin(validReq), true, "Same origin mutation must be allowed");

  const evilReq = new Request("https://admin.mamainterior.in/api/v1/auth/login", {
    method: "POST",
    headers: {
      origin: "https://malicious-attacker-website.com",
      host: "admin.mamainterior.in",
    },
  });
  assert.equal(verifyMutationOrigin(evilReq), false, "Cross-origin mutation from untrusted site must be blocked");
  console.log("✓ CSRF origin protection passed.\n");

  console.log("==================================================");
  console.log("ALL PHASE 2 AUTHENTICATION TESTS PASSED (5/5) 🚀");
  console.log("==================================================");
}

runAuthTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
