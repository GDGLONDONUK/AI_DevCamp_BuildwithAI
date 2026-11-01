import { test, expect } from "@playwright/test";

test("winners page is public", async ({ page }) => {
  const res = await page.goto("/hackathon/devcamp-september-2026/winners");
  expect(res?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: /winners/i })).toBeVisible();
  await expect(page.getByText(/Pixel Astro/i)).toBeVisible();
  await expect(page.getByText(/Marina/i)).toBeVisible();
});

test("project permalink and OG image", async ({ page, request }) => {
  await page.goto("/hackathon/devcamp-september-2026/winners");
  const link = page.getByRole("link", { name: /Plan B/i }).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  const res = await page.goto(href!);
  expect(res?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: /Plan B/i })).toBeVisible();
  const og = await request.get(`${href}/opengraph-image`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"] || "").toMatch(/image/);
});

test("certified page is public", async ({ page }) => {
  const res = await page.goto("/cohorts/september-2026/certified");
  expect(res?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: /graduates/i })).toBeVisible();
});

test("certificate share 404 for unknown id", async ({ page }) => {
  const res = await page.goto("/certificate/does-not-exist-share-id");
  expect(res?.status()).toBe(404);
});
