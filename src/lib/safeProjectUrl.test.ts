import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizePublicProjectUrl,
  urlLooksLikeSecret,
} from "./safeProjectUrl";

describe("sanitizePublicProjectUrl", () => {
  it("allows github https", () => {
    assert.equal(
      sanitizePublicProjectUrl("https://github.com/org/repo"),
      "https://github.com/org/repo"
    );
  });

  it("allows vercel.app", () => {
    assert.ok(sanitizePublicProjectUrl("https://aidevcamp-halloween-hack.vercel.app/build"));
  });

  it("rejects http", () => {
    assert.equal(sanitizePublicProjectUrl("http://github.com/org/repo"), null);
  });

  it("rejects unknown hosts", () => {
    assert.equal(sanitizePublicProjectUrl("https://evil.example/phish"), null);
  });

  it("hides github PATs", () => {
    assert.equal(true, urlLooksLikeSecret("ghp_abcdefghijklmnopqrstuvwxyz0123456789"));
    assert.equal(
      sanitizePublicProjectUrl("https://github.com/org/repo?token=ghp_abcdefghijklmnopqrstuvwxyz0123456789"),
      null
    );
    assert.equal(
      sanitizePublicProjectUrl("ghp_abcdefghijklmnopqrstuvwxyz0123456789"),
      null
    );
  });
});
