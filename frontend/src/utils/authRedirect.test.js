import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeNextUrl } from "./authRedirect.js";

const ORIGIN = "http://localhost";
const FALLBACK = "/admin";

function sanitize(rawNext) {
  return sanitizeNextUrl(rawNext, FALLBACK, ORIGIN);
}

test("safe same-origin destinations keep their path, query, and hash", () => {
  const cases = [
    ["/datos", "/datos"],
    ["/datos?tab=ai#top", "/datos?tab=ai#top"],
    ["/admin", "/admin"],
  ];

  for (const [rawNext, expected] of cases) {
    assert.equal(sanitize(rawNext), expected);
  }
});

test("external, schemeless, and backslash destinations fall back", () => {
  const rejected = [
    "http://evil.com",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
  ];

  for (const rawNext of rejected) {
    assert.equal(sanitize(rawNext), FALLBACK);
  }
});

test("auth-gate destinations fall back even with queries or nested paths", () => {
  const rejected = [
    "/login",
    "/login?next=/datos",
    "/login/step",
    "/register",
    "/register/step",
  ];

  for (const rawNext of rejected) {
    assert.equal(sanitize(rawNext), FALLBACK);
  }
});

test("control characters and missing values fall back", () => {
  const rejected = [
    "/datos\r\nSet-Cookie:x",
    "/datos\u0000",
    null,
    "",
    "   ",
  ];

  for (const rawNext of rejected) {
    assert.equal(sanitize(rawNext), FALLBACK);
  }
});

test("custom fallback and origin are honored", () => {
  assert.equal(
    sanitizeNextUrl("//evil.com", "/datos", ORIGIN),
    "/datos",
  );
  assert.equal(
    sanitizeNextUrl("https://evil.com/datos", "/datos", ORIGIN),
    "/datos",
  );
  assert.equal(
    sanitizeNextUrl("/datos", "/datos", "https://app.example.com"),
    "/datos",
  );
});
