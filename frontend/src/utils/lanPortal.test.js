import assert from "node:assert/strict";
import test from "node:test";
import { isLoopbackHost, resolveLanPortalUrl } from "./lanPortal.js";

test("isLoopbackHost recognizes empty values and loopback hosts", () => {
  const loopbackHosts = [
    "",
    null,
    undefined,
    "localhost",
    "portal.localhost",
    "127.0.0.1",
    "127.0.1.1",
    "127.255.255.255",
    "0.0.0.0",
    "::1",
    "[::1]",
  ];

  for (const host of loopbackHosts) {
    assert.equal(isLoopbackHost(host), true, String(host));
  }
});

test("isLoopbackHost keeps LAN and hotspot hosts", () => {
  for (const host of ["10.42.0.1", "192.168.1.50", "example.com"]) {
    assert.equal(isLoopbackHost(host), false, host);
  }
});

test("lanInfo.url is preferred, normalized, and never loopback", () => {
  assert.equal(
    resolveLanPortalUrl({
      lanInfo: { status: "online", url: "http://10.42.0.1", ipv4: null },
    }),
    "http://10.42.0.1/",
  );
  assert.equal(
    resolveLanPortalUrl({
      lanInfo: {
        status: "online",
        url: "https://192.168.1.50:8443/datos?tab=ai#top",
      },
    }),
    "https://192.168.1.50:8443/datos/?tab=ai#top",
  );
  assert.equal(
    resolveLanPortalUrl({
      lanInfo: { status: "online", url: "http://localhost:8000", ipv4: "10.42.0.1" },
    }),
    "http://10.42.0.1/",
  );
  assert.equal(
    resolveLanPortalUrl({
      lanInfo: { status: "online", url: "http://127.0.0.1/" },
      locationOrigin: "http://192.168.1.50/",
    }),
    "http://192.168.1.50/",
  );
});

test("loopback and offline lanInfo values never produce a loopback URL", () => {
  for (const ipv4 of [
    "localhost",
    "127.0.0.1",
    "127.0.1.1",
    "0.0.0.0",
    "::1",
    "[::1]",
  ]) {
    assert.equal(
      resolveLanPortalUrl({ lanInfo: { status: "online", ipv4 } }),
      null,
      ipv4,
    );
  }

  assert.equal(
    resolveLanPortalUrl({
      lanInfo: { status: "offline", ipv4: null, url: null },
      locationOrigin: "http://localhost:5173",
    }),
    null,
  );
  assert.equal(resolveLanPortalUrl({ lanInfo: null }), null);
});

test("hotspot and LAN addresses resolve with a trailing slash", () => {
  assert.equal(
    resolveLanPortalUrl({
      lanInfo: {
        status: "online",
        mode: "hotspot",
        ipv4: "10.42.0.1",
        url: "http://10.42.0.1/",
      },
    }),
    "http://10.42.0.1/",
  );
  assert.equal(
    resolveLanPortalUrl({
      lanInfo: { status: "online", mode: "lan", ipv4: "192.168.1.50", url: null },
    }),
    "http://192.168.1.50/",
  );
});

test("locationOrigin is a fallback only when it is not loopback", () => {
  assert.equal(
    resolveLanPortalUrl({
      lanInfo: null,
      locationOrigin: "http://192.168.1.50:8000/admin",
    }),
    "http://192.168.1.50:8000/",
  );
  assert.equal(
    resolveLanPortalUrl({ lanInfo: null, locationOrigin: "http://localhost:5173" }),
    null,
  );
  assert.equal(
    resolveLanPortalUrl({ lanInfo: null, locationOrigin: "http://127.0.0.1:5173" }),
    null,
  );
});
