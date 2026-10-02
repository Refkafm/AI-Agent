import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const url = process.env.ASTRA_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Selamat datang/ }).waitFor();
  await page.locator("canvas").waitFor();
  assert.equal(
    await page
      .getByText("3D tidak tersedia di browser ini", { exact: true })
      .count(),
    0,
  );
  await page.waitForTimeout(1000);
  await mkdir("docs/runtime", { recursive: true });
  await page.screenshot({ path: "docs/runtime/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Perbesar", exact: true }).click();
  await page.getByRole("button", { name: "Putar kamera", exact: true }).click();
  await page.getByRole("button", { name: "Reset kamera", exact: true }).click();
  await page.getByRole("button", { name: "Step inside", exact: true }).click();
  await page.getByRole("button", { name: "Maju", exact: true }).waitFor();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Astra den", exact: true }).click();
  await page.getByRole("complementary", { name: "Detail pilihan" }).waitFor();
  await page.getByRole("button", { name: "Tutup detail" }).click();
  await page.getByRole("link", { name: "Tasks", exact: true }).click();
  await page.getByRole("button", { name: "Tugas baru", exact: true }).click();
  const title = `Browser check ${Date.now()}`;
  await page.getByLabel("Judul", { exact: true }).fill(title);
  await page
    .getByLabel("Brief", { exact: true })
    .fill("Test lokal UI, tidak dikirim ke API.");
  await page
    .getByLabel("Ditugaskan kepada", { exact: true })
    .selectOption("alpha");
  await page.getByRole("button", { name: "Simpan tugas", exact: true }).click();
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("button", { name: title, exact: true }) });
  await card.waitFor();
  await card
    .getByLabel("Status manual", { exact: true })
    .selectOption("Review");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: title, exact: true }).waitFor();
  await page.getByRole("link", { name: "Agents", exact: true }).click();
  await page.getByRole("heading", { name: "Kenali tim kecil Anda." }).waitFor();
  await page.getByRole("link", { name: "Activity", exact: true }).click();
  await page.getByRole("heading", { name: "Jejak aktivitas." }).waitFor();
  await page.getByRole("link", { name: "Integrations", exact: true }).click();
  await page.getByRole("heading", { name: "Knowledge library" }).waitFor();
  await page.getByRole("link", { name: "Office", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/runtime/mobile.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "Mobile horizontal overflow",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Jalankan animasi dekoratif", exact: true })
    .waitFor();
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(
    "PASS: renderer mounted, controls, room selection, task create/status/persistence, pages, mobile width, reduced motion. Screenshots saved to docs/runtime. Live provider calls were not tested.",
  );
} finally {
  await browser.close();
}
